import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Menu, ChevronRight, LogOut, School, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ProfileRow, InAppNotificationRow } from '../../lib/supabase';
import { SCHOOL_NAME_SHORT } from '../../config/schoolBrand';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface DashboardShellProps {
  profile: ProfileRow;
  navItems: NavItem[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  children: ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  /** When user opens a notification that points to LMS, switch to that section (e.g. lesson plan review). */
  onInboxOpenLms?: () => void;
}

export default function DashboardShell({
  profile,
  navItems,
  activeSection,
  onSectionChange,
  children,
  gradientFrom = 'from-indigo-700',
  gradientTo = 'to-indigo-900',
  onInboxOpenLms,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotificationRow[]>([]);
  const inboxRef = useRef<HTMLDivElement>(null);

  const showInbox = profile.role === 'admin' || profile.role === 'teacher';

  const loadNotifications = useCallback(async () => {
    if (!showInbox || !profile.id) return;
    const { data } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications(data || []);
  }, [showInbox, profile.id]);

  useEffect(() => {
    if (!showInbox || !profile.id) return;
    void loadNotifications();
    const t = setInterval(() => void loadNotifications(), 60000);
    return () => clearInterval(t);
  }, [showInbox, profile.id, loadNotifications]);

  useEffect(() => {
    if (!inboxOpen) return;
    const close = (e: MouseEvent) => {
      if (inboxRef.current && !inboxRef.current.contains(e.target as Node)) setInboxOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [inboxOpen]);

  const markRead = async (id: string) => {
    const ts = new Date().toISOString();
    await supabase.from('in_app_notifications').update({ read_at: ts }).eq('id', id).eq('profile_id', profile.id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read_at: ts } : n)));
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const handleSignOut = async () => { await supabase.auth.signOut(); };
  const activeNav = navItems.find(n => n.id === activeSection);

  useEffect(() => {
    document.title = activeNav ? `${activeNav.label} | ${SCHOOL_NAME_SHORT}` : SCHOOL_NAME_SHORT;
  }, [activeNav]);

  const roleBadge: Record<string, string> = {
    admin: 'Administrator',
    teacher: 'Teacher',
    parent: 'Parent',
    student: 'Student',
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <School className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">{SCHOOL_NAME_SHORT}</p>
              <p className="text-white/60 text-xs truncate">{roleBadge[profile?.role] || 'Portal'}</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = activeSection === item.id;
          return (
            <button key={item.id}
              onClick={() => { onSectionChange(item.id); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                active ? 'bg-white text-indigo-700 shadow-md' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}>
              <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-indigo-600' : item.color}`} />
              {sidebarOpen && <span className="text-sm font-medium truncate flex-1 text-left">{item.label}</span>}
              {active && sidebarOpen && <ChevronRight className="w-4 h-4 opacity-50 flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      <div className="px-2 pb-4 border-t border-white/10 pt-4 space-y-1">
        <div className={`flex items-center gap-3 px-3 py-2 ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {profile?.first_name?.[0]?.toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{profile?.first_name} {profile?.last_name}</p>
              <p className="text-white/50 text-xs truncate">{roleBadge[profile?.role]}</p>
            </div>
          )}
        </div>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-gradient-to-b ${gradientFrom} via-indigo-800 ${gradientTo} transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-60' : 'w-16'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className={`absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-b ${gradientFrom} via-indigo-800 ${gradientTo} z-50`}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:flex p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
            {activeNav && (
              <div className="flex items-center gap-2">
                <activeNav.icon className={`w-5 h-5 ${activeNav.color}`} />
                <h1 className="text-lg font-semibold text-gray-900">{activeNav.label}</h1>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500">
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {showInbox && (
              <div className="relative" ref={inboxRef}>
                <button
                  type="button"
                  onClick={() => {
                    setInboxOpen(o => !o);
                    void loadNotifications();
                  }}
                  className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {inboxOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50 text-left">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">Inbox</span>
                      {notifications.length > 0 && unreadCount > 0 && (
                        <button
                          type="button"
                          className="text-[10px] text-pink-600 font-medium hover:underline"
                          onClick={async () => {
                            const ts = new Date().toISOString();
                            const ids = notifications.filter(n => !n.read_at).map(n => n.id);
                            if (ids.length === 0) return;
                            await supabase.from('in_app_notifications').update({ read_at: ts }).eq('profile_id', profile.id).in('id', ids);
                            setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? ts })));
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-400 px-3 py-6 text-center">No notifications yet.</p>
                    ) : (
                      <ul className="divide-y divide-gray-50">
                        {notifications.map(n => (
                          <li key={n.id}>
                            <button
                              type="button"
                              className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 ${!n.read_at ? 'bg-pink-50/50' : ''}`}
                              onClick={() => {
                                void markRead(n.id);
                                if (n.link_kind === 'lesson_plan' || n.type === 'lesson_plan_admin') {
                                  onInboxOpenLms?.();
                                }
                                setInboxOpen(false);
                              }}
                            >
                              <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                              {n.body && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-3 whitespace-pre-wrap">{n.body}</p>}
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(n.created_at).toLocaleString('en-NG')}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {profile?.first_name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
