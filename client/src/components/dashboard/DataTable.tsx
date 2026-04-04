import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  searchable?: boolean;
  searchFields?: string[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => { label: string; onClick: () => void; variant?: 'default' | 'destructive' }[];
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  searchable = true,
  searchFields = [],
  pageSize = 10,
  onRowClick,
  actions,
  className,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!searchQuery || searchFields.length === 0) return data;
    
    return data.filter(row =>
      searchFields.some(field => {
        const value = getNestedValue(row, field);
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
  }, [data, searchQuery, searchFields]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-slate-100 text-slate-800 border-slate-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      draft: 'bg-slate-100 text-slate-800 border-slate-200',
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      open: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-slate-100 text-slate-800 border-slate-200',
      converted: 'bg-green-100 text-green-800 border-green-200',
      lost: 'bg-red-100 text-red-800 border-red-200',
    };
    
    return (
      <Badge variant="outline" className={cn('capitalize', variants[status] || 'bg-slate-100')}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className={cn('bg-white rounded-lg border border-slate-200', className)}>
      {/* Header */}
      {(title || searchable) && (
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
          
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-64"
                />
              </div>
            )}
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'font-semibold text-slate-700',
                    column.sortable && 'cursor-pointer hover:bg-slate-100',
                    column.width
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && sortConfig?.key === column.key && (
                      <span className="text-xs">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-16">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-8 text-slate-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    'hover:bg-slate-50',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render ? (
                        column.render(row)
                      ) : column.key === 'status' ? (
                        getStatusBadge(getNestedValue(row, column.key))
                      ) : (
                        formatValue(getNestedValue(row, column.key))
                      )}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions(row).map((action, i) => (
                            <DropdownMenuItem
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick();
                              }}
                              className={cn(
                                action.variant === 'destructive' && 'text-red-600'
                              )}
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <div className="text-sm text-slate-500">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

// Helper function to format values
function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// Status badge component for external use
export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-slate-100 text-slate-800 border-slate-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    suspended: 'bg-red-100 text-red-800 border-red-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    draft: 'bg-slate-100 text-slate-800 border-slate-200',
    sent: 'bg-blue-100 text-blue-800 border-blue-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    open: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-slate-100 text-slate-800 border-slate-200',
    converted: 'bg-green-100 text-green-800 border-green-200',
    lost: 'bg-red-100 text-red-800 border-red-200',
  };
  
  return (
    <Badge variant="outline" className={cn('capitalize', variants[status] || 'bg-slate-100')}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
