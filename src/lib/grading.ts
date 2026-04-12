/**
 * Nigerian secondary school grading scale.
 * Takes a raw score and the maximum possible score; returns grade label + Tailwind color classes.
 */
export function nigerianGrade(score: number, max: number): { label: string; color: string } {
  const p = max > 0 ? (score / max) * 100 : 0;
  if (p >= 75) return { label: 'A1', color: 'text-green-700 bg-green-100' };
  if (p >= 70) return { label: 'B2', color: 'text-blue-700 bg-blue-100' };
  if (p >= 65) return { label: 'B3', color: 'text-blue-600 bg-blue-50' };
  if (p >= 60) return { label: 'C4', color: 'text-cyan-700 bg-cyan-100' };
  if (p >= 55) return { label: 'C5', color: 'text-amber-700 bg-amber-100' };
  if (p >= 50) return { label: 'C6', color: 'text-amber-600 bg-amber-50' };
  if (p >= 45) return { label: 'D7', color: 'text-orange-700 bg-orange-100' };
  if (p >= 40) return { label: 'E8', color: 'text-red-600 bg-red-100' };
  return { label: 'F9', color: 'text-red-800 bg-red-200' };
}
