import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, TimetableRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type Day = typeof DAYS[number];

interface SlotWithTeacher extends TimetableRow {
  teachers?: { profiles?: { first_name: string; last_name: string } | null } | null;
}

const COLORS = [
  'bg-blue-50 border-blue-100 text-blue-800',
  'bg-purple-50 border-purple-100 text-purple-800',
  'bg-green-50 border-green-100 text-green-800',
  'bg-orange-50 border-orange-100 text-orange-800',
  'bg-pink-50 border-pink-100 text-pink-800',
  'bg-teal-50 border-teal-100 text-teal-800',
  'bg-yellow-50 border-yellow-100 text-yellow-800',
  'bg-red-50 border-red-100 text-red-800',
];
const subjectColor = (subject: string) => COLORS[Math.abs([...subject].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % COLORS.length];

export default function StudentTimetableSection({ profile }: Props) {
  const [slots, setSlots] = useState<SlotWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterYear, setFilterYear] = useState(getDefaultAcademicYear());
  const [classId, setClassId] = useState<string | null>(null);
  const [className, setClassName] = useState('');

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

  const grid: Record<Day, Record<number, SlotWithTeacher>> = {
    Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {},
  };
  slots.forEach(s => { grid[s.day_of_week as Day][s.period] = s; });
  const maxPeriod = Math.max(slots.length === 0 ? 8 : Math.max(...slots.map(s => s.period), 8));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  // Today's schedule
  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const todaySlots = DAYS.includes(todayName as Day) ? slots.filter(s => s.day_of_week === todayName).sort((a, b) => a.period - b.period) : [];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Clock className="w-6 h-6 text-pink-500" /> My Timetable
        {className && <span className="text-sm font-normal text-gray-500">— {className}</span>}
      </h2>

      <div className="flex flex-wrap gap-3">
        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
          {TERMS.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
          {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Today's classes */}
      {todaySlots.length > 0 && (
        <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl p-4 text-white">
          <p className="text-sm font-semibold opacity-80 mb-2">Today ({todayName})</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {todaySlots.map(s => (
              <div key={s.id} className="flex-shrink-0 bg-white/20 rounded-lg px-3 py-2 min-w-[110px]">
                <p className="font-bold text-sm">{s.subject}</p>
                <p className="text-xs opacity-80">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>
                {s.teachers?.profiles && <p className="text-xs opacity-70">{s.teachers.profiles.first_name}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!classId && !loading && (
        <div className="text-center py-12 text-gray-400">You are not assigned to a class yet.</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div>
      ) : slots.length === 0 && classId ? (
        <div className="text-center py-12 text-gray-400">No timetable available for this term.</div>
      ) : classId ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="py-3 px-3 text-left text-xs text-gray-500 uppercase w-12">#</th>
                  {DAYS.map(d => (
                    <th key={d} className={`py-3 px-2 text-center text-xs uppercase ${d === todayName ? 'text-pink-600 font-bold' : 'text-gray-500'}`}>
                      {d.slice(0, 3)}
                      {d === todayName && <span className="ml-1 text-pink-500">●</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(p => (
                  <tr key={p} className="border-b border-gray-50">
                    <td className="py-2 px-3 text-center text-xs font-medium text-gray-400">{p}</td>
                    {DAYS.map(day => {
                      const slot = grid[day][p];
                      return (
                        <td key={day} className="py-1.5 px-1.5 align-top">
                          {slot ? (
                            <div className={`rounded-lg border p-2 min-h-[52px] ${subjectColor(slot.subject)}`}>
                              <p className="font-semibold text-xs leading-tight">{slot.subject}</p>
                              {slot.teachers?.profiles && <p className="text-xs opacity-70 mt-0.5">{slot.teachers.profiles.first_name}</p>}
                              <p className="text-xs opacity-60">{slot.start_time.slice(0,5)}</p>
                            </div>
                          ) : (
                            <div className="min-h-[52px]" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
