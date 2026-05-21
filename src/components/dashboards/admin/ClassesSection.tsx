import { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, Search, Users, BookOpen, TrendingUp, 
  AlertTriangle, ArrowUpCircle, CheckSquare, Square, UserMinus, Check, Printer
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import { printPromotionCertificate } from '../../../lib/gmsPrint';
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
  creche: 'Creche', 
  toddler: 'Toddler (Pre-KG)', 
  basic1: 'Basic 1', 
  basic2: 'Basic 2', 
  basic3: 'Basic 3',
  basic4: 'Basic 4', 
  basic5: 'Basic 5',
};
const LEVEL_ORDER: ClassLevel[] = ['creche', 'toddler', 'basic1', 'basic2', 'basic3', 'basic4', 'basic5'];

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-indigo-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

function fillBarColor(count: number, cap: number | null) {
  if (!cap || cap === 0) return 'bg-gray-300';
  const pct = count / cap;
  if (pct >= 0.9) return 'bg-red-500';
  if (pct >= 0.7) return 'bg-amber-500';
  return 'bg-indigo-600';
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
  const [rosterSearch, setRosterSearch] = useState('');

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
    setRosterSearch('');
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

  const unassignStudent = async (studentId: string, studentName: string) => {
    try {
      const { error } = await supabase.from('students').update({ class_id: null }).eq('id', studentId);
      if (error) throw error;
      setToast({ msg: `${studentName} unassigned successfully`, type: 'success' });
      
      // refresh local roster view
      setRoster(prev => prev.filter(s => s.id !== studentId));
      if (rosterClass) {
        setRosterClass(prev => prev ? { ...prev, student_count: (prev.student_count || 1) - 1 } : null);
      }
      fetchData();
    } catch (err: unknown) {
      setToast({ msg: (err as Error).message || 'Failed to unassign student', type: 'error' });
    }
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
        setToast({ msg: 'Class details updated successfully', type: 'success' });
      } else {
        const { error } = await supabase.from('classes').insert(payload);
        if (error) throw error;
        setToast({ msg: 'New class configured successfully', type: 'success' });
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
    
    // Propose target logical level class (e.g. Nursery 1 -> Nursery 2)
    const currentLvlIdx = LEVEL_ORDER.indexOf(c.level);
    const targetLvl = currentLvlIdx !== -1 && currentLvlIdx < LEVEL_ORDER.length - 1 
      ? LEVEL_ORDER[currentLvlIdx + 1] 
      : null;
      
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

    // Pre-select suggested logical next-level class if it exists
    if (targetLvl) {
      const suggestedTarget = classes.find(cl => cl.level === targetLvl && cl.id !== c.id);
      if (suggestedTarget) setTargetClassId(suggestedTarget.id);
    }
  };

  const [promotedStudents, setPromotedStudents] = useState<Array<{ name: string; fromClass: string; toClass: string; admissionNo: string }>>([]);

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
      const toClass = classes.find(c => c.id === targetClassId);
      // Store promoted list for certificate printing
      const promoted = promoteStudents
        .filter(s => selectedStudentIds.has(s.id))
        .map(s => ({
          name: `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim(),
          fromClass: promoteClass.name,
          toClass: toClass?.name ?? '',
          admissionNo: s.student_id,
        }));
      setPromotedStudents(promoted);
      setToast({ msg: `${count} student${count !== 1 ? 's' : ''} promoted successfully!`, type: 'success' });
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
    else { setToast({ msg: 'Class deleted successfully', type: 'success' }); setDeleteTarget(null); fetchData(); }
    setDeleting(false);
  };

  // Get logical suggestion next level name
  const getSuggestedNextLevelLabel = (lvl: ClassLevel) => {
    const idx = LEVEL_ORDER.indexOf(lvl);
    if (idx !== -1 && idx < LEVEL_ORDER.length - 1) {
      return LEVEL_LABELS[LEVEL_ORDER[idx + 1]];
    }
    return null;
  };

  // Roster Filtered List
  const filteredRoster = roster.filter(s => {
    const name = `${s.profiles?.first_name} ${s.profiles?.last_name}`.toLowerCase();
    return !rosterSearch || name.includes(rosterSearch.toLowerCase()) || s.student_id.toLowerCase().includes(rosterSearch.toLowerCase());
  });

  // Capacity calculations for promotion target
  const targetClass = classes.find(c => c.id === targetClassId);
  const targetCurrentFill = targetClass?.student_count || 0;
  const targetCapacity = targetClass?.capacity || 25;
  const selectedCount = selectedStudentIds.size;
  const postPromotionFill = targetCurrentFill + selectedCount;
  const isOverCapacity = postPromotionFill > targetCapacity;

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modern Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Classes</h2>
          <p className="text-sm text-gray-500">Configure class rooms, allocate class teachers, and promote student cohorts.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      {/* Premium Statistics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Classes', value: classes.length, Icon: BookOpen, cls: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Total Placed', value: totalStudents, Icon: Users, cls: 'text-emerald-600 bg-emerald-50/50 border-emerald-100' },
          { label: 'Avg Room Fill', value: `${avgFillPct}%`, Icon: TrendingUp, cls: avgFillPct >= 90 ? 'text-red-600 bg-red-50 border-red-100' : 'text-indigo-600 bg-indigo-50/50 border-indigo-100' },
          { label: 'Unassigned Teachers', value: unassignedCount, Icon: AlertTriangle, cls: unassignedCount > 0 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-gray-400 bg-gray-50 border-gray-100' },
        ].map(({ label, value, Icon, cls }) => (
          <div key={label} className={`bg-white rounded-2xl border p-4 shadow-sm flex items-center gap-4 transition-all hover:shadow-md ${cls}`}>
            <div className="p-2.5 rounded-xl bg-white shadow-sm"><Icon className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Filter bar */}
      <div className="flex flex-wrap gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-60 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            placeholder="Search classes..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50" 
          />
        </div>
        <select 
          value={filterLevel} 
          onChange={e => setFilterLevel(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-gray-700"
        >
          <option value="">All Montessori Levels</option>
          {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
        </select>
      </div>

      {/* Grid of Classes Card Layout (Super Premium visual improvement) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">No active classes found. Click Add Class to begin.</div>
        ) : (
          filtered.map(c => {
            const count = c.student_count || 0;
            const cap = c.capacity || 25;
            const pct = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                        {LEVEL_LABELS[c.level]}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 mt-1.5">{c.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100 font-mono">{c.academic_year}</span>
                  </div>

                  <div className="space-y-3.5 mb-6 mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-500">Class Instructor:</span>
                      <span className={`font-semibold ${c.profiles ? 'text-gray-800' : 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1 text-[10px]'}`}>
                        {c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : '⚠️ Unassigned'}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                        <span className="text-gray-500">Roster Capacity:</span>
                        <span className={`${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-indigo-600'}`}>{count} / {cap} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-100/50">
                        <div className={`h-full rounded-full transition-all duration-500 ${fillBarColor(count, cap)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-3.5 border-t border-gray-50">
                  <button onClick={() => openRoster(c)} className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1" title="View Class Roster">
                    <Users className="w-3.5 h-3.5" /> Roster
                  </button>
                  <button onClick={() => openPromote(c)} className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1" title="Promote Students Logical Progression">
                    <ArrowUpCircle className="w-3.5 h-3.5" /> Promote
                  </button>
                  <button onClick={() => openEdit(c)} className="p-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-all" title="Edit Settings">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(c)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-100/50" title="Delete Room">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Class Roster Modal */}
      {rosterClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setRosterClass(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{rosterClass.name} — Class Roster</h3>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                  {rosterClass.student_count ?? 0} of {rosterClass.capacity ?? 0} filled
                  {rosterClass.profiles ? ` · Teacher: ${rosterClass.profiles.first_name} ${rosterClass.profiles.last_name}` : ''}
                </p>
              </div>
              <button onClick={() => setRosterClass(null)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Smart Search filter in Roster */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  placeholder="Search students in this roster..." 
                  value={rosterSearch}
                  onChange={e => setRosterSearch(e.target.value)}
                  className="w-full bg-white pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Student List */}
            <div className="overflow-y-auto flex-1 p-4 bg-white">
              {rosterLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : filteredRoster.length === 0 ? (
                <p className="text-center text-gray-400 py-16 text-sm font-medium">No active students matching criteria.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                      <th className="py-2.5 px-3">No.</th>
                      <th className="py-2.5 px-3">Student ID</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3 text-right pr-4">Roster Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((s, i) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-indigo-50/10">
                        <td className="py-2.5 px-3 text-gray-400 text-xs font-semibold">{i + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-xs font-bold text-indigo-900">{s.student_id}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-800 text-sm">{s.profiles?.first_name} {s.profiles?.last_name}</div>
                          <div className="text-[10px] text-gray-400 capitalize font-medium">{s.gender || '—'} gender</div>
                        </td>
                        <td className="py-2.5 px-3 text-right pr-4">
                          <button
                            onClick={() => unassignStudent(s.id, `${s.profiles?.first_name} ${s.profiles?.last_name}`)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 text-[10px] font-bold border border-transparent hover:border-red-100"
                            title="Unassign pupil from class room"
                          >
                            <UserMinus className="w-3.5 h-3.5" /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Smart Promote Students wizard modal */}
      {promoteClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setPromoteClass(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0 bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-indigo-600" /> Smart Cohort Promotion
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">Batch promote pupils from <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{promoteClass.name}</span></p>
              </div>
              <button onClick={() => setPromoteClass(null)} className="p-2 hover:bg-gray-200 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Smart target configuration tab */}
            <div className="p-6 border-b flex-shrink-0 space-y-4 bg-gradient-to-b from-gray-50/20 to-white">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Destination Promotion Class *</label>
                <select
                  value={targetClassId}
                  onChange={e => setTargetClassId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm font-semibold text-gray-800"
                >
                  <option value="">Select logical target class...</option>
                  {classes
                    .filter(c => c.id !== promoteClass.id)
                    .map(c => {
                      const isSuggested = c.level === LEVEL_ORDER[LEVEL_ORDER.indexOf(promoteClass.level) + 1];
                      return (
                        <option key={c.id} value={c.id} className="font-medium">
                          {c.name} ({LEVEL_LABELS[c.level]}) — {c.academic_year} {isSuggested ? '⭐ (Suggested Next Level)' : ''}
                        </option>
                      );
                    })}
                </select>
                {getSuggestedNextLevelLabel(promoteClass.level) && (
                  <p className="text-[10px] text-indigo-600 font-bold mt-1.5 flex items-center gap-1 leading-none">
                    <Check className="w-3.5 h-3.5" /> Smart suggest: Promotes toddler cohorts to Next Level: {getSuggestedNextLevelLabel(promoteClass.level)}
                  </p>
                )}
              </div>

              {/* Real-time Target Capacity Warning Alert */}
              {targetClass && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  isOverCapacity 
                    ? 'bg-red-50 border-red-200 text-red-800 shadow-sm' 
                    : postPromotionFill >= targetCapacity * 0.9 
                      ? 'bg-amber-50 border-amber-200 text-amber-800' 
                      : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {isOverCapacity ? <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /> : <TrendingUp className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                    <div className="text-xs leading-relaxed font-semibold">
                      <p className="font-bold uppercase tracking-wider mb-0.5">Capacity Fill Analysis:</p>
                      {targetClass.name} Current Fill: <span className="font-bold">{targetCurrentFill}/{targetCapacity}</span> pupils. 
                      Promoting <span className="font-bold text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-gray-150">{selectedCount}</span> pupils will make it <span className="font-bold">{postPromotionFill}/{targetCapacity}</span>.
                      {isOverCapacity && (
                        <p className="text-red-700 font-extrabold mt-1 text-[11px] animate-pulse">
                          ⚠️ Warning: Destination class room capacity limits exceeded by {postPromotionFill - targetCapacity} seats!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pupil checklist */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-3.5">
                <p className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">
                  Select Pupils to Promote ({selectedStudentIds.size} of {promoteStudents.length} selected)
                </p>
                <button
                  onClick={() => {
                    if (selectedStudentIds.size === promoteStudents.length) {
                      setSelectedStudentIds(new Set());
                    } else {
                      setSelectedStudentIds(new Set(promoteStudents.map(s => s.id)));
                    }
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                  {selectedStudentIds.size === promoteStudents.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {promoteStudentsLoading ? (
                <div className="text-center py-10 text-gray-400 text-sm">Loading active students…</div>
              ) : promoteStudents.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-2xl">No active students in this class.</div>
              ) : (
                <div className="space-y-2">
                  {promoteStudents.map(s => {
                    const checked = selectedStudentIds.has(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                          checked 
                            ? 'border-indigo-200 bg-indigo-50/50 shadow-sm text-indigo-900' 
                            : 'border-gray-150 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {checked
                          ? <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{s.student_id}</p>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 capitalize flex-shrink-0 bg-white px-2 py-0.5 rounded border border-gray-100">{s.gender || '—'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0 bg-gray-50/30">
              <button onClick={() => setPromoteClass(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50">Cancel</button>
              <button
                onClick={doPromotion}
                disabled={promoting || !targetClassId || selectedStudentIds.size === 0}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
              >
                <ArrowUpCircle className="w-4.5 h-4.5" />
                {promoting ? 'Executing Promotion...' : `Promote ${selectedStudentIds.size} Student${selectedStudentIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Promotion Certificates Modal ── */}
      {promotedStudents.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setPromotedStudents([])}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Promotion Complete!</h3>
                <p className="text-xs text-gray-500">{promotedStudents.length} student{promotedStudents.length !== 1 ? 's' : ''} promoted successfully</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Print official GMS Promotion Certificates for each student:</p>
            <div className="space-y-2 max-h-52 overflow-y-auto mb-5">
              {promotedStudents.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.fromClass} → {s.toClass} · {s.admissionNo}</p>
                  </div>
                  <button
                    onClick={() => printPromotionCertificate({
                      studentName: s.name,
                      admissionNo: s.admissionNo,
                      fromClass: s.fromClass,
                      toClass: s.toClass,
                      academicYear: classes.find(c => c.name === s.toClass)?.academic_year ?? '',
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => promotedStudents.forEach(s => printPromotionCertificate({
                  studentName: s.name, admissionNo: s.admissionNo,
                  fromClass: s.fromClass, toClass: s.toClass,
                  academicYear: classes.find(c => c.name === s.toClass)?.academic_year ?? '',
                }))}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700"
              >
                <Printer className="w-4 h-4" /> Print All Certificates
              </button>
              <button onClick={() => setPromotedStudents([])} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-950 text-lg">{editing ? 'Configure Academic Class' : 'Create Academic Class'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Define room names, level caps, and instructors.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Class Room Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Primary 1A" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Montessori Level Group</label>
                <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as ClassLevel }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                  {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Academic Calendar Session</label>
                <select value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                  {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Assigned Room Teacher</label>
                <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                  <option value="">No teacher assigned</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.profile_id}>
                      {t.profiles ? `${t.profiles.first_name} ${t.profiles.last_name}` : t.profile_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Max Capacity Allocation</label>
                <input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/10">
                {saving ? 'Configuring Room...' : 'Save Class Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Room Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-100/50 flex items-center justify-center mb-4"><AlertTriangle className="w-6 h-6" /></div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Delete Academic Class</h3>
            <p className="text-sm text-gray-500 mb-6">
              Delete class room <span className="font-bold text-gray-800">{deleteTarget.name}</span>? 
              Enrolled students will be immediately unassigned. This operation is permanent.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50">Cancel</button>
              <button onClick={deleteClass} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting Room...' : 'Delete Class Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
