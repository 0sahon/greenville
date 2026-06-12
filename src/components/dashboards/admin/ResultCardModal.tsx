import React, { useState } from 'react';
import { X, Download, MessageCircle, EyeOff, Save, Trash2, AlertTriangle, CopyCheck, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getNigerianGrade } from '../../../lib/grading';
import ResultCard, {
  printResultCard,
  PRE_KG_SKILLS, PRE_KG_COMMENTS,
  NURSERY_SUBJECTS, NURSERY_CA_MAX, NURSERY_EXAM_MAX,
  BASIC_SUBJECTS, BASIC_CA_MAX, BASIC_EXAM_MAX,
} from './ResultCard';
import type { ResultCardData, SubjectResult, NurseryScores, BasicScores } from './ResultCard';

const PRE_KG_DOMAINS = [
  { domain: 'Language & Literacy',  icon: '📚', skills: ['Literacy', 'Phonics', 'Scribbling'] },
  { domain: 'Numbers & Thinking',   icon: '🔢', skills: ['Numeracy', 'Understanding'] },
  { domain: 'Character & Conduct',  icon: '⭐', skills: ['Obedience', 'Individual Behaviour', 'Care of Self', 'Punctuality'] },
  { domain: 'Social & Creative',    icon: '🎨', skills: ['Social Habit', 'Creative Play'] },
  { domain: 'Faith & Values',       icon: '✝️', skills: ['Bible Studies'] },
] as const;
const PRE_KG_FACES       = ['', '😔', '😐', '🙂', '😊', '🌟'] as const;
const PRE_KG_FACE_LABELS = ['', 'Needs Work', 'Fair', 'Good', 'Very Good', 'Excellent'] as const;

export const defaultMeta = {
  teacher_comment: '', principal_comment: '',
  punctuality: 3, neatness: 3, honesty: 3, cooperation: 3, attentiveness: 3, politeness: 3,
  days_present: 0, days_absent: 0, total_school_days: 0,
  next_term_begins: '', next_term_fees: '', outstanding_fees: '', is_published: false,
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
  outstanding_fees: string;
  is_published: boolean;
}

export interface StudentInfo {
  id: string;
  student_id: string;
  report_pin?: string | null;
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
  preKgCommentChoices: Record<string, number>;
  onPreKgCommentChoice: (skill: string, idx: number) => void;
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
  activeCardError?: string | null;
  onPrev?: () => void;
  onNext?: () => void;
  studentPosition?: string;
  isDirty?: boolean;
}

export default function ResultCardModal({
  student, term, academicYear,
  modalTab, onTabChange, onClose,
  cardData,
  isNurseryStudent, isToddlerStudent, isBasicStudent,
  nurseryScores, basicScores, preKgRatings, preKgCommentChoices, onPreKgCommentChoice,
  onNurseryScore, onBasicScore, onPreKgRating,
  metaForm, setMetaForm,
  saving, onSave,
  deleteConfirm, onDeleteConfirm, onDelete,
  hasResultSheet, onShareWhatsApp, onToast,
  activeCardError,
  onPrev, onNext, studentPosition, isDirty,
}: Props) {
  const [copyingLastTerm, setCopyingLastTerm] = useState(false);

  const prevTermInfo = (() => {
    if (term === 'Second Term') return { term: 'First Term', year: academicYear };
    if (term === 'Third Term') return { term: 'Second Term', year: academicYear };
    const [start] = academicYear.split('/');
    const prevYear = `${parseInt(start) - 1}/${parseInt(start)}`;
    return { term: 'Third Term', year: prevYear };
  })();

  const copyFromLastTerm = async () => {
    setCopyingLastTerm(true);
    try {
      const { data } = await supabase
        .from('result_sheets')
        .select('punctuality,neatness,honesty,cooperation,attentiveness,politeness,days_present,days_absent,total_school_days')
        .eq('student_id', student.id)
        .eq('term', prevTermInfo.term)
        .eq('academic_year', prevTermInfo.year)
        .maybeSingle();
      if (!data) { onToast(`No record found for ${prevTermInfo.term} ${prevTermInfo.year}`, 'error'); return; }
      setMetaForm(f => ({
        ...f,
        punctuality:    data.punctuality    ?? f.punctuality,
        neatness:       data.neatness       ?? f.neatness,
        honesty:        data.honesty        ?? f.honesty,
        cooperation:    data.cooperation    ?? f.cooperation,
        attentiveness:  data.attentiveness  ?? f.attentiveness,
        politeness:     data.politeness     ?? f.politeness,
        days_present:   data.days_present   ?? f.days_present,
        days_absent:    data.days_absent    ?? f.days_absent,
        total_school_days: data.total_school_days ?? f.total_school_days,
      }));
      onToast(`Copied behavior & attendance from ${prevTermInfo.term}`, 'success');
    } finally {
      setCopyingLastTerm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">

        {/* Modal header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onPrev} disabled={!onPrev} title="Previous student (Alt+←)"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-700 disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 text-base truncate">
                  {student.profiles?.first_name} {student.profiles?.last_name} — Report Card
                </h3>
                {isDirty && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Unsaved changes" />}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {term} · {academicYear} · {student.classes?.name}
                {studentPosition && <span className="ml-2 text-green-700 font-medium">{studentPosition}</span>}
              </p>
            </div>
            <button onClick={onNext} disabled={!onNext} title="Next student (Alt+→)"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-700 disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              <button onClick={() => onTabChange('preview')} className={`px-3 py-1.5 ${modalTab === 'preview' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Preview</button>
              <button onClick={() => onTabChange('edit')} className={`px-3 py-1.5 ${modalTab === 'edit' ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Edit Details</button>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>

        <div className="p-6">

          {/* Preview tab — show error or spinner while cardData loads */}
          {modalTab === 'preview' && !cardData && activeCardError && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-red-700">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <p className="text-sm font-semibold">Failed to load report card</p>
              <pre className="text-xs bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-lg w-full whitespace-pre-wrap break-words text-red-800">{activeCardError}</pre>
              <p className="text-xs text-gray-500">Close this dialog and try again, or check your connection.</p>
            </div>
          )}
          {modalTab === 'preview' && !cardData && !activeCardError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <div className="w-8 h-8 border-4 border-green-300 border-t-green-600 rounded-full animate-spin" />
              <p className="text-sm">Loading result card…</p>
            </div>
          )}

          {modalTab === 'preview' && cardData && (
            <div className="space-y-5">
              {/* Scrollable + auto-scaled wrapper so the fixed-width card is readable on phones */}
              <div className="overflow-x-auto -mx-6 px-6">
                <div style={{ minWidth: isToddlerStudent ? 760 : 620 }}>
                  <ResultCard data={cardData} onPrint={() => printResultCard(`${student.profiles?.first_name} ${student.profiles?.last_name}`, isNurseryStudent || isToddlerStudent)} />
                </div>
              </div>

              {/* Toddler: comment picker — teacher selects from 5 options per rated skill */}
              {isToddlerStudent && (
                <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50">
                  <h4 className="font-semibold text-indigo-800 text-sm mb-1">Balloon Comments</h4>
                  <p className="text-xs text-indigo-500 mb-3">Click a comment to use it inside each balloon. The highlighted option is currently shown on the card.</p>
                  <div className="space-y-3">
                    {PRE_KG_SKILLS
                      .filter(skill => (cardData.subjects.find(s => s.subject === skill.name)?.total ?? 0) > 0)
                      .map(skill => {
                        const subj = cardData.subjects.find(s => s.subject === skill.name);
                        const rating = subj ? (subj.total >= 18 ? 5 : subj.total >= 14 ? 4 : subj.total >= 10 ? 3 : subj.total >= 6 ? 2 : 1) : 0;
                        const options = PRE_KG_COMMENTS[skill.name]?.[rating] ?? [];
                        if (!options.length) return null;
                        const nameHash = cardData.student.name.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0);
                        const currentIdx = preKgCommentChoices[skill.name] ?? (nameHash % options.length);
                        return (
                          <div key={skill.name}>
                            <div className="text-xs font-semibold text-indigo-700 mb-1">{skill.name} <span className="font-normal text-indigo-400">— {['','Needs Improvement','Fair','Good','Very Good','Excellent'][rating]}</span></div>
                            <div className="flex flex-wrap gap-1.5">
                              {options.map((opt, i) => (
                                <button key={i} onClick={() => onPreKgCommentChoice(skill.name, i)}
                                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${i === currentIdx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'}`}>
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const lvl = student?.classes?.level;
                    const landscape = lvl === 'creche' || lvl === 'toddler';
                    const hint = landscape
                      ? 'Tip: Select "Landscape" orientation in the print dialog, then "Save as PDF"'
                      : 'Tip: In the print dialog, select "Save as PDF" as destination';
                    onToast(hint, 'success');
                    printResultCard(`${student?.profiles?.first_name} ${student?.profiles?.last_name}`, landscape);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700">
                  <Download className="w-3.5 h-3.5" /> Export as PDF
                </button>
                {metaForm.is_published && (
                  <button
                    onClick={() => {
                      // Step 1: open print/save-as-PDF dialog so user gets the file
                      const lvl = student?.classes?.level;
                      const landscape = lvl === 'creche' || lvl === 'toddler';
                      printResultCard(`${student?.profiles?.first_name} ${student?.profiles?.last_name}`, landscape);
                      // Step 2: after brief delay, open WhatsApp so user can attach the saved PDF
                      setTimeout(() => onShareWhatsApp(), 800);
                    }}
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
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="sticky left-0 z-10 bg-gray-50 text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-28 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">Subject</th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">HW<br /><span className="font-normal text-gray-400">/10</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">1st CA<br /><span className="font-normal text-gray-400">/{NURSERY_CA_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">2nd CA<br /><span className="font-normal text-gray-400">/{NURSERY_CA_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Proj<br /><span className="font-normal text-gray-400">/10</span></th>
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
                          const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                          return (
                            <tr key={subject} className={`border-b border-gray-50 ${rowBg}`}>
                              <td className={`sticky left-0 z-10 py-2 px-3 font-semibold text-gray-800 text-xs shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] ${rowBg}`}>{subject}</td>
                              {(['homework', 'ca1', 'ca2', 'project', 'exam'] as const).map(field => (
                                <td key={field} className="py-1 px-1 text-center">
                                  <input
                                    type="number" inputMode="numeric" min={0}
                                    max={field === 'exam' ? NURSERY_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? NURSERY_CA_MAX : 10}
                                    value={s[field] || ''}
                                    onChange={e => onNurseryScore(subject, field, Math.min(Number(e.target.value), field === 'exam' ? NURSERY_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? NURSERY_CA_MAX : 10))}
                                    className="w-14 border border-gray-200 rounded-lg px-1 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                  />
                                </td>
                              ))}
                              <td className="py-2 px-1 text-center">
                                <span className={`font-bold text-sm ${gc}`}>{total > 0 ? `${total}` : '—'}{grade && total > 0 && <span className="text-xs ml-1">({grade})</span>}</span>
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
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="sticky left-0 z-10 bg-gray-50 text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-28 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">Subject</th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">HW<br /><span className="font-normal text-gray-400">/10</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">1st CA<br /><span className="font-normal text-gray-400">/{BASIC_CA_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">2nd CA<br /><span className="font-normal text-gray-400">/{BASIC_CA_MAX}</span></th>
                          <th className="py-2 px-1 text-center text-xs font-semibold text-gray-600 uppercase">Proj<br /><span className="font-normal text-gray-400">/10</span></th>
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
                          const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                          return (
                            <tr key={subject} className={`border-b border-gray-50 ${rowBg}`}>
                              <td className={`sticky left-0 z-10 py-2 px-3 font-semibold text-gray-800 text-xs shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] ${rowBg}`}>{subject}</td>
                              {(['homework', 'ca1', 'ca2', 'project', 'exam'] as const).map(field => (
                                <td key={field} className="py-1 px-1 text-center">
                                  <input
                                    type="number" inputMode="numeric" min={0}
                                    max={field === 'exam' ? BASIC_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? BASIC_CA_MAX : 10}
                                    value={s[field] || ''}
                                    onChange={e => onBasicScore(subject, field, Math.min(Number(e.target.value), field === 'exam' ? BASIC_EXAM_MAX : (field === 'ca1' || field === 'ca2') ? BASIC_CA_MAX : 10))}
                                    className="w-14 border border-gray-200 rounded-lg px-1 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                  />
                                </td>
                              ))}
                              <td className="py-2 px-1 text-center">
                                <span className={`font-bold text-sm ${gc}`}>{total > 0 ? `${total}` : '—'}{grade && total > 0 && <span className="text-xs ml-1">({grade})</span>}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pre-KG Skill Ratings — emoji face, domain-grouped */}
              {isToddlerStudent && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">Skill Ratings — Pre-KG</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Tap a face to rate each skill. 😔 Needs Work · 😐 Fair · 🙂 Good · 😊 Very Good · 🌟 Excellent</p>
                    </div>
                    <button
                      onClick={() => { PRE_KG_SKILLS.forEach(s => onPreKgRating(s.name, 3)); }}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
                    >
                      🙂 Set all Good
                    </button>
                  </div>
                  <div className="space-y-4">
                    {PRE_KG_DOMAINS.map(({ domain, icon, skills }) => (
                      <div key={domain} className="border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="px-4 py-2 bg-green-50 border-b border-green-100">
                          <span className="text-sm font-bold text-green-800">{icon} {domain}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {(skills as readonly string[]).map(skillName => {
                            const current = preKgRatings[skillName] || 0;
                            const commentOptions = PRE_KG_COMMENTS[skillName]?.[current] ?? [];
                            const selectedIdx = preKgCommentChoices[skillName] ?? 0;
                            return (
                              <div key={skillName} className="flex flex-col px-4 py-3 bg-white gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700 flex-1 min-w-[120px]">{skillName}</span>
                                  <div className="flex items-center gap-1">
                                    {[1,2,3,4,5].map(r => (
                                      <button
                                        key={r}
                                        onClick={() => onPreKgRating(skillName, current === r ? 0 : r)}
                                        title={PRE_KG_FACE_LABELS[r]}
                                        className={`text-2xl leading-none rounded-full w-10 h-10 flex items-center justify-center transition-all border-2 ${
                                          current === r
                                            ? 'border-green-400 bg-green-50 scale-110 shadow-sm'
                                            : 'border-transparent opacity-40 hover:opacity-80 hover:scale-105'
                                        }`}
                                      >
                                        {PRE_KG_FACES[r]}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {current > 0 && commentOptions.length > 0 && (
                                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5">
                                    {commentOptions.map((opt, i) => (
                                      <button key={i} type="button"
                                        onClick={() => onPreKgCommentChoice(skillName, i)}
                                        className={`w-full sm:w-auto text-xs px-3 py-2 rounded-lg border transition-all text-left ${
                                          i === selectedIdx
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-700'
                                        }`}>
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavior Ratings for Nursery/Basic */}
              {(isNurseryStudent || isBasicStudent) && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-800 text-sm">Behavior Ratings</h4>
                    <button
                      type="button"
                      onClick={copyFromLastTerm}
                      disabled={copyingLastTerm}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                      title={`Copy behavior & attendance from ${prevTermInfo.term}`}
                    >
                      <CopyCheck className="w-3.5 h-3.5" />
                      {copyingLastTerm ? 'Copying…' : `Copy from ${prevTermInfo.term}`}
                    </button>
                  </div>
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
                {(isToddlerStudent || isNurseryStudent) ? (
                  <>
                    <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100">
                      Keep remarks short — 3 to 7 words. Tap any suggestion to fill.
                    </p>

                    {/* Teacher remark */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-600">Class Teacher&apos;s Remark</label>
                        <button
                          type="button"
                          onClick={() => {
                            const activeSubjectsLocal = cardData?.subjects ?? [];
                            const scored = activeSubjectsLocal.filter(s => s.total > 0);
                            if (!scored.length) { onToast('Enter scores first to generate a smart comment', 'error'); return; }
                            const avg = Math.round(scored.reduce((s, r) => s + r.total, 0) / scored.length);
                            const name = (student.profiles?.first_name) || 'This student';
                            let comment = '';
                            if (avg >= 85)      comment = `${name} has delivered an outstanding performance this term with a ${avg}% average — truly exceptional!`;
                            else if (avg >= 75) comment = `${name} has performed very well this term, achieving a ${avg}% average. A dedicated and hardworking student.`;
                            else if (avg >= 65) comment = `${name} showed good effort this term with a ${avg}% average. Continue to aim higher next term.`;
                            else if (avg >= 50) comment = `${name} showed fair performance this term (${avg}%). More focus and effort is needed to improve.`;
                            else                comment = `${name} needs to work much harder next term — a ${avg}% average shows room for significant improvement.`;
                            setMetaForm(f => ({ ...f, teacher_comment: comment }));
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100"
                          title="Auto-generate comment from scores"
                        >
                          <Sparkles className="w-3 h-3" /> Auto
                        </button>
                      </div>
                      <input type="text" value={metaForm.teacher_comment}
                        onChange={e => setMetaForm(f => ({ ...f, teacher_comment: e.target.value }))}
                        placeholder="Tap a suggestion below or type…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          'Great effort this term!',
                          'Excellent student, well done!',
                          'Good work, keep it up!',
                          'Making steady progress!',
                          'Wonderful improvement shown!',
                          'Always ready to learn!',
                          'Brilliant performance this term!',
                          'A joy to teach!',
                          'Very bright and active child!',
                          'Hard worker, keep going!',
                          'Shows great potential!',
                          'Improving steadily, well done!',
                          'Needs more focus in class.',
                          'Needs more effort next term.',
                          'Keep practising at home.',
                          'Good listener in class!',
                          'Very enthusiastic learner!',
                          'Excellent conduct and attitude!',
                          'Participates actively in class!',
                          'Needs parental support at home.',
                        ].map(s => (
                          <button key={s} type="button"
                            onClick={() => setMetaForm(f => ({ ...f, teacher_comment: s }))}
                            className={`px-2.5 py-1 rounded-full border text-xs transition-all ${metaForm.teacher_comment === s ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500 hover:text-green-700'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Proprietress remark */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-600">Proprietress&apos; Remark</label>
                      <input type="text" value={metaForm.principal_comment}
                        onChange={e => setMetaForm(f => ({ ...f, principal_comment: e.target.value }))}
                        placeholder="Tap a suggestion below or type…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          'Well done, keep it up!',
                          'Excellent work this term!',
                          'Great performance, keep shining!',
                          'Proud of your progress!',
                          'Keep up the good work!',
                          'Outstanding performance this term!',
                          'Wonderful child, well done!',
                          'Good effort, keep improving!',
                          'We are proud of you!',
                          'Keep shining, bright star!',
                          'Good start, keep going!',
                          'Excellent conduct this term!',
                          'Very impressive improvement shown!',
                          'A promising young learner!',
                          'Needs more effort at home.',
                          'Encourage more reading at home.',
                          'Great potential, keep working hard!',
                          'Well behaved, keep it up!',
                          'Needs improvement next term.',
                          'Steady progress, well done!',
                        ].map(s => (
                          <button key={s} type="button"
                            onClick={() => setMetaForm(f => ({ ...f, principal_comment: s }))}
                            className={`px-2.5 py-1 rounded-full border text-xs transition-all ${metaForm.principal_comment === s ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500 hover:text-green-700'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100">
                      Tap any suggestion to fill, or type your own remark.
                    </p>
                    {/* Teacher remark with suggestions */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-600">Class Teacher&apos;s Remark</label>
                      <textarea rows={2} value={metaForm.teacher_comment} onChange={e => setMetaForm(f => ({ ...f, teacher_comment: e.target.value }))}
                        placeholder="e.g. A diligent student who shows great potential…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          'An outstanding student — well done!',
                          'Brilliant performance this term!',
                          'Excellent work, keep it up!',
                          'Very impressive results this term!',
                          'Hard worker with great attitude!',
                          'Consistent performance, well done!',
                          'Shows strong academic potential!',
                          'Good effort, aim higher next term!',
                          'Improving steadily, keep it up!',
                          'Needs to work harder next term.',
                          'Must improve study habits at home.',
                          'Participates actively in class!',
                          'Very focused and dedicated student!',
                          'A pleasure to teach — well done!',
                        ].map(s => (
                          <button key={s} type="button"
                            onClick={() => setMetaForm(f => ({ ...f, teacher_comment: s }))}
                            className={`px-2.5 py-1 rounded-full border text-xs transition-all ${metaForm.teacher_comment === s ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500 hover:text-green-700'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Proprietress remark with suggestions */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-600">Proprietress&apos; Remark</label>
                      <textarea rows={2} value={metaForm.principal_comment} onChange={e => setMetaForm(f => ({ ...f, principal_comment: e.target.value }))}
                        placeholder="e.g. Excellent performance. We are proud of your achievements!"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          'Excellent performance, we are proud!',
                          'Keep up the outstanding work!',
                          'Great achievement this term!',
                          'Wonderful results — keep shining!',
                          'A credit to the school, well done!',
                          'Outstanding effort, keep it up!',
                          'Very impressive improvement shown!',
                          'We are proud of your dedication!',
                          'Good work — aim for the top!',
                          'Needs more effort next term.',
                          'Encourage more reading at home.',
                          'Great potential, keep working hard!',
                          'Well behaved and focused student!',
                          'Steady progress, well done!',
                        ].map(s => (
                          <button key={s} type="button"
                            onClick={() => setMetaForm(f => ({ ...f, principal_comment: s }))}
                            className={`px-2.5 py-1 rounded-full border text-xs transition-all ${metaForm.principal_comment === s ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500 hover:text-green-700'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Outstanding Balance (optional)</label>
                    <input value={metaForm.outstanding_fees} onChange={e => setMetaForm(f => ({ ...f, outstanding_fees: e.target.value }))}
                      placeholder="e.g. ₦25,000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
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
