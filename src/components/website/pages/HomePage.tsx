import React from 'react';
import { ArrowRight, Star, Heart, Sparkles, BookOpen, Users, Award, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SCHOOL_NAME, SCHOOL_TAGLINE } from '../../../config/schoolBrand';

interface HomePageProps {
  onScheduleTour: () => void;
}

export default function HomePage({ onScheduleTour }: HomePageProps) {
  const navigate = useNavigate();

  const handleOurPrograms = () => {
    navigate('/about');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-50 via-blue-50 to-green-50 py-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
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
              <p className="text-base text-orange-600 font-semibold mb-8">
                Registration forms now available — Crèche, Prenursery, Nursery 1 &amp; 2, Kindergarten · 2025/2026
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={onScheduleTour}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  Schedule a Tour
                  <ArrowRight className="w-5 h-5" />
                </button>
                
                <button 
                  onClick={handleOurPrograms}
                  className="border-2 border-green-500 text-green-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-green-500 hover:text-white transition-all duration-200 transform hover:scale-105"
                >
                  Our Programs
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">4+</div>
                  <div className="text-gray-600 text-sm">Years of Excellence</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">100+</div>
                  <div className="text-gray-600 text-sm">Happy Students</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500">98%</div>
                  <div className="text-gray-600 text-sm">Parent Satisfaction</div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <img
                  src="/hero.jpg"
                  alt={`${SCHOOL_NAME} students`}
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover object-top"
                />
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                <span className="text-2xl">⭐</span>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl px-4 py-2 shadow-lg border border-orange-100 animate-pulse">
                <p className="text-xs font-bold text-orange-600">Enrolling Now!</p>
                <p className="text-xs text-gray-500">2025/2026 Session</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Overview Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Why Choose {SCHOOL_NAME}? 🌟
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div 
              onClick={handleOurPrograms}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Our Approach</h3>
              <p className="text-gray-600">Child-centered education that respects each child's natural development.</p>
            </div>

            <div 
              onClick={() => navigate('/about')}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Certified Teachers</h3>
              <p className="text-gray-600">Experienced educators dedicated to nurturing young minds.</p>
            </div>

            <div 
              onClick={() => navigate('/about')}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Whole-child focus</h3>
              <p className="text-gray-600">Academic growth paired with social, emotional, and practical life skills.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-orange-400 to-green-400">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">Ready to Begin Your Child's Journey? 🚀</h2>
          <p className="text-xl mb-8">
            Schedule a visit to see our classrooms in action and meet our wonderful teachers!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onScheduleTour}
              className="bg-white text-orange-500 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors transform hover:scale-105 shadow-lg"
            >
              Schedule a Tour! 📅
            </button>
            <button 
              onClick={() => navigate('/contact')}
              className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-orange-500 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Call Us Today!
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}