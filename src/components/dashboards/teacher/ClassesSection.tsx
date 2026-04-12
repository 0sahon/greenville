import { useState, useEffect } from 'react';
import { BookOpen, Users, UserPlus, Search, X, Check, ArrowUpCircle, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, ClassRow, ClassLevel } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const LEVEL_LABELS: Record<ClassLevel, string> = { creche: 'Creche', basic1: 'Basic 1', basic2: 'Basic 2', basic3: 'Basic 3', basic4: 'Basic 4', basic5: 'Basic 5', basic6: 'Basic 6' };

interface ClassWithCount extends ClassRow { students: { count: number }[]; }
interface StudentWithProfile {
  id: string; student_id: string;
  profiles?: { first_name: string; last_name: string; email?: string } | null;
}
interface UnassignedStudent {
  id: string; student_id: string; class_id?: string | null;
  profiles?: { first_name: string; last_name: string } | null;
}
interface AllClass {
  id: string; name: string; level: ClassLevel; academic_year: string;
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function ClassesSection({ profile }: Props) {
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassWithCount | null>(null);
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Add student modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [unassigned, setUnassigned] = useState<UnassignedStudent[]>([]);
  const [addSearch, setAddSearch] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Promote modal state
  const [showPromote, setShowPromote] = useState(false);
  const [promoteStudents, setPromoteStudents] = useState<StudentWithProfile[]>([]);
  const [allClasses, setAllClasses] = useState<AllClass[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [targetClassId, setTargetClassId] = useState('');
  const [promoting, setPromoting] = useState(false);

  const fetchClasses = () =>
    supabase.from('classes').select('*, students(count)').eq('teacher_id', profile.id)
      .then(({ data }) => { setClasses((data || []) as ClassWithCount[]); setLoading(false); });

  useEffect(() => { fetchClasses(); }, [profile.id]);

  const loadStudents = async (cls: ClassWithCount) => {
    setSelectedClass(cls);
    const { data } = await supabase.from('students')
      .select('*, profiles:profile_id(first_name,last_name,email)')
      .eq('class_id', cls.id).eq('is_active', true).order('created_at');
    setStudents((data || []) as StudentWithProfile[]);
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    setAddSearch('');
    setAddLoading(true);
    // Load ALL active students so teacher can pick from any, including already-assigned ones
    const { data } = await supabase.from('students')
      .select('id, student_id, class_id, profiles:profile_id(first_name,last_name)')
      .eq('is_active', true)
      .order('student_id');
    setUnassigned((data || []) as unknown as UnassignedStudent[]);
    setAddLoading(false);
  };

  const assignStudent = async (studentId: string) => {
    if (!selectedClass) return;
    setAssigning(studentId);
    // Use SECURITY DEFINER RPC so teacher can assign any student to their own class
    const { error } = await supabase.rpc('teacher_assign_student', {
      p_student_id: studentId,
      p_class_id: selectedClass.id,
    } as never);
    if (error) {
      setToast({ msg: 'Failed to assign student: ' + error.message, type: 'error' });
    } else {
      setToast({ msg: 'Student added to class', type: 'success' });
      await loadStudents(selectedClass);
      fetchClasses();
    }
    setAssigning(null);
  };

  const openPromote = async () => {
    if (!selectedClass) return;
    setShowPromote(true);
    setTargetClassId('');
    setSelectedStudentIds(new Set(students.map(s => s.id)));
    setPromoteStudents(students);
    // Fetch all classes for target selection
    const { data } = await supabase.from('classes').select('id, name, level, academic_year').order('name');
    setAllClasses((data || []) as AllClass[]);
  };

  const doPromotion = async () => {
    if (!selectedClass || !targetClassId) return;
    setPromoting(true);
    try {
      const ids = Array.from(selectedStudentIds);
      const { data, error } = await supabase.rpc('promote_students', {
        p_from_class_id: selectedClass.id,
        p_to_class_id: targetClassId,
        p_student_ids: ids.length < promoteStudents.length ? ids : null,
      } as never);
      if (error) throw error;
      const count = data as number;
      setToast({ msg: `${count} student${count !== 1 ? 's' : ''} promoted successfully`, type: 'success' });
      setShowPromote(false);
      await loadStudents(selectedClass);
      fetchClasses();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Promotion failed', type: 'error' });
    }
    setPromoting(false);
  };

  const togglePromoteStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredUnassigned = unassigned.filter(s => {
    const name = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.toLowerCase();
    const id = (s.student_id ?? '').toLowerCase();
    const q = addSearch.toLowerCase();
    return !q || name.includes(q) || id.includes(q);
  });

  if (loading) return <div className="flex justify-center items-center h-40"><div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <h2 className="text-xl font-bold text-gray-900">My Classes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => (
          <div key={cls.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all ${selectedClass?.id === cls.id ? 'border-blue-500 shadow-md' : 'border-gray-100 hover:border-blue-200'}`}
            onClick={() => loadStudents(cls)}>
            <div className="flex items-start justify-between mb-3">
              <div><h3 className="font-bold text-gray-800">{cls.name}</h3><p className="text-sm text-gray-500">{LEVEL_LABELS[cls.level] || cls.level}</p></div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{cls.academic_year}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-600"><Users className="w-4 h-4" /> {cls.students?.[0]?.count || 0} students</span>
              <span className="text-blue-600 text-xs font-medium">Click to view →</span>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No classes assigned to you yet</p>
          </div>
        )}
      </div>

      {selectedClass && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-gray-800">{selectedClass.name} — Student Roster ({students.length})</h3>
            <div className="flex gap-2">
              {students.length > 0 && (
                <button
                  onClick={openPromote}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
                >
                  <ArrowUpCircle className="w-4 h-4" /> Promote
                </button>
              )}
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
              >
                <UserPlus className="w-4 h-4" /> Add Student
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                <th className="py-2 px-3">Name</th><th className="py-2 px-3">Student ID</th><th className="py-2 px-3">Email</th><th className="py-2 px-3">Status</th>
              </tr></thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No students in this class yet</td></tr>
                ) : students.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-800">{s.profiles?.first_name} {s.profiles?.last_name}</td>
                    <td className="py-2 px-3 text-gray-500 font-mono text-xs">{s.student_id}</td>
                    <td className="py-2 px-3 text-gray-500">{s.profiles?.email}</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Promote Students Modal */}
      {showPromote && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-green-600" /> Promote Students
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">From: <span className="font-semibold">{selectedClass.name}</span></p>
              </div>
              <button onClick={() => setShowPromote(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
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
                {allClasses
                  .filter(c => c.id !== selectedClass.id)
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
                  {selectedStudentIds.size} of {promoteStudents.length} selected
                </p>
                <button
                  onClick={() => setSelectedStudentIds(
                    selectedStudentIds.size === promoteStudents.length
                      ? new Set()
                      : new Set(promoteStudents.map(s => s.id))
                  )}
                  className="text-xs text-green-600 hover:underline font-medium"
                >
                  {selectedStudentIds.size === promoteStudents.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-1.5">
                {promoteStudents.map(s => {
                  const checked = selectedStudentIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => togglePromoteStudent(s.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${checked ? 'border-green-200 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      {checked
                        ? <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                        : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.student_id}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t flex-shrink-0">
              <button onClick={() => setShowPromote(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
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

      {/* Add Student Modal */}
      {showAddModal && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-gray-900">Add Student to {selectedClass.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">All active students — already assigned ones will be moved to this class</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name or student ID…"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {addLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading unassigned students…</div>
              ) : filteredUnassigned.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {addSearch ? 'No students match your search' : 'All students are already assigned to classes'}
                </div>
              ) : filteredUnassigned.map(s => {
                const fullName = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim();
                const isAssigning = assigning === s.id;
                const alreadyHere = s.class_id === selectedClass?.id;
                return (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${alreadyHere ? 'border-green-200 bg-green-50' : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(s.profiles?.first_name?.[0] ?? '?')}{(s.profiles?.last_name?.[0] ?? '')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{fullName || '—'}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.student_id}</p>
                        {alreadyHere && <p className="text-xs text-green-600 font-medium">Already in this class</p>}
                        {s.class_id && !alreadyHere && <p className="text-xs text-orange-500">In another class</p>}
                      </div>
                    </div>
                    {!alreadyHere && (
                      <button
                        onClick={() => assignStudent(s.id)}
                        disabled={isAssigning}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium disabled:opacity-50"
                      >
                        {isAssigning ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        {isAssigning ? 'Adding…' : 'Add'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t">
              <button onClick={() => setShowAddModal(false)} className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
