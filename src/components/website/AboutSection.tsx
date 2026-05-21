import { Users, Globe, Heart, Zap, Camera, GraduationCap, Smile, Thermometer } from 'lucide-react';
import { SCHOOL_NAME } from '../../config/schoolBrand';

export default function AboutSection() {
  const features = [
    {
      icon: Smile,
      title: 'Child-Centered Learning',
      description: 'Every child is unique. We respect individual learning styles and ensure every pupil gets the attention they deserve.',
      color: 'from-blue-400 to-blue-600'
    },
    {
      icon: GraduationCap,
      title: 'Experienced Educators',
      description: 'Our dedicated nursery teachers and caregivers bring warmth, skill, and a genuine love for children to the classroom.',
      color: 'from-green-400 to-green-600'
    },
    {
      icon: Globe,
      title: 'Broad Perspective',
      description: 'We prepare young learners for a connected world while honoring community, kindness, and curiosity.',
      color: 'from-orange-400 to-orange-600'
    },
    {
      icon: Heart,
      title: 'Caring Community',
      description: 'A warm, safe, and supportive environment where children, families, and educators grow together.',
      color: 'from-pink-400 to-pink-600'
    }
  ];

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            About {SCHOOL_NAME}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We are a leading Montessori school in Benin City, dedicated to nurturing
            independence, creativity, and a lifelong love of learning in children from Crèche
            through Kindergarten.
          </p>
        </div>

        {/* Our Approach */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h3 className="text-3xl font-bold text-gray-800 mb-6">
              Our Approach
            </h3>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              We believe that the early years are the most important time in a child's development.
              Our carefully prepared classrooms, small class sizes, and passionate teachers combine
              to give each child the individual attention they need to thrive.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Play-Based Learning</h4>
                  <p className="text-gray-600">Learning through structured play develops confidence, curiosity, and social skills naturally.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Safe & Secure Environment</h4>
                  <p className="text-gray-600">CCTV in all classrooms and play areas, constant power supply, and fully air-conditioned spaces.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Small Class Sizes</h4>
                  <p className="text-gray-600">Small pupil-to-teacher ratios ensure every child receives personalised attention and care.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-xl">
              <img
                src="/hero.jpg"
                alt={`${SCHOOL_NAME} students`}
                className="w-full h-64 sm:h-80 object-cover object-top"
              />
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${feature.color} rounded-full mb-4`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Why We Stand Out */}
        <div className="mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-800 mb-8">Why We Stand Out</h3>
              <div className="space-y-5">
                {[
                  { icon: Smile,       text: 'Infused fun into learning' },
                  { icon: Thermometer, text: 'Spacious air-conditioned classrooms' },
                  { icon: Users,       text: 'Small pupil to teacher ratio' },
                  { icon: Camera,      text: 'CCTV in classrooms & play areas' },
                  { icon: GraduationCap, text: 'Experienced nursery teachers and caregivers' },
                  { icon: Zap,         text: 'Constant power supply' },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-orange-500" />
                    </div>
                    <span className="text-gray-700 font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-xl">
                <img
                  src="/activity.jpg"
                  alt={`Students enjoying activities at ${SCHOOL_NAME}`}
                  className="w-full h-64 sm:h-80 object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-indigo-600 text-white rounded-2xl px-5 py-3 shadow-lg border-2 border-indigo-500">
                <p className="text-sm font-bold">Enrolling Now!</p>
                <p className="text-xs opacity-90">2026/2027 Session</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-3xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-6">Our Mission</h3>
            <p className="text-xl leading-relaxed max-w-4xl mx-auto">
              To provide a nurturing, safe, and stimulating early-childhood environment that
              respects each child's natural development, fosters independence and creativity,
              and lays a strong foundation for lifelong learning — rooted in Montessori values.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
