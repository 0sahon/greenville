import { useState, useEffect } from 'react';
import { Download, RefreshCw, BarChart3, Users, DollarSign, ClipboardCheck, TrendingUp, Award } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSchoolSettings } from '../../../hooks/useSchoolSettings';
import type { ProfileRow, FeeRow, AttendanceStatus } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

// ── Mini chart helpers ────────────────────────────────────────────────────────
function BarChart({ bars, maxVal, color = 'bg-indigo-500', height = 'h-16' }: {
  bars: { label: string; value: number }[];
  maxVal: number;
  color?: string;
  height?: string;
}) {
  if (bars.length === 0) return <p className="text-xs text-gray-400 text-center py-4">No data</p>;
  return (
    <div className="flex items-end gap-1" style={{ height: height === 'h-16' ? 64 : 80 }}>
      {bars.map(b => {
        const pct = maxVal > 0 ? (b.value / maxVal) * 100 : 0;
        return (
          <div key={b.label} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
              {b.label}: {b.value}
            </div>
            <div className="w-full flex flex-col justify-end" style={{ height: height === 'h-16' ? 52 : 68 }}>
              <div className={`w-full rounded-t-sm ${color} transition-all min-h-[2px]`} style={{ height: `${Math.max(pct, 2)}%` }} />
            </div>
            <p className="text-xs text-gray-400 truncate w-full text-center">{b.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <p className="text-xs text-gray-400 text-center py-4">No data</p>;
  let cumulative = 0;
  const radius = 40;
  const cx = 50, cy = 50;
  const paths = segments.map(seg => {
    const startAngle = (cumulative / total) * 360 - 90;
    cumulative += seg.value;
    const endAngle = (cumulative / total) * 360 - 90;
    const large = endAngle - startAngle > 180 ? 1 : 0;
    const s = Math.PI / 180;
    const x1 = cx + radius * Math.cos(startAngle * s);
    const y1 = cy + radius * Math.sin(startAngle * s);
    const x2 = cx + radius * Math.cos(endAngle * s);
    const y2 = cy + radius * Math.sin(endAngle * s);
    const innerR = 24;
    const ix1 = cx + innerR * Math.cos(startAngle * s);
    const iy1 = cy + innerR * Math.sin(startAngle * s);
    const ix2 = cx + innerR * Math.cos(endAngle * s);
    const iy2 = cy + innerR * Math.sin(endAngle * s);
    return { seg, d: `M${x1},${y1} A${radius},${radius} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${innerR},${innerR} 0 ${large},0 ${ix1},${iy1} Z` };
  });
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-20 h-20 flex-shrink-0">
        {paths.map(({ seg, d }) => <path key={seg.label} d={d} fill={seg.color} />)}
      </svg>
      <div className="space-y-1.5">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-gray-600">{seg.label}</span>
            <span className="text-xs font-semibold text-gray-800 ml-auto">{Math.round((seg.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsSection({ profile: _profile, onNavigate }: Props) {
  const { currency, schoolName } = useSchoolSettings();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0, totalTeachers: 0, totalClasses: 0,
    totalRevenue: 0, pendingFees: 0, overdueFees: 0, paidFees: 0,
    attendanceRate: 0, presentThisWeek: 0, totalAttendanceRecords: 0,
  });
  const [attTrend, setAttTrend] = useState<{ label: string; value: number }[]>([]);
  const [classEnrollment, setClassEnrollment] = useState<{ label: string; value: number }[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<{ label: string; value: number }[]>([]);
  const [topStudents, setTopStudents] = useState<{ name: string; avg: number; class: string }[]>([]);

  const fetchReport = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

    const [
      { count: studentCount }, { count: teacherCount }, { count: classCount },
      { data: feesData }, { data: attData }, { data: attTrendData },
      { data: classData }, { data: gradesData },
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('classes').select('*', { count: 'exact', head: true }),
      supabase.from('fees').select('amount, paid_amount, status'),
      supabase.from('attendance').select('status').gte('date', weekAgo).lte('date', today),
      supabase.from('attendance').select('date, status').gte('date', twoWeeksAgo).lte('date', today).order('date'),
      supabase.from('classes').select('name, id'),
      supabase.from('grades').select('student_id, score, max_score, students:student_id(profiles:profile_id(first_name, last_name), classes:class_id(name))').limit(2000),
    ]);

    const feeRows = (feesData || []) as Pick<FeeRow, 'amount' | 'paid_amount' | 'status'>[];
    const totalRevenue = feeRows.reduce((s, f) => s + (f.paid_amount ?? 0), 0);
    const pendingFees = feeRows.filter(f => f.status === 'pending' || f.status === 'partial').reduce((s, f) => s + ((f.amount ?? 0) - (f.paid_amount ?? 0)), 0);
    const overdueFees = feeRows.filter(f => f.status === 'overdue').reduce((s, f) => s + ((f.amount ?? 0) - (f.paid_amount ?? 0)), 0);
    const paidFees = feeRows.filter(f => f.status === 'paid').length;

    const attList = (attData || []) as { status: AttendanceStatus }[];
    const presentThisWeek = attList.filter(a => a.status === 'present').length;
    const attendanceRate = attList.length ? Math.round((presentThisWeek / attList.length) * 100) : 0;

    setStats({ totalStudents: studentCount ?? 0, totalTeachers: teacherCount ?? 0, totalClasses: classCount ?? 0, totalRevenue, pendingFees, overdueFees, paidFees, attendanceRate, presentThisWeek, totalAttendanceRecords: attList.length });

    // Attendance trend: group by day last 14 days
    const trendMap: Record<string, { present: number; total: number }> = {};
    (attTrendData || []).forEach((r: { date: string; status: string }) => {
      (trendMap[r.date] = trendMap[r.date] || { present: 0, total: 0 }).total++;
      if (r.status === 'present') trendMap[r.date].present++;
    });
    const trend = Object.entries(trendMap).slice(-10).map(([date, { present, total }]) => ({
      label: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
      value: total > 0 ? Math.round((present / total) * 100) : 0,
    }));
    setAttTrend(trend);

    // Class enrollment
    if (classData) {
      const classCounts = await Promise.all(classData.map(async (c: { id: string; name: string }) => {
        const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', c.id).eq('is_active', true);
        return { label: c.name, value: count ?? 0 };
      }));
      setClassEnrollment(classCounts.sort((a, b) => b.value - a.value).slice(0, 8));
    }

    // Grade distribution
    const gradeRows = (gradesData || []) as { score: number; max_score: number; student_id: string; students?: { profiles?: { first_name: string; last_name: string } | null; classes?: { name: string } | null } | null }[];
    const dist: Record<string, number> = { 'A (75-100)': 0, 'B (60-74)': 0, 'C (45-59)': 0, 'D (30-44)': 0, 'F (<30)': 0 };
    gradeRows.forEach(g => {
      const pct = g.max_score > 0 ? (g.score / g.max_score) * 100 : 0;
      if (pct >= 75) dist['A (75-100)']++;
      else if (pct >= 60) dist['B (60-74)']++;
      else if (pct >= 45) dist['C (45-59)']++;
      else if (pct >= 30) dist['D (30-44)']++;
      else dist['F (<30)']++;
    });
    setGradeDistribution(Object.entries(dist).map(([label, value]) => ({ label, value })));

    // Top students by average grade
    const studentGrades: Record<string, { total: number; count: number; name: string; cls: string }> = {};
    gradeRows.forEach(g => {
      const pct = g.max_score > 0 ? (g.score / g.max_score) * 100 : 0;
      const name = `${g.students?.profiles?.first_name ?? ''} ${g.students?.profiles?.last_name ?? ''}`.trim();
      const cls = g.students?.classes?.name ?? '—';
      if (!studentGrades[g.student_id]) studentGrades[g.student_id] = { total: 0, count: 0, name, cls };
      studentGrades[g.student_id].total += pct;
      studentGrades[g.student_id].count++;
    });
    const top = Object.values(studentGrades)
      .filter(s => s.count >= 1)
      .map(s => ({ name: s.name, avg: Math.round(s.total / s.count), class: s.cls }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
    setTopStudents(top);

    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, []);

  const exportSummary = () => {
    const lines = [
      `${schoolName} – Summary Report`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Enrollment',
      `  Students: ${stats.totalStudents}`,
      `  Teachers: ${stats.totalTeachers}`,
      `  Classes: ${stats.totalClasses}`,
      '',
      `Finance (${currency})`,
      `  Total revenue: ${currency}${stats.totalRevenue.toLocaleString()}`,
      `  Pending fees: ${currency}${stats.pendingFees.toLocaleString()}`,
      `  Overdue: ${currency}${stats.overdueFees.toLocaleString()}`,
      '',
      'Attendance (last 7 days)',
      `  Present: ${stats.presentThisWeek}`,
      `  Records: ${stats.totalAttendanceRecords}`,
      `  Rate: ${stats.attendanceRate}%`,
      '',
      'Grade Distribution',
      ...gradeDistribution.map(g => `  ${g.label}: ${g.value}`),
    ];
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    a.download = `report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  if (loading) return <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-red-300 border-t-red-600 rounded-full animate-spin" /></div>;

  const maxEnrollment = Math.max(...classEnrollment.map(c => c.value), 1);
  const maxGrade = Math.max(...gradeDistribution.map(g => g.value), 1);
  const feeDonut = [
    { label: 'Collected', value: stats.totalRevenue, color: '#22c55e' },
    { label: 'Pending', value: stats.pendingFees, color: '#eab308' },
    { label: 'Overdue', value: stats.overdueFees, color: '#ef4444' },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-red-500" /> Reports & Analytics
        </h2>
        <div className="flex gap-2">
          <button onClick={fetchReport} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={exportSummary} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Students', value: stats.totalStudents, icon: <Users className="w-5 h-5 text-blue-500" />, nav: 'students', color: 'text-blue-600' },
          { label: 'Teachers', value: stats.totalTeachers, icon: <Users className="w-5 h-5 text-green-500" />, nav: 'teachers', color: 'text-green-600' },
          { label: 'Classes', value: stats.totalClasses, icon: <BarChart3 className="w-5 h-5 text-violet-500" />, nav: 'classes', color: 'text-violet-600' },
          { label: 'Attendance (7d)', value: `${stats.attendanceRate}%`, icon: <ClipboardCheck className="w-5 h-5 text-cyan-500" />, nav: 'attendance', color: 'text-cyan-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs font-medium text-gray-500">{s.label}</span></div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            {onNavigate && <button onClick={() => onNavigate(s.nav)} className={`text-xs ${s.color} hover:underline mt-1`}>View →</button>}
          </div>
        ))}
      </div>

      {/* Row 1: Attendance trend + Fee collection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Attendance trend bar chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-cyan-500" /> Attendance Trend (last 10 days)
          </h3>
          {attTrend.length > 0 ? (
            <BarChart bars={attTrend} maxVal={100} color="bg-cyan-500" height="h-16" />
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">No attendance data yet</p>
          )}
          <p className="text-xs text-gray-400 mt-2 text-center">% present per day</p>
        </div>

        {/* Fee collection donut */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Fee Collection
          </h3>
          <DonutChart segments={feeDonut} />
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div><p className="text-xs text-gray-500">Collected</p><p className="font-bold text-green-600 text-sm">{currency}{stats.totalRevenue.toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-500">Pending</p><p className="font-bold text-yellow-600 text-sm">{currency}{stats.pendingFees.toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-500">Overdue</p><p className="font-bold text-red-600 text-sm">{currency}{stats.overdueFees.toLocaleString()}</p></div>
          </div>
          {onNavigate && <button onClick={() => onNavigate('fees')} className="mt-2 text-xs text-indigo-600 hover:underline">View all fees →</button>}
        </div>
      </div>

      {/* Row 2: Grade distribution + Class enrollment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Grade distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-500" /> Grade Distribution
          </h3>
          <BarChart
            bars={gradeDistribution.map(g => ({ label: g.label.split(' ')[0], value: g.value }))}
            maxVal={maxGrade} color="bg-purple-500" height="h-20"
          />
          <div className="mt-3 grid grid-cols-5 gap-1 text-center">
            {gradeDistribution.map(g => (
              <div key={g.label}><p className="text-xs font-semibold text-gray-700">{g.value}</p><p className="text-xs text-gray-400">{g.label.split(' ')[0]}</p></div>
            ))}
          </div>
        </div>

        {/* Class enrollment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Class Enrollment
          </h3>
          {classEnrollment.length > 0 ? (
            <>
              <BarChart bars={classEnrollment} maxVal={maxEnrollment} color="bg-blue-500" height="h-20" />
              <div className="mt-3 space-y-1">
                {classEnrollment.slice(0, 5).map(c => (
                  <div key={c.label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-20 truncate">{c.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${maxEnrollment > 0 ? (c.value / maxEnrollment) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-6 text-right">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">No class data</p>
          )}
        </div>
      </div>

      {/* Top Performing Students */}
      {topStudents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" /> Top Performing Students
          </h3>
          <div className="space-y-3">
            {topStudents.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.class}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm ${s.avg >= 70 ? 'text-green-600' : s.avg >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{s.avg}%</p>
                </div>
                <div className="w-24 bg-gray-100 rounded-full h-2 flex-shrink-0">
                  <div className={`h-2 rounded-full ${s.avg >= 70 ? 'bg-green-500' : s.avg >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${s.avg}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
