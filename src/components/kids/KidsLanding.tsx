import { useState, useEffect } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { useKidsProgress } from '../../hooks/useKidsProgress';
import {
  Star,
  Heart,
  Smile,
  BookOpen,
  Palette,
  Music,
  Calculator,
  Globe,
  Trophy,
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX
} from 'lucide-react';

import MathFun from './activities/MathFun';
import ReadingCorner from './activities/ReadingCorner';
import ArtStudio from './activities/ArtStudio';
import MusicRoom from './activities/MusicRoom';
import WorldExplorer from './activities/WorldExplorer';
import AchievementHall from './activities/AchievementHall';

interface KidsLandingProps {
  onBack: () => void;
}

export default function KidsLanding({ onBack }: KidsLandingProps) {
  const { soundEnabled, setSoundEnabled, click, hover } = useSounds();
  const {
    progress,
    recordMathCorrect,
    recordStoryCompleted,
    recordInstrumentTried,
    recordSongStarted,
    recordCountryExplored,
    recordArtworkSaved,
    recordRoomVisited,
  } = useKidsProgress();
  const [currentActivity, setCurrentActivity] = useState<string | null>(null);
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    // Generate floating stars
    const newStars = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100
    }));
    setStars(newStars);
  }, []);

  const activities = [
    {
      id: 'math-fun',
      title: 'Math Magic! 🔢',
      description: 'Play with numbers and solve fun puzzles!',
      color: 'from-blue-400 to-blue-600',
      icon: Calculator,
      bgColor: 'bg-blue-100'
    },
    {
      id: 'reading-corner',
      title: 'Story Time! 📚',
      description: 'Read amazing stories and learn new words!',
      color: 'from-green-400 to-green-600',
      icon: BookOpen,
      bgColor: 'bg-green-100'
    },
    {
      id: 'art-studio',
      title: 'Art Studio! 🎨',
      description: 'Create beautiful drawings and crafts!',
      color: 'from-purple-400 to-purple-600',
      icon: Palette,
      bgColor: 'bg-purple-100'
    },
    {
      id: 'music-room',
      title: 'Music Room! 🎵',
      description: 'Sing songs and learn about instruments!',
      color: 'from-pink-400 to-pink-600',
      icon: Music,
      bgColor: 'bg-pink-100'
    },
    {
      id: 'world-explorer',
      title: 'World Explorer! 🌍',
      description: 'Discover amazing places and cultures!',
      color: 'from-orange-400 to-orange-600',
      icon: Globe,
      bgColor: 'bg-orange-100'
    },
    {
      id: 'achievement-hall',
      title: 'My Achievements! 🏆',
      description: 'See all your amazing accomplishments!',
      color: 'from-yellow-400 to-yellow-600',
      icon: Trophy,
      bgColor: 'bg-yellow-100'
    }
  ];

  const playClickSound = () => {
    click();
  };

  // Render specific activity
  if (currentActivity === 'math-fun') {
    return <MathFun onBack={() => setCurrentActivity(null)} onCorrectAnswer={recordMathCorrect} />;
  }

  if (currentActivity === 'reading-corner') {
    return <ReadingCorner onBack={() => setCurrentActivity(null)} onStoryCompleted={recordStoryCompleted} />;
  }

  if (currentActivity === 'art-studio') {
    return <ArtStudio onBack={() => setCurrentActivity(null)} onArtworkSaved={recordArtworkSaved} />;
  }

  if (currentActivity === 'music-room') {
    return <MusicRoom onBack={() => setCurrentActivity(null)} onInstrumentTried={recordInstrumentTried} onSongStarted={recordSongStarted} />;
  }

  if (currentActivity === 'world-explorer') {
    return <WorldExplorer onBack={() => setCurrentActivity(null)} onCountryExplored={recordCountryExplored} />;
  }

  if (currentActivity === 'achievement-hall') {
    return <AchievementHall onBack={() => setCurrentActivity(null)} progress={progress} />;
  }

  // Generic coming soon for other activities
  const handleActivityClick = (activityId: string) => {
    playClickSound();
    recordRoomVisited(activityId);
    setCurrentActivity(activityId);
  };

  if (currentActivity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200">
        <div className="p-4">
          <button
            onClick={() => {
              playClickSound();
              setCurrentActivity(null);
            }}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5 text-purple-600" />
            <span className="text-purple-600 font-bold">Back to Activities</span>
          </button>
        </div>

        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Coming Soon!</h2>
            <p className="text-gray-600 text-lg mb-6">
              We're working hard to make this activity super fun for you!
              Check back soon for amazing games and learning adventures!
            </p>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 relative overflow-hidden">
      {/* Floating Stars Animation */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute animate-pulse"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            animationDelay: `${star.id * 0.2}s`,
            animationDuration: '3s'
          }}
        >
          <Star className="w-4 h-4 text-yellow-300 fill-current" />
        </div>
      ))}

      {/* Header */}
      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              playClickSound();
              onBack();
            }}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <ArrowLeft className="w-6 h-6 text-purple-600" />
            <span className="text-purple-600 font-bold text-lg">Back to School</span>
          </button>

          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playClickSound();
            }}
            className="bg-white hover:bg-gray-50 p-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            {soundEnabled ? (
              <Volume2 className="w-6 h-6 text-green-600" />
            ) : (
              <VolumeX className="w-6 h-6 text-red-600" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 pb-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mb-6 shadow-2xl transform hover:scale-110 transition-transform duration-300">
            <Smile className="w-16 h-16 text-white" />
            <Sparkles className="w-8 h-8 text-yellow-200 absolute translate-x-4 -translate-y-4 animate-bounce" />
          </div>

          <h1 className="text-6xl font-black text-white mb-4 drop-shadow-lg">
            Welcome to Our
          </h1>
          <h2 className="text-7xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-6">
            KIDS ZONE!
          </h2>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 max-w-2xl mx-auto shadow-xl">
            <p className="text-2xl text-gray-700 font-bold mb-4">
              🌟 Ready for Fun Learning Adventures? 🌟
            </p>
            <p className="text-xl text-gray-600">
              Choose an activity below and let's learn together!
            </p>
          </div>
        </div>

        {/* Activities Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activities.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <button
                  key={activity.id}
                  onClick={() => handleActivityClick(activity.id)}
                  onMouseEnter={hover}
                  className="group relative bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
                >
                  {/* Activity Card */}
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${activity.color} rounded-full mb-6 shadow-lg group-hover:animate-bounce`}>
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>

                    <h3 className="text-2xl font-black text-gray-800 mb-3">
                      {activity.title}
                    </h3>

                    <p className="text-lg text-gray-600 font-medium mb-4">
                      {activity.description}
                    </p>

                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-6 h-6 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-400/20 to-purple-400/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Corner Hearts */}
                  <Heart className="absolute top-4 right-4 w-6 h-6 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Fun Facts Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-green-400 to-blue-400 rounded-3xl p-8 max-w-4xl mx-auto shadow-2xl">
            <h3 className="text-4xl font-black text-white mb-6">
              🎉 Fun Learning Facts! 🎉
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/90 rounded-2xl p-6">
                <div className="text-4xl mb-2">🧠</div>
                <p className="text-lg font-bold text-gray-800">
                  Learning is like exercise for your brain!
                </p>
              </div>
              <div className="bg-white/90 rounded-2xl p-6">
                <div className="text-4xl mb-2">🌈</div>
                <p className="text-lg font-bold text-gray-800">
                  Every mistake helps you learn something new!
                </p>
              </div>
              <div className="bg-white/90 rounded-2xl p-6">
                <div className="text-4xl mb-2">⭐</div>
                <p className="text-lg font-bold text-gray-800">
                  You're amazing just the way you are!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Parent Info Section */}
        <div className="mt-12 text-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto shadow-xl">
            <h4 className="text-2xl font-bold text-gray-800 mb-3">
              👨‍👩‍👧‍👦 For Parents
            </h4>
            <p className="text-gray-600 text-lg">
              This safe learning environment is designed for children ages 5-12.
              All activities are educational and promote creativity, critical thinking,
              and fun learning experiences aligned with our Montessori approach.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}