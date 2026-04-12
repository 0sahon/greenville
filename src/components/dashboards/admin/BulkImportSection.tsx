import { useState, useRef } from 'react';
import { Upload, Download, X, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, ClassRow } from '../../../lib/supabase';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

interface ImportRow {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  gender?: string;
  date_of_birth?: string;
  class_name?: string;
  phone?: string;
  address?: string;
}

interface ImportResult {
  row: number;
  name: string;
  status: 'success' | 'error';
  message: string;
}

const STUDENT_TEMPLATE = 'first_name,last_name,email,password,gender,date_of_birth,class_name,phone,address\nAde,Okon,ade.okon@example.com,Pass1234!,male,2015-03-12,Basic 3 A,08012345678,12 Lagos St\n';
const TEACHER_TEMPLATE = 'first_name,last_name,email,password,phone,qualification,specialization\nBola,Adeyemi,bola@example.com,Pass1234!,08098765432,B.Ed,Mathematics\n';

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const values: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    values.push(cur.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row as unknown as ImportRow;
  });
}

export default function BulkImportSection({ profile }: Props) {
  const [importType, setImportType] = useState<'students' | 'teachers'>('students');
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<ImportRow[]>([]);
  const [classes, setClasses] = useState<Pick<ClassRow, 'id' | 'name'>[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadClasses = async () => {
    if (classes.length > 0) return;
    const { data } = await supabase.from('classes').select('id, name').order('name');
    setClasses((data || []) as Pick<ClassRow, 'id' | 'name'>[]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const rows = parseCSV(text);
      setParsed(rows);
      setResults([]);
      setDone(false);
      if (importType === 'students') loadClasses();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTextChange = (text: string) => {
    setCsvText(text);
    const rows = parseCSV(text);
    setParsed(rows);
    setResults([]);
    setDone(false);
    if (rows.length > 0 && importType === 'students') loadClasses();
  };

  const downloadTemplate = () => {
    const content = importType === 'students' ? STUDENT_TEMPLATE : TEACHER_TEMPLATE;
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
    a.download = `${importType}_import_template.csv`;
    a.click();
  };

  const runImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    setDone(false);
    const res: ImportResult[] = [];
    const classMap = Object.fromEntries(classes.map(c => [c.name.toLowerCase().trim(), c.id]));

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      const name = `${row.first_name} ${row.last_name}`.trim();
      try {
        if (!row.first_name || !row.last_name || !row.email || !row.password) {
          res.push({ row: i + 2, name: name || `Row ${i + 2}`, status: 'error', message: 'Missing required fields (first_name, last_name, email, password)' });
          continue;
        }

        // Create auth user
        const { data: userId, error: rpcErr } = await supabase.rpc('admin_create_user', {
          user_email: row.email.trim().toLowerCase(),
          user_password: row.password,
          user_first_name: row.first_name.trim(),
          user_last_name: row.last_name.trim(),
        });
        if (rpcErr) { res.push({ row: i + 2, name, status: 'error', message: rpcErr.message }); continue; }

        // Get or wait for profile trigger
        await new Promise(r => setTimeout(r, 600));
        const { data: profileData } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
        if (!profileData) { res.push({ row: i + 2, name, status: 'error', message: 'Profile not created' }); continue; }

        // Update profile role + phone
        await supabase.from('profiles').update({ role: importType === 'students' ? 'student' : 'teacher', phone: row.phone || null }).eq('id', profileData.id);

        if (importType === 'students') {
          const classId = row.class_name ? classMap[row.class_name.toLowerCase().trim()] ?? null : null;
          const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
          const studentId = `STU${String((count ?? 0) + 1).padStart(4, '0')}`;
          await supabase.from('students').insert({
            profile_id: profileData.id,
            student_id: studentId,
            class_id: classId,
            gender: (row.gender?.toLowerCase() === 'male' || row.gender?.toLowerCase() === 'female') ? row.gender.toLowerCase() as 'male' | 'female' : null,
            date_of_birth: row.date_of_birth || null,
            address: row.address || null,
          });
        } else {
          const { count } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
          const employeeId = `TCH${String((count ?? 0) + 1).padStart(4, '0')}`;
          await supabase.from('teachers').insert({
            profile_id: profileData.id,
            employee_id: employeeId,
            qualification: (row as unknown as Record<string, string>).qualification || null,
            specialization: (row as unknown as Record<string, string>).specialization || null,
          });
        }
        res.push({ row: i + 2, name, status: 'success', message: 'Imported successfully' });
      } catch (e) {
        res.push({ row: i + 2, name, status: 'error', message: e instanceof Error ? e.message : 'Unknown error' });
      }
    }
    setResults(res);
    setDone(true);
    setImporting(false);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Upload className="w-6 h-6 text-indigo-500" /> Bulk Import
      </h2>

      {/* Type selector */}
      <div className="flex gap-3">
        {(['students', 'teachers'] as const).map(t => (
          <button key={t} onClick={() => { setImportType(t); setCsvText(''); setParsed([]); setResults([]); setDone(false); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${importType === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            Import {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Template download + instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 mb-1">CSV Format</p>
          <p className="text-xs text-blue-600 mb-2">
            {importType === 'students'
              ? 'Required columns: first_name, last_name, email, password. Optional: gender, date_of_birth (YYYY-MM-DD), class_name, phone, address.'
              : 'Required columns: first_name, last_name, email, password. Optional: phone, qualification, specialization.'}
          </p>
          <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
            <Download className="w-3.5 h-3.5" /> Download Template
          </button>
        </div>
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Click to upload a CSV file</p>
          <p className="text-xs text-gray-400 mt-1">or paste CSV text below</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Or paste CSV content</label>
          <textarea
            value={csvText}
            onChange={e => handleTextChange(e.target.value)}
            rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            placeholder={importType === 'students' ? STUDENT_TEMPLATE : TEACHER_TEMPLATE}
          />
        </div>

        {parsed.length > 0 && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-700"><strong>{parsed.length}</strong> row{parsed.length !== 1 ? 's' : ''} ready to import</p>
            <button onClick={() => { setCsvText(''); setParsed([]); setResults([]); setDone(false); }}
              className="p-1 hover:bg-gray-200 rounded"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
        )}

        <button
          onClick={runImport}
          disabled={importing || parsed.length === 0}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {importing ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing {results.length + 1}/{parsed.length}...</>
          ) : (
            <><Upload className="w-4 h-4" /> Import {parsed.length > 0 ? `${parsed.length} ${importType}` : importType}</>
          )}
        </button>
      </div>

      {/* Results */}
      {done && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{successCount}</p>
              <p className="text-xs text-green-600">Imported</p>
            </div>
            <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-600">{errorCount}</p>
              <p className="text-xs text-red-500">Failed</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase text-left">
                  <th className="py-2 px-4">Row</th>
                  <th className="py-2 px-4">Name</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 px-4 text-gray-400">{r.row}</td>
                    <td className="py-2 px-4 font-medium text-gray-700">{r.name}</td>
                    <td className="py-2 px-4">
                      <span className={`flex items-center gap-1 text-xs font-medium ${r.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                        {r.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-gray-500 text-xs">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
