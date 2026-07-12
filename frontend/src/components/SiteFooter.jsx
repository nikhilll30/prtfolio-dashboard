import { Link } from 'react-router-dom';
import { candidate } from '../data/projects';

export default function SiteFooter({ onOpenAgent }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__lead">
        <p className="eyebrow">Have a difficult AI system to build?</p>
        <h2>Let’s talk about the failure paths, not only the happy path.</h2>
        <div className="button-row">
          <a className="button button--light" href={`mailto:${candidate.email}`}>Start a conversation</a>
          <button className="button button--ghost-light" type="button" onClick={onOpenAgent}>Ask the portfolio</button>
        </div>
      </div>

      <div className="site-footer__meta">
        <Link className="footer-wordmark" to="/">Nikhil Teja <span>↗</span></Link>
        <p>{candidate.location} · {candidate.availability}</p>
        <div className="footer-links">
          <a href={candidate.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={candidate.huggingFace} target="_blank" rel="noreferrer">Hugging Face</a>
          <a href={`mailto:${candidate.email}`}>Email</a>
        </div>
      </div>
    </footer>
  );
}
