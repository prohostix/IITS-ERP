import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Building2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  organizationId?: any;
  departmentId?: any;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

export function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    organizationId: '',
    departmentId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, orgsRes, deptsRes] = await Promise.all([
        api.get('/users'),
        api.get('/organizations'),
        api.get('/departments'),
      ]);
      setUsers(usersRes.data.data || []);
      setOrganizations(orgsRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
    } catch (error: any) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      organizationId: '',
      departmentId: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      organizationId: user.organizationId?.id || user.organizationId || '',
      departmentId: user.departmentId?.id || user.departmentId || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = { ...formData };
      
      // Remove empty departmentId
      if (!payload.departmentId) {
        delete (payload as any).departmentId;
      }
      
      // Remove password if editing and password is empty
      if (editingUser && !payload.password) {
        delete (payload as any).password;
      }

      console.log('Submitting user data:', payload);

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', payload);
        toast.success('User created successfully');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Operation failed';
      toast.error(errorMessage);
      console.error('Full error:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;

    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
      console.error(error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: any = {
      superadmin: 'bg-purple-500',
      org_admin: 'bg-blue-500',
      ceo: 'bg-indigo-500',
      hr_admin: 'bg-orange-500',
      finance_admin: 'bg-green-500',
      ops_admin: 'bg-cyan-500',
      sales_admin: 'bg-pink-500',
      employee: 'bg-gray-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground text-sm">
            Manage all users across organizations
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <Card key={user.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <Badge className={`mt-1 ${getRoleBadgeColor(user.role)} text-white border-none`}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">Email:</span>
                  <span className="truncate">{user.email}</span>
                </div>
                {user.organizationId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span className="text-xs truncate">
                      {user.organizationId.name || 'Organization'}
                    </span>
                  </div>
                )}
                {user.departmentId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="w-3 h-3" />
                    <span className="text-xs truncate">
                      {user.departmentId.name || 'Department'}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(user)}
                >
                  <Edit className="w-3 h-3 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(user)}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Get started by creating your first user
            </p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Create New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update the user details below'
                : 'Fill in the details to create a new user'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  required={!editingUser}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization *</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, organizationId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org_admin">Organization Admin</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="hr_admin">HR Admin</SelectItem>
                    <SelectItem value="finance_admin">Finance Admin</SelectItem>
                    <SelectItem value="ops_admin">Operations Admin</SelectItem>
                    <SelectItem value="sales_admin">Sales Admin</SelectItem>
                    <SelectItem value="center_admin">Center Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department (Optional)</Label>
                <Select
                  value={formData.departmentId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, departmentId: value || '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingUser?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
