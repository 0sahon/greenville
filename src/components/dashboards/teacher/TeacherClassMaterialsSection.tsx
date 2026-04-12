import { useState, useEffect, useCallback, useRef } from 'react';
import { Paperclip, Plus, X, Edit2, Trash2, ExternalLink, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { appStorageFrom, COURSE_MATERIALS_BUCKET } from '../../../lib/storageBuckets';
import {
  classMaterialObjectPath,
  createClassMaterialSignedUrl,
  removeClassMaterialObject,
} from '../../../lib/classMaterialStorage';
import type { ProfileRow, CourseMaterialRow, CourseMaterialInsert } from '../../../lib/supabase';

interface CoursePick {
  id: string;
  title: string;
  subject: string;
}

interface Props {
  profile: ProfileRow;
  courses: CoursePick[];
  onToast: (msg: string, type: 'success' | 'error') => void;
}

const MATERIAL_TYPES = ['document', 'video', 'link', 'image'] as const;
type MaterialType = (typeof MATERIAL_TYPES)[number];
const ICON: Record<MaterialType, string> = {
  document: '📄', video: '🎬', link: '🔗', image: '🖼️',
};

interface MaterialRow extends CourseMaterialRow {
  courses?: { title: string; subject: string } | null;
}

const emptyForm = { course_id: '', title: '', type: 'link' as MaterialType, url: '', description: '' };

export default function TeacherClassMaterialsSection({ profile, courses, onToast }: Props) {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState<MaterialRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaterialRow | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removeStoredFile, setRemoveStoredFile] = useState(false);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const courseIds = courses.map(c => c.id);

  const load = useCallback(async () => {
    if (courseIds.length === 0) {
      setMaterials([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('course_materials')
      .select('*, courses:course_id(title, subject)')
      .in('course_id', courseIds)
      .order('created_at', { ascending: false });
    if (error) onToast(error.message, 'error');
    setMaterials((data || []) as MaterialRow[]);
    setLoading(false);
  }, [courseIds.join(',')]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const openAdd = () => {
    setEdit(null);
    setPendingFile(null);
    setRemoveStoredFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setForm({
      ...emptyForm,
      course_id: courses[0]?.id ?? '',
    });
    setShowModal(true);
  };

  const openEdit = (m: MaterialRow) => {
    setEdit(m);
    setPendingFile(null);
    setRemoveStoredFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setForm({
      course_id: m.course_id || '',
      title: m.title,
      type: (MATERIAL_TYPES.includes(m.type as MaterialType) ? m.type : 'link') as MaterialType,
      url: m.url || '',
      description: m.description || '',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.course_id || !form.title.trim()) {
      onToast('Pick a topic (course) and enter a title', 'error');
      return;
    }
    const urlTrim = form.url.trim() || null;
    const keptFile = !!(edit?.file_storage_path && !removeStoredFile);
    if (!urlTrim && !pendingFile && !keptFile) {
      onToast('Add a link (URL) or upload a file', 'error');
      return;
    }
    setSaving(true);
    let newUploadPath: string | null = null;
    const previousStoredPath = edit?.file_storage_path ?? null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUid = session?.user?.id;
      if (!authUid) throw new Error('Not signed in');

      let filePath: string | null = edit?.file_storage_path ?? null;
      if (removeStoredFile && !pendingFile) filePath = null;

      if (pendingFile) {
        const objectId = crypto.randomUUID();
        const path = classMaterialObjectPath(authUid, form.course_id, objectId);
        const { error: upErr } = await appStorageFrom(supabase, COURSE_MATERIALS_BUCKET).upload(path, pendingFile, {
          contentType: pendingFile.type || undefined,
          upsert: false,
        });
        if (upErr) throw upErr;
        newUploadPath = path;
        filePath = path;
      }

      if (edit) {
        const { error } = await supabase
          .from('course_materials')
          .update({
            title: form.title.trim(),
            type: form.type,
            url: urlTrim,
            file_storage_path: filePath,
            description: form.description.trim() || null,
          })
          .eq('id', edit.id);
        if (error) throw error;
        if (pendingFile && previousStoredPath && previousStoredPath !== newUploadPath) {
          await removeClassMaterialObject(supabase, previousStoredPath);
        }
        if (removeStoredFile && previousStoredPath && !pendingFile) {
          await removeClassMaterialObject(supabase, previousStoredPath);
        }
        onToast('Material updated', 'success');
      } else {
        const payload: CourseMaterialInsert = {
          course_id: form.course_id,
          title: form.title.trim(),
          type: form.type,
          url: urlTrim,
          file_storage_path: filePath,
          description: form.description.trim() || null,
          uploaded_by: profile.id,
        };
        const { error } = await supabase.from('course_materials').insert(payload);
        if (error) throw error;
        onToast('Material added — students in this class can open it from Learning resources', 'success');
      }
      setShowModal(false);
      setPendingFile(null);
      setRemoveStoredFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      void load();
    } catch (e: unknown) {
      if (newUploadPath) await removeClassMaterialObject(supabase, newUploadPath);
      onToast(e instanceof Error ? e.message : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.file_storage_path) {
        await removeClassMaterialObject(supabase, deleteTarget.file_storage_path);
      }
      const { error } = await supabase.from('course_materials').delete().eq('id', deleteTarget.id);
      if (error) onToast(error.message, 'error');
      else {
        onToast('Material removed', 'success');
        setDeleteTarget(null);
        void load();
      }
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const bySubject = materials.reduce<Record<string, MaterialRow[]>>((acc, m) => {
    const s = m.courses?.subject || 'Other';
    if (!acc[s]) acc[s] = [];
    acc[s].push(m);
    return acc;
  }, {});

  if (courses.length === 0) {
    return (
      <div className="text-center py-14 text-gray-500 text-sm border border-dashed border-gray-200 rounded-xl bg-white">
        Add at least one <strong>topic</strong> under Subjects first — materials are linked to a topic so students know which subject they belong to.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Class materials</h3>
          <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
            Add a link, upload a file (PDF, video, etc.), or both — materials stay in-app when uploaded. Students (and linked parents) see them under <strong>Learning resources</strong>, grouped by subject.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"
        >
          <Plus className="w-4 h-4" /> Add material
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-14 text-gray-400 border border-gray-100 rounded-xl bg-white">
          <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium text-gray-600">No materials yet</p>
          <p className="text-xs mt-1">Add links or upload files for your topics.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(bySubject).map(([subject, rows]) => (
            <div key={subject} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-pink-50 border-b border-pink-100">
                <p className="text-sm font-semibold text-pink-900">{subject}</p>
              </div>
              <ul className="divide-y divide-gray-50">
                {rows.map(m => (
                  <li key={m.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{m.title}</p>
                      <p className="text-xs text-gray-500">{m.courses?.title}</p>
                      <span className="inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                        {ICON[(MATERIAL_TYPES.includes(m.type as MaterialType) ? m.type : 'link') as MaterialType]}{' '}{m.type}
                      </span>
                      {m.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.description}</p>}
                      {m.file_storage_path && fileUrls[m.id] && (
                        <a href={fileUrls[m.id]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1 hover:underline">
                          <FileText className="w-3 h-3" /> Open file
                        </a>
                      )}
                      {m.url && (
                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1 hover:underline">
                          <ExternalLink className="w-3 h-3" /> {m.file_storage_path ? 'External link' : 'Open link'}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => openEdit(m)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(m)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{edit ? 'Edit material' : 'Add material'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Topic (course) *</label>
                <select
                  value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Select…</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.subject} — {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Week 3 notes (PDF on Drive)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as MaterialType }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {MATERIAL_TYPES.map(t => (
                    <option key={t} value={t}>{ICON[t]} {t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Upload file (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,image/*"
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-pink-50 file:text-pink-700"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null;
                    setPendingFile(f);
                    if (f) setRemoveStoredFile(false);
                  }}
                />
                {pendingFile && <p className="text-[11px] text-gray-500 mt-1">Selected: {pendingFile.name}</p>}
                {edit?.file_storage_path && !pendingFile && (
                  <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={removeStoredFile} onChange={e => setRemoveStoredFile(e.target.checked)} />
                    Remove uploaded file from storage
                  </label>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL (optional)</label>
                <input
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">Provide a URL, a file, or both.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-50">
                {saving ? 'Saving…' : edit ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-gray-800 mb-2">Delete material?</h4>
            <p className="text-sm text-gray-600 mb-4">&ldquo;{deleteTarget.title}&rdquo;</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="button" onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
