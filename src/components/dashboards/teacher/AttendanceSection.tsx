import { useState, useEffect } from 'react';
import { ClipboardCheck, AlertCircle, Sparkles, RefreshCw, Smile, Compass, Gift } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, ClassRow, AttendanceStatus } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface StudentWithProfile {
  id: string; student_id: string;
  profiles?: { first_name: string; last_name: string } | null;
}

export default function AttendanceSection({ profile }: Props) {
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name' | 'level'>[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Daily Morning Circle Energizer States
  const [energizer, setEnergizer] = useState<string | null>(null);
  const [energizerImg, setEnergizerImg] = useState<string | null>(null);
  const [energizerLoading, setEnergizerLoading] = useState(false);

  const generateMorningEnergizer = async () => {
    setEnergizerLoading(true);
    try {
      const themes = [
        "Jungle Safari Animals", "Outerspace Astronauts", "Deep Blue Ocean Explorers",
        "Ancient Dinosaurs", "Magical Forest Fairies & Elves", "Flying Superheroes",
        "Busy Builders & Robots", "Friendly Farm Animals", "Olympic Gymnasts"
      ];
      const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
      
      const prompt = `You are a creative Montessori Kindergarten & Basic School teacher. Generate a fun, active daily morning circle warm-up activity for children (aged 5-10) based on the theme: "${selectedTheme}".
Respond with:
Theme: [Fun Theme Name]
Greeting: [Wave or handshake action]
Movement Energizer: [A simple, fun, physical movement riddle or counting action to perform together]

Keep it extremely brief, simple, exciting, and child-friendly!`;

      const textRes = await fetch('https://text.pollinations.ai/' + encodeURIComponent(prompt));
      if (!textRes.ok) throw new Error('AI text retrieval failed');
      const text = await textRes.text();
      setEnergizer(text.trim());

      // Fetch matching visual graphic
      const seed = Math.floor(Math.random() * 1000000);
      const visualPrompt = `Montessori friendly cartoon illustration for theme ${selectedTheme}, simple bright colors, vector art for kids, no text`;
      const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=400&height=400&nologo=true&seed=${seed}`;
      setEnergizerImg(imgUrl);
    } catch (e) {
      console.error(e);
      // Fallback
      setEnergizer(`Theme: 🦁 Friendly Lions!\nGreeting: Wave with your lion paws and say "Roar-llo!"\nMovement Energizer: Stand on one foot like a lion balancing on a rock for 5 seconds!`);
      setEnergizerImg(`https://image.pollinations.ai/prompt/cute%20cartoon%20lion%20waving%20vector?width=400&height=400&nologo=true`);
    } finally {
      setEnergizerLoading(false);
    }
  };

  useEffect(() => {
    supabase.from('classes').select('id,name,level').eq('teacher_id', profile.id)
      .then(({ data }) => setClasses((data || []) as Pick<ClassRow, 'id' | 'name' | 'level'>[]));
  }, [profile.id]);

  useEffect(() => {
    if (!selectedClass) return;
    setStatuses({});
    setStudents([]);
    
    // Auto-trigger daily morning energizer on class selection
    generateMorningEnergizer();

    (async () => {
      const { data: studs } = await supabase.from('students').select('id, student_id, profiles:profile_id(first_name,last_name)').eq('class_id', selectedClass).eq('is_active', true);
      const studList = (studs || []) as StudentWithProfile[];
      setStudents(studList);
      const ids = studList.map(s => s.id);
      if (ids.length > 0) {
        const { data: att } = await supabase.from('attendance').select('student_id,status').eq('date', date).in('student_id', ids);
        const map: Record<string, AttendanceStatus> = {};
        (att || []).forEach((a: { student_id: string; status: AttendanceStatus }) => { map[a.student_id] = a.status; });
        ids.forEach((id: string) => { if (!map[id]) map[id] = 'present'; });
        setStatuses(map);
      }
      setSaved(false);
    })();
  }, [selectedClass, date]);

  const save = async () => {
    setSaving(true);
    setSaveError('');
    const records = students.map(s => ({ student_id: s.id, date, status: (statuses[s.id] || 'present') as AttendanceStatus, marked_by: profile.id }));
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const statusColors: Record<string, string> = { present: 'bg-green-500', absent: 'bg-red-500', late: 'bg-yellow-500', excused: 'bg-blue-500' };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Mark Attendance</h2>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {students.length > 0 && (
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Attendance'}
          </button>
        )}
      </div>

      {/* ── Daily Morning Circle Warmup Card ── */}
      {selectedClass && (
        <div className="relative overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/60 via-purple-50/40 to-indigo-50/50 p-5 shadow-sm">
          {/* Subtle animated floating bubble decorations */}
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-pink-300/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-purple-300/10 blur-xl pointer-events-none" />

          <div className="flex flex-col md:flex-row gap-5 items-center justify-between relative z-10">
            {/* Energizer content area */}
            <div className="flex-1 space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-pink-100 text-pink-600 rounded-lg">
                  <Smile className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                    ☀️ Daily Morning Circle Warmup!
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">Use these fun movements during roll call to energize the kids!</p>
                </div>
              </div>

              {energizerLoading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-pink-500 animate-spin" />
                  <p className="text-xs font-bold text-pink-500 animate-pulse">Consulting the morning circle wizard...</p>
                </div>
              ) : energizer ? (
                <div className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white/75 backdrop-blur-sm p-4 rounded-xl border border-slate-100/50 shadow-inner">
                  {energizer.split('\n').map((line, lIdx) => {
                    if (line.toLowerCase().startsWith('theme:')) {
                      return (
                        <p key={lIdx} className="text-sm font-black text-pink-600 flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-pink-500 shrink-0" />
                          <span>{line}</span>
                        </p>
                      );
                    }
                    if (line.toLowerCase().startsWith('greeting:')) {
                      return (
                        <p key={lIdx} className="flex items-start gap-2">
                          <span className="text-purple-500 shrink-0 text-sm">👋</span>
                          <span className="leading-relaxed">{line}</span>
                        </p>
                      );
                    }
                    if (line.toLowerCase().startsWith('movement') || line.toLowerCase().startsWith('riddle')) {
                      return (
                        <p key={lIdx} className="flex items-start gap-2 border-t border-slate-100 pt-2 mt-2">
                          <span className="text-indigo-500 shrink-0 text-sm">🦁</span>
                          <span className="leading-relaxed font-bold bg-indigo-50/50 px-2 py-1 rounded-lg text-indigo-950">{line}</span>
                        </p>
                      );
                    }
                    return (
                      <p key={lIdx} className="pl-6 text-[11px] text-slate-500 font-medium leading-relaxed">
                        {line}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Select a class to generate morning magic.</p>
              )}
            </div>

            {/* Illustrative image */}
            {selectedClass && !energizerLoading && energizerImg && (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white shrink-0 relative group">
                <img
                  src={energizerImg}
                  alt="Daily circle illustration"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={generateMorningEnergizer}
                  disabled={energizerLoading}
                  className="absolute bottom-1 right-1 p-1 bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-md transition-all active:scale-90"
                  title="Generate a new warmup theme!"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <AlertCircle size={15} className="flex-shrink-0" /> {saveError}
        </div>
      )}
      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-medium text-gray-800">{students.length} students</span>
            <div className="flex gap-2 text-xs">
              {['present','absent','late','excused'].map(s => (
                <button key={s} onClick={() => { const all: Record<string, string> = {}; students.forEach(st => { all[st.id] = s; }); setStatuses(all as Record<string, AttendanceStatus>); }}
                  className={`px-2 py-1 rounded-full text-white ${statusColors[s]} opacity-80 hover:opacity-100`}>All {s}</button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {students.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">{s.profiles?.first_name?.[0]}</div>
                  <div><p className="font-medium text-gray-800 text-sm">{s.profiles?.first_name} {s.profiles?.last_name}</p><p className="text-xs text-gray-400 font-mono">{s.student_id}</p></div>
                </div>
                <div className="flex gap-1">
                  {['present','absent','late','excused'].map(status => (
                    <button key={status} onClick={() => setStatuses(prev => ({ ...prev, [s.id]: status as AttendanceStatus }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${statuses[s.id] === status ? `${statusColors[status]} text-white shadow-sm` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!selectedClass && <div className="text-center py-16 text-gray-400"><ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Select a class to mark attendance</p></div>}
    </div>
  );
}
