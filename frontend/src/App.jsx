import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ProjectPage from './pages/ProjectPage';
import RecruiterChat from './components/RecruiterChat';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import { projectsById } from './data/projects';

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return null;
}

export default function App() {
  const location = useLocation();
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [backendProvider, setBackendProvider] = useState('');
  const openAgent = useCallback(() => setIsAgentOpen(true), []);
  const closeAgent = useCallback(() => setIsAgentOpen(false), []);

  const routeProjectId = location.pathname.startsWith('/work/')
    ? location.pathname.split('/')[2]
    : null;
  const activeProjectId = projectsById[routeProjectId] ? routeProjectId : null;

  useEffect(() => {
    const controller = new AbortController();
    const fetchInfo = async () => {
      try {
        const baseUrl = window.location.port === '5173' ? 'http://localhost:8000' : '';
        const response = await fetch(`${baseUrl}/api/info`, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setBackendProvider(data.provider || '');
        }
      } catch (error) {
        if (error.name !== 'AbortError') setBackendProvider('offline');
      }
    };
    fetchInfo();
    return () => controller.abort();
  }, []);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="site-atmosphere" aria-hidden="true"><span /><span /></div>
      <SiteHeader onOpenAgent={openAgent} />
      <div id="main-content">
        <ScrollManager />
        <Routes>
          <Route path="/" element={<HomePage onOpenAgent={openAgent} />} />
          <Route path="/work/:projectId" element={<ProjectPage onOpenAgent={openAgent} />} />
          <Route path="/not-found" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
      </div>
      <SiteFooter onOpenAgent={openAgent} />
      <RecruiterChat
        isOpen={isAgentOpen}
        onClose={closeAgent}
        projectId={activeProjectId}
        backendProvider={backendProvider}
      />
    </div>
  );
}
