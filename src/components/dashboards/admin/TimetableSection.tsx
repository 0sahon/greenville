import { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, X, Trash2, Edit2, AlertCircle, Coffee, Sun, Moon, BookOpen, Users, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, ClassRow, TimetableRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type Day = typeof DAYS[number];

interface SlotWithTeacher extends TimetableRow {
  teachers?: { profiles?: { first_name: string; last_name: string } | null } | null;
}
interface TeacherOption { id: string; profiles?: { first_name: string; last_name: string } | null; }

/* ── Greenville Montessori standard day schedule ── */
const SCHOOL_SCHEDULE_TEMPLATE = [
  { period: null, label: 'Morning Assembly & Circle Time', start: '07:45', end: '08:00', breakType: 'assembly' },
  { period: 1,    label: 'Period 1', start: '08:00', end: '08:45' },
  { period: 2,    label: 'Period 2', start: '08:45', end: '09:30' },
  { period: null, label: 'Morning Recess ☕', start: '09:30', end: '09:45', breakType: 'recess' },
  { period: 3,    label: 'Period 3', start: '09:45', end: '10:30' },
  { period: 4,    label: 'Period 4', start: '10:30', end: '11:15' },
  { period: 5,    label: 'Period 5', start: '11:15', end: '12:00' },
  { period: null, label: 'Lunch Break 🍽️', start: '12:00', end: '12:45', breakType: 'lunch' },
  { period: 6,    label: 'Period 6', start: '12:45', end: '13:30' },
  { period: 7,    label: 'Period 7', start: '13:30', end: '14:15' },
  { period: 8,    label: 'Period 8', start: '14:15', end: '15:00' },
  { period: null, label: 'School Closing 🔔', start: '15:00', end: '15:00', breakType: 'closing' },
] as const;

/* Map period → default start/end */
const PERIOD_TIMES: Record<number, { start: string; end: string }> = {};
SCHOOL_SCHEDULE_TEMPLATE.forEach(s => {
  if (s.period != null) PERIOD_TIMES[s.period] = { start: s.start, end: s.end };
});

const BREAK_STYLES: Record<string, string> = {
  assembly: 'bg-amber-50 border-l-4 border-amber-400 text-amber-700',
  recess:   'bg-teal-50 border-l-4 border-teal-400 text-teal-700',
  lunch:    'bg-orange-50 border-l-4 border-orange-400 text-orange-700',
  closing:  'bg-indigo-50 border-l-4 border-indigo-400 text-indigo-700',
};
const BREAK_ICONS: Record<string, React.ElementType> = {
  assembly: Sun, recess: Coffee, lunch: Moon, closing: Clock,
};

const SUBJECT_COLORS = [
  'bg-indigo-50 border-indigo-200 text-indigo-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-teal-50 border-teal-200 text-teal-800',
  'bg-rose-50 border-rose-200 text-rose-800',
  'bg-violet-50 border-violet-200 text-violet-800',
  'bg-cyan-50 border-cyan-200 text-cyan-800',
  'bg-orange-50 border-orange-200 text-orange-800',
];
const subjectColor = (s: string) =>
  SUBJECT_COLORS[Math.abs([...s].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % SUBJECT_COLORS.length];

function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: ()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-[100] max-w-[90vw] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const EMPTY_FORM = { day_of_week: 'Monday' as Day, period: '1', subject: '', teacher_id: '', start_time: '08:00', end_time: '08:45' };

export default function AdminTimetableSection({ profile: _profile }: Props) {
  const [classes, setClasses]   = useState<Pick<ClassRow,'id'|'name'>[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [slots, setSlots]       = useState<SlotWithTeacher[]>([]);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: 'success'|'error' }|null>(null);
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm]   = useState('First Term');
  const [filterYear, setFilterYear]   = useState(getDefaultAcademicYear());
  const [activeDay, setActiveDay]     = useState<Day>('Monday');
  const [viewMode, setViewMode]       = useState<'schedule'|'grid'>('schedule');
  const [showModal, setShowModal]     = useState(false);
  const [editSlot, setEditSlot]       = useState<SlotWithTeacher|null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string|null>(null);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
      const cls = (data || []) as Pick<ClassRow,'id'|'name'>[];
      setClasses(cls);
      if (cls.length > 0) setFilterClass(cls[0].id);
    });
    supabase.from('teachers').select('id, profiles:profile_id(first_name, last_name)').eq('is_active', true).then(({ data }) => setTeachers((data || []) as unknown as TeacherOption[]));
  }, []);

  useEffect(() => { if (filterClass) fetchSlots(); }, [filterClass, filterTerm, filterYear]);

  const fetchSlots = async () => {
    if (!filterClass) return;
    setLoading(true);
    const { data } = await supabase
      .from('timetable')
      .select('*, teachers:teacher_id(profiles:profile_id(first_name, last_name))')
      .eq('class_id', filterClass)
      .eq('term', filterTerm)
      .eq('academic_year', filterYear)
      .order('period');
    setSlots((data || []) as SlotWithTeacher[]);
    setLoading(false);
  };

  /* Grid */
  const grid = useMemo(() => {
    const g: Record<Day, Record<number, SlotWithTeacher>> = { Monday:{}, Tuesday:{}, Wednesday:{}, Thursday:{}, Friday:{} };
    slots.forEach(s => { g[s.day_of_week as Day][s.period] = s; });
    return g;
  }, [slots]);

  const openCreate = (day?: Day, period?: number) => {
    setEditSlot(null);
    const p = period ?? 1;
    const times = PERIOD_TIMES[p] ?? { start: '08:00', end: '08:45' };
    setForm({ day_of_week: day ?? activeDay, period: String(p), subject: '', teacher_id: '', start_time: times.start, end_time: times.end });
    setShowModal(true);
  };
  const openEdit = (slot: SlotWithTeacher) => {
    setEditSlot(slot);
    setForm({ day_of_week: slot.day_of_week as Day, period: String(slot.period), subject: slot.subject, teacher_id: slot.teacher_id ?? '', start_time: slot.start_time, end_time: slot.end_time });
    setShowModal(true);
  };

  /* Auto-fill times when period changes */
  const handlePeriodChange = (val: string) => {
    const p = parseInt(val);
    const times = PERIOD_TIMES[p];
    setForm(f => ({ ...f, period: val, ...(times ? { start_time: times.start, end_time: times.end } : {}) }));
  };

  const save = async () => {
    if (!form.subject.trim()) return setToast({ msg: 'Subject name is required', type: 'error' });
    if (!filterClass) return;
    setSaving(true);
    const payload = { class_id: filterClass, day_of_week: form.day_of_week, period: parseInt(form.period)||1, subject: form.subject.trim(), teacher_id: form.teacher_id || null, start_time: form.start_time, end_time: form.end_time, term: filterTerm, academic_year: filterYear };
    try {
      if (editSlot) {
        const { error } = await supabase.from('timetable').update({ subject: payload.subject, teacher_id: payload.teacher_id, start_time: payload.start_time, end_time: payload.end_time }).eq('id', editSlot.id);
        if (error) throw error;
        setToast({ msg: 'Slot updated ✓', type: 'success' });
      } else {
        const { error } = await supabase.from('timetable').insert(payload);
        if (error) throw error;
        setToast({ msg: 'Slot added ✓', type: 'success' });
      }
      setShowModal(false); fetchSlots();
    } catch (e: unknown) { setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' }); }
    setSaving(false);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('timetable').delete().eq('id', deleteTarget);
    setToast({ msg: 'Slot removed', type: 'success' });
    setDeleteTarget(null); fetchSlots();
    setDeleting(false);
  };

  const className = classes.find(c => c.id === filterClass)?.name ?? '';
  const filledSlots = slots.length;
  const totalPossible = 8 * 5;

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" /> Class Timetable Manager
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Set subjects, teachers and periods for each class</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200"
        >
          <Plus className="w-4 h-4" /> Add Slot
        </button>
      </div>

      {/* ── School Day Info Banner ── */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 rounded-2xl p-4 text-white">
        <p className="text-xs font-bold uppercase opacity-70 mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Greenville Montessori Standard School Day
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Assembly', time: '7:45 AM' },
            { label: 'Recess',   time: '9:30 AM' },
            { label: 'Lunch',    time: '12:00 PM' },
            { label: 'Closing',  time: '3:00 PM' },
          ].map(({ label, time }) => (
            <div key={label} className="bg-white/15 rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] opacity-70 uppercase font-semibold">{label}</p>
              <p className="font-bold text-sm">{time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="appearance-none border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800">
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
            className="appearance-none border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="appearance-none border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
          {([['schedule','Day View'],['grid','Full Grid']] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-lg font-semibold">{className}</span>
        <span className="bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg">{filledSlots}/{totalPossible} slots filled</span>
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg">{[...new Set(slots.map(s => s.subject))].length} subjects</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* ══════════ SCHEDULE VIEW (Day-by-day with breaks) ══════════ */}
          {viewMode === 'schedule' && (
            <div className="space-y-3">
              {/* Day tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {DAYS.map(day => {
                  const count = slots.filter(s => s.day_of_week === day).length;
                  return (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeDay === day ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}
                    >
                      {day.slice(0,3)}
                      {count > 0 && <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeDay === day ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Schedule rows with breaks */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" /> {activeDay} — {className}
                  </h3>
                  <button onClick={() => openCreate(activeDay)} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                    <Plus className="w-3.5 h-3.5" /> Add to {activeDay.slice(0,3)}
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {SCHOOL_SCHEDULE_TEMPLATE.map((sp, idx) => {
                    if (sp.period === null) {
                      const style = BREAK_STYLES[(sp as { breakType?: string }).breakType ?? 'assembly'];
                      const BreakIcon = BREAK_ICONS[(sp as { breakType?: string }).breakType ?? 'assembly'];
                      return (
                        <div key={idx} className={`flex items-center gap-3 px-5 py-2.5 ${style}`}>
                          <BreakIcon className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-bold">{sp.label}</p>
                            {sp.breakType !== 'closing' && <p className="text-[10px] opacity-70">{sp.start} – {sp.end}</p>}
                          </div>
                          {sp.breakType === 'closing' && <span className="text-xs font-bold">🔔 3:00 PM</span>}
                        </div>
                      );
                    }
                    const slot = grid[activeDay]?.[sp.period];
                    return (
                      <div key={idx} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                        <div className="w-14 flex-shrink-0 text-center">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">P{sp.period}</p>
                          <p className="text-[11px] text-gray-400">{sp.start}</p>
                        </div>
                        {slot ? (
                          <div className={`flex-1 rounded-xl border px-3 py-2.5 ${subjectColor(slot.subject)}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-bold text-sm leading-tight">{slot.subject}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[11px] opacity-70">{slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}</p>
                                  {slot.teachers?.profiles && (
                                    <p className="text-[11px] opacity-60 flex items-center gap-1">
                                      <Users className="w-2.5 h-2.5" />
                                      {slot.teachers.profiles.first_name} {slot.teachers.profiles.last_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => openEdit(slot)} className="p-1.5 hover:bg-white rounded-lg transition-colors" title="Edit">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeleteTarget(slot.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openCreate(activeDay, sp.period)}
                            className="flex-1 rounded-xl border-2 border-dashed border-gray-200 px-3 py-2.5 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all text-sm flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="font-medium">Add subject for {sp.start}–{sp.end}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ FULL GRID VIEW ══════════ */}
          {viewMode === 'grid' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <p className="font-bold text-gray-800 text-sm">{className} — {filterTerm} {filterYear}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-indigo-50">
                      <th className="py-3 px-4 text-left text-xs text-indigo-600 font-bold uppercase w-32">Time / Period</th>
                      {DAYS.map(d => (
                        <th key={d} className="py-3 px-2 text-center text-xs text-gray-500 font-bold uppercase">{d.slice(0,3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SCHOOL_SCHEDULE_TEMPLATE.map((sp, idx) => {
                      if (sp.period === null) {
                        const style = BREAK_STYLES[(sp as { breakType?: string }).breakType ?? 'assembly'];
                        const BreakIcon = BREAK_ICONS[(sp as { breakType?: string }).breakType ?? 'assembly'];
                        return (
                          <tr key={idx} className="border-b border-gray-50">
                            <td colSpan={6} className={`py-2 px-4 ${style}`}>
                              <div className="flex items-center gap-2">
                                <BreakIcon className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">{sp.label}</span>
                                {sp.breakType !== 'closing' && <span className="text-[10px] opacity-70 ml-1">{sp.start}–{sp.end}</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-2 px-4">
                            <p className="text-xs font-bold text-gray-500">P{sp.period}</p>
                            <p className="text-[10px] text-gray-400">{sp.start}–{sp.end}</p>
                          </td>
                          {DAYS.map(day => {
                            const slot = grid[day]?.[sp.period!];
                            return (
                              <td key={day} className="py-1.5 px-1.5 align-top">
                                {slot ? (
                                  <div className={`relative group rounded-xl border p-2 min-h-[56px] ${subjectColor(slot.subject)}`}>
                                    <p className="font-bold text-xs leading-tight pr-8">{slot.subject}</p>
                                    {slot.teachers?.profiles && <p className="text-[10px] opacity-60 truncate">{slot.teachers.profiles.first_name}</p>}
                                    <p className="text-[10px] opacity-50">{slot.start_time.slice(0,5)}</p>
                                    <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5 bg-white rounded-lg shadow p-0.5">
                                      <button onClick={() => openEdit(slot)} className="p-0.5 hover:bg-gray-100 rounded"><Edit2 className="w-3 h-3 text-indigo-600" /></button>
                                      <button onClick={() => setDeleteTarget(slot.id)} className="p-0.5 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openCreate(day, sp.period!)}
                                    className="w-full min-h-[56px] rounded-xl border-2 border-dashed border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 text-xl transition-colors"
                                  >+</button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ ADD / EDIT MODAL (Bottom Sheet on mobile) ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-800 text-lg">{editSlot ? 'Edit Timetable Slot' : 'Add Timetable Slot'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Day + Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Day</label>
                  <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value as Day }))}
                    disabled={!!editSlot}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-50">
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Period</label>
                  <select value={form.period} onChange={e => handlePeriodChange(e.target.value)}
                    disabled={!!editSlot}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-50">
                    {[1,2,3,4,5,6,7,8].map(p => (
                      <option key={p} value={String(p)}>
                        Period {p} ({PERIOD_TIMES[p]?.start ?? '—'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Subject *</label>
                <input
                  value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Mathematics, English Language, Science..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Teacher */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Assign Teacher <span className="text-gray-400 font-normal">(optional)</span></label>
                <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">— None / TBD —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.profiles?.first_name} {t.profiles?.last_name}</option>
                  ))}
                </select>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">End Time</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Preview chip */}
              {form.subject && (
                <div className={`px-4 py-3 rounded-xl border ${subjectColor(form.subject)}`}>
                  <p className="text-[10px] font-bold uppercase opacity-60 mb-0.5">Preview</p>
                  <p className="font-bold text-sm">{form.subject}</p>
                  <p className="text-xs opacity-70">{form.day_of_week} · P{form.period} · {form.start_time}–{form.end_time}</p>
                  {form.teacher_id && (
                    <p className="text-xs opacity-60 mt-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {teachers.find(t => t.id === form.teacher_id)?.profiles?.first_name}{' '}
                      {teachers.find(t => t.id === form.teacher_id)?.profiles?.last_name}
                    </p>
                  )}
                </div>
              )}

              {/* Break reminder */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <strong>Breaks are fixed:</strong> Recess 9:30–9:45 AM · Lunch 12:00–12:45 PM · Closing 3:00 PM.<br />
                  These are shown automatically to all students.
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
                {saving ? 'Saving...' : editSlot ? 'Update Slot' : 'Add to Timetable'}
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
            <h3 className="font-bold text-gray-800 text-lg mb-1">Remove Timetable Slot?</h3>
            <p className="text-xs text-gray-400 mb-6">This will clear this period from the class timetable.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={doDelete} disabled={deleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
