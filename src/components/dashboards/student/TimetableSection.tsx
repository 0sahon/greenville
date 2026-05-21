import { useState, useEffect, useMemo } from 'react';
import { Clock, Coffee, Sun, Moon, CalendarDays, ChevronLeft, ChevronRight, AlertCircle, BookOpen, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, TimetableRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type Day = typeof DAYS[number];

interface SlotWithTeacher extends TimetableRow {
  teachers?: { profiles?: { first_name: string; last_name: string } | null } | null;
}

/* Fixed school day schedule with breaks */
interface SchedulePeriod {
  period: number | null;   // null = break
  label: string;
  start: string;
  end: string;
  isBreak: boolean;
  breakType?: 'assembly' | 'recess' | 'lunch' | 'closing';
}

/* Greenville Montessori standard school day template */
const SCHOOL_SCHEDULE: SchedulePeriod[] = [
  { period: null, label: '🌅 Morning Assembly & Circle Time', start: '07:45', end: '08:00', isBreak: true, breakType: 'assembly' },
  { period: 1,    label: 'Period 1', start: '08:00', end: '08:45', isBreak: false },
  { period: 2,    label: 'Period 2', start: '08:45', end: '09:30', isBreak: false },
  { period: null, label: '☕ Morning Recess', start: '09:30', end: '09:45', isBreak: true, breakType: 'recess' },
  { period: 3,    label: 'Period 3', start: '09:45', end: '10:30', isBreak: false },
  { period: 4,    label: 'Period 4', start: '10:30', end: '11:15', isBreak: false },
  { period: 5,    label: 'Period 5', start: '11:15', end: '12:00', isBreak: false },
  { period: null, label: '🍽️ Lunch Break', start: '12:00', end: '12:45', isBreak: true, breakType: 'lunch' },
  { period: 6,    label: 'Period 6', start: '12:45', end: '13:30', isBreak: false },
  { period: 7,    label: 'Period 7', start: '13:30', end: '14:15', isBreak: false },
  { period: 8,    label: 'Period 8', start: '14:15', end: '15:00', isBreak: false },
  { period: null, label: '🔔 School Closing', start: '15:00', end: '15:00', isBreak: true, breakType: 'closing' },
];

const BREAK_STYLES: Record<string, string> = {
  assembly: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-700',
  recess:   'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200 text-teal-700',
  lunch:    'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-700',
  closing:  'bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-300 text-indigo-700',
};

const BREAK_ICONS: Record<string, React.ElementType> = {
  assembly: Sun,
  recess:   Coffee,
  lunch:    Moon,
  closing:  Clock,
};

/* Deterministic subject colours for variety */
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

/* Week helpers */
function mondayOf(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toYmd(d: Date): string { return d.toLocaleDateString('en-CA'); }

export default function StudentTimetableSection({ profile }: Props) {
  const [slots, setSlots] = useState<SlotWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterYear, setFilterYear] = useState(getDefaultAcademicYear());
  const [classId, setClassId] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'full'>('today');
  const [weekOffset, setWeekOffset] = useState(0);  // 0 = this week, 1 = next week

  useEffect(() => {
    supabase.from('students').select('class_id, classes:class_id(name)').eq('profile_id', profile.id).maybeSingle().then(({ data }) => {
      if (data?.class_id) {
        setClassId(data.class_id);
        setClassName((data as unknown as { classes?: { name: string } }).classes?.name ?? '');
      } else setLoading(false);
    });
  }, []);

  useEffect(() => { if (classId) fetchSlots(); }, [classId, filterTerm, filterYear]);

  const fetchSlots = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('timetable')
        .select('*, teachers:teacher_id(profiles:profile_id(first_name, last_name))')
        .eq('class_id', classId)
        .eq('term', filterTerm)
        .eq('academic_year', filterYear)
        .order('period');
      setSlots((data || []) as SlotWithTeacher[]);
    } finally {
      setLoading(false);
    }
  };

  /* Grid by day + period */
  const grid = useMemo(() => {
    const g: Record<Day, Record<number, SlotWithTeacher>> = {
      Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {},
    };
    slots.forEach(s => { g[s.day_of_week as Day][s.period] = s; });
    return g;
  }, [slots]);

  const todayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()] as Day | 'Sunday' | 'Saturday';
  const isTodaySchoolDay = DAYS.includes(todayName as Day);
  const todaySlots = isTodaySchoolDay ? slots.filter(s => s.day_of_week === todayName).sort((a, b) => a.period - b.period) : [];

  /* Current period detection */
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const getCurrentPeriod = (): number | null => {
    if (!isTodaySchoolDay) return null;
    const match = SCHOOL_SCHEDULE.find(sp => {
      if (sp.isBreak || sp.period === null) return false;
      const [sh, sm] = sp.start.split(':').map(Number);
      const [eh, em] = sp.end.split(':').map(Number);
      const startM = sh * 60 + sm;
      const endM = eh * 60 + em;
      return nowMins >= startM && nowMins < endM;
    });
    return match?.period ?? null;
  };
  const currentPeriod = getCurrentPeriod();

  /* Week view */
  const weekStart = mondayOf(addDays(new Date(), weekOffset * 7));
  const weekLabel = weekOffset === 0
    ? 'This Week'
    : weekOffset === 1
    ? 'Next Week'
    : `Week of ${weekStart.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`;

  if (!classId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500 font-medium">You are not assigned to a class yet.</p>
        <p className="text-sm text-gray-400">Please contact your school administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" /> Class Timetable
            {className && <span className="text-sm font-normal text-gray-500">— {className}</span>}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Daily schedule · Breaks · Closing time · Teacher assignments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── School Day Info Banner ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Sun,    label: 'Assembly', time: '7:45 AM',  color: 'text-amber-600' },
          { icon: Coffee, label: 'Recess',   time: '9:30 AM',  color: 'text-teal-600' },
          { icon: Moon,   label: 'Lunch',    time: '12:00 PM', color: 'text-orange-600' },
          { icon: Clock,  label: 'Closing',  time: '3:00 PM',  color: 'text-indigo-600' },
        ].map(({ icon: Icon, label, time, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
            <div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-sm font-bold text-gray-800">{time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: 'today', label: "Today's Classes", icon: Clock },
          { id: 'week',  label: 'Week View',       icon: CalendarDays },
          { id: 'full',  label: 'Full Timetable',  icon: BookOpen },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : slots.length === 0 && classId ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm font-medium">No timetable set for this term</p>
          <p className="text-xs text-gray-400 mt-1">Ask your teacher or admin to set it up.</p>
        </div>
      ) : (
        <>
          {/* ────────────── TODAY'S CLASSES ────────────── */}
          {activeTab === 'today' && (
            <div className="space-y-3">
              {/* Today banner */}
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold opacity-80">{isTodaySchoolDay ? todayName : 'Weekend'}</p>
                    <p className="text-2xl font-bold">
                      {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  {currentPeriod && (
                    <div className="text-right">
                      <p className="text-xs opacity-70 font-medium uppercase tracking-wide">Now in</p>
                      <p className="text-xl font-bold">Period {currentPeriod}</p>
                      {grid[todayName as Day]?.[currentPeriod] && (
                        <p className="text-sm opacity-80">{grid[todayName as Day][currentPeriod].subject}</p>
                      )}
                    </div>
                  )}
                </div>
                {!isTodaySchoolDay && (
                  <p className="text-white/80 text-sm text-center py-2">🎉 No school today — enjoy your weekend!</p>
                )}
                {isTodaySchoolDay && todaySlots.length === 0 && (
                  <p className="text-white/80 text-sm">No classes scheduled for today.</p>
                )}
              </div>

              {/* Full day schedule with breaks */}
              {isTodaySchoolDay && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-50">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-indigo-600" /> Full Day Schedule
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {SCHOOL_SCHEDULE.map((sp, idx) => {
                      if (sp.isBreak) {
                        const style = BREAK_STYLES[sp.breakType!];
                        const BreakIcon = BREAK_ICONS[sp.breakType!];
                        return (
                          <div key={idx} className={`flex items-center gap-3 px-5 py-3 border-l-4 ${style}`}>
                            <BreakIcon className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-bold">{sp.label}</p>
                              {sp.breakType !== 'closing' && (
                                <p className="text-[11px] opacity-70">{sp.start} – {sp.end}</p>
                              )}
                            </div>
                            {sp.breakType === 'closing' && (
                              <span className="text-xs font-bold">🔔 3:00 PM</span>
                            )}
                          </div>
                        );
                      }
                      const slot = sp.period != null ? grid[todayName as Day]?.[sp.period] : undefined;
                      const isCurrentPeriod = sp.period === currentPeriod;
                      return (
                        <div key={idx} className={`flex items-center gap-3 px-5 py-3 transition-colors ${isCurrentPeriod ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-gray-50'}`}>
                          <div className="w-14 flex-shrink-0 text-center">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">P{sp.period}</p>
                            <p className="text-[11px] text-gray-500 font-medium">{sp.start}</p>
                          </div>
                          {slot ? (
                            <div className={`flex-1 rounded-xl border px-3 py-2 ${subjectColor(slot.subject)}`}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-sm">{slot.subject}</p>
                                {isCurrentPeriod && (
                                  <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">LIVE</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <p className="text-xs opacity-70">{slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}</p>
                                {slot.teachers?.profiles && (
                                  <p className="text-xs opacity-70 flex items-center gap-1">
                                    <Users className="w-2.5 h-2.5" />
                                    {slot.teachers.profiles.first_name} {slot.teachers.profiles.last_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 rounded-xl border border-dashed border-gray-200 px-3 py-2">
                              <p className="text-xs text-gray-400">Free period</p>
                              <p className="text-[11px] text-gray-400">{sp.start} – {sp.end}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────── WEEK VIEW ────────────── */}
          {activeTab === 'week' && (
            <div className="space-y-4">
              {/* Week navigation */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setWeekOffset(w => w - 1)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-gray-800 text-sm min-w-[140px] text-center">{weekLabel}</span>
                <button
                  onClick={() => setWeekOffset(w => w + 1)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  >
                    Back to this week
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {DAYS.map((day, di) => {
                  const dayDate = addDays(weekStart, di);
                  const dateYmd = toYmd(dayDate);
                  const todayYmd = toYmd(new Date());
                  const isToday = dateYmd === todayYmd;
                  const daySlots = (slots.filter(s => s.day_of_week === day) as SlotWithTeacher[]).sort((a, b) => a.period - b.period);

                  return (
                    <div key={day} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isToday ? 'ring-2 ring-indigo-400 border-indigo-200' : 'border-gray-100'}`}>
                      <div className={`px-3 py-2.5 ${isToday ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'}`}>
                        <p className="text-xs font-bold uppercase">{day.slice(0, 3)}</p>
                        <p className={`text-[11px] ${isToday ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {dayDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="p-2.5 space-y-1.5 min-h-[120px]">
                        {daySlots.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">No lessons</p>
                        ) : daySlots.map(s => (
                          <div key={s.id} className={`rounded-lg border px-2 py-1.5 ${subjectColor(s.subject)}`}>
                            <p className="font-bold text-xs leading-tight">{s.subject}</p>
                            <p className="text-[10px] opacity-70">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>
                            {s.teachers?.profiles && (
                              <p className="text-[10px] opacity-60">{s.teachers.profiles.first_name}</p>
                            )}
                          </div>
                        ))}
                        {/* Break indicators */}
                        {daySlots.length > 0 && (
                          <div className="text-[9px] text-gray-400 text-center pt-1">
                            🍽️ Lunch 12–12:45 · 🔔 Close 3pm
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly summary */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-800">{weekLabel}:</span>
                </div>
                <span className="text-sm text-indigo-700">
                  <strong>{[...new Set(slots.map(s => s.subject))].length}</strong> subjects ·{' '}
                  <strong>{slots.length}</strong> lessons ·{' '}
                  <strong>3 breaks</strong> per day · Close <strong>3:00 PM</strong>
                </span>
              </div>
            </div>
          )}

          {/* ────────────── FULL WEEKLY GRID ────────────── */}
          {activeTab === 'full' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-gray-800 text-sm">Full Weekly Schedule — {filterTerm} · {filterYear}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-indigo-50">
                      <th className="py-3 px-4 text-left text-xs text-indigo-600 uppercase font-bold w-32">Time / Period</th>
                      {DAYS.map(d => (
                        <th key={d} className={`py-3 px-2 text-center text-xs uppercase font-bold ${d === todayName ? 'text-indigo-700' : 'text-gray-500'}`}>
                          {d.slice(0, 3)}{d === todayName && <span className="ml-1 text-indigo-500">●</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SCHOOL_SCHEDULE.map((sp, idx) => {
                      if (sp.isBreak) {
                        const style = BREAK_STYLES[sp.breakType!];
                        const BreakIcon = BREAK_ICONS[sp.breakType!];
                        return (
                          <tr key={idx} className={`border-b border-gray-50`}>
                            <td colSpan={6} className={`py-2 px-4 border-l-4 ${style}`}>
                              <div className="flex items-center gap-2">
                                <BreakIcon className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">{sp.label}</span>
                                {sp.breakType !== 'closing' && (
                                  <span className="text-[10px] opacity-70 ml-1">{sp.start} – {sp.end}</span>
                                )}
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
                            const slot = sp.period != null ? grid[day]?.[sp.period] : undefined;
                            const isNow = day === todayName && sp.period === currentPeriod;
                            return (
                              <td key={day} className="py-1.5 px-1.5 align-top">
                                {slot ? (
                                  <div className={`rounded-lg border p-2 min-h-[52px] transition-all ${isNow ? 'ring-2 ring-indigo-400 ' : ''}${subjectColor(slot.subject)}`}>
                                    <p className="font-bold text-xs leading-tight">{slot.subject}</p>
                                    {slot.teachers?.profiles && (
                                      <p className="text-[10px] opacity-60 mt-0.5 truncate">{slot.teachers.profiles.first_name} {slot.teachers.profiles.last_name}</p>
                                    )}
                                    {isNow && <p className="text-[9px] text-indigo-600 font-bold mt-0.5 animate-pulse">● NOW</p>}
                                  </div>
                                ) : (
                                  <div className="min-h-[52px] rounded-lg border border-dashed border-gray-100" />
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
    </div>
  );
}
