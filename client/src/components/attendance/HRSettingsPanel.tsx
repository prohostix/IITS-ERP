import { useState, useEffect, useRef } from 'react';
import { Settings, MapPin, Clock, Wifi, Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp, ShieldAlert, CalendarSync } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/lib/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_CARRY_FORWARD_RULES = [
  { leaveType: 'casual', label: 'Casual Leave', enabled: true, maxDays: 6, monthlyCarryForward: true },
  { leaveType: 'sick', label: 'Sick Leave', enabled: true, maxDays: 6, monthlyCarryForward: true },
  { leaveType: 'earned', label: 'Earned / Privilege Leave', enabled: true, maxDays: 15, monthlyCarryForward: true },
  { leaveType: 'compensatory', label: 'Compensatory Off', enabled: true, maxDays: 5, monthlyCarryForward: true },
];

const DEFAULT_SETTINGS = {
  officeHours: {
    checkInTime: '09:00',
    checkOutTime: '18:00',
    graceMinutes: 15,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    breakStartTime: '13:00',
    breakEndTime: '14:00',
    breakDurationMinutes: 60,
    dayOverrides: [] as any[],
    sandwichRuleEnabled: false,
  },
  latePolicy: {
    maxLateMinutesPerMonth: 60,
    warningThreshold: 45,
    deductionPerExtraMinute: 0,
    deductMode: 'beyond_grace',
    lateCountForHalfDay: 0,
  },
  lateDeductionRules: [] as any[],
  leaveCarryForwardRules: DEFAULT_CARRY_FORWARD_RULES,
  location: { officeLatitude: 28.6139, officeLongitude: 77.2090, allowedRadius: 100, requireLocationForCheckIn: true },
  locations: [] as any[],
  requireLocationForCheckIn: true,
  biometric: { enabled: false, deviceType: 'none', apiEndpoint: '', apiKey: '', syncInterval: 5, fallbackToManual: true },
};

function parseObj(val: any, fallback: any) {
  if (!val) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

function DayOverrideRow({ day, override, onChange, onRemove }: {
  day: string;
  override: any;
  onChange: (v: any) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr_1fr_1fr_32px] gap-2 items-end">
      <div className="text-sm font-medium pt-6">{day.slice(0, 3)}</div>
      <div>
        <Label className="text-xs">Check-In</Label>
        <Input type="time" value={override.checkInTime || '09:00'}
          onChange={e => onChange({ ...override, checkInTime: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">Check-Out</Label>
        <Input type="time" value={override.checkOutTime || '18:00'}
          onChange={e => onChange({ ...override, checkOutTime: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">Break (min)</Label>
        <Input type="number" min="0" max="180" value={override.breakDurationMinutes ?? ''}
          placeholder="—"
          onChange={e => onChange({ ...override, breakDurationMinutes: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 mt-5" onClick={onRemove}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function LocationCard({ loc, index, onChange, onRemove, onSetDefault }: {
  loc: any; index: number;
  onChange: (v: any) => void;
  onRemove: () => void;
  onSetDefault: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [expanded, setExpanded] = useState(index === 0);
  const [mapLoaded, setMapLoaded] = useState(false);

  const initMap = () => {
    if (!mapRef.current || leafletMap.current) return;
    const lat = loc.latitude || 28.6139;
    const lng = loc.longitude || 77.2090;
    const map = L.map(mapRef.current).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    const icon = L.divIcon({
      html: `<div style="width:18px;height:18px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9], className: '',
    });
    markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
    circleRef.current = L.circle([lat, lng], {
      radius: loc.allowedRadius || 100, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 2,
    }).addTo(map);
    markerRef.current.on('dragend', (e: any) => {
      const { lat: la, lng: ln } = e.target.getLatLng();
      onChange({ ...loc, latitude: la, longitude: ln });
      circleRef.current?.setLatLng([la, ln]);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: la, lng: ln } = e.latlng;
      markerRef.current?.setLatLng([la, ln]);
      circleRef.current?.setLatLng([la, ln]);
      onChange({ ...loc, latitude: la, longitude: ln });
    });
    leafletMap.current = map;
    setMapLoaded(true);
  };

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: la, longitude: ln } = pos.coords;
      onChange({ ...loc, latitude: la, longitude: ln });
      leafletMap.current?.setView([la, ln], 16);
      markerRef.current?.setLatLng([la, ln]);
      circleRef.current?.setLatLng([la, ln]);
    }, () => toast.error('Could not get location'));
  };

  const updateRadius = (r: number) => {
    onChange({ ...loc, allowedRadius: r });
    circleRef.current?.setRadius(r);
  };

  return (
    <Card className="border border-border/60">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <Input
              value={loc.name || ''}
              onChange={e => onChange({ ...loc, name: e.target.value })}
              className="h-7 text-sm font-semibold w-48 border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Location name"
            />
            {loc.isDefault && <Badge className="text-[10px] bg-primary/10 text-primary">Default</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {!loc.isDefault && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onSetDefault}>Set Default</Button>
            )}
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={useMyLocation}>
              <MapPin className="w-3 h-3 mr-1" />My Location
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={onRemove}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3 pt-0">
          <div
            ref={mapRef}
            className="w-full h-56 rounded-lg overflow-hidden border cursor-pointer"
            style={{ zIndex: 0 }}
            onMouseEnter={initMap}
            onClick={initMap}
          >
            {!mapLoaded && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 gap-2">
                <MapPin className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Click to load map</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input type="number" step="0.000001" value={loc.latitude ?? 0}
                onChange={e => {
                  const v = Number(e.target.value);
                  onChange({ ...loc, latitude: v });
                  markerRef.current?.setLatLng([v, loc.longitude]);
                  circleRef.current?.setLatLng([v, loc.longitude]);
                }} />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input type="number" step="0.000001" value={loc.longitude ?? 0}
                onChange={e => {
                  const v = Number(e.target.value);
                  onChange({ ...loc, longitude: v });
                  markerRef.current?.setLatLng([loc.latitude, v]);
                  circleRef.current?.setLatLng([loc.latitude, v]);
                }} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Allowed Radius: {loc.allowedRadius || 100}m</Label>
            <input type="range" min="50" max="2000" step="10"
              value={loc.allowedRadius || 100}
              onChange={e => updateRadius(Number(e.target.value))}
              className="w-full mt-1 accent-primary" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>50m</span><span>1000m</span><span>2000m</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function HRSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/settings');
      const data = res.data?.data;
      if (data) {
        const rawOh = parseObj(data.officeHours, {});
        const rawLp = parseObj(data.latePolicy, {});
        const rawLoc = parseObj(data.location, {});
        const rawBio = parseObj(data.biometric, {});
        const rawRules = parseObj(data.lateDeductionRules, []);
        const rawCf = parseObj(data.leaveCarryForwardRules, null);
        const rawLocs = parseObj(data.locations, []);

        const mergedCf = DEFAULT_CARRY_FORWARD_RULES.map(def => {
          const found = Array.isArray(rawCf) ? rawCf.find((r: any) => r.leaveType === def.leaveType) : null;
          return found ? { ...def, ...found } : def;
        });

        setSettings({
          officeHours: {
            ...DEFAULT_SETTINGS.officeHours,
            ...rawOh,
            workingDays: Array.isArray(rawOh.workingDays) ? rawOh.workingDays : DEFAULT_SETTINGS.officeHours.workingDays,
            dayOverrides: Array.isArray(rawOh.dayOverrides) ? rawOh.dayOverrides : [],
          },
          latePolicy: {
            ...DEFAULT_SETTINGS.latePolicy,
            ...rawLp,
          },
          lateDeductionRules: Array.isArray(rawRules) ? rawRules : [],
          leaveCarryForwardRules: mergedCf,
          location: {
            ...DEFAULT_SETTINGS.location,
            ...rawLoc,
          },
          locations: Array.isArray(rawLocs) ? rawLocs : [],
          requireLocationForCheckIn: data.requireLocationForCheckIn ?? data.requireLocation ?? true,
          biometric: {
            ...DEFAULT_SETTINGS.biometric,
            ...rawBio,
          },
        });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load attendance settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanPayload = {
        officeHours: settings.officeHours,
        latePolicy: settings.latePolicy,
        lateDeductionRules: settings.lateDeductionRules || [],
        leaveCarryForwardRules: settings.leaveCarryForwardRules || DEFAULT_CARRY_FORWARD_RULES,
        location: settings.location,
        locations: settings.locations || [],
        requireLocation: Boolean(settings.requireLocationForCheckIn),
        requireLocationForCheckIn: Boolean(settings.requireLocationForCheckIn),
        biometric: settings.biometric,
      };
      await api.post('/attendance/settings', cleanPayload);
      toast.success('Attendance & HR settings saved successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const setHours = (patch: any) =>
    setSettings((p: any) => ({ ...p, officeHours: { ...p.officeHours, ...patch } }));

  const toggleDay = (day: string) => {
    const days: string[] = settings.officeHours?.workingDays || [];
    setHours({ workingDays: days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day] });
  };

  const overrides: any[] = settings.officeHours?.dayOverrides || [];
  const overrideDays = overrides.map((o: any) => o.day);

  const addOverride = (day: string) => {
    if (overrideDays.includes(day)) return;
    setHours({
      dayOverrides: [...overrides, {
        day,
        checkInTime: settings.officeHours.checkInTime,
        checkOutTime: settings.officeHours.checkOutTime,
        breakDurationMinutes: settings.officeHours.breakDurationMinutes,
      }],
    });
  };

  const updateOverride = (day: string, val: any) =>
    setHours({ dayOverrides: overrides.map((o: any) => o.day === day ? val : o) });

  const removeOverride = (day: string) =>
    setHours({ dayOverrides: overrides.filter((o: any) => o.day !== day) });

  // Late Slab Rules
  const slabRules: any[] = settings.lateDeductionRules || [];
  const addSlabRule = () => {
    setSettings((p: any) => ({
      ...p,
      lateDeductionRules: [
        ...(p.lateDeductionRules || []),
        { minMinutes: 16, maxMinutes: 60, deductionType: 'fixed', amount: 100 },
      ],
    }));
  };
  const updateSlabRule = (idx: number, patch: any) => {
    setSettings((p: any) => ({
      ...p,
      lateDeductionRules: (p.lateDeductionRules || []).map((r: any, i: number) => i === idx ? { ...r, ...patch } : r),
    }));
  };
  const removeSlabRule = (idx: number) => {
    setSettings((p: any) => ({
      ...p,
      lateDeductionRules: (p.lateDeductionRules || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  // Leave carry-forward rules
  const updateCfRule = (leaveType: string, patch: any) => {
    setSettings((p: any) => ({
      ...p,
      leaveCarryForwardRules: (p.leaveCarryForwardRules || DEFAULT_CARRY_FORWARD_RULES).map((r: any) =>
        r.leaveType === leaveType ? { ...r, ...patch } : r
      ),
    }));
  };

  // Locations
  const locations: any[] = settings.locations || [];

  const addLocation = () => {
    const newLoc = {
      name: `Location ${locations.length + 1}`,
      latitude: 28.6139, longitude: 77.2090,
      allowedRadius: 100,
      isDefault: locations.length === 0,
    };
    setSettings((p: any) => ({ ...p, locations: [...(p.locations || []), newLoc] }));
  };

  const updateLocation = (i: number, val: any) =>
    setSettings((p: any) => ({ ...p, locations: p.locations.map((l: any, idx: number) => idx === i ? val : l) }));

  const removeLocation = (i: number) =>
    setSettings((p: any) => ({ ...p, locations: p.locations.filter((_: any, idx: number) => idx !== i) }));

  const setDefaultLocation = (i: number) =>
    setSettings((p: any) => ({
      ...p,
      locations: p.locations.map((l: any, idx: number) => ({ ...l, isDefault: idx === i })),
    }));

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const workingDays: string[] = settings.officeHours?.workingDays || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Attendance & Policy Settings
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure office hours, grace period & late deductions, leave carry-forward, geofencing, and biometrics
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="hours">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="hours"><Clock className="w-3.5 h-3.5 mr-1.5" />Office Hours</TabsTrigger>
          <TabsTrigger value="grace"><ShieldAlert className="w-3.5 h-3.5 mr-1.5" />Grace & Late Deduction</TabsTrigger>
          <TabsTrigger value="carryforward"><CalendarSync className="w-3.5 h-3.5 mr-1.5" />Leave Carry-Forward</TabsTrigger>
          <TabsTrigger value="location"><MapPin className="w-3.5 h-3.5 mr-1.5" />Locations</TabsTrigger>
          <TabsTrigger value="biometric"><Wifi className="w-3.5 h-3.5 mr-1.5" />Biometric</TabsTrigger>
        </TabsList>

        {/* ── Office Hours ── */}
        <TabsContent value="hours" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Default Working Hours</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Check-In Time</Label>
                  <Input type="time" value={settings.officeHours.checkInTime || '09:00'}
                    onChange={e => setHours({ checkInTime: e.target.value })} />
                </div>
                <div>
                  <Label>Check-Out Time</Label>
                  <Input type="time" value={settings.officeHours.checkOutTime || '18:00'}
                    onChange={e => setHours({ checkOutTime: e.target.value })} />
                </div>
                <div>
                  <Label>Default Grace Period (minutes)</Label>
                  <Input type="number" min="0" max="120" value={settings.officeHours.graceMinutes ?? 15}
                    onChange={e => setHours({ graceMinutes: Math.max(0, Number(e.target.value)) })} />
                  <p className="text-xs text-muted-foreground mt-1">Punches within this window are on time (unless overridden by Shift)</p>
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Working Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        workingDays.includes(day)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                      }`}>
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Default Break Time</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Break Start</Label>
                    <Input type="time" value={settings.officeHours.breakStartTime || '13:00'}
                      onChange={e => setHours({ breakStartTime: e.target.value })} />
                  </div>
                  <div>
                    <Label>Break End</Label>
                    <Input type="time" value={settings.officeHours.breakEndTime || '14:00'}
                      onChange={e => setHours({ breakEndTime: e.target.value })} />
                  </div>
                  <div>
                    <Label>Duration (min)</Label>
                    <Input type="number" min="0" max="180" value={settings.officeHours.breakDurationMinutes ?? 60}
                      onChange={e => setHours({ breakDurationMinutes: Number(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-muted/40 border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Sandwich Rule (Weekly Offs &amp; Holidays)</p>
                      <Badge variant={settings.officeHours.sandwichRuleEnabled ? 'destructive' : 'secondary'} className="text-[10px]">
                        {settings.officeHours.sandwichRuleEnabled ? 'Enabled' : 'Disabled (Default)'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {settings.officeHours.sandwichRuleEnabled
                        ? 'Sundays and National/Company holidays are unpaid (LOP) if the employee is absent on both the preceding and following working days.'
                        : 'All Sundays and National/Company holidays are paid for any employee who worked at least 1 day in the month (excluding pre-joining and post-resignation days).'}
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(settings.officeHours.sandwichRuleEnabled)}
                    onCheckedChange={v => setHours({ sandwichRuleEnabled: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-Day Custom Hours</CardTitle>
              <p className="text-xs text-muted-foreground">Override default check-in / check-out hours for specific weekdays</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {DAYS.filter(d => workingDays.includes(d) && !overrideDays.includes(d)).map(day => (
                  <button key={day} type="button" onClick={() => addOverride(day)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors">
                    <Plus className="w-3 h-3" />{day.slice(0, 3)}
                  </button>
                ))}
                {DAYS.filter(d => workingDays.includes(d) && !overrideDays.includes(d)).length === 0 && (
                  <p className="text-xs text-muted-foreground">All working days have custom overrides</p>
                )}
              </div>

              {overrides.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No per-day overrides — all days use the default hours above.</p>
              ) : (
                <div className="space-y-3">
                  {overrides.map((ov: any) => (
                    <DayOverrideRow
                      key={ov.day}
                      day={ov.day}
                      override={ov}
                      onChange={val => updateOverride(ov.day, val)}
                      onRemove={() => removeOverride(ov.day)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Grace & Late Deduction Policy ── */}
        <TabsContent value="grace" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grace Period & Late Deduction Logic</CardTitle>
              <p className="text-xs text-muted-foreground">
                Defines how late check-ins beyond an employee's Shift or Office grace period translate into payroll deductions. Individual employees can be exempted in Shift Settings, Employee Profile, or Salary Config.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Default Grace Period (min)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={settings.officeHours.graceMinutes ?? 15}
                    onChange={e => setHours({ graceMinutes: Math.max(0, Number(e.target.value)) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Allowed buffer after check-in time</p>
                </div>

                <div>
                  <Label>Deduction Calculation Mode</Label>
                  <Select
                    value={settings.latePolicy.deductMode || 'beyond_grace'}
                    onValueChange={v => setSettings((p: any) => ({ ...p, latePolicy: { ...p.latePolicy, deductMode: v } }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beyond_grace">Deduct Minutes Beyond Grace Period</SelectItem>
                      <SelectItem value="from_start">Deduct Full Late Minutes (Once Grace Crossed)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    e.g. 09:00 start + 15m grace, check-in 09:25 → {settings.latePolicy.deductMode === 'from_start' ? '25 mins deducted' : '10 mins deducted'}
                  </p>
                </div>

                <div>
                  <Label>Monthly Free Late Allowance (min)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings.latePolicy.maxLateMinutesPerMonth ?? 0}
                    onChange={e => setSettings((p: any) => ({ ...p, latePolicy: { ...p.latePolicy, maxLateMinutesPerMonth: Math.max(0, Number(e.target.value)) } }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Set 0 to deduct from the first late punch beyond daily grace</p>
                </div>

                <div>
                  <Label>Default Deduction Rate (₹ / min)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.latePolicy.deductionPerExtraMinute ?? 0}
                    onChange={e => setSettings((p: any) => ({ ...p, latePolicy: { ...p.latePolicy, deductionPerExtraMinute: Math.max(0, Number(e.target.value)) } }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave 0 to auto-calculate pro-rata from employee's salary</p>
                </div>

                <div>
                  <Label>Late Count → Half-Day LOP Rule</Label>
                  <Input
                    type="number"
                    min="0"
                    max="31"
                    value={settings.latePolicy.lateCountForHalfDay ?? 0}
                    onChange={e => setSettings((p: any) => ({ ...p, latePolicy: { ...p.latePolicy, lateCountForHalfDay: Math.max(0, Number(e.target.value)) } }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">e.g. 3 = every 3 late days deducts 0.5 day salary (0 = off)</p>
                </div>

                <div>
                  <Label>Warning Threshold (min / month)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings.latePolicy.warningThreshold ?? 45}
                    onChange={e => setSettings((p: any) => ({ ...p, latePolicy: { ...p.latePolicy, warningThreshold: Math.max(0, Number(e.target.value)) } }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Highlights warning when monthly late minutes exceed this</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Custom Late Slab Rules (Optional)</p>
                    <p className="text-xs text-muted-foreground">Override per-minute rate when daily late arrival falls in a minute bracket</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addSlabRule}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Slab Rule
                  </Button>
                </div>

                {slabRules.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No custom slab rules configured — using per-minute / late-count policy above.</p>
                ) : (
                  <div className="space-y-2">
                    {slabRules.map((rule: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.3fr_1fr_36px] gap-2 items-end p-3 rounded-lg border bg-muted/20">
                        <div>
                          <Label className="text-xs">Min Late (min)</Label>
                          <Input type="number" min="1" value={rule.minMinutes ?? 16}
                            onChange={e => updateSlabRule(idx, { minMinutes: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label className="text-xs">Max Late (min)</Label>
                          <Input type="number" min="1" value={rule.maxMinutes ?? 60}
                            onChange={e => updateSlabRule(idx, { maxMinutes: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label className="text-xs">Deduction Type</Label>
                          <Select value={rule.deductionType || 'fixed'} onValueChange={v => updateSlabRule(idx, { deductionType: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                              <SelectItem value="half_day">Half Day Salary (0.5x)</SelectItem>
                              <SelectItem value="full_day">Full Day Salary (1.0x)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{rule.deductionType === 'fixed' ? 'Amount (₹)' : 'Auto Pro-Rata'}</Label>
                          <Input
                            type="number"
                            min="0"
                            disabled={rule.deductionType !== 'fixed'}
                            value={rule.deductionType === 'fixed' ? (rule.amount ?? 0) : 0}
                            onChange={e => updateSlabRule(idx, { amount: Number(e.target.value) })}
                          />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeSlabRule(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Leave Carry-Forward Policy ── */}
        <TabsContent value="carryforward" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Carry-Forward Rules</CardTitle>
              <p className="text-xs text-muted-foreground">
                Configure whether unused leaves carry forward month-to-month (for monthly quotas) and year-to-year (up to the specified maximum days).
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(settings.leaveCarryForwardRules || DEFAULT_CARRY_FORWARD_RULES).map((rule: any) => (
                <div key={rule.leaveType} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 items-center p-3.5 rounded-xl border bg-card">
                  <div>
                    <p className="font-semibold text-sm capitalize">{rule.label || `${rule.leaveType} Leave`}</p>
                    <p className="text-xs text-muted-foreground">Carry forward unused {rule.leaveType} leave balance</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.monthlyCarryForward !== false}
                      onCheckedChange={v => updateCfRule(rule.leaveType, { monthlyCarryForward: v })}
                    />
                    <span className="text-xs">Monthly Rollover</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled !== false}
                      onCheckedChange={v => updateCfRule(rule.leaveType, { enabled: v })}
                    />
                    <span className="text-xs">Yearly Carry-Forward</span>
                  </div>
                  <div>
                    <Label className="text-xs">Max Carry-Forward Days</Label>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      disabled={rule.enabled === false}
                      value={rule.maxDays ?? 0}
                      onChange={e => updateCfRule(rule.leaveType, { maxDays: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Locations ── */}
        <TabsContent value="location" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold">Office Locations</p>
              <p className="text-xs text-muted-foreground">Employees can punch in from any of these locations</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.requireLocationForCheckIn ?? true}
                  onCheckedChange={v => setSettings((p: any) => ({ ...p, requireLocationForCheckIn: v }))}
                />
                <span className="text-sm">Require location for check-in</span>
              </div>
              <Button size="sm" onClick={addLocation}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add Location
              </Button>
            </div>
          </div>

          {locations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No locations configured</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={addLocation}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add First Location
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {locations.map((loc: any, i: number) => (
                <LocationCard
                  key={i}
                  loc={loc}
                  index={i}
                  onChange={val => updateLocation(i, val)}
                  onRemove={() => removeLocation(i)}
                  onSetDefault={() => setDefaultLocation(i)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Biometric ── */}
        <TabsContent value="biometric" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Biometric Device Integration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Enable Biometric Integration</p>
                  <p className="text-xs text-muted-foreground">Sync punch data from physical biometric devices</p>
                </div>
                <Switch
                  checked={Boolean(settings.biometric?.enabled)}
                  onCheckedChange={v => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, enabled: v } }))}
                />
              </div>
              {settings.biometric?.enabled && (
                <>
                  <div>
                    <Label>Device Type</Label>
                    <Select value={settings.biometric.deviceType || 'none'}
                      onValueChange={v => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, deviceType: v } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fingerprint">Fingerprint Scanner</SelectItem>
                        <SelectItem value="face">Face Recognition</SelectItem>
                        <SelectItem value="card">RFID / Smart Card</SelectItem>
                        <SelectItem value="pin">PIN Pad</SelectItem>
                        <SelectItem value="none">None / Manual Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Device API Endpoint</Label>
                    <Input placeholder="http://192.168.1.100:8080/api/punches"
                      value={settings.biometric.apiEndpoint || ''}
                      onChange={e => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, apiEndpoint: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>API Key / Token</Label>
                    <Input type="password" placeholder="Device authentication key"
                      value={settings.biometric.apiKey || ''}
                      onChange={e => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, apiKey: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Sync Interval: {settings.biometric.syncInterval || 5} minutes</Label>
                    <input type="range" min="1" max="60" step="1"
                      value={settings.biometric.syncInterval || 5}
                      onChange={e => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, syncInterval: Number(e.target.value) } }))}
                      className="w-full mt-2 accent-primary" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">Fallback to Manual Punch</p>
                      <p className="text-xs text-muted-foreground">Allow app-based punch if biometric device is offline</p>
                    </div>
                    <Switch
                      checked={settings.biometric.fallbackToManual !== false}
                      onCheckedChange={v => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, fallbackToManual: v } }))}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
