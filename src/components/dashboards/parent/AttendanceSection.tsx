import { useState, useEffect } from 'react';
import { ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, AttendanceRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; }

interface Child {
  id: string;
  student_id: string;
  profiles?: { first_name: string; last_name: string } | null;
  classes?: { name: string } | null;
}

const STATUS_STYLE: Record<string, string> = {
  present:  'bg-green-100 text-green-700',
  absent:   'bg-red-100 text-red-700',
  late:     'bg-yellow-100 text-yellow-700',
  excused:  'bg-blue-100 text-blue-700',
};

export default function ParentAttendanceSection({ profile }: Props) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.from('parents').select('id').eq('profile_id', profile.id).maybeSingle().then(({ data: parent }) => {
      if (!parent) { setLoading(false); return; }
      supabase.from('student_parents')
        .select('students:student_id(id, student_id, profiles:profile_id(first_name, last_name), classes:class_id(name))')
        .eq('parent_id', parent.id)
        .then(({ data }) => {
          const kids = (data || []).map((r: unknown) => (r as { students: Child }).students).filter(Boolean);
          setChildren(kids);
          if (kids.length > 0) { setSelectedChild(kids[0].id); fetchRecords(kids[0].id, filterMonth); }
          else setLoading(false);
        });
    });
  }, []);

  const fetchRecords = async (childId: string, month: string) => {
    setLoading(true);
    try {
      const start = `${month}-01`;
      const end = new Date(new Date(start).setMonth(new Date(start).getMonth() + 1)).toISOString().split('T')[0];
      const { data } = await supabase.from('attendance').select('*').eq('student_id', childId).gte('date', start).lt('date', end).order('date', { ascending: false });
      setRecords((data || []) as AttendanceRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedChild) fetchRecords(selectedChild, filterMonth); }, [selectedChild, filterMonth]);

  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  // Group by week
  const byWeek: Record<string, AttendanceRow[]> = {};
  records.forEach(r => {
    const d = new Date(r.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1);
    const key = weekStart.toISOString().split('T')[0];
    (byWeek[key] = byWeek[key] || []).push(r);
  });

  const childName = (c: Child) => `${c.profiles?.first_name ?? ''} ${c.profiles?.last_name ?? ''}`.trim();

  // Month picker: last 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <ClipboardCheck className="w-6 h-6 text-purple-500" /> Attendance
      </h2>

      {/* Child tabs */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => (
            <button key={c.id} onClick={() => setSelectedChild(c.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${selectedChild === c.id ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              {childName(c)}
            </button>
          ))}
        </div>
      )}

      {children.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">No children linked to your account.</div>
      )}

      {children.length > 0 && (
        <>
          {/* Month filter */}
          <div className="flex gap-3">
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              {months.map(m => (
                <option key={m} value={m}>{new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</option>
              ))}
            </select>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Attendance Rate', value: `${rate}%`, color: rate >= 80 ? 'bg-green-50 border-green-100 text-green-700' : rate >= 60 ? 'bg-yellow-50 border-yellow-100 text-yellow-700' : 'bg-red-50 border-red-100 text-red-700' },
              { label: 'Days Present', value: present, color: 'bg-white border-gray-100 text-gray-800' },
              { label: 'Days Absent', value: absent, color: 'bg-white border-gray-100 text-gray-800' },
              { label: 'Late / Excused', value: late + records.filter(r => r.status === 'excused').length, color: 'bg-white border-gray-100 text-gray-800' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border shadow-sm p-4 text-center ${s.color}`}>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Attendance rate bar */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Attendance Rate</span>
              <span className={`font-semibold ${rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{rate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${rate}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{present} of {total} school days attended</p>
          </div>

          {/* Day-by-day grouped by week */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" /></div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No attendance records for this month.</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byWeek).sort(([a], [b]) => b.localeCompare(a)).map(([weekStart, weekRecs]) => {
                const wEnd = new Date(weekStart);
                wEnd.setDate(wEnd.getDate() + 4);
                const label = `Week of ${new Date(weekStart).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
                const open = expanded[weekStart] ?? true;
                return (
                  <div key={weekStart} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <button onClick={() => setExpanded(e => ({ ...e, [weekStart]: !e[weekStart] }))}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <span className="text-sm font-semibold text-gray-700">{label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{weekRecs.filter(r => r.status === 'present').length}/{weekRecs.length} present</span>
                        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {open && (
                      <table className="w-full text-sm border-t border-gray-100">
                        <tbody>
                          {weekRecs.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
                            <tr key={r.id} className="border-b border-gray-50 last:border-0">
                              <td className="py-2.5 px-4 font-medium text-gray-700">
                                {new Date(r.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-gray-400 text-xs">{r.notes ?? ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
