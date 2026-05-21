import { useState, useEffect } from 'react';
import { Heart, Bell, GraduationCap, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, StudentWithProfileAndClass, FeeRow, AttendanceRow, AnnouncementRow, ClassLevel } from '../../../lib/supabase';
import { SCHOOL_NAME } from '../../../config/schoolBrand';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const LEVEL_LABELS: Record<ClassLevel, string> = { creche: 'Creche', toddler: 'Toddler (Pre-KG)', basic1: 'Basic 1', basic2: 'Basic 2', basic3: 'Basic 3', basic4: 'Basic 4', basic5: 'Basic 5' };
interface StudentParentLink { student_id: string }

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'border-red-500 bg-red-50',
  high: 'border-orange-400 bg-orange-50',
  normal: 'border-blue-400 bg-blue-50',
  low: 'border-gray-300 bg-gray-50',
};
const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function OverviewSection({ profile, onNavigate }: Props) {
  const [data, setData] = useState<{
    children: StudentWithProfileAndClass[];
    pendingTotal: number;
    announcements: Pick<AnnouncementRow, 'id' | 'title' | 'content' | 'created_at' | 'priority'>[];
    attendanceRate: number;
    presentCount: number;
    totalDays: number;
  }>({ children: [], pendingTotal: 0, announcements: [], attendanceRate: 0, presentCount: 0, totalDays: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: parent } = await supabase.from('parents').select('id').eq('profile_id', profile.id).maybeSingle();
        if (!parent) return;
        const { data: links } = await supabase.from('student_parents').select('student_id').eq('parent_id', parent.id);
        const ids = (links || []).map((l: StudentParentLink) => l.student_id);
        const [{ data: children }, { data: fees }, { data: att }, { data: ann }] = await Promise.all([
          ids.length > 0
            ? supabase.from('students').select('id,student_id,profiles:profile_id(first_name,last_name),classes:class_id(name,level)').in('id', ids)
            : Promise.resolve({ data: [] }),
          ids.length > 0
            ? supabase.from('fees').select('amount,paid_amount,status').in('student_id', ids).in('status', ['pending', 'partial', 'overdue'])
            : Promise.resolve({ data: [] }),
          ids.length > 0
            ? supabase.from('attendance').select('status').in('student_id', ids).gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
            : Promise.resolve({ data: [] }),
          supabase.from('announcements').select('id,title,content,created_at,priority').eq('published', true).order('created_at', { ascending: false }).limit(5),
        ]);
        const feeRows = (fees || []) as Pick<FeeRow, 'amount' | 'paid_amount' | 'status'>[];
        const pendingTotal = feeRows.reduce((s, f) => s + ((f.amount ?? 0) - (f.paid_amount ?? 0)), 0);
        const attRows = (att || []) as Pick<AttendanceRow, 'status'>[];
        const presentCount = attRows.filter(a => a.status === 'present').length;
        const attendanceRate = attRows.length ? Math.round((presentCount / attRows.length) * 100) : 0;
        setData({
          children: (children || []) as StudentWithProfileAndClass[],
          pendingTotal,
          announcements: (ann || []) as Pick<AnnouncementRow, 'id' | 'title' | 'content' | 'created_at' | 'priority'>[],
          attendanceRate,
          presentCount,
          totalDays: attRows.length,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [profile.id]);

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 rounded-2xl p-6 text-white shadow-md shadow-indigo-700/10">
        <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">{greeting},</p>
        <h2 className="text-2xl font-bold mt-1">{profile.first_name} {profile.last_name}</h2>
        <p className="text-white/70 text-sm mt-1.5 leading-relaxed">
          {data.children.length > 0
            ? `You have ${data.children.length} child${data.children.length > 1 ? 'ren' : ''} enrolled at ${SCHOOL_NAME}`
            : `Welcome to the ${SCHOOL_NAME} portal`}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Children',
            value: data.children.length,
            sub: data.children.length === 1 ? 'enrolled' : 'enrolled',
            icon: Users,
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            iconBg: 'bg-indigo-100',
          },
          {
            label: 'Attendance',
            value: data.totalDays > 0 ? `${data.attendanceRate}%` : '—',
            sub: 'last 30 days',
            icon: TrendingUp,
            color: data.attendanceRate >= 90 ? 'text-green-600 bg-green-50 border-green-100' : data.attendanceRate >= 75 ? 'text-yellow-600 bg-yellow-50 border-yellow-100' : 'text-red-600 bg-red-50 border-red-100',
            iconBg: data.attendanceRate >= 90 ? 'bg-green-100' : data.attendanceRate >= 75 ? 'bg-yellow-100' : 'bg-red-100',
          },
          {
            label: 'Pending Fees',
            value: data.pendingTotal > 0 ? `₦${data.pendingTotal.toLocaleString()}` : '₦0',
            sub: data.pendingTotal > 0 ? 'outstanding' : 'all clear',
            icon: AlertCircle,
            color: data.pendingTotal > 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-green-600 bg-green-50 border-green-100',
            iconBg: data.pendingTotal > 0 ? 'bg-red-100' : 'bg-green-100',
          },
          {
            label: 'Announcements',
            value: data.announcements.length,
            sub: 'recent',
            icon: Bell,
            color: 'text-amber-600 bg-amber-50 border-amber-100',
            iconBg: 'bg-amber-100',
          },
        ].map(({ label, value, sub, icon: Icon, color, iconBg }) => (
          <div key={label} className={`bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm ${color}`}>
            <div className={`p-2 rounded-lg flex-shrink-0 ${iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{label}</p>
              <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Children + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Children cards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Heart className="w-4 h-4 text-indigo-600 animate-pulse" /> My Children
            </h3>
            {onNavigate && data.children.length > 0 && (
              <button onClick={() => onNavigate('children')} className="text-xs text-indigo-600 hover:underline font-bold">View details →</button>
            )}
          </div>

          {data.children.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No children linked to your account yet.<br />Contact the school administrator.</p>
          ) : (
            <div className="space-y-3">
              {data.children.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-indigo-50/20 rounded-xl border border-indigo-100 shadow-sm">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow">
                    {c.profiles?.first_name?.[0]}{c.profiles?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{c.profiles?.first_name} {c.profiles?.last_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                      <p className="text-xs text-gray-500 truncate font-medium">
                        {c.classes?.name
                          ? `${c.classes.name}${c.classes.level != null ? ` · ${LEVEL_LABELS[c.classes.level]}` : ''}`
                          : 'No class assigned'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-gray-400 flex-shrink-0">{c.student_id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" /> School Announcements
          </h3>
          {data.announcements.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No announcements yet</p>
          ) : (
            <div className="space-y-3">
              {data.announcements.map(a => (
                <div key={a.id} className={`p-3 rounded-xl border-l-4 ${PRIORITY_STYLE[a.priority] ?? 'border-gray-300 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-800 text-sm flex-1">{a.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 capitalize ${PRIORITY_BADGE[a.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{new Date(a.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
