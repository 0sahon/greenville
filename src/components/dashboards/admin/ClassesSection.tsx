import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Search, Users, BookOpen, TrendingUp, AlertTriangle, ArrowUpCircle, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, ClassRow, ClassInsert, ClassLevel } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface ClassWithProfile extends ClassRow {
  profiles?: { first_name: string; last_name: string } | null;
  student_count?: number;
}

interface StudentInClass {
  id: string;
  student_id: string;
  gender: string | null;
  profiles: { first_name: string; last_name: string } | null;
}

const LEVEL_LABELS: Record<ClassLevel, string> = {
  creche: 'Creche', basic1: 'Basic 1', basic2: 'Basic 2', basic3: 'Basic 3',
  basic4: 'Basic 4', basic5: 'Basic 5', basic6: 'Basic 6',
};
const LEVEL_ORDER: ClassLevel[] = ['creche', 'basic1', 'basic2', 'basic3', 'basic4', 'basic5', 'basic6'];

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

function fillBarColor(count: number, cap: number | null) {
  if (!cap || cap === 0) return 'bg-gray-300';
  const pct = count / cap;
  if (pct >= 0.9) return 'bg-red-500';
  if (pct >= 0.7) return 'bg-amber-500';
  return 'bg-green-500';
}

export default function ClassesSection({ profile: _profile }: Props) {
  const [classes, setClasses] = useState<ClassWithProfile[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; profile_id: string; profiles: { first_name: string; last_name: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClassWithProfile | null>(null);
  const [form, setForm] = useState<{ name: string; level: ClassLevel; academic_year: string; teacher_id: string; capacity: string }>({
    name: '', level: 'basic1', academic_year: getDefaultAcademicYear(), teacher_id: '', capacity: '25',
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClassWithProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rosterClass, setRosterClass] = useState<ClassWithProfile | null>(null);
  const [roster, setRoster] = useState<StudentInClass[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Promote state
  const [promoteClass, setPromoteClass] = useState<ClassWithProfile | null>(null);
  const [promoteStudents, setPromoteStudents] = useState<StudentInClass[]>([]);
  const [promoteStudentsLoading, setPromoteStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [targetClassId, setTargetClassId] = useState('');
  const [promoting, setPromoting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: classData, error: classErr } = await supabase
      .from('classes')
      .select('*, profiles:teacher_id(first_name, last_name)')
      .order('name');
    if (classErr) { setToast({ msg: classErr.message, type: 'error' }); setLoading(false); return; }
    const { data: countData } = await supabase.from('students').select('class_id').eq('is_active', true);
    const countByClass: Record<string, number> = {};
    (countData || []).forEach((s: { class_id: string | null }) => {
      if (s.class_id) countByClass[s.class_id] = (countByClass[s.class_id] || 0) + 1;
    });
    setClasses((classData || []).map((c: ClassWithProfile) => ({ ...c, student_count: countByClass[c.id] || 0 })));
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('id, profile_id, profiles:profile_id(first_name, last_name)')
      .eq('is_active', true);
    setTeachers((teacherData || []) as unknown as typeof teachers);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openRoster = async (c: ClassWithProfile) => {
    setRosterClass(c);
    setRosterLoading(true);
    const { data } = await supabase
      .from('students')
      .select('id, student_id, gender, profiles:profile_id(first_name, last_name)')
      .eq('class_id', c.id)
      .eq('is_active', true)
      .order('student_id');
    setRoster((data || []) as unknown as StudentInClass[]);
    setRosterLoading(false);
  };

  const totalStudents = classes.reduce((s, c) => s + (c.student_count || 0), 0);
  const totalCapacity = classes.reduce((s, c) => s + (c.capacity || 0), 0);
  const avgFillPct = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;
  const unassignedCount = classes.filter(c => !c.teacher_id).length;

  const filtered = classes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search || c.name.toLowerCase().includes(q) || LEVEL_LABELS[c.level].toLowerCase().includes(q);
    return matchSearch && (!filterLevel || c.level === filterLevel);
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', level: 'basic1', academic_year: getDefaultAcademicYear(), teacher_id: '', capacity: '25' });
    setShowModal(true);
  };

  const openEdit = (c: ClassWithProfile) => {
    setEditing(c);
    setForm({ name: c.name, level: c.level, academic_year: c.academic_year, teacher_id: c.teacher_id || '', capacity: String(c.capacity ?? 25) });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return setToast({ msg: 'Class name is required', type: 'error' });
    setSaving(true);
    try {
      const payload: ClassInsert = {
        name: form.name.trim(), level: form.level, academic_year: form.academic_year,
        teacher_id: form.teacher_id || null, capacity: parseInt(form.capacity, 10) || 25,
      };
      if (editing) {
        const { error } = await supabase.from('classes').update(payload).eq('id', editing.id);
        if (error) throw error;
        setToast({ msg: 'Class updated', type: 'success' });
      } else {
        const { error } = await supabase.from('classes').insert(payload);
        if (error) throw error;
        setToast({ msg: 'Class created', type: 'success' });
      }
      setShowModal(false);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Failed to save', type: 'error' });
    }
    setSaving(false);
  };

  const openPromote = async (c: ClassWithProfile) => {
    setPromoteClass(c);
    setTargetClassId('');
    setPromoteStudents([]);
    setSelectedStudentIds(new Set());
    setPromoteStudentsLoading(true);
    const { data } = await supabase
      .from('students')
      .select('id, student_id, gender, profiles:profile_id(first_name, last_name)')
      .eq('class_id', c.id)
      .eq('is_active', true)
      .order('student_id');
    const list = (data || []) as unknown as StudentInClass[];
    setPromoteStudents(list);
    setSelectedStudentIds(new Set(list.map(s => s.id)));
    setPromoteStudentsLoading(false);
  };

  const doPromotion = async () => {
    if (!promoteClass || !targetClassId) return;
    setPromoting(true);
    try {
      const ids = Array.from(selectedStudentIds);
      const { data, error } = await supabase.rpc('promote_students', {
        p_from_class_id: promoteClass.id,
        p_to_class_id: targetClassId,
        p_student_ids: ids.length < promoteStudents.length ? ids : null,
      });
      if (error) throw error;
      const count = data as number;
      setToast({ msg: `${count} student${count !== 1 ? 's' : ''} promoted successfully`, type: 'success' });
      setPromoteClass(null);
      fetchData();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Promotion failed', type: 'error' });
    }
    setPromoting(false);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteClass = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('classes').delete().eq('id', deleteTarget.id);
    if (error) setToast({ msg: error.message, type: 'error' });
    else { setToast({ msg: 'Class deleted', type: 'success' }); setDeleteTarget(null); fetchData(); }
    setDeleting(false);
  };

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Classes', value: classes.length, Icon: BookOpen, cls: 'text-violet-600 bg-violet-50' },
          { label: 'Total Students', value: totalStudents, Icon: Users, cls: 'text-blue-600 bg-blue-50' },
          { label: 'Avg Fill Rate', value: `${avgFillPct}%`, Icon: TrendingUp, cls: avgFillPct >= 90 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50' },
          { label: 'Need Teacher', value: unassignedCount, Icon: AlertTriangle, cls: unassignedCount > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50' },
        ].map(({ label, value, Icon, cls }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${cls}`}><Icon className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Classes</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="">All levels</option>
          {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4">Enrollment</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const count = c.student_count || 0;
                  const cap = c.capacity || 0;
                  const pct = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{c.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">{LEVEL_LABELS[c.level]}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {c.profiles
                          ? `${c.profiles.first_name} ${c.profiles.last_name}`
                          : <span className="text-amber-600 text-xs font-medium">Not assigned</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${fillBarColor(count, cap)}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-gray-600 text-xs tabular-nums">{count}/{cap}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{c.academic_year}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openRoster(c)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="View Roster">
                            <Users className="w-4 h-4" />
                          </button>
                          <button onClick={() => openPromote(c)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Promote Students">
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-violet-50 rounded-lg text-violet-500" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(c)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No classes found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roster modal */}
      {rosterClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRosterClass(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{rosterClass.name} — Class Roster</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {rosterClass.student_count ?? 0} of {rosterClass.capacity ?? 0} enrolled
                  {rosterClass.profiles ? ` · ${rosterClass.profiles.first_name} ${rosterClass.profiles.last_name}` : ''}
                </p>
              </div>
              <button onClick={() => setRosterClass(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {rosterLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                </div>
              ) : roster.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">No active students enrolled in this class.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Student ID</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Gender</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s, i) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-2 px-3 font-mono text-xs text-gray-500">{s.student_id}</td>
                        <td className="py-2 px-3 font-medium text-gray-800">{s.profiles?.first_name} {s.profiles?.last_name}</td>
                        <td className="py-2 px-3 text-gray-500 capitalize text-xs">{s.gender || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Class</h3>
            <p className="text-sm text-gray-600 mb-5">
              Delete <span className="font-semibold">{deleteTarget.name}</span>?
              Students in this class will be unassigned. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={deleteClass} disabled={deleting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Students modal */}
      {promoteClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPromoteClass(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-green-600" /> Promote Students
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">From: <span className="font-semibold">{promoteClass.name}</span></p>
              </div>
              <button onClick={() => setPromoteClass(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 border-b flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Promote to class *</label>
              <select
                value={targetClassId}
                onChange={e => setTargetClassId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select destination class…</option>
                {classes
                  .filter(c => c.id !== promoteClass.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({LEVEL_LABELS[c.level]}) — {c.academic_year}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">
                  Select students to promote ({selectedStudentIds.size} of {promoteStudents.length} selected)
                </p>
                <button
                  onClick={() => {
                    if (selectedStudentIds.size === promoteStudents.length) {
                      setSelectedStudentIds(new Set());
                    } else {
                      setSelectedStudentIds(new Set(promoteStudents.map(s => s.id)));
                    }
                  }}
                  className="text-xs text-green-600 hover:underline font-medium"
                >
                  {selectedStudentIds.size === promoteStudents.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {promoteStudentsLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading students…</div>
              ) : promoteStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No active students in this class</div>
              ) : (
                <div className="space-y-1.5">
                  {promoteStudents.map(s => {
                    const checked = selectedStudentIds.has(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${checked ? 'border-green-200 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`}
                      >
                        {checked
                          ? <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                          : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{s.student_id}</p>
                        </div>
                        <span className="text-xs text-gray-400 capitalize flex-shrink-0">{s.gender || '—'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t flex-shrink-0">
              <button onClick={() => setPromoteClass(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={doPromotion}
                disabled={promoting || !targetClassId || selectedStudentIds.size === 0}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ArrowUpCircle className="w-4 h-4" />
                {promoting ? 'Promoting…' : `Promote ${selectedStudentIds.size} student${selectedStudentIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">{editing ? 'Edit Class' : 'Add Class'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. Primary 1A" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as ClassLevel }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
                <select value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class Teacher</label>
                <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">No teacher assigned</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.profile_id}>
                      {t.profiles ? `${t.profiles.first_name} ${t.profiles.last_name}` : t.profile_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
                <input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
