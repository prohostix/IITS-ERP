import re

with open('server/src/controllers/taskController.ts', 'r') as f:
    content = f.read()

get_tasks_original = """export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.assignedTo) where.assignedTo = req.query.assignedTo as string;
  if (req.query.status) where.status = req.query.status as string;"""

get_tasks_new = """export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.assignedTo) where.assignedTo = req.query.assignedTo as string;
  if (req.query.status) where.status = req.query.status as string;

  const isAdmin = ['superadmin', 'org_admin', 'ceo', 'hr_admin', 'finance_admin', 'ops_admin', 'sales_admin'].includes(req.user.role);
  if (!isAdmin) {
    where.OR = [
      { assignedTo: req.user.id },
      { createdBy: req.user.id }
    ];
  }"""

content = content.replace(get_tasks_original, get_tasks_new)

with open('server/src/controllers/taskController.ts', 'w') as f:
    f.write(content)

