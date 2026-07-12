export const candidate = {
  name: 'Nikhil Teja',
  title: 'Applied AI Engineer',
  location: 'Jersey City, New Jersey',
  availability: 'Open to remote and relocation',
  email: 'bvnikhilteja2001@gmail.com',
  github: 'https://github.com/nikhilll30',
  huggingFace: 'https://huggingface.co/nikhilteja30',
};

export const capabilities = [
  {
    id: 'orchestrate',
    label: 'Orchestrate agents',
    shortLabel: 'Orchestration',
    description: 'Stateful graphs, parallel work, protocol-driven services.',
    projectIds: ['multi-agent-researcher', 'sql-insight-agent'],
    position: { x: 17, y: 18 },
  },
  {
    id: 'retrieve',
    label: 'Retrieve with evidence',
    shortLabel: 'Retrieval',
    description: 'Hybrid search, rank fusion, and visible citations.',
    projectIds: ['rag-doc-qa', 'multi-agent-researcher'],
    position: { x: 79, y: 16 },
  },
  {
    id: 'recover',
    label: 'Design for recovery',
    shortLabel: 'Recovery',
    description: 'Retries, validation, timeouts, and honest failure states.',
    projectIds: ['sql-insight-agent', 'multi-agent-researcher'],
    position: { x: 84, y: 77 },
  },
  {
    id: 'evaluate',
    label: 'Evaluate honestly',
    shortLabel: 'Evaluation',
    description: 'Class-aware metrics, explicit limits, reproducible evidence.',
    projectIds: ['pubmedqa-finetune', 'rag-doc-qa'],
    position: { x: 14, y: 78 },
  },
];

export const projectsData = [
  {
    id: 'multi-agent-researcher',
    index: '01',
    title: 'Multi-Agent Researcher',
    shortTitle: 'Research network',
    eyebrow: 'Distributed research system',
    thesis: 'A research request becomes a graph of accountable, parallel work.',
    summary: 'A LangGraph orchestrator decomposes a question, dispatches web and document research in parallel, then hands both evidence streams to a synthesis service.',
    role: 'Lead architect & developer',
    status: 'Documented architecture',
    accent: '#ff6339',
    accentRgb: '255, 99, 57',
    position: { x: 29, y: 36 },
    capabilities: ['orchestrate', 'retrieve', 'recover'],
    techStack: ['LangGraph', 'FastAPI', 'A2A', 'MCP', 'ChromaDB', 'Tavily'],
    proof: [
      { value: '5', label: 'runtime services', qualifier: 'UI, orchestrator, and three specialist agents', sourceLabel: 'Architecture guide', href: '/api/download-pdf/multi-agent-researcher' },
      { value: '2', label: 'parallel evidence paths', qualifier: 'live web and private-document retrieval', sourceLabel: 'Architecture guide', href: '/api/download-pdf/multi-agent-researcher' },
      { value: 'A2A + MCP', label: 'protocol layer', qualifier: 'service messaging plus a standalone tool interface', sourceLabel: 'Architecture guide', href: '/api/download-pdf/multi-agent-researcher' },
    ],
    links: [
      { label: 'View source', href: 'https://github.com/nikhilll30/multi-agent-researcher', kind: 'repository' },
      { label: 'Read architecture PDF', href: '/api/download-pdf/multi-agent-researcher', kind: 'documentation' },
    ],
    architecture: {
      nodes: [
        { id: 'question', label: 'Research question', meta: 'user input', x: 8, y: 50 },
        { id: 'planner', label: 'Planner', meta: 'LangGraph', x: 29, y: 50 },
        { id: 'web', label: 'Web agent', meta: 'Tavily · :8001', x: 51, y: 24 },
        { id: 'rag', label: 'RAG agent', meta: 'ChromaDB · :8002', x: 51, y: 76 },
        { id: 'synthesis', label: 'Synthesis', meta: 'Claude · :8003', x: 74, y: 50 },
        { id: 'report', label: 'Cited report', meta: 'markdown output', x: 93, y: 50 },
      ],
      edges: [
        ['question', 'planner'], ['planner', 'web'], ['planner', 'rag'],
        ['web', 'synthesis'], ['rag', 'synthesis'], ['synthesis', 'report'],
      ],
      stages: [
        { label: 'Receive', title: 'Accept one broad research question', description: 'FastAPI validates the request and initializes a typed LangGraph state.', activeNodes: ['question'], output: 'Input: “How are hybrid RAG systems evolving?”' },
        { label: 'Plan', title: 'Turn intent into two targeted searches', description: 'The planner produces separate prompts for live-web and private-document research.', activeNodes: ['question', 'planner'], output: 'web_search_query + rag_query' },
        { label: 'Fan out', title: 'Run independent evidence paths in parallel', description: 'A2A tasks are sent to specialist services; the orchestrator polls without blocking the event loop.', activeNodes: ['planner', 'web', 'rag'], output: 'Two independently sourced result sets' },
        { label: 'Fan in', title: 'Wait for both branches before synthesis', description: 'LangGraph merges completed state only after both research branches resolve or report failure.', activeNodes: ['web', 'rag', 'synthesis'], output: 'web_results + rag_results' },
        { label: 'Synthesize', title: 'Build one report with visible provenance', description: 'The synthesis agent reconciles the evidence and returns a readable markdown report.', activeNodes: ['synthesis', 'report'], output: 'Structured report with sources and caveats' },
      ],
    },
    decisions: [
      { number: '01', title: 'Services instead of one oversized agent', body: 'Each specialist can be replaced, observed, or scaled without rewriting the graph.', tradeoff: 'More operational surface area, clearer ownership.' },
      { number: '02', title: 'Parallel fan-out through LangGraph', body: 'Web and document research do not depend on each other, so serial execution would add latency without improving quality.', tradeoff: 'The graph must handle partial failure and fan-in explicitly.' },
      { number: '03', title: 'MCP kept separate from the runtime path', body: 'The project demonstrates an MCP tool interface while using a direct import for the local RAG path where it is simpler.', tradeoff: 'The documentation distinguishes demonstrated protocol support from runtime behavior.' },
    ],
    limitations: [
      'A2A workers are polled every second; a production deployment would prefer event-driven completion or streaming.',
      'The local ChromaDB store is machine-specific and is not a multi-tenant persistence layer.',
    ],
  },
  {
    id: 'rag-doc-qa',
    index: '02',
    title: 'RAG Document Q&A',
    shortTitle: 'Evidence engine',
    eyebrow: 'Hybrid retrieval system',
    thesis: 'When two retrievers disagree, rank fusion makes the disagreement useful.',
    summary: 'A document question-answering pipeline combines semantic vectors with BM25 lexical search, merges rankings through Reciprocal Rank Fusion, and carries page-level source metadata into the answer.',
    role: 'Core developer',
    status: 'Documented architecture',
    accent: '#c7f36b',
    accentRgb: '199, 243, 107',
    position: { x: 70, y: 35 },
    capabilities: ['retrieve', 'evaluate'],
    techStack: ['ChromaDB', 'BM25', 'RRF', 'FastAPI', 'Sentence Transformers', 'Docker'],
    proof: [
      { value: '2', label: 'retrieval signals', qualifier: 'semantic similarity and lexical match', sourceLabel: 'Architecture guide', href: '/api/download-pdf/rag-doc-qa' },
      { value: '384D', label: 'local embeddings', qualifier: 'all-MiniLM-L6-v2 vectors', sourceLabel: 'Embedding guide', href: '/api/download-pdf/rag-doc-qa' },
      { value: 'RRF', label: 'ranking strategy', qualifier: 'reciprocal rank fusion without score normalization', sourceLabel: 'Retriever guide', href: '/api/download-pdf/rag-doc-qa' },
    ],
    links: [
      { label: 'View source', href: 'https://github.com/nikhilll30/rag-doc-qa', kind: 'repository' },
      { label: 'Read architecture PDF', href: '/api/download-pdf/rag-doc-qa', kind: 'documentation' },
    ],
    architecture: {
      nodes: [
        { id: 'query', label: 'Question', meta: 'natural language', x: 8, y: 50 },
        { id: 'semantic', label: 'Semantic search', meta: 'ChromaDB · 384D', x: 33, y: 24 },
        { id: 'bm25', label: 'Lexical search', meta: 'BM25 tokens', x: 33, y: 76 },
        { id: 'fusion', label: 'RRF', meta: 'rank fusion', x: 59, y: 50 },
        { id: 'context', label: 'Context builder', meta: 'source + page', x: 78, y: 50 },
        { id: 'answer', label: 'Grounded answer', meta: 'visible citations', x: 94, y: 50 },
      ],
      edges: [
        ['query', 'semantic'], ['query', 'bm25'], ['semantic', 'fusion'],
        ['bm25', 'fusion'], ['fusion', 'context'], ['context', 'answer'],
      ],
      stages: [
        { label: 'Query', title: 'Preserve both meaning and exact language', description: 'The same question is sent to semantic and lexical retrievers.', activeNodes: ['query'], output: '“What safety checks run before SQL execution?”' },
        { label: 'Retrieve', title: 'Let each retriever surface different evidence', description: 'Vectors find conceptually related passages while BM25 rewards exact technical terms.', activeNodes: ['semantic', 'bm25'], output: 'Two ranked lists with different score scales' },
        { label: 'Fuse', title: 'Combine rank positions instead of raw scores', description: 'RRF rewards passages that rank well in either list without pretending the underlying scores are comparable.', activeNodes: ['semantic', 'bm25', 'fusion'], output: 'fused_score = Σ 1 / (k + rank)' },
        { label: 'Ground', title: 'Carry provenance into the prompt', description: 'Selected chunks retain filename and page metadata so the answer can point back to evidence.', activeNodes: ['fusion', 'context'], output: '[Source: architecture.pdf, Page 7]' },
        { label: 'Answer', title: 'Return an answer that shows its work', description: 'The model receives explicit citation rules and declines when retrieved context is insufficient.', activeNodes: ['context', 'answer'], output: 'Answer + page-level citations + uncertainty' },
      ],
    },
    decisions: [
      { number: '01', title: 'Hybrid retrieval over a single ranking signal', body: 'Semantic search handles paraphrase; BM25 protects exact identifiers, acronyms, and error messages.', tradeoff: 'More retrieval work, better coverage of heterogeneous questions.' },
      { number: '02', title: 'RRF over manual score normalization', body: 'Vector similarity and BM25 scores have unrelated scales. Rank fusion avoids a brittle conversion layer.', tradeoff: 'RRF values order more than score magnitude.' },
      { number: '03', title: 'Local embeddings for the reference build', body: 'A lightweight sentence-transformer keeps development offline and makes the embedding layer inspectable.', tradeoff: 'Production selection should still be benchmarked against hosted models.' },
    ],
    limitations: [
      'The bundled documentation describes the retrieval design but does not include a reproducible recall benchmark, so no recall-lift claim is shown.',
      'Whitespace tokenization is intentionally simple; domain deployments should benchmark stemming, language support, and reranking.',
    ],
  },
  {
    id: 'sql-insight-agent',
    index: '03',
    title: 'SQL Insight Agent',
    shortTitle: 'Safe query loop',
    eyebrow: 'Natural-language analytics agent',
    thesis: 'Generating SQL is easy. Knowing when not to run it is the engineering work.',
    summary: 'A schema-aware agent translates questions into SQL, validates the command, executes against the Chinook database, and uses failures as structured feedback for another attempt.',
    role: 'Sole developer',
    status: 'Deployed API',
    accent: '#62d9e8',
    accentRgb: '98, 217, 232',
    position: { x: 71, y: 70 },
    capabilities: ['orchestrate', 'recover'],
    techStack: ['LangChain', 'FastAPI', 'SQLite', 'SQLAlchemy', 'Claude', 'Docker', 'Render'],
    proof: [
      { value: 'NL → SQL', label: 'interaction model', qualifier: 'plain-language questions over Chinook', sourceLabel: 'Project README', href: 'https://github.com/nikhilll30/sql-insight-agent' },
      { value: 'Read-only', label: 'safety posture', qualifier: 'destructive command rejection before execution', sourceLabel: 'Project README', href: 'https://github.com/nikhilll30/sql-insight-agent' },
      { value: 'REST', label: 'delivery surface', qualifier: 'FastAPI service with a separate Streamlit client', sourceLabel: 'Live API docs', href: 'https://sql-insight-agent.onrender.com/docs' },
    ],
    links: [
      { label: 'View source', href: 'https://github.com/nikhilll30/sql-insight-agent', kind: 'repository' },
      { label: 'Open live API docs', href: 'https://sql-insight-agent.onrender.com/docs', kind: 'live' },
    ],
    architecture: {
      nodes: [
        { id: 'question', label: 'Business question', meta: 'plain language', x: 7, y: 50 },
        { id: 'schema', label: 'Schema context', meta: 'tables + columns', x: 27, y: 26 },
        { id: 'agent', label: 'SQL agent', meta: 'generate + reason', x: 48, y: 50 },
        { id: 'guard', label: 'Safety gate', meta: 'read-only checks', x: 68, y: 50 },
        { id: 'database', label: 'SQLite', meta: 'Chinook data', x: 88, y: 28 },
        { id: 'retry', label: 'Recovery loop', meta: 'error feedback', x: 68, y: 78 },
        { id: 'answer', label: 'Plain answer', meta: 'result summary', x: 91, y: 72 },
      ],
      edges: [
        ['question', 'agent'], ['schema', 'agent'], ['agent', 'guard'], ['guard', 'database'],
        ['guard', 'retry'], ['retry', 'agent'], ['database', 'answer'],
      ],
      stages: [
        { label: 'Ask', title: 'Start with the decision, not database syntax', description: 'The user asks a business question while the service supplies schema context separately.', activeNodes: ['question', 'schema'], output: '“Which five customers generated the most revenue?”' },
        { label: 'Generate', title: 'Produce SQL against the real schema', description: 'The agent reasons over table and column names instead of guessing from a generic prompt.', activeNodes: ['schema', 'agent'], output: 'SELECT CustomerId, SUM(Total)…' },
        { label: 'Validate', title: 'Reject unsafe intent before execution', description: 'The safety gate blocks destructive commands and preserves the database as a read-only analytical surface.', activeNodes: ['agent', 'guard'], output: 'ALLOW: SELECT · REJECT: DROP / DELETE / UPDATE' },
        { label: 'Recover', title: 'Convert execution errors into useful feedback', description: 'A syntax or schema error returns to the agent with the relevant context instead of ending the session.', activeNodes: ['guard', 'retry', 'agent'], output: 'no such column → inspect schema → revise query' },
        { label: 'Explain', title: 'Translate rows back into a readable answer', description: 'Successful results are summarized for a person who never needed to write SQL.', activeNodes: ['database', 'answer'], output: 'Top customers ranked by total invoice value' },
      ],
    },
    decisions: [
      { number: '01', title: 'Schema reflection before generation', body: 'The model receives the actual database shape so identifiers are grounded in available tables and columns.', tradeoff: 'Adds a setup step but reduces avoidable execution errors.' },
      { number: '02', title: 'Safety checks outside the model', body: 'Destructive statements are rejected by deterministic application logic rather than prompt wording alone.', tradeoff: 'Rules must evolve with supported SQL dialects.' },
      { number: '03', title: 'Errors become loop state', body: 'Execution feedback is treated as data for the next attempt instead of a terminal exception.', tradeoff: 'Retry limits and observability are essential to avoid hidden loops.' },
    ],
    limitations: [
      'The demo uses a sample SQLite database; enterprise deployments need database-specific permissions, audit logs, and query cost controls.',
      'The repository does not include a reproducible execution-success benchmark, so the portfolio does not publish one.',
    ],
  },
  {
    id: 'pubmedqa-finetune',
    index: '04',
    title: 'PubMedQA BiomedBERT',
    shortTitle: 'Honest evaluation',
    eyebrow: 'Domain model adaptation',
    thesis: 'A modest result, measured honestly, reveals more engineering than a perfect-looking number.',
    summary: 'BiomedBERT is fine-tuned for yes/no/maybe classification on expert-labeled biomedical abstracts, with weighted cross-entropy used to address the minority “maybe” class.',
    role: 'NLP engineer',
    status: 'Model published',
    accent: '#bca7ff',
    accentRgb: '188, 167, 255',
    position: { x: 29, y: 70 },
    capabilities: ['evaluate'],
    techStack: ['BiomedBERT', 'PyTorch', 'Transformers', 'PubMedQA', 'Weighted CE', 'Hugging Face'],
    proof: [
      { value: '0.5147', label: 'macro F1', qualifier: 'final published evaluation', sourceLabel: 'Hugging Face model card', href: 'https://huggingface.co/nikhilteja30/pubmedqa-bert' },
      { value: '57%', label: 'accuracy', qualifier: '100-example validation split', sourceLabel: 'Hugging Face model card', href: 'https://huggingface.co/nikhilteja30/pubmedqa-bert' },
      { value: '0.00 → 0.37', label: '“maybe” class F1', qualifier: 'after weighted cross-entropy', sourceLabel: 'Training documentation', href: '/api/download-pdf/pubmedqa-finetune' },
    ],
    links: [
      { label: 'Open model card', href: 'https://huggingface.co/nikhilteja30/pubmedqa-bert', kind: 'model' },
      { label: 'View source', href: 'https://github.com/nikhilll30/pubmedqa-finetune', kind: 'repository' },
      { label: 'Read training PDF', href: '/api/download-pdf/pubmedqa-finetune', kind: 'documentation' },
    ],
    architecture: {
      nodes: [
        { id: 'dataset', label: 'PubMedQA', meta: '1,000 expert labels', x: 7, y: 50 },
        { id: 'split', label: 'Train / validation', meta: '900 / 100', x: 27, y: 50 },
        { id: 'tokenizer', label: 'Tokenizer', meta: '512 tokens', x: 47, y: 28 },
        { id: 'model', label: 'BiomedBERT', meta: '110M parameters', x: 66, y: 28 },
        { id: 'loss', label: 'Weighted loss', meta: 'class-aware CE', x: 56, y: 75 },
        { id: 'evaluation', label: 'Evaluation', meta: 'macro F1', x: 80, y: 67 },
        { id: 'hub', label: 'Model Hub', meta: 'published artifact', x: 94, y: 38 },
      ],
      edges: [
        ['dataset', 'split'], ['split', 'tokenizer'], ['tokenizer', 'model'],
        ['split', 'loss'], ['model', 'loss'], ['loss', 'evaluation'], ['evaluation', 'hub'],
      ],
      stages: [
        { label: 'Inspect', title: 'Start with the label distribution', description: 'The rare “maybe” class represents roughly 15% of examples, making raw accuracy an incomplete target.', activeNodes: ['dataset', 'split'], output: 'yes ≈ 55% · no ≈ 30% · maybe ≈ 15%' },
        { label: 'Encode', title: 'Use a model already fluent in biomedical language', description: 'Questions and abstracts are tokenized to BiomedBERT’s 512-token input limit.', activeNodes: ['tokenizer', 'model'], output: 'BiomedBERT + three-class classification head' },
        { label: 'Reweight', title: 'Make minority-class errors matter', description: 'Inverse-frequency weights increase the gradient penalty when the model misses rare “maybe” examples.', activeNodes: ['model', 'loss'], output: 'maybe weight ≈ 2.2× · yes weight ≈ 0.6×' },
        { label: 'Evaluate', title: 'Select checkpoints by macro F1', description: 'Each class contributes equally to the selection metric, regardless of how often it appears.', activeNodes: ['loss', 'evaluation'], output: 'macro F1 0.5147 · accuracy 0.57' },
        { label: 'Publish', title: 'Ship the artifact with its limitations visible', description: 'The model, hyperparameters, and training results are published for independent inspection.', activeNodes: ['evaluation', 'hub'], output: 'nikhilteja30/pubmedqa-bert' },
      ],
    },
    decisions: [
      { number: '01', title: 'Domain pretraining before task fine-tuning', body: 'BiomedBERT starts with vocabulary and representations learned from PubMed abstracts.', tradeoff: 'Domain fit improves, while the model remains limited by the small task dataset.' },
      { number: '02', title: 'Weighted loss over accuracy chasing', body: 'The objective forces the model to learn minority classes instead of maximizing the dominant label.', tradeoff: 'Overall accuracy remains modest, but class behavior becomes more useful.' },
      { number: '03', title: 'Macro F1 as the checkpoint metric', body: 'Equal class weighting makes failure on “maybe” visible and prevents a majority-class shortcut from looking successful.', tradeoff: 'The score is less flattering and more informative.' },
    ],
    limitations: [
      'The validation split contains only 100 examples, so the reported metrics have high uncertainty and should not be generalized clinically.',
      'This is a research classification project, not a medical device or diagnostic system.',
    ],
  },
];

export const projectsById = Object.fromEntries(projectsData.map((project) => [project.id, project]));

export const getNextProject = (projectId) => {
  const index = projectsData.findIndex((project) => project.id === projectId);
  return projectsData[(index + 1) % projectsData.length];
};

export const getCapability = (capabilityId) => capabilities.find((capability) => capability.id === capabilityId);
