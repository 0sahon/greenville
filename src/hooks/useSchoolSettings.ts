import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SCHOOL_NAME } from '../config/schoolBrand';

type SettingsMap = Record<string, string | string[]>;

// Module-level cache — shared across all hook instances, survives re-renders
let settingsCache: SettingsMap | null = null;
let fetchPromise: Promise<SettingsMap> | null = null;

function loadSettings(): Promise<SettingsMap> {
  if (settingsCache) return Promise.resolve(settingsCache);
  if (fetchPromise) return fetchPromise;
  fetchPromise = supabase
    .from('school_settings')
    .select('key, value')
    .then(({ data }) => {
      const map: SettingsMap = {};
      (data || []).forEach((row: { key: string; value: unknown }) => {
        const v = row.value;
        map[row.key] = Array.isArray(v) ? (v as string[]) : (typeof v === 'string' ? v : String(v ?? ''));
      });
      settingsCache = map;
      return map;
    })
    .catch(() => {
      fetchPromise = null; // allow retry on next mount
      return {} as SettingsMap;
    });
  return fetchPromise;
}

/** Call after the admin saves settings so the next read gets fresh data. */
export function invalidateSchoolSettings() {
  settingsCache = null;
  fetchPromise = null;
}

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SettingsMap>(settingsCache ?? {});
  const [loading, setLoading] = useState(!settingsCache);

  useEffect(() => {
    if (settingsCache) return;
    loadSettings().then(map => {
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const currency   = (settings.currency    as string) ?? '₦';
  const schoolName = (settings.school_name as string) ?? SCHOOL_NAME;

  return { settings, loading, currency, schoolName };
}
