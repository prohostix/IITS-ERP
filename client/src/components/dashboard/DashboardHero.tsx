import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export interface HeroStat {
  label: string;
  value: string | number;
  icon?: any;
  change?: string;
  isPositive?: boolean;
}

export interface DashboardHeroProps {
  title?: string;
  badge?: string;
  subtitle?: string;
  description?: string;
  stats?: HeroStat[];
  metrics?: HeroStat[];
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: any;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: any;
  };
  className?: string;
}

export function DashboardHero({
  title,
  badge = 'Live System Active',
  subtitle,
  description,
  stats = [],
  metrics = [],
  primaryAction,
  secondaryAction,
  className,
}: DashboardHeroProps) {
  const { user } = useAuth();

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name ? user.name.split(' ')[0] : 'Team';
  const headingText = title || `${getGreeting()}, ${displayName}`;
  const subText = subtitle || description;
  const statList = stats.length > 0 ? stats : metrics;

  // Formatted date
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const renderIcon = (icon: any, defaultClass: string) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    return React.createElement(icon, { className: defaultClass });
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 sm:p-7 border border-border/70 shadow-sm transition-all duration-300 hero-gradient',
        className
      )}
    >
      {/* Decorative ambient glowing orbs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-info/10 blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Titles & Subtitle */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/25 font-semibold text-xs px-2.5 py-0.5 flex items-center gap-1.5 shadow-xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{badge}</span>
            </Badge>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
            {headingText}
          </h1>

          {subText && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {subText}
            </p>
          )}
        </div>

        {/* Right: Quick Action Buttons or Stat Badges */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          {secondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={secondaryAction.onClick}
              className="h-9 px-3.5 text-xs font-semibold backdrop-blur-md bg-background/60 hover:bg-background border-border/80 shadow-xs"
            >
              {renderIcon(secondaryAction.icon, 'w-3.5 h-3.5 mr-1.5 text-muted-foreground')}
              {secondaryAction.label}
            </Button>
          )}

          {primaryAction && (
            <Button
              size="sm"
              onClick={primaryAction.onClick}
              className="h-9 px-4 text-xs font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
            >
              {renderIcon(primaryAction.icon, 'w-3.5 h-3.5 mr-1.5')}
              {primaryAction.label}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 opacity-80" />
            </Button>
          )}
        </div>
      </div>

      {/* Optional Mini-Metrics Ribbon */}
      {statList.length > 0 && (
        <div className="mt-6 pt-5 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statList.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-background/50 backdrop-blur-md border border-border/40"
            >
              {s.icon && (
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  {renderIcon(s.icon, 'w-4 h-4')}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground truncate">{s.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-base font-bold text-foreground tracking-tight font-display">{s.value}</p>
                  {s.change && (
                    <span
                      className={cn(
                        'text-[10px] font-semibold',
                        s.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {s.change}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
