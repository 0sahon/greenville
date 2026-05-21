import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { 
  Menu, ChevronRight, LogOut, School, Bell, Sparkles, X, 
  UserPlus, Users, BookOpen, BarChart3, MonitorCheck, ClipboardList, 
  ClipboardCheck, Monitor, Star, Paperclip, FileText, Calendar, Heart, DollarSign 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ProfileRow, InAppNotificationRow } from '../../lib/supabase';
import { SCHOOL_NAME_SHORT, SCHOOL_LOGO_PATH } from '../../config/schoolBrand';

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
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const getQuickActionsForRole = (role: string) => {
    switch (role) {
      case 'admin':
        return [
          { id: 'add-student', label: 'Add Student', desc: 'Onboard and allocate classes to a new student', sectionId: 'students', icon: UserPlus, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
          { id: 'add-teacher', label: 'Add Teacher', desc: 'Onboard new teacher & manage class assignments', sectionId: 'teachers', icon: Users, color: 'text-emerald-600 bg-emerald-50 border border-emerald-100' },
          { id: 'class-allocations', label: 'Classes Setup', desc: 'Manage classes, subjects and assign educators', sectionId: 'classes', icon: BookOpen, color: 'text-amber-600 bg-amber-50 border border-amber-100' },
          { id: 'enter-grades', label: 'Enter Grades', desc: 'Quickly view or override exam scores and assessments', sectionId: 'grades', icon: BarChart3, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
          { id: 'cbt-bank', label: 'CBT Exam Bank', desc: 'Create and deploy computer-based test exams', sectionId: 'cbt', icon: MonitorCheck, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
          { id: 'admissions', label: 'Admissions Board', desc: 'Review & approve school enrollment applications', sectionId: 'admissions', icon: ClipboardList, color: 'text-rose-600 bg-rose-50 border border-rose-100' }
        ];
      case 'teacher':
        return [
          { id: 'enter-scores', label: 'Enter Scores', desc: 'Update continuous assessments and exam scores', sectionId: 'grades', icon: BarChart3, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
          { id: 'mark-attendance', label: 'Mark Attendance', desc: 'Take daily attendance logs for class groups', sectionId: 'attendance', icon: ClipboardCheck, color: 'text-cyan-600 bg-cyan-50 border border-cyan-100' },
          { id: 'teacher-lms', label: 'LMS & Lessons', desc: 'Create curriculum study resources and lessons', sectionId: 'lms', icon: Monitor, color: 'text-pink-600 bg-pink-50 border border-pink-100' },
          { id: 'cbt-setup', label: 'CBT Setup', desc: 'Manage question banks and test results', sectionId: 'cbt', icon: MonitorCheck, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
          { id: 'my-students', label: 'My Students', desc: 'View profiles and records of allocated students', sectionId: 'students', icon: Users, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' }
        ];
      case 'student':
        return [
          { id: 'take-cbt', label: 'Take CBT Exam', desc: 'Start any active online computer-based tests', sectionId: 'cbt', icon: MonitorCheck, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
          { id: 'view-grades', label: 'View My Grades', desc: 'Access results transcripts and progress reports', sectionId: 'grades', icon: Star, color: 'text-yellow-600 bg-yellow-50 border border-yellow-100' },
          { id: 'student-assignments', label: 'Assignments', desc: 'Check and submit homework assignments', sectionId: 'assignments', icon: FileText, color: 'text-orange-600 bg-orange-50 border border-orange-100' },
          { id: 'student-resources', label: 'LMS Library', desc: 'Access study notes, videos and course slides', sectionId: 'resources', icon: Paperclip, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
          { id: 'timetable', label: 'View Timetable', desc: 'Check daily schedule and class timetable details', sectionId: 'timetable', icon: Clock, color: 'text-teal-600 bg-teal-50 border border-teal-100' }
        ];
      case 'parent':
        return [
          { id: 'my-children', label: 'My Children', desc: 'View detailed performance tracking cards per child', sectionId: 'children', icon: Heart, color: 'text-pink-600 bg-pink-50 border border-pink-100' },
          { id: 'parent-grades', label: 'Academic Results', desc: 'Check term sheets and learning reports', sectionId: 'grades', icon: BarChart3, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
          { id: 'parent-fees', label: 'Term Fees', desc: 'Settle school fees invoices online securely', sectionId: 'fees', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border border-emerald-100' },
          { id: 'parent-resources', label: 'LMS Resources', desc: 'Access curriculum materials and syllabus notes', sectionId: 'resources', icon: Paperclip, color: 'text-rose-600 bg-rose-50 border border-rose-100' },
          { id: 'parent-announcements', label: 'Announcements', desc: 'Check official notifications and communications', sectionId: 'announcements', icon: Bell, color: 'text-orange-600 bg-orange-50 border border-orange-100' }
        ];
      default:
        return [];
    }
  };

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
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner border border-white/20 p-0.5 transition-transform duration-300 hover:scale-105">
            <img src={SCHOOL_LOGO_PATH} alt="GMS Logo" className="w-full h-full object-contain" />
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
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors ${
            sidebarOpen ? 'justify-start' : 'justify-center px-0'
          }`}>
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-gradient-to-b ${gradientFrom} via-indigo-800 ${gradientTo} transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-60' : 'w-16'} h-full`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b ${gradientFrom} via-indigo-800 ${gradientTo} z-50 flex flex-col`}>
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
                          className="text-[10px] text-indigo-600 font-medium hover:underline"
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
                              className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 ${!n.read_at ? 'bg-indigo-50/50' : ''}`}
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
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {profile?.first_name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 lg:hidden flex items-center justify-between px-3 py-1 z-40 shadow-[0_-4px_15px_rgba(0,0,0,0.06)]">
        {/* Nav Item 0 */}
        {navItems[0] && (
          <button
            onClick={() => onSectionChange(navItems[0].id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 ${
              activeSection === navItems[0].id ? 'text-indigo-600 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {React.createElement(navItems[0].icon, {
              className: `w-5 h-5 flex-shrink-0 mb-0.5 ${activeSection === navItems[0].id ? 'text-indigo-600' : 'text-gray-400'}`
            })}
            <span className="text-[9px] truncate max-w-full leading-none">{navItems[0].label}</span>
          </button>
        )}

        {/* Nav Item 1 */}
        {navItems[1] && (
          <button
            onClick={() => onSectionChange(navItems[1].id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 ${
              activeSection === navItems[1].id ? 'text-indigo-600 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {React.createElement(navItems[1].icon, {
              className: `w-5 h-5 flex-shrink-0 mb-0.5 ${activeSection === navItems[1].id ? 'text-indigo-600' : 'text-gray-400'}`
            })}
            <span className="text-[9px] truncate max-w-full leading-none">{navItems[1].label}</span>
          </button>
        )}

        {/* Central Floating Quick Action FAB */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => setQuickActionsOpen(true)}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-600 hover:from-indigo-800 hover:to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition-all duration-200 active:scale-95 border-4 border-white z-50 relative group"
            title="Quick Actions"
          >
            <Sparkles className="w-5 h-5 animate-pulse text-white group-hover:scale-110 transition-transform duration-200" />
            <span className="absolute -bottom-5 text-[8px] font-extrabold text-indigo-700 uppercase tracking-wider whitespace-nowrap bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100 shadow-sm leading-none scale-90">Quick</span>
          </button>
        </div>

        {/* Nav Item 2 */}
        {navItems[2] && (
          <button
            onClick={() => onSectionChange(navItems[2].id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 ${
              activeSection === navItems[2].id ? 'text-indigo-600 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {React.createElement(navItems[2].icon, {
              className: `w-5 h-5 flex-shrink-0 mb-0.5 ${activeSection === navItems[2].id ? 'text-indigo-600' : 'text-gray-400'}`
            })}
            <span className="text-[9px] truncate max-w-full leading-none">{navItems[2].label}</span>
          </button>
        )}

        {/* Menu/More button */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-gray-400 hover:text-gray-600"
        >
          <Menu className="w-5 h-5 flex-shrink-0 mb-0.5 text-gray-400" />
          <span className="text-[9px] font-bold leading-none">Menu</span>
        </button>
      </div>

      {/* Quick Actions Drawer / Overlay */}
      {quickActionsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end transition-opacity duration-300">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setQuickActionsOpen(false)}
          />
          {/* Drawer Sheet */}
          <div className="relative bg-white rounded-t-3xl shadow-[0_-10px_25px_rgba(0,0,0,0.15)] max-h-[85vh] overflow-y-auto p-6 z-10 transform translate-y-0 transition-transform duration-300 ease-out border-t border-gray-100">
            {/* Handle/Indicator */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse animate-duration-1000" />
                  Quick Actions
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Instant shortcuts for your {profile.role} dashboard</p>
              </div>
              <button 
                onClick={() => setQuickActionsOpen(false)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {getQuickActionsForRole(profile.role).map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      onSectionChange(action.sectionId);
                      setQuickActionsOpen(false);
                    }}
                    className="flex flex-col items-start p-3 bg-gradient-to-br from-gray-50 to-indigo-50/20 hover:from-indigo-50/50 hover:to-indigo-100/30 border border-gray-100 hover:border-indigo-100 rounded-xl transition-all duration-200 group text-left shadow-sm hover:shadow"
                  >
                    <div className={`p-2 rounded-lg mb-2.5 group-hover:scale-105 transition-transform duration-200 ${action.color}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900 transition-colors">
                      {action.label}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                      {action.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
