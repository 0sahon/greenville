import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/**
 * Storage bucket ids created in SQL (`storage.buckets`). Supabase codegen does not
 * type `client.storage.from(...)`, so we centralize known buckets here.
 */
export const APP_STORAGE_BUCKETS = ['course-materials', 'submission-work'] as const;
export type AppStorageBucket = (typeof APP_STORAGE_BUCKETS)[number];

export const COURSE_MATERIALS_BUCKET: AppStorageBucket = 'course-materials';
export const SUBMISSION_WORK_BUCKET: AppStorageBucket = 'submission-work';

export function appStorageFrom(client: SupabaseClient<Database>, bucket: AppStorageBucket) {
  return client.storage.from(bucket);
}
