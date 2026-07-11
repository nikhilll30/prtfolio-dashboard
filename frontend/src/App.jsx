import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
      <div className="ambient-glow ambient-glow-one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-two" aria-hidden="true" />
      <div className="scanline-overlay" aria-hidden="true" />
      
      {/* Top Navbar */}
      <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }} style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '3rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border)'
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--accent-dim)' }}>~/</span>nikhil-teja<span className="cursor-blink">_</span>
        </span>

        <button
          className="btn"
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{ fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}
        >
          {isChatOpen ? '[close_agent]' : '[recruiter_agent]'}
        </button>
      </motion.nav>

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
        <motion.section
          id="projects"
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.08 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: '4rem' }}
        >
          <h2 className="section-title"><span className="section-num">02 //</span> PROJECTS</h2>

          <motion.div layout className="projects-grid" style={{
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
          </motion.div>
        </motion.section>

        {/* Experience Timeline Section */}
        <Timeline />

      </main>

      {/* Interactive Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '3rem 0 1rem',
        borderTop: '1px solid var(--border)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.78rem'
      }}>
        <p>© 2026 nikhil-teja · built with react + fastapi + claude + gemini</p>
        <p style={{ marginTop: '0.5rem' }}>
          <a href="https://github.com/nikhilll30" target="_blank" rel="noreferrer" className="mono-link">[github]</a>
          {' '}
          <a href="https://huggingface.co/nikhilteja30" target="_blank" rel="noreferrer" className="mono-link">[huggingface]</a>
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
