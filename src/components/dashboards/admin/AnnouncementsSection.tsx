import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, AnnouncementRow, AnnouncementInsert, AnnouncementPriority } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const emptyForm = { title: '', content: '', priority: 'normal' as AnnouncementPriority, expires_at: '' };
const safeDateLabel = (
  value: string | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
) => (value ? new Date(value).toLocaleDateString(locale, options) : '—');

export default function AnnouncementsSection({ profile }: Props) {
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(200);
    setItems((data || []) as AnnouncementRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: AnnouncementRow) => {
    setEditTarget(a);
    setForm({
      title: a.title,
      content: a.content,
      priority: a.priority ?? 'normal',
      expires_at: a.expires_at ? a.expires_at.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return setToast({ msg: 'Title and content are required', type: 'error' });
    setSaving(true);
    try {
      if (editTarget) {
        await supabase.from('announcements').update({
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          expires_at: form.expires_at ? form.expires_at + 'T23:59:59.999Z' : null,
        }).eq('id', editTarget.id);
        setToast({ msg: 'Announcement updated', type: 'success' });
      } else {
        await supabase.from('announcements').insert({
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          published: true,
          published_by: profile.id,
          target_audience: ['all'],
          expires_at: form.expires_at ? form.expires_at + 'T23:59:59.999Z' : null,
        } as AnnouncementInsert);
        setToast({ msg: 'Announcement published', type: 'success' });
      }
      setShowModal(false);
      fetchItems();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed to save', type: 'error' });
    }
    setSaving(false);
  };

  const deleteAnnouncement = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('announcements').delete().eq('id', deleteTarget.id);
      setToast({ msg: 'Announcement deleted', type: 'success' });
      setDeleteTarget(null);
      fetchItems();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Announcements</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Bell className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No announcements yet</p></div>
        ) : (
          items.map(a => {
            const priority = a.priority ?? 'normal';
            return (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{a.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${PRIORITY_COLORS[priority]}`}>{priority}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(a)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.content}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">{safeDateLabel(a.created_at, 'en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {a.expires_at && <p className="text-xs text-gray-400">Expires: {safeDateLabel(a.expires_at)}</p>}
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">{editTarget ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Content *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Write your announcement..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as AnnouncementPriority }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  {(['low', 'normal', 'high', 'urgent'] as const).map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expires (optional)</label>
                <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                {saving ? 'Saving...' : editTarget ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Announcement</h3>
            <p className="text-sm text-gray-600 mb-5">Delete "<span className="font-semibold">{deleteTarget.title}</span>"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={deleteAnnouncement} disabled={deleting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
