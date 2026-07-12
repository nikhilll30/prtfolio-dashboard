import { Link, useLocation } from 'react-router-dom';
import { candidate } from '../data/projects';

export default function SiteHeader({ onOpenAgent }) {
  const location = useLocation();
  const onHome = location.pathname === '/';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="wordmark" to="/" aria-label="Nikhil Teja, home">
          <span className="wordmark__mark" aria-hidden="true"><span /></span>
          <span className="wordmark__text">
            <strong>Nikhil Teja</strong>
            <small>Applied AI Engineer</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          <a href={onHome ? '#work' : '/#work'}>Work</a>
          <a href={onHome ? '#approach' : '/#approach'}>Approach</a>
          <a href={onHome ? '#about' : '/#about'}>About</a>
        </nav>

        <div className="site-header__actions">
          <a className="text-link text-link--quiet header-email" href={`mailto:${candidate.email}`}>Email</a>
          <button className="button button--compact button--signal" type="button" onClick={onOpenAgent}>
            <span className="status-dot" aria-hidden="true" />
            Ask about my work
          </button>
        </div>
      </div>
    </header>
  );
}
