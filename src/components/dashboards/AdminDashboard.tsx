import { useState } from 'react';
import {
  LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardCheck,
  BarChart3, DollarSign, Monitor, Bell, Calendar, TrendingUp, Settings, UserPlus, Bus, Heart, FileText, MonitorCheck, Clock, Upload, MessageSquare, BookMarked, ClipboardList, History
} from 'lucide-react';
import DashboardShell, { NavItem } from './DashboardShell';
import type { ProfileRow } from '../../lib/supabase';
import OverviewSection from './admin/OverviewSection';
import StudentsSection from './admin/StudentsSection';
import TeachersSection from './admin/TeachersSection';
import ClassesSection from './admin/ClassesSection';
import AttendanceSection from './admin/AttendanceSection';
import GradesSection from './admin/GradesSection';
import FeesSection from './admin/FeesSection';
import LMSSection from './admin/LMSSection';
import AnnouncementsSection from './admin/AnnouncementsSection';
import CalendarSection from './admin/CalendarSection';
import ReportsSection from './admin/ReportsSection';
import ResultsSection from './admin/ResultsSection';
import SettingsSection from './admin/SettingsSection';
import CBTSection from './admin/CBTSection';
import TimetableSection from './admin/TimetableSection';
import BulkImportSection from './admin/BulkImportSection';
import MessagesSection from './shared/MessagesSection';
import ParentsSection from './admin/ParentsSection';
import TransportSection from './admin/TransportSection';
import HealthRecordsSection from './admin/HealthRecordsSection';
import SubjectsSection from './admin/SubjectsSection';
import AdmissionsSection from './admin/AdmissionsSection';
import AdminAuditSection from './admin/AdminAuditSection';
import ErrorBoundary from '../ErrorBoundary';

const adminNav: NavItem[] = [
  { id: 'overview',      label: 'Overview',      icon: LayoutDashboard, color: 'text-indigo-400' },
  { id: 'admissions',    label: 'Admissions',     icon: ClipboardList,   color: 'text-orange-400' },
  { id: 'students',      label: 'Students',       icon: GraduationCap,   color: 'text-blue-400' },
  { id: 'teachers',      label: 'Teachers',       icon: Users,           color: 'text-green-400' },
  { id: 'classes',       label: 'Classes',        icon: BookOpen,        color: 'text-violet-400' },
  { id: 'subjects',      label: 'Subjects',       icon: BookMarked,      color: 'text-fuchsia-400' },
  { id: 'attendance',    label: 'Attendance',     icon: ClipboardCheck,  color: 'text-cyan-400' },
  { id: 'grades',        label: 'Grades',         icon: BarChart3,       color: 'text-purple-400' },
  { id: 'fees',          label: 'Fees & Finance', icon: DollarSign,      color: 'text-emerald-400' },
  { id: 'parents',       label: 'Parents',        icon: UserPlus,        color: 'text-amber-400' },
  { id: 'transport',     label: 'Transport',      icon: Bus,             color: 'text-amber-500' },
  { id: 'health',        label: 'Health Records', icon: Heart,           color: 'text-rose-400' },
  { id: 'lms',           label: 'LMS',            icon: Monitor,         color: 'text-pink-400' },
  { id: 'announcements', label: 'Announcements',  icon: Bell,            color: 'text-orange-400' },
  { id: 'calendar',      label: 'Calendar',       icon: Calendar,        color: 'text-teal-400' },
  { id: 'results',       label: 'Result Sheets',  icon: FileText,        color: 'text-green-400' },
  { id: 'cbt',           label: 'CBT Exams',      icon: MonitorCheck,    color: 'text-violet-400' },
  { id: 'timetable',    label: 'Timetable',      icon: Clock,           color: 'text-cyan-400' },
  { id: 'import',       label: 'Bulk Import',    icon: Upload,          color: 'text-indigo-400' },
  { id: 'messages',     label: 'Messages',       icon: MessageSquare,   color: 'text-sky-400' },
  { id: 'reports',       label: 'Reports',        icon: TrendingUp,      color: 'text-red-400' },
  { id: 'audit',         label: 'Audit log',      icon: History,         color: 'text-slate-500' },
  { id: 'settings',      label: 'Settings',       icon: Settings,        color: 'text-slate-400' },
];

export default function AdminDashboard({ profile }: { profile: ProfileRow }) {
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
      case 'admissions':    return <AdmissionsSection {...props} />;
      case 'students':      return <StudentsSection {...props} />;
      case 'teachers':      return <TeachersSection {...props} />;
      case 'classes':       return <ClassesSection {...props} />;
      case 'subjects':      return <SubjectsSection {...props} />;
      case 'attendance':    return <AttendanceSection {...props} />;
      case 'grades':        return <GradesSection {...props} />;
      case 'fees':          return <FeesSection {...props} />;
      case 'parents':       return <ParentsSection {...props} />;
      case 'transport':     return <TransportSection {...props} />;
      case 'health':        return <HealthRecordsSection {...props} />;
      case 'lms':           return <LMSSection {...props} />;
      case 'announcements': return <AnnouncementsSection {...props} />;
      case 'calendar':      return <CalendarSection {...props} />;
      case 'results':       return <ResultsSection {...props} />;
      case 'cbt':           return <CBTSection {...props} />;
      case 'timetable':     return <TimetableSection {...props} />;
      case 'import':        return <BulkImportSection {...props} />;
      case 'messages':      return <MessagesSection profile={profile} role="admin" />;
      case 'reports':       return <ReportsSection {...props} />;
      case 'audit':         return <AdminAuditSection profile={profile} />;
      case 'settings':      return <SettingsSection {...props} />;
      default:              return <OverviewSection {...props} />;
    }
  };

  return (
    <DashboardShell
      profile={profile}
      navItems={adminNav}
      activeSection={section}
      onSectionChange={setSection}
      onInboxOpenLms={() => {
        try {
          sessionStorage.setItem('admin-lms-tab', 'lessonplans');
        } catch {
          /* ignore */
        }
        setSection('lms');
      }}
      gradientFrom="from-indigo-700"
      gradientTo="to-indigo-900"
    >
      <ErrorBoundary label={`${section.charAt(0).toUpperCase() + section.slice(1)} Section`}>
        {renderSection()}
      </ErrorBoundary>
    </DashboardShell>
  );
}
