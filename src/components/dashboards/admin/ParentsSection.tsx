import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, X, Link2, Edit2, Trash2, Copy, Check, Key, UserCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, ParentRow } from '../../../lib/supabase';

interface ParentWithProfile extends ParentRow {
  profiles: { first_name: string; last_name: string; email: string; phone: string | null; user_id: string } | null;
  children?: { id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }[];
}

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const RELATIONSHIPS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Sibling', 'Other'];

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', occupation: '', address: '', relationship: 'Parent' };

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = 'T';
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass + '!';
};

export default function ParentsSection({ profile: _profile }: Props) {
  const [parents, setParents] = useState<ParentWithProfile[]>([]);
  const [students, setStudents] = useState<{ id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState<{ email: string; password: string; title: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<ParentWithProfile | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  // Link modal (multi-select)
  const [showLink, setShowLink] = useState<ParentWithProfile | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkSelected, setLinkSelected] = useState<Set<string>>(new Set());
  const [linkPrimary, setLinkPrimary] = useState<string | null>(null);
  const [linkSaving, setLinkSaving] = useState(false);

  // Reset password
  const [resetTarget, setResetTarget] = useState<ParentWithProfile | null>(null);
  const [resetSaving, setResetSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ParentWithProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: parentData } = await supabase.from('parents')
      .select('*, profiles:profile_id(first_name, last_name, email, phone, user_id)')
      .order('created_at', { ascending: false });
    const { data: studentData } = await supabase.from('students')
      .select('id, student_id, profiles:profile_id(first_name, last_name)')
      .eq('is_active', true);
    const { data: links } = await supabase.from('student_parents').select('parent_id, student_id');

    const withChildren = (parentData || []).map((p: ParentWithProfile) => {
      const childIds = (links || []).filter((l: { parent_id: string }) => l.parent_id === p.id).map((l: { student_id: string }) => l.student_id);
      const children = (studentData || []).filter((s: { id: string }) => childIds.includes(s.id));
      return { ...p, children };
    });
    setParents(withChildren);
    setStudents((studentData || []) as { id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = parents.filter(p => {
    const name = `${p.profiles?.first_name} ${p.profiles?.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || p.profiles?.email?.toLowerCase().includes(search.toLowerCase());
  });

  // ── Add Parent ────────────────────────────────────────────────────────
  const addParent = async () => {
    if (!form.first_name || !form.last_name || !form.email) return setToast({ msg: 'First name, last name and email are required', type: 'error' });
    setSaving(true);
    try {
      const tempPassword = generateTempPassword();
      const { data: userId, error: fnError } = await supabase.rpc('admin_create_user', {
        user_email: form.email,
        user_password: tempPassword,
        user_first_name: form.first_name,
        user_last_name: form.last_name,
      });
      if (fnError) throw fnError;
      const { data: prof, error: pErr } = await supabase.from('profiles').insert({
        user_id: userId,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        role: 'parent',
      }).select().single();
      if (pErr) throw pErr;
      await supabase.from('parents').insert({
        profile_id: prof.id,
        occupation: form.occupation || null,
        address: form.address || null,
        relationship_to_student: form.relationship || 'Parent',
      });
      setShowAdd(false);
      setForm(emptyForm);
      setCredentialsModal({ email: form.email, password: tempPassword, title: 'Login credentials for new parent' });
      fetchData();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Failed to add parent';
      setToast({ msg: msg.includes('already exists') || msg.includes('already registered') ? 'A user with this email already exists' : msg, type: 'error' });
    }
    setSaving(false);
  };

  // ── Edit Parent ───────────────────────────────────────────────────────
  const openEdit = (p: ParentWithProfile) => {
    setEditTarget(p);
    setEditForm({
      first_name: p.profiles?.first_name || '',
      last_name: p.profiles?.last_name || '',
      email: p.profiles?.email || '',
      phone: p.profiles?.phone || '',
      occupation: p.occupation || '',
      address: p.address || '',
      relationship: p.relationship_to_student || 'Parent',
    });
  };

  const updateParent = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await supabase.from('profiles').update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone || null,
      }).eq('id', editTarget.profile_id);
      await supabase.from('parents').update({
        occupation: editForm.occupation || null,
        address: editForm.address || null,
        relationship_to_student: editForm.relationship || 'Parent',
      }).eq('id', editTarget.id);
      setToast({ msg: 'Parent updated', type: 'success' });
      setEditTarget(null);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: (e as { message?: string })?.message || 'Update failed', type: 'error' });
    }
    setEditSaving(false);
  };

  // ── Delete Parent (also removes auth user) ────────────────────────────
  const deleteParent = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const authUserId = deleteTarget.profiles?.user_id;
      await supabase.from('student_parents').delete().eq('parent_id', deleteTarget.id);
      await supabase.from('parents').delete().eq('id', deleteTarget.id);
      await supabase.from('profiles').delete().eq('id', deleteTarget.profile_id);
      // Remove auth.users record so the email can be reused
      if (authUserId) {
        await supabase.rpc('admin_delete_user', { target_user_id: authUserId });
      }
      setToast({ msg: 'Parent deleted', type: 'success' });
      setDeleteTarget(null);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: (e as { message?: string })?.message || 'Delete failed', type: 'error' });
    }
    setDeleting(false);
  };

  // ── Multi-select Link Students ─────────────────────────────────────────
  const openLink = (p: ParentWithProfile) => {
    setShowLink(p);
    setLinkSearch('');
    setLinkSelected(new Set());
    setLinkPrimary(null);
  };

  const toggleLinkStudent = (id: string) => {
    setLinkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const linkParentToStudents = async () => {
    if (!showLink || linkSelected.size === 0) return;
    setLinkSaving(true);
    try {
      const rows = Array.from(linkSelected).map(student_id => ({
        parent_id: showLink.id, student_id, is_primary: student_id === linkPrimary,
      }));
      await supabase.from('student_parents').upsert(rows, { onConflict: 'student_id,parent_id' });
      setToast({ msg: `Linked ${linkSelected.size} student${linkSelected.size > 1 ? 's' : ''}`, type: 'success' });
      setShowLink(null);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: (e as { message?: string })?.message || 'Link failed', type: 'error' });
    }
    setLinkSaving(false);
  };

  const unlink = async (parentId: string, studentId: string) => {
    await supabase.from('student_parents').delete().eq('parent_id', parentId).eq('student_id', studentId);
    fetchData();
  };

  // ── Reset Password ────────────────────────────────────────────────────
  const resetPassword = async () => {
    if (!resetTarget?.profiles?.user_id) return;
    setResetSaving(true);
    try {
      const newPassword = generateTempPassword();
      await supabase.rpc('admin_reset_password', {
        target_user_id: resetTarget.profiles.user_id,
        new_password: newPassword,
      });
      setResetTarget(null);
      setCredentialsModal({
        email: resetTarget.profiles.email,
        password: newPassword,
        title: `New password for ${resetTarget.profiles.first_name} ${resetTarget.profiles.last_name}`,
      });
    } catch (e: unknown) {
      setToast({ msg: (e as { message?: string })?.message || 'Password reset failed', type: 'error' });
    }
    setResetSaving(false);
  };

  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Filtered unlinked students for link modal
  const linkedIds = new Set((showLink?.children || []).map((c: { id: string }) => c.id));
  const linkableStudents = students
    .filter(s => !linkedIds.has(s.id))
    .filter(s => !linkSearch || `${s.profiles?.first_name} ${s.profiles?.last_name} ${s.student_id}`.toLowerCase().includes(linkSearch.toLowerCase()));

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-amber-500" /> Parents
        </h2>
        <button onClick={() => { setForm(emptyForm); setShowAdd(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add Parent
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Parents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Parent</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Relationship</th>
                  <th className="py-3 px-4">Children Linked</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs flex-shrink-0">
                          {p.profiles?.first_name?.[0]}{p.profiles?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{p.profiles?.first_name} {p.profiles?.last_name}</p>
                          {p.occupation && <p className="text-xs text-gray-400">{p.occupation}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600">
                      <p>{p.profiles?.email}</p>
                      {p.profiles?.phone && <p className="text-gray-400">{p.profiles.phone}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                        {p.relationship_to_student || 'Parent'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {(p.children || []).length === 0 ? (
                        <span className="text-gray-400 text-xs italic">None linked</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(p.children || []).map((c: { id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }) => (
                            <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">
                              {c.profiles?.first_name} {c.profiles?.last_name}
                              <button type="button" onClick={() => unlink(p.id, c.id)} className="text-red-400 hover:text-red-600 ml-0.5" title="Unlink">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => openLink(p)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500" title="Link students"><Link2 className="w-4 h-4" /></button>
                        <button onClick={() => setResetTarget(p)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Reset password"><Key className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{search ? 'No parents match your search' : 'No parents yet — click Add Parent to get started'}</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Parent Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">Add New Parent</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Relationship to Child</label>
                <select value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Occupation</label>
                <input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Home Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={addParent} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create Account'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Credentials Modal (shared for create + reset) ── */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCredentialsModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-gray-800">{credentialsModal.title}</h3>
              </div>
              <button onClick={() => setCredentialsModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
                Save these credentials — the password cannot be retrieved later.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <div className="flex gap-2">
                  <input readOnly value={credentialsModal.email} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono" />
                  <button onClick={() => copyToClipboard(credentialsModal.email, 'email')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700">
                    {copiedField === 'email' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                <div className="flex gap-2">
                  <input readOnly value={credentialsModal.password} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono" />
                  <button onClick={() => copyToClipboard(credentialsModal.password, 'password')} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                    {copiedField === 'password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedField === 'password' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100">
              <button onClick={() => setCredentialsModal(null)} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">Edit Parent</h3>
              <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                  <input value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                  <input value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email (read-only)</label>
                <input readOnly value={editForm.email} className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Relationship to Child</label>
                <select value={editForm.relationship} onChange={e => setEditForm(f => ({ ...f, relationship: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Occupation</label>
                <input value={editForm.occupation} onChange={e => setEditForm(f => ({ ...f, occupation: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Home Address</label>
                <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={updateParent} disabled={editSaving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{editSaving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Multi-select Link Modal ── */}
      {showLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowLink(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">Link Students</h3>
                <p className="text-xs text-gray-500 mt-0.5">{showLink.profiles?.first_name} {showLink.profiles?.last_name}</p>
              </div>
              <button onClick={() => setShowLink(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Search students..."
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {linkSelected.size > 0 && (
                <p className="text-xs text-indigo-600 font-medium mt-2">{linkSelected.size} student{linkSelected.size > 1 ? 's' : ''} selected</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {linkableStudents.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">
                  {students.filter(s => !linkedIds.has(s.id)).length === 0 ? 'All active students are already linked' : 'No students match your search'}
                </p>
              ) : (
                linkableStudents.map(s => {
                  const checked = linkSelected.has(s.id);
                  const isPrimary = linkPrimary === s.id;
                  return (
                    <div key={s.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${checked ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                      <button onClick={() => toggleLinkStudent(s.id)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                          {checked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                          <p className="text-xs text-gray-400">{s.student_id}</p>
                        </div>
                      </button>
                      {checked && (
                        <button
                          onClick={() => setLinkPrimary(isPrimary ? null : s.id)}
                          className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${isPrimary ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-300 text-gray-400 hover:border-amber-400 hover:text-amber-600'}`}
                          title="Mark as primary parent">
                          {isPrimary ? '★ Primary' : '☆ Primary'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {/* Also show already-linked children */}
            {(showLink.children || []).length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Already linked:</p>
                <div className="flex flex-wrap gap-1">
                  {(showLink.children || []).map((c: { id: string; student_id: string; profiles: { first_name: string; last_name: string } | null }) => (
                    <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      <Check className="w-3 h-3" />
                      {c.profiles?.first_name} {c.profiles?.last_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 p-4 border-t border-gray-100">
              <button onClick={() => setShowLink(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={linkParentToStudents} disabled={linkSelected.size === 0 || linkSaving}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {linkSaving ? 'Linking...' : `Link ${linkSelected.size > 0 ? linkSelected.size + ' ' : ''}Student${linkSelected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Confirm ── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setResetTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Reset Password</h3>
                <p className="text-xs text-gray-500">{resetTarget.profiles?.first_name} {resetTarget.profiles?.last_name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              This will generate a new temporary password. The parent will need to use it on their next login. The current password will stop working immediately.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResetTarget(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700">Cancel</button>
              <button onClick={resetPassword} disabled={resetSaving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {resetSaving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-center mb-1">Delete Parent Account</h3>
            <p className="text-sm text-gray-600 text-center mb-5">
              Delete <span className="font-semibold">{deleteTarget.profiles?.first_name} {deleteTarget.profiles?.last_name}</span>?
              This removes their student links, profile, and login access permanently. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700">Cancel</button>
              <button onClick={deleteParent} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
