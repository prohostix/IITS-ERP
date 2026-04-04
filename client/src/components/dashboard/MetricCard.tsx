import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  badge?: {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  badge,
  className,
  onClick,
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500';

  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-lg hover:border-blue-300',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {badge && (
            <Badge variant={badge.variant} className="text-xs">
              {badge.label}
            </Badge>
          )}
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
                <TrendIcon className="w-3 h-3" />
                <span>{trendValue}</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-slate-500">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5;
}

export function MetricCardGrid({ children, className, columns = 4 }: MetricCardGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}
