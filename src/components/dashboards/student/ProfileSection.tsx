import { useState, useEffect } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useStudentData } from './useStudentData';
import type { ProfileRow, ClassLevel } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const LEVEL_LABELS: Record<ClassLevel, string> = { creche: 'Creche', basic1: 'Basic 1', basic2: 'Basic 2', basic3: 'Basic 3', basic4: 'Basic 4', basic5: 'Basic 5', basic6: 'Basic 6' };

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function ProfileSection({ profile }: Props) {
  const { student, loading, error } = useStudentData(profile.id);
  const [firstName, setFirstName] = useState(profile.first_name || '');
  const [lastName, setLastName] = useState(profile.last_name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      return setToast({ msg: 'First name and last name are required', type: 'error' });
    }
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (err) throw err;
      setToast({ msg: 'Profile updated', type: 'success' });
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed to save', type: 'error' });
    }
    setSaving(false);
  };

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
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-3xl">
            {(firstName[0] || profile.first_name?.[0] || '?')}{lastName[0] || profile.last_name?.[0] || ''}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{firstName || profile.first_name} {lastName || profile.last_name}</h3>
            <p className="text-gray-500">Student · {student?.classes?.name || 'Not assigned'}</p>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-3 mb-6 max-w-md">
          <p className="text-xs font-semibold text-gray-500 uppercase">Edit Profile</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 08012345678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
          </div>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Read-only student details */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Student Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ['Student ID', student?.student_id],
              ['Class', student?.classes?.name],
              ['Level', (student?.classes?.level != null ? LEVEL_LABELS[student.classes.level] : null) || '—'],
              ['Email', profile.email],
              ['Gender', student?.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'Not provided'],
              ['Date of Birth', student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'Not provided'],
              ['Enrollment Date', student?.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : 'Not provided'],
              ['Address', student?.address || 'Not provided'],
              ['Emergency Contact', student?.emergency_contact || 'Not provided'],
              ['Emergency Phone', student?.emergency_phone || 'Not provided'],
            ] as [string, string | null | undefined][]).map(([label, value]) => (
              <div key={label} className="border-b border-gray-50 pb-3">
                <p className="text-xs text-gray-400 uppercase font-medium mb-1">{label}</p>
                <p className="text-gray-800 font-medium text-sm">{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
