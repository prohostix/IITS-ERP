const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/controllers/payrollController.ts');
let content = fs.readFileSync(file, 'utf8');

const replacement = `export const generateMonthlyPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month } = req.body; // expected format 'YYYY-MM'
  
  if (!month) {
    res.status(400).json({ success: false, message: 'Month is required' });
    return;
  }

  // Get active employees with salary configs
  const users = await prisma.user.findMany({
    where: { 
      organizationId: req.user.organizationId, 
      status: 'active' as any,
    },
    include: {
      salaryConfig: true,
      employeeProfile: true
    }
  });

  const generated = [];
  const errors = [];

  for (const user of users) {
    if (!user.salaryConfig) {
      errors.push(\`User \${user.name} missing salary config\`);
      continue;
    }

    const { basicSalary, allowances, deductions } = user.salaryConfig;
    
    // Parse json
    const parsedAllowances = typeof allowances === 'string' ? JSON.parse(allowances) : (allowances || {});
    const parsedDeductions = typeof deductions === 'string' ? JSON.parse(deductions) : (deductions || {});
    
    let allowancesTotal = 0;
    if (Array.isArray(parsedAllowances)) {
       parsedAllowances.forEach((a: any) => allowancesTotal += Number(a.amount || 0));
    } else {
       Object.values(parsedAllowances).forEach((v: any) => allowancesTotal += Number(v || 0));
    }

    let deductionsTotal = 0;
    if (Array.isArray(parsedDeductions)) {
       parsedDeductions.forEach((d: any) => deductionsTotal += Number(d.amount || 0));
    } else {
       Object.values(parsedDeductions).forEach((v: any) => deductionsTotal += Number(v || 0));
    }

    const grossSalary = basicSalary + allowancesTotal;
    const netSalary = grossSalary - deductionsTotal;

    try {
      const payroll = await prisma.payroll.upsert({
        where: {
          userId_month: {
            userId: user.id,
            month: month
          }
        },
        update: {
          basicSalary,
          allowances: parsedAllowances,
          deductions: parsedDeductions,
          grossSalary,
          netSalary
        },
        create: {
          organizationId: req.user.organizationId,
          userId: user.id,
          month: month,
          basicSalary,
          allowances: parsedAllowances,
          deductions: parsedDeductions,
          grossSalary,
          netSalary,
          status: 'draft',
          generatedBy: req.user.id
        }
      });
      generated.push(payroll);
    } catch (err: any) {
      errors.push(\`Failed to generate for \${user.name}: \${err.message}\`);
    }
  }

  res.status(201).json({ success: true, data: generated, errors });
});`;

content = content.replace(/export const generateMonthlyPayroll = asyncHandler[\s\S]*?res\.json\(\{ success: true, message: 'Monthly payroll generation logic not implemented' \}\);\n\}\);/, replacement);
fs.writeFileSync(file, content);
console.log('Fixed generateMonthlyPayroll');
