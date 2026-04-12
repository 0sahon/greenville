import { useState, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Trophy, ArrowLeft, Star, Medal, Award, Crown,
  Target, Zap, Heart, CheckCircle, Music, Globe,
  BookOpen, Palette, Lock,
} from 'lucide-react';
import type { KidsProgress } from '../../../hooks/useKidsProgress';

interface AchievementHallProps {
  onBack: () => void;
  progress: KidsProgress;
}

type AchievementCategory = 'math' | 'reading' | 'art' | 'music' | 'world' | 'general';

interface Achievement {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  points: number;
  category: AchievementCategory;
}

const achievements: Achievement[] = [
  // Math
  { id: 'math-1', title: 'Number Ninja',    description: 'Solve 5 math problems correctly!',        Icon: Target,      points: 50,  category: 'math' },
  { id: 'math-2', title: 'Addition Master', description: 'Answer 10 math problems correctly!',       Icon: Star,        points: 75,  category: 'math' },
  { id: 'math-3', title: 'Speed Solver',    description: 'Solve a problem in under 10 seconds!',     Icon: Zap,         points: 100, category: 'math' },
  // Reading
  { id: 'read-1', title: 'Story Explorer',  description: 'Finish reading your first story!',         Icon: Heart,       points: 60,  category: 'reading' },
  { id: 'read-2', title: 'Word Master',     description: 'Read both stories all the way through!',   Icon: Crown,       points: 80,  category: 'reading' },
  { id: 'read-3', title: 'Book Worm',       description: 'Complete a story 3 different times!',      Icon: BookOpen,    points: 150, category: 'reading' },
  // Art
  { id: 'art-1',  title: 'Color Explorer',  description: 'Save your first artwork!',                 Icon: Star,        points: 40,  category: 'art' },
  { id: 'art-2',  title: 'Art Creator',     description: 'Save 3 different artworks!',               Icon: Award,       points: 90,  category: 'art' },
  { id: 'art-3',  title: 'Brush Master',    description: 'Save 5 amazing artworks!',                 Icon: Medal,       points: 120, category: 'art' },
  // Music
  { id: 'music-1',title: 'Song Singer',     description: 'Press play on a song in the Music Room!',  Icon: Music,       points: 55,  category: 'music' },
  { id: 'music-2',title: 'Instrument Pro',  description: 'Try 3 different instruments!',             Icon: Star,        points: 85,  category: 'music' },
  // World
  { id: 'world-1',title: 'Globe Trotter',   description: 'Explore 3 different countries!',           Icon: Globe,       points: 70,  category: 'world' },
  { id: 'world-2',title: 'Culture Expert',  description: 'Explore all 5 countries!',                 Icon: Heart,       points: 95,  category: 'world' },
  // General
  { id: 'gen-1',  title: 'First Visit',     description: 'Welcome to the Kids Zone!',                Icon: CheckCircle, points: 10,  category: 'general' },
  { id: 'gen-2',  title: 'Helper',          description: 'Visit 3 different activity rooms!',        Icon: Heart,       points: 25,  category: 'general' },
  { id: 'gen-3',  title: 'Super Learner',   description: 'Earn 500 points from other badges!',       Icon: Crown,       points: 200, category: 'general' },
];

type CategoryId = 'all' | AchievementCategory;

interface Category {
  id: CategoryId;
  label: string;
  Icon: LucideIcon;
  pill: string;
  activePill: string;
}

const categories: Category[] = [
  { id: 'all',     label: 'All',     Icon: Trophy,   pill: 'text-purple-700 bg-purple-100 hover:bg-purple-200', activePill: 'bg-purple-500 text-white shadow-md' },
  { id: 'math',    label: 'Maths',   Icon: Target,   pill: 'text-blue-700   bg-blue-100   hover:bg-blue-200',   activePill: 'bg-blue-500   text-white shadow-md' },
  { id: 'reading', label: 'Reading', Icon: BookOpen, pill: 'text-green-700  bg-green-100  hover:bg-green-200',  activePill: 'bg-green-500  text-white shadow-md' },
  { id: 'art',     label: 'Art',     Icon: Palette,  pill: 'text-pink-700   bg-pink-100   hover:bg-pink-200',   activePill: 'bg-pink-500   text-white shadow-md' },
  { id: 'music',   label: 'Music',   Icon: Music,    pill: 'text-rose-700   bg-rose-100   hover:bg-rose-200',   activePill: 'bg-rose-500   text-white shadow-md' },
  { id: 'world',   label: 'World',   Icon: Globe,    pill: 'text-orange-700 bg-orange-100 hover:bg-orange-200', activePill: 'bg-orange-500 text-white shadow-md' },
  { id: 'general', label: 'General', Icon: Star,     pill: 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200', activePill: 'bg-yellow-500 text-white shadow-md' },
];

const categoryBadge: Record<AchievementCategory, string> = {
  math:    'bg-blue-100   text-blue-700',
  reading: 'bg-green-100  text-green-700',
  art:     'bg-pink-100   text-pink-700',
  music:   'bg-rose-100   text-rose-700',
  world:   'bg-orange-100 text-orange-700',
  general: 'bg-yellow-100 text-yellow-700',
};

function computeEarnedIds(p: KidsProgress, basePoints: number): Set<string> {
  const ids = new Set<string>();
  if (p.mathCorrect >= 5)              ids.add('math-1');
  if (p.mathCorrect >= 10)             ids.add('math-2');
  if (p.mathFastSolves >= 1)           ids.add('math-3');
  if (p.storiesCompleted.length >= 1)  ids.add('read-1');
  if (p.storiesCompleted.length >= 2)  ids.add('read-2');
  if (p.storyCompletionCount >= 3)     ids.add('read-3');
  if (p.artworksSaved >= 1)            ids.add('art-1');
  if (p.artworksSaved >= 3)            ids.add('art-2');
  if (p.artworksSaved >= 5)            ids.add('art-3');
  if (p.songsStarted.length >= 1)      ids.add('music-1');
  if (p.instrumentsTried.length >= 3)  ids.add('music-2');
  if (p.countriesExplored.length >= 3) ids.add('world-1');
  if (p.countriesExplored.length >= 5) ids.add('world-2');
  ids.add('gen-1'); // always earned on first visit
  if (p.roomsVisited.length >= 3)      ids.add('gen-2');
  if (basePoints >= 500)               ids.add('gen-3');
  return ids;
}

function getTrophyLevel(pts: number) {
  if (pts >= 400) return { label: 'Gold Champion',   emoji: '🥇', color: 'text-yellow-500' };
  if (pts >= 250) return { label: 'Silver Star',     emoji: '🥈', color: 'text-slate-400'  };
  if (pts >= 100) return { label: 'Bronze Explorer', emoji: '🥉', color: 'text-amber-600'  };
  return                 { label: 'Beginner',        emoji: '🌱', color: 'text-green-500'  };
}

const CONFETTI_EMOJIS = ['🏆', '⭐', '🌟', '✨', '🎖️', '👑', '🎊', '🎉'];

export default function AchievementHall({ onBack, progress }: AchievementHallProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [showCelebration, setShowCelebration] = useState(false);

  // Compute earned: first pass without gen-3, then check gen-3 threshold
  const earnedIds = useMemo(() => {
    const firstPass = computeEarnedIds(progress, 0);
    const basePoints = achievements
      .filter(a => a.id !== 'gen-3' && firstPass.has(a.id))
      .reduce((sum, a) => sum + a.points, 0);
    return computeEarnedIds(progress, basePoints);
  }, [progress]);

  const totalPoints  = achievements.filter(a => earnedIds.has(a.id)).reduce((sum, a) => sum + a.points, 0);
  const earnedCount  = earnedIds.size;
  const totalCount   = achievements.length;
  const progressPct  = Math.round((earnedCount / totalCount) * 100);
  const nextGoal     = achievements.filter(a => !earnedIds.has(a.id)).sort((a, b) => a.points - b.points)[0];
  const trophy       = getTrophyLevel(totalPoints);

  const filtered = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory);

  const confetti = useMemo(
    () => Array.from({ length: 20 }, (_, i) => ({
      left:  Math.floor(Math.random() * 88) + 5,
      top:   Math.floor(Math.random() * 78) + 5,
      delay: +(i * 0.12).toFixed(2),
      emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
    })),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">

      {/* Top bar */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-3 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-white/90 hover:bg-white text-orange-600 font-bold text-sm px-4 py-2 rounded-full shadow transition-all hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5" />
            <span className="text-lg font-black">My Achievements</span>
          </div>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Points + trophy level */}
          <div className="bg-white rounded-2xl p-5 shadow text-center border border-yellow-100">
            <div className="text-5xl font-black text-yellow-500 leading-none mb-1">{totalPoints}</div>
            <div className="text-sm font-bold text-gray-700">Total Points</div>
            <div className={`text-sm font-semibold mt-2 ${trophy.color}`}>
              {trophy.emoji} {trophy.label}
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-2xl p-5 shadow text-center border border-green-100">
            <div className="text-5xl font-black text-green-500 leading-none mb-1">
              {earnedCount}
              <span className="text-3xl text-gray-300">/{totalCount}</span>
            </div>
            <div className="text-sm font-bold text-gray-700 mb-3">Badges Earned</div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1.5">{progressPct}% complete</div>
          </div>

          {/* Next goal */}
          <div className="bg-white rounded-2xl p-5 shadow text-center border border-purple-100">
            {nextGoal ? (
              <>
                <div className="text-4xl mb-1">🎯</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Next Goal</div>
                <div className="text-base font-black text-purple-600">{nextGoal.title}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {nextGoal.description}
                </div>
                <div className="text-xs font-bold text-yellow-600 mt-2">+{nextGoal.points} pts</div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-base font-black text-green-600">All Done!</div>
                <div className="text-xs text-gray-500 mt-1">You've unlocked everything!</div>
              </>
            )}
          </div>
        </div>

        {/* ── Category filter ── */}
        <div className="bg-white rounded-2xl p-4 shadow border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Filter by Activity
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all duration-150 ${
                    active ? cat.activePill + ' scale-105' : cat.pill
                  }`}
                >
                  <cat.Icon className="w-4 h-4" />
                  {cat.label}
                  <span className={`text-xs ${active ? 'text-white/80' : 'text-gray-500'}`}>
                    ({achievements.filter(a => cat.id === 'all' || a.category === cat.id).filter(a => earnedIds.has(a.id)).length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Achievement cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const earned = earnedIds.has(a.id);
            return (
              <div
                key={a.id}
                className={`relative bg-white rounded-2xl p-5 shadow transition-all duration-200 ${
                  earned
                    ? 'border-2 border-yellow-300 hover:shadow-lg hover:-translate-y-0.5'
                    : 'border-2 border-gray-100 opacity-70'
                }`}
              >
                {earned && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    earned
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-400 shadow'
                      : 'bg-gray-100'
                  }`}>
                    {earned
                      ? <a.Icon className="w-5 h-5 text-white" />
                      : <Lock className="w-5 h-5 text-gray-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-sm font-black ${earned ? 'text-gray-900' : 'text-gray-400'}`}>
                        {a.title}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${categoryBadge[a.category]}`}>
                        {a.category}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${earned ? 'text-gray-600' : 'text-gray-400'}`}>
                      {a.description}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center justify-between pt-3 border-t ${
                  earned ? 'border-yellow-100' : 'border-gray-100'
                }`}>
                  <span className={`text-xs font-bold ${earned ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {a.points} pts
                  </span>
                  {earned
                    ? <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Earned</span>
                    : <span className="text-xs text-gray-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Celebrate banner ── */}
        <div className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl p-6 text-center shadow">
          <p className="text-2xl font-black text-white mb-1">🎉 You're doing amazing!</p>
          <p className="text-white/90 text-sm mb-4">
            Every badge shows how much you've grown. Keep exploring!
          </p>
          <button
            onClick={() => {
              setShowCelebration(true);
              setTimeout(() => setShowCelebration(false), 3000);
            }}
            className="bg-white text-purple-600 font-black text-sm px-6 py-2.5 rounded-full shadow hover:shadow-md hover:scale-105 transition-all"
          >
            Celebrate my progress! 🌟
          </button>
        </div>
      </div>

      {/* ── Confetti overlay ── */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl animate-bounce">🏆</div>
              <div className="text-4xl font-black text-white drop-shadow-lg animate-pulse mt-2">
                YOU'RE A CHAMPION!
              </div>
            </div>
          </div>
          {confetti.map((item, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-ping"
              style={{
                left: `${item.left}%`,
                top:  `${item.top}%`,
                animationDelay: `${item.delay}s`,
              }}
            >
              {item.emoji}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
