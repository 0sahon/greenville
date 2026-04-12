import { useState, useEffect } from 'react';
import { Music, ArrowLeft, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface MusicRoomProps {
  onBack: () => void;
  onInstrumentTried?: (name: string) => void;
  onSongStarted?: (songIndex: number) => void;
}

export default function MusicRoom({ onBack, onInstrumentTried, onSongStarted }: MusicRoomProps) {
  const [currentSong, setCurrentSong] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentInstrument, setCurrentInstrument] = useState<string | null>(null);

  const songs = [
    {
      title: "ABC Song",
      lyrics: [
        "A-B-C-D-E-F-G 🎵",
        "H-I-J-K-L-M-N-O-P 📝",
        "Q-R-S-T-U-V-W-X-Y-Z! 🎶",
        "Now I know my ABCs! ⭐",
        "Next time won't you sing with me? 🎤"
      ],
      color: "from-red-400 to-pink-400"
    },
    {
      title: "Twinkle Twinkle Little Star",
      lyrics: [
        "Twinkle, twinkle, little star 🌟",
        "How I wonder what you are! ❓",
        "Up above the world so high ✨",
        "Like a diamond in the sky 💎",
        "Twinkle, twinkle, little star! ⭐"
      ],
      color: "from-blue-400 to-purple-400"
    },
    {
      title: "Happy Birthday Song",
      lyrics: [
        "Happy birthday to you! 🎉",
        "Happy birthday to you! 🎂",
        "Happy birthday dear friend! 👫",
        "Happy birthday to you! 🎈",
        "Yay! Let's celebrate! 🎊"
      ],
      color: "from-green-400 to-blue-400"
    }
  ];

  const instruments = [
    { name: "Piano", icon: "🎹", sound: "🎵", color: "from-purple-400 to-pink-400" },
    { name: "Drum", icon: "🥁", sound: "🪘", color: "from-red-400 to-orange-400" },
    { name: "Guitar", icon: "🎸", sound: "🎸", color: "from-blue-400 to-cyan-400" },
    { name: "Trumpet", icon: "🎺", sound: "🎺", color: "from-yellow-400 to-orange-400" },
    { name: "Violin", icon: "🎻", sound: "🎻", color: "from-green-400 to-emerald-400" },
    { name: "Flute", icon: "🎵", sound: "🌬️", color: "from-pink-400 to-rose-400" }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        // song progress placeholder
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const playInstrument = (_instrument: string) => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
  };

  const nextSong = () => {
    setCurrentSong((prev) => (prev + 1) % songs.length);
  };

  const prevSong = () => {
    setCurrentSong((prev) => (prev - 1 + songs.length) % songs.length);
  };

  // Show instrument playground if one is selected
  if (currentInstrument) {
    const instrument = instruments.find(i => i.name === currentInstrument);
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 p-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentInstrument(null)}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <ArrowLeft className="w-6 h-6 text-purple-600" />
            <span className="text-purple-600 font-bold text-lg">Back to Music Room</span>
          </button>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <h1 className="text-4xl font-black text-gray-800 mb-8">
              {instrument?.icon} {currentInstrument} Time! 🎵
            </h1>

            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 mb-8">
              <div className="text-8xl mb-6 animate-bounce">{instrument?.icon}</div>
              <p className="text-2xl font-bold text-gray-800 mb-4">
                Click to make music! 🎶
              </p>
              <button
                onClick={() => playInstrument(currentInstrument)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-2xl px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Play {instrument?.sound}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {instruments.map((inst) => (
                <button
                  key={inst.name}
                  onClick={() => { onInstrumentTried?.(inst.name); setCurrentInstrument(inst.name); }}
                  className={`bg-gradient-to-r ${inst.color} text-white p-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg`}
                >
                  <div className="text-4xl mb-2">{inst.icon}</div>
                  {inst.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <ArrowLeft className="w-6 h-6 text-purple-600" />
          <span className="text-purple-600 font-bold text-lg">Back</span>
        </button>

        <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg">
          <Music className="w-6 h-6 text-purple-500" />
          <span className="text-xl font-bold text-gray-800">Music Room</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {/* Song Player */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h1 className="text-4xl font-black text-gray-800 mb-8 text-center">
            🎼 Music Room! 🎵
          </h1>

          {/* Current Song Display */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 mb-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎵</div>
              <h2 className="text-3xl font-black text-gray-800 mb-4">
                {songs[currentSong].title}
              </h2>

              <div className="bg-white/80 rounded-xl p-6 max-w-2xl mx-auto space-y-2">
                {songs[currentSong].lyrics.map((line, i) => (
                  <p key={i} className="text-2xl font-bold text-gray-700 leading-relaxed">{line}</p>
                ))}
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={prevSong}
                className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <SkipBack className="w-8 h-8" />
              </button>

              <button
                onClick={() => {
                  if (!isPlaying) onSongStarted?.(currentSong);
                  setIsPlaying(!isPlaying);
                }}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white p-6 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                {isPlaying ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12" />}
              </button>

              <button
                onClick={nextSong}
                className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <SkipForward className="w-8 h-8" />
              </button>
            </div>
          </div>

          {/* Instrument Playground */}
          <div className="mb-8">
            <h3 className="text-3xl font-black text-gray-800 mb-6 text-center">
              🎹 Play Some Instruments! 🎺
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {instruments.map((instrument) => (
                <button
                  key={instrument.name}
                  onClick={() => { onInstrumentTried?.(instrument.name); setCurrentInstrument(instrument.name); }}
                  className={`bg-gradient-to-r ${instrument.color} text-white p-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl`}
                >
                  <div className="text-4xl mb-2">{instrument.icon}</div>
                  {instrument.name}
                </button>
              ))}
            </div>
          </div>

          {/* Music Learning Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl p-6">
              <h3 className="text-2xl font-black text-gray-800 mb-4">🎵 Music Notes</h3>
              <div className="space-y-3">
                <p className="text-lg font-medium text-gray-700">• Every song has a rhythm! 🥁</p>
                <p className="text-lg font-medium text-gray-700">• Singing helps you learn! 🎤</p>
                <p className="text-lg font-medium text-gray-700">• Music makes learning fun! 🎶</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6">
              <h3 className="text-2xl font-black text-gray-800 mb-4">🌟 Fun Facts</h3>
              <div className="space-y-3">
                <p className="text-lg font-medium text-gray-700">• Music helps you remember things! 🧠</p>
                <p className="text-lg font-medium text-gray-700">• All cultures have music! 🌍</p>
                <p className="text-lg font-medium text-gray-700">• You can make music with anything! 🎨</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center">
            <div className="text-8xl animate-bounce">🎵</div>
            <div className="text-4xl font-black text-white drop-shadow-lg animate-pulse">
              MUSICAL MASTER!
            </div>
            {/* Floating musical notes */}
            <div className="absolute inset-0">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                >
                  {['🎵', '🎶', '🎸', '🥁', '🎺', '🎻'][i % 6]}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}