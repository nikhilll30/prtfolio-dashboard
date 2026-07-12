import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page not found — Nikhil Teja',
    description: 'Return to Nikhil Teja’s applied AI engineering portfolio.',
    path: '/not-found',
  });

  return (
    <main className="not-found">
      <span>404 / unresolved node</span>
      <h1>This path is not part of the system.</h1>
      <p>The project may have moved, or the route was never registered.</p>
      <Link className="button button--light" to="/">Return to the system map</Link>
    </main>
  );
}
