/**
 * Canonical assessment-type tokens stored in the grades table.
 * Every write path must pass through normalizeAssessmentType() before hitting the DB.
 * The DB CHECK constraint rejects anything that isn't already normalised.
 */

export const AT = {
  CA1:      '1st CA',
  CA2:      '2nd CA',
  EXAM:     'Exam',
  PROJECT:  'Project',
  HOMEWORK: 'Homework',
  PRE_KG:   'pre_kg',
} as const;

/** Union of every value in AT. */
export type CoreAssessmentType = (typeof AT)[keyof typeof AT];

/** Max score for each core component (out of 100 total). */
export const ASSESSMENT_MAX: Record<CoreAssessmentType, number> = {
  [AT.CA1]:      15,
  [AT.CA2]:      15,
  [AT.EXAM]:     50,
  [AT.PROJECT]:  10,
  [AT.HOMEWORK]: 10,
  [AT.PRE_KG]:    5,
};

/**
 * Normalise any incoming assessment_type string to its canonical form.
 * Known aliases are mapped to AT constants; everything else is title-cased
 * and trimmed (so custom teacher-entered types are stored consistently).
 */
export function normalizeAssessmentType(raw: string): string {
  const s = raw.trim();
  const l = s.toLowerCase();
  if (['1st ca', 'first ca', '1stca', '1st continuous assessment'].includes(l)) return AT.CA1;
  if (['2nd ca', 'second ca', '2ndca', '2nd continuous assessment'].includes(l)) return AT.CA2;
  if (['exam', 'examination', 'final exam', 'final examination'].includes(l))   return AT.EXAM;
  if (['project'].includes(l))                                                   return AT.PROJECT;
  if (['homework', 'home work', 'hw', 'assignment'].includes(l))                return AT.HOMEWORK;
  if (['pre_kg', 'pre kg', 'prekg'].includes(l))                                return AT.PRE_KG;
  // Custom types (e.g. Test, Quiz, CA): title-case first letter.
  return s.charAt(0).toUpperCase() + s.slice(1);
}
