import React from 'react';
import { format } from 'date-fns';

interface Payroll {
  id: string;
  organization?: { name?: string; address?: string; email?: string; phone?: string };
  user?: { name?: string; email?: string; userId?: string; designation?: string; departmentName?: string; department?: { name?: string } };
  employeeId?: any;
  month: string;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  allowances: any;
  deductions: any;
  bonus: number;
  overtime: number;
  arrears?: number;
  professionalTax?: number;
  labourWelfareFund?: number;
  tds?: number;
  status: string;
  remarks?: string;
  createdAt: string;
}

const formatDeductionLabel = (key: string) => {
  switch (key) {
    case 'loss_of_pay':
      return 'Loss of Pay (Absenteeism)';
    case 'late_arrival':
    case 'late_deduction':
      return 'Late Arrival Penalty';
    case 'early_leaving':
      return 'Early Leaving Penalty';
    case 'pf':
      return 'Provident Fund (PF)';
    case 'tax':
      return 'Income Tax / TDS';
    case 'insurance':
      return 'Insurance';
    case 'other':
      return 'Other Deductions';
    default:
      return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
};

const formatINR = (val: number) => `₹${Math.round(Number(val) || 0).toLocaleString('en-IN')}`;

export function PayslipDocument({ payroll }: { payroll: Payroll }) {
  if (!payroll) return null;

  const empObj =
    (payroll.user && typeof payroll.user === 'object' ? payroll.user : null) ||
    (payroll.employeeId && typeof payroll.employeeId === 'object' ? payroll.employeeId : null) ||
    {};

  // Normalize allowances (supports both object map and array of { name, amount }; omit ₹0 rows)
  const allowanceRows: Array<{ label: string; amount: number }> = [];
  if (Array.isArray(payroll.allowances)) {
    payroll.allowances.forEach((a: any) => {
      const amt = Number(a?.amount) || 0;
      if (a?.name && amt > 0) allowanceRows.push({ label: a.name, amount: amt });
    });
  } else if (payroll.allowances && typeof payroll.allowances === 'object') {
    Object.entries(payroll.allowances).forEach(([key, val]: any) => {
      const amt = Number(val) || 0;
      if (amt > 0) {
        const label = key === 'hra' ? 'HRA' : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        allowanceRows.push({ label, amount: amt });
      }
    });
  }

  // Normalize deductions (supports both object map and array of { name, amount })
  const deductionRows: Array<{ label: string; amount: number }> = [];
  if (Array.isArray(payroll.deductions)) {
    payroll.deductions.forEach((d: any) => {
      const amt = Number(d?.amount) || 0;
      if (d?.name && amt > 0) deductionRows.push({ label: d.name, amount: amt });
    });
  } else if (payroll.deductions && typeof payroll.deductions === 'object') {
    Object.entries(payroll.deductions).forEach(([key, val]: any) => {
      if (key === 'tax' && Number(payroll.tds || 0) > 0) return;
      const amt = Number(val) || 0;
      if (amt > 0) deductionRows.push({ label: formatDeductionLabel(key), amount: amt });
    });
  }
  if (Number(payroll.professionalTax || 0) > 0) {
    deductionRows.push({ label: 'Professional Tax (PT)', amount: Number(payroll.professionalTax) });
  }
  if (Number(payroll.labourWelfareFund || 0) > 0) {
    deductionRows.push({ label: 'Labour Welfare Fund (LWF)', amount: Number(payroll.labourWelfareFund) });
  }
  if (Number(payroll.tds || 0) > 0) {
    deductionRows.push({ label: 'Income Tax / TDS', amount: Number(payroll.tds) });
  }

  const totalDeductions = deductionRows.reduce((s, r) => s + r.amount, 0);

  let formattedDate = '—';
  try {
    formattedDate = format(new Date(payroll.createdAt || new Date()), 'MMM dd, yyyy');
  } catch {
    formattedDate = '—';
  }

  return (
    <div
      id={`payslip-${payroll.id}`}
      style={{ width: '710px', maxWidth: '710px', boxSizing: 'border-box' }}
      className="bg-white p-7 font-sans text-gray-800 border border-gray-200"
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-4 mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-indigo-600">
            {payroll.organization?.name || 'IITS Education'}
          </h1>
          {(payroll.organization?.address || payroll.organization?.email) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {payroll.organization?.address || payroll.organization?.email}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <h2 className="text-xl font-extrabold uppercase tracking-wide text-gray-800">Payslip</h2>
          <p className="text-xs font-semibold text-gray-600 mt-0.5">Month: {payroll.month}</p>
        </div>
      </div>

      {/* Employee & Payslip Meta */}
      <div className="grid grid-cols-2 gap-6 mb-6 text-xs bg-gray-50/70 border border-gray-200 rounded-lg p-3.5">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-600 w-28 shrink-0 whitespace-nowrap">Employee Name:</span>
            <span className="font-bold text-gray-900 truncate">{empObj.name || 'Unknown'}</span>
          </div>
          {empObj.userId && (
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-gray-600 w-28 shrink-0 whitespace-nowrap">Employee ID:</span>
              <span className="text-gray-800 font-mono">{empObj.userId}</span>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-600 w-28 shrink-0 whitespace-nowrap">Employee Email:</span>
            <span className="text-gray-800 break-all">{empObj.email || 'N/A'}</span>
          </div>
        </div>
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-600 w-24 shrink-0 whitespace-nowrap">Payslip Date:</span>
            <span className="text-gray-800">{formattedDate}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-600 w-24 shrink-0 whitespace-nowrap">Status:</span>
            <span className="uppercase text-emerald-700 font-bold">{(payroll.status || 'draft').replace(/_/g, ' ')}</span>
          </div>
          {empObj.designation && (
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-gray-600 w-24 shrink-0 whitespace-nowrap">Designation:</span>
              <span className="text-gray-800 truncate">{empObj.designation}</span>
            </div>
          )}
          {(empObj.departmentName || empObj.department?.name) && (
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-gray-600 w-24 shrink-0 whitespace-nowrap">Department:</span>
              <span className="text-gray-800 truncate">{empObj.departmentName || empObj.department?.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Earnings & Deductions Table */}
      <div className="grid grid-cols-2 gap-0 border border-gray-300 mb-5 rounded-lg overflow-hidden">
        {/* Earnings */}
        <div className="border-r border-gray-300 flex flex-col">
          <div className="bg-gray-100 font-bold px-3.5 py-2 border-b border-gray-300 uppercase text-xs tracking-wider text-gray-700">
            Earnings
          </div>
          <div className="p-3.5 space-y-2 text-xs flex-grow">
            <div className="flex justify-between gap-2">
              <span className="text-gray-700">Basic Salary</span>
              <span className="font-semibold text-gray-900 whitespace-nowrap">{formatINR(payroll.basicSalary)}</span>
            </div>
            {allowanceRows.map((row, idx) => (
              <div key={`${row.label}-${idx}`} className="flex justify-between gap-2">
                <span className="text-gray-700">{row.label}</span>
                <span className="font-semibold text-gray-900 whitespace-nowrap">{formatINR(row.amount)}</span>
              </div>
            ))}
            {Number(payroll.arrears || 0) > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-700">Salary Arrears</span>
                <span className="font-semibold text-emerald-700 whitespace-nowrap">{formatINR(payroll.arrears || 0)}</span>
              </div>
            )}
            {Number(payroll.bonus || 0) > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-700">Bonus</span>
                <span className="font-semibold text-gray-900 whitespace-nowrap">{formatINR(payroll.bonus)}</span>
              </div>
            )}
            {Number(payroll.overtime || 0) > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-700">Overtime</span>
                <span className="font-semibold text-gray-900 whitespace-nowrap">{formatINR(payroll.overtime)}</span>
              </div>
            )}
          </div>
          <div className="bg-gray-50 font-bold px-3.5 py-2.5 border-t border-gray-300 flex justify-between gap-2 text-xs mt-auto">
            <span>Total Earnings</span>
            <span className="text-emerald-700 whitespace-nowrap">{formatINR(payroll.grossSalary)}</span>
          </div>
        </div>

        {/* Deductions */}
        <div className="flex flex-col">
          <div className="bg-gray-100 font-bold px-3.5 py-2 border-b border-gray-300 uppercase text-xs tracking-wider text-gray-700">
            Deductions
          </div>
          <div className="p-3.5 space-y-2 text-xs flex-grow">
            {deductionRows.length === 0 ? (
              <div className="text-gray-400 italic">No deductions</div>
            ) : (
              deductionRows.map((row, idx) => (
                <div key={`${row.label}-${idx}`} className="flex justify-between gap-2">
                  <span className="text-gray-700">{row.label}</span>
                  <span className="font-semibold text-red-600 whitespace-nowrap">-{formatINR(row.amount)}</span>
                </div>
              ))
            )}
          </div>
          <div className="bg-gray-50 font-bold px-3.5 py-2.5 border-t border-gray-300 flex justify-between gap-2 text-xs mt-auto">
            <span>Total Deductions</span>
            <span className="text-red-700 whitespace-nowrap">-{formatINR(totalDeductions)}</span>
          </div>
        </div>
      </div>

      {/* Attendance & Work Days Breakdown */}
      {payroll.remarks && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-950">
          <div className="font-bold uppercase tracking-wider text-[10px] text-amber-900 mb-1">
            Attendance &amp; Work Days Summary
          </div>
          <p className="font-medium text-gray-800 leading-relaxed break-words">{payroll.remarks}</p>
        </div>
      )}

      {/* Net Pay Banner */}
      <div className="bg-indigo-50 border-l-4 border-indigo-600 px-4 py-3.5 rounded-r-lg mb-8 flex justify-between items-center gap-4">
        <span className="text-base font-extrabold text-gray-800 tracking-wide">NET PAY</span>
        <div className="text-right shrink-0">
          <p className="text-2xl font-extrabold text-indigo-700 tracking-tight whitespace-nowrap">
            {formatINR(payroll.netSalary)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>This is a computer-generated document and does not require a signature.</p>
      </div>
    </div>
  );
}
