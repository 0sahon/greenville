import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Eye, Edit2, ToggleLeft, ToggleRight, Download, X,
  ChevronLeft, ChevronRight, Copy, Check, KeyRound, Sparkles,
  UserPlus, Users, GraduationCap, AlertCircle, ArrowUpRight,
  TrendingUp, TrendingDown, Minus, BarChart3,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { normalizeAssessmentType, ASSESSMENT_MAX } from '../../../lib/assessmentTypes';
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

const LEVEL_LABELS: Record<ClassLevel, string> = { 
  creche: 'Creche', 
  toddler: 'Toddler (Pre-KG)', 
  basic1: 'Basic 1', 
  basic2: 'Basic 2', 
  basic3: 'Basic 3', 
  basic4: 'Basic 4', 
  basic5: 'Basic 5' 
};

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-indigo-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const emptyForm: StudentForm = { 
  first_name: '', 
  last_name: '', 
  email: '', 
  phone: '', 
  gender: '', 
  date_of_birth: '', 
  class_id: '', 
  address: '', 
  emergency_contact: '', 
  emergency_phone: '' 
};

export default function StudentsSection({ profile: _profile }: Props) {
  const [students, setStudents] = useState<StudentWithRelations[]>([]);
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name' | 'level'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
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

  // Academic history
  const [viewTab, setViewTab] = useState<'info' | 'history'>('info');
  const [historyLoading, setHistoryLoading] = useState(false);
  type TermRecord = { term: string; year: string; avg: number | null; subjects: { subject: string; total: number }[]; published: boolean };
  const [termHistory, setTermHistory] = useState<TermRecord[]>([]);

  // Stepper state for multi-step smart student creation form
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [isEmailAuto, setIsEmailAuto] = useState(true);

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

  // Load academic history when viewStudent changes
  useEffect(() => {
    if (!viewStudent) { setTermHistory([]); setViewTab('info'); return; }
    setHistoryLoading(true);
    const ASSESS_MAX = ASSESSMENT_MAX;
    Promise.all([
      supabase.from('grades').select('subject,assessment_type,score,max_score,term,academic_year').eq('student_id', viewStudent.id),
      supabase.from('result_sheets').select('term,academic_year,is_published').eq('student_id', viewStudent.id),
    ]).then(([gradesRes, sheetsRes]) => {
      const grades = (gradesRes.data || []) as { subject: string; assessment_type: string; score: number; max_score: number; term: string; academic_year: string }[];
      const sheets = (sheetsRes.data || []) as { term: string; academic_year: string; is_published: boolean }[];
      // Group grades by term+year
      const groups = new Map<string, typeof grades>();
      grades.forEach(g => {
        const key = `${g.term}||${g.academic_year}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(g);
      });
      const TERM_ORDER = ['First Term', 'Second Term', 'Third Term'];
      const records: TermRecord[] = [...groups.entries()].map(([key, rows]) => {
        const [term, year] = key.split('||');
        // Per-student-subject total using standard weight
        const bySubject: Record<string, number> = {};
        rows.filter(r => r.assessment_type !== 'pre_kg').forEach(r => {
          const maxW = ASSESS_MAX[normalizeAssessmentType(r.assessment_type)] ?? 0;
          const contrib = r.max_score > 0 ? (r.score / r.max_score) * maxW : 0;
          bySubject[r.subject] = (bySubject[r.subject] ?? 0) + contrib;
        });
        const subjectList = Object.entries(bySubject).map(([subject, total]) => ({ subject, total: Math.round(total) })).sort((a, b) => b.total - a.total);
        const totals = subjectList.map(s => s.total).filter(t => t > 0);
        const avg = totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
        const sheet = sheets.find(s => s.term === term && s.academic_year === year);
        return { term, year, avg, subjects: subjectList, published: sheet?.is_published ?? false };
      }).sort((a, b) => {
        const ya = parseInt(a.year.split('/')[0]), yb = parseInt(b.year.split('/')[0]);
        if (ya !== yb) return yb - ya;
        return TERM_ORDER.indexOf(b.term) - TERM_ORDER.indexOf(a.term);
      });
      setTermHistory(records);
      setHistoryLoading(false);
    });
  }, [viewStudent]);

  // Auto-generate email based on first and last name
  useEffect(() => {
    if (showAdd && isEmailAuto) {
      const f = form.first_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const l = form.last_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (f && l) {
        setForm(prev => ({ ...prev, email: `${f}.${l}@greenvillemontessorischools.ng` }));
      } else if (f) {
        setForm(prev => ({ ...prev, email: `${f}@greenvillemontessorischools.ng` }));
      } else {
        setForm(prev => ({ ...prev, email: '' }));
      }
    }
  }, [form.first_name, form.last_name, showAdd, isEmailAuto]);

  const filteredClasses = filterLevel
    ? classes.filter(c => c.level === filterLevel)
    : classes;

  const filtered = students
    .filter(s => {
      const name = `${s.profiles?.first_name} ${s.profiles?.last_name}`.toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase()) || s.student_id?.toLowerCase().includes(search.toLowerCase());
      const matchLevel = !filterLevel || s.classes?.level === filterLevel;
      const matchClass = !filterClass || s.class_id === filterClass;
      return matchSearch && matchLevel && matchClass;
    })
    .sort((a, b) => {
      const nameA = `${a.profiles?.first_name ?? ''} ${a.profiles?.last_name ?? ''}`.trim().toLowerCase();
      const nameB = `${b.profiles?.first_name ?? ''} ${b.profiles?.last_name ?? ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // Stats Calculations
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.is_active).length;
  const unassignedStudents = students.filter(s => s.is_active && !s.class_id).length;
  const maleStudents = students.filter(s => s.is_active && s.gender === 'male').length;
  const femaleStudents = students.filter(s => s.is_active && s.gender === 'female').length;

  const generateUniqueStudentId = async (): Promise<string> => {
    const year = new Date().getFullYear();
    for (let i = 0; i < 20; i++) {
      const num = String(Math.floor(Math.random() * 9000) + 1000);
      const candidate = `GMS-${year}-${num}`;
      const { count } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('student_id', candidate);
      if (!count) return candidate;
    }
    return `GMS-${year}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  };

  const generateTempPassword = () => `Greenville${Math.random().toString(36).slice(2, 8)}!`;

  const addStudent = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      setToast({ msg: 'First name, last name and email are required', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const tempPassword = generateTempPassword();
      const { data: userId, error: fnError } = await supabase.rpc('admin_create_user', {
        user_email: form.email.trim(),
        user_password: tempPassword,
        user_first_name: form.first_name.trim(),
        user_last_name: form.last_name.trim(),
        profile_role: 'student',
      });
      if (fnError) throw fnError;
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select()
        .eq('user_id', userId)
        .single();
      if (pErr) throw pErr;
      
      if (form.phone) {
        await supabase.from('profiles').update({ phone: form.phone }).eq('id', profile.id);
      }
      
      const { error: sErr } = await supabase.from('students').insert({
        profile_id: profile.id,
        student_id: await generateUniqueStudentId(),
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
      setFormStep(1);
      setIsEmailAuto(true);
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
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone || null,
      }).eq('id', editTarget.profile_id);

      await supabase.from('students').update({ 
        class_id: form.class_id || null, 
        gender: (form.gender || null) as StudentRow['gender'], 
        date_of_birth: form.date_of_birth || null, 
        address: form.address || null, 
        emergency_contact: form.emergency_contact || null, 
        emergency_phone: form.emergency_phone || null 
      }).eq('id', editTarget.id);

      setToast({ msg: 'Student records updated successfully', type: 'success' });
      setShowEdit(false); 
      setFormStep(1);
      fetchStudents();
    } catch (e: unknown) { 
      setToast({ msg: (e as { message?: string })?.message || 'Update failed', type: 'error' }); 
    }
    setSaving(false);
  };

  const toggleActive = async (s: StudentWithRelations) => {
    await supabase.from('students').update({ is_active: !s.is_active }).eq('id', s.id);
    setToast({ msg: `Student ${!s.is_active ? 'activated' : 'deactivated'} successfully`, type: 'success' });
    fetchStudents();
  };

  const exportCSV = () => {
    const rows: string[][] = [['Student ID', 'First Name', 'Last Name', 'Email', 'Class', 'Gender', 'Status', 'Enrollment Date']];
    filtered.forEach(s => rows.push([
      s.student_id, 
      s.profiles?.first_name ?? '', 
      s.profiles?.last_name ?? '', 
      s.profiles?.email ?? '', 
      s.classes?.name ?? '', 
      s.gender ?? '', 
      s.is_active ? 'Active' : 'Inactive', 
      s.enrollment_date ?? ''
    ]));
    const q = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(q).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'students_roster.csv'; a.click();
  };

  const openEdit = (s: StudentWithRelations) => {
    setEditTarget(s);
    setForm({ 
      first_name: s.profiles?.first_name || '', 
      last_name: s.profiles?.last_name || '', 
      email: s.profiles?.email || '', 
      phone: s.profiles?.phone || '', 
      gender: s.gender || '', 
      date_of_birth: s.date_of_birth || '', 
      class_id: s.class_id || '', 
      address: s.address || '', 
      emergency_contact: s.emergency_contact || '', 
      emergency_phone: s.emergency_phone || '' 
    });
    setFormStep(1);
    setIsEmailAuto(false); // don't auto-overwrite existing email on edit
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
      setCredentialsModal({ email, password: newPassword, title: `Password Reset Successful for ${name}` });
    } catch (e: unknown) {
      setToast({ msg: (e as { message?: string })?.message || 'Password reset failed', type: 'error' });
    }
    setResetSaving(false);
  };

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modern Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Student Directory</h2>
          <p className="text-sm text-gray-500">Manage enrolled pupils, update academic classes, and review emergency contacts.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={() => { 
              setForm(emptyForm); 
              setFormStep(1);
              setIsEmailAuto(true);
              setShowAdd(true); 
            }} 
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 hover:shadow-lg transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Premium Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Enrolled', value: totalStudents, Icon: GraduationCap, cls: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Active Pupils', value: activeStudents, Icon: Users, cls: 'text-emerald-600 bg-emerald-50/50 border-emerald-100' },
          { label: 'Needs Placement', value: unassignedStudents, Icon: AlertCircle, cls: unassignedStudents > 0 ? 'text-amber-600 bg-amber-50 border-amber-100 animate-pulse' : 'text-gray-400 bg-gray-50 border-gray-100' },
          { label: 'Gender Distribution', value: `M: ${maleStudents} | F: ${femaleStudents}`, Icon: Sparkles, cls: 'text-purple-600 bg-purple-50/50 border-purple-100', textCls: 'text-sm mt-1.5' }
        ].map(({ label, value, Icon, cls, textCls }) => (
          <div key={label} className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center gap-4 transition-all hover:shadow-md ${cls}`}>
            <div className="p-2.5 rounded-xl bg-white shadow-sm"><Icon className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
              <p className={`text-xl font-bold text-gray-800 ${textCls || ''}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Smart Filters bar */}
      <div className="flex flex-wrap gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search by name, email or GMS registration ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50"
          />
        </div>
        {/* Level / classification filter */}
        <select
          value={filterLevel}
          onChange={e => { setFilterLevel(e.target.value); setFilterClass(''); setPage(1); }}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm font-medium text-gray-700"
        >
          <option value="">All Levels</option>
          {(Object.keys(LEVEL_LABELS) as (keyof typeof LEVEL_LABELS)[])
            .filter(lvl => classes.some(c => c.level === lvl))
            .map(lvl => {
              const count = students.filter(s => s.classes?.level === lvl && s.is_active).length;
              return <option key={lvl} value={lvl}>{LEVEL_LABELS[lvl]} ({count})</option>;
            })}
        </select>
        {/* Class filter — narrows to selected level's classes */}
        <select
          value={filterClass}
          onChange={e => { setFilterClass(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm font-medium text-gray-700"
        >
          <option value="">All Classes{filterLevel ? ` in ${LEVEL_LABELS[filterLevel as keyof typeof LEVEL_LABELS]}` : ''}</option>
          {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20 bg-gray-50/20">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-600 font-mono">GMS</div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Pupil Profile</th>
                    <th className="py-3.5 px-5">ID Code</th>
                    <th className="py-3.5 px-5">Class Allocation</th>
                    <th className="py-3.5 px-5">Gender</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right pr-6">Manage Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(s => (
                    <tr key={s.id} className="hover:bg-indigo-50/10 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100/50 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {s.profiles?.first_name?.[0]}{s.profiles?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                            <p className="text-xs text-gray-500">{s.profiles?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-gray-600">{s.student_id}</td>
                      
                      {/* Smart Direct Class Assigner Dropdown */}
                      <td className="py-3.5 px-5">
                        <select
                          value={s.class_id || ''}
                          onChange={async (e) => {
                            const newClassId = e.target.value || null;
                            try {
                              const { error } = await supabase.from('students').update({ class_id: newClassId }).eq('id', s.id);
                              if (error) throw error;
                              setToast({ msg: `Class allocation updated instantly for ${s.profiles?.first_name}`, type: 'success' });
                              fetchStudents();
                            } catch (err: unknown) {
                              setToast({ msg: (err as Error).message || 'Failed to assign class', type: 'error' });
                            }
                          }}
                          className={`border rounded-lg text-xs font-semibold py-1 px-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer ${
                            s.class_id 
                              ? 'bg-indigo-50/40 border-indigo-100 text-indigo-800 hover:bg-indigo-50' 
                              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 animate-pulse'
                          }`}
                        >
                          <option value="">⚠️ Assign Class...</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-5 text-gray-600 capitalize text-xs font-medium">{s.gender || '—'}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewStudent(s)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors" title="View Profile"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors" title="Edit Roster"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setResetTarget(s)} className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors" title="Reset Student Password"><KeyRound className="w-4 h-4" /></button>
                          <button onClick={() => toggleActive(s)} className={`p-1.5 rounded-lg transition-colors ${s.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-emerald-50 text-emerald-600'}`} title={s.is_active ? 'Deactivate Student Account' : 'Activate Student Account'}>
                            {s.is_active ? <ToggleRight className="w-4.5 h-4.5" /> : <ToggleLeft className="w-4.5 h-4.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-16 text-gray-400 font-medium">No students matched the active filter queries.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500 font-medium">Showing <span className="font-bold text-gray-800">{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}</span> of <span className="font-bold text-gray-800">{filtered.length}</span> students</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-200 border border-gray-200 bg-white disabled:opacity-40 shadow-sm transition-all"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 rounded-lg text-xs font-semibold shadow-sm transition-all ${page === n ? 'bg-indigo-600 text-white' : 'border border-gray-200 hover:bg-gray-100 text-gray-600 bg-white'}`}>{n}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-200 border border-gray-200 bg-white disabled:opacity-40 shadow-sm transition-all"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Student Details Modal */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setViewStudent(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-100" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {viewStudent.profiles?.first_name?.[0]}{viewStudent.profiles?.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{viewStudent.profiles?.first_name} {viewStudent.profiles?.last_name}</h3>
                  <span className="font-mono text-xs text-indigo-600 font-semibold">{viewStudent.student_id} · {viewStudent.classes?.name || 'Unassigned'}</span>
                </div>
              </div>
              <button onClick={() => setViewStudent(null)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors flex-shrink-0"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 flex-shrink-0">
              {([['info', 'Profile'], ['history', 'Academic History']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setViewTab(id)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${viewTab === id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6">
              {viewTab === 'info' && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                  {[
                    ['Email Address', viewStudent.profiles?.email],
                    ['Contact Phone', viewStudent.profiles?.phone || '—'],
                    ['Current Class', viewStudent.classes?.name || 'Unassigned'],
                    ['Montessori Level', (viewStudent.classes?.level != null ? LEVEL_LABELS[viewStudent.classes.level] : null) || '—'],
                    ['Student Gender', viewStudent.gender || '—'],
                    ['Date of Birth', viewStudent.date_of_birth || '—'],
                    ['Enrollment Date', viewStudent.enrollment_date || '—'],
                    ['Portal Status', viewStudent.is_active ? 'Active' : 'Inactive'],
                    ['Home Address', viewStudent.address || '—', true],
                    ['Emergency Contact Name', viewStudent.emergency_contact || '—'],
                    ['Emergency Phone', viewStudent.emergency_phone || '—'],
                    ['Medical Conditions', viewStudent.medical_conditions || 'None declared', true],
                  ].map(([k, v, fullWidth]) => (
                    <div key={k as string} className={`${fullWidth ? 'col-span-2' : ''} bg-gray-50/50 p-2.5 rounded-xl border border-gray-100`}>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{k as string}</p>
                      <p className="text-gray-800 font-semibold mt-1">{v as string}</p>
                    </div>
                  ))}
                </div>
              )}
              {viewTab === 'history' && (
                historyLoading ? (
                  <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
                ) : termHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-sm">No academic records yet</p>
                    <p className="text-xs mt-1">Grades and result cards will appear here once entered.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {termHistory.map((rec, idx) => {
                      const prev = termHistory[idx + 1];
                      const trend = rec.avg !== null && prev?.avg !== null && prev?.avg !== undefined
                        ? rec.avg > prev.avg ? 'up' : rec.avg < prev.avg ? 'down' : 'flat'
                        : null;
                      return (
                        <div key={`${rec.term}-${rec.year}`} className="border border-gray-200 rounded-2xl overflow-hidden">
                          {/* Term header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{rec.term}</p>
                              <p className="text-xs text-gray-400">{rec.year}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {rec.published && <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Published</span>}
                              {rec.avg !== null && (
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-sm font-bold ${rec.avg >= 70 ? 'text-green-700' : rec.avg >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
                                    {rec.avg}/100
                                  </span>
                                  {trend === 'up'   && <TrendingUp   className="w-4 h-4 text-green-500" />}
                                  {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                                  {trend === 'flat' && <Minus        className="w-4 h-4 text-gray-400" />}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Subject rows */}
                          {rec.subjects.length > 0 && (
                            <div className="divide-y divide-gray-50">
                              {rec.subjects.map(sub => (
                                <div key={sub.subject} className="flex items-center px-4 py-2">
                                  <span className="flex-1 text-xs text-gray-700 font-medium">{sub.subject}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${sub.total >= 70 ? 'bg-green-500' : sub.total >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(100, sub.total)}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 tabular-nums w-8 text-right">{sub.total}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Smart Add Student Modal (Stepper based) */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-100" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" /> Smart Student Onboarding
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Adding pupils is smart and assisted by automatic email formatting.</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/20 flex items-center justify-around text-xs font-semibold text-gray-500">
              <button 
                onClick={() => setFormStep(1)}
                className={`flex items-center gap-1.5 pb-1 transition-all border-b-2 ${formStep === 1 ? 'text-indigo-600 border-indigo-600 font-bold scale-105' : 'border-transparent'}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${formStep === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>1</span>
                Academic & Profile
              </button>
              <div className="h-0.5 w-12 bg-gray-200" />
              <button 
                onClick={() => {
                  if (form.first_name && form.last_name && form.email) setFormStep(2);
                }}
                disabled={!form.first_name || !form.last_name || !form.email}
                className={`flex items-center gap-1.5 pb-1 transition-all border-b-2 disabled:opacity-40 ${formStep === 2 ? 'text-indigo-600 border-indigo-600 font-bold scale-105' : 'border-transparent'}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${formStep === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>2</span>
                Emergency & Contact
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {formStep === 1 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
                      <input 
                        type="text" 
                        required
                        value={form.first_name} 
                        onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        placeholder="e.g. Zara"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Last Name *</label>
                      <input 
                        type="text" 
                        required
                        value={form.last_name} 
                        onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        placeholder="e.g. Eze"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700">Email Address *</label>
                      <label className="flex items-center gap-1 text-[10px] text-indigo-600 font-semibold cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isEmailAuto} 
                          onChange={e => setIsEmailAuto(e.target.checked)} 
                          className="rounded text-indigo-600 focus:ring-indigo-500" 
                        />
                        Auto-Format Email
                      </label>
                    </div>
                    <div className="relative">
                      <input 
                        type="email" 
                        required
                        value={form.email} 
                        onChange={e => {
                          setIsEmailAuto(false);
                          setForm(f => ({ ...f, email: e.target.value }));
                        }}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        placeholder="e.g. zara.eze@greenvillemontessorischools.ng"
                      />
                      {isEmailAuto && form.email && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-500" /> Suggested
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
                      <select 
                        value={form.gender} 
                        onChange={e => setForm(f => ({ ...f, gender: e.target.value as StudentForm['gender'] }))}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      >
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        value={form.date_of_birth} 
                        onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Class Allocation</label>
                    <select 
                      value={form.class_id} 
                      onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white"
                    >
                      <option value="">No class assigned (Unassigned)</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({LEVEL_LABELS[c.level]})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Student Phone (Optional)</label>
                      <input 
                        type="text" 
                        value={form.phone} 
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        placeholder="e.g. +234"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Emergency Phone *</label>
                      <input 
                        type="text" 
                        value={form.emergency_phone} 
                        onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        placeholder="Guardian Phone"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Emergency Contact Person Name</label>
                    <input 
                      type="text" 
                      value={form.emergency_contact} 
                      onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      placeholder="e.g. Parent or Guardian Name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Home Address</label>
                    <input 
                      type="text" 
                      value={form.address} 
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      placeholder="Street, City, State"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
              {formStep === 2 && (
                <button 
                  type="button" 
                  onClick={() => setFormStep(1)} 
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                >
                  Back to Profile
                </button>
              )}
              {formStep === 1 ? (
                <button 
                  type="button" 
                  disabled={!form.first_name || !form.last_name || !form.email}
                  onClick={() => setFormStep(2)} 
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  Continue <ArrowUpRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={addStudent} 
                  disabled={saving} 
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/10"
                >
                  {saving ? 'Creating Supabase Account...' : 'Complete Enrollment'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Edit Student Modal (Simple Grid Layout) */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Modify Student Records</h3>
                <p className="text-xs text-gray-500 mt-0.5">Editing credentials will modify academic permissions.</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
                  <input type="text" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Last Name *</label>
                  <input type="text" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Class Allocation</label>
                  <select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                    <option value="">No class assigned</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({LEVEL_LABELS[c.level]})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as StudentForm['gender'] }))} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                    <option value="">Select...</option><option value="male">Male</option><option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Contact Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Emergency Name</label>
                  <input type="text" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Emergency Phone</label>
                  <input type="text" value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Home Address</label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0 bg-gray-50/30">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50">Cancel</button>
              <button onClick={updateStudent} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/10">{saving ? 'Updating Record...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal (Copyable Security Card Layout) */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setCredentialsModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-indigo-600 text-white flex-shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" /> Enrollment Credentials
                </h3>
                <p className="text-xs text-indigo-100 mt-0.5">Greenville Montessori Security Card</p>
              </div>
              <button onClick={() => setCredentialsModal(null)} className="p-2 hover:bg-indigo-700/50 rounded-xl transition-colors text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5 bg-gradient-to-b from-indigo-50/20 to-white">
              
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed font-medium">
                  <p className="font-bold mb-0.5">Important Security Notice:</p>
                  Copy and send these student credentials to the parent now. For strict security, temporary passwords are not retrievable after closing this card.
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs relative">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Student Account Username</span>
                  <div className="flex gap-2 items-center justify-between">
                    <span className="font-mono text-sm font-bold text-indigo-900 select-all">{credentialsModal.email}</span>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard(credentialsModal.email, 'email')} 
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs border ${
                        copiedField === 'email' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                          : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {copiedField === 'email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'email' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs relative">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Temporary Password Key</span>
                  <div className="flex gap-2 items-center justify-between">
                    <span className="font-mono text-sm font-bold text-indigo-900 select-all">{credentialsModal.password}</span>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard(credentialsModal.password, 'password')} 
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs border ${
                        copiedField === 'password' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 animate-bounce' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {copiedField === 'password' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'password' ? 'Copied' : 'Copy Password'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <button onClick={() => setCredentialsModal(null)} className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/10">I have copied credentials - Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Target Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setResetTarget(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 border border-purple-100"><KeyRound className="w-6 h-6" /></div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-6">
              Generate a new security access key for <span className="font-bold text-gray-800">{resetTarget.profiles?.first_name} {resetTarget.profiles?.last_name}</span>? 
              This will overwrite their active password.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResetTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50">Cancel</button>
              <button onClick={resetPassword} disabled={resetSaving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                {resetSaving ? 'Generating...' : 'Reset Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
