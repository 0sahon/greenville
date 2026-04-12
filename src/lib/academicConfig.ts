/**
 * Shared academic year and term configuration.
 * Academic year follows Sept–Aug cycle (e.g. Sept 2024 = 2024/2025).
 */
export const TERMS = ['First Term', 'Second Term', 'Third Term'] as const;
export type Term = (typeof TERMS)[number];

/** Derives current academic year from date (Sept–Aug cycle). */
export function getDefaultAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0=Jan, 8=Sep
  // Sept (8) onward = new academic year
  if (month >= 8) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

/** Returns a list of academic year options spanning ±2 years from current. */
export function getAcademicYearOptions(): string[] {
  const current = getDefaultAcademicYear();
  const [startStr] = current.split('/');
  const start = parseInt(startStr, 10);
  const options: string[] = [];
  for (let y = start - 2; y <= start + 2; y++) {
    options.push(`${y}/${y + 1}`);
  }
  return options;
}
