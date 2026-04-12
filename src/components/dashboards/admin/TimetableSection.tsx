import { useState, useEffect } from 'react';
import { Clock, Plus, X, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TERMS, getDefaultAcademicYear, getAcademicYearOptions } from '../../../lib/academicConfig';
import type { ProfileRow, ClassRow, TimetableRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type Day = typeof DAYS[number];

interface SlotWithTeacher extends TimetableRow {
  teachers?: { profiles?: { first_name: string; last_name: string } | null } | null;
}

interface TeacherOption { id: string; profiles?: { first_name: string; last_name: string } | null; }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const DEFAULT_TIMES = ['08:00','08:45','09:30','10:15','11:15','12:00','12:45','13:30','14:15','15:00'];

export default function TimetableSection({ profile: _profile }: Props) {
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [slots, setSlots] = useState<SlotWithTeacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm] = useState('First Term');
  const [filterYear, setFilterYear] = useState(getDefaultAcademicYear());

  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot] = useState<SlotWithTeacher | null>(null);
  const [form, setForm] = useState({ day_of_week: 'Monday' as Day, period: '1', subject: '', teacher_id: '', start_time: '08:00', end_time: '08:45' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
      const cls = (data || []) as Pick<ClassRow, 'id' | 'name'>[];
      setClasses(cls);
      if (cls.length > 0 && !filterClass) setFilterClass(cls[0].id);
    });
    supabase.from('teachers').select('id, profiles:profile_id(first_name, last_name)').eq('is_active', true).then(({ data }) => setTeachers((data || []) as unknown as TeacherOption[]));
  }, []);

  useEffect(() => { if (filterClass) fetchSlots(); }, [filterClass, filterTerm, filterYear]);

  const fetchSlots = async () => {
    if (!filterClass) return;
    setLoading(true);
    const { data } = await supabase
      .from('timetable')
      .select('*, teachers:teacher_id(profiles:profile_id(first_name, last_name))')
      .eq('class_id', filterClass)
      .eq('term', filterTerm)
      .eq('academic_year', filterYear)
      .order('period');
    setSlots((data || []) as SlotWithTeacher[]);
    setLoading(false);
  };

  // Build grid: day -> period -> slot
  const grid: Record<Day, Record<number, SlotWithTeacher>> = {
    Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {},
  };
  const maxPeriod = Math.max(slots.length === 0 ? 8 : Math.max(...slots.map(s => s.period), 8));
  slots.forEach(s => { grid[s.day_of_week as Day][s.period] = s; });
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const openCreate = (day?: Day, period?: number) => {
    setEditSlot(null);
    const startTime = period ? DEFAULT_TIMES[period - 1] ?? '08:00' : '08:00';
    const endTime = period ? DEFAULT_TIMES[period] ?? '08:45' : '08:45';
    setForm({ day_of_week: day ?? 'Monday', period: String(period ?? (maxPeriod + 1)), subject: '', teacher_id: '', start_time: startTime, end_time: endTime });
    setShowModal(true);
  };

  const openEdit = (slot: SlotWithTeacher) => {
    setEditSlot(slot);
    setForm({ day_of_week: slot.day_of_week as Day, period: String(slot.period), subject: slot.subject, teacher_id: slot.teacher_id ?? '', start_time: slot.start_time, end_time: slot.end_time });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.subject.trim()) return setToast({ msg: 'Subject is required', type: 'error' });
    if (!filterClass) return;
    setSaving(true);
    const payload = {
      class_id: filterClass,
      day_of_week: form.day_of_week,
      period: parseInt(form.period) || 1,
      subject: form.subject.trim(),
      teacher_id: form.teacher_id || null,
      start_time: form.start_time,
      end_time: form.end_time,
      term: filterTerm,
      academic_year: filterYear,
    };
    if (editSlot) {
      const { error } = await supabase.from('timetable').update({ subject: payload.subject, teacher_id: payload.teacher_id, start_time: payload.start_time, end_time: payload.end_time }).eq('id', editSlot.id);
      if (error) { setToast({ msg: error.message, type: 'error' }); setSaving(false); return; }
      setToast({ msg: 'Slot updated', type: 'success' });
    } else {
      const { error } = await supabase.from('timetable').insert(payload);
      if (error) { setToast({ msg: error.message, type: 'error' }); setSaving(false); return; }
      setToast({ msg: 'Slot added', type: 'success' });
    }
    setShowModal(false);
    fetchSlots();
    setSaving(false);
  };

  const deleteSlot = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('timetable').delete().eq('id', deleteTarget);
    setToast({ msg: 'Slot deleted', type: 'success' });
    setDeleteTarget(null);
    fetchSlots();
    setDeleting(false);
  };

  const className = classes.find(c => c.id === filterClass)?.name ?? '';

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-6 h-6 text-indigo-500" /> Timetable
        </h2>
        <button onClick={() => openCreate()} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add Slot
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {TERMS.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {getAcademicYearOptions().map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="font-semibold text-gray-800">{className} — {filterTerm} {filterYear}</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-3 text-left text-xs text-gray-500 uppercase w-12">Period</th>
                  {DAYS.map(d => (
                    <th key={d} className="py-3 px-3 text-center text-xs text-gray-500 uppercase">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(p => (
                  <tr key={p} className="border-b border-gray-50">
                    <td className="py-2 px-3 text-center text-xs font-medium text-gray-400">{p}</td>
                    {DAYS.map(day => {
                      const slot = grid[day][p];
                      return (
                        <td key={day} className="py-2 px-2 text-center align-top">
                          {slot ? (
                            <div className="relative group bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-left min-h-[56px]">
                              <p className="font-semibold text-indigo-800 text-xs leading-tight">{slot.subject}</p>
                              {slot.teachers?.profiles && (
                                <p className="text-indigo-500 text-xs mt-0.5">{slot.teachers.profiles.first_name} {slot.teachers.profiles.last_name}</p>
                              )}
                              <p className="text-indigo-400 text-xs">{slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</p>
                              <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                                <button onClick={() => openEdit(slot)} className="p-0.5 bg-white rounded hover:bg-indigo-100"><Edit2 className="w-3 h-3 text-indigo-600" /></button>
                                <button onClick={() => setDeleteTarget(slot.id)} className="p-0.5 bg-white rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => openCreate(day, p)} className="w-full min-h-[56px] rounded-lg border border-dashed border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 text-lg transition-colors">
                              +
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editSlot ? 'Edit Slot' : 'Add Timetable Slot'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Day</label>
                  <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value as Day }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Period</label>
                  <input type="number" min={1} max={12} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={!!editSlot} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teacher (optional)</label>
                <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">None / TBD</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.profiles?.first_name} {t.profiles?.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : editSlot ? 'Update' : 'Add Slot'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 mb-1">Delete this slot?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={deleteSlot} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
