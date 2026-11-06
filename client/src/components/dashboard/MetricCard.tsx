import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, type LucideIcon } from 'lucide-react';

export type MetricColor = 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'purple' | 'cyan' | 'amber';

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  color?: MetricColor;
  className?: string;
  onClick?: () => void;
}

const colorStyles: Record<MetricColor, {
  iconBg: string;
  iconColor: string;
  glow: string;
  borderHover: string;
}> = {
  primary: {
    iconBg: 'bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground',
    iconColor: 'text-primary',
    glow: 'stat-glow-indigo',
    borderHover: 'group-hover:border-primary/40',
  },
  success: {
    iconBg: 'bg-emerald-500/10 group-hover:bg-emerald-600 group-hover:text-white',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    glow: 'stat-glow-emerald',
    borderHover: 'group-hover:border-emerald-500/40',
  },
  warning: {
    iconBg: 'bg-amber-500/10 group-hover:bg-amber-600 group-hover:text-white',
    iconColor: 'text-amber-600 dark:text-amber-400',
    glow: 'stat-glow-amber',
    borderHover: 'group-hover:border-amber-500/40',
  },
  amber: {
    iconBg: 'bg-amber-500/10 group-hover:bg-amber-600 group-hover:text-white',
    iconColor: 'text-amber-600 dark:text-amber-400',
    glow: 'stat-glow-amber',
    borderHover: 'group-hover:border-amber-500/40',
  },
  info: {
    iconBg: 'bg-sky-500/10 group-hover:bg-sky-600 group-hover:text-white',
    iconColor: 'text-sky-600 dark:text-sky-400',
    glow: 'stat-glow-cyan',
    borderHover: 'group-hover:border-sky-500/40',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10 group-hover:bg-cyan-600 group-hover:text-white',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    glow: 'stat-glow-cyan',
    borderHover: 'group-hover:border-cyan-500/40',
  },
  purple: {
    iconBg: 'bg-purple-500/10 group-hover:bg-purple-600 group-hover:text-white',
    iconColor: 'text-purple-600 dark:text-purple-400',
    glow: 'stat-glow-indigo',
    borderHover: 'group-hover:border-purple-500/40',
  },
  destructive: {
    iconBg: 'bg-rose-500/10 group-hover:bg-rose-600 group-hover:text-white',
    iconColor: 'text-rose-600 dark:text-rose-400',
    glow: 'stat-glow-rose',
    borderHover: 'group-hover:border-rose-500/40',
  },
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  badge,
  color = 'primary',
  className,
  onClick,
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' 
    ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20' 
    : trend === 'down' 
    ? 'text-rose-600 bg-rose-500/10 dark:text-rose-400 border-rose-500/20' 
    : 'text-muted-foreground bg-muted border-border';

  const styling = colorStyles[color] || colorStyles.primary;

  return (
    <Card 
      className={cn(
        'group relative overflow-hidden transition-all duration-300 rounded-2xl border border-border/70 bg-card/85 backdrop-blur-xl',
        styling.glow,
        onClick && 'cursor-pointer hover:-translate-y-1 hover:shadow-xl',
        styling.borderHover,
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3.5">
          <div className={cn(
            'p-3 rounded-2xl transition-all duration-300 shrink-0 shadow-xs border border-border/40',
            styling.iconBg,
            styling.iconColor
          )}>
            <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
          </div>

          <div className="flex items-center gap-1.5">
            {badge && (
              <Badge variant={badge.variant || 'secondary'} className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5">
                {badge.label}
              </Badge>
            )}
            {onClick && (
              <div className="p-1 rounded-lg text-muted-foreground/40 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground/70 transition-colors">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-feature-settings-tnum">
              {value}
            </h3>
          </div>

          {(description || trend) && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {trend && (
                <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold border', trendColor)}>
                  <TrendIcon className="w-3 h-3" />
                  {trendValue}
                </span>
              )}
              {description && (
                <p className="text-[11px] text-muted-foreground group-hover:text-foreground/60 transition-colors truncate">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface MetricCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5;
}

export function MetricCardGrid({ children, className, columns = 4 }: MetricCardGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-5', gridCols[columns], className)}>
      {children}
    </div>
  );
}
