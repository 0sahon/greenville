import { useState, useEffect } from 'react';
import { Calendar, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, EventRow, EventInsert, EventType } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  general: 'bg-gray-100 text-gray-700 border-gray-200',
  holiday: 'bg-purple-100 text-purple-700 border-purple-200',
  exam: 'bg-red-100 text-red-700 border-red-200',
  meeting: 'bg-blue-100 text-blue-700 border-blue-200',
  sports: 'bg-green-100 text-green-700 border-green-200',
  cultural: 'bg-orange-100 text-orange-700 border-orange-200',
};

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const emptyForm = { title: '', description: '', start_date: new Date().toISOString().split('T')[0], end_date: '', event_type: 'general' as EventType };

export default function CalendarSection({ profile }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<EventRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending: true });
    setEvents((data || []) as EventRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, start_date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (e: EventRow) => {
    setEditTarget(e);
    setForm({
      title: e.title,
      description: e.description || '',
      start_date: e.start_date,
      end_date: e.end_date || '',
      event_type: e.event_type,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.start_date) return setToast({ msg: 'Title and start date are required', type: 'error' });
    setSaving(true);
    try {
      if (editTarget) {
        await supabase.from('events').update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          event_type: form.event_type,
        }).eq('id', editTarget.id);
        setToast({ msg: 'Event updated', type: 'success' });
      } else {
        await supabase.from('events').insert({
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          event_type: form.event_type,
          target_audience: ['all'],
          created_by: profile.id,
        } as EventInsert);
        setToast({ msg: 'Event added', type: 'success' });
      }
      setShowModal(false);
      fetchEvents();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed to save event', type: 'error' });
    }
    setSaving(false);
  };

  const deleteEvent = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('events').delete().eq('id', deleteTarget.id);
      setToast({ msg: 'Event deleted', type: 'success' });
      setDeleteTarget(null);
      fetchEvents();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    }
    setDeleting(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.start_date >= today).slice(0, 20);
  const past = events.filter(e => e.start_date < today).slice(-10).reverse();

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Academic Calendar</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-teal-300 border-t-teal-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-teal-500" /> Upcoming Events</h3>
            <div className="space-y-3">
              {upcoming.length === 0 ? <p className="text-gray-400 text-sm">No upcoming events</p> : upcoming.map(e => (
                <div key={e.id} className={`p-3 rounded-lg border ${EVENT_TYPE_COLORS[e.event_type]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs mt-0.5">{new Date(e.start_date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{e.end_date && e.end_date !== e.start_date ? ' – ' + new Date(e.end_date).toLocaleDateString() : ''}</p>
                      {e.description && <p className="text-xs mt-1 opacity-90">{e.description}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-black/10" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(e)} className="p-1 rounded hover:bg-black/10 text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Past Events</h3>
            <div className="space-y-2">
              {past.length === 0 ? <p className="text-gray-400 text-sm">No past events</p> : past.map(e => (
                <div key={e.id} className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-700 text-sm">{e.title}</p>
                    <p className="text-xs text-gray-500">{new Date(e.start_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-gray-200 text-gray-500" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteTarget(e)} className="p-1 rounded hover:bg-red-50 text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">{editTarget ? 'Edit Event' : 'Add Event'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value as EventType }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {(Object.keys(EVENT_TYPE_COLORS) as EventType[]).map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50">{saving ? 'Saving...' : editTarget ? 'Update' : 'Add Event'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Event</h3>
            <p className="text-sm text-gray-600 mb-5">Delete "<span className="font-semibold">{deleteTarget.title}</span>"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={deleteEvent} disabled={deleting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
