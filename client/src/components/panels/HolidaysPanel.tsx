import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

function parseUtcDate(raw: string | Date): Date {
  const d = new Date(raw);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function formatYmdUtc(raw: string | Date): string {
  const d = new Date(raw);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function getHolidayTypeLabel(type?: string): string {
  switch ((type || '').toLowerCase()) {
    case 'national':
      return 'National Holiday';
    case 'regional':
      return 'Regional Holiday';
    case 'company':
      return 'Company Holiday';
    case 'public':
      return 'Public Holiday';
    default:
      return 'Holiday';
  }
}

export function HolidaysPanel() {
  const { user } = useAuth();
  const canManage =
    ['hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin'].includes(user?.role || '') ||
    (user?.role === 'employee' && (user as any)?.department?.type === 'hr');

  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: '', type: 'national', description: '' });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/holidays');
      setHolidays(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.date) {
      toast.error('Please enter both holiday name and date');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        date: formData.date,
        type: formData.type,
        description: formData.description.trim(),
      };
      if (editingId) {
        await api.put(`/hr/holidays/${editingId}`, payload);
        toast.success('Holiday updated successfully');
      } else {
        await api.post('/hr/holidays', payload);
        toast.success('Holiday added to calendar');
      }
      setDialogOpen(false);
      resetForm();
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (h: any) => {
    setEditingId(h.id);
    setFormData({
      name: h.name || '',
      date: h.date ? formatYmdUtc(h.date) : '',
      type: h.type || 'national',
      description: h.description || '',
    });
    setDialogOpen(true);
  };

  const handleAddOnDate = (ymd: string) => {
    if (!canManage) return;
    setEditingId(null);
    setFormData({ name: '', date: ymd, type: 'national', description: '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday from the calendar?')) return;
    try {
      await api.delete(`/hr/holidays/${id}`);
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete holiday');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', date: '', type: 'national', description: '' });
  };

  const typeBadgeStyles: Record<string, string> = {
    national: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold',
    regional: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    company: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    public: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  };

  const selectedYear = currentMonth.getFullYear();

  const sortedHolidays = useMemo(() => {
    return [...holidays]
      .filter(h => h && h.id && h.date)
      .filter(h => typeFilter === 'all' || h.type === typeFilter)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, typeFilter]);

  const yearHolidays = useMemo(
    () => sortedHolidays.filter(h => new Date(h.date).getUTCFullYear() === selectedYear),
    [sortedHolidays, selectedYear]
  );

  const stats = useMemo(() => {
    const allInYear = holidays.filter(h => h?.date && new Date(h.date).getUTCFullYear() === selectedYear);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return {
      total: allInYear.length,
      national: allInYear.filter(h => h.type === 'national').length,
      regional: allInYear.filter(h => h.type === 'regional').length,
      company: allInYear.filter(h => h.type === 'company' || h.type === 'public').length,
      upcoming: allInYear.filter(h => parseUtcDate(h.date) >= todayStart).length,
    };
  }, [holidays, selectedYear]);

  // Build calendar cells for currentMonth
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; ymd: string; dateObj: Date | null }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, ymd: '', dateObj: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, ymd, dateObj: new Date(year, month, d) });
    }
    return cells;
  }, [currentMonth]);

  const holidaysByYmd = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const h of sortedHolidays) {
      const ymd = formatYmdUtc(h.date);
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd)!.push(h);
    }
    return map;
  }, [sortedHolidays]);

  const todayYmd = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Holiday Calendar</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            National Holidays, Regional Holidays, and Company Observances ({selectedYear})
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="All Holiday Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Holiday Types</SelectItem>
              <SelectItem value="national">National Holiday</SelectItem>
              <SelectItem value="regional">Regional Holiday</SelectItem>
              <SelectItem value="company">Company Holiday</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border p-0.5 bg-muted/40">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              className="h-8 px-2.5 text-xs"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="w-3.5 h-3.5 mr-1" /> Calendar
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="h-8 px-2.5 text-xs"
              onClick={() => setViewMode('list')}
            >
              <List className="w-3.5 h-3.5 mr-1" /> List
            </Button>
          </div>

          {canManage && (
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="h-9">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Holiday Name</Label>
                    <Input
                      placeholder="e.g. Independence Day, Republic Day, Gandhi Jayanti"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Holiday Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national">National Holiday</SelectItem>
                        <SelectItem value="regional">Regional Holiday</SelectItem>
                        <SelectItem value="company">Company Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Input
                      placeholder="Optional note or observance details"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? 'Saving...' : editingId ? 'Update Holiday' : 'Save Holiday'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Holidays ({selectedYear})</p>
            <p className="text-2xl font-bold text-primary mt-0.5">{stats.total}</p>
            <p className="text-[11px] text-muted-foreground">{stats.upcoming} upcoming</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/5 border-rose-500/25">
          <CardContent className="p-4">
            <p className="text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1">
              <Flag className="w-3.5 h-3.5" /> National Holidays
            </p>
            <p className="text-2xl font-bold text-rose-600 mt-0.5">{stats.national}</p>
            <p className="text-[11px] text-muted-foreground">Gazetted / Mandatory</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Regional Holidays</p>
            <p className="text-2xl font-bold text-purple-600 mt-0.5">{stats.regional}</p>
            <p className="text-[11px] text-muted-foreground">State / Festival</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Company Holidays</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.company}</p>
            <p className="text-[11px] text-muted-foreground">Organization Declared</p>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Interactive Monthly Calendar Grid */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-lg min-w-[160px] text-center">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const n = new Date();
                  setCurrentMonth(new Date(n.getFullYear(), n.getMonth(), 1));
                }}
              >
                Today
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-hidden">
                <div className="grid grid-cols-7 bg-muted/50 border-b">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                    <div
                      key={d}
                      className={`py-2.5 text-center text-xs font-semibold uppercase tracking-wider ${
                        idx === 0 ? 'text-rose-500' : 'text-muted-foreground'
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((cell, idx) => {
                    if (!cell.day) {
                      return <div key={`empty-${idx}`} className="min-h-[96px] border-b border-r bg-muted/10" />;
                    }
                    const dayHols = holidaysByYmd.get(cell.ymd) || [];
                    const hasNational = dayHols.some(h => h.type === 'national');
                    const isSunday = cell.dateObj?.getDay() === 0;
                    const isToday = cell.ymd === todayYmd;

                    return (
                      <div
                        key={cell.ymd}
                        onClick={() => dayHols.length === 0 && canManage && handleAddOnDate(cell.ymd)}
                        className={`min-h-[96px] p-2 border-b border-r flex flex-col justify-between transition-colors ${
                          hasNational
                            ? 'bg-rose-500/10'
                            : dayHols.length > 0
                            ? 'bg-primary/5'
                            : isSunday
                            ? 'bg-slate-500/5'
                            : 'hover:bg-muted/30'
                        } ${canManage && dayHols.length === 0 ? 'cursor-pointer' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs w-6 h-6 rounded-full inline-flex items-center justify-center ${
                              isToday
                                ? 'bg-primary text-primary-foreground font-bold'
                                : isSunday
                                ? 'text-rose-500 font-semibold'
                                : 'text-foreground font-medium'
                            }`}
                          >
                            {cell.day}
                          </span>
                          {isSunday && dayHols.length === 0 && (
                            <span className="text-[9px] text-muted-foreground">Sun</span>
                          )}
                        </div>

                        <div className="space-y-1 mt-1">
                          {dayHols.map((h) => (
                            <div
                              key={h.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canManage) handleEdit(h);
                              }}
                              className={`p-1 rounded border text-[10px] leading-tight cursor-pointer ${
                                typeBadgeStyles[h.type] || typeBadgeStyles.public
                              }`}
                              title={`${h.name} (${getHolidayTypeLabel(h.type)})`}
                            >
                              {h.type === 'national' && (
                                <div className="font-bold uppercase tracking-wider text-[9px] flex items-center gap-0.5 text-rose-700 dark:text-rose-300">
                                  <Flag className="w-2.5 h-2.5 shrink-0" /> National Holiday
                                </div>
                              )}
                              <div className="font-semibold truncate">{h.name}</div>
                              {h.type !== 'national' && (
                                <div className="text-[9px] opacity-80">{getHolidayTypeLabel(h.type)}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {canManage && (
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Click any empty date cell to add a holiday on that date, or click an existing holiday badge to edit it.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Year Sidebar List */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{selectedYear} Holidays ({yearHolidays.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 max-h-[540px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
              ) : yearHolidays.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No holidays scheduled in {selectedYear}</p>
              ) : (
                yearHolidays.map((h) => {
                  const d = parseUtcDate(h.date);
                  return (
                    <div
                      key={h.id}
                      onClick={() => setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))}
                      className="p-3 rounded-lg border hover:border-primary/40 cursor-pointer transition-colors flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm">{h.name}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeBadgeStyles[h.type] || ''}`}>
                            {getHolidayTypeLabel(h.type)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {h.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{h.description}</p>}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(h)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(h.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle>All Holidays ({sortedHolidays.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : sortedHolidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No holidays found</div>
            ) : (
              <div className="space-y-2">
                {sortedHolidays.map((h) => {
                  const d = parseUtcDate(h.date);
                  const todayStart = new Date();
                  todayStart.setHours(0, 0, 0, 0);
                  const isUpcoming = d >= todayStart;
                  return (
                    <div key={h.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg ${h.type === 'national' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300' : isUpcoming ? 'bg-primary/10' : 'bg-muted'}`}>
                          <div className="text-xl font-bold">{d.getDate()}</div>
                          <div className="text-xs uppercase opacity-80">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                        </div>
                        <div>
                          <div className={`font-semibold flex items-center gap-2 ${!isUpcoming ? 'text-muted-foreground' : ''}`}>
                            {h.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                          {h.description && <div className="text-xs text-muted-foreground mt-0.5">{h.description}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={typeBadgeStyles[h.type] || ''}>
                          {getHolidayTypeLabel(h.type)}
                        </Badge>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(h)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(h.id)}><Trash2 className="w-4 h-4" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
