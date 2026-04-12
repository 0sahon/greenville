import { useState, useEffect } from 'react';
import { ClipboardCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, ClassRow, AttendanceStatus } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface StudentForAtt {
  id: string;
  student_id: string;
  profiles?: { first_name: string; last_name: string } | null;
}

export default function AttendanceSection({ profile }: Props) {
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentForAtt[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    supabase.from('classes').select('id, name').order('name').then(({ data }) => setClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]));
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setStatuses({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setStatuses({});
    (async () => {
      const { data: studs } = await supabase.from('students').select('id, student_id, profiles:profile_id(first_name, last_name)').eq('class_id', selectedClass).eq('is_active', true);
      const list = (studs || []) as StudentForAtt[];
      setStudents(list);
      if (list.length > 0) {
        const { data: att } = await supabase.from('attendance').select('student_id, status').eq('date', date).in('student_id', list.map(s => s.id));
        const map: Record<string, AttendanceStatus> = {};
        (att || []).forEach((a: { student_id: string; status: AttendanceStatus }) => { map[a.student_id] = a.status; });
        list.forEach(s => { if (!map[s.id]) map[s.id] = 'present'; });
        setStatuses(map);
      }
      setLoading(false);
      setSaved(false);
    })();
  }, [selectedClass, date]);

  const save = async () => {
    setSaving(true);
    setSaveError('');
    const records = students.map(s => ({ student_id: s.id, date, status: statuses[s.id] || 'present', marked_by: profile.id }));
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const statusColors: Record<AttendanceStatus, string> = { present: 'bg-green-500', absent: 'bg-red-500', late: 'bg-yellow-500', excused: 'bg-blue-500' };
  const allStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Mark Attendance</h2>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 min-w-[180px]">
            <option value="">Select class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>
        {students.length > 0 && (
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Attendance'}
          </button>
        )}
      </div>
      {saveError && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <AlertCircle size={15} className="flex-shrink-0" /> {saveError}
        </div>
      )}

      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <span className="font-medium text-gray-800">{students.length} students</span>
            <div className="flex gap-2 text-xs">
              {allStatuses.map(s => (
                <button key={s} onClick={() => { const all: Record<string, AttendanceStatus> = {}; students.forEach(st => { all[st.id] = s; }); setStatuses(all); }}
                  className={`px-2 py-1 rounded-full text-white ${statusColors[s]} opacity-80 hover:opacity-100 capitalize`}>
                  All {s}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
            {students.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-semibold text-sm">
                    {s.profiles?.first_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{s.student_id}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {allStatuses.map(status => (
                    <button key={status}
                      onClick={() => setStatuses(prev => ({ ...prev, [s.id]: status }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${statuses[s.id] === status ? `${statusColors[status]} text-white shadow-sm` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!selectedClass && <div className="text-center py-16 text-gray-400"><ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Select a class to mark attendance</p></div>}
    </div>
  );
}
