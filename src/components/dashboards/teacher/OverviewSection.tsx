import { useState, useEffect } from 'react';
import { BookOpen, BarChart3, ClipboardCheck, Plus, ArrowRight, AlertCircle, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, ClassRow, GradeRow, ClassLevel } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const LEVEL_LABELS: Record<ClassLevel, string> = { creche: 'Creche', basic1: 'Basic 1', basic2: 'Basic 2', basic3: 'Basic 3', basic4: 'Basic 4', basic5: 'Basic 5', basic6: 'Basic 6' };

interface ClassWithCount extends ClassRow { students: { count: number }[]; }
interface GradeWithStudent extends GradeRow {
  students?: { profiles?: { first_name: string; last_name: string } } | null;
}

interface LowAttStudent {
  name: string; rate: number; className: string;
}

export default function OverviewSection({ profile, onNavigate }: Props) {
  const [data, setData] = useState<{
    classes: ClassWithCount[];
    recentGrades: GradeWithStudent[];
    presentToday: number;
    totalStudents: number;
    totalGradesEntered: number;
    absentToday: number;
    lowAttStudents: LowAttStudent[];
  }>({ classes: [], recentGrades: [], presentToday: 0, totalStudents: 0, totalGradesEntered: 0, absentToday: 0, lowAttStudents: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      try {
      const [{ data: classes }, { data: grades }, { count: totalGradesCount }] = await Promise.all([
        supabase.from('classes').select('*, students(count)').eq('teacher_id', profile.id),
        supabase.from('grades')
          .select('*, students:student_id(profiles:profile_id(first_name,last_name))')
          .eq('graded_by', profile.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('grades').select('*', { count: 'exact', head: true }).eq('graded_by', profile.id),
      ]);

      const classList = (classes || []) as ClassWithCount[];
      const classIds = classList.map(c => c.id);
      let presentToday = 0, absentToday = 0, totalStudents = 0;
      const lowAttStudents: LowAttStudent[] = [];

      if (classIds.length > 0) {
        const { data: studentRows } = await supabase
          .from('students')
          .select('id, profiles:profile_id(first_name,last_name), classes:class_id(name)')
          .in('class_id', classIds)
          .eq('is_active', true);

        const studentList = (studentRows || []) as {
          id: string;
          profiles: { first_name: string; last_name: string } | null;
          classes: { name: string } | null;
        }[];
        const ids = studentList.map(s => s.id);
        totalStudents = ids.length;

        if (ids.length > 0) {
          const [{ data: todayAtt }, { data: monthAtt }] = await Promise.all([
            supabase.from('attendance').select('student_id,status').eq('date', today).in('student_id', ids),
            supabase.from('attendance').select('student_id,status').gte('date', thirtyDaysAgo).in('student_id', ids),
          ]);

          presentToday = (todayAtt || []).filter((a: { status: string }) => a.status === 'present').length;
          absentToday = (todayAtt || []).filter((a: { status: string }) => a.status === 'absent').length;

          // Find students with <75% attendance in last 30 days
          const attByStudent: Record<string, { present: number; total: number }> = {};
          (monthAtt || []).forEach((a: { student_id: string; status: string }) => {
            if (!attByStudent[a.student_id]) attByStudent[a.student_id] = { present: 0, total: 0 };
            attByStudent[a.student_id].total++;
            if (a.status === 'present') attByStudent[a.student_id].present++;
          });

          Object.entries(attByStudent).forEach(([sid, { present, total }]) => {
            if (total >= 5) {
              const rate = Math.round((present / total) * 100);
              if (rate < 75) {
                const student = studentList.find(s => s.id === sid);
                if (student) {
                  lowAttStudents.push({
                    name: `${student.profiles?.first_name ?? ''} ${student.profiles?.last_name ?? ''}`.trim(),
                    rate,
                    className: student.classes?.name ?? '',
                  });
                }
              }
            }
          });
          lowAttStudents.sort((a, b) => a.rate - b.rate);
        }
      }

      setData({
        classes: classList,
        recentGrades: (grades || []) as GradeWithStudent[],
        presentToday,
        absentToday,
        totalStudents,
        totalGradesEntered: totalGradesCount ?? 0,
        lowAttStudents: lowAttStudents.slice(0, 5),
      });
      } finally {
        setLoading(false);
      }
    })();
  }, [profile.id]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <p className="text-white/80 text-sm font-medium">{greeting},</p>
        <h2 className="text-2xl font-bold mt-0.5">{profile.first_name} {profile.last_name}</h2>
        <p className="text-white/70 text-sm mt-1">
          {data.classes.length > 0
            ? `You teach ${data.classes.length} class${data.classes.length > 1 ? 'es' : ''} with ${data.totalStudents} students`
            : 'No classes assigned yet'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'My Classes', value: data.classes.length, icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'My Students', value: data.totalStudents, icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Present Today', value: data.presentToday, icon: ClipboardCheck, color: 'text-green-600 bg-green-50 border-green-100' },
          { label: 'Absent Today', value: data.absentToday, icon: AlertCircle, color: data.absentToday > 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-gray-400 bg-gray-50 border-gray-100' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm ${color}`}>
            <div className="p-2 rounded-lg bg-white/80 flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Take Attendance', icon: ClipboardCheck, color: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700', section: 'attendance' },
            { label: 'Enter Grades', icon: Plus, color: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700', section: 'grades' },
            { label: 'View Classes', icon: BookOpen, color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700', section: 'classes' },
            { label: 'View Students', icon: Users, color: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700', section: 'students' },
          ].map(({ label, icon: Icon, color, section }) => (
            <button
              key={label}
              onClick={() => onNavigate?.(section)}
              className={`flex items-center justify-between gap-2 p-3 rounded-xl border font-medium text-sm transition-colors ${color}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Classes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" /> My Classes
          </h3>
          {data.classes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No classes assigned yet</p>
          ) : (
            <div className="space-y-2">
              {data.classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => onNavigate?.('classes')}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-gray-800">{cls.name}</p>
                    <p className="text-xs text-gray-500">{LEVEL_LABELS[cls.level]} · {cls.academic_year}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-600">{cls.students?.[0]?.count || 0} students</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent grades + attendance alerts */}
        <div className="space-y-4">
          {/* Low attendance alert */}
          {data.lowAttStudents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" /> Attendance Concerns
              </h3>
              <p className="text-xs text-gray-500 mb-3">Students below 75% attendance (last 30 days):</p>
              <div className="space-y-2">
                {data.lowAttStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.className}</p>
                    </div>
                    <span className="text-sm font-bold text-red-600">{s.rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent grades */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" /> Recent Grades Entered
            </h3>
            {data.recentGrades.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No grades entered yet</p>
            ) : (
              <div className="space-y-2">
                {data.recentGrades.map(g => (
                  <div key={g.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {g.students?.profiles?.first_name} {g.students?.profiles?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{g.subject} · {g.assessment_type}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{g.score}/{g.max_score}</span>
                  </div>
                ))}
                <button
                  onClick={() => onNavigate?.('grades')}
                  className="w-full text-center text-xs text-blue-600 hover:underline font-medium pt-1"
                >
                  View all grades →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
