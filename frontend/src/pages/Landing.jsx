import { Link } from 'react-router-dom'

const FEATURES = [
  {
    title: 'Evidence gate',
    body: 'Retrieval is checked before a single token is generated. Weak matches trigger a repair search — and a clean abstention instead of a confident guess.',
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Page-level citations',
    body: 'Every explanation, MCQ and revision note traces back to a source file and page — verified against the exact chunks that were retrieved.',
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h8l4 4v14H7z" />
        <path d="M15 3v4h4" />
        <path d="M10 12h6M10 16h6" />
      </svg>
    ),
  },
  {
    title: 'Seven-section output',
    body: 'One prompt returns the full study pack: explanation, key concepts, worked examples, MCQs, descriptive questions, a difficulty quiz and revision notes.',
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h10" />
        <circle cx="20" cy="18" r="2" />
      </svg>
    ),
  },
  {
    title: 'Teacher workspace',
    body: 'Structured templates for lesson plans, quizzes, question papers and activities — generated from approved material, then edited and saved by the teacher.',
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    title: 'Classroom & quizzes',
    body: 'Classes join by code. Teachers publish material, assignments and auto-scored quizzes; descriptive answers are flagged for manual review, never faked.',
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M16 8h5M18.5 5.5v5" />
      </svg>
    ),
  },
  {
    title: 'Adaptive practice',
    body: 'Quiz results roll up per concept. Weak spots are flagged as possible misconceptions and drive targeted practice at the right difficulty.',
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M7 15l4-5 3 3 5-7" />
      </svg>
    ),
  },
]

const STEPS = [
  {
    title: 'Upload the approved corpus',
    body: 'Teachers create a subject collection and upload textbook PDFs. Pages are chunked, embedded locally with MiniLM and stored in ChromaDB.',
  },
  {
    title: 'Ask inside the syllabus',
    body: 'Students pick a collection and a difficulty. The query is embedded, gated for evidence sufficiency, and repaired before any model call.',
  },
  {
    title: 'Review cited output',
    body: 'Grounded sections arrive with source references. When the material does not cover the topic, the system says so and lists what is available.',
  },
]

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-glow glow-a" aria-hidden="true" />
      <div className="landing-glow glow-b" aria-hidden="true" />
      <div className="landing-glow glow-c" aria-hidden="true" />

      <header className="hero">
        <div>
          <span className="eyebrow rise">Curriculum-grounded RAG</span>
          <h1 className="hero-title rise d1">
            Teaching material that never leaves the <em>syllabus</em>.
          </h1>
          <p className="hero-sub rise d2">
            EduGen turns teacher-approved textbooks into lesson plans, quizzes and revision
            notes — generated only from your uploaded material, cited down to the page, and
            honest enough to abstain when the answer isn&apos;t there.
          </p>
          <div className="hero-ctas rise d3">
            <Link to="/signup" className="btn btn-primary">Create an account</Link>
            <Link to="/login" className="btn btn-ghost">Log in</Link>
          </div>
          <ul className="hero-proof rise d4">
            <li>7-section study packs</li>
            <li>Page-level citations</li>
            <li>Abstains on thin evidence</li>
          </ul>
        </div>

        <aside className="hero-demo rise d3" aria-hidden="true">
          <div className="demo-card demo-main">
            <div className="demo-top">
              <span className="demo-dot" />
              Generated · grounded
            </div>
            <p className="demo-line">
              <strong>Newton&apos;s Second Law</strong> — the rate of change of momentum of a
              body is proportional to the applied force and takes place in the direction of
              the force.
            </p>
            <div className="demo-cites">
              <span className="cite">NCERT_Phy_Ch5.pdf · p.92</span>
              <span className="cite">Notes_Mechanics.pdf · p.14</span>
            </div>
            <div className="demo-meter">
              <span>Evidence</span>
              <span className="meter"><i style={{ width: '82%' }} /></span>
              <b>0.82 sufficient</b>
            </div>
          </div>
          <div className="demo-card demo-side">
            <div className="demo-top">
              <span className="demo-dot amber" />
              Blocked before guessing
            </div>
            <p className="demo-line">
              &ldquo;Thermodynamics of black holes&rdquo; isn&apos;t covered by this
              collection. Available: NCERT_Phy_Ch5.pdf, Notes_Mechanics.pdf.
            </p>
            <div className="demo-cites">
              <span className="cite amber">Abstained · evidence 0.11</span>
            </div>
          </div>
        </aside>
      </header>

      <section className="section">
        <div className="section-head">
          <h2>Built for accuracy, not vibes</h2>
          <p>
            A generic model will happily invent a physics chapter. EduGen is designed around
            the opposite question: <em>is there enough evidence to answer at all?</em>
          </p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <article className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>How it works</h2>
          <p>Three steps from a PDF to a cited, classroom-ready study pack.</p>
        </div>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div className="step" key={s.title}>
              <span className="step-no">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Two sides of the same classroom</h2>
          <p>Teachers control the corpus. Students get a grounded, read-only study companion.</p>
        </div>
        <div className="roles">
          <article className="role-card teacher">
            <h3>For teachers</h3>
            <p>Own the source of truth, then let the pipeline do the drafting.</p>
            <ul className="role-list">
              <li>Create subject collections and upload multiple PDFs</li>
              <li>Generate lesson plans, quizzes and question papers from templates</li>
              <li>Edit, save and publish material to your digital classroom</li>
              <li>Track quiz performance and per-concept misconceptions</li>
            </ul>
            <Link to="/signup" className="btn btn-yellow">Start teaching →</Link>
          </article>
          <article className="role-card student">
            <h3>For students</h3>
            <p>See what the syllabus covers before you ask — and get answers you can cite.</p>
            <ul className="role-list">
              <li>Browse approved collections (file names only, no downloads)</li>
              <li>Generate explanations and quizzes at your difficulty</li>
              <li>Save any answer into a personal notes library</li>
              <li>Practise weak concepts with adaptive follow-ups</li>
            </ul>
            <Link to="/signup" className="btn btn-primary">Start learning →</Link>
          </article>
        </div>
      </section>

      <section className="cta-band">
        <h2>Ready to ground your classroom?</h2>
        <p>
          Runs locally on FastAPI, ChromaDB and React. Create a teacher or student account and
          upload your first textbook in minutes.
        </p>
        <Link to="/signup" className="btn btn-primary">Get started free</Link>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <span>
            <b>EduGen</b> — RAG-Based Educational Content Generator · local demo
          </span>
          <div className="stack-chips">
            <span>FastAPI</span>
            <span>ChromaDB</span>
            <span>MiniLM</span>
            <span>React</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
