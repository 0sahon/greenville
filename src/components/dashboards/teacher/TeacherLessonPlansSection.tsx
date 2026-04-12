import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Edit2, Trash2, Send, FileText, Printer, LayoutTemplate } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { openLessonPlanPrint } from '../../../lib/lessonPlanPrint';
import { montessoriFivePartTemplate, simpleLessonSkeletonTemplate } from '../../../lib/lessonPlanTemplates';
import type { ProfileRow } from '../../../lib/supabase';

interface CoursePick {
  id: string;
  title: string;
  subject: string;
}

interface Props {
  profile: ProfileRow;
  courses: CoursePick[];
  onToast: (msg: string, type: 'success' | 'error') => void;
}

type PlanStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

interface PlanRow {
  id: string;
  course_id: string;
  teacher_profile_id: string;
  title: string;
  lesson_date: string | null;
  objectives: string | null;
  activities: string | null;
  materials_needed: string | null;
  differentiation: string | null;
  assessment: string | null;
  reflection_notes: string | null;
  status: PlanStatus;
  review_note: string | null;
  courses?: { title: string; subject: string } | null;
}

const emptyForm = () => ({
  course_id: '',
  title: '',
  lesson_date: '',
  objectives: '',
  activities: '',
  materials_needed: '',
  differentiation: '',
  assessment: '',
  reflection_notes: '',
});

const STATUS_STYLE: Record<PlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function TeacherLessonPlansSection({ profile, courses, onToast }: Props) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState<PlanRow | null>(null);
  const [form, setForm] = useState(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lesson_plans')
      .select('*, courses:course_id(title, subject)')
      .eq('teacher_profile_id', profile.id)
      .order('updated_at', { ascending: false });
    if (error) onToast(error.message, 'error');
    setPlans((data || []) as PlanRow[]);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setEdit(null);
    setForm({ ...emptyForm(), course_id: courses[0]?.id ?? '' });
    setShowModal(true);
  };

  const applyTemplate = (kind: 'montessori' | 'simple') => {
    const t = kind === 'montessori' ? montessoriFivePartTemplate() : simpleLessonSkeletonTemplate();
    const hasContent =
      form.objectives.trim() ||
      form.activities.trim() ||
      form.materials_needed.trim() ||
      form.differentiation.trim() ||
      form.assessment.trim() ||
      form.reflection_notes.trim();
    if (hasContent && !window.confirm('Replace section fields with this template?')) return;
    setForm(f => ({
      ...f,
      objectives: t.objectives,
      activities: t.activities,
      materials_needed: t.materials_needed,
      differentiation: t.differentiation,
      assessment: t.assessment,
      reflection_notes: t.reflection_notes,
    }));
  };

  const openEdit = (p: PlanRow) => {
    if (p.status === 'submitted' || p.status === 'approved') {
      onToast('Plans that are submitted or approved cannot be edited here. Save a copy as a new plan if needed.', 'error');
      return;
    }
    setEdit(p);
    setForm({
      course_id: p.course_id,
      title: p.title,
      lesson_date: p.lesson_date ? p.lesson_date.slice(0, 10) : '',
      objectives: p.objectives || '',
      activities: p.activities || '',
      materials_needed: p.materials_needed || '',
      differentiation: p.differentiation || '',
      assessment: p.assessment || '',
      reflection_notes: p.reflection_notes || '',
    });
    setShowModal(true);
  };

  const save = async (asDraft: boolean) => {
    if (!form.course_id || !form.title.trim()) {
      onToast('Topic and plan title are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        teacher_profile_id: profile.id,
        course_id: form.course_id,
        title: form.title.trim(),
        lesson_date: form.lesson_date ? form.lesson_date : null,
        objectives: form.objectives.trim() || null,
        activities: form.activities.trim() || null,
        materials_needed: form.materials_needed.trim() || null,
        differentiation: form.differentiation.trim() || null,
        assessment: form.assessment.trim() || null,
        reflection_notes: form.reflection_notes.trim() || null,
        status: (asDraft ? 'draft' : 'submitted') as PlanStatus,
        review_note: null,
        reviewed_by: null,
        reviewed_at: null,
      };

      if (edit) {
        const { error } = await supabase.from('lesson_plans').update(payload).eq('id', edit.id);
        if (error) throw error;
        onToast(asDraft ? 'Plan saved as draft' : 'Plan submitted for review', 'success');
      } else {
        const { error } = await supabase.from('lesson_plans').insert(payload);
        if (error) throw error;
        onToast(asDraft ? 'Draft created' : 'Plan submitted for review', 'success');
      }
      setShowModal(false);
      void load();
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const submitExisting = async (p: PlanRow) => {
    const { error } = await supabase
      .from('lesson_plans')
      .update({ status: 'submitted', review_note: null, reviewed_by: null, reviewed_at: null })
      .eq('id', p.id);
    if (error) onToast(error.message, 'error');
    else {
      onToast('Submitted to admin for approval', 'success');
      void load();
    }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('lesson_plans').delete().eq('id', deleteId);
    if (error) onToast(error.message, 'error');
    else {
      onToast('Plan deleted', 'success');
      setDeleteId(null);
      void load();
    }
  };

  if (courses.length === 0) {
    return (
      <div className="text-center py-14 text-gray-500 text-sm border border-dashed border-gray-200 rounded-xl bg-white">
        Create a <strong>topic</strong> under Subjects first — lesson plans are attached to a topic (course).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Lesson plans</h3>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Structured objectives, activities, and assessment per topic. Save as draft, then <strong>Submit for review</strong> — an administrator can approve or request changes.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"
        >
          <Plus className="w-4 h-4" /> New plan
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-14 text-gray-400 border border-gray-100 rounded-xl bg-white">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium text-gray-600">No lesson plans yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Topic</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{p.title}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">{p.courses?.subject} · {p.courses?.title}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">{p.lesson_date ? new Date(p.lesson_date).toLocaleDateString('en-NG') : '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLE[p.status] || 'bg-gray-100'}`}>{p.status}</span>
                    {p.review_note && <p className="text-[10px] text-red-600 mt-1 max-w-[140px] truncate" title={p.review_note}>Note: {p.review_note}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {p.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() =>
                            openLessonPlanPrint({
                              title: p.title,
                              topicLine: `${p.courses?.subject ?? ''} · ${p.courses?.title ?? ''}`,
                              lessonDate: p.lesson_date,
                              status: p.status,
                              sections: [
                                { label: 'Objectives', value: p.objectives },
                                { label: 'Activities', value: p.activities },
                                { label: 'Materials needed', value: p.materials_needed },
                                { label: 'Differentiation', value: p.differentiation },
                                { label: 'Assessment', value: p.assessment },
                                { label: 'Reflection', value: p.reflection_notes },
                                { label: 'Admin feedback', value: p.review_note },
                              ],
                            })
                          }
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700"
                          title="Print or save as PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      {(p.status === 'draft' || p.status === 'rejected') && (
                        <>
                          <button type="button" onClick={() => openEdit(p)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => submitExisting(p)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title={p.status === 'rejected' ? 'Resubmit for review' : 'Submit for review'}>
                            <Send className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setDeleteId(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{edit ? 'Edit lesson plan' : 'New lesson plan'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Topic (course) *</label>
                <select
                  value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.subject} — {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Introduction to fractions"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lesson date (optional)</label>
                <input
                  type="date"
                  value={form.lesson_date}
                  onChange={e => setForm(f => ({ ...f, lesson_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('montessori')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pink-200 text-xs font-medium text-pink-800 bg-pink-50 hover:bg-pink-100"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" /> Montessori 5-part
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('simple')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" /> Simple skeleton
                </button>
              </div>
              {(['objectives', 'activities', 'materials_needed', 'differentiation', 'assessment', 'reflection_notes'] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
                  <textarea
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    rows={field === 'activities' ? 4 : 3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-y"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 p-5 border-t border-gray-100">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={() => save(true)} disabled={saving} className="flex-1 py-2.5 border border-pink-300 text-pink-700 rounded-xl text-sm font-medium hover:bg-pink-50 disabled:opacity-50">
                Save draft
              </button>
              <button type="button" onClick={() => save(false)} disabled={saving} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-50">
                Submit for review
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-gray-800 mb-2">Delete this plan?</h4>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setDeleteId(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="button" onClick={doDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
