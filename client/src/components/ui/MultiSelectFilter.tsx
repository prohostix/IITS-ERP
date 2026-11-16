import * as React from 'react';
import { Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string | number;
  label: string;
  code?: string;
  subtitle?: string;
  count?: number;
}

export interface MultiSelectFilterProps {
  title: string;
  placeholder?: string;
  options: MultiSelectOption[];
  selectedValues?: (string | number)[];
  selected?: (string | number)[];
  values?: (string | number)[];
  value?: (string | number)[] | string | number;
  onChange: (values: string[]) => void;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function MultiSelectFilter({
  title,
  placeholder,
  options = [],
  selectedValues,
  selected,
  values,
  value,
  onChange,
  className,
  align = 'start',
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // Unify any prop variant into a stable array of strings
  const activeSelected = React.useMemo(() => {
    const raw = selectedValues ?? selected ?? values ?? (Array.isArray(value) ? value : value ? [value] : []);
    return (raw || [])
      .map(v => (v !== undefined && v !== null ? String(v) : ''))
      .filter(v => v !== '' && v !== 'all' && v !== '__all__');
  }, [selectedValues, selected, values, value]);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      opt =>
        opt.label?.toLowerCase().includes(q) ||
        opt.code?.toLowerCase().includes(q) ||
        opt.subtitle?.toLowerCase().includes(q) ||
        String(opt.value)?.toLowerCase().includes(q)
    );
  }, [options, search]);

  const allSelected = options.length > 0 && activeSelected.length === options.length;
  const isNoneSelected = activeSelected.length === 0;

  const handleToggle = (val: string | number) => {
    const sVal = String(val);
    if (activeSelected.includes(sVal)) {
      onChange(activeSelected.filter(v => v !== sVal));
    } else {
      onChange([...activeSelected, sVal]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => String(o.value)));
  };

  const handleClear = () => {
    onChange([]);
  };

  // Label to show in trigger button
  const triggerLabel = React.useMemo(() => {
    if (isNoneSelected) return placeholder || `All ${title}`;
    if (allSelected) return `All ${title}`;
    if (activeSelected.length === 1) {
      const match = options.find(o => String(o.value) === activeSelected[0]);
      if (match) {
        return match.code ? `${match.label} (${match.code})` : match.label;
      }
      return activeSelected[0];
    }
    if (activeSelected.length === 2) {
      const m1 = options.find(o => String(o.value) === activeSelected[0]);
      const m2 = options.find(o => String(o.value) === activeSelected[1]);
      if (m1 && m2) {
        const l1 = m1.code || m1.label;
        const l2 = m2.code || m2.label;
        return `${l1}, ${l2}`;
      }
    }
    return `${activeSelected.length} ${title}`;
  }, [isNoneSelected, allSelected, activeSelected, options, placeholder, title]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          size="sm"
          className={cn(
            'h-9 justify-between font-medium border text-xs gap-1.5 transition-all bg-background hover:bg-muted/50',
            !isNoneSelected && !allSelected
              ? 'border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 shadow-xs ring-1 ring-primary/20'
              : 'text-muted-foreground hover:text-foreground',
            className
          )}
        >
          <div className="flex items-center gap-1.5 truncate max-w-[220px]">
            <span className="truncate">{triggerLabel}</span>
            {!isNoneSelected && !allSelected && (
              <Badge
                variant="secondary"
                className="h-4 px-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full leading-none shrink-0"
              >
                {activeSelected.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {!isNoneSelected && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                title={`Clear ${title} filter`}
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 sm:w-84 p-2 shadow-xl border rounded-xl" sideOffset={5}>
        <div className="space-y-2">
          {/* Header & Quick Actions */}
          <div className="flex items-center justify-between pb-1.5 border-b px-1">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              {title}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-primary hover:underline px-1 py-0.5 rounded"
              >
                All
              </button>
              <span className="text-muted-foreground/30">•</span>
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-muted-foreground hover:text-destructive px-1 py-0.5 rounded"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search bar */}
          {options.length > 5 && (
            <div className="relative px-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder={`Search ${title.toLowerCase()}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/40 border-muted focus-visible:ring-1"
              />
            </div>
          )}

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">No options found</div>
            ) : (
              filteredOptions.map(option => {
                const sVal = String(option.value);
                const isChecked = activeSelected.includes(sVal);
                return (
                  <div
                    key={sVal}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggle(option.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggle(option.value);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors select-none group',
                      isChecked
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {/* Visual Checkbox Indicator */}
                    <div
                      className={cn(
                        'size-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0',
                        isChecked
                          ? 'bg-primary border-primary text-white shadow-2xs'
                          : 'border-slate-300 dark:border-slate-600 bg-background group-hover:border-slate-400'
                      )}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate font-medium text-xs text-foreground" title={option.label}>
                          {option.label}
                        </span>
                        {option.code && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold shrink-0 uppercase tracking-wide">
                            {option.code}
                          </span>
                        )}
                        {option.count !== undefined && (
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            ({option.count})
                          </span>
                        )}
                      </div>
                      {option.subtitle && (
                        <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5 font-normal" title={option.subtitle}>
                          {option.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer status */}
          <div className="pt-1.5 border-t px-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {isNoneSelected
                ? 'All selected (no filter)'
                : `${activeSelected.length} of ${options.length} selected`}
            </span>
            {!isNoneSelected && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-destructive hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
