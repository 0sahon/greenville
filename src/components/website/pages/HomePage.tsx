import React, { useState, useEffect } from 'react';
import { ArrowRight, Star, Heart, Sparkles, BookOpen, Users, Award, Phone, Camera, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SCHOOL_NAME, SCHOOL_TAGLINE } from '../../../config/schoolBrand';

interface HomePageProps {
  onScheduleTour: () => void;
}

export default function HomePage({ onScheduleTour }: HomePageProps) {
  const navigate = useNavigate();

  const handleOurPrograms = () => {
    navigate('/programs');
  };

  // Real horizontal school photos crawled from their website
  const heroImages = [
    '/images/10h.jpg',
    '/images/8h.jpg',
    '/images/9h.jpg',
    '/images/11h.jpg',
    '/images/12h.jpg',
    '/images/13h.jpg',
    '/images/14h.jpg',
    '/images/15h.jpg'
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-50 via-emerald-50 to-amber-50 py-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 animate-bounce">
            <Star className="w-8 h-8 text-amber-400 fill-current" />
          </div>
          <div className="absolute top-40 right-20 animate-pulse">
            <Heart className="w-6 h-6 text-rose-400 fill-current" />
          </div>
          <div className="absolute bottom-20 left-1/4 animate-bounce" style={{ animationDelay: '1s' }}>
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-center lg:text-left">
              <div className="mb-6 animate-fade-in">
                <span className="inline-block bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold mb-4 border border-indigo-200">
                  🌟 Benin City · Montessori · {SCHOOL_TAGLINE}
                </span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black text-gray-800 mb-6 leading-tight">
                The Journey
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-500"> Starts Here!</span>
              </h1>

              <p className="text-xl text-gray-600 mb-4 leading-relaxed font-medium">
                At {SCHOOL_NAME}, we create a safe, fun, and stimulating environment
                where every child discovers the joy of learning from Crèche through Kindergarten.
              </p>
              <p className="text-base text-indigo-600 font-semibold mb-8">
                Registration forms now available — Crèche, Prenursery, Nursery 1 &amp; 2, Kindergarten · 2026/2027
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={onScheduleTour}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-indigo-700 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  Schedule a Tour
                  <ArrowRight className="w-5 h-5" />
                </button>
                
                <button 
                  onClick={handleOurPrograms}
                  className="border-2 border-indigo-600 text-indigo-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-600 hover:text-white transition-all duration-300 transform hover:scale-105"
                >
                  Our Programs
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-black text-indigo-600">5+</div>
                  <div className="text-gray-600 text-sm font-bold">Years of Excellence</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-indigo-500">200+</div>
                  <div className="text-gray-600 text-sm font-bold">Happy Students</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-amber-500">100%</div>
                  <div className="text-gray-600 text-sm font-bold">Montessori Standards</div>
                </div>
              </div>
            </div>

            {/* Dynamic Hero Carousel */}
            <div className="relative">
              <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[450px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white transform rotate-1 hover:rotate-0 transition-transform duration-500 bg-gray-100">
                {heroImages.map((src, idx) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${SCHOOL_NAME} school activities`}
                    className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-in-out ${
                      idx === currentImageIndex ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'
                    }`}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-20 pointer-events-none" />
                
                {/* Slider indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-30 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  {heroImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx === currentImageIndex ? 'bg-indigo-500 scale-125' : 'bg-white/70 hover:bg-white'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Floating Badges */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center animate-bounce shadow-lg z-30">
                <span className="text-2xl">⭐</span>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl px-5 py-3 shadow-xl border border-indigo-100 animate-pulse z-30">
                <p className="text-xs font-black text-indigo-700">Enrolling Now!</p>
                <p className="text-xs text-gray-500 font-bold">2026/2027 Academic Session</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Overview Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold mb-4 border border-indigo-100">
              🌈 The Greenville Difference
            </span>
            <h2 className="text-4xl font-black text-gray-800 mb-6">
              Why Choose {SCHOOL_NAME}? 🌟
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              We provide a prepared environment that supports the physical, cognitive, social, and emotional development of every child.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div 
              onClick={handleOurPrograms}
              className="text-center p-8 rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 hover:shadow-2xl hover:bg-indigo-100 transition-all duration-300 cursor-pointer transform hover:scale-105 border border-indigo-100"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Our Approach</h3>
              <p className="text-gray-600 font-medium">Child-centered education that respects each child's natural pace of development.</p>
            </div>

            <div 
              onClick={() => navigate('/about')}
              className="text-center p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 hover:shadow-2xl hover:bg-emerald-100 transition-all duration-300 cursor-pointer transform hover:scale-105 border border-emerald-100"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Certified Guides</h3>
              <p className="text-gray-600 font-medium">Experienced Montessori teachers and warm caregivers dedicated to early learning.</p>
            </div>

            <div 
              onClick={() => navigate('/about')}
              className="text-center p-8 rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100/50 hover:shadow-2xl hover:bg-amber-100 transition-all duration-300 cursor-pointer transform hover:scale-105 border border-amber-100"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Prepared Spaces</h3>
              <p className="text-gray-600 font-medium">Spacious, air-conditioned environments rich with beautiful sensory learning tools.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Montessori Classroom Live Gallery */}
      <section className="py-20 bg-gray-50 border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold mb-4 border border-indigo-100">
              📸 Life inside Greenville Montessori
            </span>
            <h2 className="text-4xl font-black text-gray-800 mb-6">
              Our Active Learning Gallery 🌟
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Take an interactive peek at our real classrooms, active pupils, and unique Montessori educational resources in action.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[
              { src: '/images/1.jpg', title: 'Tactile Learning' },
              { src: '/images/2.jpg', title: 'Happy Student Work' },
              { src: '/images/3.jpg', title: 'Practical Life Exercises' },
              { src: '/images/4.jpg', title: 'Creative Art & Coloring' },
              { src: '/images/8.jpg', title: 'Sensorimotor Activities' },
              { src: '/images/9.jpg', title: 'Early Phonics Exploration' },
              { src: '/images/11.jpg', title: 'Small Group Learning' },
              { src: '/images/12.jpg', title: 'Outdoor Recreation' },
            ].map((img, index) => (
              <div 
                key={index} 
                className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white border border-gray-100 aspect-square"
              >
                <img 
                  src={img.src} 
                  alt={img.title} 
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 via-indigo-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-white">
                  <h4 className="font-extrabold text-lg flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-400" />
                    {img.title}
                  </h4>
                  <p className="text-xs text-indigo-200 font-semibold mt-1">Greenville Montessori Schools</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-indigo-700 to-indigo-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white relative">
          <div className="absolute -top-10 left-10 opacity-10">
            <Sparkles className="w-24 h-24" />
          </div>
          <h2 className="text-4xl font-black mb-6">Ready to Begin Your Child's Journey? 🚀</h2>
          <p className="text-xl mb-8 opacity-90 font-medium">
            Schedule a visit today to see our beautiful learning environment in action and meet our wonderful Guides!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onScheduleTour}
              className="bg-white text-indigo-700 px-8 py-4 rounded-full font-extrabold text-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-xl flex items-center justify-center gap-2 mx-auto sm:mx-0"
            >
              <Phone className="w-5 h-5" />
              Book a Tour Now!
            </button>
            <button 
              onClick={() => navigate('/contact')}
              className="border-2 border-white text-white px-8 py-4 rounded-full font-extrabold text-lg hover:bg-white hover:text-indigo-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 mx-auto sm:mx-0"
            >
              Ask Questions
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}