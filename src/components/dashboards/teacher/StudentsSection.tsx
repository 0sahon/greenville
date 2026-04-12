import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Eye, X, ClipboardCheck, BarChart3,
  Heart, GraduationCap, ChevronDown, AlertCircle, UserPlus, Loader2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow } from '../../../lib/supabase';
import { nigerianGrade } from '../../../lib/grading';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface StudentRow {
  id: string;
  student_id: string;
  gender: string | null;
  date_of_birth: string | null;
  is_active: boolean;
  profiles: { first_name: string; last_name: string; phone: string | null; email: string | null } | null;
  classes: { id: string; name: string; level: string } | null;
}

interface AttendanceSummary { present: number; absent: number; late: number; excused: number; total: number; }
interface GradeSummary { subject: string; assessment_type: string; score: number; max_score: number; }
interface HealthRecord { id: string; visit_date: string; visit_reason: string; diagnosis: string | null; allergies: string | null; }

function calcAge(dob: string | null) {
  if (!dob) return '—';
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return `${age} yrs`;
}

function AttBadge({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{pct}%</span>;
}

export default function TeacherStudentsSection({ profile }: Props) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  // Detail modal state
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [modalTab, setModalTab] = useState<'profile' | 'attendance' | 'grades' | 'health'>('profile');
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null);
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add-student modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [addSearch, setAddSearch] = useState('');
  const [addClassId, setAddClassId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Load students only from the teacher's own classes
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
    // First get the teacher's class IDs
    const { data: myClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', profile.id);
    const classIds = (myClasses || []).map(c => c.id);
    if (classIds.length === 0) {
      setStudents([]);
      return;
    }
    const { data } = await supabase
      .from('students')
      .select('id, student_id, gender, date_of_birth, is_active, profiles:profile_id(first_name,last_name,phone,email), classes:class_id(id,name,level)')
      .in('class_id', classIds)
      .eq('is_active', true)
      .order('student_id');
    setStudents((data || []) as unknown as StudentRow[]);
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Fetch the teacher's own classes directly (so dropdown works even with 0 students)
  useEffect(() => {
    supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', profile.id)
      .order('name')
      .then(({ data }) => setClasses((data || []) as { id: string; name: string }[]));
  }, [profile.id]);

  // Open student detail and fetch sub-data
  const openStudent = async (s: StudentRow) => {
    setSelected(s);
    setModalTab('profile');
    setAttSummary(null);
    setGrades([]);
    setHealthRecords([]);
    setDetailLoading(true);

    // Attendance summary (all time)
    const { data: att } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', s.id);
    if (att) {
      const summary = { present: 0, absent: 0, late: 0, excused: 0, total: att.length };
      att.forEach((a: { status: string }) => {
        if (a.status === 'present') summary.present++;
        else if (a.status === 'absent') summary.absent++;
        else if (a.status === 'late') summary.late++;
        else if (a.status === 'excused') summary.excused++;
      });
      setAttSummary(summary);
    }

    // Grades (latest term)
    const { data: gradeData } = await supabase
      .from('grades')
      .select('subject, assessment_type, score, max_score')
      .eq('student_id', s.id)
      .order('subject');
    setGrades((gradeData || []) as GradeSummary[]);

    // Health records
    const { data: healthData } = await supabase
      .from('health_records')
      .select('id, visit_date, visit_reason, diagnosis, allergies')
      .eq('student_id', s.id)
      .order('visit_date', { ascending: false })
      .limit(10);
    setHealthRecords((healthData || []) as HealthRecord[]);

    setDetailLoading(false);
  };

  // Filtered list
  const filtered = students.filter(s => {
    const name = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.toLowerCase();
    const id = (s.student_id ?? '').toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !q || name.includes(q) || id.includes(q);
    const matchClass = !classFilter || s.classes?.id === classFilter;
    return matchSearch && matchClass;
  });

  // Aggregate grade totals per subject (summing CA1 + CA2 + Exam)
  const gradesBySubject = grades.reduce<Record<string, { total: number; max: number }>>((acc, g) => {
    if (!acc[g.subject]) acc[g.subject] = { total: 0, max: 0 };
    acc[g.subject].total += g.score;
    acc[g.subject].max += g.max_score;
    return acc;
  }, {});

  const attPct = attSummary && attSummary.total > 0
    ? Math.round((attSummary.present / attSummary.total) * 100)
    : null;

  const openAddModal = async () => {
    setShowAddModal(true);
    setAddSearch('');
    setAddError('');
    setAddClassId(classes[0]?.id ?? '');
    // Fetch all active students so the teacher can pick any
    const { data } = await supabase
      .from('students')
      .select('id, student_id, gender, date_of_birth, is_active, profiles:profile_id(first_name,last_name,phone,email), classes:class_id(id,name,level)')
      .eq('is_active', true)
      .order('student_id');
    setAllStudents((data || []) as unknown as StudentRow[]);
  };

  const handleAssign = async (student: StudentRow) => {
    if (!addClassId) { setAddError('Please select a class first.'); return; }
    setAddLoading(true);
    setAddError('');
    const { error } = await supabase.rpc('teacher_assign_student', {
      p_student_id: student.id,
      p_class_id: addClassId,
    });
    setAddLoading(false);
    if (error) { setAddError(error.message); return; }
    setShowAddModal(false);
    fetchStudents();
  };

  const filteredAdd = allStudents.filter(s => {
    const name = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.toLowerCase();
    const id = (s.student_id ?? '').toLowerCase();
    const q = addSearch.toLowerCase();
    return !q || name.includes(q) || id.includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-indigo-500" size={22} /> My Students
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} student{filtered.length !== 1 ? 's' : ''} shown</p>
        </div>
        <button
          onClick={openAddModal}
          disabled={classes.length === 0}
          title={classes.length === 0 ? 'You have no classes assigned yet' : 'Assign a student to your class'}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <UserPlus size={16} /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div className="relative">
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none bg-white"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Student Grid */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Loading students…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Users size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const fullName = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim();
            return (
              <div
                key={s.id}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
                onClick={() => openStudent(s)}
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(s.profiles?.first_name?.[0] ?? '?')}{(s.profiles?.last_name?.[0] ?? '')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{fullName || '—'}</p>
                    <p className="text-xs text-gray-400">{s.student_id}</p>
                  </div>
                </div>

                {/* Details row */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium">
                    {s.classes?.name ?? 'No class'}
                  </span>
                  <span className="capitalize">{s.gender ?? '—'} · {calcAge(s.date_of_birth)}</span>
                </div>

                {/* View link */}
                <button className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-50 transition-colors">
                  <Eye size={13} /> View Details
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Student Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <UserPlus size={20} className="text-indigo-500" /> Add Student to Class
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Search and assign any student to one of your classes</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Class selector + search */}
            <div className="p-4 border-b space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Assign to class</label>
                <div className="relative">
                  <select
                    value={addClassId}
                    onChange={e => setAddClassId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none bg-white"
                  >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or student ID…"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  autoFocus
                />
              </div>
              {addError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle size={14} /> {addError}
                </p>
              )}
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filteredAdd.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No students found</p>
              ) : (
                filteredAdd.map(s => {
                  const fullName = `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim();
                  const currentClass = s.classes?.name ?? 'Unassigned';
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(s.profiles?.first_name?.[0] ?? '?')}{(s.profiles?.last_name?.[0] ?? '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{fullName || '—'}</p>
                        <p className="text-xs text-gray-400">{s.student_id} · currently in <span className="text-indigo-600">{currentClass}</span></p>
                      </div>
                      <button
                        onClick={() => handleAssign(s)}
                        disabled={addLoading}
                        className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                      >
                        {addLoading ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                        Assign
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Student Detail Modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center gap-4 p-5 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {(selected.profiles?.first_name?.[0] ?? '?')}{(selected.profiles?.last_name?.[0] ?? '')}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg">
                  {selected.profiles?.first_name} {selected.profiles?.last_name}
                </h3>
                <p className="text-sm text-gray-500">{selected.student_id} · {selected.classes?.name ?? 'No class'}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-white px-5 gap-1">
              {([
                { key: 'profile',    label: 'Profile',    icon: GraduationCap },
                { key: 'attendance', label: 'Attendance', icon: ClipboardCheck },
                { key: 'grades',     label: 'Grades',     icon: BarChart3 },
                { key: 'health',     label: 'Health',     icon: Heart },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setModalTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    modalTab === key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading ? (
                <div className="text-center text-gray-400 py-12 text-sm">Loading…</div>
              ) : (
                <>
                  {/* Profile tab */}
                  {modalTab === 'profile' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'First Name',   value: selected.profiles?.first_name },
                          { label: 'Last Name',    value: selected.profiles?.last_name },
                          { label: 'Student ID',   value: selected.student_id },
                          { label: 'Class',        value: selected.classes?.name },
                          { label: 'Gender',       value: selected.gender, capitalize: true },
                          { label: 'Date of Birth', value: selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' }) : null },
                          { label: 'Age',          value: calcAge(selected.date_of_birth) },
                          { label: 'Email',        value: selected.profiles?.email },
                        ].map(({ label, value, capitalize }) => (
                          <div key={label} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                            <p className={`text-sm font-medium text-gray-800 ${capitalize ? 'capitalize' : ''}`}>
                              {value ?? '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attendance tab */}
                  {modalTab === 'attendance' && (
                    <div className="space-y-4">
                      {attSummary ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: 'Present', value: attSummary.present, color: 'text-green-600 bg-green-50 border-green-100' },
                              { label: 'Absent',  value: attSummary.absent,  color: 'text-red-600 bg-red-50 border-red-100' },
                              { label: 'Late',    value: attSummary.late,    color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
                              { label: 'Excused', value: attSummary.excused, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                            ].map(({ label, value, color }) => (
                              <div key={label} className={`rounded-xl border p-3 text-center ${color}`}>
                                <p className="text-2xl font-bold">{value}</p>
                                <p className="text-xs font-medium mt-0.5">{label}</p>
                              </div>
                            ))}
                          </div>

                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">Attendance Rate</span>
                              {attPct !== null && <AttBadge pct={attPct} />}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all ${attPct !== null && attPct >= 90 ? 'bg-green-500' : attPct !== null && attPct >= 75 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                style={{ width: `${attPct ?? 0}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">{attSummary.total} school days recorded</p>
                          </div>

                          {attPct !== null && attPct < 75 && (
                            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-red-700">
                                <strong>Attendance concern:</strong> This student's attendance rate ({attPct}%) is below the 75% minimum threshold. Parents should be notified.
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-8">No attendance records found.</p>
                      )}
                    </div>
                  )}

                  {/* Grades tab */}
                  {modalTab === 'grades' && (
                    <div className="space-y-3">
                      {Object.keys(gradesBySubject).length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No grades recorded yet.</p>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400">Showing aggregated scores across all assessments (1st CA + 2nd CA + Exam = /100)</p>
                          <div className="space-y-2">
                            {Object.entries(gradesBySubject).map(([subject, { total, max }]) => {
                              const grade = nigerianGrade(total, max);
                              const pct = max > 0 ? Math.round((total / max) * 100) : 0;
                              return (
                                <div key={subject} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{subject}</p>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-gray-700">{total}/{max}</p>
                                  </div>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${grade.color}`}>{grade.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Health tab */}
                  {modalTab === 'health' && (
                    <div className="space-y-3">
                      {healthRecords.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No health records found.</p>
                      ) : (
                        healthRecords.map(hr => (
                          <div key={hr.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-500">
                                {new Date(hr.visit_date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              {hr.allergies && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">Allergies noted</span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-800">{hr.visit_reason}</p>
                            {hr.diagnosis && <p className="text-xs text-gray-600">Diagnosis: {hr.diagnosis}</p>}
                            {hr.allergies && <p className="text-xs text-orange-700 font-medium">⚠ Allergies: {hr.allergies}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
