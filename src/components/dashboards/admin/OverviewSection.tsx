import { useState, useEffect } from 'react';
import {
  GraduationCap, Users, DollarSign, AlertTriangle, UserCheck,
  BookOpen, TrendingUp, Activity, Bell, Calendar,
  ClipboardCheck, BarChart3, ClipboardList, RefreshCw, UserPlus, Bus, Heart, Settings
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSchoolSettings } from '../../../hooks/useSchoolSettings';
import type { ProfileRow, FeeRow } from '../../../lib/supabase';

interface OverviewAlert {
  type: 'error' | 'warning' | 'success';
  msg: string;
  action: string;
}

interface OverviewProps {
  profile: ProfileRow;
  onNavigate: (section: string) => void;
}

export default function OverviewSection({ profile: _profile, onNavigate }: OverviewProps) {
  const { currency } = useSchoolSettings();
  const [stats, setStats] = useState({
    totalStudents: 0, totalTeachers: 0, totalClasses: 0,
    totalRevenue: 0, pendingFees: 0, overdueAmount: 0,
    attendanceRate: 0, presentToday: 0, absentToday: 0,
    totalCourses: 0, totalAssignments: 0,
    publishedAnnouncements: 0, pendingAdmissions: 0,
  });
  const [alerts, setAlerts] = useState<OverviewAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const [
        { count: studentCount },
        { count: teacherCount },
        { count: classCount },
        { data: feesData },
        { data: attData },
        { data: todayAtt },
        { count: courseCount },
        { count: assignCount },
        { count: annCount },
        { count: pendingAdmCount },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('fees').select('amount, paid_amount, status'),
        supabase.from('attendance').select('status').gte('date', weekAgo).lte('date', today),
        supabase.from('attendance').select('status').eq('date', today),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('assignments').select('*', { count: 'exact', head: true }),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('published', true),
        supabase.from('admission_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const feeRows = (feesData || []) as Pick<FeeRow, 'amount' | 'paid_amount' | 'status'>[];
      const totalRevenue = feeRows.reduce((s, f) => s + (f.paid_amount ?? 0), 0);
      const pendingFees = feeRows.filter(f => f.status === 'pending' || f.status === 'partial')
        .reduce((s, f) => s + ((f.amount ?? 0) - (f.paid_amount ?? 0)), 0);
      const overdueAmount = feeRows.filter(f => f.status === 'overdue')
        .reduce((s, f) => s + ((f.amount ?? 0) - (f.paid_amount ?? 0)), 0);

      const presentWeek = attData?.filter((a: { status: string }) => a.status === 'present').length || 0;
      const attendanceRate = attData?.length ? Math.round((presentWeek / attData.length) * 100) : 0;
      const presentToday = todayAtt?.filter((a: { status: string }) => a.status === 'present').length || 0;
      const absentToday = todayAtt?.filter((a: { status: string }) => a.status === 'absent').length || 0;

      setStats({
        totalStudents: studentCount || 0, totalTeachers: teacherCount || 0,
        totalClasses: classCount || 0, totalRevenue, pendingFees, overdueAmount,
        attendanceRate, presentToday, absentToday,
        totalCourses: courseCount || 0, totalAssignments: assignCount || 0,
        publishedAnnouncements: annCount || 0, pendingAdmissions: pendingAdmCount || 0,
      });

      // Build dynamic alerts
      const alertList: OverviewAlert[] = [];
      if (overdueAmount > 0) alertList.push({ type: 'error', msg: `${currency}${overdueAmount.toLocaleString()} in overdue fees`, action: 'fees' });
      if ((pendingAdmCount || 0) > 0) alertList.push({ type: 'warning', msg: `${pendingAdmCount} admission application${(pendingAdmCount || 0) > 1 ? 's' : ''} awaiting review`, action: 'admissions' });
      if (attendanceRate < 80) alertList.push({ type: 'warning', msg: `Weekly attendance at ${attendanceRate}% — below target`, action: 'attendance' });
      if (pendingFees > 0) alertList.push({ type: 'warning', msg: `${currency}${pendingFees.toLocaleString()} in pending payments`, action: 'fees' });
      if (attendanceRate >= 90) alertList.push({ type: 'success', msg: `Excellent attendance this week: ${attendanceRate}%`, action: 'attendance' });
      setAlerts(alertList);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, color: 'from-blue-500 to-blue-600', action: 'students' },
    { label: 'Active Teachers', value: stats.totalTeachers, icon: Users, color: 'from-green-500 to-green-600', action: 'teachers' },
    { label: 'Classes', value: stats.totalClasses, icon: BookOpen, color: 'from-violet-500 to-violet-600', action: 'classes' },
    { label: `Revenue (${currency})`, value: `${currency}${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'from-emerald-500 to-teal-600', action: 'fees' },
    { label: `Pending Fees (${currency})`, value: `${currency}${stats.pendingFees.toLocaleString()}`, icon: AlertTriangle, color: 'from-orange-500 to-red-500', action: 'fees' },
    { label: 'Attendance (Week)', value: `${stats.attendanceRate}%`, icon: UserCheck, color: 'from-cyan-500 to-sky-600', action: 'attendance' },
    { label: 'Pending Admissions', value: stats.pendingAdmissions, icon: ClipboardList, color: 'from-orange-500 to-amber-500', action: 'admissions' },
    { label: 'Announcements', value: stats.publishedAnnouncements, icon: Bell, color: 'from-indigo-500 to-indigo-600', action: 'announcements' },
  ];

  const quickActions = [
    { label: 'Admissions', icon: ClipboardList, color: 'orange', section: 'admissions' },
    { label: 'Manage Students', icon: GraduationCap, color: 'blue', section: 'students' },
    { label: 'Manage Teachers', icon: Users, color: 'green', section: 'teachers' },
    { label: 'Parents', icon: UserPlus, color: 'amber', section: 'parents' },
    { label: 'Transport', icon: Bus, color: 'amber', section: 'transport' },
    { label: 'Health Records', icon: Heart, color: 'rose', section: 'health' },
    { label: 'Mark Attendance', icon: ClipboardCheck, color: 'cyan', section: 'attendance' },
    { label: 'Enter Grades', icon: BarChart3, color: 'purple', section: 'grades' },
    { label: 'Manage Fees', icon: DollarSign, color: 'emerald', section: 'fees' },
    { label: 'LMS / Courses', icon: BookOpen, color: 'pink', section: 'lms' },
    { label: 'Announcements', icon: Bell, color: 'orange', section: 'announcements' },
    { label: 'Calendar', icon: Calendar, color: 'indigo', section: 'calendar' },
    { label: 'View Reports', icon: TrendingUp, color: 'red', section: 'reports' },
    { label: 'Settings', icon: Settings, color: 'slate', section: 'settings' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
    amber: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
    rose: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
    slate: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    pink: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
    orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
    red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Today's snapshot */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl p-4 text-white">
          <p className="text-green-100 text-sm font-medium">Present Today</p>
          <p className="text-4xl font-bold mt-1">{stats.presentToday}</p>
          <p className="text-green-100 text-xs mt-1">students marked present</p>
        </div>
        <div className="bg-gradient-to-r from-red-400 to-rose-500 rounded-xl p-4 text-white">
          <p className="text-red-100 text-sm font-medium">Absent Today</p>
          <p className="text-4xl font-bold mt-1">{stats.absentToday}</p>
          <p className="text-red-100 text-xs mt-1">students marked absent</p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <button key={card.label} onClick={() => onNavigate(card.action)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
          </button>
        ))}
      </div>

      {/* Alerts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> System Alerts
          </h3>
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No alerts at this time
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <button key={i} onClick={() => onNavigate(alert.action)}
                  className={`w-full text-left p-3 rounded-lg border-l-4 transition-colors ${
                    alert.type === 'error' ? 'bg-red-50 border-red-400 hover:bg-red-100' :
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400 hover:bg-yellow-100' :
                    'bg-green-50 border-green-400 hover:bg-green-100'
                  }`}>
                  <p className={`text-xs font-medium ${
                    alert.type === 'error' ? 'text-red-800' :
                    alert.type === 'warning' ? 'text-yellow-800' : 'text-green-800'
                  }`}>{alert.msg}</p>
                  <p className={`text-xs mt-0.5 ${
                    alert.type === 'error' ? 'text-red-500' :
                    alert.type === 'warning' ? 'text-yellow-500' : 'text-green-500'
                  }`}>Click to view →</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button key={action.section} onClick={() => onNavigate(action.section)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${colorMap[action.color]}`}>
                <action.icon className="w-6 h-6" />
                <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly attendance progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Weekly Attendance Rate</h3>
          <span className={`text-lg font-bold ${stats.attendanceRate >= 90 ? 'text-green-600' : stats.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
            {stats.attendanceRate}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${stats.attendanceRate >= 90 ? 'bg-green-500' : stats.attendanceRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${stats.attendanceRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0%</span><span>Target: 90%</span><span>100%</span>
        </div>
        <div className="mt-3 flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> ≥90% Excellent
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> 75-89% Good
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &lt;75% Needs attention
          </span>
        </div>
      </div>

      {/* Fee collection bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" /> Fee Collection Summary
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <p className="text-xs text-gray-500">Total Collected</p>
            <p className="text-lg font-bold text-green-600">{currency}{stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-lg font-bold text-yellow-600">{currency}{stats.pendingFees.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Overdue</p>
            <p className="text-lg font-bold text-red-600">{currency}{stats.overdueAmount.toLocaleString()}</p>
          </div>
        </div>
        {(stats.totalRevenue + stats.pendingFees + stats.overdueAmount) > 0 && (
          <div className="w-full h-3 rounded-full overflow-hidden flex">
            {(() => {
              const total = stats.totalRevenue + stats.pendingFees + stats.overdueAmount;
              return (
                <>
                  <div className="bg-green-500 h-full transition-all" style={{ width: `${(stats.totalRevenue/total)*100}%` }} />
                  <div className="bg-yellow-400 h-full transition-all" style={{ width: `${(stats.pendingFees/total)*100}%` }} />
                  <div className="bg-red-500 h-full transition-all" style={{ width: `${(stats.overdueAmount/total)*100}%` }} />
                </>
              );
            })()}
          </div>
        )}
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span><span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1" />Collected</span>
          <span><span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1" />Pending</span>
          <span><span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1" />Overdue</span>
        </div>
        <button onClick={() => onNavigate('fees')}
          className="mt-3 text-xs text-indigo-600 hover:underline">View full fee report →</button>
      </div>
    </div>
  );
}
