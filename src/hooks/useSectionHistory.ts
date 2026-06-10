import { useEffect, useRef } from 'react';

/**
 * Wires browser back/forward buttons to dashboard section navigation.
 *
 * On mount we lay down two history entries:
 *   1. replaceState  { section: '__base__' }  ← the inescapable floor
 *   2. pushState     { section }              ← the active section
 *
 * This means the back button consumes an app-owned entry before it can
 * ever reach an external page.  When the __base__ entry is reached we
 * immediately re-push the current section so the user stays inside the app.
 */
export function useSectionHistory(
  section: string,
  setSection: (s: string) => void,
) {
  const restoringFromHistory = useRef(false);
  const prevSection = useRef(section);

  // One-time setup: lay the floor then push the initial active entry
  useEffect(() => {
    window.history.replaceState({ section: '__base__' }, '');
    window.history.pushState({ section }, '');
    prevSection.current = section;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push a new entry whenever the section changes via nav clicks
  useEffect(() => {
    if (section === prevSection.current) return;
    prevSection.current = section;
    if (restoringFromHistory.current) {
      restoringFromHistory.current = false;
      return;
    }
    window.history.pushState({ section }, '');
  }, [section]);

  // Handle back/forward button
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const state = e.state as { section?: string; __modal?: boolean } | null;

      // Ignore popstate events that belong to modal history entries
      if (state?.__modal) return;

      // Hit the floor (or somehow got null state) — re-push to stay in app
      if (!state?.section || state.section === '__base__') {
        window.history.pushState({ section }, '');
        return;
      }

      if (state.section !== section) {
        restoringFromHistory.current = true;
        setSection(state.section);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [section, setSection]);
}
