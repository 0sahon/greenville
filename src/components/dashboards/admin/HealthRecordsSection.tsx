import React, { useState, useEffect } from 'react';
import { Heart, Plus, Search, X, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, HealthRecordRow, HealthRecordInsert } from '../../../lib/supabase';

interface HealthWithStudent extends HealthRecordRow {
  students?: { student_id: string; profiles?: { first_name: string; last_name: string } | null } | null;
}

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const RECORD_TYPES = ['Allergy', 'Medication', 'Condition', 'Vaccination', 'Emergency', 'Other'];
const emptyForm = { student_id: '', record_type: 'Condition', description: '', date_recorded: new Date().toISOString().split('T')[0] };

export default function HealthRecordsSection({ profile }: Props) {
  const [records, setRecords] = useState<HealthWithStudent[]>([]);
  const [students, setStudents] = useState<{ id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<HealthWithStudent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<HealthWithStudent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('health_records')
      .select('*, students:student_id(student_id, profiles:profile_id(first_name, last_name))')
      .order('date_recorded', { ascending: false }).limit(500);
    setRecords((data || []) as HealthWithStudent[]);
    const { data: studs } = await supabase.from('students').select('id, student_id, profiles:profile_id(first_name, last_name)').eq('is_active', true);
    setStudents((studs || []) as { id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = records.filter(r => {
    const name = `${r.students?.profiles?.first_name} ${r.students?.profiles?.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || r.record_type?.toLowerCase().includes(search.toLowerCase());
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, date_recorded: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (r: HealthWithStudent) => {
    setEditTarget(r);
    setForm({
      student_id: r.student_id,
      record_type: r.record_type || 'Condition',
      description: r.description || '',
      date_recorded: r.date_recorded || new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.student_id || !form.description.trim()) return setToast({ msg: 'Student and description are required', type: 'error' });
    setSaving(true);
    try {
      if (editTarget) {
        await supabase.from('health_records').update({
          record_type: form.record_type,
          description: form.description.trim(),
          date_recorded: form.date_recorded || null,
        }).eq('id', editTarget.id);
        setToast({ msg: 'Record updated', type: 'success' });
      } else {
        const payload: HealthRecordInsert = {
          student_id: form.student_id,
          record_type: form.record_type,
          description: form.description.trim(),
          date_recorded: form.date_recorded || null,
          recorded_by: profile.id,
        };
        await supabase.from('health_records').insert(payload);
        setToast({ msg: 'Record added', type: 'success' });
      }
      setShowModal(false);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' });
    }
    setSaving(false);
  };

  const deleteRecord = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('health_records').delete().eq('id', deleteTarget.id);
      setToast({ msg: 'Record deleted', type: 'success' });
      setDeleteTarget(null);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Health Records</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Search by student or type..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{r.students?.profiles?.first_name} {r.students?.profiles?.last_name}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-medium">{r.record_type}</span></td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{r.description}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{r.date_recorded || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(r)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400"><Heart className="w-8 h-8 mx-auto mb-2 opacity-40" />No health records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">{editTarget ? 'Edit Health Record' : 'Add Health Record'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-3">
              {!editTarget && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Student *</label>
                  <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
                    <option value="">Select...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.profiles?.first_name} {s.profiles?.last_name} ({s.student_id})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Record type</label>
                <select value={form.record_type} onChange={e => setForm(f => ({ ...f, record_type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
                  {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="e.g. Nut allergy — avoid peanuts" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={form.date_recorded} onChange={e => setForm(f => ({ ...f, date_recorded: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50">{saving ? 'Saving...' : editTarget ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Record</h3>
            <p className="text-sm text-gray-600 mb-5">Delete this <span className="font-semibold">{deleteTarget.record_type}</span> record for {deleteTarget.students?.profiles?.first_name} {deleteTarget.students?.profiles?.last_name}? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={deleteRecord} disabled={deleting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
