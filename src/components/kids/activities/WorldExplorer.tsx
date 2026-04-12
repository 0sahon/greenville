import { useState } from 'react';
import { Globe, ArrowLeft, Star, Heart, Sparkles, MapPin, Flag, Users, Music, Utensils } from 'lucide-react';

interface WorldExplorerProps {
  onBack: () => void;
  onCountryExplored?: (country: string) => void;
}

export default function WorldExplorer({ onBack, onCountryExplored }: WorldExplorerProps) {
  const [currentCountry, setCurrentCountry] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const countries = [
    {
      name: "Nigeria 🇳🇬",
      capital: "Abuja",
      language: "English, Hausa, Yoruba, Igbo",
      food: "Jollof Rice, Pounded Yam, Suya",
      music: "Afrobeats, Highlife, Fuji",
      funFact: "Nigeria is known as the 'Giant of Africa' and has over 250 ethnic groups!",
      flag: "🇳🇬",
      color: "from-green-400 to-yellow-400",
      landmarks: ["Victoria Island, Lagos", "Zuma Rock", "Ogbunike Caves"]
    },
    {
      name: "Japan 🇯🇵",
      capital: "Tokyo",
      language: "Japanese",
      food: "Sushi, Ramen, Tempura",
      music: "J-Pop, Anime Music, Traditional",
      funFact: "Japan has over 6,800 islands and is home to the tallest mountain in the world!",
      flag: "🇯🇵",
      color: "from-red-400 to-white",
      landmarks: ["Mount Fuji", "Tokyo Tower", "Cherry Blossoms"]
    },
    {
      name: "Brazil 🇧🇷",
      capital: "Brasília",
      language: "Portuguese",
      food: "Feijoada, Pão de Açúcar, Brigadeiro",
      music: "Samba, Bossa Nova, Carnival Music",
      funFact: "Brazil is the largest country in South America and has the Amazon Rainforest!",
      flag: "🇧🇷",
      color: "from-green-400 to-yellow-400",
      landmarks: ["Christ the Redeemer", "Amazon Rainforest", "Copacabana Beach"]
    },
    {
      name: "France 🇫🇷",
      capital: "Paris",
      language: "French",
      food: "Croissants, Baguettes, Cheese",
      music: "French Pop, Classical, Chanson",
      funFact: "France is famous for the Eiffel Tower and has over 1,600 kinds of cheese!",
      flag: "🇫🇷",
      color: "from-blue-400 to-red-400",
      landmarks: ["Eiffel Tower", "Louvre Museum", "Palace of Versailles"]
    },
    {
      name: "India 🇮🇳",
      capital: "New Delhi",
      language: "Hindi, English, and many others",
      food: "Curry, Naan, Samosas",
      music: "Bollywood, Classical, Bhangra",
      funFact: "India is the second most populous country and has the Taj Mahal!",
      flag: "🇮🇳",
      color: "from-orange-400 to-green-400",
      landmarks: ["Taj Mahal", "Golden Temple", "Himalayan Mountains"]
    }
  ];

  const nextCountry = () => {
    setCurrentCountry((prev) => (prev + 1) % countries.length);
  };

  const prevCountry = () => {
    setCurrentCountry((prev) => (prev - 1 + countries.length) % countries.length);
  };

  const exploreCountry = () => {
    onCountryExplored?.(country.name);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const country = countries[currentCountry];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-200 via-yellow-200 to-green-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <ArrowLeft className="w-6 h-6 text-orange-600" />
          <span className="text-orange-600 font-bold text-lg">Back</span>
        </button>

        <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg">
          <Globe className="w-6 h-6 text-orange-500" />
          <span className="text-xl font-bold text-gray-800">World Explorer</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-4xl font-black text-gray-800 mb-8 text-center">
            🌍 World Explorer! 🌟
          </h1>

          {/* Country Display */}
          <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-3xl p-8 mb-8">
            <div className="text-center mb-6">
              <div className="text-8xl mb-4 animate-bounce">{country.flag}</div>
              <h2 className="text-5xl font-black text-gray-800 mb-2">
                {country.name}
              </h2>
              <p className="text-xl text-gray-600 font-medium">
                Capital: {country.capital} 🏛️
              </p>
            </div>

            {/* Country Facts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/80 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-bold text-gray-800">Languages</h3>
                </div>
                <p className="text-gray-700 font-medium">{country.language}</p>
              </div>

              <div className="bg-white/80 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Utensils className="w-6 h-6 text-green-500" />
                  <h3 className="text-xl font-bold text-gray-800">Food</h3>
                </div>
                <p className="text-gray-700 font-medium">{country.food}</p>
              </div>

              <div className="bg-white/80 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Music className="w-6 h-6 text-purple-500" />
                  <h3 className="text-xl font-bold text-gray-800">Music</h3>
                </div>
                <p className="text-gray-700 font-medium">{country.music}</p>
              </div>
            </div>

            {/* Fun Fact */}
            <div className="bg-gradient-to-r from-yellow-200 to-orange-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                <h3 className="text-2xl font-bold text-gray-800">Fun Fact! 🌟</h3>
              </div>
              <p className="text-xl text-gray-700 font-medium">{country.funFact}</p>
            </div>

            {/* Famous Landmarks */}
            <div className="bg-white/80 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-6 h-6 text-red-500" />
                <h3 className="text-2xl font-bold text-gray-800">Famous Places 📍</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {country.landmarks.map((landmark, index) => (
                  <div key={index} className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-gray-800">{landmark}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevCountry}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                ← Previous Country
              </button>

              <button
                onClick={exploreCountry}
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-black text-xl px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Explore {country.name.split(' ')[0]}! 🌍
              </button>

              <button
                onClick={nextCountry}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Next Country →
              </button>
            </div>
          </div>

          {/* Learning Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl p-6">
              <h3 className="text-2xl font-black text-gray-800 mb-4">🌍 World Facts</h3>
              <div className="space-y-3">
                <p className="text-lg font-medium text-gray-700">• Our world has 195 countries! 🌐</p>
                <p className="text-lg font-medium text-gray-700">• People speak over 7,000 languages! 🗣️</p>
                <p className="text-lg font-medium text-gray-700">• Every country has unique traditions! 🎭</p>
                <p className="text-lg font-medium text-gray-700">• We can be friends with anyone! 👫</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6">
              <h3 className="text-2xl font-black text-gray-800 mb-4">✈️ Travel Tips</h3>
              <div className="space-y-3">
                <p className="text-lg font-medium text-gray-700">• Learn about new cultures! 📚</p>
                <p className="text-lg font-medium text-gray-700">• Try different foods! 🍕</p>
                <p className="text-lg font-medium text-gray-700">• Make friends from everywhere! 👋</p>
                <p className="text-lg font-medium text-gray-700">• Respect different traditions! 🙏</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center">
            <div className="text-8xl animate-bounce">🌍</div>
            <div className="text-4xl font-black text-white drop-shadow-lg animate-pulse">
              WORLD EXPLORER!
            </div>
            {/* Floating flags and landmarks */}
            <div className="absolute inset-0">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                >
                  {['🇳🇬', '🇯🇵', '🇧🇷', '🇫🇷', '🇮🇳', '🏛️', '🗼', '🌟', '✈️', '🌍'][i % 10]}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}