import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SCHOOL_NAME } from '../config/schoolBrand';

type SettingsMap = Record<string, string | string[]>;

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('school_settings').select('key, value').then(({ data }) => {
      const map: SettingsMap = {};
      (data || []).forEach((row: { key: string; value: unknown }) => {
        const v = row.value;
        map[row.key] = Array.isArray(v) ? (v as string[]) : (typeof v === 'string' ? v : String(v ?? ''));
      });
      setSettings(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const currency = (settings.currency as string) ?? '₦';
  const schoolName = (settings.school_name as string) ?? SCHOOL_NAME;

  return { settings, loading, currency, schoolName };
}
