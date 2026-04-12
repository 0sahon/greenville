import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { appStorageFrom, SUBMISSION_WORK_BUCKET } from './storageBuckets';

export { SUBMISSION_WORK_BUCKET };

/** Stable object key: student auth uid / assignment id / fixed name (upsert overwrites). */
export function submissionWorkObjectPath(userId: string, assignmentId: string): string {
  return `${userId}/${assignmentId}/work`;
}

/** Second object in same folder: PDF / Word / slides / sheets (upsert overwrites). */
export function submissionDocumentObjectPath(userId: string, assignmentId: string): string {
  return `${userId}/${assignmentId}/document`;
}

export async function createSubmissionWorkSignedUrl(
  supabase: SupabaseClient<Database>,
  objectPath: string | null | undefined,
  expiresSec = 3600
): Promise<string | null> {
  if (!objectPath) return null;
  const { data, error } = await appStorageFrom(supabase, SUBMISSION_WORK_BUCKET).createSignedUrl(
    objectPath,
    expiresSec
  );
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function removeSubmissionWorkObject(
  supabase: SupabaseClient<Database>,
  objectPath: string | null | undefined
): Promise<void> {
  if (!objectPath) return;
  await appStorageFrom(supabase, SUBMISSION_WORK_BUCKET).remove([objectPath]);
}

export async function removeSubmissionWorkObjects(
  supabase: SupabaseClient<Database>,
  paths: (string | null | undefined)[]
): Promise<void> {
  const list = paths.filter((p): p is string => !!p);
  if (!list.length) return;
  await appStorageFrom(supabase, SUBMISSION_WORK_BUCKET).remove(list);
}
