import { useState } from 'react';
import { ChevronDown, Edit, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'id';
  required?: boolean;
  editable?: boolean;
}

interface DataGridProps {
  columns: Column[];
  data: any[];
  onEdit?: (id: string, data: any) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export function DataGrid({ columns, data, onEdit, onDelete, loading }: DataGridProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-sm text-muted-foreground animate-pulse">Loading secure data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="bg-muted p-4 rounded-full mb-4">
          <ChevronDown className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <div className="text-base font-semibold text-foreground mb-1">No records found</div>
        <div className="text-sm text-muted-foreground max-w-xs">No data is currently available for this view. Try adjusting your filters or refreshing.</div>
      </div>
    );
  }

  const getStatusColor = (value: string) => {
    const status = String(value).toLowerCase();
    if (status.includes('active') || status.includes('paid') || status.includes('success') || status.includes('approved')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    if (status.includes('pending') || status.includes('processing') || status.includes('warn')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    if (status.includes('inactive') || status.includes('failed') || status.includes('error') || status.includes('rejected')) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  };

  const formatValue = (value: any, type?: string, key?: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground/40 italic">—</span>;
    }
    
    if (value === 'N/A') return <span className="text-muted-foreground/40 italic">—</span>;
    
    if (key?.toLowerCase().includes('status')) {
      return (
        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold uppercase border", getStatusColor(value))}>
          {value}
        </span>
      );
    }

    if (type === 'boolean') {
      return (
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", value ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (type === 'date') {
      return (
        <span className="text-muted-foreground whitespace-nowrap">
          {new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      );
    }

    if (type === 'number') {
      return <span className="font-medium text-foreground">{value.toLocaleString()}</span>;
    }
    
    if (typeof value === 'object') {
      if (value.name) return <span className="font-medium text-primary">{value.name}</span>;
      return <span className="text-muted-foreground/60 text-xs truncate max-w-[150px]">{JSON.stringify(value)}</span>;
    }
    
    return <span className="text-foreground truncate max-w-[200px]">{String(value)}</span>;
  };

  return (
    <div className="w-full overflow-hidden">
      {/* Mobile Card View (shown only on small screens) */}
      <div className="md:hidden space-y-4 px-1">
        {data.map((row, rowIndex) => {
          const rowId = row.id || rowIndex;
          return (
            <div key={rowId} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary h-4 w-4"
                    checked={selectedRows.has(rowId)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedRows);
                      if (e.target.checked) newSelected.add(rowId);
                      else newSelected.delete(rowId);
                      setSelectedRows(newSelected);
                    }}
                  />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    #{rowIndex + 1}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(rowId, row)}>
                      <Edit className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="icon-sm" onClick={() => onDelete(rowId)}>
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                {columns.map(col => (
                  <div key={col.key} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                      {col.label}
                    </span>
                    <div className="text-sm font-medium truncate">
                      {formatValue(row[col.key], col.type, col.key)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (hidden on small screens) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-muted/50 transition-colors">
              <th className="sticky left-0 z-20 bg-muted/50 w-12 px-4 py-3 border-b border-r border-border first:rounded-tl-lg">
                <input
                  type="checkbox"
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(data.map(row => row.id || row.id)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                />
              </th>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border transition-colors",
                    idx === columns.length - 1 && "last:rounded-tr-lg"
                  )}
                >
                  <div className="flex items-center gap-2 group cursor-pointer hover:text-foreground">
                    <span className="truncate">{col.label}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((row, rowIndex) => {
              const rowId = row.id || row.id || rowIndex;
              const isSelected = selectedRows.has(rowId);
              return (
                <tr
                  key={rowId}
                  className={cn(
                    'group transition-all duration-150 hover:bg-muted/30',
                    isSelected && 'bg-primary/5 hover:bg-primary/10'
                  )}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-r border-border/50">
                    <input
                      type="checkbox"
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      checked={isSelected}
                      onChange={(e) => {
                        const newSelected = new Set(selectedRows);
                        if (e.target.checked) {
                          newSelected.add(rowId);
                        } else {
                          newSelected.delete(rowId);
                        }
                        setSelectedRows(newSelected);
                      }}
                    />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-sm whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        {formatValue(row[col.key], col.type, col.key)}
                        {col.type === 'id' && (
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary p-1 rounded"
                            title="Copy ID"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(row[col.key]);
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(rowId, row);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-error hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(rowId);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
