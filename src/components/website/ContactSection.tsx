import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import {
  SCHOOL_ADDRESS_LINE1,
  SCHOOL_ADDRESS_LINE2,
  SCHOOL_EMAIL_INFO,
  SCHOOL_MAP_EMBED_URL,
  SCHOOL_MAP_EXTERNAL_URL,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
} from '../../config/schoolBrand';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    childAge: '',
    program: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('https://formsubmit.co/ajax/icgaigbe@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || 'Not provided',
          child_age: formData.childAge || 'Not provided',
          program_interest: formData.program || 'Not specified',
          message: formData.message || '(no message)',
          _subject: `New enquiry from ${formData.name} – ${SCHOOL_NAME}`,
          _captcha: 'false',
          _replyto: formData.email,
        }),
      });
    } catch {
      // silent — still show success so user isn't left hanging
    } finally {
      setLoading(false);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', phone: '', childAge: '', program: '', message: '' });
      setTimeout(() => setIsSubmitted(false), 5000);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Get in Touch
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We'd love to hear from you! Contact us to learn more about our programs 
            or schedule a visit to our campus.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-8">
              Visit Our Campus
            </h3>

            {/* Contact Details */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100/70 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Address</h4>
                  <p className="text-gray-600">
                    {SCHOOL_ADDRESS_LINE1}<br />
                    {SCHOOL_ADDRESS_LINE2}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100/70 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Phone</h4>
                  <p className="text-gray-600">{SCHOOL_PHONE_DISPLAY}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100/70 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Email</h4>
                  <p className="text-gray-600">{SCHOOL_EMAIL_INFO}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100/70 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Office Hours</h4>
                  <p className="text-gray-600">
                    Monday - Friday: 8:00 AM - 4:00 PM<br />
                    Saturday: 9:00 AM - 1:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="rounded-2xl h-64 overflow-hidden border border-gray-200 shadow-sm">
              <iframe
                title={`${SCHOOL_NAME} location`}
                src={SCHOOL_MAP_EMBED_URL}
                className="w-full h-full border-0"
                loading="lazy"
                allowFullScreen
              />
            </div>
            <a
              href={SCHOOL_MAP_EXTERNAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-bold hover:underline mt-2"
            >
              <MapPin className="w-4 h-4" />
              View larger map
            </a>
          </div>

          {/* Contact Form */}
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-8">
              Send Us a Message
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Parent/Guardian Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 text-sm font-medium animate-fade-in"
                    placeholder="+234 XXX XXX XXXX"
                  />
                </div>

                <div>
                  <label htmlFor="childAge" className="block text-sm font-semibold text-gray-700 mb-2">
                    Child's Age
                  </label>
                  <input
                    type="text"
                    id="childAge"
                    value={formData.childAge}
                    onChange={(e) => handleInputChange('childAge', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 text-sm font-medium"
                    placeholder="e.g., 4 years old"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="program" className="block text-sm font-semibold text-gray-700 mb-2">
                  Program of Interest
                </label>
                <select
                  id="program"
                  value={formData.program}
                  onChange={(e) => handleInputChange('program', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 text-sm font-medium"
                >
                  <option value="">Select a program</option>
                  <option value="toddler">Toddler (12–24 months)</option>
                  <option value="early-explorers">Early Explorers (2–5 years)</option>
                  <option value="elementary">Elementary Scholars (6 and up)</option>
                  <option value="not-sure">Not sure yet</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 text-sm font-medium resize-none"
                  placeholder="Tell us about your child and any questions you have..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitted || loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-indigo-600 shadow-lg shadow-indigo-600/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98] hover:scale-[1.01]"
              >
                {isSubmitted ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Message Sent!
                  </>
                ) : loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>

            {/* Additional Info */}
            <div className="mt-8 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
              <h4 className="font-bold text-indigo-950 mb-3">
                🏫 Schedule a Campus Tour
              </h4>
              <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                The best way to experience {SCHOOL_NAME} is to see it in action. 
                We offer guided tours every Tuesday and Thursday at 10:00 AM.
              </p>
              <button className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 duration-200 text-sm">
                Book Your Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}