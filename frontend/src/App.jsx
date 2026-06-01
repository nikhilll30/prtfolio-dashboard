import React, { useState, useEffect } from 'react';
import Hero from './components/Hero';
import SkillsMatrix from './components/SkillsMatrix';
import ProjectCard from './components/ProjectCard';
import ProjectModal from './components/ProjectModal';
import RecruiterChat from './components/RecruiterChat';
import Timeline from './components/Timeline';
import { projectsData } from './data/projects';

export default function App() {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState(null);
  const [backendProvider, setBackendProvider] = useState('');

  // Fetch backend info at startup
  useEffect(() => {
    const fetchBackendInfo = async () => {
      try {
        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
        const response = await fetch(`${baseUrl}/api/info`);
        if (response.ok) {
          const data = await response.json();
          setBackendProvider(data.provider);
        }
      } catch (err) {
        console.warn("Backend uninitialized or unreachable in static mode:", err);
      }
    };
    fetchBackendInfo();
  }, []);

  const handleAskAgent = (query) => {
    setChatInitialQuery(query);
    setIsChatOpen(true);
    // Reset query after brief timeout so subsequent clicks can re-trigger
    setTimeout(() => setChatInitialQuery(null), 500);
  };

  const handleDownloadPdf = (projectId) => {
    const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
    const downloadUrl = `${baseUrl}/api/download-pdf/${projectId}`;
    // Directly open in new window/tab to trigger browser download
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="app-container">
      
      {/* Top Navbar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '3rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--grad-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: '#06050c'
          }}>NT</div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1.2rem' }}>
            Nikhil<span className="text-gradient">Teja</span>
          </span>
        </div>

        <button 
          className="btn btn-outline" 
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          {isChatOpen ? 'Close Recruiter Bot' : 'AI Recruiter Bot'}
        </button>
      </nav>

      {/* Main Content */}
      <main>
        
        {/* Hero Section */}
        <Hero onOpenChat={() => setIsChatOpen(true)} />

        {/* Skills Matrix Section */}
        <SkillsMatrix 
          selectedSkill={selectedSkill} 
          onSelectSkill={setSelectedSkill} 
        />

        {/* Projects Grid Section */}
        <section id="projects" style={{ marginBottom: '4rem' }}>
          <h2 className="section-title">Engineering Projects</h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.25rem'
          }}>
            {projectsData.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project}
                selectedSkill={selectedSkill}
                onSelect={() => setActiveProject(project)}
                onDownloadPdf={handleDownloadPdf}
              />
            ))}
          </div>
        </section>

        {/* Experience Timeline Section */}
        <Timeline />

      </main>

      {/* Interactive Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '3rem 0 1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <p>© 2026 Nikhil Teja. Built with React, FastAPI, Claude, and Gemini.</p>
        <p style={{ marginTop: '0.5rem' }}>
          Explore portfolio projects: 
          <a href="https://github.com/nikhilll30" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', marginLeft: '0.25rem' }}>GitHub</a> | 
          <a href="https://huggingface.co/nikhilteja30" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-purple)', textDecoration: 'none', marginLeft: '0.25rem' }}>HuggingFace</a>
        </p>
      </footer>

      {/* Project Details Modal */}
      <ProjectModal 
        project={activeProject} 
        onClose={() => setActiveProject(null)} 
        onAskAgent={handleAskAgent}
        onDownloadPdf={handleDownloadPdf}
      />

      {/* Floating Recruiter Chat Sidebar */}
      <RecruiterChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        initialQuery={chatInitialQuery}
        backendProvider={backendProvider}
      />

    </div>
  );
}
