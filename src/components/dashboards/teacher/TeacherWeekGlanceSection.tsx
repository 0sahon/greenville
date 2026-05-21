import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, TimetableRow } from '../../../lib/supabase';

interface Props {
  profile: ProfileRow;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

interface SlotWithClass extends TimetableRow {
  classes?: { name: string } | null;
}

interface PlanLite {
  id: string;
  title: string;
  lesson_date: string | null;
  course_id: string;
  status: string;
  courses?: { title: string; subject: string } | null;
}

function mondayOfDate(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toYmd(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

export default function TeacherWeekGlanceSection({ profile, onToast }: Props) {
  const [weekStart, setWeekStart] = useState(() => mondayOfDate(new Date()));
  const [term, setTerm] = useState('First Term');
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotWithClass[]>([]);
  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase
      .from('teachers')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          onToast(error.message, 'error');
          setTeacherId(null);
          return;
        }
        setTeacherId(data?.id ?? null);
      });
  }, [profile.id, onToast]);

  const load = useCallback(async () => {
    if (!teacherId) {
      setSlots([]);
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const end = addDays(weekStart, 6);
    const startY = toYmd(weekStart);
    const endY = toYmd(end);
    try {
      const [{ data: slotData, error: se }, { data: planData, error: pe }] = await Promise.all([
        supabase
          .from('timetable')
          .select('*, classes:class_id(name)')
          .eq('teacher_id', teacherId)
          .eq('term', term)
          .eq('academic_year', academicYear)
          .order('period'),
        supabase
          .from('lesson_plans')
          .select('id, title, lesson_date, course_id, status, courses:course_id(title, subject)')
          .eq('teacher_profile_id', profile.id)
          .gte('lesson_date', startY)
          .lte('lesson_date', endY)
          .order('lesson_date'),
      ]);
      if (se) throw se;
      if (pe) throw pe;
      setSlots((slotData || []) as SlotWithClass[]);
      setPlans((planData || []) as PlanLite[]);
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Failed to load week', 'error');
      setSlots([]);
      setPlans([]);
    }
    setLoading(false);
  }, [teacherId, profile.id, term, academicYear, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const weekEnd = addDays(weekStart, 6);
  const rangeLabel = `${weekStart.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const slotsByDay = (dayName: string) =>
    slots.filter(s => s.day_of_week === dayName).sort((a, b) => a.period - b.period);

  const plansForYmd = (ymd: string) =>
    plans.filter(p => p.lesson_date && p.lesson_date.slice(0, 10) === ymd);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" /> Week at a glance
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Your teaching timetable for the selected term (Mon–Fri) alongside lesson plans dated in this calendar week.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            onClick={() => setWeekStart(mondayOfDate(addDays(weekStart, -7)))}
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[10rem] text-center">{rangeLabel}</span>
          <button
            type="button"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            onClick={() => setWeekStart(mondayOfDate(addDays(weekStart, 7)))}
            title="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            onClick={() => setWeekStart(mondayOfDate(new Date()))}
          >
            This week
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={term}
          onChange={e => setTerm(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {TERMS.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {getAcademicYearOptions().map(y => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {!teacherId && !loading ? (
        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white text-sm">
          No teacher profile is linked to your account.
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i);
            const ymd = toYmd(d);
            const dow = DAY_NAMES[d.getDay()];
            const daySlots = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dow) ? slotsByDay(dow) : [];
            const dayPlans = plansForYmd(ymd);
            const isToday = toYmd(new Date()) === ymd;
            return (
              <div
                key={ymd}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isToday ? 'ring-2 ring-indigo-200 border-indigo-200' : 'border-gray-100'}`}
              >
                <div className={`px-3 py-2 flex justify-between items-center ${isToday ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'}`}>
                  <span className="text-xs font-bold uppercase">{dow}</span>
                  <span className="text-xs opacity-90">{d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="p-3 space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Timetable</p>
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-gray-400">No slots</p>
                    ) : (
                      <ul className="space-y-1">
                        {daySlots.map(s => (
                          <li key={s.id} className="text-xs bg-indigo-50 text-indigo-900 rounded-lg px-2 py-1.5 border border-indigo-100">
                            <span className="font-semibold">{s.subject}</span>
                            <span className="text-indigo-600"> · {s.classes?.name ?? 'Class'}</span>
                            <span className="block text-indigo-500 text-[10px]">
                              {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · P{s.period}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Lesson plans (dated)</p>
                    {dayPlans.length === 0 ? (
                      <p className="text-xs text-gray-400">None</p>
                    ) : (
                      <ul className="space-y-1">
                        {dayPlans.map(p => (
                          <li key={p.id} className="text-xs bg-emerald-50 text-emerald-900 rounded-lg px-2 py-1.5 border border-emerald-100">
                            <span className="font-medium">{p.title}</span>
                            <span className="block text-emerald-700 text-[10px]">
                              {p.courses?.subject} · {p.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
