import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'admin' | 'teacher' | 'parent' | 'student';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks the user ID being fetched so getSession + onAuthStateChange can't double-fetch
  const fetchingUserId = useRef<string | null>(null);

  useEffect(() => {
    // Seed state from the current session, then let onAuthStateChange own all subsequent events.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      if (uid) {
        // Skip if getSession already started a fetch for this same user
        if (fetchingUserId.current !== uid) fetchProfile(uid);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async (userId: string, isRetry = false) => {
    fetchingUserId.current = userId;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Right after first login, handle_new_user may commit a tick later — retry once
        if (!isRetry && error.code === 'PGRST116') {
          await new Promise((r) => setTimeout(r, 700));
          await fetchProfile(userId, true);
          return;
        }
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      fetchingUserId.current = null;
      setLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    setProfile(null);
    supabase.auth.signOut().catch(e => console.error('Error signing out:', e));
  };

  return { user, profile, loading, signOut };
}
