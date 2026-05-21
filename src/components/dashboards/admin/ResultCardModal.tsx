import React from 'react';
import { X, Download, MessageCircle, EyeOff, Save, Trash2, AlertTriangle } from 'lucide-react';
import ResultCard, {
  getNigerianGrade, printResultCard,
  PRE_KG_SKILLS, PRE_KG_COMMENTS,
  NURSERY_SUBJECTS, NURSERY_CA_MAX, NURSERY_EXAM_MAX,
  BASIC_SUBJECTS, BASIC_CA_MAX, BASIC_EXAM_MAX,
} from './ResultCard';
import type { ResultCardData, SubjectResult, NurseryScores, BasicScores } from './ResultCard';
import PerformanceChart from '../shared/PerformanceChart';

export const defaultMeta = {
  teacher_comment: '', principal_comment: '',
  punctuality: 3, neatness: 3, honesty: 3, cooperation: 3, attentiveness: 3, politeness: 3,
  days_present: 0, days_absent: 0, total_school_days: 0,
  next_term_begins: '', next_term_fees: '', is_published: false,
};

/** MetaForm as used in state — behavior fields may come back null from DB */
export interface MetaForm {
  teacher_comment: string;
  principal_comment: string;
  punctuality: number | null;
  neatness: number | null;
  honesty: number | null;
  cooperation: number | null;
  attentiveness: number | null;
  politeness: number | null;
  days_present: number;
  days_absent: number;
  total_school_days: number;
  next_term_begins: string;
  next_term_fees: string;
  is_published: boolean;
}

export interface StudentInfo {
  id: string;
  student_id: string;
  profiles: { first_name: string; last_name: string; email: string } | null;
  classes: { name: string; level: string } | null;
  gender: string | null;
  date_of_birth: string | null;
}

interface Props {
  student: StudentInfo;
  term: string;
  academicYear: string;
  modalTab: 'preview' | 'edit';
  onTabChange: (t: 'preview' | 'edit') => void;
  onClose: () => void;
  cardData: ResultCardData | null;
  activeSubjects: SubjectResult[];
  isNurseryStudent: boolean;
  isToddlerStudent: boolean;
  isBasicStudent: boolean;
  nurseryScores: NurseryScores;
  basicScores: BasicScores;
  preKgRatings: Partial<Record<string, number>>;
  onNurseryScore: (subject: string, field: 'ca1' | 'ca2' | 'exam' | 'project' | 'homework', value: number) => void;
  onBasicScore: (subject: string, field: 'ca1' | 'ca2' | 'exam' | 'project' | 'homework', value: number) => void;
  onPreKgRating: (skillName: string, rating: number) => void;
  metaForm: MetaForm;
  setMetaForm: React.Dispatch<React.SetStateAction<MetaForm>>;
  saving: boolean;
  onSave: () => Promise<void>;
  deleteConfirm: boolean;
  onDeleteConfirm: (v: boolean) => void;
  onDelete: () => Promise<void>;
  hasResultSheet: boolean;
  onShareWhatsApp: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ResultCardModal({
  student, term, academicYear,
  modalTab, onTabChange, onClose,
  cardData, activeSubjects,
  isNurseryStudent, isToddlerStudent, isBasicStudent,
  nurseryScores, basicScores, preKgRatings,
  onNurseryScore, onBasicScore, onPreKgRating,
  metaForm, setMetaForm,
  saving, onSave,
  deleteConfirm, onDeleteConfirm, onDelete,
  hasResultSheet, onShareWhatsApp, onToast,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              {student.profiles?.first_name} {student.profiles?.last_name} — Report Card
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{term} · {academicYear} · {student.classes?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              <button onClick={() => onTabChange('preview')} className={`px-3 py-1.5 ${modalTab === 'preview' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Preview</button>
              <button onClick={() => onTabChange('edit')} className={`px-3 py-1.5 ${modalTab === 'edit' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Edit Details</button>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>

        <div className="p-6">

          {/* Preview tab */}
          {modalTab === 'preview' && cardData && (
            <div className="space-y-5">
              <ResultCard data={cardData} onPrint={() => printResultCard(`${student.profiles?.first_name} ${student.profiles?.last_name}`, isNurseryStudent || isToddlerStudent)} />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const lvl = student?.classes?.level;
                    const landscape = lvl === 'creche' || lvl === 'toddler';
                    onToast('Tip: In the print dialog, select "Save as PDF" as destination', 'success');
                    printResultCard(`${student?.profiles?.first_name} ${student?.profiles?.last_name}`, landscape);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700">
                  <Download className="w-3.5 h-3.5" /> Export as PDF
                </button>
                {metaForm.is_published && (
                  <button onClick={onShareWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold hover:bg-green-600">
                    <MessageCircle className="w-3.5 h-3.5" /> Share via WhatsApp
                  </button>
                )}
                {!metaForm.is_published && (
                  <span className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                    <EyeOff className="w-3.5 h-3.5" /> Publish report card to enable WhatsApp sharing
                  </span>
                )}
              </div>
              {activeSubjects.length > 0 && (
                <PerformanceChart subjects={activeSubjects} title={`${student.profiles?.first_name} — ${term} Subject Performance`} />
              )}
            </div>
          )}

          {/* Edit tab */}
          {modalTab === 'edit' && (
            <div className="space-y-6">

              {/* Nursery Subject Scores */}
              {isNurseryStudent && (
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">Subject Scores — {student?.classes?.name}</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Enter raw scores: Homework &amp; Project out of 10, CAs out of {NURSERY_CA_MAX}, Exam out of {NURSERY_EXAM_MAX}.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm min-w-[580px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-1/4">Subject</th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Homework<br /><span className="font-normal text-gray-400">/10</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">1st CA<br /><span className="font-normal text-gray-400">/{NURSERY_CA_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">2nd CA<br /><span className="font-normal text-gray-400">/{NURSERY_CA_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Project<br /><span className="font-normal text-gray-400">/10</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Exam<br /><span className="font-normal text-gray-400">/{NURSERY_EXAM_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Total<br /><span className="font-normal text-gray-400">/100</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {NURSERY_SUBJECTS.map((subject, i) => {
                          const s = nurseryScores[subject] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
                          const ca1     = s.ca1     > 0 ? Math.round((s.ca1     / NURSERY_CA_MAX)   * 15) : 0;
                          const ca2     = s.ca2     > 0 ? Math.round((s.ca2     / NURSERY_CA_MAX)   * 15) : 0;
                          const exam    = s.exam    > 0 ? Math.round((s.exam    / NURSERY_EXAM_MAX) * 50) : 0;
                          const project  = s.project  && s.project  > 0 ? Math.round((s.project  / 10) * 10) : 0;
                          const homework = s.homework && s.homework > 0 ? Math.round((s.homework / 10) * 10) : 0;
                          const total = ca1 + ca2 + project + homework + exam;
                          const { grade } = total > 0 ? getNigerianGrade(total) : { grade: '' };
                          const gc = grade.startsWith('A') ? 'text-green-700' : grade === 'B' ? 'text-blue-700' : grade === 'C' ? 'text-yellow-700' : grade ? 'text-red-700' : 'text-gray-300';
                          return (
                            <tr key={subject} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                              <td className="py-2 px-3 font-medium text-gray-700 text-xs">{subject}</td>
                              {(['homework', 'ca1', 'ca2', 'project', 'exam'] as const).map(field => (
                                <td key={field} className="py-1 px-1 text-center">
                                  <input
                                    type="number" min={0}
                                    max={field === 'exam' ? NURSERY_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? NURSERY_CA_MAX : 10}
                                    value={s[field] || ''}
                                    onChange={e => onNurseryScore(subject, field, Math.min(Number(e.target.value), field === 'exam' ? NURSERY_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? NURSERY_CA_MAX : 10))}
                                    className="w-12 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500"
                                  />
                                </td>
                              ))}
                              <td className="py-2 px-1 text-center">
                                <span className={`font-bold text-xs ${gc}`}>{total > 0 ? `${total} (${grade})` : '—'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Basic Subject Scores */}
              {isBasicStudent && (
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">Subject Scores — {student?.classes?.name}</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Enter raw scores: Homework &amp; Project out of 10, CAs out of {BASIC_CA_MAX}, Exam out of {BASIC_EXAM_MAX}.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm min-w-[580px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-1/4">Subject</th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Homework<br /><span className="font-normal text-gray-400">/10</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">1st CA<br /><span className="font-normal text-gray-400">/{BASIC_CA_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">2nd CA<br /><span className="font-normal text-gray-400">/{BASIC_CA_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Project<br /><span className="font-normal text-gray-400">/10</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Exam<br /><span className="font-normal text-gray-400">/{BASIC_EXAM_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Total<br /><span className="font-normal text-gray-400">/100</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {BASIC_SUBJECTS.map((subject, i) => {
                          const s = basicScores[subject] ?? { ca1: 0, ca2: 0, exam: 0, project: 0, homework: 0 };
                          const ca1     = s.ca1     > 0 ? Math.round((s.ca1     / BASIC_CA_MAX)   * 15) : 0;
                          const ca2     = s.ca2     > 0 ? Math.round((s.ca2     / BASIC_CA_MAX)   * 15) : 0;
                          const exam    = s.exam    > 0 ? Math.round((s.exam    / BASIC_EXAM_MAX) * 50) : 0;
                          const project  = s.project  && s.project  > 0 ? Math.round((s.project  / 10) * 10) : 0;
                          const homework = s.homework && s.homework > 0 ? Math.round((s.homework / 10) * 10) : 0;
                          const total = ca1 + ca2 + project + homework + exam;
                          const { grade } = total > 0 ? getNigerianGrade(total) : { grade: '' };
                          const gc = grade.startsWith('A') ? 'text-green-700' : grade === 'B' ? 'text-blue-700' : grade === 'C' ? 'text-yellow-700' : grade ? 'text-red-700' : 'text-gray-300';
                          return (
                            <tr key={subject} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                              <td className="py-2 px-3 font-medium text-gray-700 text-xs">{subject}</td>
                              {(['homework', 'ca1', 'ca2', 'project', 'exam'] as const).map(field => (
                                <td key={field} className="py-1 px-1 text-center">
                                  <input
                                    type="number" min={0}
                                    max={field === 'exam' ? BASIC_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? BASIC_CA_MAX : 10}
                                    value={s[field] || ''}
                                    onChange={e => onBasicScore(subject, field, Math.min(Number(e.target.value), field === 'exam' ? BASIC_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? BASIC_CA_MAX : 10))}
                                    className="w-12 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500"
                                  />
                                </td>
                              ))}
                              <td className="py-2 px-1 text-center">
                                <span className={`font-bold text-xs ${gc}`}>{total > 0 ? `${total} (${grade})` : '—'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pre-KG Skill Ratings */}
              {isToddlerStudent && (
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">Skill Ratings — Toddler Pre-KG</h4>
                  <p className="text-xs text-gray-400 mb-3">Select a rating for each skill area. Quick buttons or use the dropdown for manual selection.</p>
                  <div className="grid grid-cols-1 gap-3">
                    {PRE_KG_SKILLS.map(skill => {
                      const current = preKgRatings[skill.name] || 0;
                      return (
                        <div key={skill.name} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-sm font-semibold text-gray-700">{skill.name}</span>
                            {current > 0 && (
                              <span className="text-xs text-green-700 font-medium italic truncate max-w-[220px]">
                                {PRE_KG_COMMENTS[skill.name]?.[current]}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {[
                              { r: 5, label: 'Excellent',         cls: 'bg-green-100 text-green-800 border-green-300' },
                              { r: 4, label: 'Very Good',         cls: 'bg-blue-100 text-blue-800 border-blue-300' },
                              { r: 3, label: 'Good',              cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                              { r: 2, label: 'Fair',              cls: 'bg-orange-100 text-orange-800 border-orange-300' },
                              { r: 1, label: 'Needs Improvement', cls: 'bg-red-100 text-red-800 border-red-300' },
                            ].map(({ r, label, cls }) => (
                              <button
                                key={r}
                                onClick={() => onPreKgRating(skill.name, current === r ? 0 : r)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                  current === r
                                    ? cls + ' ring-2 ring-offset-1 ring-green-400'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <select
                            value={current}
                            onChange={e => onPreKgRating(skill.name, Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          >
                            <option value={0}>— Not rated —</option>
                            {[5, 4, 3, 2, 1].map(r => (
                              <option key={r} value={r}>
                                {['', 'Needs Improvement', 'Fair', 'Good', 'Very Good', 'Excellent'][r]} — {PRE_KG_COMMENTS[skill.name]?.[r]}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Behavior Ratings for Nursery/Basic */}
              {(isNurseryStudent || isBasicStudent) && (
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">Behavior Ratings</h4>
                  <p className="text-xs text-gray-400 mb-3">Rate student behaviors on a scale of 1-5 (1: Poor, 3: Good, 5: Excellent).</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'punctuality' as const, label: 'Punctuality' },
                      { key: 'neatness' as const, label: 'Neatness' },
                      { key: 'honesty' as const, label: 'Honesty' },
                      { key: 'cooperation' as const, label: 'Cooperation' },
                      { key: 'attentiveness' as const, label: 'Attentiveness' },
                      { key: 'politeness' as const, label: 'Politeness' },
                    ].map(({ key, label }) => {
                      const val = metaForm[key] ?? 3;
                      return (
                        <div key={key} className="flex flex-col gap-1.5 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">{label}</span>
                            <span className="text-xs font-bold text-indigo-600">
                              {val === 5 ? 'Excellent (5)' : val === 4 ? 'Very Good (4)' : val === 3 ? 'Good (3)' : val === 2 ? 'Fair (2)' : 'Poor (1)'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(score => {
                              const active = val === score;
                              return (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() => setMetaForm(f => ({ ...f, [key]: score }))}
                                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                    active
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold scale-[1.02]'
                                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                  }`}
                                >
                                  {score}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attendance */}
              <div>
                <h4 className="font-semibold text-gray-800 text-sm mb-3">Attendance Record</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total School Days', key: 'total_school_days' as const },
                    { label: 'Days Present',       key: 'days_present'      as const },
                    { label: 'Days Absent',        key: 'days_absent'       as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input type="number" min={0} value={metaForm[key]}
                        onChange={e => setMetaForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 text-sm mb-1">Remarks</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Class Teacher's Remark</label>
                  <textarea rows={3} value={metaForm.teacher_comment} onChange={e => setMetaForm(f => ({ ...f, teacher_comment: e.target.value }))}
                    placeholder="e.g. A diligent student who shows great potential…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Proprietress' Remark</label>
                  <textarea rows={3} value={metaForm.principal_comment} onChange={e => setMetaForm(f => ({ ...f, principal_comment: e.target.value }))}
                    placeholder="e.g. Excellent performance. We are proud of your achievements!"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
              </div>

              {/* Next term */}
              <div>
                <h4 className="font-semibold text-gray-800 text-sm mb-3">Next Term</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date of Resumption</label>
                    <input type="date" value={metaForm.next_term_begins} onChange={e => setMetaForm(f => ({ ...f, next_term_begins: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fees for Next Term</label>
                    <input value={metaForm.next_term_fees} onChange={e => setMetaForm(f => ({ ...f, next_term_fees: e.target.value }))}
                      placeholder="₦150,000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
              </div>

              {/* Publish */}
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                <input type="checkbox" id="published" checked={metaForm.is_published} onChange={e => setMetaForm(f => ({ ...f, is_published: e.target.checked }))}
                  className="w-4 h-4 rounded accent-green-700 cursor-pointer" />
                <label htmlFor="published" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Publish report card — visible to parents
                </label>
              </div>

              {/* Action row */}
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => onTabChange('preview')} className="flex-1 min-w-[110px] py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                  Preview Card
                </button>
                <button onClick={onSave} disabled={saving} className="flex-1 min-w-[140px] py-2.5 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save Report Card'}
                </button>

                {hasResultSheet && !deleteConfirm && (
                  <button onClick={() => onDeleteConfirm(true)}
                    className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
                {deleteConfirm && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm w-full">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 flex-1">Delete this report card permanently?</span>
                    <button onClick={onDelete} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Yes, delete</button>
                    <button onClick={() => onDeleteConfirm(false)} className="px-3 py-1 border border-gray-200 rounded-lg text-xs hover:bg-white">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
