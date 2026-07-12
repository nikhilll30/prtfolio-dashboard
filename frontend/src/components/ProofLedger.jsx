import { Link } from 'react-router-dom';
import { projectsData } from '../data/projects';

const ledgerItems = [
  { projectId: 'multi-agent-researcher', value: '5', label: 'service research graph' },
  { projectId: 'rag-doc-qa', value: '384D', label: 'local retrieval vectors' },
  { projectId: 'sql-insight-agent', value: 'Read-only', label: 'SQL safety posture' },
  { projectId: 'pubmedqa-finetune', value: '0.5147', label: 'published macro F1' },
];

export default function ProofLedger() {
  return (
    <aside className="proof-ledger" aria-label="Selected verified project facts">
      <span className="proof-ledger__label">Evidence ledger</span>
      <div className="proof-ledger__items">
        {ledgerItems.map((item) => {
          const project = projectsData.find((entry) => entry.id === item.projectId);
          return (
            <Link key={item.projectId} to={`/work/${item.projectId}`} style={{ '--project-accent': project.accent }}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
