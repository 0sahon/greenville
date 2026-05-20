import React, { lazy, Suspense, useState } from 'react';

import { useAuth } from './hooks/useAuth';
import ErrorBoundary from './components/ErrorBoundary';
import MainWebsite from './components/website/MainWebsite';
import AuthLayout from './components/auth/AuthLayout';
import LoginForm from './components/auth/LoginForm';
import { LogOut } from 'lucide-react';
import { SCHOOL_NAME } from './config/schoolBrand';

const AdminDashboard   = lazy(() => import('./components/dashboards/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./components/dashboards/TeacherDashboard'));
const ParentDashboard  = lazy(() => import('./components/dashboards/ParentDashboard'));
const StudentDashboard = lazy(() => import('./components/dashboards/StudentDashboard'));
const KidsLanding      = lazy(() => import('./components/kids/KidsLanding'));

const Spinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 via-blue-50 to-green-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 text-lg">Loading {SCHOOL_NAME}...</p>
    </div>
  </div>
);

function App() {
  const { user, profile, loading, signOut } = useAuth();
  const [showMainWebsite, setShowMainWebsite] = useState(true);
  const [showKidsZone, setShowKidsZone] = useState(false);

  if (loading) return <Spinner />;

  if (showKidsZone) {
    return (
      <ErrorBoundary label="Kids Zone">
        <Suspense fallback={<Spinner />}>
          <KidsLanding onBack={() => {
            setShowKidsZone(false);
            if (!user) setShowMainWebsite(true);
          }} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (!user && showMainWebsite) {
    return (
      <MainWebsite
        onLoginClick={() => setShowMainWebsite(false)}
        onKidsZoneClick={() => { setShowKidsZone(true); setShowMainWebsite(false); }}
      />
    );
  }

  if (!user || !profile) {
    return (
      <AuthLayout title="Welcome Back!" subtitle="Please sign in to access your account">
        <div className="text-center mb-4">
          <button
            onClick={() => setShowMainWebsite(true)}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium underline"
          >
            ← Back to Main Website
          </button>
        </div>
        <LoginForm onSuccess={() => {}} />
      </AuthLayout>
    );
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case 'parent':
        return (
          <ErrorBoundary label="Parent Dashboard">
            <Suspense fallback={<Spinner />}><ParentDashboard profile={profile} /></Suspense>
          </ErrorBoundary>
        );
      case 'teacher':
        return (
          <ErrorBoundary label="Teacher Dashboard">
            <Suspense fallback={<Spinner />}><TeacherDashboard profile={profile} /></Suspense>
          </ErrorBoundary>
        );
      case 'admin':
        return (
          <ErrorBoundary label="Admin Dashboard">
            <Suspense fallback={<Spinner />}><AdminDashboard profile={profile} /></Suspense>
          </ErrorBoundary>
        );
      case 'student':
        return (
          <ErrorBoundary label="Student Dashboard">
            <Suspense fallback={<Spinner />}><StudentDashboard profile={profile} /></Suspense>
          </ErrorBoundary>
        );
      default:
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">Invalid user role. Please contact administrator.</p>
              <button
                onClick={signOut}
                className="mt-4 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors mx-auto"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        );
    }
  };

  return renderDashboard();
}

export default App;
