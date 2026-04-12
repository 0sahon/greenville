import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { EventRow, EventType } from '../../../lib/supabase';

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  general: 'bg-gray-100 text-gray-700 border-gray-200', holiday: 'bg-purple-100 text-purple-700 border-purple-200',
  exam: 'bg-red-100 text-red-700 border-red-200', meeting: 'bg-blue-100 text-blue-700 border-blue-200',
  sports: 'bg-green-100 text-green-700 border-green-200', cultural: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function CalendarSection() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('events').select('*').order('start_date', { ascending: true }).then(({ data }) => {
      setEvents((data || []) as EventRow[]);
      setLoading(false);
    });
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.start_date >= today).slice(0, 20);
  const past = events.filter(e => e.start_date < today).slice(-10).reverse();

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-teal-300 border-t-teal-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Academic Calendar</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-teal-500" /> Upcoming Events</h3>
          <div className="space-y-3">
            {upcoming.length === 0 ? <p className="text-gray-400 text-sm">No upcoming events</p> : upcoming.map(e => (
              <div key={e.id} className={`p-3 rounded-lg border ${EVENT_TYPE_COLORS[e.event_type]}`}>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs mt-0.5">{new Date(e.start_date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{e.end_date && e.end_date !== e.start_date ? ' – ' + new Date(e.end_date).toLocaleDateString() : ''}</p>
                {e.description && <p className="text-xs mt-1 opacity-90">{e.description}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Past Events</h3>
          <div className="space-y-2">
            {past.length === 0 ? <p className="text-gray-400 text-sm">No past events</p> : past.map(e => (
              <div key={e.id} className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                <p className="font-medium text-gray-700 text-sm">{e.title}</p>
                <p className="text-xs text-gray-500">{new Date(e.start_date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
