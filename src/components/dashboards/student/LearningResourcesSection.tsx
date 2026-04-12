import { useState, useEffect } from 'react';
import { Paperclip, AlertCircle, BookOpen, ExternalLink, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { createClassMaterialSignedUrl } from '../../../lib/classMaterialStorage';
import { fetchCourseIdsForStudentClass } from '../../../lib/learningResourceCourseIds';
import { useStudentData } from './useStudentData';
import type { ProfileRow, CourseMaterialRow } from '../../../lib/supabase';

interface Props {
  profile: ProfileRow;
}

interface MaterialWithCourse extends CourseMaterialRow {
  courses?: { title: string; subject: string; class_id: string | null } | null;
}

export default function LearningResourcesSection({ profile }: Props) {
  const { student, loading: studentLoading, error: studentError } = useStudentData(profile.id);
  const [materials, setMaterials] = useState<MaterialWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (studentLoading) return;
      if (!student?.class_id) {
        setMaterials([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
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
      } catch {
        if (!cancelled) setMaterials([]);
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

  const bySubject = materials.reduce<Record<string, MaterialWithCourse[]>>((acc, m) => {
    const s = m.courses?.subject || 'General';
    if (!acc[s]) acc[s] = [];
    acc[s].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Learning resources</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Materials your teachers posted for your class — use these if you missed a lesson or want to revise.
        </p>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-gray-100 rounded-xl bg-white">
          <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-600">No resources yet</p>
          <p className="text-xs mt-1 max-w-md mx-auto">Your teachers can add links and notes per subject from their Learning area.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(bySubject).map(([subject, rows]) => (
            <div key={subject} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
                <h3 className="font-semibold text-pink-900">{subject}</h3>
              </div>
              <ul className="divide-y divide-gray-50">
                {rows.map(m => (
                  <li key={m.id} className="px-4 py-3">
                    <p className="font-medium text-gray-800 text-sm">{m.title}</p>
                    {m.courses?.title && <p className="text-xs text-gray-500">{m.courses.title}</p>}
                    <span className="inline-block text-[10px] uppercase tracking-wide text-gray-500 mt-1">{m.type}</span>
                    {m.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{m.description}</p>}
                    {m.file_storage_path && fileUrls[m.id] && (
                      <a
                        href={fileUrls[m.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-pink-600 hover:underline"
                      >
                        <FileText className="w-4 h-4" /> Open file
                      </a>
                    )}
                    {m.url && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-pink-600 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" /> {m.file_storage_path ? 'External link' : 'Open resource'}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
