import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, SchoolSettingsRow } from '../../../lib/supabase';
import { SCHOOL_NAME } from '../../../config/schoolBrand';

const ALL_TABLES = [
  'profiles', 'classes', 'students', 'teachers', 'parents', 'student_parents',
  'attendance', 'grades', 'fees', 'fee_templates', 'announcements', 'courses', 'assignments',
  'submissions', 'course_materials', 'events', 'health_records', 'transport', 'school_settings',
  'subjects', 'result_sheets', 'cbt_exams', 'cbt_questions', 'cbt_sessions', 'cbt_answers',
  'timetable', 'messages', 'admission_applications',
] as const;

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

type SettingsMap = Record<string, string | string[]>;

export default function SettingsSection({ profile: _profile }: Props) {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [showDbStatus, setShowDbStatus] = useState(false);

  const fetchSettings = async () => {
    const { data } = await supabase.from('school_settings').select('key, value');
    const map: SettingsMap = {};
    (data as unknown as SchoolSettingsRow[] || []).forEach((row: SchoolSettingsRow) => {
      const v = row.value;
      map[row.key] = Array.isArray(v) ? (v as string[]) : (typeof v === 'string' ? v : String(v ?? ''));
    });
    setSettings(map);
  };

  const fetchTableCounts = async () => {
    const counts: Record<string, number> = {};
    for (const tbl of ALL_TABLES) {
      try {
        const { count } = await (supabase as unknown as { from: (t: string) => { select: (a: string, b: { count: 'exact'; head: true }) => Promise<{ count: number | null }> } }).from(tbl).select('*', { count: 'exact', head: true });
        counts[tbl] = count ?? 0;
      } catch {
        counts[tbl] = -1;
      }
    }
    setTableCounts(counts);
  };

  useEffect(() => {
    setLoading(true);
    fetchSettings().finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const schoolName = (settings.school_name as string) ?? SCHOOL_NAME;
    const academicYear = (settings.current_academic_year as string) ?? '2024/2025';
    const terms = Array.isArray(settings.terms) ? settings.terms : ['First Term', 'Second Term', 'Third Term'];
    const currency = (settings.currency as string) ?? '₦';
    try {
      await Promise.all([
        supabase.from('school_settings').upsert({ key: 'school_name', value: schoolName as unknown as object }, { onConflict: 'key' }),
        supabase.from('school_settings').upsert({ key: 'current_academic_year', value: academicYear as unknown as object }, { onConflict: 'key' }),
        supabase.from('school_settings').upsert({ key: 'terms', value: terms as unknown as object }, { onConflict: 'key' }),
        supabase.from('school_settings').upsert({ key: 'currency', value: currency as unknown as object }, { onConflict: 'key' }),
      ]);
      setSettings(s => ({ ...s, school_name: schoolName, current_academic_year: academicYear, terms, currency }));
      setToast({ msg: 'Settings saved', type: 'success' });
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Save failed', type: 'error' });
    }
    setSaving(false);
  };

  const addTerm = () => {
    const terms = Array.isArray(settings.terms) ? [...settings.terms] : ['First Term', 'Second Term', 'Third Term'];
    terms.push('New Term');
    setSettings(s => ({ ...s, terms }));
  };

  const updateTerm = (i: number, v: string) => {
    const terms = Array.isArray(settings.terms) ? [...settings.terms] : ['First Term', 'Second Term', 'Third Term'];
    terms[i] = v;
    setSettings(s => ({ ...s, terms }));
  };

  const removeTerm = (i: number) => {
    const terms = Array.isArray(settings.terms) ? [...settings.terms] : ['First Term', 'Second Term', 'Third Term'];
    terms.splice(i, 1);
    setSettings(s => ({ ...s, terms }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const terms = Array.isArray(settings.terms) ? settings.terms : ['First Term', 'Second Term', 'Third Term'];

  return (
    <div className="space-y-8">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500" />
          Settings
        </h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">School configuration</h3>
          <p className="text-sm text-gray-500 mt-0.5">Configure academic year, terms, and display options.</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">School name</label>
            <input
              value={(settings.school_name as string) ?? ''}
              onChange={e => setSettings(s => ({ ...s, school_name: e.target.value }))}
              className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={SCHOOL_NAME}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current academic year</label>
            <input
              value={(settings.current_academic_year as string) ?? ''}
              onChange={e => setSettings(s => ({ ...s, current_academic_year: e.target.value }))}
              className="w-full max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="2024/2025"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Terms</label>
            <div className="flex flex-wrap gap-2 items-center">
              {terms.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={t}
                    onChange={e => updateTerm(i, e.target.value)}
                    className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => removeTerm(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addTerm} className="flex items-center gap-1 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600">
                <Plus className="w-4 h-4" /> Add term
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Currency symbol</label>
            <input
              value={(settings.currency as string) ?? ''}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="₦"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => { setShowDbStatus(!showDbStatus); if (!showDbStatus) fetchTableCounts(); }}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-800">Database sync status</h3>
          </div>
          <span className="text-sm text-gray-500">{showDbStatus ? 'Hide' : 'Show'} {ALL_TABLES.length} tables</span>
        </button>
        {showDbStatus && (
          <div className="border-t border-gray-100 p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
              {ALL_TABLES.map(tbl => (
                <div key={tbl} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="font-mono text-gray-700">{tbl}</span>
                  <span className={`font-medium ${tableCounts[tbl] === undefined ? 'text-gray-400' : tableCounts[tbl] >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tableCounts[tbl] === undefined ? '—' : tableCounts[tbl] >= 0 ? tableCounts[tbl] : 'err'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
