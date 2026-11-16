import * as React from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';

export interface ActiveFilterItem {
  category: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterBarProps {
  filters: ActiveFilterItem[];
  onClearAll?: () => void;
  className?: string;
}

export function ActiveFilterBar({ filters, onClearAll, className = '' }: ActiveFilterBarProps) {
  if (!filters || filters.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 pt-2 pb-0.5 text-xs ${className}`}>
      <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
        <Filter className="w-3 h-3 text-primary" /> Active Filters:
      </span>
      {filters.map((f, idx) => (
        <span
          key={`${f.category}-${f.label}-${idx}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-medium animate-in fade-in zoom-in-95 duration-150"
        >
          <span className="text-muted-foreground font-normal">{f.category}:</span>
          <span className="font-semibold max-w-[180px] truncate" title={f.label}>
            {f.label}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              f.onRemove();
            }}
            className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 text-primary hover:text-destructive transition-colors"
            title={`Remove ${f.category} filter`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline font-semibold ml-2 flex items-center gap-0.5 shrink-0"
        >
          <RotateCcw className="w-3 h-3" /> Clear All
        </button>
      )}
    </div>
  );
}

