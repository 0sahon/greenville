import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { appStorageFrom, COURSE_MATERIALS_BUCKET } from './storageBuckets';

export { COURSE_MATERIALS_BUCKET };

/** Path layout: `{authUserId}/{courseId}/{objectId}` — first segment must match `auth.uid()` for upload RLS. */
export function classMaterialObjectPath(authUserId: string, courseId: string, objectId: string): string {
  return `${authUserId}/${courseId}/${objectId}`;
}

export async function createClassMaterialSignedUrl(
  supabase: SupabaseClient<Database>,
  objectPath: string | null | undefined,
  expiresSec = 3600
): Promise<string | null> {
  if (!objectPath) return null;
  const { data, error } = await appStorageFrom(supabase, COURSE_MATERIALS_BUCKET).createSignedUrl(
    objectPath,
    expiresSec
  );
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function removeClassMaterialObject(
  supabase: SupabaseClient<Database>,
  objectPath: string | null | undefined
): Promise<void> {
  if (!objectPath) return;
  await appStorageFrom(supabase, COURSE_MATERIALS_BUCKET).remove([objectPath]);
}
