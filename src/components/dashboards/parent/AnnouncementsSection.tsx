import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { AnnouncementRow } from '../../../lib/supabase';

const PRIORITY_COLORS: Record<string, string> = { low: 'bg-gray-100 text-gray-700', normal: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' };

export default function AnnouncementsSection() {
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('announcements').select('*').eq('published', true).order('created_at', { ascending: false }).then(({ data }) => {
      setItems((data || []) as AnnouncementRow[]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">School Announcements</h2>
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Bell className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No announcements yet</p></div>
        ) : items.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold text-gray-800">{a.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.normal}`}>{a.priority}</span>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.content}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(a.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
