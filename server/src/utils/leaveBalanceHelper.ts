export interface CarryForwardRule {
  leaveType: string;
  enabled: boolean;
  maxDays: number;
  monthlyCarryForward: boolean;
  expiryMonths: number; // 0 = never expires within year; N = unused leave from month E expires after month E + N
}

export const DEFAULT_CARRY_FORWARD_RULES: CarryForwardRule[] = [
  { leaveType: 'casual', enabled: true, maxDays: 6, monthlyCarryForward: true, expiryMonths: 0 },
  { leaveType: 'sick', enabled: true, maxDays: 6, monthlyCarryForward: true, expiryMonths: 0 },
  { leaveType: 'earned', enabled: true, maxDays: 15, monthlyCarryForward: true, expiryMonths: 0 },
  { leaveType: 'compensatory', enabled: true, maxDays: 5, monthlyCarryForward: true, expiryMonths: 0 },
];

export function parseCarryForwardRules(raw: any): CarryForwardRule[] {
  let parsed: any[] = [];
  if (Array.isArray(raw)) parsed = raw;
  else if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) parsed = p;
    } catch {
      parsed = [];
    }
  }
  return DEFAULT_CARRY_FORWARD_RULES.map((def) => {
    const found = parsed.find((r: any) => r?.leaveType === def.leaveType);
    if (!found) return { ...def };
    return {
      leaveType: def.leaveType,
      enabled: found.enabled !== undefined ? Boolean(found.enabled) : def.enabled,
      maxDays: found.maxDays !== undefined ? Math.max(0, Number(found.maxDays) || 0) : def.maxDays,
      monthlyCarryForward:
        found.monthlyCarryForward !== undefined ? Boolean(found.monthlyCarryForward) : def.monthlyCarryForward,
      expiryMonths:
        found.expiryMonths !== undefined ? Math.max(0, Number(found.expiryMonths) || 0) : def.expiryMonths,
    };
  });
}

export function countWorkingLeaveDaysInRange(
  lr: { startDate: Date | string; endDate: Date | string; isHalfDay?: boolean | null },
  rangeStart: Date,
  rangeEnd: Date,
  workingDays: string[],
  holidayKeySet: Set<string>
): number {
  const s = new Date(Math.max(new Date(lr.startDate).getTime(), rangeStart.getTime()));
  const e = new Date(Math.min(new Date(lr.endDate).getTime(), rangeEnd.getTime()));
  const sDay = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  const eDay = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  if (eDay < sDay) return 0;
  if (lr.isHalfDay) return 0.5;

  let workingLeaveDays = 0;
  const cur = new Date(sDay);
  while (cur.getTime() <= eDay) {
    const k = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`;
    const dow = cur.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    if (workingDays.includes(dow) && !holidayKeySet.has(k)) {
      workingLeaveDays += 1;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return workingLeaveDays;
}

export function buildMonthlyUsageMap(
  leaves: Array<{ type: string; status?: string; startDate: Date | string; endDate: Date | string; isHalfDay?: boolean | null }>,
  year: number,
  leaveType: string,
  workingDays: string[],
  holidayKeySet: Set<string>,
  approvedOnly = true
): Record<number, number> {
  const usedByMonth: Record<number, number> = {};
  for (let m = 0; m < 12; m++) {
    usedByMonth[m] = 0;
  }
  for (const lr of leaves) {
    if (lr.type !== leaveType) continue;
    if (approvedOnly && lr.status && lr.status !== 'approved') continue;
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0));
      const mEnd = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999));
      const days = countWorkingLeaveDaysInRange(lr, mStart, mEnd, workingDays, holidayKeySet);
      if (days > 0) {
        usedByMonth[m] = Number((usedByMonth[m] + days).toFixed(2));
      }
    }
  }
  return usedByMonth;
}

export interface MonthlyFifoResult {
  carriedForward: number;
  expiredTotal: number;
  expiringEndOfMonth: number;
  effectiveAllocated: number;
}

/**
 * FIFO monthly carry-forward ledger with optional rollover expiry (expiryMonths).
 * - expiryMonths === 0: no expiry within the year (capped by rule.maxDays)
 * - expiryMonths === N (>0): unused leave earned in month E expires at the start of month E + N + 1
 */
export function computeMonthlyFifoCarryForward(params: {
  monthlyQuota: number;
  targetMonthIdx: number; // 0-11
  accrualStartMonth: number; // 0-11 (or 12 if joined next year)
  usedByMonth: Record<number, number>;
  rule?: CarryForwardRule | null;
}): MonthlyFifoResult {
  const { monthlyQuota, targetMonthIdx, accrualStartMonth, usedByMonth, rule } = params;

  if (monthlyQuota <= 0 || targetMonthIdx < accrualStartMonth) {
    return { carriedForward: 0, expiredTotal: 0, expiringEndOfMonth: 0, effectiveAllocated: 0 };
  }

  if (rule?.monthlyCarryForward === false) {
    return {
      carriedForward: 0,
      expiredTotal: 0,
      expiringEndOfMonth: 0,
      effectiveAllocated: Number(monthlyQuota.toFixed(1)),
    };
  }

  const expiryMonths = Math.max(0, Number(rule?.expiryMonths || 0));
  const maxCap = rule?.maxDays !== undefined && Number(rule.maxDays) > 0 ? Number(rule.maxDays) : Infinity;

  let buckets: Array<{ earnedMonth: number; remaining: number }> = [];
  let expiredTotal = 0;

  for (let m = accrualStartMonth; m <= targetMonthIdx; m++) {
    // 1. Expire buckets whose rollover validity window has passed
    if (expiryMonths > 0) {
      const nextBuckets: Array<{ earnedMonth: number; remaining: number }> = [];
      for (const b of buckets) {
        if (m > b.earnedMonth + expiryMonths) {
          expiredTotal += b.remaining;
        } else {
          nextBuckets.push(b);
        }
      }
      buckets = nextBuckets;
    }

    // 2. Cap carried-forward balance entering month m
    if (m > accrualStartMonth && Number.isFinite(maxCap)) {
      let totalCarried = buckets.reduce((s, b) => s + b.remaining, 0);
      if (totalCarried > maxCap) {
        let excess = totalCarried - maxCap;
        for (const b of buckets) {
          if (excess <= 0) break;
          const trim = Math.min(b.remaining, excess);
          b.remaining = Number((b.remaining - trim).toFixed(2));
          excess = Number((excess - trim).toFixed(2));
          expiredTotal += trim;
        }
        buckets = buckets.filter((b) => b.remaining > 0.001);
      }
    }

    // 3. If we reached targetMonthIdx, capture carry-forward entering this month
    if (m === targetMonthIdx) {
      const carriedForward = Number(buckets.reduce((s, b) => s + b.remaining, 0).toFixed(1));
      const expiringEndOfMonth =
        expiryMonths > 0
          ? Number(
              buckets
                .filter((b) => b.earnedMonth + expiryMonths === targetMonthIdx)
                .reduce((s, b) => s + b.remaining, 0)
                .toFixed(1)
            )
          : 0;
      const effectiveAllocated = Number((monthlyQuota + carriedForward).toFixed(1));
      return {
        carriedForward,
        expiredTotal: Number(expiredTotal.toFixed(1)),
        expiringEndOfMonth,
        effectiveAllocated,
      };
    }

    // 4. Credit month m's quota and consume month m's leaves (FIFO — oldest bucket first)
    buckets.push({ earnedMonth: m, remaining: monthlyQuota });
    let toConsume = Number(usedByMonth[m] || 0);
    for (const b of buckets) {
      if (toConsume <= 0) break;
      const take = Math.min(b.remaining, toConsume);
      b.remaining = Number((b.remaining - take).toFixed(2));
      toConsume = Number((toConsume - take).toFixed(2));
    }
    buckets = buckets.filter((b) => b.remaining > 0.001);
  }

  return {
    carriedForward: 0,
    expiredTotal: Number(expiredTotal.toFixed(1)),
    expiringEndOfMonth: 0,
    effectiveAllocated: Number(monthlyQuota.toFixed(1)),
  };
}
