import { AlertCircle } from 'lucide-react';
import { useStudentData } from './useStudentData';
import type { ProfileRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

export default function AttendanceSection({ profile }: Props) {
  const { attendance, loading, error, student } = useStudentData(profile.id);
  const attColor: Record<string, string> = { present: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700', late: 'bg-yellow-100 text-yellow-700', excused: 'bg-blue-100 text-blue-700' };
  const rate = attendance.length ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;

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

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">My Attendance</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Present', count: attendance.filter(a => a.status === 'present').length, color: 'text-green-600 bg-green-50' },
          { label: 'Absent', count: attendance.filter(a => a.status === 'absent').length, color: 'text-red-600 bg-red-50' },
          { label: 'Late', count: attendance.filter(a => a.status === 'late').length, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Excused', count: attendance.filter(a => a.status === 'excused').length, color: 'text-blue-600 bg-blue-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Attendance Rate</span>
          <span className={`text-sm font-bold ${rate >= 90 ? 'text-green-600' : rate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>{rate}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className={`h-full rounded-full ${rate >= 90 ? 'bg-green-500' : rate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase bg-gray-50">
              <th className="py-3 px-4">Date</th><th className="py-3 px-4">Day</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Notes</th>
            </tr></thead>
            <tbody>
              {attendance.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(a.date).toLocaleDateString('en', { weekday: 'long' })}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${attColor[a.status]}`}>{a.status}</span></td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{a.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {attendance.length === 0 && <p className="text-center py-10 text-gray-400">No attendance records yet</p>}
        </div>
      </div>
    </div>
  );
}
