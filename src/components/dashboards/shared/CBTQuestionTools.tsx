import { useState } from 'react';
import { Upload, Sparkles, X, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ParsedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  marks: number;
  _valid: boolean;
  _error?: string;
}

interface Props {
  examId: string;
  existingCount: number;
  accentColor?: 'indigo' | 'blue';
  onSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function parseImportText(text: string, defaultMarks: number): ParsedQuestion[] {
  const blocks = text.trim().split(/\n\s*\n/).filter(b => b.trim());
  return blocks.map(block => {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const questionLine = lines[0]?.replace(/^\d+[\.\)]\s*/, '') || '';
    const optMap: Record<string, string> = {};
    let correctOpt = '';
    for (const line of lines.slice(1)) {
      const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/);
      if (optMatch) { optMap[optMatch[1].toLowerCase()] = optMatch[2].trim(); continue; }
      const answerMatch = line.match(/^[Aa]nswer\s*:\s*([A-Da-d])/i);
      if (answerMatch) correctOpt = answerMatch[1].toLowerCase();
    }
    const valid = !!(questionLine && optMap.a && optMap.b && optMap.c && optMap.d && correctOpt);
    return {
      question_text: questionLine,
      option_a: optMap.a || '',
      option_b: optMap.b || '',
      option_c: optMap.c || '',
      option_d: optMap.d || '',
      correct_option: correctOpt || 'a',
      marks: defaultMarks,
      _valid: valid,
      _error: !valid ? (!questionLine ? 'Missing question' : !correctOpt ? 'Missing answer line' : 'Missing/incomplete options') : undefined,
    };
  });
}

export default function CBTQuestionTools({ examId, existingCount, accentColor = 'indigo', onSuccess, showToast }: Props) {
  const c = accentColor === 'blue'
    ? { btn: 'bg-blue-600 hover:bg-blue-700 text-white', outline: 'border border-blue-200 text-blue-700 hover:bg-blue-50', ring: 'focus:ring-blue-500' }
    : { btn: 'bg-indigo-600 hover:bg-indigo-700 text-white', outline: 'border border-indigo-200 text-indigo-700 hover:bg-indigo-50', ring: 'focus:ring-indigo-500' };

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMarks, setImportMarks] = useState('1');
  const [importParsed, setImportParsed] = useState<ParsedQuestion[]>([]);
  const [importing, setImporting] = useState(false);

  // AI modal
  const [showAI, setShowAI] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiCount, setAiCount] = useState('10');
  const [aiMarks, setAiMarks] = useState('1');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<ParsedQuestion[]>([]);
  const [aiSaving, setAiSaving] = useState(false);

  const bulkInsert = async (qs: ParsedQuestion[], startIdx: number) => {
    const rows = qs.filter(q => q._valid).map((q, i) => ({
      exam_id: examId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      marks: q.marks,
      order_index: startIdx + i,
    }));
    if (!rows.length) throw new Error('No valid questions to save');
    const { error } = await supabase.from('cbt_questions').insert(rows);
    if (error) throw error;
    // Recompute exam total_marks
    const { data: allQs } = await supabase.from('cbt_questions').select('marks').eq('exam_id', examId);
    const total = (allQs || []).reduce((s: number, q: { marks: number }) => s + q.marks, 0);
    await supabase.from('cbt_exams').update({ total_marks: total, updated_at: new Date().toISOString() }).eq('id', examId);
    return rows.length;
  };

  // ── Import ─────────────────────────────────────────────────────────────
  const handlePreview = () => {
    setImportParsed(parseImportText(importText, parseInt(importMarks) || 1));
  };

  const submitImport = async () => {
    const validCount = importParsed.filter(q => q._valid).length;
    if (!validCount) return showToast('No valid questions to import', 'error');
    setImporting(true);
    try {
      const n = await bulkInsert(importParsed, existingCount);
      showToast(`${n} question${n !== 1 ? 's' : ''} imported`);
      setShowImport(false); setImportText(''); setImportParsed([]);
      onSuccess();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Import failed', 'error'); }
    setImporting(false);
  };

  // ── AI Generate ────────────────────────────────────────────────────────
  const generateAI = async () => {
    if (!aiContent.trim()) return showToast('Please paste some content first', 'error');
    setAiGenerating(true); setAiPreview([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-mcq', {
        body: { content: aiContent, count: parseInt(aiCount) || 10, marks: parseInt(aiMarks) || 1 },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const qs: ParsedQuestion[] = (data.questions || []).map((q: Record<string, unknown>) => ({
        question_text: String(q.question_text || ''),
        option_a: String(q.option_a || ''),
        option_b: String(q.option_b || ''),
        option_c: String(q.option_c || ''),
        option_d: String(q.option_d || ''),
        correct_option: String(q.correct_option || 'a'),
        marks: parseInt(aiMarks) || 1,
        _valid: !!(q.question_text && q.option_a && q.option_b && q.option_c && q.option_d && q.correct_option),
      }));
      if (!qs.length) throw new Error('No questions returned by AI');
      setAiPreview(qs);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'AI generation failed', 'error'); }
    setAiGenerating(false);
  };

  const saveAIQuestions = async () => {
    if (!aiPreview.length) return;
    setAiSaving(true);
    try {
      const n = await bulkInsert(aiPreview, existingCount);
      showToast(`${n} AI-generated question${n !== 1 ? 's' : ''} added`);
      setShowAI(false); setAiContent(''); setAiPreview([]);
      onSuccess();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Save failed', 'error'); }
    setAiSaving(false);
  };

  return (
    <>
      {/* Trigger buttons — render inline, parent wraps in flex row */}
      <button onClick={() => { setShowImport(true); setImportParsed([]); }}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${c.outline}`}>
        <Upload className="w-4 h-4" /> Import
      </button>
      <button onClick={() => { setShowAI(true); setAiPreview([]); }}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${c.btn}`}>
        <Sparkles className="w-4 h-4" /> AI Generate
      </button>

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Import Questions</h3>
                <p className="text-xs text-gray-500 mt-0.5">Paste questions in the format shown, separated by blank lines</p>
              </div>
              <button onClick={() => setShowImport(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 font-mono leading-relaxed whitespace-pre">
                <p className="font-semibold text-gray-500 mb-2 font-sans not-italic">Expected format (blank line between questions):</p>
{`1. What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B

2. Capital of Nigeria?
A. Lagos
B. Kano
C. Abuja
D. Ibadan
Answer: C`}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Default Marks per Question</label>
                <input type="number" min={1} value={importMarks} onChange={e => setImportMarks(e.target.value)}
                  className={`w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${c.ring}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paste Questions *</label>
                <textarea rows={12} value={importText} onChange={e => setImportText(e.target.value)}
                  placeholder="Paste your questions here..."
                  className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${c.ring} font-mono resize-none`} />
              </div>
              <button onClick={handlePreview}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${c.outline}`}>
                Preview ({importText.trim().split(/\n\s*\n/).filter(b => b.trim()).length} blocks detected)
              </button>

              {importParsed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">
                    Preview: {importParsed.filter(q => q._valid).length} valid / {importParsed.length} total
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {importParsed.map((q, i) => (
                      <div key={i} className={`rounded-lg border p-3 text-sm ${q._valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-start gap-2">
                          {q._valid
                            ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{i + 1}. {q.question_text || '(no question text)'}</p>
                            {q._valid
                              ? <p className="text-xs text-gray-500 mt-0.5">Ans: {q.correct_option.toUpperCase()} · {q.marks} mark{q.marks !== 1 ? 's' : ''}</p>
                              : <p className="text-xs text-red-600 mt-0.5">{q._error}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowImport(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={submitImport} disabled={importing || importParsed.filter(q => q._valid).length === 0}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${c.btn}`}>
                {importing ? 'Importing...' : `Import ${importParsed.filter(q => q._valid).length} Question${importParsed.filter(q => q._valid).length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Generate Modal ─────────────────────────────────────────────── */}
      {showAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAI(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" /> AI MCQ Generator
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Paste lesson content and AI will generate multiple-choice questions</p>
              </div>
              <button onClick={() => setShowAI(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Number of Questions</label>
                  <select value={aiCount} onChange={e => setAiCount(e.target.value)}
                    className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${c.ring}`}>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marks per Question</label>
                  <input type="number" min={1} value={aiMarks} onChange={e => setAiMarks(e.target.value)}
                    className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${c.ring}`} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lesson Content *</label>
                <textarea rows={10} value={aiContent} onChange={e => setAiContent(e.target.value)}
                  placeholder="Paste your lesson notes, textbook content, or any material you want questions generated from..."
                  className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${c.ring} resize-none`} />
                <p className="text-xs text-gray-400 mt-1">First 6,000 characters will be used · Powered by Claude AI</p>
              </div>
              <button onClick={generateAI} disabled={aiGenerating || !aiContent.trim()}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 ${c.btn}`}>
                {aiGenerating
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
                  : <><Sparkles className="w-4 h-4" />Generate {aiCount} Questions</>}
              </button>

              {aiPreview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">{aiPreview.length} questions generated — review before saving:</p>
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {aiPreview.map((q, i) => (
                      <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="font-medium text-gray-800 text-sm mb-2">{i + 1}. {q.question_text}</p>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {(['a', 'b', 'c', 'd'] as const).map(opt => (
                            <div key={opt} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${q.correct_option === opt ? 'bg-green-100 text-green-800 font-semibold' : 'bg-white text-gray-600'}`}>
                              {q.correct_option === opt
                                ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                : <Circle className="w-3 h-3 flex-shrink-0 text-gray-400" />}
                              <span className="uppercase font-semibold mr-0.5">{opt}.</span>
                              {q[`option_${opt}` as keyof ParsedQuestion] as string}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowAI(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              {aiPreview.length > 0 && (
                <button onClick={saveAIQuestions} disabled={aiSaving}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${c.btn}`}>
                  {aiSaving ? 'Saving...' : `Save ${aiPreview.length} Questions`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
