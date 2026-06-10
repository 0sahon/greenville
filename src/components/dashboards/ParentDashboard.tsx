import { useState } from 'react';
import { useSectionHistory } from '../../hooks/useSectionHistory';
import { LayoutDashboard, Heart, DollarSign, Bell, Calendar, BarChart3, ClipboardCheck, MessageSquare, User, Paperclip } from 'lucide-react';
import DashboardShell, { NavItem } from './DashboardShell';
import type { ProfileRow } from '../../lib/supabase';
import OverviewSection from './parent/OverviewSection';
import ChildrenSection from './parent/ChildrenSection';
import FeesSection from './parent/FeesSection';
import AnnouncementsSection from './parent/AnnouncementsSection';
import CalendarSection from './parent/CalendarSection';
import ParentLearningResourcesSection from './parent/ParentLearningResourcesSection';
import ParentGradesSection from './parent/GradesSection';
import ParentAttendanceSection from './parent/AttendanceSection';
import MessagesSection from './shared/MessagesSection';
import ProfileEditSection from './shared/ProfileEditSection';
import ErrorBoundary from '../ErrorBoundary';

const parentNav: NavItem[] = [
  { id: 'overview',      label: 'Overview',       icon: LayoutDashboard, color: 'text-purple-400' },
  { id: 'children',      label: 'My Children',    icon: Heart,           color: 'text-pink-400' },
  { id: 'resources',     label: 'Learning resources', icon: Paperclip, color: 'text-rose-400' },
  { id: 'fees',          label: 'Fees',           icon: DollarSign,      color: 'text-emerald-400' },
  { id: 'announcements', label: 'Announcements',  icon: Bell,            color: 'text-orange-400' },
  { id: 'grades',       label: 'Results',          icon: BarChart3,       color: 'text-purple-400' },
  { id: 'attendance',   label: 'Attendance',       icon: ClipboardCheck,  color: 'text-green-400' },
  { id: 'messages',     label: 'Messages',         icon: MessageSquare,   color: 'text-sky-400' },
  { id: 'profile',      label: 'My Profile',      icon: User,            color: 'text-gray-400' },
  { id: 'calendar',      label: 'Calendar',       icon: Calendar,        color: 'text-teal-400' },
];

export default function ParentDashboard({ profile }: { profile: ProfileRow }) {
  const [section, setSection] = useState('overview');
  useSectionHistory(section, setSection);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-gray-500">Loading profile...</div>
      </div>
    );
  }

  const renderSection = () => {
    const props = { profile, onNavigate: setSection };
    switch (section) {
      case 'overview':      return <OverviewSection {...props} />;
      case 'children':      return <ChildrenSection {...props} />;
      case 'resources':     return <ParentLearningResourcesSection profile={profile} />;
      case 'fees':          return <FeesSection {...props} />;
      case 'announcements': return <AnnouncementsSection />;
      case 'grades':        return <ParentGradesSection {...props} />;
      case 'attendance':    return <ParentAttendanceSection {...props} />;
      case 'messages':      return <MessagesSection profile={profile} role="parent" />;
      case 'profile':       return <ProfileEditSection {...props} />;
      case 'calendar':      return <CalendarSection />;
      default:              return <OverviewSection {...props} />;
    }
  };

  return (
    <DashboardShell
      profile={profile}
      navItems={parentNav}
      activeSection={section}
      onSectionChange={setSection}
      gradientFrom="from-purple-700"
      gradientTo="to-purple-900"
    >
      <ErrorBoundary label={`${section.charAt(0).toUpperCase() + section.slice(1)} Section`}>
        {renderSection()}
      </ErrorBoundary>
    </DashboardShell>
  );
}
