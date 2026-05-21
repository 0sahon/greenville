/**
 * Per-component raw score grader — used only in grade-sheet UIs where a teacher
 * enters a single assessment score (e.g. 12/15 for CA1).
 * NOT used on printed report cards.
 */
export function nigerianGrade(score: number, max: number): { label: string; color: string } {
  const p = max > 0 ? (score / max) * 100 : 0;
  if (p >= 80) return { label: 'A+', color: 'text-green-700 bg-green-100' };
  if (p >= 70) return { label: 'A',  color: 'text-indigo-700 bg-indigo-100' };
  if (p >= 65) return { label: 'B',  color: 'text-indigo-600 bg-indigo-50' };
  if (p >= 55) return { label: 'C',  color: 'text-amber-700 bg-amber-100' };
  if (p >= 50) return { label: 'D',  color: 'text-amber-600 bg-amber-50' };
  if (p >= 40) return { label: 'E',  color: 'text-orange-700 bg-orange-100' };
  return              { label: 'F',  color: 'text-red-700 bg-red-200' };
}

/**
 * Primary letter-scale grader — canonical function for Greenville Montessori.
 * Accepts a total score out of 100; matches the grading key printed on report cards.
 * Use this everywhere a term total or average is graded (report cards, dashboards, stats).
 */
export function getNigerianGrade(total: number): { grade: string; remark: string; color: string } {
  if (total >= 80) return { grade: 'A+', remark: 'Excellent',        color: 'text-green-700 bg-green-100' };
  if (total >= 70) return { grade: 'A',  remark: 'Very Good',        color: 'text-indigo-700 bg-indigo-100' };
  if (total >= 65) return { grade: 'B',  remark: 'Good',             color: 'text-indigo-600 bg-indigo-50' };
  if (total >= 55) return { grade: 'C',  remark: 'Satisfactory',     color: 'text-amber-700 bg-amber-100' };
  if (total >= 50) return { grade: 'D',  remark: 'Need Improvement', color: 'text-amber-600 bg-amber-50' };
  if (total >= 40) return { grade: 'E',  remark: 'Unsatisfactory',   color: 'text-orange-700 bg-orange-100' };
  return              { grade: 'F',  remark: 'Poor',             color: 'text-red-700 bg-red-200' };
}

export const GRADING_KEY = [
  { grade: 'A+', range: '80% & above', remark: 'Excellent' },
  { grade: 'A',  range: '70% – 79%',   remark: 'Very Good' },
  { grade: 'B',  range: '65% – 69%',   remark: 'Good' },
  { grade: 'C',  range: '55% – 64%',   remark: 'Satisfactory' },
  { grade: 'D',  range: '50% – 54%',   remark: 'Need Improvement' },
  { grade: 'E',  range: '40% – 49%',   remark: 'Unsatisfactory' },
  { grade: 'F',  range: 'Below 40%',   remark: 'Poor' },
] as const;
