import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, ToggleLeft, ToggleRight, Download, X, ChevronLeft, ChevronRight, Copy, Check, KeyRound } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, TeacherRow } from '../../../lib/supabase';

interface TeacherWithRelations extends TeacherRow {
  profiles: Pick<ProfileRow, 'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'user_id'> | null;
}

interface TeacherForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  qualification: string;
  specialization: string;
  hire_date: string;
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

function TeacherModal({ title, onClose, onSave, saving, children }: { title: string; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function TeacherFormField({ label, field, type = 'text', required = false, form, setForm }: { label: string; field: keyof TeacherForm; type?: string; required?: boolean; form: TeacherForm; setForm: React.Dispatch<React.SetStateAction<TeacherForm>> }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && ' *'}</label>
      <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
    </div>
  );
}

const emptyForm: TeacherForm = { first_name: '', last_name: '', email: '', phone: '', qualification: '', specialization: '', hire_date: '' };

export default function TeachersSection({ profile }: Props) {
  const [teachers, setTeachers] = useState<TeacherWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [viewTeacher, setViewTeacher] = useState<TeacherWithRelations | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<TeacherWithRelations | null>(null);
  const PER_PAGE = 10;

  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState<{ email: string; password: string; title?: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);
  const [resetTarget, setResetTarget] = useState<TeacherWithRelations | null>(null);
  const [resetSaving, setResetSaving] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    const { data } = await supabase.from('teachers')
      .select('*, profiles:profile_id(id, first_name, last_name, email, phone, user_id)')
      .order('created_at', { ascending: false });
    setTeachers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTeachers(); }, []);

  const filtered = teachers.filter(t => {
    const name = `${t.profiles?.first_name} ${t.profiles?.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || t.employee_id?.toLowerCase().includes(search.toLowerCase());
  });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const generateEmployeeId = () => `TCH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

  const generateTempPassword = () => `Temp${Math.random().toString(36).slice(2, 12)}!`;

  const addTeacher = async () => {
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
        role: 'teacher',
      }).select().single();
      if (pErr) throw pErr;
      const { error: tErr } = await supabase.from('teachers').insert({
        profile_id: prof.id,
        employee_id: generateEmployeeId(),
        qualification: form.qualification || null,
        specialization: form.specialization || null,
        hire_date: form.hire_date || new Date().toISOString().split('T')[0],
      });
      if (tErr) throw tErr;
      setShowAdd(false);
      setForm(emptyForm);
      setCredentialsModal({ email: form.email, password: tempPassword });
      fetchTeachers();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Failed to add teacher';
      setToast({ msg: msg.includes('already registered') || msg.includes('already exists') ? 'A user with this email already exists' : msg, type: 'error' });
    }
    setSaving(false);
  };

  const updateTeacher = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || null,
      }).eq('id', editTarget.profile_id);
      await supabase.from('teachers').update({
        qualification: form.qualification || null, specialization: form.specialization || null,
        hire_date: form.hire_date || null,
      }).eq('id', editTarget.id);
      setToast({ msg: 'Teacher updated', type: 'success' });
      setShowEdit(false); fetchTeachers();
    } catch (e: unknown) { setToast({ msg: (e as { message?: string })?.message || 'Update failed', type: 'error' }); }
    setSaving(false);
  };

  const toggleActive = async (t: TeacherRow) => {
    await supabase.from('teachers').update({ is_active: !t.is_active }).eq('id', t.id);
    setToast({ msg: `Teacher ${!t.is_active ? 'activated' : 'deactivated'}`, type: 'success' });
    fetchTeachers();
  };

  const exportCSV = () => {
    const rows = [['Employee ID', 'First Name', 'Last Name', 'Email', 'Qualification', 'Specialization', 'Hire Date', 'Status']];
    filtered.forEach(t => rows.push([t.employee_id ?? '', t.profiles?.first_name ?? '', t.profiles?.last_name ?? '', t.profiles?.email ?? '', t.qualification ?? '', t.specialization ?? '', t.hire_date ?? '', t.is_active ? 'Active' : 'Inactive']));
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = 'teachers.csv'; a.click();
  };

  const openEdit = (t: TeacherWithRelations) => {
    setEditTarget(t);
    setForm({
      first_name: t.profiles?.first_name || '', last_name: t.profiles?.last_name || '', email: t.profiles?.email || '', phone: t.profiles?.phone || '',
      qualification: t.qualification || '', specialization: t.specialization || '', hire_date: t.hire_date || '',
    });
    setShowEdit(true);
  };

  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const resetPassword = async () => {
    if (!resetTarget?.profiles?.user_id) return;
    setResetSaving(true);
    try {
      const newPassword = generateTempPassword();
      const { error } = await supabase.rpc('admin_reset_password', {
        target_user_id: resetTarget.profiles.user_id,
        new_password: newPassword,
      });
      if (error) throw error;
      const name = `${resetTarget.profiles.first_name} ${resetTarget.profiles.last_name}`;
      const email = resetTarget.profiles.email;
      setResetTarget(null);
      setCredentialsModal({ email, password: newPassword, title: `New password for ${name}` });
    } catch (e: unknown) {
      setToast({ msg: (e as { message?: string })?.message || 'Password reset failed', type: 'error' });
    }
    setResetSaving(false);
  };

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Teachers</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => { setForm(emptyForm); setShowAdd(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"><Plus className="w-4 h-4" /> Add Teacher</button>
        </div>
      </div>
      <div className="relative flex-1 min-w-48 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Search by name or employee ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-green-300 border-t-green-600 rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="py-3 px-4">Teacher</th><th className="py-3 px-4">Employee ID</th><th className="py-3 px-4">Qualification</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(t => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-xs flex-shrink-0">
                            {t.profiles?.first_name?.[0]}{t.profiles?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{t.profiles?.first_name} {t.profiles?.last_name}</p>
                            <p className="text-xs text-gray-400">{t.profiles?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-500">{t.employee_id}</td>
                      <td className="py-3 px-4 text-gray-600">{t.qualification || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewTeacher(t)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-500" title="View"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setResetTarget(t)} className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500" title="Reset Password"><KeyRound className="w-4 h-4" /></button>
                          <button onClick={() => toggleActive(t)} className={`p-1.5 rounded-lg ${t.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'}`} title={t.is_active ? 'Deactivate' : 'Activate'}>
                            {t.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No teachers found</td></tr>}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 rounded-lg text-xs font-medium ${page === n ? 'bg-green-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>{n}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {viewTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewTeacher(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">Teacher Details</h3>
              <button onClick={() => setViewTeacher(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-2xl">
                  {viewTeacher.profiles?.first_name?.[0]}{viewTeacher.profiles?.last_name?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">{viewTeacher.profiles?.first_name} {viewTeacher.profiles?.last_name}</h4>
                  <p className="text-gray-500 font-mono text-sm">{viewTeacher.employee_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[['Email', viewTeacher.profiles?.email], ['Phone', viewTeacher.profiles?.phone || '—'], ['Qualification', viewTeacher.qualification || '—'], ['Specialization', viewTeacher.specialization || '—'], ['Hire Date', viewTeacher.hire_date || '—'], ['Status', viewTeacher.is_active ? 'Active' : 'Inactive']].map(([k, v]) => (
                  <div key={k}><p className="text-xs text-gray-400 uppercase font-medium">{k}</p><p className="text-gray-700 font-medium mt-0.5">{v}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setResetTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-5">Generate a new temporary password for <span className="font-semibold">{resetTarget.profiles?.first_name} {resetTarget.profiles?.last_name}</span>? Share it with them so they can log in.</p>
            <div className="flex gap-3">
              <button onClick={() => setResetTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={resetPassword} disabled={resetSaving} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">{resetSaving ? 'Resetting...' : 'Reset Password'}</button>
            </div>
          </div>
        </div>
      )}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCredentialsModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">{credentialsModal.title ?? 'Login credentials for new teacher'}</h3>
              <button onClick={() => setCredentialsModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Save these credentials. The password cannot be retrieved later.</p>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <div className="flex gap-2">
                  <input readOnly value={credentialsModal.email} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono" />
                  <button type="button" onClick={() => copyToClipboard(credentialsModal.email, 'email')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700">
                    {copiedField === 'email' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Temporary password</label>
                <div className="flex gap-2">
                  <input readOnly value={credentialsModal.password} type="text" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono" />
                  <button type="button" onClick={() => copyToClipboard(credentialsModal.password, 'password')} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                    {copiedField === 'password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedField === 'password' ? 'Copied' : 'Copy password'}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100">
              <button onClick={() => setCredentialsModal(null)} className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">Done</button>
            </div>
          </div>
        </div>
      )}
      {showAdd && (
        <TeacherModal title="Add New Teacher" onClose={() => setShowAdd(false)} onSave={addTeacher} saving={saving}>
          <div className="grid grid-cols-2 gap-3"><TeacherFormField label="First Name" field="first_name" required form={form} setForm={setForm} /><TeacherFormField label="Last Name" field="last_name" required form={form} setForm={setForm} /></div>
          <TeacherFormField label="Email" field="email" type="email" required form={form} setForm={setForm} />
          <TeacherFormField label="Phone" field="phone" form={form} setForm={setForm} />
          <TeacherFormField label="Qualification" field="qualification" form={form} setForm={setForm} />
          <TeacherFormField label="Specialization" field="specialization" form={form} setForm={setForm} />
          <TeacherFormField label="Hire Date" field="hire_date" type="date" form={form} setForm={setForm} />
        </TeacherModal>
      )}
      {showEdit && (
        <TeacherModal title="Edit Teacher" onClose={() => setShowEdit(false)} onSave={updateTeacher} saving={saving}>
          <div className="grid grid-cols-2 gap-3"><TeacherFormField label="First Name" field="first_name" required form={form} setForm={setForm} /><TeacherFormField label="Last Name" field="last_name" required form={form} setForm={setForm} /></div>
          <TeacherFormField label="Email" field="email" type="email" required form={form} setForm={setForm} />
          <TeacherFormField label="Phone" field="phone" form={form} setForm={setForm} />
          <TeacherFormField label="Qualification" field="qualification" form={form} setForm={setForm} />
          <TeacherFormField label="Specialization" field="specialization" form={form} setForm={setForm} />
          <TeacherFormField label="Hire Date" field="hire_date" type="date" form={form} setForm={setForm} />
        </TeacherModal>
      )}
    </div>
  );
}
