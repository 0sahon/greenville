import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, TimetableRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type Day = typeof DAYS[number];

interface SlotWithClass extends TimetableRow {
  classes?: { name: string } | null;
}

export default function TeacherTimetableSection({ profile }: Props) {
  const [slots, setSlots] = useState<SlotWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterYear, setFilterYear] = useState(getDefaultAcademicYear());
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('teachers').select('id').eq('profile_id', profile.id).maybeSingle().then(({ data }) => {
      if (data) { setTeacherId(data.id); fetchSlots(data.id); }
      else setLoading(false);
    });
  }, []);

  useEffect(() => { if (teacherId) fetchSlots(teacherId); }, [filterTerm, filterYear]);

  const fetchSlots = async (tid: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('timetable')
        .select('*, classes:class_id(name)')
        .eq('teacher_id', tid)
        .eq('term', filterTerm)
        .eq('academic_year', filterYear)
        .order('period');
      setSlots((data || []) as SlotWithClass[]);
    } finally {
      setLoading(false);
    }
  };

  // Group by day
  const byDay: Record<Day, SlotWithClass[]> = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
  slots.forEach(s => { if (byDay[s.day_of_week as Day]) byDay[s.day_of_week as Day].push(s); });

  const todayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
  const todaySlots = DAYS.includes(todayName as Day) ? byDay[todayName as Day].sort((a, b) => a.period - b.period) : [];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Clock className="w-6 h-6 text-blue-500" /> My Teaching Schedule
      </h2>

      <div className="flex flex-wrap gap-3">
        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {TERMS.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {todaySlots.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
          <p className="text-sm font-semibold opacity-80 mb-2">Today ({todayName})</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {todaySlots.map(s => (
              <div key={s.id} className="flex-shrink-0 bg-white/20 rounded-lg px-3 py-2 min-w-[120px]">
                <p className="font-bold text-sm">{s.subject}</p>
                <p className="text-xs opacity-80">{s.classes?.name}</p>
                <p className="text-xs opacity-70">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : slots.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No teaching schedule found for this term.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {DAYS.map(day => {
            const daySlots = byDay[day].sort((a, b) => a.period - b.period);
            if (daySlots.length === 0) return null;
            return (
              <div key={day} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${day === todayName ? 'border-blue-200 ring-2 ring-blue-100' : 'border-gray-100'}`}>
                <div className={`px-3 py-2 text-xs font-bold uppercase ${day === todayName ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500'}`}>{day}</div>
                <div className="p-2 space-y-1.5">
                  {daySlots.map(s => (
                    <div key={s.id} className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                      <p className="font-semibold text-blue-800 text-xs">{s.subject}</p>
                      <p className="text-blue-600 text-xs">{s.classes?.name}</p>
                      <p className="text-blue-400 text-xs">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
