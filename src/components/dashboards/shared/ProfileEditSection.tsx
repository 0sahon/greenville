import { useState, useEffect } from 'react';
import { Save, X, KeyRound, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, UserRole } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
};

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const ROLE_GRADIENT: Record<UserRole, string> = {
  admin:   'from-indigo-400 to-indigo-600',
  teacher: 'from-blue-400 to-blue-600',
  parent:  'from-purple-400 to-purple-600',
  student: 'from-pink-400 to-pink-600',
};

export default function ProfileEditSection({ profile }: Props) {
  const [firstName, setFirstName] = useState(profile.first_name || '');
  const [lastName, setLastName] = useState(profile.last_name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      return setToast({ msg: 'First name and last name are required', type: 'error' });
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
      setToast({ msg: 'Profile updated successfully', type: 'success' });
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed to save', type: 'error' });
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPw.length < 8) return setToast({ msg: 'Password must be at least 8 characters', type: 'error' });
    if (newPw !== confirmPw) return setToast({ msg: 'Passwords do not match', type: 'error' });
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setNewPw('');
      setConfirmPw('');
      setToast({ msg: 'Password changed successfully', type: 'success' });
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed to change password', type: 'error' });
    }
    setPwSaving(false);
  };

  const gradientClass = ROLE_GRADIENT[profile.role] || 'from-gray-400 to-gray-600';

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <h2 className="text-xl font-bold text-gray-900">My Profile</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-5 mb-8">
          <div className={`w-20 h-20 bg-gradient-to-r ${gradientClass} rounded-full flex items-center justify-center text-white font-bold text-3xl flex-shrink-0`}>
            {(firstName[0] || profile.first_name?.[0] || '?')}{(lastName[0] || profile.last_name?.[0] || '')}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{firstName || profile.first_name} {lastName || profile.last_name}</h3>
            <p className="text-gray-500 text-sm">{ROLE_LABELS[profile.role]}</p>
            <p className="text-gray-400 text-xs mt-0.5">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-4 max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Read-only fields */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Email (read-only)</p>
              <p className="text-sm text-gray-700">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Role (read-only)</p>
              <p className="text-sm text-gray-700">{ROLE_LABELS[profile.role]}</p>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800">Change Password</h3>
        </div>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Password *</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={changePassword}
            disabled={pwSaving || !newPw || !confirmPw}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
