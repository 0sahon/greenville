import { Calendar, FileText, DollarSign, Users, CheckCircle, Clock, Phone } from 'lucide-react';
import { SCHOOL_NAME } from '../../config/schoolBrand';

export default function AdmissionsSection() {
  const admissionSteps = [
    {
      step: 1,
      title: 'Submit Application',
      description: 'Complete our online application form with required documents.',
      icon: FileText,
      color: 'from-blue-400 to-blue-600'
    },
    {
      step: 2,
      title: 'Schedule Tour',
      description: 'Visit our school and see our classrooms and facilities in action.',
      icon: Calendar,
      color: 'from-green-400 to-green-600'
    },
    {
      step: 3,
      title: 'Child Assessment',
      description: 'A gentle observation session to understand your child\'s needs.',
      icon: Users,
      color: 'from-orange-400 to-orange-600'
    },
    {
      step: 4,
      title: 'Enrollment',
      description: 'Complete enrollment paperwork and secure your child\'s place.',
      icon: CheckCircle,
      color: 'from-purple-400 to-purple-600'
    }
  ];

  const tuitionRates = [
    {
      program: 'Crèche',
      age: '0 – 18 months',
      tuition: 'Contact Us',
      period: 'for fee schedule',
      includes: ['Loving caregivers', 'Feeding support', 'Safe sleeping area']
    },
    {
      program: 'Pre-Nursery & Nursery',
      age: '18 months – 4 years',
      tuition: 'Contact Us',
      period: 'for fee schedule',
      includes: ['Meals', 'Learning materials', 'Activity packs']
    },
    {
      program: 'Kindergarten',
      age: '4 – 6 years',
      tuition: 'Contact Us',
      period: 'for fee schedule',
      includes: ['Meals', 'Learning materials', 'Activity packs', 'Graduation ceremony']
    }
  ];

  const requirements = [
    'Completed application form',
    'Birth certificate',
    'Immunization records',
    'Previous school records (if applicable)',
    'Passport photographs',
    'Parent/guardian identification'
  ];

  return (
    <section id="admissions" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Admissions
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Registration forms are now available for the 2025/2026 academic session.
            We welcome all families who want the best start for their children.
          </p>
        </div>

        {/* Admission Process */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-gray-800 text-center mb-12">
            Admission Process
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {admissionSteps.map((step) => {
              const IconComponent = step.icon;
              return (
                <div key={step.step} className="text-center">
                  <div className="relative mb-6">
                    <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${step.color} rounded-full shadow-lg`}>
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{step.step}</span>
                    </div>
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 mb-3">
                    {step.title}
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tuition and Fees */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-gray-800 text-center mb-12">
            Tuition & Fees
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tuitionRates.map((rate, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                <div className="text-center mb-6">
                  <h4 className="text-2xl font-bold text-gray-800 mb-2">
                    {rate.program}
                  </h4>
                  <p className="text-gray-600 mb-4">{rate.age}</p>
                  <div className="text-4xl font-bold text-orange-500 mb-2">
                    {rate.tuition}
                  </div>
                  <p className="text-gray-500">{rate.period}</p>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h5 className="font-semibold text-gray-800 mb-3">Includes:</h5>
                  <ul className="space-y-2">
                    {rate.includes.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="bg-blue-50 rounded-2xl p-8 max-w-4xl mx-auto">
              <h4 className="text-2xl font-bold text-gray-800 mb-4">
                Financial Aid Available
              </h4>
              <p className="text-lg text-gray-600 mb-6">
                We believe every child deserves a quality education.
                Contact us to discuss our fee schedule and available support options.
              </p>
              <button className="bg-blue-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-600 transition-colors duration-200">
                Learn About Financial Aid
              </button>
            </div>
          </div>
        </div>

        {/* Requirements and Important Dates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Requirements */}
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Application Requirements
            </h3>
            <div className="bg-gray-50 rounded-2xl p-6">
              <ul className="space-y-3">
                {requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Important Dates */}
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Important Dates
            </h3>
            <div className="space-y-4">
              <div className="bg-orange-50 rounded-xl p-4 border-l-4 border-orange-400">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Registration Open</h4>
                    <p className="text-gray-600">Now – for September 2025/2026</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-400">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-green-500" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Session Resumes</h4>
                    <p className="text-gray-600">September 2025</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-400">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <h4 className="font-semibold text-gray-800">New Family Orientation</h4>
                    <p className="text-gray-600">August 2025 (date to be confirmed)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-orange-500 to-green-500 rounded-3xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-6">
              Ready to Start Your Application?
            </h3>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Take the first step towards your child's bright future at {SCHOOL_NAME}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-orange-500 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors duration-200">
                Apply Online Now
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white hover:text-orange-500 transition-all duration-200 flex items-center justify-center gap-2">
                <Phone className="w-5 h-5" />
                Call to Schedule Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}