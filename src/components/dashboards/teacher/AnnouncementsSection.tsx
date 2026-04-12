import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, AnnouncementRow, AnnouncementInsert, AnnouncementPriority } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

export default function AnnouncementsSection({ profile }: Props) {
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ title: string; content: string; priority: AnnouncementPriority; expires_at: string }>({ title: '', content: '', priority: 'normal', expires_at: '' });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase.from('announcements').select('*').eq('published', true).order('created_at', { ascending: false });
    setItems((data || []) as AnnouncementRow[]);
    setLoading(false);
  };
  useEffect(() => { fetchItems(); }, []);

  const save = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    await supabase.from('announcements').insert({ ...form, published: true, published_by: profile.id, target_audience: ['all'], expires_at: form.expires_at || null } as AnnouncementInsert);
    setSaving(false); setShowModal(false);
    setForm({ title: '', content: '', priority: 'normal', expires_at: '' });
    fetchItems();
  };

  const priorityColor: Record<string, string> = { urgent: 'bg-red-100 text-red-700 border-red-200', high: 'bg-orange-100 text-orange-700 border-orange-200', normal: 'bg-blue-100 text-blue-700 border-blue-200', low: 'bg-gray-100 text-gray-700 border-gray-200' };

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">School Announcements</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">+ Post</button>
      </div>
      <div className="space-y-4">
        {items.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{a.title}</h3>
              <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColor[a.priority] || priorityColor.normal}`}>{a.priority}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{a.content}</p>
            <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        ))}
        {items.length === 0 && <div className="text-center py-16 text-gray-400"><Bell className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No announcements yet</p></div>}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Post Announcement</h3>
            <div className="space-y-3">
              <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <textarea placeholder="Content" rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as AnnouncementPriority }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                {(['low','normal','high','urgent'] as const).map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">{saving ? 'Posting...' : 'Post'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
