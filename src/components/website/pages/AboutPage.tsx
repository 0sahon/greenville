import { Users, Award, Globe, Heart, BookOpen, Star, Sparkles } from 'lucide-react';
import { SCHOOL_NAME } from '../../../config/schoolBrand';

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: 'Love for Learning',
      description: 'We nurture each child\'s natural curiosity and joy in discovering new things!',
      color: 'from-pink-400 to-red-400',
      emoji: '💖'
    },
    {
      icon: Star,
      title: 'Individual Growth',
      description: 'Every child is unique and special, growing at their own perfect pace!',
      color: 'from-yellow-400 to-orange-400',
      emoji: '⭐'
    },
    {
      icon: Users,
      title: 'Community Spirit',
      description: 'We learn together, help each other, and celebrate our differences!',
      color: 'from-blue-400 to-purple-400',
      emoji: '🤝'
    },
    {
      icon: Globe,
      title: 'Global Citizens',
      description: 'We explore the world while building confidence and respect for others!',
      color: 'from-green-400 to-teal-400',
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-blue-50 to-green-50">
      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 animate-bounce">
            <Sparkles className="w-12 h-12 text-yellow-400" />
          </div>
          <div className="absolute top-20 right-20 animate-pulse">
            <Heart className="w-8 h-8 text-pink-400 fill-current" />
          </div>
          <div className="absolute bottom-20 left-1/4 animate-bounce" style={{ animationDelay: '1s' }}>
            <Star className="w-10 h-10 text-purple-400 fill-current" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-black text-gray-800 mb-6">
              About Our Amazing 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-green-500"> School! 🏫</span>
            </h1>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Welcome to the {SCHOOL_NAME} family! We're not just a school - 
              we're a magical place where children discover, explore, and grow into confident, 
              caring, and creative individuals! ✨
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-6">
                Our Wonderful Story 📚
              </h2>
              <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                <p>
                  In 2021, a group of passionate educators had a big dream — to create
                  a warm Montessori community in Benin City where every child could shine
                  like the bright star they are! 🌟
                </p>
                <p>
                  We believe in a learner-centered, teacher-guided approach where children
                  are active participants in their own education. Teachers guide, support, and
                  inspire — while every child explores at their own pace and discovers what
                  makes them truly unique!
                </p>
                <p>
                  Today, we're proud to be home to over 100 happy children who come to school
                  excited to learn, play, and grow together. Our school family includes amazing
                  teachers, supportive parents, and the most wonderful students in Greenville!
                </p>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-yellow-200 to-orange-300 rounded-3xl p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
                  <div className="text-6xl mb-4">🎓</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    "Learner-centered, Teacher-guided"
                  </h3>
                  <p className="text-gray-600 italic text-lg">
                    Every child is a capable learner.
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    Our approach puts children at the heart of learning
                    with teachers who guide, inspire, and nurture every step of the way!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              What Makes Us Special? 🌈
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These are the super important values that guide everything we do at our school!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${value.color} rounded-full mb-6 shadow-lg`}>
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-4xl mb-4">{value.emoji}</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">
                      {value.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Meet Our Amazing Teachers */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Meet Our Amazing Teachers! 👩‍🏫👨‍🏫
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our teachers are like superheroes who help children learn and grow every day!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {faculty.map((teacher, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{teacher.image}</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {teacher.name}
                  </h3>
                  <p className="text-purple-600 font-semibold mb-3">{teacher.role}</p>
                  
                  <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Experience:</span>
                        <span className="font-semibold text-blue-600">{teacher.experience}</span>
                      </div>
                      <div className="text-gray-600">
                        <span className="font-semibold">Specialty:</span> {teacher.specialty}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-100 rounded-xl p-3">
                    <p className="text-sm text-gray-700 italic">"{teacher.quote}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fun Facts */}
      <section className="py-16 bg-gradient-to-r from-green-400 to-blue-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-12">Amazing School Facts! 🎉</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-4xl mb-2">🎂</div>
                <div className="text-3xl font-bold mb-2">4+</div>
                <div className="text-lg">Years of Fun Learning</div>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
                <div className="text-3xl font-bold mb-2">100+</div>
                <div className="text-lg">Happy Students</div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-4xl mb-2">📚</div>
                <div className="text-3xl font-bold mb-2">1000+</div>
                <div className="text-lg">Books in Our Library</div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-4xl mb-2">🌟</div>
                <div className="text-3xl font-bold mb-2">98%</div>
                <div className="text-lg">Happy Families</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}