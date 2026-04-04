import { useState, useEffect, useRef } from 'react';
import { Settings, MapPin, Clock, Wifi, Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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

const DEFAULT_SETTINGS = {
  officeHours: {
    checkInTime: '09:00', checkOutTime: '18:00', graceMinutes: 15,
    workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'],
    breakStartTime: '13:00', breakEndTime: '14:00', breakDurationMinutes: 60,
    dayOverrides: [] as any[],
  },
  latePolicy: { maxLateMinutesPerMonth: 60, warningThreshold: 45, deductionPerExtraMinute: 0 },
  location: { officeLatitude: 28.6139, officeLongitude: 77.2090, allowedRadius: 100, requireLocationForCheckIn: true },
  locations: [] as any[],
  requireLocationForCheckIn: true,
  biometric: { enabled: false, deviceType: 'none', apiEndpoint: '', apiKey: '', syncInterval: 5, fallbackToManual: true },
};

// ─── Per-day override row ─────────────────────────────────────────────────────

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
        <Input type="time" value={override.checkInTime}
          onChange={e => onChange({ ...override, checkInTime: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">Check-Out</Label>
        <Input type="time" value={override.checkOutTime}
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

// ─── Single location card with its own map ────────────────────────────────────

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
              value={loc.name}
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
            {!leafletMap.current && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 gap-2">
                <MapPin className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Click to load map</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input type="number" step="0.000001" value={loc.latitude}
                onChange={e => {
                  const v = Number(e.target.value);
                  onChange({ ...loc, latitude: v });
                  markerRef.current?.setLatLng([v, loc.longitude]);
                  circleRef.current?.setLatLng([v, loc.longitude]);
                }} />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input type="number" step="0.000001" value={loc.longitude}
                onChange={e => {
                  const v = Number(e.target.value);
                  onChange({ ...loc, longitude: v });
                  markerRef.current?.setLatLng([loc.latitude, v]);
                  circleRef.current?.setLatLng([loc.latitude, v]);
                }} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Allowed Radius: {loc.allowedRadius}m</Label>
            <input type="range" min="50" max="2000" step="10"
              value={loc.allowedRadius}
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

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function HRSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/attendance/settings');
      const data = res.data.data;
      // Ensure dayOverrides and locations arrays exist
      if (!data.officeHours.dayOverrides) data.officeHours.dayOverrides = [];
      if (!data.locations) data.locations = [];
      setSettings(data);
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/attendance/settings', settings);
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const setHours = (patch: any) =>
    setSettings((p: any) => ({ ...p, officeHours: { ...p.officeHours, ...patch } }));

  const toggleDay = (day: string) => {
    const days = settings.officeHours.workingDays;
    setHours({ workingDays: days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day] });
  };

  // Day overrides
  const overrides: any[] = settings.officeHours.dayOverrides || [];
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Attendance Settings
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Configure office hours, locations, and biometric integration</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="hours">
        <TabsList>
          <TabsTrigger value="hours"><Clock className="w-3 h-3 mr-1" />Office Hours</TabsTrigger>
          <TabsTrigger value="location"><MapPin className="w-3 h-3 mr-1" />Locations</TabsTrigger>
          <TabsTrigger value="biometric"><Wifi className="w-3 h-3 mr-1" />Biometric</TabsTrigger>
        </TabsList>

        {/* ── Office Hours ── */}
        <TabsContent value="hours" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Default Working Hours</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check-In Time</Label>
                  <Input type="time" value={settings.officeHours.checkInTime}
                    onChange={e => setHours({ checkInTime: e.target.value })} />
                </div>
                <div>
                  <Label>Check-Out Time</Label>
                  <Input type="time" value={settings.officeHours.checkOutTime}
                    onChange={e => setHours({ checkOutTime: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Grace Period (minutes)</Label>
                <Input type="number" min="0" max="60" value={settings.officeHours.graceMinutes}
                  onChange={e => setHours({ graceMinutes: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground mt-1">Employees arriving within this window won't be marked late</p>
              </div>
              <div>
                <Label className="mb-2 block">Working Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        settings.officeHours.workingDays.includes(day)
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
                <div className="grid grid-cols-3 gap-4">
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
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label>Max Late Minutes / Month</Label>
                  <Input type="number" min="0" value={settings.latePolicy.maxLateMinutesPerMonth}
                    onChange={e => setSettings((p: any) => ({ ...p, latePolicy: { ...p.latePolicy, maxLateMinutesPerMonth: Number(e.target.value) } }))} />
                </div>
                <div>
                  <Label>Warning Threshold (min)</Label>
                  <Input type="number" min="0" value={settings.latePolicy.warningThreshold}
                    onChange={e => setSettings((p: any) => ({ ...p, latePolicy: { ...p.latePolicy, warningThreshold: Number(e.target.value) } }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-day overrides */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Per-Day Custom Hours</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Override default hours for specific days</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add override buttons — only show days not yet overridden */}
              <div className="flex flex-wrap gap-2">
                {DAYS.filter(d => settings.officeHours.workingDays.includes(d) && !overrideDays.includes(d)).map(day => (
                  <button key={day} type="button" onClick={() => addOverride(day)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors">
                    <Plus className="w-3 h-3" />{day.slice(0, 3)}
                  </button>
                ))}
                {DAYS.filter(d => settings.officeHours.workingDays.includes(d) && !overrideDays.includes(d)).length === 0 && (
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
                  <p className="text-xs text-muted-foreground">Leave Break (min) blank to use the default break duration.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Locations ── */}
        <TabsContent value="location" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Office Locations</p>
              <p className="text-xs text-muted-foreground">Employees can punch in from any of these locations</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.requireLocationForCheckIn ?? settings.location?.requireLocationForCheckIn ?? true}
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
                  checked={settings.biometric.enabled}
                  onCheckedChange={v => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, enabled: v } }))}
                />
              </div>
              {settings.biometric.enabled && (
                <>
                  <div>
                    <Label>Device Type</Label>
                    <Select value={settings.biometric.deviceType}
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
                      value={settings.biometric.apiEndpoint}
                      onChange={e => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, apiEndpoint: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>API Key / Token</Label>
                    <Input type="password" placeholder="Device authentication key"
                      value={settings.biometric.apiKey}
                      onChange={e => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, apiKey: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Sync Interval: {settings.biometric.syncInterval} minutes</Label>
                    <input type="range" min="1" max="60" step="1"
                      value={settings.biometric.syncInterval}
                      onChange={e => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, syncInterval: Number(e.target.value) } }))}
                      className="w-full mt-2 accent-primary" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">Fallback to Manual Punch</p>
                      <p className="text-xs text-muted-foreground">Allow app-based punch if biometric device is offline</p>
                    </div>
                    <Switch
                      checked={settings.biometric.fallbackToManual}
                      onCheckedChange={v => setSettings((p: any) => ({ ...p, biometric: { ...p.biometric, fallbackToManual: v } }))}
                    />
                  </div>
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-primary" />Integration Guide
                    </p>
                    <code className="block text-xs bg-muted p-2 rounded font-mono break-all">
                      POST /api/v1/attendance/biometric-sync
                    </code>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{`{
  "records": [
    { "employeeId": "<userId>", "punchTime": "2026-03-15T09:02:00Z", "punchType": "in", "deviceId": "DEVICE_001" }
  ]
}`}</pre>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {['ZKTeco','Hikvision','eSSL','Suprema','Any REST API'].map(b => (
                        <Badge key={b} variant="outline" className="text-xs">{b}</Badge>
                      ))}
                    </div>
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
