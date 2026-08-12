const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/controllers/attendanceController.ts');
let content = fs.readFileSync(file, 'utf8');

const replacement = `export const getActivityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date, departmentId } = req.query;
  const targetDate = date ? new Date(date as string) : new Date();
  
  // Set to midnight UTC for comparison
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  let userWhere: any = { organizationId: req.user.organizationId, status: 'active' as any };
  if (departmentId) {
    userWhere.employeeProfile = { departmentId: departmentId as string };
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    include: {
      employeeProfile: { include: { department: true } },
      employee: true,
      attendances: {
        where: {
          date: { gte: startOfDay, lte: endOfDay }
        }
      }
    }
  });

  const data = users.map(u => {
    const att = u.attendances[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.employeeProfile?.department?.name || '-',
      checkIn: att?.checkIn || null,
      checkOut: att?.checkOut || null,
      status: att?.status || 'absent',
      workingHours: att?.workingHours || 0,
      isLate: att?.isLate || false,
      lateMinutes: att?.lateMinutes || 0
    };
  });

  res.json({ success: true, data, scheduledHours: 8, breakMinutes: 60 });
});`;

content = content.replace(/export const getActivityReport = asyncHandler[\s\S]*?res\.json\(\{ success: true, data: \[\] \}\);\n\}\);/, replacement);
fs.writeFileSync(file, content);
console.log('Fixed getActivityReport');
