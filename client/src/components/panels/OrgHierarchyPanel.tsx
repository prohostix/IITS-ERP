import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Minus, RefreshCw, UserPlus, Trash2, Edit2, Users, ChevronDown, ChevronUp,
  Layers, Building2, MapPin, RotateCcw
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Dept { id: string; name: string; type: string; }
interface SubDept { id: string; name: string; parentDeptId: string | { id: string; name: string }; }
interface Branch {
  id: string; name: string; code: string; address: string; city?: string;
  branchManagerId?: { id: string; name: string; role: string; userId?: string; designation?: string };
  salesDeptId?: { id: string; name: string; type: string };
  operationsDeptId?: { id: string; name: string; type: string };
  additionalDeptIds?: { id: string; name: string; type: string }[];
}
interface OrgUser { id: string; name: string; email: string; role: string; designation?: string; userId?: string; }
interface DesignationNode {
  id: string;
  title: string;
  level: number;
  maxHeadcount: number;
  departmentId?: Dept;
  subDepartmentId?: SubDept;
  branchId?: { id: string; name: string; code: string };
  parentDesignationId?: { id: string; title: string };
  filledBy: OrgUser[];
  status: string;
}

const ROLE_COLORS: Record<string, string> = {
  org_admin: '#7c3aed', ceo: '#2563eb', general_manager: '#2563eb', ops_admin: '#ea580c', ops_sub_admin: '#ea580c',
  finance_admin: '#059669', finance_sub_admin: '#059669', hr_admin: '#7c3aed', hr_sub_admin: '#7c3aed',
  sales_admin: '#db2777', sales_sub_admin: '#db2777', front_office_admin: '#0891b2', center_admin: '#8b5cf6', branch_manager: '#0284c7', bde: '#4f46e5', employee: '#475569', staff: '#64748b',
};

const getDeptColor = (type?: string, isBranch?: boolean) => {
  if (isBranch) return '#0284c7';
  if (!type) return '#4f46e5';
  const t = type.toLowerCase();
  if (t.includes('hr')) return '#7c3aed';
  if (t.includes('finance')) return '#059669';
  if (t.includes('ops') || t.includes('operation')) return '#ea580c';
  if (t.includes('sale') || t.includes('bde')) return '#db2777';
  if (t.includes('ceo') || t.includes('manager') || t.includes('admin')) return '#2563eb';
  return ROLE_COLORS[t] || '#4f46e5';
};

// ─── OrgNode ──────────────────────────────────────────────────────────────────
function OrgNode({
  node, allNodes, allUsers, allDepts,
  onEdit, onDelete, onAssign, onUnassign, onAddChild, depth = 0,
}: {
  node: DesignationNode; allNodes: DesignationNode[]; allUsers: OrgUser[]; allDepts: Dept[];
  onEdit: (n: DesignationNode) => void; onDelete: (n: DesignationNode) => void;
  onAssign: (n: DesignationNode) => void; onUnassign: (n: DesignationNode, userId: string) => void;
  onAddChild: (parent: DesignationNode) => void; depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = allNodes.filter(n => {
    const pid = typeof n.parentDesignationId === 'object' ? (n.parentDesignationId)?.id : n.parentDesignationId;
    return pid === node.id;
  });
  const filled = node.filledBy?.length || 0;
  const vacant = node.maxHeadcount - filled;
  const isFull = vacant <= 0;

  const boxColor = node.branchId
    ? '#0284c7'  // cyan/sky for branch-scoped
    : getDeptColor(node.departmentId?.type);

  const deptName = node.branchId
    ? node.branchId.name
    : node.departmentId?.name || 'MANAGEMENT';

  const subDeptName = node.subDepartmentId
    ? (typeof node.subDepartmentId === 'object' ? node.subDepartmentId.name : '')
    : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative group" style={{ width: 230 }}>
        {/* Floating Quick Action Buttons on Hover */}
        <div className="absolute -top-3 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-md rounded-full bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
            title="Edit Position"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onAddChild(node)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
            title="Add Subordinate Position"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
            title="Delete Position"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Card Body */}
        <div
          className="rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden text-center"
          style={{ borderColor: boxColor }}
        >
          {/* Header Strip */}
          <div
            className="px-3 py-1.5 flex items-center justify-between text-white text-[10px] font-bold tracking-wide shadow-xs"
            style={{ backgroundColor: boxColor }}
          >
            <div className="flex items-center gap-1.5 truncate">
              {node.branchId ? (
                <>
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{node.branchId.code ? `[${node.branchId.code}]` : ''} {node.branchId.name}</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate uppercase">{deptName}</span>
                </>
              )}
            </div>
            <span className="bg-black/25 text-white text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
              L{node.level || 1}
            </span>
          </div>

          <div className="p-3">
            {/* Title */}
            <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
              {node.title}
            </p>

            {/* Sub-dept badge */}
            {subDeptName && (
              <div className="mt-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Layers className="h-2.5 w-2.5" />{subDeptName}
                </span>
              </div>
            )}

            {/* Capacity Pill */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span
                className={cn(
                  'text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1.5 shadow-2xs border',
                  isFull
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : vacant === node.maxHeadcount
                      ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                )}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isFull ? 'bg-emerald-500' : vacant === node.maxHeadcount ? 'bg-rose-500' : 'bg-amber-500'
                  )}
                />
                <span>{filled}/{node.maxHeadcount} {isFull ? 'Filled' : 'Positions'}</span>
              </span>
            </div>

            {/* Assigned Staff */}
            {filled > 0 && (
              <div className="mt-2.5 space-y-1.5 text-left">
                {node.filledBy.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 transition-colors group/user"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-xs shrink-0"
                      style={{ background: ROLE_COLORS[u.role] || boxColor }}
                    >
                      {(u?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {u.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate leading-none">
                        {(u.designation || u.role).replace(/_/g, ' ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUnassign(node, u.id)}
                      className="text-slate-400 hover:text-red-600 opacity-0 group-hover/user:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/50"
                      title={`Unassign ${u.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Vacant Slot Button */}
            {vacant > 0 && (
              <button
                type="button"
                onClick={() => onAssign(node)}
                className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 rounded-xl py-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 hover:border-indigo-400 transition-all cursor-pointer shadow-2xs"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Assign Staff ({vacant} {vacant === 1 ? 'slot' : 'slots'})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connectors to Children */}
      {children.length > 0 && (
        <>
          <div className="flex flex-col items-center">
            <div className="w-[2.5px] bg-slate-400 dark:bg-slate-500 h-5" />
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="z-10 -my-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-2 border-slate-400 dark:border-slate-500 shadow-sm hover:border-indigo-600 hover:text-indigo-600 dark:hover:border-indigo-400 transition-all flex items-center gap-1 cursor-pointer"
              title={expanded ? 'Collapse subordinates' : `Expand ${children.length} subordinates`}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>{children.length}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>+{children.length}</span>
                </>
              )}
            </button>
            {expanded && (
              <div className="w-[2.5px] bg-slate-400 dark:bg-slate-500 h-5" />
            )}
          </div>

          {expanded && (
            <div className="flex flex-col items-center">
              {children.length > 1 ? (
                <div className="relative flex items-start justify-center">
                  {/* Horizontal line from center of first child to center of last child */}
                  <div
                    className="absolute top-0 bg-slate-400 dark:bg-slate-500 rounded-full"
                    style={{
                      left: 131,
                      right: 131,
                      height: 2.5,
                    }}
                  />
                  {children.map((child) => (
                    <div key={child.id} className="flex flex-col items-center px-4">
                      <div className="w-[2.5px] bg-slate-400 dark:bg-slate-500 h-5" />
                      <OrgNode
                        node={child}
                        allNodes={allNodes}
                        allUsers={allUsers}
                        allDepts={allDepts}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onAssign={onAssign}
                        onUnassign={onUnassign}
                        onAddChild={onAddChild}
                        depth={depth + 1}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <OrgNode
                    node={children[0]}
                    allNodes={allNodes}
                    allUsers={allUsers}
                    allDepts={allDepts}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAssign={onAssign}
                    onUnassign={onUnassign}
                    onAddChild={onAddChild}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Branch section in the chart ─────────────────────────────────────────────
function DeptNode({ dept, color }: { dept: { id: string; name: string; type: string }; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-[2.5px] bg-slate-400 dark:bg-slate-500 h-5" />
      <div
        className="rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-md px-4 py-2.5 text-center min-w-[170px] overflow-hidden"
        style={{ borderColor: color }}
      >
        <span
          className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 inline-block text-white"
          style={{ backgroundColor: color }}
        >
          {dept.type}
        </span>
        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-tight mt-0.5">{dept.name}</p>
      </div>
    </div>
  );
}

function BranchSection({
  branch, allNodes, allUsers, allDepts,
  onEdit, onDelete, onAssign, onUnassign, onAddChild, onAddBranchPosition,
}: {
  branch: Branch; allNodes: DesignationNode[]; allUsers: OrgUser[]; allDepts: Dept[];
  onEdit: (n: DesignationNode) => void; onDelete: (n: DesignationNode) => void;
  onAssign: (n: DesignationNode) => void; onUnassign: (n: DesignationNode, userId: string) => void;
  onAddChild: (parent: DesignationNode) => void; onAddBranchPosition: (branch: Branch) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [branchZoom, setBranchZoom] = useState(100);

  const handleBranchZoomIn = () => setBranchZoom(prev => Math.min(prev + 15, 160));
  const handleBranchZoomOut = () => setBranchZoom(prev => Math.max(prev - 15, 30));
  const handleBranchResetZoom = () => setBranchZoom(100);

  // Designation nodes scoped to this branch with no parent = roots of branch subtree
  const branchRoots = allNodes.filter(n => {
    const bId = typeof n.branchId === 'object' ? (n.branchId)?.id : n.branchId;
    const hasParent = typeof n.parentDesignationId === 'object' ? !!(n.parentDesignationId)?.id : !!n.parentDesignationId;
    return bId === branch.id && !hasParent;
  });

  // Branch manager controls Sales and Operations only — Finance and HR are org-wide
  const BRANCH_CONTROLLED_TYPES = new Set(['sales', 'operations']);
  const controlledDepts: Array<{ id: string; name: string; type: string }> = [];
  const salesDeptObj = typeof branch.salesDeptId === 'object' && branch.salesDeptId ? branch.salesDeptId : (branch as any).salesDept;
  const operationsDeptObj = typeof branch.operationsDeptId === 'object' && branch.operationsDeptId ? branch.operationsDeptId : (branch as any).operationsDept;

  if (salesDeptObj && salesDeptObj.id) {
    controlledDepts.push({ id: salesDeptObj.id, name: salesDeptObj.name, type: 'sales' });
  }
  if (operationsDeptObj && operationsDeptObj.id) {
    controlledDepts.push({ id: operationsDeptObj.id, name: operationsDeptObj.name, type: 'operations' });
  }
  if (branch.additionalDeptIds) {
    branch.additionalDeptIds
      .filter(d => BRANCH_CONTROLLED_TYPES.has(d.type))
      .forEach(d => {
        if (d && d.id && !controlledDepts.find(x => x.id === d.id)) {
          controlledDepts.push({ id: d.id, name: d.name, type: d.type });
        }
      });
  }

  const DEPT_COLORS: Record<string, string> = {
    sales: '#ca8a04', operations: '#ea580c', finance: '#059669',
    hr: '#7c3aed', ceo: '#2563eb', custom: '#6366f1',
  };

  const mgr = branch.branchManagerId;

  return (
    <div className="border-2 rounded-2xl p-5 bg-cyan-50/40 dark:bg-slate-900/40 shadow-sm" style={{ borderColor: '#0891b244' }}>
      {/* Branch header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-xs">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-cyan-950 dark:text-cyan-100">{branch.name}</span>
              <span className="text-xs font-mono font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800">
                {branch.code}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-cyan-700 dark:text-cyan-400 mt-0.5 font-medium">
              <MapPin className="h-3 w-3" />{branch.address}{branch.city ? `, ${branch.city}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls for branch hierarchy */}
          {expanded && (
            <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 p-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800 shadow-2xs">
              <button
                type="button"
                onClick={handleBranchZoomOut}
                disabled={branchZoom <= 30}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-cyan-50 dark:hover:bg-slate-700 text-cyan-900 dark:text-cyan-200 text-xs font-bold disabled:opacity-40"
                title="Zoom Out (-)"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleBranchResetZoom}
                className="px-1.5 text-[10px] font-mono font-bold text-cyan-900 dark:text-cyan-200 hover:bg-cyan-50 dark:hover:bg-slate-700 rounded transition-colors"
                title="Click to reset zoom"
              >
                {branchZoom}%
              </button>
              <button
                type="button"
                onClick={handleBranchZoomIn}
                disabled={branchZoom >= 160}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-cyan-50 dark:hover:bg-slate-700 text-cyan-900 dark:text-cyan-200 text-xs font-bold disabled:opacity-40"
                title="Zoom In (+)"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}

          <Button size="sm" variant="outline" className="text-xs h-7 font-semibold"
            onClick={() => onAddBranchPosition(branch)}>
            <Plus className="h-3 w-3 mr-1" /> Add Position
          </Button>
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="overflow-x-auto p-4 sm:p-6 rounded-xl border border-cyan-200/60 dark:border-cyan-800/60"
          style={{
            backgroundColor: '#f8fafc',
            backgroundImage: 'radial-gradient(#0891b233 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div
            className="flex flex-col items-center min-w-max pb-4 origin-top transition-transform duration-150"
            style={{ transform: `scale(${branchZoom / 100})` }}
          >
            {/* ── Branch Manager node ── */}
            {mgr ? (
              <div className="relative group" style={{ width: 230 }}>
                <div
                  className="rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden text-center"
                  style={{ borderColor: '#0284c7' }}
                >
                  <div className="px-3 py-1.5 flex items-center justify-between text-white text-[10px] font-bold tracking-wide bg-sky-600 shadow-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>BRANCH MANAGER</span>
                    </div>
                    <span className="bg-black/25 text-white text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                      L1
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{mgr.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {mgr.designation || mgr.role.replace(/_/g, ' ')}
                    </p>
                    <div className="mt-2 flex items-center justify-center">
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                        Controls {controlledDepts.length} department{controlledDepts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed px-5 py-4 text-center text-sm text-muted-foreground bg-white/80 dark:bg-slate-900/80 min-w-[220px]"
                style={{ borderColor: '#0284c766' }}>
                <Building2 className="h-5 w-5 mx-auto mb-1 text-sky-500" />
                <span className="font-semibold text-xs">No branch manager assigned</span>
              </div>
            )}

            {/* Connector down to dept row */}
            {controlledDepts.length > 0 && (
              <>
                <div className="w-[2.5px] bg-slate-400 dark:bg-slate-500 h-5" />
                {/* Horizontal bar spanning all dept nodes */}
                {controlledDepts.length > 1 ? (
                  <div className="relative flex items-start justify-center">
                    <div
                      className="absolute top-0 bg-slate-400 dark:bg-slate-500 rounded-full"
                      style={{
                        left: 101, // 170/2 = 85 + 16px padding = 101
                        right: 101,
                        height: 2.5,
                      }}
                    />
                    {controlledDepts.map((dept) => (
                      <div key={dept.id} className="flex flex-col items-center px-4">
                        <div className="w-[2.5px] bg-slate-400 dark:bg-slate-500 h-5" />
                        <DeptNode dept={dept} color={DEPT_COLORS[dept.type] || '#6366f1'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <DeptNode dept={controlledDepts[0]} color={DEPT_COLORS[controlledDepts[0].type] || '#6366f1'} />
                  </div>
                )}
              </>
            )}

            {/* Designation nodes for this branch (below the dept row) */}
            {branchRoots.length > 0 && (
              <>
                <div className="w-[2.5px] bg-slate-400 dark:bg-slate-500 h-6" />
                <div className="flex gap-10 justify-center pt-2">
                  {branchRoots.map(root => (
                    <OrgNode key={root.id} node={root} allNodes={allNodes} allUsers={allUsers} allDepts={allDepts}
                      onEdit={onEdit} onDelete={onDelete} onAssign={onAssign}
                      onUnassign={onUnassign} onAddChild={onAddChild} />
                  ))}
                </div>
              </>
            )}

            {branchRoots.length === 0 && controlledDepts.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed border-cyan-200 dark:border-cyan-800 rounded-xl mt-4 w-full bg-white/60 dark:bg-slate-900/60">
                No positions defined for this branch yet.
                <br />
                <button onClick={() => onAddBranchPosition(branch)}
                  className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline text-xs mt-1 inline-flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add first position
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function OrgHierarchyPanel() {
  const [nodes, setNodes] = useState<DesignationNode[]>([]);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [allDepts, setAllDepts] = useState<Dept[]>([]);
  const [allSubDepts, setAllSubDepts] = useState<SubDept[]>([]);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Create / Edit designation dialog ──
  const [designDialog, setDesignDialog] = useState(false);
  const [editingNode, setEditingNode] = useState<DesignationNode | null>(null);
  const [designForm, setDesignForm] = useState({
    title: '', departmentId: '', subDepartmentId: '', branchId: '',
    level: '1', maxHeadcount: '1', parentDesignationId: '',
  });

  // ── Create sub-department dialog ──
  const [subDeptDialog, setSubDeptDialog] = useState(false);
  const [subDeptForm, setSubDeptForm] = useState({ name: '', parentDeptId: '' });
  const [subDeptSaving, setSubDeptSaving] = useState(false);

  // ── Assign user dialog ──
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignTarget, setAssignTarget] = useState<DesignationNode | null>(null);
  const [assignUserId, setAssignUserId] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [nodesRes, usersRes, deptsRes, subDeptsRes, branchRes] = await Promise.all([
        api.get('/org/designations'),
        api.get('/users'),
        api.get('/departments'),
        api.get('/sub-departments'),
        api.get('/org/branches'),
      ]);
      setNodes(nodesRes.data.data || []);
      setAllUsers(usersRes.data.data?.filter((u: any) => !['ceo', 'superadmin', 'org_admin', 'center_admin', 'student'].includes(u.role)) || []);
      setAllDepts(deptsRes.data.data || []);
      setAllSubDepts(subDeptsRes.data.data || []);
      setAllBranches(branchRes.data.data || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredSubDepts = designForm.departmentId
    ? allSubDepts.filter(sd => {
        if (!sd.parentDeptId) return false;
        const parentId = typeof sd.parentDeptId === 'object' ? sd.parentDeptId.id : sd.parentDeptId;
        return parentId === designForm.departmentId;
      })
    : allSubDepts;

  const openCreate = (parent?: DesignationNode) => {
    setEditingNode(null);
    setDesignForm({
      title: '',
      departmentId: parent?.departmentId?.id || '',
      subDepartmentId: '',
      branchId: parent?.branchId?.id || '',
      level: parent ? String((parent.level || 1) + 1) : '1',
      maxHeadcount: '1',
      parentDesignationId: parent?.id || '',
    });
    setDesignDialog(true);
  };

  // Open create dialog pre-scoped to a branch
  const openCreateForBranch = (branch: Branch) => {
    setEditingNode(null);
    setDesignForm({
      title: 'Branch Manager',
      departmentId: '',
      subDepartmentId: '',
      branchId: branch.id,
      level: '2',
      maxHeadcount: '1',
      parentDesignationId: '',
    });
    setDesignDialog(true);
  };

  const openEdit = (node: DesignationNode) => {
    setEditingNode(node);
    setDesignForm({
      title: node.title,
      departmentId: node.departmentId?.id || '',
      subDepartmentId: node.subDepartmentId?.id || '',
      branchId: node.branchId?.id || '',
      level: String(node.level),
      maxHeadcount: String(node.maxHeadcount),
      parentDesignationId: node.parentDesignationId?.id || '',
    });
    setDesignDialog(true);
  };

  const handleSaveDesignation = async () => {
    if (!designForm.title) return;
    setSaving(true);
    try {
      const payload = {
        title: designForm.title,
        departmentId: designForm.departmentId || null,
        subDepartmentId: designForm.subDepartmentId || null,
        branchId: designForm.branchId || null,
        level: Number(designForm.level),
        maxHeadcount: Number(designForm.maxHeadcount),
        parentDesignationId: designForm.parentDesignationId || null,
      };
      if (editingNode) {
        await api.patch(`/org/designations/${editingNode.id}`, payload);
      } else {
        await api.post('/org/designations', payload);
      }
      setDesignDialog(false);
      fetchAll();
    } catch (e) {
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubDept = async () => {
    if (!subDeptForm.name || !subDeptForm.parentDeptId) return;
    setSubDeptSaving(true);
    try {
      await api.post('/sub-departments', subDeptForm);
      setSubDeptDialog(false);
      setSubDeptForm({ name: '', parentDeptId: '' });
      const res = await api.get('/sub-departments');
      setAllSubDepts(res.data.data || []);
    } catch (e) {
    } finally {
      setSubDeptSaving(false);
    }
  };

  const handleDelete = async (node: DesignationNode) => {
    if (!confirm(`Delete "${node.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/org/designations/${node.id}`);
      fetchAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete');
    }
  };

  const openAssign = (node: DesignationNode) => {
    setAssignTarget(node);
    setAssignUserId('');
    setAssignDialog(true);
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignUserId) return;
    setSaving(true);
    try {
      await api.patch(`/org/designations/${assignTarget.id}/assign`, { userId: assignUserId });
      setAssignDialog(false);
      fetchAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (node: DesignationNode, userId: string) => {
    try {
      await api.patch(`/org/designations/${node.id}/unassign`, { userId });
      fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  // Global zoom state for Head Office hierarchy
  const [zoom, setZoom] = useState(100);
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 30));
  const handleResetZoom = () => setZoom(100);

  // Global (non-branch) root nodes
  const globalRoots = nodes.filter(n => {
    const hasParent = typeof n.parentDesignationId === 'object' ? !!(n.parentDesignationId)?.id : !!n.parentDesignationId;
    const hasBranch = typeof n.branchId === 'object' ? !!(n.branchId)?.id : !!n.branchId;
    return !hasParent && !hasBranch;
  });
  const assignedUserIds = new Set(nodes.flatMap(n => (n.filledBy || []).map(u => u.id)));
  const unassignedUsers = allUsers.filter(u => !assignedUserIds.has(u.id));

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading org chart...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Organisation Chart</h2>
          <p className="text-sm text-muted-foreground">
            Build the designation hierarchy. Branches have their own position trees.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:flex sm:flex-row gap-2">
          <Button size="sm" variant="outline" onClick={() => setSubDeptDialog(true)} className="w-full sm:w-auto">
            <Layers className="h-4 w-4 mr-1" /> Sub-Dept
          </Button>
          <Button size="sm" variant="outline" onClick={fetchAll} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => openCreate()} className="col-span-2 sm:col-span-1 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" /> Add Position
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Filled Position</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Vacant Slots</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Branch Scoped</span>
        <span className="flex items-center gap-1.5 text-muted-foreground ml-auto hidden sm:flex"><Edit2 className="h-3 w-3 text-indigo-500" /> Hover any card for quick actions (Edit, Add Subordinate, Delete)</span>
      </div>

      {/* Global org chart */}
      {globalRoots.length > 0 && (
        <div className="border-2 border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-md overflow-hidden">
          {/* Sticky Toolbar Bar */}
          <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Organisation — Head Office</span>
                  <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {nodes.filter(n => !n.branchId).length} Positions
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Use the + / - buttons to zoom in and out, scroll or drag to inspect the hierarchy
                </p>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 30}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-slate-700 font-bold"
                  title="Zoom Out (-)"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors font-mono"
                  title="Click to reset zoom to 100%"
                >
                  {zoom}%
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 160}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-slate-700 font-bold"
                  title="Zoom In (+)"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetZoom}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  title="Reset to 100%"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div
            className="overflow-auto p-6 sm:p-12 min-h-[520px]"
            style={{
              backgroundColor: '#f8fafc',
              backgroundImage: 'radial-gradient(#94a3b8 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px',
            }}
          >
            <div
              className="inline-flex gap-16 justify-center min-w-full pb-16 transition-transform duration-150 origin-top"
              style={{
                transform: `scale(${zoom / 100})`,
              }}
            >
              {globalRoots.map(root => (
                <OrgNode
                  key={root.id}
                  node={root}
                  allNodes={nodes}
                  allUsers={allUsers}
                  allDepts={allDepts}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onAssign={openAssign}
                  onUnassign={handleUnassign}
                  onAddChild={openCreate}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {globalRoots.length === 0 && allBranches.length === 0 && (
        <div className="border-2 border-dashed rounded-xl p-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No positions defined yet.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Start by adding the top-level position (e.g. "CEO"), then add positions below it.
            Create branches in the Branches tab to add branch-specific hierarchies.
          </p>
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4 mr-2" /> Add First Position
          </Button>
        </div>
      )}

      {/* Branch sections */}
      {allBranches.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Branch Hierarchies ({allBranches.length})
          </p>
          {allBranches.map(branch => (
            <BranchSection
              key={branch.id}
              branch={branch}
              allNodes={nodes}
              allUsers={allUsers}
              allDepts={allDepts}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAssign={openAssign}
              onUnassign={handleUnassign}
              onAddChild={openCreate}
              onAddBranchPosition={openCreateForBranch}
            />
          ))}
        </div>
      )}

      {/* Unassigned users */}
      {unassignedUsers.length > 0 && (
        <div className="border rounded-xl p-4 bg-amber-50">
          <p className="text-sm font-semibold text-amber-700 mb-2">
            {unassignedUsers.length} people not yet placed in the chart
          </p>
          <div className="flex flex-wrap gap-2">
            {unassignedUsers.map(u => (
              <span key={u.id} className="text-xs bg-white border rounded-full px-3 py-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ background: ROLE_COLORS[u.role] || '#6366f1' }}>
                  {(u?.name || '?').charAt(0)}
                </span>
                {u.name}
                <span className="text-gray-400">({(u.designation || u.role).replace(/_/g, ' ')})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Create / Edit Designation Dialog ── */}
      <Dialog open={designDialog} onOpenChange={setDesignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNode ? 'Edit Position' : 'Add Position'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Position Title *</Label>
              <Input placeholder="e.g. CEO, Branch Manager, Sales Executive"
                value={designForm.title}
                onChange={e => setDesignForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Level (1 = top)</Label>
                <Input type="number" min={1} value={designForm.level}
                  onChange={e => setDesignForm(p => ({ ...p, level: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Max Headcount</Label>
                <Input type="number" min={1} value={designForm.maxHeadcount}
                  onChange={e => setDesignForm(p => ({ ...p, maxHeadcount: e.target.value }))} />
              </div>
            </div>

            {/* Branch selector */}
            <div className="space-y-1">
              <Label>Branch (leave empty for head office)</Label>
              <Select value={designForm.branchId || '__none__'}
                onValueChange={v => setDesignForm(p => ({ ...p, branchId: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Head office / global" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Head office / global</SelectItem>
                  {allBranches.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} [{b.code}] — {b.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={designForm.departmentId || '__none__'}
                onValueChange={v => setDesignForm(p => ({
                  ...p, departmentId: v === '__none__' ? '' : v, subDepartmentId: '',
                }))}>
                <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {allDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {designForm.departmentId && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Sub-Department</Label>
                  <button type="button"
                    onClick={() => { setSubDeptForm({ name: '', parentDeptId: designForm.departmentId }); setSubDeptDialog(true); }}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <Plus className="h-3 w-3" /> New
                  </button>
                </div>
                <Select value={designForm.subDepartmentId || '__none__'}
                  onValueChange={v => setDesignForm(p => ({ ...p, subDepartmentId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select sub-department..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {filteredSubDepts.map(sd => (
                      <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredSubDepts.length === 0 && (
                  <p className="text-xs text-muted-foreground">No sub-departments for this department yet.</p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label>Reports To (parent position)</Label>
              <Select value={designForm.parentDesignationId || '__none__'}
                onValueChange={v => setDesignForm(p => ({ ...p, parentDesignationId: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {nodes
                    .filter(n => n.id !== editingNode?.id)
                    .map(n => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.title}{n.branchId ? ` [${n.branchId.code}]` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesignDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDesignation} disabled={saving || !designForm.title}>
              {saving ? 'Saving...' : editingNode ? 'Save Changes' : 'Create Position'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Sub-Department Dialog ── */}
      <Dialog open={subDeptDialog} onOpenChange={setSubDeptDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Sub-Department</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input placeholder="e.g. Admissions, Accounts Payable"
                value={subDeptForm.name}
                onChange={e => setSubDeptForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Parent Department *</Label>
              <Select value={subDeptForm.parentDeptId || '__none__'}
                onValueChange={v => setSubDeptForm(p => ({ ...p, parentDeptId: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select...</SelectItem>
                  {allDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDeptDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSubDept}
              disabled={subDeptSaving || !subDeptForm.name || !subDeptForm.parentDeptId}>
              {subDeptSaving ? 'Creating...' : 'Create Sub-Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign User Dialog ── */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to "{assignTarget?.title}"
              {assignTarget?.branchId && (
                <span className="text-sm font-normal text-cyan-600 ml-2">
                  [{assignTarget.branchId.code}]
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {(assignTarget?.maxHeadcount || 1) - (assignTarget?.filledBy?.length || 0)} slot(s) available
            </p>
            <div className="space-y-1">
              <Label>Select Person</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger><SelectValue placeholder="Choose a person..." /></SelectTrigger>
                <SelectContent>
                  {allUsers
                    .filter(u => !assignTarget?.filledBy?.find(f => f.id === u.id))
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} — {u.designation || u.role.replace(/_/g, ' ')} {u.userId ? `(${u.userId})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={saving || !assignUserId}>
              {saving ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
