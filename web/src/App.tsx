import { useEffect, useState, type JSX, type ReactNode } from 'react'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion'
import { SmokeBackground } from './SmokeBackground'
import { AplombMark } from './Logo'
import { Reveal, Stagger, Item, Counter } from './reveal'

// Download routes through the styled /download.html page (auto-starts the file +
// shows install/SmartScreen steps). The actual installer asset URL/version lives
// in web/public/download.html — edit it there per release.
const DOWNLOAD_PAGE = '/download.html'
// Lemon Squeezy buy-link isn't set up yet → "Get Pro" routes to the download CTA
// (Pro is unlocked in-app via Account → Upgrade). Swap in the LS URL later.
const PRO_CHECKOUT_URL = '#download'
const PRO_PRICE = '$9' // monthly
const CONTACT_EMAIL = 'hello@aplomb.app'

/* ---------- inline icons (coral, stroke) ---------- */
const ico = {
  doc: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </svg>
  ),
  target: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  ),
  kanban: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="10" y="4" width="5" height="10" rx="1" />
      <rect x="17" y="4" width="4" height="13" rx="1" />
    </svg>
  ),
  mic: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </svg>
  ),
  lock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  eye: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  chev: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  dash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  ),
}

interface Feature {
  icon: JSX.Element
  title: string
  pro?: boolean
  body: string
}

const FEATURES: Feature[] = [
  { icon: ico.doc, title: 'Tailored practice answers', body: 'Upload your resume + the job description and get strong, personal answers to likely questions — grounded only in your real experience.' },
  { icon: ico.target, title: 'Coaching feedback', body: 'Each session ends with a report: what landed, keyword coverage vs. the role, and concrete ways to tighten your delivery.' },
  { icon: ico.kanban, title: 'Application tracker', body: 'Track every role — wishlist, applied, interviewing, offer — with notes, AI resume↔JD gap analysis, and cover-letter drafts.' },
  { icon: ico.mic, title: 'Live practice assistant', pro: true, body: 'Listens to the question audio and surfaces suggested talking points in real time — in mock practice or a live call.' },
  { icon: ico.lock, title: 'Private by design', body: 'Bring your own API key or run fully local with Ollama — your resume and answers stay on your machine, encrypted.' },
  { icon: ico.shield, title: 'Stealth mode', pro: true, body: 'Turn it on and the Aplomb window is hidden from screen sharing and recording (Zoom, Meet, Teams) and drops off the taskbar — your notes stay private to you, always on top while you talk.' },
]

const STATS: { value: ReactNode; label: string }[] = [
  { value: <Counter to={100} suffix="%" />, label: 'Runs on your machine' },
  { value: '$0', label: 'Free forever for prep' },
  { value: <Counter to={6} suffix="+" />, label: 'AI tools built in' },
  { value: '∞', label: 'Practice sessions' },
]

const COMPARE: { label: string; aplomb: boolean; generic: boolean }[] = [
  { label: 'Private — your own key or fully local', aplomb: true, generic: false },
  { label: 'Stays private on calls — hidden from screen share & recording', aplomb: true, generic: false },
  { label: 'Answers grounded only in your real resume + the JD', aplomb: true, generic: false },
  { label: 'Coaching report after every session', aplomb: true, generic: false },
  { label: 'Application tracker + cover-letter drafts', aplomb: true, generic: false },
  { label: 'Free, unlimited preparation', aplomb: true, generic: false },
]

const STEPS = [
  { h: 'Add your resume + the job', p: 'Paste a job description and pick a resume. Add any extra context you want answers to reflect.' },
  { h: 'Practice with AI answers', p: 'Get sharp, first-person answers to likely questions and rehearse them out loud.' },
  { h: 'Review & track', p: 'Read your coaching report, refine, and track every application to offer.' },
]

const FAQ = [
  { q: 'Is my data private?', a: 'Yes. Everything runs on your computer. You use your own AI key (Groq free tier) or run locally with Ollama — your resume and answers are never stored on our servers, and your key is encrypted on-device.' },
  { q: 'What platforms are supported?', a: 'Windows today. Mac and Linux are planned.' },
  { q: 'Is the window hidden during screen sharing?', a: 'With Stealth mode on (Windows), Aplomb uses OS screen-capture protection so its window is excluded from screen sharing and recording in apps like Zoom, Meet, and Teams, while staying visible to you. It is a privacy feature for your own setup, not a guarantee against every possible capture method.' },
  { q: 'What do I get with Pro?', a: 'The live practice assistant (real-time suggested talking points) and stealth mode. All preparation features — resume tailoring, practice answers, reports, and the tracker — are free and unlimited.' },
  { q: 'How does billing work?', a: 'Pro is a monthly subscription handled by our payment provider (Lemon Squeezy), who manages taxes and receipts. Cancel anytime.' },
]

const SECTIONS = ['features', 'stealth', 'how', 'pricing', 'faq']

/* ---------- scrollspy for the nav ---------- */
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [ids])
  return active
}

/* ---------- interactive (tilt) app mockup ---------- */
function Mockup() {
  const reduce = useReducedMotion()
  const mvX = useMotionValue(0)
  const mvY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mvY, [-0.5, 0.5], [7, -7]), { stiffness: 150, damping: 18 })
  const rotateY = useSpring(useTransform(mvX, [-0.5, 0.5], [-9, 9]), { stiffness: 150, damping: 18 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return
    const r = e.currentTarget.getBoundingClientRect()
    mvX.set((e.clientX - r.left) / r.width - 0.5)
    mvY.set((e.clientY - r.top) / r.height - 0.5)
  }
  function onLeave() {
    mvX.set(0)
    mvY.set(0)
  }

  const inner = (
    <div className="mock">
      <div className="bar">
        <i /><i /><i />
      </div>
      <div className="body">
        <div className="rail">
          <div className="logo"><AplombMark size={15} className="dia" /> Aplomb</div>
          <div className="navi active" />
          <div className="navi" />
          <div className="navi" />
          <div className="navi" />
        </div>
        <div className="main">
          <div className="bubble me">Tell me about a time you handled a tough customer.</div>
          <div className="bubble ai">
            I owned a billing escalation end-to-end: I acknowledged the error, walked the customer
            through the refund, looped in finance, and followed up the next day. They stayed — and
            later upgraded.
          </div>
          <div className="bubble me">What's your greatest strength?</div>
          <div className="composer">
            Ask a question…
            <span className="send">{ico.arrow}</span>
          </div>
        </div>
      </div>
    </div>
  )

  if (reduce) return <div className="mock-wrap">{inner}</div>

  return (
    <motion.div
      className="mock-wrap"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1100 }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {inner}
    </motion.div>
  )
}

/* ---------- FAQ accordion ---------- */
function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="faq">
      {FAQ.map((item, i) => {
        const isOpen = open === i
        return (
          <div className={`qa${isOpen ? ' open' : ''}`} key={item.q}>
            <button className="qa-head" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
              <span>{item.q}</span>
              <span className="qa-ico">{ico.chev}</span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  className="qa-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

export default function App() {
  const active = useActiveSection(SECTIONS)
  const cls = (id: string) => (active === id ? 'active' : '')

  return (
    <>
      <header className="nav">
        <div className="wrap row">
          <a className="brand" href="#top">
            <AplombMark size={20} className="dia" /> Aplomb
          </a>
          <nav className="links">
            <a className={`hide-sm ${cls('features')}`} href="#features">Features</a>
            <a className={`hide-sm ${cls('stealth')}`} href="#stealth">Stealth</a>
            <a className={`hide-sm ${cls('how')}`} href="#how">How it works</a>
            <a className={cls('pricing')} href="#pricing">Pricing</a>
            <motion.a className="btn btn-primary btn-sm" href={DOWNLOAD_PAGE} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              Download
            </motion.a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="hero" id="top">
        <SmokeBackground smokeColor="#d97757" />
        <div className="hero-scrim" />
        <div className="wrap hero-inner">
          <Reveal>
            <span className="eyebrow">Interview prep + stealth, on your desktop</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1>
              Walk into every interview <span className="accent">with aplomb.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="sub">
              Turn your resume and a job description into sharp, personal practice answers, coaching
              feedback, and an application tracker — rehearse the real questions, then keep your notes
              private on the call with Stealth mode.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="cta-row">
              <motion.a className="btn btn-primary" href={DOWNLOAD_PAGE} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                Download for Windows {ico.arrow}
              </motion.a>
              <motion.a className="btn btn-ghost" href="#pricing" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                See Pro
              </motion.a>
            </div>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="pills">
              <span className="pill">{ico.check} Free forever for prep</span>
              <span className="pill">{ico.lock} Private — your own key or local</span>
              <span className="pill">{ico.shield} Stealth — hidden from screen share</span>
            </div>
          </Reveal>
          <Mockup />
        </div>
      </div>

      {/* Stat band */}
      <section className="stat-band">
        <div className="wrap">
          <Stagger className="stats">
            {STATS.map((s, i) => (
              <Item className="stat" key={i}>
                <div className="stat-v">{s.value}</div>
                <div className="stat-l">{s.label}</div>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Features (bento) */}
      <section id="features">
        <div className="wrap">
          <Reveal>
            <h2 className="section-title">Everything you need to prepare</h2>
            <p className="section-sub">
              Built to help capable, skilled people show up at their best — not to replace the work of
              preparing.
            </p>
          </Reveal>
          <Stagger className="bento">
            {FEATURES.map((f) => (
              <Item className="feature" key={f.title}>
                <div className="ic">{f.icon}</div>
                <h3>
                  {f.title}
                  {f.pro && <span className="tag-pro">PRO</span>}
                </h3>
                <p>{f.body}</p>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Stealth */}
      <section id="stealth">
        <div className="wrap">
          <Reveal>
            <div className="stealth-card">
              <div className="ic">{ico.shield}</div>
              <h2 className="section-title">Stealth mode — your prep stays yours</h2>
              <p className="section-sub">
                Switch on Stealth and the Aplomb window is excluded from screen sharing and recording
                (Zoom, Meet, Teams) and hidden from the taskbar — your notes and answers stay visible to you
                alone, always on top while you talk.
              </p>
              <div className="pills center">
                <span className="pill">{ico.shield} Invisible to screen share &amp; recording</span>
                <span className="pill">{ico.check} Hidden from the taskbar</span>
                <span className="pill">{ico.check} Always-on-top notes</span>
              </div>
              <p className="stealth-note">Pro · Windows</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Why Aplomb */}
      <section id="why">
        <div className="wrap">
          <Reveal>
            <h2 className="section-title">Why Aplomb, not a generic chatbot</h2>
            <p className="section-sub">
              A focused tool for interviews — private, grounded in your real experience, and built around
              the whole job hunt.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="compare">
              <div className="compare-head">
                <span />
                <span className="ch-aplomb"><AplombMark size={16} className="dia" /> Aplomb</span>
                <span className="ch-generic">Generic chatbot</span>
              </div>
              {COMPARE.map((row) => (
                <div className="compare-row" key={row.label}>
                  <span className="cl">{row.label}</span>
                  <span className={`cell ${row.aplomb ? 'yes' : 'no'}`}>{row.aplomb ? ico.check : ico.dash}</span>
                  <span className={`cell ${row.generic ? 'yes' : 'no'}`}>{row.generic ? ico.check : ico.dash}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how">
        <div className="wrap">
          <Reveal>
            <h2 className="section-title">How it works</h2>
            <p className="section-sub">Three steps from blank page to interview-ready.</p>
          </Reveal>
          <Stagger className="steps">
            {STEPS.map((s, i) => (
              <Item className="step" key={s.h}>
                <div className="n">{i + 1}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing">
        <div className="wrap">
          <Reveal>
            <h2 className="section-title">Simple pricing</h2>
            <p className="section-sub">All preparation features are free. Upgrade for the live extras.</p>
          </Reveal>
          <Stagger className="prices">
            <Item className="price">
              <h3>Free</h3>
              <div className="amt">$0 <small>forever</small></div>
              <ul>
                <li>{ico.check} Unlimited practice sessions</li>
                <li>{ico.check} Resume + job-description tailoring</li>
                <li>{ico.check} Coaching reports & keyword coverage</li>
                <li>{ico.check} Application tracker + cover letters</li>
                <li>{ico.check} Bring your own key or local Ollama</li>
              </ul>
              <motion.a className="btn btn-ghost" href={DOWNLOAD_PAGE} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                Download free
              </motion.a>
            </Item>
            <Item className="price pro">
              <span className="ribbon">Most popular</span>
              <h3>Pro</h3>
              <div className="amt">{PRO_PRICE} <small>/ month</small></div>
              <ul>
                <li>{ico.check} Everything in Free</li>
                <li>{ico.check} Live practice assistant (real-time)</li>
                <li>{ico.check} Focus mode</li>
                <li>{ico.check} Priority updates</li>
              </ul>
              <motion.a className="btn btn-primary" href={PRO_CHECKOUT_URL} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                Get Pro {ico.arrow}
              </motion.a>
            </Item>
          </Stagger>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="wrap">
          <Reveal>
            <h2 className="section-title">Questions</h2>
          </Reveal>
          <Reveal delay={0.06}>
            <Faq />
          </Reveal>
        </div>
      </section>

      {/* CTA band */}
      <section className="band" id="download">
        <div className="wrap">
          <Reveal>
            <h2>Prepare like you mean it.</h2>
            <p>Free to download. Your data stays yours.</p>
            <motion.a className="btn btn-primary" href={DOWNLOAD_PAGE} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              Download for Windows {ico.arrow}
            </motion.a>
          </Reveal>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="cols">
            <div className="col" style={{ maxWidth: 280 }}>
              <div className="brand" style={{ marginBottom: 8 }}>
                <AplombMark size={18} className="dia" /> Aplomb
              </div>
              <p style={{ margin: 0 }}>Interview preparation & practice for job seekers.</p>
            </div>
            <div className="col">
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how">How it works</a>
            </div>
            <div className="col">
              <h5>Legal</h5>
              <a href="/privacy.html">Privacy</a>
              <a href="/terms.html">Terms</a>
              <a href="/refund.html">Refund policy</a>
            </div>
            <div className="col">
              <h5>Contact</h5>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
          </div>
          <div className="bottom">Aplomb © {new Date().getFullYear()}</div>
        </div>
      </footer>
    </>
  )
}
