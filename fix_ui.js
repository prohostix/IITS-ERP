const fs = require('fs');
const file = 'client/src/components/panels/ProgramFeeStructurePanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const handlers = `  const addAdditionalFee = () => {
    setForm(prev => ({
      ...prev,
      additionalFees: [...prev.additionalFees, { id: Date.now().toString(), label: '', amount: '' }]
    }));
  };

  const removeAdditionalFee = (idx: number) => {
    setForm(prev => {
      const newFees = [...prev.additionalFees];
      newFees.splice(idx, 1);
      return { ...prev, additionalFees: newFees };
    });
  };

  const handleAdditionalFeeChange = (idx: number, field: string, value: string) => {
    setForm(prev => {
      const newFees = [...prev.additionalFees];
      newFees[idx] = { ...newFees[idx], [field]: value };
      return { ...prev, additionalFees: newFees };
    });
  };

  const addBreakdownAdditionalFee = (bIdx: number) => {
    setForm(prev => {
      const newBreakdown = [...prev.feeBreakdown];
      const fees = Array.isArray(newBreakdown[bIdx].additionalFees) ? [...newBreakdown[bIdx].additionalFees] : [];
      fees.push({ id: Date.now().toString(), label: '', amount: '' });
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], additionalFees: fees };
      return { ...prev, feeBreakdown: newBreakdown };
    });
  };

  const removeBreakdownAdditionalFee = (bIdx: number, fIdx: number) => {
    setForm(prev => {
      const newBreakdown = [...prev.feeBreakdown];
      const fees = [...newBreakdown[bIdx].additionalFees];
      fees.splice(fIdx, 1);
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], additionalFees: fees };
      return { ...prev, feeBreakdown: newBreakdown };
    });
  };

  const handleBreakdownAdditionalFeeChange = (bIdx: number, fIdx: number, field: string, value: string) => {
    setForm(prev => {
      const newBreakdown = [...prev.feeBreakdown];
      const fees = [...newBreakdown[bIdx].additionalFees];
      fees[fIdx] = { ...fees[fIdx], [field]: value };
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], additionalFees: fees };
      return { ...prev, feeBreakdown: newBreakdown };
    });
  };
`;

content = content.replace('  const handleBreakdownChange = (idx: number, field: string, value: string) => {', handlers + '\n  const handleBreakdownChange = (idx: number, field: string, value: string) => {');

// Replace the UI part for One-Time Additional Fees
const oldOneTimeInput = `<div className="col-span-full mt-4">
                        <Label>Other One-Time Fees (Optional, Comma separated)</Label>
                        <Input 
                          placeholder="e.g. Lab Fee:5000, Library Fee:2000" 
                          value={form.additionalFees}
                          onChange={e => setForm({...form, additionalFees: e.target.value})}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Format: Label:Amount, Label2:Amount2</p>
                      </div>`;

const newOneTimeUI = `<div className="col-span-full mt-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <Label className="text-sm font-semibold mb-3 block text-slate-800 dark:text-slate-200">Additional One-Time Fees (Optional)</Label>
                        {Array.isArray(form.additionalFees) && form.additionalFees.map((fee, idx) => (
                          <div key={fee.id} className="flex gap-4 mb-3 items-center">
                            <Input placeholder="Fee Name (e.g. Lab Fee)" value={fee.label} onChange={e => handleAdditionalFeeChange(idx, 'label', e.target.value)} className="flex-1 bg-white" />
                            <Input type="number" placeholder="Amount" value={fee.amount} onChange={e => handleAdditionalFeeChange(idx, 'amount', e.target.value)} className="w-32 bg-white" />
                            <Button variant="ghost" size="icon" onClick={() => removeAdditionalFee(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addAdditionalFee} className="mt-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 bg-white">
                          <Plus className="w-4 h-4 mr-2" /> Add One-Time Fee
                        </Button>
                      </div>`;

content = content.replace(oldOneTimeInput, newOneTimeUI);

// Update Breakdown UI
const breakdownRegex = /<div className="grid grid-cols-5 gap-4">.*?<\/div>/s;

const breakdownUIReplacement = `<div className="grid grid-cols-5 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Tuition Fee</Label>
                              <Input 
                                type="number" 
                                value={b.baseFee} 
                                onChange={e => handleBreakdownChange(idx, 'baseFee', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">University Fee</Label>
                              <Input 
                                type="number" 
                                value={b.universityFee} 
                                onChange={e => handleBreakdownChange(idx, 'universityFee', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Exam Fee</Label>
                              <Input 
                                type="number" 
                                value={b.examFee} 
                                onChange={e => handleBreakdownChange(idx, 'examFee', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Commission Rate (%)</Label>
                              <Input 
                                type="number" 
                                value={b.commissionRate} 
                                onChange={e => handleBreakdownChange(idx, 'commissionRate', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Due Date</Label>
                              <Input 
                                type="date" 
                                value={b.dueDate ? String(b.dueDate).slice(0,10) : ''} 
                                onChange={e => handleBreakdownChange(idx, 'dueDate', e.target.value)}
                              />
                            </div>
                            
                            <div className="col-span-5 mt-2 bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Additional Fees for this {form.billingCycle === 'per_semester' ? 'Semester' : 'Year'} (Optional)</Label>
                              {Array.isArray(b.additionalFees) && b.additionalFees.map((fee: any, fIdx: number) => (
                                <div key={fee.id} className="flex gap-3 mb-2 items-center">
                                  <Input className="h-8 text-sm flex-1" placeholder="Fee Name (e.g. Lab Fee)" value={fee.label} onChange={e => handleBreakdownAdditionalFeeChange(idx, fIdx, 'label', e.target.value)} />
                                  <Input className="h-8 text-sm w-32" type="number" placeholder="Amount" value={fee.amount} onChange={e => handleBreakdownAdditionalFeeChange(idx, fIdx, 'amount', e.target.value)} />
                                  <Button variant="ghost" size="sm" onClick={() => removeBreakdownAdditionalFee(idx, fIdx)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" onClick={() => addBreakdownAdditionalFee(idx)} className="h-8 text-xs text-indigo-600 hover:bg-indigo-50 mt-1">
                                <Plus className="w-3 h-3 mr-1" /> Add Installment Fee
                              </Button>
                            </div>
                          </div>`;

content = content.replace(breakdownRegex, breakdownUIReplacement);

fs.writeFileSync(file, content);
