import { useState, useCallback } from 'react';
import { KIDS_PROGRESS_STORAGE_KEY } from '../config/schoolBrand';

export interface KidsProgress {
  mathCorrect: number;           // cumulative correct answers
  mathFastSolves: number;        // problems solved in ≤10 seconds
  storiesCompleted: string[];    // unique story IDs where last page was reached
  storyCompletionCount: number;  // total completions, re-reads included
  instrumentsTried: string[];    // unique instrument names entered
  songsStarted: number[];        // unique song indices pressed Play on
  countriesExplored: string[];   // unique country names explored
  artworksSaved: number;         // times Save Artwork was clicked
  roomsVisited: string[];        // unique activity room IDs opened
}

const STORAGE_KEY = KIDS_PROGRESS_STORAGE_KEY;

const defaults: KidsProgress = {
  mathCorrect: 0,
  mathFastSolves: 0,
  storiesCompleted: [],
  storyCompletionCount: 0,
  instrumentsTried: [],
  songsStarted: [],
  countriesExplored: [],
  artworksSaved: 0,
  roomsVisited: [],
};

function load(): KidsProgress {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return { ...defaults, ...JSON.parse(s) };
  } catch { /* ignore */ }
  return { ...defaults };
}

function persist(p: KidsProgress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function useKidsProgress() {
  const [progress, setProgress] = useState<KidsProgress>(load);

  const update = useCallback((updater: (prev: KidsProgress) => KidsProgress) => {
    setProgress(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const recordMathCorrect = useCallback((solveMs: number) => {
    update(p => ({
      ...p,
      mathCorrect: p.mathCorrect + 1,
      mathFastSolves: solveMs <= 10_000 ? p.mathFastSolves + 1 : p.mathFastSolves,
    }));
  }, [update]);

  const recordStoryCompleted = useCallback((storyId: string) => {
    update(p => ({
      ...p,
      storiesCompleted: p.storiesCompleted.includes(storyId)
        ? p.storiesCompleted
        : [...p.storiesCompleted, storyId],
      storyCompletionCount: p.storyCompletionCount + 1,
    }));
  }, [update]);

  const recordInstrumentTried = useCallback((name: string) => {
    update(p => ({
      ...p,
      instrumentsTried: p.instrumentsTried.includes(name)
        ? p.instrumentsTried
        : [...p.instrumentsTried, name],
    }));
  }, [update]);

  const recordSongStarted = useCallback((songIndex: number) => {
    update(p => ({
      ...p,
      songsStarted: p.songsStarted.includes(songIndex)
        ? p.songsStarted
        : [...p.songsStarted, songIndex],
    }));
  }, [update]);

  const recordCountryExplored = useCallback((country: string) => {
    update(p => ({
      ...p,
      countriesExplored: p.countriesExplored.includes(country)
        ? p.countriesExplored
        : [...p.countriesExplored, country],
    }));
  }, [update]);

  const recordArtworkSaved = useCallback(() => {
    update(p => ({ ...p, artworksSaved: p.artworksSaved + 1 }));
  }, [update]);

  const recordRoomVisited = useCallback((roomId: string) => {
    update(p => ({
      ...p,
      roomsVisited: p.roomsVisited.includes(roomId)
        ? p.roomsVisited
        : [...p.roomsVisited, roomId],
    }));
  }, [update]);

  return {
    progress,
    recordMathCorrect,
    recordStoryCompleted,
    recordInstrumentTried,
    recordSongStarted,
    recordCountryExplored,
    recordArtworkSaved,
    recordRoomVisited,
  };
}
