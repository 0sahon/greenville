import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, AuditEventRow } from '../../../lib/supabase';

interface Props {
  profile: ProfileRow;
}

export default function AdminAuditSection({ profile }: Props) {
  const [rows, setRows] = useState<AuditEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qe } = await supabase
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(250);
      if (cancelled) return;
      if (qe) setError(qe.message);
      else setRows((data || []) as AuditEventRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-6 h-6 text-slate-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Audit log</h2>
          <p className="text-sm text-gray-500">Recent lesson plan and class material changes (inspection trail).</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-14 text-gray-400 border border-gray-100 rounded-xl bg-white text-sm">No audit entries yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="py-3 px-3">When</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-3">Actor profile</th>
                <th className="py-3 px-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                  <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString('en-NG')}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-800">{r.action}</td>
                  <td className="py-2 px-3 text-xs">
                    <span className="text-gray-600">{r.entity_type}</span>
                    {r.entity_id && <span className="block text-[10px] text-gray-400 truncate max-w-[120px]">{r.entity_id}</span>}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-600 font-mono break-all max-w-[140px]">
                    {r.actor_profile_id ? r.actor_profile_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-600 max-w-md">
                    <pre className="whitespace-pre-wrap break-words font-sans text-[11px]">
                      {r.details ? JSON.stringify(r.details, null, 0) : '—'}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
