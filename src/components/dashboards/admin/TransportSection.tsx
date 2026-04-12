import React, { useState, useEffect } from 'react';
import { Bus, Plus, Search, X, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, TransportRow, TransportInsert } from '../../../lib/supabase';

interface TransportWithStudent extends TransportRow {
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

const emptyForm = { student_id: '', route_name: '', pickup_location: '', pickup_time: '07:30', dropoff_location: '', dropoff_time: '15:30', monthly_fee: '' };

export default function TransportSection({ profile: _profile }: Props) {
  const [transports, setTransports] = useState<TransportWithStudent[]>([]);
  const [students, setStudents] = useState<{ id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<TransportWithStudent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TransportWithStudent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('transport')
      .select('*, students:student_id(student_id, profiles:profile_id(first_name, last_name))')
      .order('route_name');
    setTransports((data || []) as TransportWithStudent[]);
    const { data: studs } = await supabase.from('students').select('id, student_id, profiles:profile_id(first_name, last_name)').eq('is_active', true);
    setStudents((studs || []) as { id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = transports.filter(t => {
    const name = `${t.students?.profiles?.first_name} ${t.students?.profiles?.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || t.route_name?.toLowerCase().includes(search.toLowerCase());
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (t: TransportWithStudent) => {
    setEditTarget(t);
    setForm({
      student_id: t.student_id,
      route_name: t.route_name || '',
      pickup_location: t.pickup_location || '',
      pickup_time: t.pickup_time || '07:30',
      dropoff_location: t.dropoff_location || '',
      dropoff_time: t.dropoff_time || '15:30',
      monthly_fee: t.monthly_fee != null ? String(t.monthly_fee) : '',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.student_id || !form.route_name || !form.pickup_location || !form.dropoff_location) {
      return setToast({ msg: 'Student, route, pickup and dropoff are required', type: 'error' });
    }
    setSaving(true);
    try {
      if (editTarget) {
        await supabase.from('transport').update({
          route_name: form.route_name,
          pickup_location: form.pickup_location,
          pickup_time: form.pickup_time,
          dropoff_location: form.dropoff_location,
          dropoff_time: form.dropoff_time,
          monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
        }).eq('id', editTarget.id);
        setToast({ msg: 'Route updated', type: 'success' });
      } else {
        const payload: TransportInsert = {
          student_id: form.student_id,
          route_name: form.route_name,
          pickup_location: form.pickup_location,
          pickup_time: form.pickup_time,
          dropoff_location: form.dropoff_location,
          dropoff_time: form.dropoff_time,
          monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
        };
        await supabase.from('transport').insert(payload);
        setToast({ msg: 'Route added', type: 'success' });
      }
      setShowModal(false);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' });
    }
    setSaving(false);
  };

  const toggleActive = async (t: TransportWithStudent) => {
    await supabase.from('transport').update({ is_active: !t.is_active }).eq('id', t.id);
    setToast({ msg: `Route ${!t.is_active ? 'activated' : 'deactivated'}`, type: 'success' });
    fetchData();
  };

  const deleteTransport = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('transport').delete().eq('id', deleteTarget.id);
      setToast({ msg: 'Route deleted', type: 'success' });
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
        <h2 className="text-xl font-bold text-gray-900">Transport</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
          <Plus className="w-4 h-4" /> Add Route
        </button>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Search by student or route..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Pickup</th>
                  <th className="py-3 px-4">Dropoff</th>
                  <th className="py-3 px-4">Monthly Fee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{t.students?.profiles?.first_name} {t.students?.profiles?.last_name}</td>
                    <td className="py-3 px-4 text-gray-600">{t.route_name}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{t.pickup_location} @ {t.pickup_time}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{t.dropoff_location} @ {t.dropoff_time}</td>
                    <td className="py-3 px-4">{t.monthly_fee != null ? `₦${Number(t.monthly_fee).toLocaleString()}` : '—'}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => toggleActive(t)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(t)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400"><Bus className="w-8 h-8 mx-auto mb-2 opacity-40" />No transport records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">{editTarget ? 'Edit Transport Route' : 'Add Transport Route'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              {!editTarget && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Student *</label>
                  <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Select...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.profiles?.first_name} {s.profiles?.last_name} ({s.student_id})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Route name *</label>
                <input value={form.route_name} onChange={e => setForm(f => ({ ...f, route_name: e.target.value }))} placeholder="e.g. Route A" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pickup location *</label>
                <input value={form.pickup_location} onChange={e => setForm(f => ({ ...f, pickup_location: e.target.value }))} placeholder="Address" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pickup time</label>
                <input type="time" value={form.pickup_time} onChange={e => setForm(f => ({ ...f, pickup_time: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dropoff location *</label>
                <input value={form.dropoff_location} onChange={e => setForm(f => ({ ...f, dropoff_location: e.target.value }))} placeholder="School" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dropoff time</label>
                <input type="time" value={form.dropoff_time} onChange={e => setForm(f => ({ ...f, dropoff_time: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly fee (₦)</label>
                <input type="number" value={form.monthly_fee} onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50">{saving ? 'Saving...' : editTarget ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Route</h3>
            <p className="text-sm text-gray-600 mb-5">Delete route "<span className="font-semibold">{deleteTarget.route_name}</span>" for {deleteTarget.students?.profiles?.first_name} {deleteTarget.students?.profiles?.last_name}? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={deleteTransport} disabled={deleting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
