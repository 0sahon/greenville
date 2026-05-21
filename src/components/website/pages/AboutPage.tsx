import React from 'react';
import { Users, Award, Globe, Heart, BookOpen, Star, Sparkles, Camera, Check } from 'lucide-react';
import { SCHOOL_NAME } from '../../../config/schoolBrand';

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: 'Love for Learning',
      description: 'We nurture each child\'s natural curiosity and joy in discovering new things!',
      color: 'from-pink-400 to-rose-500',
      emoji: '💖'
    },
    {
      icon: Star,
      title: 'Individual Growth',
      description: 'Every child is unique and special, growing at their own perfect pace!',
      color: 'from-amber-400 to-orange-500',
      emoji: '⭐'
    },
    {
      icon: Users,
      title: 'Community Spirit',
      description: 'We learn together, help each other, and celebrate our differences!',
      color: 'from-indigo-400 to-indigo-500',
      emoji: '🤝'
    },
    {
      icon: Globe,
      title: 'Global Citizens',
      description: 'We explore the world while building confidence and respect for others!',
      color: 'from-emerald-400 to-emerald-500',
      emoji: '🌍'
    }
  ];

  const faculty = [
    {
      name: 'Mrs. Adunni Okafor',
      role: 'Head of School',
      credentials: 'M.Ed Early Childhood Education',
      experience: '15 years',
      specialty: 'Early Childhood Development',
      image: '👩🏾‍🏫',
      quote: 'Every child has the potential to change the world!'
    },
    {
      name: 'Miss Kemi Adeleke',
      role: 'Primary Guide',
      credentials: 'B.Ed Early Childhood Education',
      experience: '8 years',
      specialty: 'Language & Literacy',
      image: '👩🏾‍💼',
      quote: 'Reading opens doors to endless adventures!'
    },
    {
      name: 'Mr. Chidi Nwankwo',
      role: 'Elementary Guide',
      credentials: 'M.Sc Mathematics, B.Ed',
      experience: '10 years',
      specialty: 'Mathematics & Science',
      image: '👨🏾‍🔬',
      quote: 'Math is everywhere - let\'s discover it together!'
    },
    {
      name: 'Mrs. Fatima Ibrahim',
      role: 'Toddler Guide',
      credentials: 'B.Ed Early Childhood Education',
      experience: '12 years',
      specialty: 'Toddler Development',
      image: '👩🏾‍🍼',
      quote: 'Little hands, big dreams, endless possibilities!'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-emerald-50 to-amber-50">
      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 animate-bounce">
            <Sparkles className="w-12 h-12 text-amber-400" />
          </div>
          <div className="absolute top-20 right-20 animate-pulse">
            <Heart className="w-8 h-8 text-rose-400 fill-current" />
          </div>
          <div className="absolute bottom-20 left-1/4 animate-bounce" style={{ animationDelay: '1s' }}>
            <Star className="w-10 h-10 text-indigo-400 fill-current" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-black text-gray-800 mb-6">
              About Our Amazing 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-500"> School! 🏫</span>
            </h1>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
              Welcome to the {SCHOOL_NAME} family! We are a prepared Montessori environment where children explore, discover, and grow into confident, independent, and creative individuals. ✨
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-white border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black text-gray-800 mb-6 flex items-center gap-3">
                Our Story & Philosophy 📚
              </h2>
              <div className="space-y-6 text-lg text-gray-600 leading-relaxed font-medium">
                <p>
                  Greenville Montessori Schools was founded on the vision of offering high-standard Montessori education in Benin City. We provide a prepared environment that honors the natural developmental stages of young children. 🌟
                </p>
                <p>
                  We operate a child-centered, guide-facilitated curriculum where students are active agents in their own learning. Our classrooms are fully equipped with specialized Montessori didactic materials that build concrete understanding of language, mathematics, sensory concepts, and practical life.
                </p>
                <p>
                  Today, we support a vibrant community of early learners who step into school each day eager to collaborate, investigate, and excel. Our experienced guides, child development specialists, and supportive families work hand-in-hand to build an exceptional learning environment.
                </p>
              </div>
            </div>
            
            {/* Overlapping Premium Polaroid Photos from real scraped school photos */}
            <div className="relative h-[400px] w-full flex items-center justify-center">
              {/* Photo 1: Practical Life Work */}
              <div className="absolute top-4 left-4 w-2/3 aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-8 border-white rotate-[-6deg] hover:rotate-0 hover:scale-105 transition-all duration-300 z-10 bg-gray-100">
                <img 
                  src="/images/3.jpg" 
                  alt="Students engaged in Practical Life Montessori exercise" 
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute bottom-2 left-2 bg-indigo-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow">
                  Montessori Materials
                </div>
              </div>
              
              {/* Photo 2: Happy Student Activity */}
              <div className="absolute bottom-4 right-4 w-2/3 aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-8 border-white rotate-[4deg] hover:rotate-0 hover:scale-105 transition-all duration-300 z-20 bg-gray-100">
                <img 
                  src="/images/2.jpg" 
                  alt="Smiling student doing classroom activities at Greenville" 
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute bottom-2 right-2 bg-amber-500 text-white font-bold text-xs px-3 py-1 rounded-full shadow">
                  Active Learning
                </div>
              </div>

              {/* Floating Shield Accent */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white rounded-full p-4 shadow-2xl z-30 animate-pulse border-4 border-white">
                <span className="text-xl font-black">GMS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-gradient-to-br from-indigo-50/50 to-emerald-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold mb-4 border border-indigo-100">
              🔑 Core Values
            </span>
            <h2 className="text-4xl font-black text-gray-800 mb-6">
              What Makes Us Special? 🌈
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              These fundamental principles guide every decision we make and shape our prepared classrooms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:bg-indigo-50/10 transition-all duration-300 border border-gray-100"
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${value.color} rounded-2xl shadow-lg text-white flex-shrink-0`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-3 flex items-center justify-center sm:justify-start gap-2">
                        {value.title}
                        <span className="text-xl">{value.emoji}</span>
                      </h3>
                      <p className="text-gray-600 text-lg leading-relaxed font-medium">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Meet Our Prepared Guides */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold mb-4 border border-indigo-100">
              👩‍🏫 Our Educators
            </span>
            <h2 className="text-4xl font-black text-gray-800 mb-6">
              Meet Our Prepared Guides! 🌟
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Montessori teachers are called "Guides" because they observe, facilitate, and support your child's innate drive to learn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {faculty.map((teacher, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-indigo-50/30 to-indigo-100/20 hover:bg-indigo-50 rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-indigo-100/50"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-5xl mx-auto mb-4 shadow-md border-2 border-indigo-200">
                    {teacher.image}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {teacher.name}
                  </h3>
                  <p className="text-indigo-600 font-bold text-sm mb-3">{teacher.role}</p>
                  
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-4 shadow-inner border border-indigo-50">
                    <div className="space-y-2 text-sm text-left font-medium">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Experience:</span>
                        <span className="font-extrabold text-indigo-600">{teacher.experience}</span>
                      </div>
                      <div className="text-gray-600 leading-tight">
                        <span className="font-bold text-gray-500">Specialty:</span> {teacher.specialty}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 italic text-sm text-gray-700 font-medium relative">
                    "{teacher.quote}"
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fun Facts */}
      <section className="py-20 bg-gradient-to-r from-indigo-700 to-indigo-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-black mb-16">Amazing School Facts! 🎉</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 transform hover:-translate-y-2 transition-transform duration-300">
                <div className="text-4xl mb-3">🎂</div>
                <div className="text-3xl font-black mb-2">5+</div>
                <div className="text-base text-indigo-100 font-bold">Years of Fun Learning</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 transform hover:-translate-y-2 transition-transform duration-300">
                <div className="text-4xl mb-3">👶</div>
                <div className="text-3xl font-black mb-2">200+</div>
                <div className="text-base text-indigo-100 font-bold">Happy Students</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 transform hover:-translate-y-2 transition-transform duration-300">
                <div className="text-4xl mb-3">🏫</div>
                <div className="text-3xl font-black mb-2">100%</div>
                <div className="text-base text-indigo-100 font-bold">Prepared Classrooms</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 transform hover:-translate-y-2 transition-transform duration-300">
                <div className="text-4xl mb-3">🌟</div>
                <div className="text-3xl font-black mb-2">98%</div>
                <div className="text-base text-indigo-100 font-bold">Parent Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}