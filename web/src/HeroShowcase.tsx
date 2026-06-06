import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { AplombMark } from './Logo'

/* ---- tiny inline icons ---- */
const I = {
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  eyeOff: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.2A9 9 0 0 1 12 4c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.1 6.1A13 13 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 3.9-.9" />
      <path d="m2 2 20 20" />
    </svg>
  ),
  chevL: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  chevR: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
}

/* ---- typewriter ---- */
function Typewriter({ text, cps = 42, run, reduce }: { text: string; cps?: number; run: boolean; reduce: boolean }) {
  const [n, setN] = useState(reduce ? text.length : 0)
  useEffect(() => {
    if (reduce || !run) {
      setN(text.length)
      return
    }
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setN(i)
      if (i >= text.length) clearInterval(id)
    }, 1000 / cps)
    return () => clearInterval(id)
  }, [text, cps, run, reduce])
  const typing = !reduce && run && n < text.length
  return (
    <>
      {text.slice(0, n)}
      {typing && <span className="caret" />}
    </>
  )
}

const Bars = () => (
  <span className="bars" aria-hidden="true">
    {Array.from({ length: 5 }).map((_, i) => (
      <span className="bar-i" key={i} style={{ animationDelay: `${i * 0.12}s` }} />
    ))}
  </span>
)

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

/* ---- Slide 1: animated chat ---- */
function SlideChat({ reduce }: { reduce: boolean }) {
  const [loop, setLoop] = useState(0)
  const [step, setStep] = useState(reduce ? 3 : 0) // 1 q1 · 2 answer · 3 q2

  useEffect(() => {
    if (reduce) return
    setStep(0)
    const t = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 1200),
      setTimeout(() => setStep(3), 4600),
      setTimeout(() => setLoop((l) => l + 1), 8600),
    ]
    return () => t.forEach(clearTimeout)
  }, [loop, reduce])

  return (
    <div className="demo">
      {step >= 1 && (
        <motion.div className="bubble me" {...fade}>
          Tell me about a time you handled a tough customer.
        </motion.div>
      )}
      {step >= 2 && (
        <motion.div className="bubble ai" {...fade}>
          <Typewriter
            run={step === 2}
            reduce={reduce}
            text="I owned a billing escalation end-to-end: acknowledged the error, walked them through the refund, looped in finance, and followed up next day. They stayed — and later upgraded."
          />
        </motion.div>
      )}
      {step >= 3 && (
        <motion.div className="bubble me" {...fade}>
          What's your greatest strength?
        </motion.div>
      )}
      <div className="composer">
        Ask a question…
        <span className="send">{I.arrow}</span>
      </div>
    </div>
  )
}

/* ---- Slide 2: animated Pro demo (listen → transcribe → combine → answer + stealth) ---- */
function SlidePro({ reduce }: { reduce: boolean }) {
  const [loop, setLoop] = useState(0)
  // 0 listening · 1 transcribing · 2 heard#1 · 3 heard#2 · 4 combined · 5 answer
  const [step, setStep] = useState(reduce ? 5 : 0)

  useEffect(() => {
    if (reduce) return
    setStep(0)
    const t = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 2600),
      setTimeout(() => setStep(3), 3600),
      setTimeout(() => setStep(4), 5200),
      setTimeout(() => setStep(5), 6400),
      setTimeout(() => setLoop((l) => l + 1), 10500),
    ]
    return () => t.forEach(clearTimeout)
  }, [loop, reduce])

  return (
    <div className="demo demo-pro">
      <span className="stealth-badge">{I.eyeOff} Stealth on · hidden from screen share</span>

      <span className="listen-chip">
        <span className="rec-dot" /> Listening <Bars />
      </span>

      {step >= 1 && (
        <motion.div className="bubble them" {...fade}>
          <span className="who">Interviewer</span>
          <Typewriter run={step === 1} reduce={reduce} text="So, why do you want to work here?" />
        </motion.div>
      )}

      <AnimatePresence>
        {step >= 2 && step < 4 && (
          <motion.div className="heard" {...fade} exit={{ opacity: 0, y: -6 }} key="h1">
            Heard: "Why do you want to work here?"
            <span className="heard-actions"><b>Use</b> · Edit · <b>Combine</b></span>
          </motion.div>
        )}
        {step === 3 && (
          <motion.div className="heard" {...fade} exit={{ opacity: 0, y: -6 }} key="h2">
            Heard: "…and where do you see yourself in 3 years?"
            <span className="heard-actions"><b>Use</b> · Edit · <b>Combine</b></span>
          </motion.div>
        )}
        {step >= 4 && (
          <motion.div className="heard combined" {...fade} key="hc">
            <span className="merge-tag">Combined</span>
            "Why this company — and where do you see yourself in 3 years?"
            <span className="heard-actions"><b>Use</b> · Edit</span>
          </motion.div>
        )}
      </AnimatePresence>

      {step >= 5 && (
        <motion.div className="bubble ai" {...fade}>
          <Typewriter
            run={step === 5}
            reduce={reduce}
            text="Your mission to make hiring fairer maps to my last role… and in three years I want to be leading that work here."
          />
        </motion.div>
      )}
    </div>
  )
}

const SLIDES = [
  { label: 'Practice', Comp: SlideChat },
  { label: 'Pro · live', Comp: SlidePro },
]

export function HeroShowcase() {
  const reduce = useReducedMotion() ?? false
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduce || paused) return
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 8500)
    return () => clearInterval(id)
  }, [reduce, paused])

  const { label, Comp } = SLIDES[index]

  return (
    <div className="mock-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <motion.div
        className="mock"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="bar">
          <i /><i /><i />
          <span className="slide-label">{label}</span>
        </div>
        <div className="body">
          <div className="rail">
            <div className="logo"><AplombMark size={15} className="dia" /> Aplomb</div>
            <div className={`navi${index === 1 ? ' active' : ''}`}>{index === 1 ? 'Live' : ''}</div>
            <div className={`navi${index === 0 ? ' active' : ''}`} />
            <div className="navi" />
            <div className="navi" />
          </div>
          <div className="main">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: '100%' }}
              >
                <Comp reduce={reduce} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {!reduce && (
          <>
            <button className="car-arrow left" aria-label="Previous" onClick={() => setIndex((i) => (i + SLIDES.length - 1) % SLIDES.length)}>
              {I.chevL}
            </button>
            <button className="car-arrow right" aria-label="Next" onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}>
              {I.chevR}
            </button>
          </>
        )}
      </motion.div>

      <div className="dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.label}
            className={`dot${i === index ? ' active' : ''}`}
            aria-label={s.label}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}
