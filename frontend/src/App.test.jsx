import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

const jsonResponse = (data, ok = true) => Promise.resolve({
  ok,
  json: () => Promise.resolve(data),
});

describe('portfolio experience', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (String(url).endsWith('/api/info')) return jsonResponse({ provider: 'mock' });
      if (String(url).endsWith('/api/chat')) {
        return jsonResponse({
          response: 'The system uses documented, deterministic safety checks.',
          provider: 'mock',
          evidence: [{ label: 'SQL case study', href: '/work/sql-insight-agent', kind: 'case-study' }],
        });
      }
      return jsonResponse({}, false);
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('communicates the positioning and exposes all four project nodes', () => {
    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: /I build AI systems/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Open case study:/i })).toHaveLength(4);
    expect(screen.getByText('0.5147', { selector: '.proof-ledger strong' })).toBeInTheDocument();
  });

  it('uses capability nodes as an accessible project filter', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><App /></MemoryRouter>);

    const evaluation = screen.getByRole('button', { name: /Evaluation/i });
    await user.click(evaluation);

    expect(evaluation).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Showing where “Evaluate honestly” appears/i)).toBeInTheDocument();
  });

  it('supports direct, shareable case-study routes and simulation controls', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/work/pubmedqa-finetune']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'PubMedQA BiomedBERT' })).toBeInTheDocument();
    expect(screen.getAllByText('0.5147').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: /Reweight/i }));
    expect(screen.getByText(/maybe weight ≈ 2.2×/i)).toBeInTheDocument();
  });

  it('opens the grounded portfolio agent and renders approved evidence links', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><App /></MemoryRouter>);

    await user.click(screen.getAllByRole('button', { name: /Ask about my work/i })[0]);
    expect(await screen.findByRole('dialog', { name: /Ask about the work/i })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Ask about architecture/i), 'How is SQL kept safe?');
    await user.click(screen.getByRole('button', { name: 'Send question' }));

    await waitFor(() => expect(screen.getByText(/documented, deterministic safety checks/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /SQL case study/i })).toHaveAttribute('href', '/work/sql-insight-agent');
  });

  it('handles unknown routes without exposing an empty shell', () => {
    render(<MemoryRouter initialEntries={['/does-not-exist']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: /not part of the system/i })).toBeInTheDocument();
  });
});
