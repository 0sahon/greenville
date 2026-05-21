import React, { useState } from 'react';
import {
  User, Mail, Phone, Calendar, MapPin, FileText,
  Star, Heart, Gift, CheckCircle, Send, Baby, Users, GraduationCap,
  MessageSquare, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import {
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_EMAIL_ADMISSIONS,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_PHONE_TEL_HREF,
  SCHOOL_REFERENCE_PREFIX,
} from '../../../config/schoolBrand';

const PROGRAMS = [
  { value: 'toddler', label: 'Toddler Adventures (18 months – 3 years)', icon: Baby, color: 'from-pink-400 to-pink-600', emoji: '🧸', desc: 'Nurturing environment for the earliest learners' },
  { value: 'primary', label: 'Primary Explorers (3 – 6 years)', icon: Users, color: 'from-blue-400 to-blue-600', emoji: '🎨', desc: 'Creative discovery through Montessori principles' },
  { value: 'elementary', label: 'Elementary Scholars (6 – 12 years)', icon: GraduationCap, color: 'from-green-400 to-green-600', emoji: '🔬', desc: 'Academic excellence with hands-on learning' },
];

const STEPS = [
  { step: 1, title: 'Fill Application', desc: 'Complete our online registration form below', icon: '📝', color: 'from-blue-400 to-blue-500' },
  { step: 2, title: 'Visit Our School', desc: 'Tour our campus and meet our dedicated teachers', icon: '🏫', color: 'from-green-400 to-green-500' },
  { step: 3, title: 'Assessment & Meet-Greet', desc: 'Your child gets to play and explore with us', icon: '🤝', color: 'from-indigo-400 to-indigo-500' },
  { step: 4, title: 'Welcome Home!', desc: `Join our wonderful ${SCHOOL_NAME} family`, icon: '🎉', color: 'from-orange-400 to-orange-500' },
];

const REQUIREMENTS = [
  { item: 'Birth Certificate', icon: '📜', desc: 'Official copy of your child\'s birth certificate' },
  { item: 'Immunization Records', icon: '💉', desc: 'Up-to-date vaccination records' },
  { item: 'Passport Photos', icon: '📸', desc: '4 recent passport-sized photographs' },
  { item: 'Previous School Records', icon: '📚', desc: 'If transferring from another school' },
  { item: 'Medical Form', icon: '🏥', desc: 'Completed health assessment form' },
  { item: 'Parent/Guardian ID', icon: '🆔', desc: 'Valid identification of parent or guardian' },
];

type Status = 'idle' | 'submitting' | 'success' | 'error';

const EMPTY_FORM = {
  parentName: '', email: '', phone: '', address: '',
  childName: '', childAge: '', dateOfBirth: '', gender: '', program: '',
  previousSchool: '', medicalConditions: '',
  emergencyContact: '', emergencyPhone: '',
  message: '',
};

export default function AdmissionsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState<Status>('idle');
  const [refId, setRefId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    try {
      const { data, error } = await supabase.rpc('submit_admission_application', {
        p_parent_name:        form.parentName,
        p_email:              form.email,
        p_phone:              form.phone,
        p_address:            form.address,
        p_child_name:         form.childName,
        p_child_age:          form.childAge || null,
        p_date_of_birth:      form.dateOfBirth || null,
        p_gender:             form.gender || null,
        p_program:            form.program,
        p_previous_school:    form.previousSchool || null,
        p_medical_conditions: form.medicalConditions || null,
        p_emergency_contact:  form.emergencyContact,
        p_emergency_phone:    form.emergencyPhone,
        p_message:            form.message || null,
      });

      if (error) throw error;
      const ref = `${SCHOOL_REFERENCE_PREFIX}-${((data as string) || '').substring(0, 8).toUpperCase()}`;
      setRefId(ref);
      setStatus('success');
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      setStatus('error');
    }
  };

  const inputCls = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm';
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-indigo-100/35">

      {/* ── Hero ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 animate-bounce"><Star className="w-12 h-12 text-yellow-400 fill-current" /></div>
          <div className="absolute top-20 right-20 animate-pulse"><Heart className="w-8 h-8 text-pink-400 fill-current" /></div>
          <div className="absolute bottom-20 left-1/4 animate-bounce" style={{ animationDelay: '1s' }}><Gift className="w-10 h-10 text-indigo-400" /></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <h1 className="text-5xl md:text-7xl font-black text-gray-800 mb-6">
            Join Our Amazing
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-500"> School Family! 🎒</span>
          </h1>
          <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Ready to start your child's incredible learning adventure?
            We can't wait to welcome you to the {SCHOOL_NAME} family! ✨
          </p>
        </div>
      </section>

      {/* ── Admission Steps ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">How to Join Us! 🌟</h2>
            <p className="text-xl text-gray-600">It's easy to become part of our school family!</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map(s => (
              <div key={s.step} className="text-center">
                <div className="relative mb-6 inline-block">
                  <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${s.color} rounded-full shadow-lg`}>
                    <div className="text-3xl">{s.icon}</div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{s.step}</span>
                  </div>
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">{s.title}</h4>
                <p className="text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Programs (no fees) ── */}
      <section className="py-16 bg-gradient-to-br from-indigo-50 to-indigo-100/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Our Programmes 🎓</h2>
            <p className="text-xl text-gray-600">Find the perfect fit for your child's stage of learning</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PROGRAMS.map(prog => {
              const Icon = prog.icon;
              return (
                <div key={prog.value} className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  <div className={`bg-gradient-to-r ${prog.color} p-8 text-white text-center`}>
                    <div className="text-6xl mb-4">{prog.emoji}</div>
                    <Icon className="w-10 h-10 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold">{prog.label.split('(')[0].trim()}</h3>
                    <p className="text-sm opacity-90 mt-1">{prog.label.match(/\(([^)]+)\)/)?.[1]}</p>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-gray-600 mb-4">{prog.desc}</p>
                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4">
                      <p className="text-sm font-semibold text-indigo-700">
                        📞 Contact us for fees &amp; availability
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA to visit/call for fees */}
          <div className="mt-12 max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-8 text-center border-2 border-indigo-100">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">Fee Structure & Payment Plans</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              We offer flexible and competitive fee packages tailored to each programme and family needs.
              Please visit our school or contact our admissions office for a detailed fee breakdown and
              payment plan options.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={SCHOOL_PHONE_TEL_HREF}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">
                <Phone className="w-5 h-5" /> Call: {SCHOOL_PHONE_DISPLAY}
              </a>
              <button onClick={() => navigate('/contact')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-indigo-500 text-indigo-700 rounded-full font-bold hover:bg-indigo-50 transition-colors">
                <MessageSquare className="w-5 h-5" /> Chat with Admissions
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Registration Form ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Registration Form 📝</h2>
            <p className="text-xl text-gray-600">Fill out this form to begin your child's admission process</p>
          </div>

          {/* Success state */}
          {status === 'success' && (
            <div className="bg-green-50 border-2 border-green-300 rounded-3xl p-10 text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-3xl font-bold text-green-700 mb-3">Application Received!</h3>
              <p className="text-lg text-green-600 mb-4">
                Thank you for applying to {SCHOOL_NAME}. Our admissions team will review your application and contact you within 2–3 working days.
              </p>
              <div className="bg-white border border-green-200 rounded-xl px-6 py-3 inline-block mb-4">
                <p className="text-sm text-gray-500">Your Reference Number</p>
                <p className="text-2xl font-black text-green-700 tracking-widest">{refId}</p>
              </div>
              <p className="text-sm text-gray-500">Please save this reference number for your records.</p>
              <div className="mt-6 flex gap-3 justify-center">
                <button onClick={() => navigate('/contact')}
                  className="px-6 py-3 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-colors">
                  Contact Us
                </button>
                <button onClick={() => setStatus('idle')}
                  className="px-6 py-3 bg-white border border-green-300 text-green-700 rounded-full font-bold hover:bg-green-50 transition-colors">
                  Submit Another
                </button>
              </div>
            </div>
          )}

          {status !== 'success' && (
            <div className="bg-gradient-to-br from-indigo-50/70 via-indigo-50/20 to-white rounded-3xl p-8 shadow-xl border border-indigo-100/50 animate-fade-in">
              {status === 'error' && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700">Submission failed</p>
                    <p className="text-sm text-red-600">{errorMsg}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Parent/Guardian */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" /> Parent / Guardian Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelCls}>Full Name *</label><input type="text" value={form.parentName} onChange={e => set('parentName', e.target.value)} className={inputCls} required /></div>
                    <div><label className={labelCls}>Email Address *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} required /></div>
                    <div><label className={labelCls}>Phone Number *</label><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+234 XXX XXX XXXX" required /></div>
                    <div><label className={labelCls}>Home Address *</label><input type="text" value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} required /></div>
                  </div>
                </div>

                {/* Child */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" /> Child's Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelCls}>Child's Full Name *</label><input type="text" value={form.childName} onChange={e => set('childName', e.target.value)} className={inputCls} required /></div>
                    <div><label className={labelCls}>Child's Age</label><input type="text" value={form.childAge} onChange={e => set('childAge', e.target.value)} className={inputCls} placeholder="e.g. 5 years" /></div>
                    <div><label className={labelCls}>Date of Birth</label><input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Gender</label>
                      <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputCls}>
                        <option value="">— Select —</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>Programme Applying For *</label>
                      <select value={form.program} onChange={e => set('program', e.target.value)} className={inputCls} required>
                        <option value="">— Choose a programme —</option>
                        {PROGRAMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Previous School (if any)</label><input type="text" value={form.previousSchool} onChange={e => set('previousSchool', e.target.value)} className={inputCls} placeholder="Name of previous school" /></div>
                    <div><label className={labelCls}>Medical Conditions / Allergies</label><input type="text" value={form.medicalConditions} onChange={e => set('medicalConditions', e.target.value)} className={inputCls} placeholder="Any conditions we should know about" /></div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-red-500" /> Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelCls}>Contact Name *</label><input type="text" value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} className={inputCls} required /></div>
                    <div><label className={labelCls}>Contact Phone *</label><input type="tel" value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} className={inputCls} placeholder="+234 XXX XXX XXXX" required /></div>
                  </div>
                </div>

                {/* Additional */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" /> Additional Information
                  </h3>
                  <label className={labelCls}>Questions or special information about your child</label>
                  <textarea rows={4} value={form.message} onChange={e => set('message', e.target.value)}
                    className={`${inputCls} resize-none`}
                    placeholder="Tell us anything that will help us support your child best…" />
                </div>

                <div className="text-center">
                  <button type="submit" disabled={status === 'submitting'}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-4 px-12 rounded-full font-bold text-xl hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-xl shadow-indigo-600/20 inline-flex items-center gap-3">
                    {status === 'submitting' ? (
                      <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
                    ) : (
                      <><Send className="w-6 h-6" /> Submit Application ✨</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* ── Required Documents ── */}
      <section className="py-16 bg-gradient-to-br from-indigo-50 to-indigo-100/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Documents You'll Need 📋</h2>
            <p className="text-xl text-gray-600">Please bring these when you visit the school</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REQUIREMENTS.map((req, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-center">
                <div className="text-4xl mb-3">{req.icon}</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{req.item}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{req.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Banner ── */}
      <section className="py-16 bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950">
        <div className="max-w-4xl mx-auto px-4 text-center text-white relative overflow-hidden">
          
          {/* Subtle Banner Background Orbs */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="text-5xl mb-5">📞</div>
          <h2 className="text-4xl font-bold mb-4">Questions? We're Here to Help!</h2>
          <p className="text-xl mb-8 opacity-90">Our admissions team is happy to guide you through the process.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { icon: Phone, label: 'Call Us', value: SCHOOL_PHONE_DISPLAY },
              { icon: Mail, label: 'Email Us', value: SCHOOL_EMAIL_ADMISSIONS },
              { icon: MapPin, label: 'Visit Us', value: SCHOOL_ADDRESS_SINGLE },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/15 transition-all duration-300">
                <Icon className="w-7 h-7 mx-auto mb-2 text-indigo-400" />
                <p className="font-bold mb-1">{label}</p>
                <p className="text-sm opacity-90">{value}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/contact')}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-2 border-indigo-400/30 px-8 py-4 rounded-full font-bold text-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-xl shadow-indigo-600/35">
            Schedule a School Visit 🏫
          </button>
        </div>
      </section>
    </div>
  );
}
