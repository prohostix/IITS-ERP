import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Tv, 
  Wifi, 
  Video, 
  Wind,
  Layers,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import api from '@/lib/api';

interface MeetingRoom {
  id: string;
  name: string;
  code?: string;
  floor?: string;
  capacity: number;
  amenities: string[];
  status: 'active' | 'maintenance' | 'inactive';
  description?: string;
  todayBookingsCount?: number;
  _count?: { bookings: number };
}

const COMMON_AMENITIES = [
  'Projector',
  'Large Screen TV / Display',
  'Video Conference Setup',
  'Whiteboard & Markers',
  'High-Speed WiFi',
  'Audio & Mic System',
  'Air Conditioned',
  'Conference Phone',
];

export function OrgMeetingRoomsPanel() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    floor: '',
    capacity: 6,
    amenities: [] as string[],
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    description: '',
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/front-office/rooms');
      setRooms(res.data.data || []);
    } catch {
      toast.error('Failed to load meeting rooms');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      code: '',
      floor: '',
      capacity: 6,
      amenities: ['Projector', 'Whiteboard & Markers', 'Air Conditioned'],
      status: 'active',
      description: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (room: MeetingRoom) => {
    setEditingRoom(room);
    setFormData({
      name: room.name || '',
      code: room.code || '',
      floor: room.floor || '',
      capacity: room.capacity || 6,
      amenities: room.amenities || [],
      status: room.status || 'active',
      description: room.description || '',
    });
    setDialogOpen(true);
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists 
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleSaveRoom = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        floor: formData.floor.trim() || undefined,
        capacity: Number(formData.capacity) || 4,
        amenities: formData.amenities,
        status: formData.status,
        description: formData.description.trim() || undefined,
      };

      if (editingRoom) {
        await api.put(`/front-office/rooms/${editingRoom.id}`, payload);
        toast.success(`Meeting room "${formData.name}" updated successfully`);
      } else {
        await api.post('/front-office/rooms', payload);
        toast.success(`Meeting room "${formData.name}" added successfully`);
      }

      setDialogOpen(false);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save meeting room');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete meeting room "${name}"? All associated past and future bookings will be removed.`)) {
      return;
    }

    try {
      await api.delete(`/front-office/rooms/${id}`);
      toast.success('Meeting room deleted successfully');
      fetchRooms();
    } catch {
      toast.error('Failed to delete meeting room');
    }
  };

  const totalCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
  const activeRoomsCount = rooms.filter(r => r.status === 'active').length;
  const maintenanceCount = rooms.filter(r => r.status === 'maintenance').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meeting Room Infrastructure</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure conference rooms, capacities, and audiovisual amenities for office operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRooms}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog} className="shadow-md">
            <Plus className="w-4 h-4 mr-1.5" /> Add Meeting Room
          </Button>
        </div>
      </div>

      {/* Infrastructure Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Meeting Rooms</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{rooms.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active & Bookable</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{activeRoomsCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">In Maintenance</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{maintenanceCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Office Seating</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{totalCapacity} Seats</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Room Cards Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 bg-muted/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-base">No Meeting Rooms Configured</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Add conference rooms, discussion rooms, and executive boardrooms so Front Office Admin can schedule meetings.
              </p>
              <Button size="sm" onClick={openCreateDialog} className="mt-4">
                <Plus className="w-4 h-4 mr-1.5" /> Add Your First Meeting Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => {
              const isMaintenance = room.status === 'maintenance';
              const isInactive = room.status === 'inactive';

              return (
                <Card key={room.id} className="border shadow-sm hover:shadow transition-all bg-card flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-foreground">{room.name}</h4>
                          {room.code && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              {room.code}
                            </Badge>
                          )}
                        </div>
                        {room.floor && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {room.floor}
                          </p>
                        )}
                      </div>

                      {isMaintenance ? (
                        <Badge variant="secondary" className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200">
                          Maintenance
                        </Badge>
                      ) : isInactive ? (
                        <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-primary" /> {room.capacity} Persons Capacity
                      </span>
                      {room._count?.bookings !== undefined && (
                        <>
                          <span>•</span>
                          <span>{room._count.bookings} lifetime bookings</span>
                        </>
                      )}
                    </div>

                    {room.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {room.description}
                      </p>
                    )}

                    {/* Amenities list */}
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Amenities:</p>
                      {room.amenities && room.amenities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {room.amenities.map(a => (
                            <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-medium">
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No specific amenities configured</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => openEditDialog(room)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteRoom(room.id, room.name)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Room Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingRoom ? 'Edit Meeting Room' : 'Add New Meeting Room'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">Room Name *</Label>
              <Input
                placeholder="e.g. Boardroom Alpha, Conference Room 1"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Room Code / Identifier</Label>
                <Input
                  placeholder="e.g. CR-101"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Location / Floor</Label>
                <Input
                  placeholder="e.g. 2nd Floor, East Wing"
                  value={formData.floor}
                  onChange={e => setFormData({ ...formData, floor: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Seating Capacity *</Label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Operational Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Bookable)</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amenities Multi-select */}
            <div className="space-y-2 border p-3 rounded-lg bg-muted/20">
              <Label className="font-semibold text-xs">Equipped Amenities & Features</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {COMMON_AMENITIES.map(amenity => {
                  const checked = formData.amenities.includes(amenity);
                  return (
                    <label
                      key={amenity}
                      className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <span>{amenity}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description / Special Instructions</Label>
              <Input
                placeholder="e.g. Equipped with 4K HDMI link and Logitech VC system"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoom} disabled={submitting}>
              {submitting ? 'Saving...' : editingRoom ? 'Update Room' : 'Add Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

