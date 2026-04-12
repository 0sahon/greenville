import { Star, Quote } from 'lucide-react';
import { SCHOOL_NAME } from '../../config/schoolBrand';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Mrs. Adebayo',
      role: 'Parent of Kemi (Age 5)',
      content: `${SCHOOL_NAME} has been transformational for our daughter. She's become so independent and confident. The approach really works!`,
      rating: 5,
      image: '👩🏾‍💼'
    },
    {
      name: 'Mr. & Mrs. Okafor',
      role: 'Parents of Chidi (Age 7)',
      content: 'We love how the teachers guide each child at their own pace. Chidi has developed a genuine love for learning that we never expected at his age.',
      rating: 5,
      image: '👨🏾‍👩🏾‍👦🏾'
    },
    {
      name: 'Dr. Fatima Ibrahim',
      role: 'Parent of Amina (Age 4)',
      content: 'The learner-centered approach has helped Amina develop leadership skills and empathy. She comes home excited to share what she learned every day.',
      rating: 5,
      image: '👩🏾‍⚕️'
    },
    {
      name: 'Mrs. Johnson',
      role: 'Parent of Tolu (Age 6)',
      content: 'The hands-on, teacher-guided learning environment is so engaging. Tolu has developed strong problem-solving skills and creativity.',
      rating: 5,
      image: '👩🏾‍🏫'
    },
    {
      name: 'Mr. Emeka Nwankwo',
      role: 'Parent of Chioma (Age 8)',
      content: 'The cultural studies program has helped our child appreciate both local heritage and global perspectives. Excellent balance!',
      rating: 5,
      image: '👨🏾‍💼'
    },
    {
      name: 'Mrs. Blessing Ade',
      role: 'Parent of Temi (Age 3)',
      content: 'The toddler program provided such gentle guidance during the transition from home. The teachers are incredibly caring and professional.',
      rating: 5,
      image: '👩🏾‍🎓'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            What Our Families Say
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Hear from parents who have experienced the transformative power of early education at {SCHOOL_NAME}.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 relative"
            >
              {/* Quote Icon */}
              <div className="absolute -top-4 left-8">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <Quote className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-700 leading-relaxed mb-6 italic">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  {testimonial.image}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">
                    {testimonial.name}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20">
          <div className="bg-white rounded-3xl p-12 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-orange-500 mb-2">98%</div>
                <div className="text-gray-600">Parent Satisfaction</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-green-500 mb-2">4+</div>
                <div className="text-gray-600">Years of Excellence</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-500 mb-2">100+</div>
                <div className="text-gray-600">Happy Families</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-500 mb-2">15+</div>
                <div className="text-gray-600">Certified Teachers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Join Our Community of Happy Families
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience the difference quality early education can make in your child's life.
          </p>
          <button className="bg-gradient-to-r from-orange-500 to-green-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105">
            Schedule Your Visit Today
          </button>
        </div>
      </div>
    </section>
  );
}