import re

with open('server/src/controllers/taskController.ts', 'r') as f:
    content = f.read()

get_task_original = """export const getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },"""

get_task_new = """export const getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isAdmin = ['superadmin', 'org_admin', 'ceo', 'hr_admin', 'finance_admin', 'ops_admin', 'sales_admin'].includes(req.user.role);
  
  const where: any = { id: req.params.id, organizationId: req.user.organizationId };
  if (!isAdmin) {
    where.OR = [
      { assignedTo: req.user.id },
      { createdBy: req.user.id }
    ];
  }

  const task = await prisma.task.findFirst({
    where,"""

content = content.replace(get_task_original, get_task_new)

with open('server/src/controllers/taskController.ts', 'w') as f:
    f.write(content)

