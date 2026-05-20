import { useState, useEffect } from 'react';
import { Paperclip, AlertCircle, BookOpen, ExternalLink, FileText, Tv, X, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { createClassMaterialSignedUrl } from '../../../lib/classMaterialStorage';
import { fetchCourseIdsForStudentClass } from '../../../lib/learningResourceCourseIds';
import { useStudentData } from './useStudentData';
import type { ProfileRow, CourseMaterialRow, CourseRow } from '../../../lib/supabase';
import KidsSlideshowPlayer from '../KidsSlideshowPlayer';

interface Props {
  profile: ProfileRow;
}

interface MaterialWithCourse extends CourseMaterialRow {
  courses?: { title: string; subject: string; class_id: string | null } | null;
}

export default function LearningResourcesSection({ profile }: Props) {
  const { student, loading: studentLoading, error: studentError } = useStudentData(profile.id);
  const [materials, setMaterials] = useState<MaterialWithCourse[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [activeSlideshowTopic, setActiveSlideshowTopic] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (studentLoading) return;
      if (!student?.class_id) {
        setMaterials([]);
        setCourses([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Query courses (topics/lessons) directly
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('class_id', student.class_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!cancelled) setCourses(coursesData || []);

        const courseIds = await fetchCourseIdsForStudentClass(student.class_id);
        if (courseIds.length === 0) {
          if (!cancelled) setMaterials([]);
        } else {
          const { data: matData } = await supabase
            .from('course_materials')
            .select('*, courses:course_id(title, subject, class_id)')
            .in('course_id', courseIds)
            .order('created_at', { ascending: false });
          if (!cancelled) setMaterials((matData || []) as MaterialWithCourse[]);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setMaterials([]);
          setCourses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, studentLoading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const withPath = materials.filter(m => m.file_storage_path);
      const entries = await Promise.all(
        withPath.map(async m => {
          const u = await createClassMaterialSignedUrl(supabase, m.file_storage_path);
          return [m.id, u] as const;
        })
      );
      if (cancelled) return;
      setFileUrls(Object.fromEntries(entries.filter(([, u]) => !!u) as [string, string][]));
    })();
    return () => {
      cancelled = true;
    };
  }, [materials]);

  if (studentLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-48 gap-3">
        <div className="w-9 h-9 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading resources…</p>
      </div>
    );
  }

  if (studentError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700">{studentError}</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-amber-800">No student record linked to your account.</p>
      </div>
    );
  }

  if (!student.class_id) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-3">
        <BookOpen className="w-6 h-6 text-blue-500 flex-shrink-0" />
        <p className="text-sm text-blue-800">When you are assigned to a class, your teachers&apos; shared links and notes for each subject will show here.</p>
      </div>
    );
  }

  const extractVisualUrl = (text: string) => {
    const match = text.match(/!\[[^\]]*\]\((https?:\/\/[^\)]+)\)/i);
    return match ? match[1] : null;
  };

  const allSubjects = Array.from(new Set([
    ...courses.map(c => c.subject),
    ...materials.map(m => m.courses?.subject || 'General')
  ])).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-5 rounded-2xl border border-pink-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            🎒 My Learning Adventure!
          </h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">
            Tap on any active lesson below to play an exciting animated slideshow and solve fun quiz games!
          </p>
        </div>
      </div>

      {courses.length === 0 && materials.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-white max-w-md mx-auto p-8 space-y-3">
          <BookOpen className="w-16 h-16 mx-auto text-pink-300 animate-bounce" />
          <p className="font-extrabold text-lg text-slate-700">No Lessons Yet</p>
          <p className="text-xs text-gray-500">Your teachers haven&apos;t posted notes or lessons for your class yet. Check back soon! 🌟</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          {allSubjects.map(subject => {
            const subjectCourses = courses.filter(c => c.subject === subject);
            const subjectMaterials = materials.filter(m => (m.courses?.subject || 'General') === subject);

            return (
              <div key={subject} className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-100 overflow-hidden">
                {/* Subject Header Banner */}
                <div className="px-6 py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 flex items-center justify-between border-b border-pink-100/20">
                  <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-2 tracking-wide">
                    📚 {subject}
                  </h3>
                  <span className="text-xs font-black px-3 py-1 bg-white/20 text-white rounded-full backdrop-blur-sm">
                    {subjectCourses.length} Lesson{subjectCourses.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="p-5 space-y-6">
                  {/* active lessons grid */}
                  {subjectCourses.length > 0 && (
                    <div className="space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        ✨ Active Lessons (Click to Play)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {subjectCourses.map(c => {
                          const hasNotes = !!c.description;
                          const illustration = c.description ? extractVisualUrl(c.description) : null;
                          const hasQuiz = c.description && /\[Quiz\]/i.test(c.description);

                          return (
                            <div
                              key={c.id}
                              onClick={() => hasNotes && setActiveSlideshowTopic(c)}
                              className={`group relative overflow-hidden rounded-2xl border-2 border-slate-100 hover:border-pink-300 bg-slate-50/50 hover:bg-white p-4 flex gap-4 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-pink-500/5 hover:-translate-y-0.5 ${
                                !hasNotes ? 'pointer-events-none opacity-60' : ''
                              }`}
                            >
                              {/* Cartoon thumbnail */}
                              <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                                {illustration ? (
                                  <img
                                    src={illustration}
                                    alt=""
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  />
                                ) : (
                                  <span className="text-3xl">📖</span>
                                )}
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <h5 className="font-extrabold text-slate-800 text-sm line-clamp-1 group-hover:text-pink-600 transition-colors">
                                    {c.title}
                                  </h5>
                                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    Term: {c.term}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  {hasQuiz && (
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-0.5">
                                      🎮 Quiz Game
                                    </span>
                                  )}
                                  <span className="text-[9px] font-black px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full group-hover:bg-pink-600 group-hover:text-white transition-all flex items-center gap-1 ml-auto">
                                    <Tv className="w-2.5 h-2.5" /> Play Lesson
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* extra attachments list */}
                  {subjectMaterials.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        📎 Worksheets & Shared Resources
                      </h4>
                      <div className="divide-y divide-slate-50 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                        {subjectMaterials.map(m => (
                          <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-all">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-700 text-sm">{m.title}</p>
                              {m.courses?.title && (
                                <p className="text-xs text-gray-400 font-medium mt-0.5">
                                  For Lesson: {m.courses.title}
                                </p>
                              )}
                              <span className="inline-block text-[9px] font-black uppercase tracking-wider text-pink-500 bg-pink-50 px-2 py-0.5 rounded-md mt-1">
                                {m.type}
                              </span>
                            </div>
                            
                            <div className="flex gap-2 shrink-0">
                              {m.file_storage_path && fileUrls[m.id] && (
                                <a
                                  href={fileUrls[m.id]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-pink-100 hover:border-pink-500 rounded-xl text-xs font-extrabold text-pink-600 bg-white hover:bg-pink-50 transition-all active:scale-95 shadow-sm"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Open File
                                </a>
                              )}
                              {m.url && (
                                <a
                                  href={m.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-pink-100 hover:border-pink-500 rounded-xl text-xs font-extrabold text-pink-600 bg-white hover:bg-pink-50 transition-all active:scale-95 shadow-sm"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> {m.file_storage_path ? 'Resource Link' : 'Open Link'}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Immersive animated slideshow player overlay */}
      {activeSlideshowTopic && (
        <KidsSlideshowPlayer
          topic={{
            title: activeSlideshowTopic.title,
            description: activeSlideshowTopic.description || '',
            subject: activeSlideshowTopic.subject
          }}
          onClose={() => setActiveSlideshowTopic(null)}
        />
      )}
    </div>
  );
}
