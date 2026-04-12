import { useState, useEffect } from 'react';
import { Users, GraduationCap, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, StudentWithProfileAndClass, GradeRow, AttendanceRow, ClassLevel } from '../../../lib/supabase';
import { nigerianGrade } from '../../../lib/grading';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const LEVEL_LABELS: Record<ClassLevel, string> = { creche: 'Creche', basic1: 'Basic 1', basic2: 'Basic 2', basic3: 'Basic 3', basic4: 'Basic 4', basic5: 'Basic 5', basic6: 'Basic 6' };
interface StudentParentLink { student_id: string }

const attColor: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  excused: 'bg-blue-100 text-blue-700',
};

export default function ChildrenSection({ profile }: Props) {
  const [children, setChildren] = useState<StudentWithProfileAndClass[]>([]);
  const [selected, setSelected] = useState<StudentWithProfileAndClass | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: parent } = await supabase.from('parents').select('id').eq('profile_id', profile.id).maybeSingle();
      if (!parent) { setLoading(false); return; }
      const { data: links } = await supabase.from('student_parents').select('student_id').eq('parent_id', parent.id);
      const ids = (links || []).map((l: StudentParentLink) => l.student_id);
      if (ids.length > 0) {
        const { data } = await supabase.from('students')
          .select('*, profiles:profile_id(first_name,last_name,email), classes:class_id(name,level)')
          .in('id', ids);
        const list = (data || []) as StudentWithProfileAndClass[];
        setChildren(list);
        if (list.length > 0) loadChildDetails(list[0]);
      }
      setLoading(false);
    })();
  }, [profile.id]);

  const loadChildDetails = async (child: StudentWithProfileAndClass) => {
    setSelected(child);
    setDetailLoading(true);
    const [{ data: g }, { data: a }] = await Promise.all([
      supabase.from('grades').select('*').eq('student_id', child.id).order('created_at', { ascending: false }).limit(40),
      supabase.from('attendance').select('*').eq('student_id', child.id).order('date', { ascending: false }).limit(30),
    ]);
    setGrades((g || []) as GradeRow[]);
    setAttendance((a || []) as AttendanceRow[]);
    setDetailLoading(false);
  };

  // Aggregate grades by subject
  const gradesBySubject = grades.reduce<Record<string, { total: number; max: number }>>((acc, g) => {
    if (!acc[g.subject]) acc[g.subject] = { total: 0, max: 0 };
    acc[g.subject].total += g.score;
    acc[g.subject].max += g.max_score;
    return acc;
  }, {});

  const attPresent = attendance.filter(a => a.status === 'present').length;
  const attRate = attendance.length > 0 ? Math.round((attPresent / attendance.length) * 100) : null;

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">My Children</h2>

      {children.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No children linked yet.</p>
          <p className="text-sm mt-1">Contact the school administrator.</p>
        </div>
      ) : (
        <>
          {/* Child selector tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {children.map(c => (
              <button key={c.id} onClick={() => loadChildDetails(c)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${selected?.id === c.id ? 'bg-purple-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selected?.id === c.id ? 'bg-white/30 text-white' : 'bg-purple-100 text-purple-700'}`}>
                  {c.profiles?.first_name?.[0]}
                </div>
                {c.profiles?.first_name} {c.profiles?.last_name}
              </button>
            ))}
          </div>

          {/* Selected child details */}
          {selected && (
            <>
              {/* Child info card */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                    {selected.profiles?.first_name?.[0]}{selected.profiles?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl">{selected.profiles?.first_name} {selected.profiles?.last_name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-white/80 text-sm">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {selected.classes?.name
                          ? `${selected.classes.name} (${selected.classes.level != null ? LEVEL_LABELS[selected.classes.level] : ''})`
                          : 'No class assigned'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        ID: {selected.student_id}
                      </span>
                    </div>
                  </div>
                  {attRate !== null && (
                    <div className="text-center flex-shrink-0">
                      <div className={`text-2xl font-bold ${attRate >= 90 ? 'text-green-300' : attRate >= 75 ? 'text-yellow-300' : 'text-red-300'}`}>
                        {attRate}%
                      </div>
                      <div className="text-white/70 text-xs">Attendance</div>
                    </div>
                  )}
                </div>
              </div>

              {detailLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Academic Performance */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-500" /> Academic Performance
                    </h4>
                    {Object.keys(gradesBySubject).length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-6">No grades recorded yet</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(gradesBySubject).map(([subject, { total, max }]) => {
                          const pct = max > 0 ? Math.round((total / max) * 100) : 0;
                          const grade = nigerianGrade(total, max);
                          return (
                            <div key={subject}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2">{subject}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs text-gray-500">{total}/{max}</span>
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${grade.color}`}>{grade.label}</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Attendance */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" /> Recent Attendance
                    </h4>

                    {attRate !== null && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500">Attendance Rate</span>
                          <span className={`text-sm font-bold ${attRate >= 90 ? 'text-green-600' : attRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>{attRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${attRate >= 90 ? 'bg-green-500' : attRate >= 75 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${attRate}%` }}
                          />
                        </div>
                        {attRate < 75 && (
                          <p className="text-xs text-red-600 mt-1.5 font-medium">⚠ Below 75% minimum threshold</p>
                        )}
                      </div>
                    )}

                    {attendance.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">No attendance records yet</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {attendance.slice(0, 15).map(a => (
                          <div key={a.id} className="flex justify-between items-center py-1.5">
                            <span className="text-sm text-gray-600">
                              {new Date(a.date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${attColor[a.status]}`}>{a.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
