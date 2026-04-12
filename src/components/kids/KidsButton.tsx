import { useState } from 'react';
import { Sparkles, Heart, Star } from 'lucide-react';

interface KidsButtonProps {
  onClick: () => void;
}

export default function KidsButton({ onClick }: KidsButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 text-white font-black text-xl px-8 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 overflow-hidden"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
      
      {/* Button Content */}
      <div className="relative flex items-center gap-3">
        <div className="relative">
          <Sparkles className={`w-8 h-8 transition-transform duration-300 ${isHovered ? 'animate-spin' : ''}`} />
          {isHovered && (
            <>
              <Star className="absolute -top-2 -right-2 w-4 h-4 text-yellow-300 animate-bounce" />
              <Heart className="absolute -bottom-2 -left-2 w-4 h-4 text-pink-300 animate-pulse" />
            </>
          )}
        </div>
        
        <span className="text-2xl">KIDS ZONE!</span>
        
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-pink-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      {/* Floating Elements */}
      {isHovered && (
        <>
          <div className="absolute -top-4 left-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
          <div className="absolute -top-2 right-1/4 w-1 h-1 bg-pink-300 rounded-full animate-ping" style={{ animationDelay: '500ms' }}></div>
          <div className="absolute -bottom-4 left-1/3 w-2 h-2 bg-blue-300 rounded-full animate-ping" style={{ animationDelay: '1000ms' }}></div>
        </>
      )}
    </button>
  );
}