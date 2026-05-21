import React, { useState } from 'react';
import { Baby, Users, GraduationCap, Clock, MapPin, Star, Heart, Sparkles, BookOpen, Palette, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SCHOOL_NAME } from '../../../config/schoolBrand';

export default function ProgramsPage() {
  const [selectedProgram, setSelectedProgram] = useState('toddler');
  const navigate = useNavigate();

  const programs = [
    {
      id: 'toddler',
      title: 'Toddler Class (Pre-KG)',
      subtitle: 'Yellow Class · Ages 12 months – 2½ years',
      icon: Baby,
      color: 'from-amber-400 to-amber-500',
      bgColor: 'bg-amber-50',
      emoji: '🧸',
      image: '/images/1.jpg',
      classroom: 'Yellow Class',
      classroomColorClass: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'A nurturing, warm prepared environment where little ones take their first steps into independence and self-guided exploration.',
      dailySchedule: [
        { time: '8:00 AM', activity: 'Welcome Circle & Practical Life Work', icon: '🌅' },
        { time: '9:00 AM', activity: 'Sensory Exploration Activities', icon: '🧹' },
        { time: '10:00 AM', activity: 'Fruit Sharing & Social Grace', icon: '🍎' },
        { time: '10:30 AM', activity: 'Fine Motor & Sorting Work', icon: '👋' },
        { time: '11:30 AM', activity: 'Storytelling Circle & Music', icon: '📚' },
        { time: '12:00 PM', activity: 'Dismissal / Transition Circle', icon: '👋' }
      ],
      activities: [
        { name: 'Practical Life Exercises', description: 'Pouring, spooning, and sorting to develop fine motor coordination!', icon: '💧' },
        { name: 'Sensorial Development', description: 'Exploring textures, sizes, and colors through specialized cylinders.', icon: '🔵' },
        { name: 'Grace & Courtesy', description: 'Learning greeting routines, sharing, and cooperative community play.', icon: '🤝' },
        { name: 'Music & Movement', description: 'Expressing rhythm, rhymes, and language building through singing.', icon: '🎵' },
        { name: 'Outdoor Sensory Walk', description: 'Connecting with nature, plants, and building gross motor skills.', icon: '🌱' },
        { name: 'Early Language Building', description: 'Object identification and naming to enrich toddler vocabulary.', icon: '🗣️' }
      ],
      learningGoals: [
        'Independence in elementary toilet training and self-care',
        'Refined fine-motor grip and coordination',
        'Expansive vocabulary and clear self-expression',
        'Cooperative community sharing and peer socialization',
        'Developing focused concentration during self-chosen work'
      ]
    },
    {
      id: 'early-explorers',
      title: 'Nursery & Kindergarten (KG)',
      subtitle: 'Blue Class · Ages 2½ – 5 years',
      icon: Users,
      color: 'from-indigo-600 to-indigo-500',
      bgColor: 'bg-indigo-50/50',
      emoji: '🎨',
      image: '/images/3.jpg',
      classroom: 'Blue Class',
      classroomColorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      description: 'The foundation of the Montessori curriculum. Children discover early phonics, decimal mathematics, cultural geography, and science through touch.',
      dailySchedule: [
        { time: '8:00 AM', activity: 'Individual Montessori Work Cycle', icon: '🌅' },
        { time: '9:30 AM', activity: 'Community Grace & Circle Lesson', icon: '👥' },
        { time: '10:00 AM', activity: 'Healthy Snack & Conversational Practice', icon: '🍎' },
        { time: '10:30 AM', activity: 'Outdoor Prepared Play & Gymnastics', icon: '🌳' },
        { time: '11:30 AM', activity: 'Decimal Math & Language Presentations', icon: '📚' },
        { time: '12:30 PM', activity: 'Healthy Lunch & Quiet Rest', icon: '🍽️' },
        { time: '1:30 PM', activity: 'Creative Expression: Arts & Music', icon: '🎭' },
        { time: '2:00 PM', activity: 'Story Review & Dismissal Circle', icon: '🌟' }
      ],
      activities: [
        { name: 'Mathematical Operations', description: 'Decimal system operations (thousands, hundreds, tens, units) with bead materials.', icon: '🔢' },
        { name: 'Phonics & Reading', description: 'Building and writing phonetic words using the Moveable Alphabet.', icon: '📖' },
        { name: 'Geographical Maps', description: 'Tracing and assembling maps of Africa and Nigeria to learn landforms.', icon: '🌍' },
        { name: 'Science & Zoology', description: 'Classifying botany specimens and studying life cycles in our garden.', icon: '🔬' },
        { name: 'Art Exploration', description: 'Clay modeling, watercolor painting, and secondary color-mixing studies.', icon: '🎨' },
        { name: 'Grace & Courtesy', description: 'Practicing conflict resolution, table manners, and classroom care duties.', icon: '☮️' }
      ],
      learningGoals: [
        'Fluent phonetic reading and creative pencil writing',
        'Concrete understanding of addition, subtraction, and place value',
        'Geographical awareness of continents, countries, and states',
        'High level of focus, self-discipline, and independent choice',
        'Caring for the indoor and outdoor school environment'
      ]
    },
    {
      id: 'elementary',
      title: 'Basic School (Basic 1 - 5)',
      subtitle: 'Pink & Peach Classes · Ages 6 – 11 years',
      icon: GraduationCap,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      emoji: '🔬',
      image: '/images/11.jpg',
      classroom: 'Pink & Peach Classes',
      classroomColorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'Nurturing the cosmic mind. Students engage in cooperative group projects, advanced mathematical theorems, literary review, and laboratory science.',
      dailySchedule: [
        { time: '8:00 AM', activity: 'Morning Assembly & Goal-Setting Circle', icon: '🌅' },
        { time: '8:30 AM', activity: 'Uninterrupted Academic Research Cycle', icon: '📚' },
        { time: '11:00 AM', activity: 'Physical Education & Athletics', icon: '⚽' },
        { time: '12:00 PM', activity: 'Hot Lunch & Community Conversation', icon: '🍽️' },
        { time: '1:00 PM', activity: 'Science Lab & Creative Writing', icon: '⚗️' },
        { time: '2:00 PM', activity: 'French / Music & Specialized Classes', icon: '🎭' },
        { time: '3:00 PM', activity: 'Self-Assessment & Dismissal', icon: '📝' }
      ],
      activities: [
        { name: 'Advanced Geometry', description: 'Investigating equivalence, area, and angles using concrete materials.', icon: '📐' },
        { name: 'Scientific Method', description: 'Conducting real chemistry, physics, and plant biology laboratory experiments.', icon: '🧪' },
        { name: 'Project-Based Research', description: 'Cooperating in groups to compile essays and slide presentations on history.', icon: '🔍' },
        { name: 'Literature Reviews', description: 'Reading, analyzing, and discussing classical and modern youth literature.', icon: '📚' },
        { name: 'Cosmic Education', description: 'Exploring the history of the universe and deep ecological relationships.', icon: '🌌' },
        { name: 'Leadership & Community', description: 'Initiating environment-friendly recycling drives and peer-to-peer mentoring.', icon: '🤝' }
      ],
      learningGoals: [
        'Strong essay writing and presentation skills',
        'Algebraic place-value understanding and complex logic theorems',
        'Applying the scientific method to test environmental hypotheses',
        'High degree of independent project scheduling and time management',
        'Empathetic leadership and local community contribution'
      ]
    }
  ];

  const currentProgram = programs.find(p => p.id === selectedProgram) || programs[0];
  const IconComponent = currentProgram.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-emerald-50 to-amber-50">
      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 animate-bounce">
            <BookOpen className="w-12 h-12 text-indigo-400" />
          </div>
          <div className="absolute top-20 right-20 animate-pulse">
            <Palette className="w-8 h-8 text-amber-500" />
          </div>
          <div className="absolute bottom-20 left-1/4 animate-bounce" style={{ animationDelay: '1s' }}>
            <Music className="w-10 h-10 text-emerald-500" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-black text-gray-800 mb-6">
              Our Academic 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-500"> Programs! 🎓</span>
            </h1>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
              Every academic age bracket is a custom prepare environment. Explore our structured classrooms, real-life goals, and certified curriculum paths. ✨
            </p>
          </div>
        </div>
      </section>

      {/* Program Selection Bar */}
      <section className="py-10 bg-white border-t border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {programs.map((program) => {
              const ProgramIcon = program.icon;
              return (
                <button
                  key={program.id}
                  onClick={() => setSelectedProgram(program.id)}
                  className={`flex items-center gap-3 px-8 py-4 rounded-full font-extrabold text-lg transition-all duration-300 transform hover:scale-105 ${
                    selectedProgram === program.id
                      ? `bg-gradient-to-r ${program.color} text-white shadow-xl`
                      : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-100'
                  }`}
                >
                  <ProgramIcon className="w-6 h-6" />
                  <span>{program.title}</span>
                  <span className="text-2xl">{program.emoji}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Selected Program Details */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Interactive Classroom Banner using real website scraped photo */}
          <div className="mb-20 bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-white grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Visual: Real Scraped Classroom Photo */}
            <div className="relative h-[300px] lg:h-[450px] bg-indigo-50 overflow-hidden">
              <img 
                src={currentProgram.image} 
                alt={`${currentProgram.classroom} activities at Greenville Montessori`} 
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
              <div className="absolute top-6 left-6 flex flex-col gap-2">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-md ${currentProgram.classroomColorClass}`}>
                  {currentProgram.classroom}
                </span>
              </div>
            </div>

            {/* Info: Text and Primary description */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentProgram.color} text-white flex items-center justify-center shadow-lg text-3xl`}>
                  {currentProgram.emoji}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-800 leading-tight">
                    {currentProgram.title}
                  </h2>
                  <p className="text-indigo-600 font-extrabold text-sm">{currentProgram.subtitle}</p>
                </div>
              </div>
              <p className="text-xl text-gray-600 leading-relaxed font-medium mt-4">
                {currentProgram.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-900 font-bold text-sm">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Full Day Program
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl text-emerald-900 font-bold text-sm">
                  <Star className="w-5 h-5 text-emerald-500 fill-current" />
                  Small Ratios
                </div>
              </div>
            </div>
          </div>

          {/* Program Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Daily Schedule */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-indigo-50">
              <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6 text-indigo-500" />
                Prepared Routine! 📅
              </h3>
              <div className="space-y-4">
                {currentProgram.dailySchedule.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3.5 bg-indigo-50/40 rounded-2xl hover:bg-indigo-50 transition-colors border border-indigo-50/20">
                    <div className="text-2xl bg-white p-2.5 rounded-xl shadow-sm">{item.icon}</div>
                    <div>
                      <div className="font-extrabold text-indigo-600 text-sm">{item.time}</div>
                      <div className="text-gray-700 font-semibold text-sm leading-tight mt-0.5">{item.activity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Activities */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-indigo-50">
              <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-indigo-500" />
                What We Explore! 🎯
              </h3>
              <div className="space-y-4">
                {currentProgram.activities.map((activity, index) => (
                  <div key={index} className="p-4 bg-gradient-to-br from-indigo-50/20 to-indigo-50/40 rounded-2xl border border-indigo-100/50">
                    <div className="flex items-start gap-3.5">
                      <div className="text-2xl bg-white p-1.5 rounded-lg shadow-sm">{activity.icon}</div>
                      <div>
                        <h4 className="font-extrabold text-gray-800 mb-1 leading-tight text-base">{activity.name}</h4>
                        <p className="text-gray-500 text-xs font-semibold leading-relaxed">{activity.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Goals */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-indigo-50">
              <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
                <Star className="w-6 h-6 text-amber-500" />
                Acquired Skills! 🌟
              </h3>
              <div className="space-y-4">
                {currentProgram.learningGoals.map((goal, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-amber-50/30 rounded-2xl border border-amber-100/30">
                    <Star className="w-5 h-5 text-amber-500 fill-current flex-shrink-0 mt-1" />
                    <p className="text-gray-700 font-semibold text-sm leading-relaxed">{goal}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-indigo-700 to-indigo-500 text-white border-t border-indigo-800 shadow-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-black mb-6">Ready to Join Our Learning Adventure? 🚀</h2>
          <p className="text-xl mb-8 opacity-90 font-medium">
            Come schedule a walkthrough of our preparational classrooms and meet our dedicated Guides. We are excited to welcome you!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/contact')}
              className="bg-white text-indigo-700 px-8 py-4 rounded-full font-extrabold text-lg hover:bg-gray-50 transition-colors transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 mx-auto sm:mx-0"
            >
              <Clock className="w-5 h-5" />
              Schedule a Visit!
            </button>
            <button 
              onClick={() => navigate('/contact')}
              className="border-2 border-white text-white px-8 py-4 rounded-full font-extrabold text-lg hover:bg-white hover:text-indigo-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 mx-auto sm:mx-0"
            >
              Ask Questions
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}