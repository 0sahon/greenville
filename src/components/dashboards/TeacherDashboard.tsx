import { useState } from 'react';
import {
  LayoutDashboard, BookOpen, ClipboardCheck, BarChart3,
  Monitor, Bell, Calendar, MonitorCheck, Clock, MessageSquare, User, FileText, Users
} from 'lucide-react';
import DashboardShell, { NavItem } from './DashboardShell';
import type { ProfileRow } from '../../lib/supabase';
import OverviewSection from './teacher/OverviewSection';
import ClassesSection from './teacher/ClassesSection';
import AttendanceSection from './teacher/AttendanceSection';
import GradesSection from './teacher/GradesSection';
import LMSSection from './teacher/LMSSection';
import AnnouncementsSection from './teacher/AnnouncementsSection';
import CalendarSection from './teacher/CalendarSection';
import TeacherCBTSection from './teacher/CBTSection';
import TeacherTimetableSection from './teacher/TimetableSection';
import MessagesSection from './shared/MessagesSection';
import ProfileEditSection from './shared/ProfileEditSection';
import TeacherResultsSection from './teacher/ResultsSection';
import TeacherStudentsSection from './teacher/StudentsSection';
import ErrorBoundary from '../ErrorBoundary';

const teacherNav: NavItem[] = [
  { id: 'overview',      label: 'Overview',       icon: LayoutDashboard, color: 'text-blue-400' },
  { id: 'classes',       label: 'My Classes',     icon: BookOpen,        color: 'text-green-400' },
  { id: 'students',      label: 'My Students',    icon: Users,           color: 'text-indigo-400' },
  { id: 'attendance',    label: 'Attendance',     icon: ClipboardCheck,  color: 'text-cyan-400' },
  { id: 'grades',        label: 'Grades',         icon: BarChart3,       color: 'text-purple-400' },
  { id: 'results',       label: 'Report Cards',   icon: FileText,        color: 'text-green-400' },
  { id: 'lms',           label: 'LMS',            icon: Monitor,        color: 'text-pink-400' },
  { id: 'announcements', label: 'Announcements',  icon: Bell,            color: 'text-orange-400' },
  { id: 'calendar',      label: 'Calendar',       icon: Calendar,        color: 'text-teal-400' },
  { id: 'cbt',           label: 'CBT Exams',      icon: MonitorCheck,    color: 'text-violet-400' },
  { id: 'timetable',    label: 'My Schedule',    icon: Clock,           color: 'text-cyan-400' },
  { id: 'messages',     label: 'Messages',       icon: MessageSquare,   color: 'text-sky-400' },
  { id: 'profile',      label: 'My Profile',     icon: User,            color: 'text-gray-400' },
];

export default function TeacherDashboard({ profile }: { profile: ProfileRow }) {
  const [section, setSection] = useState('overview');

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
      case 'classes':       return <ClassesSection {...props} />;
      case 'students':      return <TeacherStudentsSection {...props} />;
      case 'attendance':    return <AttendanceSection {...props} />;
      case 'grades':        return <GradesSection {...props} />;
      case 'results':       return <TeacherResultsSection {...props} />;
      case 'lms':           return <LMSSection {...props} />;
      case 'announcements': return <AnnouncementsSection {...props} />;
      case 'calendar':      return <CalendarSection {...props} />;
      case 'cbt':           return <TeacherCBTSection {...props} />;
      case 'timetable':     return <TeacherTimetableSection {...props} />;
      case 'messages':      return <MessagesSection profile={profile} role="teacher" />;
      case 'profile':       return <ProfileEditSection {...props} />;
      default:              return <OverviewSection {...props} />;
    }
  };

  return (
    <DashboardShell
      profile={profile}
      navItems={teacherNav}
      activeSection={section}
      onSectionChange={setSection}
      gradientFrom="from-indigo-700"
      gradientTo="to-indigo-900"
      onInboxOpenLms={() => {
        try {
          sessionStorage.setItem('teacher-lms-tab', 'lessonplans');
        } catch {
          /* ignore */
        }
        setSection('lms');
      }}
    >
      <ErrorBoundary label={`${section.charAt(0).toUpperCase() + section.slice(1)} Section`}>
        {renderSection()}
      </ErrorBoundary>
    </DashboardShell>
  );
}
