/**
 * Shared grade-computation helpers used by admin, teacher, parent, and student dashboards.
 * Uses the raw/direct scoring model: scores are stored at face value (15 is 15, 50 is 50),
 * so we cap at the canonical max rather than rescaling by the stored max_score.
 */

import { getNigerianGrade } from './grading';
import { AT, normalizeAssessmentType } from './assessmentTypes';
import type { SubjectResult } from '../components/dashboards/admin/ResultCard';

export const PRE_KG_SKILLS = [
  { name: 'Literacy',             col: 'left'   },
  { name: 'Understanding',        col: 'center' },
  { name: 'Obedience',            col: 'center' },
  { name: 'Care of Self',         col: 'right'  },
  { name: 'Individual Behaviour', col: 'right'  },
  { name: 'Punctuality',          col: 'left'   },
  { name: 'Numeracy',             col: 'center' },
  { name: 'Bible Studies',        col: 'right'  },
  { name: 'Creative Play',        col: 'right'  },
  { name: 'Phonics',              col: 'left'   },
  { name: 'Scribbling',           col: 'right'  },
  { name: 'Social Habit',         col: 'right'  },
] as const;

export function buildPreKgSubjects(ratings: Partial<Record<string, number>>): SubjectResult[] {
  return PRE_KG_SKILLS
    .filter(s => (ratings[s.name] ?? 0) > 0)
    .map(s => {
      const r = ratings[s.name] ?? 0;
      const ca1 = Math.round((r / 5) * 20);
      return { subject: s.name, ca1, ca2: 0, exam: 0, total: ca1, grade: '', remark: '' };
    });
}

interface GradeRecord {
  subject: string;
  assessment_type: string;
  score: number;
  max_score: number;
}

type ComponentBucket = {
  ca1:     { score: number; max: number } | null;
  ca2:     { score: number; max: number } | null;
  exam:    { score: number; max: number } | null;
  hw:      { score: number; max: number } | null;
  project: { score: number; max: number } | null;
};

export function computeSubjects(grades: GradeRecord[]): SubjectResult[] {
  const map = new Map<string, ComponentBucket>();

  for (const g of grades) {
    const key  = (g.subject || '').trim();
    if (!map.has(key)) map.set(key, { ca1: null, ca2: null, exam: null, hw: null, project: null });
    const entry = map.get(key)!;
    const type  = normalizeAssessmentType(g.assessment_type || '');

    if (type === AT.HOMEWORK) {
      entry.hw = { score: g.score, max: g.max_score };
    } else if (type === AT.CA1) {
      entry.ca1 = { score: g.score, max: g.max_score };
    } else if (type === AT.CA2) {
      entry.ca2 = { score: g.score, max: g.max_score };
    } else if (type === AT.EXAM) {
      entry.exam = { score: g.score, max: g.max_score };
    } else if (type === AT.PROJECT) {
      entry.project = { score: g.score, max: g.max_score };
    } else if (type !== AT.PRE_KG) {
      // Custom types (Test, Quiz, CA …) — slot into first available CA bucket
      if (!entry.ca1) entry.ca1 = { score: g.score, max: g.max_score };
      else if (!entry.ca2) entry.ca2 = { score: g.score, max: g.max_score };
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, s]) => {
      const ca1      = s.ca1     ? Math.min(Math.round(s.ca1.score),     15) : 0;
      const ca2      = s.ca2     ? Math.min(Math.round(s.ca2.score),     15) : 0;
      const exam     = s.exam    ? Math.min(Math.round(s.exam.score),    50) : 0;
      const homework = s.hw      ? Math.min(Math.round(s.hw.score),      10) : 0;
      const project  = s.project ? Math.min(Math.round(s.project.score), 10) : 0;
      const total    = ca1 + ca2 + exam + homework + project;
      return { subject, ca1, ca2, exam, homework, project, total, ...getNigerianGrade(total) };
    });
}
