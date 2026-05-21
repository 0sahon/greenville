import { Routes, Route } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProgramsPage from './pages/ProgramsPage';
import AcademicsPage from './pages/AcademicsPage';
import AdmissionsPage from './pages/AdmissionsPage';
import NewsEventsPage from './pages/NewsEventsPage';
import GalleryPage from './pages/GalleryPage';
import ContactPage from './pages/ContactPage';
import { useNavigate } from 'react-router-dom';

interface MainWebsiteProps {
  onLoginClick: () => void;
  onKidsZoneClick: () => void;
}

export default function MainWebsite({ onLoginClick, onKidsZoneClick }: MainWebsiteProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={onLoginClick} onKidsZoneClick={onKidsZoneClick} />
      <Routes>
        <Route path="/" element={<HomePage onParentPortal={onLoginClick} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/academics" element={<AcademicsPage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/news-events" element={<NewsEventsPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
      <Footer />
    </div>
  );
}