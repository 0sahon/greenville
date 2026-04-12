import { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear } from '../../../lib/academicConfig';
import type { ProfileRow, FeeRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; }

const STATUS_STYLE: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-700',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  paid:    <CheckCircle2 className="w-4 h-4" />,
  partial: <Clock className="w-4 h-4" />,
  pending: <Clock className="w-4 h-4" />,
  overdue: <AlertCircle className="w-4 h-4" />,
};

export default function StudentFeesSection({ profile }: Props) {
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('');
  const [filterYear, setFilterYear] = useState(getDefaultAcademicYear());
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('students').select('id').eq('profile_id', profile.id).maybeSingle().then(({ data }) => {
      if (data) { setStudentId(data.id); fetchFees(data.id); }
      else setLoading(false);
    });
  }, [profile.id]);

  const fetchFees = async (sid: string) => {
    setLoading(true);
    try {
      let q = supabase.from('fees').select('*').eq('student_id', sid).order('due_date', { ascending: false });
      if (filterTerm) q = q.eq('term', filterTerm);
      if (filterYear) q = q.eq('academic_year', filterYear);
      const { data } = await q;
      setFees((data || []) as FeeRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (studentId) fetchFees(studentId); }, [filterTerm, filterYear]);

  const total = fees.reduce((s, f) => s + f.amount, 0);
  const paid = fees.reduce((s, f) => s + (f.paid_amount ?? 0), 0);
  const balance = total - paid;

  const fmt = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <DollarSign className="w-6 h-6 text-pink-500" /> My Fees
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total Fees</p>
          <p className="text-xl font-bold text-gray-900">{fmt(total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Paid</p>
          <p className="text-xl font-bold text-green-600">{fmt(paid)}</p>
        </div>
        <div className={`rounded-xl border shadow-sm p-4 text-center ${balance > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          <p className="text-xs text-gray-500 mb-1">Balance</p>
          <p className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(balance)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
          <option value="">All Terms</option>
          {TERMS.map(t => <option key={t}>{t}</option>)}
        </select>
        <input value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 w-28"
          placeholder="2024/2025" />
      </div>

      {/* Fees list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div>
        ) : fees.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No fee records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase text-left">
                  <th className="py-3 px-4">Fee Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Term</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.map(f => {
                  const bal = f.amount - (f.paid_amount ?? 0);
                  return (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{f.fee_type}</td>
                      <td className="py-3 px-4 text-gray-700">{fmt(f.amount)}</td>
                      <td className="py-3 px-4 text-green-600 font-medium">{fmt(f.paid_amount ?? 0)}</td>
                      <td className={`py-3 px-4 font-medium ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(bal)}</td>
                      <td className="py-3 px-4 text-gray-500">{new Date(f.due_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-gray-500">{f.term}</td>
                      <td className="py-3 px-4">
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${STATUS_STYLE[f.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_ICON[f.status]} {f.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
