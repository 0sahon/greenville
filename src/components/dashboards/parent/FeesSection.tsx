import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, FeeRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface FeeWithStudent extends FeeRow {
  students?: { profiles?: { first_name: string; last_name: string } } | null;
}
interface StudentParentLink { student_id: string }

export default function FeesSection({ profile }: Props) {
  const [fees, setFees] = useState<FeeWithStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: parent } = await supabase.from('parents').select('id').eq('profile_id', profile.id).maybeSingle();
      if (!parent) { setLoading(false); return; }
      const { data: links } = await supabase.from('student_parents').select('student_id').eq('parent_id', parent.id);
      const ids = (links || []).map((l: StudentParentLink) => l.student_id);
      if (ids.length > 0) {
        const { data } = await supabase.from('fees').select('*, students:student_id(profiles:profile_id(first_name,last_name))').in('student_id', ids).order('due_date', { ascending: false });
        setFees((data || []) as FeeWithStudent[]);
      }
      setLoading(false);
    })();
  }, [profile.id]);

  const statusColor: Record<string, string> = { paid: 'bg-green-100 text-green-700', partial: 'bg-blue-100 text-blue-700', pending: 'bg-yellow-100 text-yellow-700', overdue: 'bg-red-100 text-red-700' };
  const total = fees.reduce((s, f) => s + (f.amount - (f.paid_amount ?? 0)), 0);

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Fees & Payments</h2>
      {total > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-orange-800 font-semibold">Total Outstanding: <span className="text-xl">₦{total.toLocaleString()}</span></p>
          <p className="text-orange-600 text-sm mt-1">Please contact the school bursary to make payments.</p>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase bg-gray-50">
              <th className="py-3 px-4">Student</th><th className="py-3 px-4">Fee Type</th><th className="py-3 px-4">Amount (₦)</th><th className="py-3 px-4">Paid (₦)</th><th className="py-3 px-4">Balance</th><th className="py-3 px-4">Due Date</th><th className="py-3 px-4">Status</th>
            </tr></thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{f.students?.profiles?.first_name} {f.students?.profiles?.last_name}</td>
                  <td className="py-3 px-4 text-gray-600">{f.fee_type}</td>
                  <td className="py-3 px-4 font-medium">₦{Number(f.amount).toLocaleString()}</td>
                  <td className="py-3 px-4 text-green-600">₦{Number(f.paid_amount ?? 0).toLocaleString()}</td>
                  <td className="py-3 px-4 font-medium text-red-600">₦{(f.amount - (f.paid_amount ?? 0)).toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(f.due_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[f.status]}`}>{f.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {fees.length === 0 && <p className="text-center py-10 text-gray-400">No fee records found</p>}
        </div>
      </div>
    </div>
  );
}
