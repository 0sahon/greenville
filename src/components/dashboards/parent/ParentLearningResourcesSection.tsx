import { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, FileText, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { createClassMaterialSignedUrl } from '../../../lib/classMaterialStorage';
import { fetchCourseIdsForStudentClass } from '../../../lib/learningResourceCourseIds';
import type { ProfileRow, CourseMaterialRow } from '../../../lib/supabase';

interface Props {
  profile: ProfileRow;
}

interface MaterialWithCourse extends CourseMaterialRow {
  courses?: { title: string; subject: string; class_id: string | null } | null;
}

interface LinkedStudent {
  id: string;
  class_id: string | null;
  profiles?: { first_name: string | null; last_name: string | null } | null;
}

export default function ParentLearningResourcesSection({ profile }: Props) {
  const [materials, setMaterials] = useState<MaterialWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noParent, setNoParent] = useState(false);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setNoParent(false);
      try {
        const { data: parent } = await supabase.from('parents').select('id').eq('profile_id', profile.id).maybeSingle();
        if (!parent) {
          if (!cancelled) {
            setNoParent(true);
            setMaterials([]);
          }
          return;
        }
        const { data: links } = await supabase.from('student_parents').select('student_id').eq('parent_id', parent.id);
        const studentIds = (links || []).map((l: { student_id: string }) => l.student_id);
        if (studentIds.length === 0) {
          if (!cancelled) setMaterials([]);
          return;
        }
        const { data: students } = await supabase
          .from('students')
          .select('id, class_id, profiles:profile_id(first_name,last_name)')
          .in('id', studentIds);
        const list = (students || []) as LinkedStudent[];
        const courseIdSet = new Set<string>();
        for (const s of list) {
          if (!s.class_id) continue;
          const ids = await fetchCourseIdsForStudentClass(s.class_id);
          ids.forEach(id => courseIdSet.add(id));
        }
        const courseIds = [...courseIdSet];
        if (courseIds.length === 0) {
          if (!cancelled) setMaterials([]);
          return;
        }
        const { data: matData, error: matErr } = await supabase
          .from('course_materials')
          .select('*, courses:course_id(title, subject, class_id)')
          .in('course_id', courseIds)
          .order('created_at', { ascending: false });
        if (matErr) throw matErr;
        if (!cancelled) setMaterials((matData || []) as MaterialWithCourse[]);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load resources');
          setMaterials([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

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

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-48 gap-3">
        <div className="w-9 h-9 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading resources…</p>
      </div>
    );
  }

  if (noParent) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-amber-800">No parent profile is linked to this account.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700">{error}</p>
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
          Same materials your children&apos;s teachers share for class — use these to support learning at home.
        </p>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-gray-100 rounded-xl bg-white">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-600">No resources yet</p>
          <p className="text-xs mt-1 max-w-md mx-auto">
            When your children are in a class and teachers add materials, they will appear here (read-only).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(bySubject).map(([subject, rows]) => (
            <div key={subject} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                <h3 className="font-semibold text-purple-900">{subject}</h3>
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
                        className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-purple-600 hover:underline"
                      >
                        <FileText className="w-4 h-4" /> Open file
                      </a>
                    )}
                    {m.url && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-purple-600 hover:underline"
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
