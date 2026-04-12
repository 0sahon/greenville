import { Baby, Users, GraduationCap, BookOpen, Clock, Star } from 'lucide-react';

export default function ProgramsSection() {
  const programs = [
    {
      id: 'creche',
      title: 'Crèche',
      subtitle: 'Ages 0 – 18 months',
      icon: Baby,
      color: 'from-pink-400 to-pink-600',
      bgColor: 'bg-pink-50',
      description: 'A warm and nurturing home-away-from-home for your youngest ones. Our caregivers provide attentive, loving care in a safe and stimulating environment.',
      features: [
        'Attentive, loving caregivers',
        'Safe, clean sleeping areas',
        'Sensory play and exploration',
        'Age-appropriate activities',
        'Regular feeding & routine'
      ],
      schedule: 'Monday – Friday, 7:30 AM – 3:00 PM',
      classSize: 'Small groups with dedicated caregivers',
      highlights: [
        'Fully air-conditioned rooms',
        'CCTV monitoring at all times',
        'Constant power supply'
      ]
    },
    {
      id: 'prenursery',
      title: 'Pre-Nursery',
      subtitle: 'Ages 18 months – 2½ years',
      icon: Users,
      color: 'from-orange-400 to-orange-600',
      bgColor: 'bg-orange-50',
      description: 'The first steps into structured learning through play. Children develop language, social confidence, and motor skills in a joyful, child-centered setting.',
      features: [
        'Language & communication',
        'Fine and gross motor skills',
        'Creative arts and crafts',
        'Music and movement',
        'Social skills development'
      ],
      schedule: 'Monday – Friday, 7:30 AM – 2:00 PM',
      classSize: 'Small class sizes for personalised attention',
      highlights: [
        'Play-based curriculum',
        'Structured daily routine',
        'Parent progress reports'
      ]
    },
    {
      id: 'nursery',
      title: 'Nursery 1 & 2',
      subtitle: 'Ages 2½ – 4 years',
      icon: BookOpen,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Building essential early-literacy and numeracy foundations through hands-on activities, storytelling, and guided exploration in fully equipped classrooms.',
      features: [
        'Early literacy & phonics',
        'Early numeracy & counting',
        'Science discovery activities',
        'Outdoor & indoor play',
        'Character development'
      ],
      schedule: 'Monday – Friday, 7:30 AM – 2:00 PM',
      classSize: 'Maximum 20 pupils per class',
      highlights: [
        'Experienced class teachers',
        'Structured learning with fun',
        'End-of-term assessments'
      ]
    },
    {
      id: 'kindergarten',
      title: 'Kindergarten',
      subtitle: 'Ages 4 – 6 years',
      icon: GraduationCap,
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50',
      description: 'Preparing children for primary school with confidence. Pupils develop reading, writing, critical thinking, and independence in a nurturing, structured environment.',
      features: [
        'Reading & writing foundations',
        'Mathematics & problem solving',
        'Science & technology exposure',
        'Arts, crafts & performance',
        'Primary school preparation'
      ],
      schedule: 'Monday – Friday, 7:30 AM – 2:30 PM',
      classSize: 'Maximum 20 pupils per class',
      highlights: [
        'School readiness programme',
        'Graduation ceremony',
        'Strong primary school outcomes'
      ]
    }
  ];

  return (
    <section id="programs" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Our Programs
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            From Crèche through Kindergarten, each program is carefully designed to meet
            the developmental needs of children at every stage of their early years.
          </p>
        </div>

        {/* Programs Grid */}
        <div className="space-y-12">
          {programs.map((program, index) => {
            const IconComponent = program.icon;
            const isEven = index % 2 === 0;

            return (
              <div
                key={program.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  !isEven ? 'lg:grid-flow-col-dense' : ''
                }`}
              >
                {/* Content */}
                <div className={isEven ? 'lg:pr-8' : 'lg:pl-8'}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${program.color} rounded-full`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-800">
                        {program.title}
                      </h3>
                      <p className="text-lg text-gray-600 font-medium">
                        {program.subtitle}
                      </p>
                    </div>
                  </div>

                  <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                    {program.description}
                  </p>

                  {/* Features */}
                  <div className="mb-6">
                    <h4 className="text-xl font-semibold text-gray-800 mb-4">Key Features:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {program.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Program Details */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
                      <div>
                        <span className="font-semibold text-gray-800">Schedule: </span>
                        <span className="text-gray-600">{program.schedule}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
                      <div>
                        <span className="font-semibold text-gray-800">Class Size: </span>
                        <span className="text-gray-600">{program.classSize}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Card */}
                <div className={`${!isEven ? 'lg:col-start-1' : ''}`}>
                  <div className={`${program.bgColor} rounded-3xl p-8 shadow-xl transform hover:scale-105 transition-transform duration-300`}>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">
                        {program.id === 'creche'      ? '🧸' :
                         program.id === 'prenursery'  ? '🎨' :
                         program.id === 'nursery'     ? '📚' : '🎓'}
                      </div>
                      <h4 className="text-2xl font-bold text-gray-800 mb-4">
                        Programme Highlights
                      </h4>
                    </div>

                    <div className="space-y-4">
                      {program.highlights.map((highlight, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 bg-gradient-to-r ${program.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white text-sm font-bold">{idx + 1}</span>
                            </div>
                            <p className="text-gray-700 font-medium">{highlight}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 text-center">
                      <button className={`bg-gradient-to-r ${program.color} text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105`}>
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <div className="bg-white rounded-3xl p-12 shadow-xl">
            <h3 className="text-3xl font-bold text-gray-800 mb-6">
              Ready to Enrol Your Child?
            </h3>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Registration forms are now available for the 2025/2026 session.
              Visit us or call today to secure your child's place.
            </p>
            <button className="bg-gradient-to-r from-orange-500 to-blue-700 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105">
              Schedule Your Visit Today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
