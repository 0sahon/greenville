import { ArrowRight, Star, Heart, Sparkles } from 'lucide-react';
import { SCHOOL_NAME, SCHOOL_TAGLINE } from '../../config/schoolBrand';

interface HeroSectionProps {
  onScheduleTour: () => void;
}

export default function HeroSection({ onScheduleTour }: HeroSectionProps) {
  return (
    <section id="home" className="relative bg-gradient-to-br from-orange-50 via-blue-50 to-green-50 py-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 animate-bounce">
          <Star className="w-8 h-8 text-yellow-400 fill-current" />
        </div>
        <div className="absolute top-40 right-20 animate-pulse">
          <Heart className="w-6 h-6 text-pink-400 fill-current" />
        </div>
        <div className="absolute bottom-20 left-1/4 animate-bounce" style={{ animationDelay: '1s' }}>
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="mb-6">
              <span className="inline-block bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                🌟 Benin City · Montessori · {SCHOOL_TAGLINE}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
              The Journey
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600"> Starts Here!</span>
            </h1>

            <p className="text-xl text-gray-600 mb-4 leading-relaxed">
              At {SCHOOL_NAME}, we create a safe, fun, and stimulating environment
              where every child discovers the joy of learning from Crèche through Kindergarten.
            </p>
            <p className="text-base text-indigo-600 font-semibold mb-8">
              Registration forms now available — Crèche, Prenursery, Nursery 1 &amp; 2, Kindergarten · 2026/2027
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={onScheduleTour}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                Schedule a Visit
                <ArrowRight className="w-5 h-5" />
              </button>

              <button className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-600 hover:text-white transition-all duration-200 transform hover:scale-105">
                Our Programs
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">5+</div>
                <div className="text-gray-600 text-sm">Years of Excellence</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">200+</div>
                <div className="text-gray-600 text-sm">Happy Pupils</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">A/C</div>
                <div className="text-gray-600 text-sm">Classrooms</div>
              </div>
            </div>
          </div>

          {/* Hero Image — real school photo -->*/}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <img
                src="/students.jpg"
                alt={`${SCHOOL_NAME} students on the school grounds`}
                className="w-full h-64 sm:h-80 lg:h-96 object-cover object-center"
              />
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce shadow-lg">
              <span className="text-2xl">⭐</span>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl px-4 py-2 shadow-lg border border-indigo-100 animate-pulse">
              <p className="text-xs font-bold text-indigo-600">Enrolling Now!</p>
              <p className="text-xs text-gray-500">2026/2027 Session</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
