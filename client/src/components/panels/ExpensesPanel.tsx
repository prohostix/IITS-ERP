import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Receipt, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function ExpensesPanel() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    category: 'travel',
    description: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/expenses');
      setExpenses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/finance/expenses/${editingId}`, formData);
      } else {
        await api.post('/finance/expenses', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error: any) {
      console.error('Failed to save expense:', error);
      alert(error.response?.data?.message || 'Failed to save expense');
    }
  };

  const handleEdit = (expense: any) => {
    const expenseId = expense.id || expense.id;
    setEditingId(expenseId);
    setFormData({
      amount: expense.amount?.toString() || '',
      category: expense.category || 'travel',
      description: expense.description || '',
      status: expense.status || 'pending'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/finance/expenses/${id}`);
      fetchExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const handleApprove = async (id: string, action: 'approve' | 'reject') => {
    const remarks = prompt(`Enter remarks for ${action}:`);
    try {
      await api.put(`/finance/expenses/${id}/approve`, { action, remarks });
      fetchExpenses();
    } catch (error) {
      console.error(`Failed to ${action} expense:`, error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      amount: '',
      category: 'travel',
      description: '',
      status: 'pending'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Expense Management</h2>
          <p className="text-muted-foreground">Track and approve expense claims</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} required />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No expenses found</div>
          ) : (
            <div className="space-y-2">
              {expenses.filter(expense => expense && (expense.id || expense.id)).map((expense) => {
                const expenseId = expense.id || expense.id;
                return (
                  <div key={expenseId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">₹{expense.amount} - {expense.category}</div>
                        <div className="text-sm text-muted-foreground">{expense.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          By: {expense.employeeId?.name || expense.employee?.name || 'Unknown'} • {expense.submittedAt ? new Date(expense.submittedAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{expense.status}</Badge>
                      {expense.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleApprove(expenseId, 'approve')}>
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleApprove(expenseId, 'reject')}>
                            <XCircle className="w-4 h-4 text-error" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(expenseId)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
