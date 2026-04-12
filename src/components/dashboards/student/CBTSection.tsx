import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MonitorCheck, Clock, ChevronLeft, ChevronRight, CheckCircle2,
  AlertTriangle, Trophy, RotateCcw, X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, CbtExamRow, CbtQuestionRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface ExamWithClass extends CbtExamRow {
  classes?: { name: string } | null;
  session?: { id: string; total_score: number; is_submitted: boolean; submitted_at: string | null } | null;
}

// Deliberately omits correct_option — answers are never sent to the browser
type StudentQuestion = Omit<CbtQuestionRow, 'correct_option'>;

type ExamStatus = 'available' | 'in_progress' | 'completed' | 'not_started';

function getExamStatus(exam: ExamWithClass): ExamStatus {
  if (exam.session?.is_submitted) return 'completed';
  if (exam.session && !exam.session.is_submitted) return 'in_progress';
  const now = new Date();
  if (exam.start_time && new Date(exam.start_time) > now) return 'not_started';
  if (exam.end_time && new Date(exam.end_time) < now) return 'not_started';
  return 'available';
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function StudentCBTSection({ profile }: Props) {
  const [exams, setExams] = useState<ExamWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Exam-taking state
  const [activeExam, setActiveExam] = useState<ExamWithClass | null>(null);
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> option
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examView, setExamView] = useState<'list' | 'confirm_start' | 'taking' | 'confirm_submit' | 'result'>('list');
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<{ score: number; total: number; pct: number; correctCount: number; totalQuestions: number } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Get student record
    supabase.from('students').select('id').eq('profile_id', profile.id).maybeSingle().then(({ data }) => {
      if (data) { setStudentId(data.id); fetchExams(data.id); }
      else setLoading(false);
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const fetchExams = async (sid: string) => {
    setLoading(true);
    try {
      const { data } = await supabase.from('cbt_exams').select('*, classes:class_id(name)').eq('is_published', true).order('created_at', { ascending: false });
      if (!data) return;
      // Fetch sessions for this student
      const examIds = (data as CbtExamRow[]).map(e => e.id);
      const { data: sessions } = await supabase.from('cbt_sessions').select('exam_id, id, total_score, is_submitted, submitted_at').eq('student_id', sid).in('exam_id', examIds);
      const sessionMap = Object.fromEntries((sessions || []).map(s => [s.exam_id, s]));
      const enriched = (data as ExamWithClass[]).map(e => ({ ...e, session: sessionMap[e.id] ?? null }));
      setExams(enriched);
    } finally {
      setLoading(false);
    }
  };

  // ── Start Exam ─────────────────────────────────────────────────────────────
  const startExam = async (exam: ExamWithClass) => {
    if (!studentId) return;
    setActiveExam(exam);

    // Fetch questions (requires active session — we'll create session first)
    let sid = exam.session?.id ?? null;
    if (!sid) {
      const { data } = await supabase.from('cbt_sessions').insert({ exam_id: exam.id, student_id: studentId }).select('id').single();
      sid = data?.id ?? null;
    }
    if (!sid) return;
    setSessionId(sid);

    // Explicitly exclude correct_option — scoring happens server-side via submit_cbt_exam RPC
    const { data: qs } = await supabase.from('cbt_questions')
      .select('id, exam_id, question_text, option_a, option_b, option_c, option_d, marks, order_index, created_at')
      .eq('exam_id', exam.id).order('order_index').order('created_at');
    setQuestions((qs || []) as StudentQuestion[]);

    // Load existing answers
    const { data: existingAnswers } = await supabase.from('cbt_answers').select('question_id, selected_option').eq('session_id', sid);
    const ansMap: Record<string, string> = {};
    (existingAnswers || []).forEach(a => { if (a.selected_option) ansMap[a.question_id] = a.selected_option; });
    setAnswers(ansMap);

    setCurrentIdx(0);
    setTimeLeft(exam.duration_minutes * 60);
    setExamView('taking');
  };

  const handleAutoSubmit = useCallback(() => { submitExam(true); }, [sessionId, questions, answers, activeExam]);
  // Ref keeps the interval from capturing a stale closure — always calls the latest version
  const handleAutoSubmitRef = useRef(handleAutoSubmit);
  useEffect(() => { handleAutoSubmitRef.current = handleAutoSubmit; }, [handleAutoSubmit]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (examView !== 'taking') {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleAutoSubmitRef.current(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examView]);

  // ── Save Answer ────────────────────────────────────────────────────────────
  const selectAnswer = async (questionId: string, option: string) => {
    if (!sessionId) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    // Upsert to DB
    await supabase.from('cbt_answers').upsert({ session_id: sessionId, question_id: questionId, selected_option: option, updated_at: new Date().toISOString() }, { onConflict: 'session_id,question_id' });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitExam = async (auto = false) => {
    if (!sessionId || !activeExam || submitting) return;
    if (!auto && examView === 'taking') { setExamView('confirm_submit'); return; }
    setSubmitting(true);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    // Score is calculated server-side — correct_option never touches the browser
    const { data, error } = await supabase.rpc('submit_cbt_exam', { p_session_id: sessionId });
    if (error || !data) {
      setSubmitting(false);
      return;
    }
    const { score, correct_count, total_questions } = data as { score: number; correct_count: number; total_questions: number };
    const pct = activeExam.total_marks > 0 ? Math.round((score / activeExam.total_marks) * 100) : 0;
    setFinalScore({ score, total: activeExam.total_marks, pct, correctCount: correct_count, totalQuestions: total_questions });
    setExamView('result');
    setSubmitting(false);
    if (studentId) fetchExams(studentId);
  };

  const backToList = () => {
    setExamView('list');
    setActiveExam(null);
    setQuestions([]);
    setAnswers({});
    setSessionId(null);
    setFinalScore(null);
  };

  // ─── RESULT VIEW ───────────────────────────────────────────────────────────
  if (examView === 'result' && finalScore && activeExam) {
    const { score, total, pct } = finalScore;
    const pass = pct >= 50;
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-6 max-w-md mx-auto">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center ${pass ? 'bg-green-100' : 'bg-red-100'}`}>
          {pass ? <Trophy className="w-12 h-12 text-green-500" /> : <X className="w-12 h-12 text-red-400" />}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{pass ? 'Well Done!' : 'Keep Practising'}</h2>
          <p className="text-gray-500">{activeExam.title}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full text-center">
          <p className="text-5xl font-extrabold text-gray-900 mb-1">{pct}%</p>
          <p className="text-gray-500 mb-4">Score: {score}/{total}</p>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={`h-3 rounded-full ${pass ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 w-full space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total Questions</span><span className="font-medium">{finalScore.totalQuestions}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Correct</span><span className="font-medium text-green-600">{finalScore.correctCount}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Wrong / Skipped</span><span className="font-medium text-red-500">{finalScore.totalQuestions - finalScore.correctCount}</span></div>
        </div>
        <button onClick={backToList} className="w-full py-3 bg-pink-600 text-white rounded-xl font-medium hover:bg-pink-700">Back to Exams</button>
      </div>
    );
  }

  // ─── CONFIRM SUBMIT ────────────────────────────────────────────────────────
  if (examView === 'confirm_submit') {
    const answered = Object.keys(answers).length;
    const unanswered = questions.length - answered;
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-sm w-full text-center">
          <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-lg mb-2">Submit Exam?</h3>
          <p className="text-sm text-gray-500 mb-2">You have answered <strong>{answered}</strong> of <strong>{questions.length}</strong> questions.</p>
          {unanswered > 0 && <p className="text-sm text-yellow-600 mb-4">{unanswered} question{unanswered > 1 ? 's' : ''} unanswered.</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setExamView('taking')} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm">Continue</button>
            <button onClick={() => submitExam(false)} disabled={submitting} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit'}</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── EXAM TAKING VIEW ──────────────────────────────────────────────────────
  if (examView === 'taking' && activeExam && questions.length > 0) {
    const q = questions[currentIdx];
    const answered = Object.keys(answers).length;
    const urgent = timeLeft <= 60;
    return (
      <div className="space-y-4">
        {/* Top bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">{activeExam.title}</h2>
            <p className="text-xs text-gray-500">{answered}/{questions.length} answered</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${urgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-100 text-indigo-700'}`}>
            <Clock className="w-5 h-5" />{formatTime(timeLeft)}
          </div>
        </div>

        {/* Question grid nav */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-xs text-gray-500 mb-2">Question Navigator</p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentIdx(i)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${i === currentIdx ? 'bg-pink-600 text-white' : answers[questions[i].id] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Current question */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2.5 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded-lg">Q{currentIdx + 1}</span>
            <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-gray-800 font-medium mb-6 leading-relaxed">{q.question_text}</p>
          <div className="space-y-3">
            {(['a', 'b', 'c', 'd'] as const).map(opt => {
              const text = q[`option_${opt}` as keyof CbtQuestionRow] as string;
              const selected = answers[q.id] === opt;
              return (
                <button key={opt} onClick={() => selectAnswer(q.id, opt)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${selected ? 'border-pink-500 bg-pink-50 text-pink-800' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${selected ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{opt.toUpperCase()}</span>
                  <span className="flex-1">{text}</span>
                  {selected && <CheckCircle2 className="w-5 h-5 text-pink-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          {currentIdx < questions.length - 1 ? (
            <button onClick={() => setCurrentIdx(i => i + 1)} className="flex items-center gap-1.5 px-4 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setExamView('confirm_submit')} className="flex items-center gap-1.5 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
              Submit Exam
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <MonitorCheck className="w-6 h-6 text-pink-500" /> CBT Exams
      </h2>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No exams available.</div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const status = getExamStatus(exam);
            return (
              <div key={exam.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                    <p className="text-sm text-gray-500">{exam.subject} · {exam.classes?.name ?? ''} · {exam.duration_minutes} mins</p>
                    {exam.start_time && <p className="text-xs text-gray-400 mt-1">Opens: {new Date(exam.start_time).toLocaleString()}</p>}
                    {exam.end_time && <p className="text-xs text-gray-400">Closes: {new Date(exam.end_time).toLocaleString()}</p>}
                    {exam.instructions && <p className="text-xs text-gray-500 mt-1 italic">{exam.instructions}</p>}
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {status === 'completed' && (
                      <>
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>
                        <p className="text-sm font-bold text-gray-700">{exam.session?.total_score}/{exam.total_marks} <span className="font-normal text-gray-400">({exam.total_marks > 0 ? Math.round((exam.session!.total_score / exam.total_marks) * 100) : 0}%)</span></p>
                      </>
                    )}
                    {status === 'in_progress' && (
                      <button onClick={() => startExam(exam)} className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600">
                        <RotateCcw className="w-4 h-4" /> Resume
                      </button>
                    )}
                    {status === 'available' && (
                      <button onClick={() => startExam(exam)} className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700">
                        Start Exam
                      </button>
                    )}
                    {status === 'not_started' && (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Not Available</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-3 text-xs text-gray-400 border-t border-gray-50 pt-3">
                  <span>{exam.total_marks} marks</span>
                  <span>·</span>
                  <span>{exam.term}</span>
                  <span>·</span>
                  <span>{exam.academic_year}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
