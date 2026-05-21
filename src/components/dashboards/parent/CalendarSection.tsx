/**
 * Parent Calendar Section — reuses the same premium student calendar view.
 * Parents can see school events, holidays, exams and cultural activities.
 */
import { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Bell, Star, AlertCircle, Coffee, Music, Flag, Clock, BookOpen } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { EventRow, EventType } from '../../../lib/supabase';

const EVENT_META: Record<EventType, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  general:  { label: 'General',  color: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-500',  icon: Bell },
  holiday:  { label: 'Holiday',  color: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-400',   icon: Star },
  exam:     { label: 'Exam',     color: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-500',     icon: AlertCircle },
  meeting:  { label: 'Meeting',  color: 'bg-teal-50 text-teal-700 border-teal-200',        dot: 'bg-teal-500',    icon: Coffee },
  sports:   { label: 'Sports',   color: 'bg-green-50 text-green-700 border-green-200',     dot: 'bg-green-500',   icon: Flag },
  cultural: { label: 'Cultural', color: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-500',  icon: Music },
};

const ALL_FILTERS: Array<EventType | 'all'> = ['all', 'general', 'holiday', 'exam', 'meeting', 'sports', 'cultural'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function daysUntil(s: string) {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(s); d.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - t.getTime()) / 86400000);
}

export default function ParentCalendarSection() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType | 'all'>('all');
  const [viewYear, setViewYear]   = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  useEffect(() => {
    supabase.from('events').select('*').order('start_date', { ascending: true }).then(({ data }) => {
      setEvents((data || []) as EventRow[]);
      setLoading(false);
    });
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayDay = new Date().getDate();
  const todayMonth = new Date().getMonth();
  const todayYear = new Date().getFullYear();

  const filtered = useMemo(() =>
    (filter === 'all' ? events : events.filter(e => e.event_type === filter)).filter(e => e.start_date >= today),
  [events, filter, today]);

  const thisWeek = events.filter(e => { const d = daysUntil(e.start_date); return d >= 0 && d <= 7; });

  const eventDatesInView = useMemo(() => {
    const map: Record<number, EventType[]> = {};
    events.forEach(ev => {
      const d = new Date(ev.start_date);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev.event_type);
      }
    });
    return map;
  }, [events, viewYear, viewMonth]);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const calCells: Array<number|null> = Array(startDay).fill(null).concat(Array.from({ length: totalDays }, (_, i) => i + 1));
  while (calCells.length % 7 !== 0) calCells.push(null);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" /> Academic Calendar
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Stay updated on school events, holidays & exams — 2025/2026</p>
        </div>
        {thisWeek.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2">
            <Bell className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span className="text-sm font-semibold text-indigo-700">{thisWeek.length} event{thisWeek.length > 1 ? 's' : ''} this week</span>
          </div>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === f ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}>
            {f === 'all' ? '📅 All' : EVENT_META[f].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Mini calendar */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 py-3 flex items-center justify-between text-white">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-white/20"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-bold text-sm">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-white/20"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 bg-indigo-50">
            {DAY_HEADERS.map(d => <div key={d} className="py-2 text-center text-[10px] font-bold text-indigo-600 uppercase">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 p-2 gap-0.5">
            {calCells.map((day, i) => {
              const isToday = day === todayDay && viewMonth === todayMonth && viewYear === todayYear;
              const hasEv = day ? eventDatesInView[day] : undefined;
              return (
                <div key={i} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium ${
                  !day ? '' : isToday ? 'bg-indigo-600 text-white font-bold' : hasEv ? 'bg-indigo-50 text-indigo-700 cursor-pointer' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                  {day && (
                    <>
                      <span>{day}</span>
                      {hasEv && !isToday && (
                        <div className="flex gap-0.5 mt-0.5">
                          {hasEv.slice(0,3).map((t,j) => <span key={j} className={`w-1 h-1 rounded-full ${EVENT_META[t].dot}`} />)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-gray-50 flex flex-wrap gap-x-3 gap-y-1">
            {(Object.entries(EVENT_META) as [EventType, typeof EVENT_META[EventType]][]).map(([type, meta]) => (
              <div key={type} className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming events list */}
        <div className="xl:col-span-3 space-y-4">
          {thisWeek.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 rounded-2xl p-4 text-white">
              <p className="text-xs font-bold uppercase opacity-75 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> This Week
              </p>
              <div className="space-y-2">
                {thisWeek.map(e => {
                  const days = daysUntil(e.start_date);
                  return (
                    <div key={e.id} className="flex items-start justify-between gap-3 bg-white/15 rounded-xl px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{e.title}</p>
                        <p className="text-[11px] opacity-75">{new Date(e.start_date).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                      </div>
                      <span className="flex-shrink-0 text-xs font-bold bg-white/20 rounded-full px-2 py-0.5">
                        {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `In ${days}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-gray-800 text-sm">Upcoming Events</h3>
              <span className="ml-auto text-xs text-gray-400">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[440px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No upcoming events</p>
                </div>
              ) : filtered.map(e => {
                const days = daysUntil(e.start_date);
                const meta = EVENT_META[e.event_type];
                const Icon = meta.icon;
                return (
                  <div key={e.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex flex-col items-center justify-center border border-indigo-100">
                      <span className="text-[9px] text-indigo-500 font-bold uppercase">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date(e.start_date).getMonth()]}</span>
                      <span className="text-base font-extrabold text-indigo-700 leading-tight">{new Date(e.start_date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900 leading-tight">{e.title}</p>
                        <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                          <Icon className="w-2.5 h-2.5" />{meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(e.start_date).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        {e.end_date && e.end_date !== e.start_date && ` – ${new Date(e.end_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`}
                      </p>
                      {e.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{e.description}</p>}
                    </div>
                    {days >= 0 && days <= 30 && (
                      <span className={`flex-shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${days === 0 ? 'bg-red-100 text-red-700' : days <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
