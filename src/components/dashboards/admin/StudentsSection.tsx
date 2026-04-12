import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, ToggleLeft, ToggleRight, Download, X, ChevronLeft, ChevronRight, Copy, Check, KeyRound } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, StudentRow, ClassRow, ClassLevel, StudentGender } from '../../../lib/supabase';

interface StudentWithRelations extends StudentRow {
  profiles: Pick<ProfileRow, 'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'user_id'> | null;
  classes: Pick<ClassRow, 'name' | 'level'> | null;
}

interface StudentForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: '' | StudentGender;
  date_of_birth: string;
  class_id: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
}

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

function StudentModal({ title, onClose, onSave, saving, children }: { title: string; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode }) {
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
          <button onClick={onSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function StudentFormField({ label, field, type = 'text', required = false, form, setForm }: { label: string; field: keyof StudentForm; type?: string; required?: boolean; form: StudentForm; setForm: React.Dispatch<React.SetStateAction<StudentForm>> }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && ' *'}</label>
      <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value } as StudentForm))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

const emptyForm: StudentForm = { first_name: '', last_name: '', email: '', phone: '', gender: '', date_of_birth: '', class_id: '', address: '', emergency_contact: '', emergency_phone: '' };

export default function StudentsSection({ profile: _profile }: Props) {
  const [students, setStudents] = useState<StudentWithRelations[]>([]);
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name' | 'level'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [viewStudent, setViewStudent] = useState<StudentWithRelations | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<StudentWithRelations | null>(null);
  const PER_PAGE = 10;

  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState<{ email: string; password: string; title?: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);
  const [resetTarget, setResetTarget] = useState<StudentWithRelations | null>(null);
  const [resetSaving, setResetSaving] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    const { data } = await supabase.from('students')
      .select('*, profiles:profile_id(id, first_name, last_name, email, phone, user_id), classes:class_id(name, level)')
      .order('created_at', { ascending: false });
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
    supabase.from('classes').select('id, name, level').then(({ data }) => setClasses(data || []));
  }, []);

  const filtered = students.filter(s => {
    const name = `${s.profiles?.first_name} ${s.profiles?.last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || s.student_id?.toLowerCase().includes(search.toLowerCase());
    const matchClass = !filterClass || s.class_id === filterClass;
    return matchSearch && matchClass;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const num = String(Math.floor(Math.random() * 900) + 100);
    return `QFS-${year}-${num}`;
  };

  const generateTempPassword = () => `Temp${Math.random().toString(36).slice(2, 12)}!`;

  const addStudent = async () => {
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
      const { data: profile, error: pErr } = await supabase.from('profiles').insert({
        user_id: userId,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        role: 'student',
      }).select().single();
      if (pErr) throw pErr;
      const { error: sErr } = await supabase.from('students').insert({
        profile_id: profile.id,
        student_id: generateStudentId(),
        class_id: form.class_id || null,
        gender: (form.gender || null) as StudentRow['gender'],
        date_of_birth: form.date_of_birth || null,
        address: form.address || null,
        emergency_contact: form.emergency_contact || null,
        emergency_phone: form.emergency_phone || null,
      });
      if (sErr) throw sErr;
      setShowAdd(false);
      setForm(emptyForm);
      setCredentialsModal({ email: form.email, password: tempPassword });
      fetchStudents();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Failed to add student';
      setToast({ msg: msg.includes('already registered') || msg.includes('already exists') ? 'A user with this email already exists' : msg, type: 'error' });
    }
    setSaving(false);
  };

  const updateStudent = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || null,
      }).eq('id', editTarget.profile_id);
      await supabase.from('students').update({ class_id: form.class_id || null, gender: (form.gender || null) as StudentRow['gender'], date_of_birth: form.date_of_birth || null, address: form.address || null, emergency_contact: form.emergency_contact || null, emergency_phone: form.emergency_phone || null }).eq('id', editTarget.id);
      setToast({ msg: 'Student updated', type: 'success' });
      setShowEdit(false); fetchStudents();
    } catch (e: unknown) { setToast({ msg: (e as { message?: string })?.message || 'Update failed', type: 'error' }); }
    setSaving(false);
  };

  const toggleActive = async (s: StudentWithRelations) => {
    await supabase.from('students').update({ is_active: !s.is_active }).eq('id', s.id);
    setToast({ msg: `Student ${!s.is_active ? 'activated' : 'deactivated'}`, type: 'success' });
    fetchStudents();
  };

  const exportCSV = () => {
    const rows: string[][] = [['Student ID', 'First Name', 'Last Name', 'Email', 'Class', 'Gender', 'Status', 'Enrollment Date']];
    filtered.forEach(s => rows.push([s.student_id, s.profiles?.first_name ?? '', s.profiles?.last_name ?? '', s.profiles?.email ?? '', s.classes?.name ?? '', s.gender ?? '', s.is_active ? 'Active' : 'Inactive', s.enrollment_date ?? '']));
    const q = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(q).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'students.csv'; a.click();
  };

  const openEdit = (s: StudentWithRelations) => {
    setEditTarget(s);
    setForm({ first_name: s.profiles?.first_name || '', last_name: s.profiles?.last_name || '', email: s.profiles?.email || '', phone: s.profiles?.phone || '', gender: s.gender || '', date_of_birth: s.date_of_birth || '', class_id: s.class_id || '', address: s.address || '', emergency_contact: s.emergency_contact || '', emergency_phone: s.emergency_phone || '' });
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
        <h2 className="text-xl font-bold text-gray-900">Students</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setForm(emptyForm); setShowAdd(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Search by name or ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="py-3 px-4">Student</th><th className="py-3 px-4">ID</th><th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Gender</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs flex-shrink-0">
                            {s.profiles?.first_name?.[0]}{s.profiles?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                            <p className="text-xs text-gray-400">{s.profiles?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-500">{s.student_id}</td>
                      <td className="py-3 px-4 text-gray-600">{s.classes?.name || '—'}</td>
                      <td className="py-3 px-4 text-gray-600 capitalize">{s.gender || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewStudent(s)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="View"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setResetTarget(s)} className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500" title="Reset Password"><KeyRound className="w-4 h-4" /></button>
                          <button onClick={() => toggleActive(s)} className={`p-1.5 rounded-lg ${s.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'}`} title={s.is_active ? 'Deactivate' : 'Activate'}>
                            {s.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No students found</td></tr>}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 rounded-lg text-xs font-medium ${page === n ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>{n}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View modal */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewStudent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">Student Details</h3>
              <button onClick={() => setViewStudent(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                  {viewStudent.profiles?.first_name?.[0]}{viewStudent.profiles?.last_name?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">{viewStudent.profiles?.first_name} {viewStudent.profiles?.last_name}</h4>
                  <p className="text-gray-500 font-mono text-sm">{viewStudent.student_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Email', viewStudent.profiles?.email], ['Phone', viewStudent.profiles?.phone || '—'],
                  ['Class', viewStudent.classes?.name || '—'], ['Level', (viewStudent.classes?.level != null ? LEVEL_LABELS[viewStudent.classes.level] : null) || '—'],
                  ['Gender', viewStudent.gender || '—'], ['DOB', viewStudent.date_of_birth || '—'],
                  ['Enrollment', viewStudent.enrollment_date || '—'], ['Status', viewStudent.is_active ? 'Active' : 'Inactive'],
                  ['Address', viewStudent.address || '—'], ['Emergency Contact', viewStudent.emergency_contact || '—'],
                  ['Emergency Phone', viewStudent.emergency_phone || '—'], ['Medical', viewStudent.medical_conditions || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-400 uppercase font-medium">{k}</p>
                    <p className="text-gray-700 font-medium mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <StudentModal title="Add New Student" onClose={() => setShowAdd(false)} onSave={addStudent} saving={saving}>
          <div className="grid grid-cols-2 gap-3">
            <StudentFormField label="First Name" field="first_name" required form={form} setForm={setForm} />
            <StudentFormField label="Last Name" field="last_name" required form={form} setForm={setForm} />
          </div>
          <StudentFormField label="Email" field="email" type="email" required form={form} setForm={setForm} />
          <StudentFormField label="Phone" field="phone" form={form} setForm={setForm} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">No class assigned</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({LEVEL_LABELS[c.level]})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: (e.target.value === 'male' || e.target.value === 'female' ? e.target.value : '') as '' | StudentGender }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select...</option><option value="male">Male</option><option value="female">Female</option>
            </select>
          </div>
          <StudentFormField label="Date of Birth" field="date_of_birth" type="date" form={form} setForm={setForm} />
          <StudentFormField label="Address" field="address" form={form} setForm={setForm} />
          <div className="grid grid-cols-2 gap-3">
            <StudentFormField label="Emergency Contact" field="emergency_contact" form={form} setForm={setForm} />
            <StudentFormField label="Emergency Phone" field="emergency_phone" form={form} setForm={setForm} />
          </div>
        </StudentModal>
      )}

      {/* Credentials modal - copyable temp password */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCredentialsModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">Login credentials for new student</h3>
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
                  <button type="button" onClick={() => copyToClipboard(credentialsModal.password, 'password')} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                    {copiedField === 'password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedField === 'password' ? 'Copied' : 'Copy password'}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100">
              <button onClick={() => setCredentialsModal(null)} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <StudentModal title="Edit Student" onClose={() => setShowEdit(false)} onSave={updateStudent} saving={saving}>
          <div className="grid grid-cols-2 gap-3">
            <StudentFormField label="First Name" field="first_name" required form={form} setForm={setForm} />
            <StudentFormField label="Last Name" field="last_name" required form={form} setForm={setForm} />
          </div>
          <StudentFormField label="Email" field="email" type="email" required form={form} setForm={setForm} />
          <StudentFormField label="Phone" field="phone" form={form} setForm={setForm} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">No class assigned</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({LEVEL_LABELS[c.level]})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: (e.target.value === 'male' || e.target.value === 'female' ? e.target.value : '') as '' | StudentGender }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select...</option><option value="male">Male</option><option value="female">Female</option>
            </select>
          </div>
          <StudentFormField label="Date of Birth" field="date_of_birth" type="date" form={form} setForm={setForm} />
          <StudentFormField label="Address" field="address" form={form} setForm={setForm} />
          <div className="grid grid-cols-2 gap-3">
            <StudentFormField label="Emergency Contact" field="emergency_contact" form={form} setForm={setForm} />
            <StudentFormField label="Emergency Phone" field="emergency_phone" form={form} setForm={setForm} />
          </div>
        </StudentModal>
      )}
    </div>
  );
}
