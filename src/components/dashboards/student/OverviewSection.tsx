import { BookOpen, Star, Target, Trophy, Heart, AlertCircle, ClipboardCheck, FileText, ArrowRight } from 'lucide-react';
import { useStudentData } from './useStudentData';
import type { ProfileRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

export default function OverviewSection({ profile, onNavigate }: Props) {
  const { student, grades, attendance, assignments, loading, error } = useStudentData(profile.id);

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div>;
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
      <div><h3 className="font-semibold text-red-800">Something went wrong</h3><p className="text-sm text-red-700 mt-1">{error}</p></div>
    </div>
  );
  if (!student) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
      <div><h3 className="font-semibold text-amber-800">No student record found</h3><p className="text-sm text-amber-700 mt-1">Please contact your school administrator.</p></div>
    </div>
  );

  const avg = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / grades.length) : 0;
  const attRate = attendance.length ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;

  const pendingAssignments = assignments.filter(a => !a.status || a.status === 'pending').length;
  const now = new Date();
  const upcomingAssignments = assignments
    .filter(a => {
      const due = a.assignments?.due_date ? new Date(a.assignments.due_date) : null;
      return due && due > now && (!a.status || a.status === 'pending');
    })
    .sort((a, b) => {
      const da = new Date(a.assignments!.due_date!).getTime();
      const db = new Date(b.assignments!.due_date!).getTime();
      return da - db;
    })
    .slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-5 text-white">
        <p className="text-white/80 text-sm font-medium">{greeting},</p>
        <h2 className="text-2xl font-bold mt-0.5">{profile.first_name} {profile.last_name}</h2>
        <p className="text-white/70 text-sm mt-1">
          {student.classes?.name ? `Class: ${student.classes.name}` : 'No class assigned yet'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Avg Score', value: grades.length ? `${avg}%` : '—', color: 'from-yellow-400 to-orange-400' },
          { label: 'Attendance', value: attendance.length ? `${attRate}%` : '—', color: 'from-green-400 to-emerald-500' },
          { label: 'Grades', value: grades.length, color: 'from-purple-400 to-indigo-500' },
          { label: 'Pending Work', value: pendingAssignments, color: pendingAssignments > 0 ? 'from-red-400 to-rose-500' : 'from-gray-400 to-gray-500' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-r ${s.color} rounded-xl p-4 text-white`}>
            <p className="text-white/80 text-xs font-medium">{s.label}</p>
            <p className="text-2xl font-bold mt-1 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {onNavigate && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Access</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'My Grades', icon: Target, color: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700', section: 'grades' },
              { label: 'Assignments', icon: FileText, color: 'bg-pink-50 border-pink-200 hover:bg-pink-100 text-pink-700', section: 'assignments' },
              { label: 'Attendance', icon: ClipboardCheck, color: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700', section: 'attendance' },
              { label: 'Timetable', icon: BookOpen, color: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700', section: 'timetable' },
            ].map(({ label, icon: Icon, color, section }) => (
              <button
                key={label}
                onClick={() => onNavigate(section)}
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scores */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" /> Recent Scores
          </h3>
          {grades.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No grades yet</p>
          ) : (
            grades.slice(0, 5).map(g => {
              const pct = Math.round((g.score / g.max_score) * 100);
              return (
                <div key={g.id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{g.subject}</p>
                    <p className="text-xs text-gray-400">{g.assessment_type} · {g.term}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{g.score}/{g.max_score}</p>
                    <p className="text-xs text-gray-400">{pct}%</p>
                  </div>
                </div>
              );
            })
          )}
          {grades.length > 5 && onNavigate && (
            <button onClick={() => onNavigate('grades')} className="mt-2 w-full text-center text-xs text-pink-600 hover:underline font-medium">
              View all {grades.length} grades →
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Upcoming assignments */}
          {upcomingAssignments.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" /> Due Soon
              </h3>
              <div className="space-y-2">
                {upcomingAssignments.map(a => {
                  const due = new Date(a.assignments!.due_date!);
                  const hoursLeft = Math.round((due.getTime() - now.getTime()) / 3600000);
                  const urgent = hoursLeft < 24;
                  return (
                    <div key={a.id} className={`flex items-start justify-between p-2.5 rounded-lg ${urgent ? 'bg-red-50 border border-red-100' : 'bg-orange-50 border border-orange-100'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.assignments?.title}</p>
                        <p className="text-xs text-gray-500">{a.assignments?.courses?.subject}</p>
                      </div>
                      <span className={`text-xs font-semibold flex-shrink-0 ml-3 ${urgent ? 'text-red-600' : 'text-orange-600'}`}>
                        {hoursLeft < 24 ? `${hoursLeft}h left` : `${Math.round(hoursLeft / 24)}d left`}
                      </span>
                    </div>
                  );
                })}
              </div>
              {onNavigate && (
                <button onClick={() => onNavigate('assignments')} className="mt-2 w-full text-center text-xs text-orange-600 hover:underline font-medium">
                  View all assignments →
                </button>
              )}
            </div>
          )}

          {/* Achievements / Motivation */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Achievements
              </h3>
              <div className="space-y-2">
                {attRate >= 90 && <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg"><Trophy className="w-5 h-5 text-green-500" /><span className="text-sm font-medium text-green-800">Perfect Attendance</span></div>}
                {avg >= 70 && <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg"><Star className="w-5 h-5 text-blue-500" /><span className="text-sm font-medium text-blue-800">High Achiever</span></div>}
                {grades.length >= 5 && <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg"><BookOpen className="w-5 h-5 text-purple-500" /><span className="text-sm font-medium text-purple-800">Active Learner</span></div>}
                {attRate < 90 && avg < 70 && grades.length < 5 && (
                  <p className="text-gray-400 text-sm text-center py-2">Complete more activities to earn badges!</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-200 to-orange-300 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center"><Heart className="w-5 h-5 text-red-500" /></div>
                <h3 className="font-bold text-gray-800">Daily Motivation</h3>
              </div>
              <p className="text-gray-700 text-sm">"Every day is a chance to learn something amazing. Keep shining bright!"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
