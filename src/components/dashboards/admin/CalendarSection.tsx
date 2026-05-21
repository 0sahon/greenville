import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Plus, X, Edit2, Trash2, Bell, Star, AlertCircle,
  Coffee, Music, Flag, Search, ChevronLeft, ChevronRight,
  Clock, BookOpen
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, EventRow, EventInsert, EventType } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const EVENT_META: Record<EventType, { label: string; color: string; dot: string; badge: string; icon: React.ElementType }> = {
  general:  { label: 'General',  color: 'bg-indigo-50 text-indigo-700 border-indigo-200',   dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700',  icon: Bell },
  holiday:  { label: 'Holiday',  color: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700',    icon: Star },
  exam:     { label: 'Exam',     color: 'bg-red-50 text-red-700 border-red-200',            dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700',        icon: AlertCircle },
  meeting:  { label: 'Meeting',  color: 'bg-teal-50 text-teal-700 border-teal-200',         dot: 'bg-teal-500',    badge: 'bg-teal-100 text-teal-700',      icon: Coffee },
  sports:   { label: 'Sports',   color: 'bg-green-50 text-green-700 border-green-200',      dot: 'bg-green-500',   badge: 'bg-green-100 text-green-700',    icon: Flag },
  cultural: { label: 'Cultural', color: 'bg-orange-50 text-orange-700 border-orange-200',   dot: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700',  icon: Music },
};

const ALL_TYPES: EventType[] = ['general', 'holiday', 'exam', 'meeting', 'sports', 'cultural'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function daysUntil(s: string) {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(s); d.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - t.getTime()) / 86400000);
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: ()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-[100] max-w-[90vw] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const emptyForm = {
  title: '',
  description: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  event_type: 'general' as EventType,
};

export default function AdminCalendarSection({ profile }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [viewTab, setViewTab] = useState<'upcoming'|'past'|'all'>('upcoming');
  const [viewYear, setViewYear]  = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<EventRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error' }|null>(null);

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
    setForm({ title: e.title, description: e.description || '', start_date: e.start_date, end_date: e.end_date || '', event_type: e.event_type });
    setShowModal(true);
  };
  const save = async () => {
    if (!form.title.trim() || !form.start_date) return setToast({ msg: 'Title and start date are required', type: 'error' });
    setSaving(true);
    try {
      if (editTarget) {
        await supabase.from('events').update({ title: form.title.trim(), description: form.description.trim() || null, start_date: form.start_date, end_date: form.end_date || null, event_type: form.event_type }).eq('id', editTarget.id);
        setToast({ msg: 'Event updated ✓', type: 'success' });
      } else {
        await supabase.from('events').insert({ title: form.title.trim(), description: form.description.trim() || null, start_date: form.start_date, end_date: form.end_date || null, event_type: form.event_type, target_audience: ['all'], created_by: profile.id } as EventInsert);
        setToast({ msg: 'Event added ✓', type: 'success' });
      }
      setShowModal(false); fetchEvents();
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' }); }
    setSaving(false);
  };
  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('events').delete().eq('id', deleteTarget.id);
      setToast({ msg: 'Event deleted', type: 'success' });
      setDeleteTarget(null); fetchEvents();
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' }); }
    setDeleting(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = useMemo(() => {
    let ev = filterType === 'all' ? events : events.filter(e => e.event_type === filterType);
    if (search.trim()) ev = ev.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || (e.description || '').toLowerCase().includes(search.toLowerCase()));
    if (viewTab === 'upcoming') ev = ev.filter(e => e.start_date >= today);
    if (viewTab === 'past') ev = ev.filter(e => e.start_date < today).reverse();
    return ev;
  }, [events, filterType, search, viewTab, today]);

  // Mini calendar event dots
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

  const todayDay = new Date().getDate();
  const todayMonth = new Date().getMonth();
  const todayYear = new Date().getFullYear();

  const upcomingCount = events.filter(e => e.start_date >= today).length;
  const thisWeekCount = events.filter(e => { const d = daysUntil(e.start_date); return d >= 0 && d <= 7; }).length;

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" /> Academic Calendar
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage school events visible to all students & parents</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {/* ── Summary chips ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Events', value: events.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
          { label: 'Upcoming', value: upcomingCount, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'This Week', value: thisWeekCount, color: thisWeekCount > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* ── Mini Calendar ── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 py-3 flex items-center justify-between text-white">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-white/20 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-bold text-sm">{['January','February','March','April','May','June','July','August','September','October','November','December'][viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-white/20 transition-colors"><ChevronRight className="w-4 h-4" /></button>
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
                  !day ? '' : isToday ? 'bg-indigo-600 text-white font-bold' : hasEv ? 'bg-indigo-50 text-indigo-700 cursor-pointer hover:bg-indigo-100' : 'text-gray-600 hover:bg-gray-50'
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
          {/* Legend */}
          <div className="px-3 py-2 border-t border-gray-50 flex flex-wrap gap-x-3 gap-y-1">
            {ALL_TYPES.map(t => (
              <div key={t} className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className={`w-1.5 h-1.5 rounded-full ${EVENT_META[t].dot}`} />
                {EVENT_META[t].label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Events List ── */}
        <div className="xl:col-span-3 space-y-3">
          {/* Search + Filter row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <select
              value={filterType} onChange={e => setFilterType(e.target.value as EventType | 'all')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Types</option>
              {ALL_TYPES.map(t => <option key={t} value={t}>{EVENT_META[t].label}</option>)}
            </select>
          </div>

          {/* Tab pills */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {(['upcoming','all','past'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setViewTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${viewTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'upcoming' ? `Upcoming (${upcomingCount})` : tab === 'all' ? `All (${events.length})` : 'Past'}
              </button>
            ))}
          </div>

          {/* Event Cards */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No events found</p>
              <button onClick={openAdd} className="mt-3 text-xs text-indigo-600 hover:underline font-medium">+ Add one now</button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map(e => {
                const meta = EVENT_META[e.event_type];
                const Icon = meta.icon;
                const days = daysUntil(e.start_date);
                return (
                  <div key={e.id} className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm ${meta.color}`}>
                    {/* Date bubble */}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/60 flex flex-col items-center justify-center border border-current/20 shadow-sm">
                      <span className="text-[9px] font-bold uppercase opacity-70">{MONTH_NAMES[new Date(e.start_date).getMonth()]}</span>
                      <span className="text-base font-extrabold leading-none">{new Date(e.start_date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm leading-tight">{e.title}</p>
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(e)} className="p-1.5 bg-white rounded-lg hover:bg-indigo-50 shadow-sm" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(e)} className="p-1.5 bg-white rounded-lg hover:bg-red-50 shadow-sm text-red-500" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/60 border border-current/20`}>
                          <Icon className="w-2.5 h-2.5" />{meta.label}
                        </span>
                        <span className="text-[11px] opacity-80">
                          {new Date(e.start_date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          {e.end_date && e.end_date !== e.start_date && ` – ${new Date(e.end_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`}
                        </span>
                        {days >= 0 && days <= 30 && (
                          <span className="text-[10px] font-bold bg-white/70 rounded-full px-2 py-0.5">
                            {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d away`}
                          </span>
                        )}
                      </div>
                      {e.description && <p className="text-xs mt-1 opacity-80 line-clamp-2">{e.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ ADD / EDIT MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-800 text-lg">{editTarget ? 'Edit Event' : 'New School Event'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Event type selector — prominent pills */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Event Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_TYPES.map(t => {
                    const Icon = EVENT_META[t].icon;
                    return (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, event_type: t }))}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          form.event_type === t
                            ? `${EVENT_META[t].color} ring-2 ring-offset-1 ring-current/30 shadow-sm`
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {EVENT_META[t].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Title *</label>
                <input
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Mid-Term Exams Begin, School Closing Day..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Start Date *</label>
                  <input
                    type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">End Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    min={form.start_date}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Add extra details students and parents should know..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                />
              </div>

              {/* Preview */}
              {form.title && (
                <div className={`p-3 rounded-xl border ${EVENT_META[form.event_type].color}`}>
                  <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Preview</p>
                  <p className="font-bold text-sm">{form.title}</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    {form.start_date ? new Date(form.start_date).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    {form.end_date && form.end_date !== form.start_date ? ` – ${new Date(form.end_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
                {saving ? 'Saving...' : editTarget ? 'Update Event' : 'Add to Calendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRM ═══ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Delete Event?</h3>
            <p className="text-sm text-gray-500 mb-1">"{deleteTarget.title}"</p>
            <p className="text-xs text-gray-400 mb-6">This will be removed from all student & parent calendars.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={doDelete} disabled={deleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
