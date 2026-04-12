import { useState, useEffect } from 'react';
import {
  MessageSquare, Send, Inbox, Edit3, X, ChevronLeft, Search,
  Reply, Users, User
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProfileRow, MessageRow } from '../../../lib/supabase';

interface Props {
  profile: ProfileRow;
  /** Which tabs to show. Admin sees all; teachers see inbox+compose; parents see inbox only (can reply) */
  role: 'admin' | 'teacher' | 'parent';
}

interface MessageWithProfiles extends MessageRow {
  sender?: { first_name: string; last_name: string; role: string } | null;
  recipient?: { first_name: string; last_name: string; role: string } | null;
}

interface RecipientOption { id: string; first_name: string; last_name: string; role: string; email: string; }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-indigo-100 text-indigo-700',
  teacher: 'bg-blue-100 text-blue-700',
  parent: 'bg-purple-100 text-purple-700',
  student: 'bg-pink-100 text-pink-700',
};

function Avatar({ name, role }: { name: string; role: string }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${ROLE_COLOR[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function MessagesSection({ profile, role }: Props) {
  const [tab, setTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [inbox, setInbox] = useState<MessageWithProfiles[]>([]);
  const [sent, setSent] = useState<MessageWithProfiles[]>([]);
  const [selected, setSelected] = useState<MessageWithProfiles | null>(null);
  const [thread, setThread] = useState<MessageWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Compose form
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [compForm, setCompForm] = useState({ recipient_id: '', target_role: '', subject: '', body: '' });
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [sending, setSending] = useState(false);

  // Reply
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => { fetchMessages(); }, [tab]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const [inboxRes, sentRes] = await Promise.all([
        supabase.from('messages')
          .select('*, sender:sender_id(first_name, last_name, role), recipient:recipient_id(first_name, last_name, role)')
          .eq('recipient_id', profile.id)
          .is('parent_message_id', null)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('messages')
          .select('*, sender:sender_id(first_name, last_name, role), recipient:recipient_id(first_name, last_name, role)')
          .eq('sender_id', profile.id)
          .is('parent_message_id', null)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      // Also fetch broadcasts for non-admin users
      let broadcastMessages: MessageWithProfiles[] = [];
      if (role !== 'admin') {
        const { data: bcast } = await supabase.from('messages')
          .select('*, sender:sender_id(first_name, last_name, role)')
          .is('recipient_id', null)
          .is('parent_message_id', null)
          .order('created_at', { ascending: false })
          .limit(50);
        broadcastMessages = (bcast || []) as MessageWithProfiles[];
      }
      const inboxData = [...((inboxRes.data || []) as MessageWithProfiles[]), ...broadcastMessages]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setInbox(inboxData);
      setSent((sentRes.data || []) as MessageWithProfiles[]);
      setUnreadCount(inboxData.filter(m => !m.is_read).length);
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (msg: MessageWithProfiles) => {
    setSelected(msg);
    // Mark as read
    if (!msg.is_read && msg.recipient_id === profile.id) {
      await supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
      setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    // Fetch thread (replies)
    const { data } = await supabase.from('messages')
      .select('*, sender:sender_id(first_name, last_name, role), recipient:recipient_id(first_name, last_name, role)')
      .eq('parent_message_id', msg.id)
      .order('created_at');
    setThread((data || []) as MessageWithProfiles[]);
    setReplyBody('');
  };

  const loadRecipients = async () => {
    if (recipients.length > 0) return;
    let q = supabase.from('profiles').select('id, first_name, last_name, role, email').neq('id', profile.id);
    if (role === 'parent') q = q.in('role', ['admin', 'teacher']);
    else if (role === 'teacher') q = q.in('role', ['admin', 'parent']);
    const { data } = await q.order('first_name').limit(200);
    setRecipients((data || []) as RecipientOption[]);
  };

  const openCompose = (replyTo?: MessageWithProfiles) => {
    if (replyTo) {
      // Pre-fill reply: switch to reply UI instead
      setReplyBody('');
      return;
    }
    loadRecipients();
    setCompForm({ recipient_id: '', target_role: '', subject: '', body: '' });
    setBroadcastMode(false);
    setTab('compose');
  };

  const sendMessage = async () => {
    if (!compForm.body.trim()) return setToast({ msg: 'Message body is required', type: 'error' });
    if (!broadcastMode && !compForm.recipient_id) return setToast({ msg: 'Select a recipient', type: 'error' });
    if (broadcastMode && !compForm.target_role) return setToast({ msg: 'Select broadcast audience', type: 'error' });
    setSending(true);
    const payload = {
      sender_id: profile.id,
      recipient_id: broadcastMode ? null : compForm.recipient_id,
      target_role: broadcastMode ? compForm.target_role : null,
      subject: compForm.subject.trim() || '(No subject)',
      body: compForm.body.trim(),
    };
    const { error } = await supabase.from('messages').insert(payload);
    if (error) { setToast({ msg: error.message, type: 'error' }); setSending(false); return; }
    setToast({ msg: 'Message sent', type: 'success' });
    setCompForm({ recipient_id: '', target_role: '', subject: '', body: '' });
    setTab('sent');
    fetchMessages();
    setSending(false);
  };

  const sendReply = async () => {
    if (!replyBody.trim() || !selected) return;
    setReplying(true);
    const recipientId = selected.sender_id === profile.id ? selected.recipient_id : selected.sender_id;
    await supabase.from('messages').insert({
      sender_id: profile.id,
      recipient_id: recipientId,
      subject: `Re: ${selected.subject}`,
      body: replyBody.trim(),
      parent_message_id: selected.id,
    });
    setReplyBody('');
    loadThread(selected);
    fetchMessages();
    setReplying(false);
    setToast({ msg: 'Reply sent', type: 'success' });
  };

  const fmt = (d: string) => {
    const dt = new Date(d);
    const today = new Date();
    if (dt.toDateString() === today.toDateString()) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const replyBtnClass = role === 'admin' ? 'bg-indigo-600 hover:bg-indigo-700' : role === 'teacher' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700';

  // Message detail view
  if (selected) {
    const isOutgoing = selected.sender_id === profile.id;
    const otherName = isOutgoing
      ? (selected.recipient ? `${selected.recipient.first_name} ${selected.recipient.last_name}` : selected.target_role ? `All ${selected.target_role}s` : '—')
      : (selected.sender ? `${selected.sender.first_name} ${selected.sender.last_name}` : '—');
    const otherRole = isOutgoing ? (selected.recipient?.role ?? '') : (selected.sender?.role ?? '');
    return (
      <div className="space-y-4">
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{selected.subject}</h3>
            <p className="text-xs text-gray-500">{isOutgoing ? 'To' : 'From'}: {otherName}</p>
          </div>
          {!isOutgoing && (
            <button onClick={() => setTab('compose')} className={`flex items-center gap-1.5 px-3 py-2 ${replyBtnClass} text-white rounded-lg text-sm font-medium`}
              onClickCapture={() => { loadRecipients(); setCompForm({ recipient_id: selected.sender_id, target_role: '', subject: `Re: ${selected.subject}`, body: '' }); }}>
              <Reply className="w-4 h-4" /> Reply
            </button>
          )}
        </div>

        {/* Original message */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={isOutgoing ? profile.first_name : (selected.sender?.first_name ?? '?')} role={isOutgoing ? profile.role : (selected.sender?.role ?? '')} />
            <div>
              <p className="font-medium text-gray-800">{isOutgoing ? `${profile.first_name} ${profile.last_name}` : otherName}</p>
              <p className="text-xs text-gray-400">{new Date(selected.created_at).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.body}</p>
        </div>

        {/* Thread replies */}
        {thread.map(r => {
          const isMine = r.sender_id === profile.id;
          return (
            <div key={r.id} className={`rounded-xl border shadow-sm p-4 ${isMine ? 'bg-indigo-50 border-indigo-100 ml-8' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={isMine ? profile.first_name : (r.sender?.first_name ?? '?')} role={isMine ? profile.role : (r.sender?.role ?? '')} />
                <div>
                  <p className="font-medium text-sm text-gray-800">{isMine ? 'You' : `${r.sender?.first_name} ${r.sender?.last_name}`}</p>
                  <p className="text-xs text-gray-400">{fmt(r.created_at)}</p>
                </div>
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{r.body}</p>
            </div>
          );
        })}

        {/* Reply box */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <textarea
            rows={3}
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex justify-end">
            <button onClick={sendReply} disabled={replying || !replyBody.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              <Send className="w-4 h-4" />{replying ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compose view
  if (tab === 'compose') {
    return (
      <div className="space-y-4">
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        <div className="flex items-center gap-3">
          <button onClick={() => setTab('inbox')} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
          <h3 className="font-bold text-gray-900">New Message</h3>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          {/* Broadcast toggle (admin + teacher only) */}
          {role !== 'parent' && (
            <div className="flex items-center gap-3">
              <button onClick={() => setBroadcastMode(false)} className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${!broadcastMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <User className="w-4 h-4" /> Direct Message
              </button>
              <button onClick={() => { setBroadcastMode(true); loadRecipients(); }} className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${broadcastMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Users className="w-4 h-4" /> Broadcast
              </button>
            </div>
          )}

          {broadcastMode ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Send to</label>
              <select value={compForm.target_role} onChange={e => setCompForm(f => ({ ...f, target_role: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select audience...</option>
                <option value="parent">All Parents</option>
                <option value="teacher">All Teachers</option>
                <option value="student">All Students</option>
                <option value="all">Everyone</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <select value={compForm.recipient_id} onChange={e => setCompForm(f => ({ ...f, recipient_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onFocus={loadRecipients}>
                <option value="">Select recipient...</option>
                {recipients.map(r => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.last_name} ({r.role}) — {r.email}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <input value={compForm.subject} onChange={e => setCompForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message *</label>
            <textarea rows={6} value={compForm.body} onChange={e => setCompForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your message..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setTab('inbox')} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={sendMessage} disabled={sending}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />{sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  const list = tab === 'inbox' ? inbox : sent;
  const filtered = list.filter(m => {
    const q = search.toLowerCase();
    if (!q) return true;
    return m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q) ||
      `${m.sender?.first_name} ${m.sender?.last_name}`.toLowerCase().includes(q) ||
      `${m.recipient?.first_name} ${m.recipient?.last_name}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-500" /> Messages
          {unreadCount > 0 && <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{unreadCount}</span>}
        </h2>
        <button onClick={() => { openCompose(); setTab('compose'); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Edit3 className="w-4 h-4" /> Compose
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button onClick={() => setTab('inbox')} className={`flex items-center gap-1.5 px-1 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'inbox' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Inbox className="w-4 h-4" /> Inbox {unreadCount > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">{unreadCount}</span>}
        </button>
        <button onClick={() => setTab('sent')} className={`flex items-center gap-1.5 px-1 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'sent' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Send className="w-4 h-4" /> Sent
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Search messages..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Message list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {tab === 'inbox' ? 'No messages in your inbox.' : 'No sent messages.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(msg => {
              const isInbox = tab === 'inbox';
              const person = isInbox
                ? (msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : 'System')
                : (msg.recipient ? `${msg.recipient.first_name} ${msg.recipient.last_name}` : msg.target_role ? `All ${msg.target_role}s` : '—');
              const personRole = isInbox ? (msg.sender?.role ?? '') : (msg.recipient?.role ?? '');
              const unread = isInbox && !msg.is_read;
              return (
                <button key={msg.id} onClick={() => loadThread(msg)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 text-left transition-colors ${unread ? 'bg-indigo-50/50' : ''}`}>
                  <Avatar name={isInbox ? (msg.sender?.first_name ?? '?') : (msg.recipient?.first_name ?? '?')} role={personRole} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{person}</p>
                      <p className="text-xs text-gray-400 flex-shrink-0">{fmt(msg.created_at)}</p>
                    </div>
                    <p className={`text-sm truncate ${unread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{msg.subject}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{msg.body}</p>
                  </div>
                  {unread && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
