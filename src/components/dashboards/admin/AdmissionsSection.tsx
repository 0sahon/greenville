
import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Search, Eye, X, Printer, CheckCircle, Clock,
  XCircle, UserCheck, ChevronDown, AlertTriangle, Trash2,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow } from '../../../lib/supabase';
import {
  DATE_LOCALE,
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_EMAIL_ADMISSIONS,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_REFERENCE_PREFIX,
} from '../../../config/schoolBrand';

interface Props { profile: ProfileRow; }

interface Application {
  id: string;
  parent_name: string;
  email: string;
  phone: string;
  address: string;
  child_name: string;
  child_age: string | null;
  date_of_birth: string | null;
  gender: string | null;
  program: string;
  previous_school: string | null;
  medical_conditions: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending:  { label: 'Pending Review', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  reviewed: { label: 'Under Review',   color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Eye },
  approved: { label: 'Approved',       color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
  rejected: { label: 'Rejected',       color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
  enrolled: { label: 'Enrolled',       color: 'text-purple-700', bg: 'bg-purple-100', icon: UserCheck },
};

const PROGRAM_LABELS: Record<string, string> = {
  toddler:   'Toddler Adventures (18 months – 3 years)',
  primary:   'Primary Explorers (3 – 6 years)',
  elementary: 'Elementary Scholars (6 – 12 years)',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(DATE_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg} <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

function printApplication(app: Application) {
  const progLabel = PROGRAM_LABELS[app.program] || app.program;
  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>Admission Application — ${app.child_name}</title>
<style>
  @page { size: A4 portrait; margin: 20mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
  .header { text-align: center; border-bottom: 3px solid #1a237e; padding-bottom: 12px; margin-bottom: 16px; }
  .school-name { font-size: 18pt; font-weight: bold; color: #1a237e; }
  .school-addr { font-size: 9pt; color: #c62828; font-weight: bold; margin-top: 3px; }
  .doc-title { font-size: 14pt; font-weight: bold; text-align: center; text-decoration: underline; margin: 10px 0 16px; }
  .ref-box { text-align: right; font-size: 9pt; color: #555; margin-bottom: 10px; }
  .section { margin-bottom: 14px; }
  .section-title { background: #1a237e; color: #fff; font-weight: bold; padding: 4px 8px; font-size: 10pt; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { border: 1px solid #ccc; padding: 5px 8px; font-size: 10pt; vertical-align: top; }
  .label { background: #f0f0f0; font-weight: bold; width: 35%; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 9pt; }
  .sig-area { margin-top: 24px; display: flex; justify-content: space-between; }
  .sig-box { text-align: center; width: 44%; }
  .sig-line { border-top: 1px solid #000; margin-top: 32px; padding-top: 3px; font-size: 9pt; }
  .footer { text-align: center; font-size: 8pt; color: #888; margin-top: 16px; font-style: italic; }
</style>
</head><body>
<div class="header">
  <div class="school-name">${SCHOOL_NAME.toUpperCase()}</div>
  <div class="school-addr">${SCHOOL_ADDRESS_SINGLE.toUpperCase()}.</div>
  <div class="school-addr">TEL: ${SCHOOL_PHONE_DISPLAY} | EMAIL: ${SCHOOL_EMAIL_ADMISSIONS}</div>
</div>
<div class="doc-title">ADMISSION APPLICATION FORM</div>
<div class="ref-box">
  Ref: ${SCHOOL_REFERENCE_PREFIX}-${app.id.substring(0, 8).toUpperCase()} &nbsp;&nbsp; Date Submitted: ${fmtDate(app.created_at)}
  &nbsp;&nbsp; Status: <span class="status-badge" style="background:${app.status === 'approved' ? '#dcfce7' : app.status === 'rejected' ? '#fee2e2' : '#fef9c3'};color:${app.status === 'approved' ? '#166534' : app.status === 'rejected' ? '#991b1b' : '#854d0e'}">${(STATUS_CONFIG[app.status]?.label || app.status).toUpperCase()}</span>
</div>

<div class="section">
  <div class="section-title">SECTION A — PARENT / GUARDIAN INFORMATION</div>
  <table>
    <tr><td class="label">Parent/Guardian Name</td><td>${app.parent_name}</td><td class="label">Email Address</td><td>${app.email}</td></tr>
    <tr><td class="label">Phone Number</td><td>${app.phone}</td><td class="label">Home Address</td><td>${app.address}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">SECTION B — CHILD'S INFORMATION</div>
  <table>
    <tr><td class="label">Child's Full Name</td><td>${app.child_name}</td><td class="label">Age</td><td>${app.child_age || '—'}</td></tr>
    <tr><td class="label">Date of Birth</td><td>${fmtDate(app.date_of_birth)}</td><td class="label">Gender</td><td>${app.gender ? app.gender.charAt(0).toUpperCase() + app.gender.slice(1) : '—'}</td></tr>
    <tr><td class="label">Programme Applied</td><td colspan="3">${progLabel}</td></tr>
    <tr><td class="label">Previous School</td><td>${app.previous_school || 'None'}</td><td class="label">Medical Conditions</td><td>${app.medical_conditions || 'None'}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">SECTION C — EMERGENCY CONTACT</div>
  <table>
    <tr><td class="label">Contact Name</td><td>${app.emergency_contact || '—'}</td><td class="label">Contact Phone</td><td>${app.emergency_phone || '—'}</td></tr>
  </table>
</div>

${app.message ? `<div class="section">
  <div class="section-title">SECTION D — ADDITIONAL INFORMATION</div>
  <table><tr><td style="padding:8px">${app.message}</td></tr></table>
</div>` : ''}

${app.admin_notes ? `<div class="section">
  <div class="section-title">ADMIN NOTES</div>
  <table><tr><td style="padding:8px;background:#fffbeb">${app.admin_notes}</td></tr></table>
</div>` : ''}

<div class="sig-area">
  <div class="sig-box"><div class="sig-line">Parent/Guardian Signature &amp; Date</div></div>
  <div class="sig-box"><div class="sig-line">Admissions Officer &amp; Date</div></div>
</div>
<div class="footer">
  ${SCHOOL_NAME} — Official Admission Application — Generated ${new Date().toLocaleDateString(DATE_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}
</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export default function AdmissionsSection({ profile }: Props) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Detail modal
  const [active, setActive] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admission_applications')
      .select('*')
      .order('created_at', { ascending: false });
    setApplications((data || []) as Application[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openApp = (app: Application) => {
    setActive(app);
    setNotes(app.admin_notes || '');
    setNewStatus(app.status);
    setDeleteConfirm(false);
  };

  const saveChanges = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admission_applications')
        .update({
          status: newStatus,
          admin_notes: notes,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', active.id);
      if (error) throw error;
      setToast({ msg: 'Application updated', type: 'success' });
      setApplications(prev => prev.map(a => a.id === active.id ? { ...a, status: newStatus, admin_notes: notes } : a));
      setActive(prev => prev ? { ...prev, status: newStatus, admin_notes: notes } : null);
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Update failed', type: 'error' });
    }
    setSaving(false);
  };

  const deleteApp = async () => {
    if (!active) return;
    try {
      const { error } = await supabase.from('admission_applications').delete().eq('id', active.id);
      if (error) throw error;
      setToast({ msg: 'Application deleted', type: 'success' });
      setApplications(prev => prev.filter(a => a.id !== active.id));
      setActive(null);
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    }
  };

  const filtered = applications.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.child_name.toLowerCase().includes(q) || a.parent_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    const matchStatus = !filterStatus || a.status === filterStatus;
    const matchProgram = !filterProgram || a.program === filterProgram;
    return matchSearch && matchStatus && matchProgram;
  });

  const stats = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key, ...cfg, count: applications.filter(a => a.status === key).length,
  }));

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Admissions Management</h2>
        <p className="text-xs text-gray-500 mt-0.5">Review, process and manage all school admission applications</p>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? '' : s.key)}
              className={`rounded-xl border p-3 text-center transition-all shadow-sm hover:shadow-md ${filterStatus === s.key ? 'ring-2 ring-indigo-500' : ''} ${s.bg} border-transparent`}>
              <Icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
              <div className={`text-xs font-medium ${s.color} opacity-80`}>{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="relative min-w-36">
          <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Programmes</option>
            {Object.entries(PROGRAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v.split('(')[0].trim()}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Applications table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{applications.length === 0 ? 'No applications yet' : 'No applications match your filters'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Child</th>
                <th className="py-3 px-4">Parent</th>
                <th className="py-3 px-4">Programme</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => {
                const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openApp(app)}>
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{fmtDate(app.created_at)}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{app.child_name}</p>
                      <p className="text-xs text-gray-400">{app.gender ? app.gender.charAt(0).toUpperCase() + app.gender.slice(1) : ''}{app.child_age ? ` · ${app.child_age}` : ''}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-700">{app.parent_name}</p>
                      <p className="text-xs text-gray-400">{app.phone}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600">{PROGRAM_LABELS[app.program]?.split('(')[0].trim() || app.program}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button onClick={() => openApp(app)} className="px-2.5 py-1.5 bg-indigo-700 text-white rounded-lg text-xs font-medium hover:bg-indigo-800 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Review
                        </button>
                        <button onClick={() => { openApp(app); setTimeout(() => printApplication(app), 100); }}
                          className="px-2.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-bold text-gray-900">Application — {active.child_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Ref: {SCHOOL_REFERENCE_PREFIX}-{active.id.substring(0, 8).toUpperCase()} · Submitted {fmtDate(active.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => printApplication(active)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium hover:bg-gray-900">
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button onClick={() => { setActive(null); setDeleteConfirm(false); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">

              {/* Application data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Parent info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Parent / Guardian</h4>
                  {[
                    ['Full Name', active.parent_name],
                    ['Email', active.email],
                    ['Phone', active.phone],
                    ['Address', active.address],
                  ].map(([l, v]) => (
                    <div key={l} className="flex gap-2">
                      <span className="text-xs font-semibold text-gray-500 w-20 flex-shrink-0 pt-0.5">{l}:</span>
                      <span className="text-sm text-gray-800 break-words">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Child info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Child's Details</h4>
                  {[
                    ['Name', active.child_name],
                    ['Age', active.child_age || '—'],
                    ['DOB', fmtDate(active.date_of_birth)],
                    ['Gender', active.gender ? active.gender.charAt(0).toUpperCase() + active.gender.slice(1) : '—'],
                    ['Programme', PROGRAM_LABELS[active.program]?.split('(')[0].trim() || active.program],
                    ['Prev. School', active.previous_school || 'None'],
                    ['Medical', active.medical_conditions || 'None'],
                  ].map(([l, v]) => (
                    <div key={l} className="flex gap-2">
                      <span className="text-xs font-semibold text-gray-500 w-20 flex-shrink-0 pt-0.5">{l}:</span>
                      <span className="text-sm text-gray-800 break-words">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency contact */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Emergency Contact</h4>
                <p className="text-sm font-medium text-gray-800">{active.emergency_contact || '—'}</p>
                <p className="text-sm text-gray-600">{active.emergency_phone || '—'}</p>
              </div>

              {/* Message */}
              {active.message && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Additional Information</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{active.message}</p>
                </div>
              )}

              {/* Admin controls */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <h4 className="font-semibold text-gray-800 text-sm">Admin Actions</h4>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Application Status</label>
                  <div className="relative w-fit">
                    <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                      className="border border-gray-200 rounded-lg px-4 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8">
                      {Object.entries(STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Admin notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Admin Notes</label>
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Interview scheduled for…, Awaiting documents…, etc."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <button onClick={saveChanges} disabled={saving}
                    className="flex-1 min-w-[120px] py-2.5 bg-indigo-700 text-white rounded-xl text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  {!deleteConfirm && (
                    <button onClick={() => setDeleteConfirm(true)}
                      className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                  {deleteConfirm && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm w-full">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-red-700 flex-1">Delete this application permanently?</span>
                      <button onClick={deleteApp} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Yes, delete</button>
                      <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1 border border-gray-200 rounded-lg text-xs hover:bg-white">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
