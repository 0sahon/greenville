import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { GradeRow, AttendanceRow, StudentWithProfileAndClass } from '../../../lib/supabase';

export interface SubmissionWithAssignment {
  id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  assignments?: { title: string; description: string | null; due_date: string | null; max_score: number; type: string; courses?: { title: string; subject: string } } | null;
}

export function useStudentData(profileId: string) {
  const [student, setStudent] = useState<StudentWithProfileAndClass | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [assignments, setAssignments] = useState<SubmissionWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      const { data: s, error: err } = await supabase
        .from('students')
        .select('*, profiles:profile_id(first_name,last_name,email,phone), classes:class_id(name,level)')
        .eq('profile_id', profileId)
        .maybeSingle();
      if (!mounted) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      if (s) {
        setStudent(s);
        const [{ data: g }, { data: a }, { data: asn }] = await Promise.all([
          supabase.from('grades').select('*').eq('student_id', s.id).order('created_at', { ascending: false }),
          supabase.from('attendance').select('*').eq('student_id', s.id).order('date', { ascending: false }).limit(30),
          supabase.from('submissions').select('*, assignments:assignment_id(title,description,due_date,max_score,type, courses:course_id(title,subject))').eq('student_id', s.id).order('submitted_at', { ascending: false }),
        ]);
        if (!mounted) return;
        setGrades((g || []) as GradeRow[]);
        setAttendance((a || []) as AttendanceRow[]);
        setAssignments((asn || []) as SubmissionWithAssignment[]);
      } else {
        setStudent(null);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [profileId]);

  return { student, grades, attendance, assignments, loading, error };
}
