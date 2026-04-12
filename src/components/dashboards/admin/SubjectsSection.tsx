import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Search, BookMarked } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, SubjectRow, SubjectInsert } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface SubjectWithRelations extends SubjectRow {
  classes?: { name: string } | null;
  profiles?: { first_name: string; last_name: string } | null;
}

interface TeacherOption {
  profile_id: string;
  profiles: { first_name: string; last_name: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const emptyForm = () => ({
  name: '', code: '', class_id: '', teacher_id: '',
  term: 'First Term' as string, academic_year: getDefaultAcademicYear(),
});

export default function SubjectsSection({ profile: _profile }: Props) {
  const [subjects, setSubjects] = useState<SubjectWithRelations[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SubjectWithRelations | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubjectWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: subjData, error: subjErr }, { data: classData }, { data: teacherData }] = await Promise.all([
      supabase.from('subjects').select('*, classes:class_id(name), profiles:teacher_id(first_name, last_name)').order('name'),
      supabase.from('classes').select('id, name').order('name'),
      supabase.from('teachers').select('profile_id, profiles:profile_id(first_name, last_name)').eq('is_active', true),
    ]);
    if (subjErr) { setToast({ msg: subjErr.message, type: 'error' }); }
    setSubjects((subjData || []) as SubjectWithRelations[]);
    setClasses((classData || []) as ClassOption[]);
    setTeachers((teacherData || []) as unknown as TeacherOption[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = subjects.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q) ||
      (s.classes?.name || '').toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (s: SubjectWithRelations) => {
    setEditing(s);
    setForm({
      name: s.name,
      code: s.code || '',
      class_id: s.class_id || '',
      teacher_id: s.teacher_id || '',
      term: s.term,
      academic_year: s.academic_year,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return setToast({ msg: 'Subject name is required', type: 'error' });
    setSaving(true);
    try {
      const payload: SubjectInsert = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        class_id: form.class_id || null,
        teacher_id: form.teacher_id || null,
        term: form.term,
        academic_year: form.academic_year,
      };
      if (editing) {
        const { error } = await supabase.from('subjects').update(payload).eq('id', editing.id);
        if (error) throw error;
        setToast({ msg: 'Subject updated', type: 'success' });
      } else {
        const { error } = await supabase.from('subjects').insert(payload);
        if (error) throw error;
        setToast({ msg: 'Subject created', type: 'success' });
      }
      setShowModal(false);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed to save', type: 'error' });
    }
    setSaving(false);
  };

  const deleteSubject = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('subjects').delete().eq('id', deleteTarget.id);
    if (error) setToast({ msg: error.message, type: 'error' });
    else { setToast({ msg: 'Subject deleted', type: 'success' }); setDeleteTarget(null); fetchData(); }
    setDeleting(false);
  };

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Subjects</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-700">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-fuchsia-300 border-t-fuchsia-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4">Term</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
                        <span className="font-medium text-gray-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">{s.code || '—'}</td>
                    <td className="py-3 px-4 text-gray-600">{s.classes?.name || '—'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {s.profiles ? `${s.profiles.first_name} ${s.profiles.last_name}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{s.term}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{s.academic_year}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-fuchsia-50 rounded-lg text-fuchsia-500" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(s)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No subjects found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Subject</h3>
            <p className="text-sm text-gray-600 mb-5">Delete <span className="font-semibold">{deleteTarget.name}</span>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={deleteSubject} disabled={deleting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">{editing ? 'Edit Subject' : 'Add Subject'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500" placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject Code</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500" placeholder="e.g. MATH101" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                  <option value="">All classes / No specific class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teacher</label>
                <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                  <option value="">No teacher assigned</option>
                  {teachers.map(t => (
                    <option key={t.profile_id} value={t.profile_id}>
                      {t.profiles ? `${t.profiles.first_name} ${t.profiles.last_name}` : t.profile_id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
                  <select value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                    {TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
                  <select value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                    {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-fuchsia-600 text-white rounded-xl text-sm font-medium hover:bg-fuchsia-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
