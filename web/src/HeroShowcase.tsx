import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

/* ---- typewriter (always animates while run=true) ---- */
function Typewriter({ text, cps = 42, run }: { text: string; cps?: number; run: boolean }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) {
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
  }, [text, cps, run])
  return (
    <>
      {text.slice(0, n)}
      {run && n < text.length && <span className="caret" />}
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

/* ---- Slide 1: animated chat (plays once per mount; carousel remounts to replay) ---- */
function SlideChat() {
  const [step, setStep] = useState(0) // 1 q1 · 2 answer · 3 q2
  useEffect(() => {
    const t = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 1200),
      setTimeout(() => setStep(3), 5000),
    ]
    return () => t.forEach(clearTimeout)
  }, [])

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
function SlidePro() {
  // 0 listening · 1 transcribing · 2 heard#1 · 3 heard#2 · 4 combined · 5 answer
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 2700),
      setTimeout(() => setStep(3), 3900),
      setTimeout(() => setStep(4), 5500),
      setTimeout(() => setStep(5), 6900),
    ]
    return () => t.forEach(clearTimeout)
  }, [])

  return (
    <div className="demo demo-pro">
      <span className="stealth-badge">{I.eyeOff} Stealth on · hidden from screen share</span>

      <span className="listen-chip">
        <span className="rec-dot" /> Listening <Bars />
      </span>

      {step >= 1 && (
        <motion.div className="bubble them" {...fade}>
          <span className="who">Interviewer</span>
          <Typewriter run={step === 1} text="So, why do you want to work here?" />
        </motion.div>
      )}

      <AnimatePresence>
        {step >= 2 && step <= 3 && (
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
            text="Your mission to make hiring fairer maps to my last role — and in three years I want to be leading that work here."
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
const DWELL = [9500, 12500] // ms per slide — long enough for each sequence to finish

export function HeroShowcase() {
  const [index, setIndex] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [paused, setPaused] = useState(false)

  function go(to: number) {
    setIndex(((to % SLIDES.length) + SLIDES.length) % SLIDES.length)
    setCycle((c) => c + 1)
  }

  // Auto-rotate: re-arm a timer on every slide change; pause on hover.
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => go(index + 1), DWELL[index])
    return () => clearTimeout(t)
  }, [index, cycle, paused])

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
                key={`${index}-${cycle}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: '100%' }}
              >
                <Comp />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <button className="car-arrow left" aria-label="Previous slide" onClick={() => go(index - 1)}>
          {I.chevL}
        </button>
        <button className="car-arrow right" aria-label="Next slide" onClick={() => go(index + 1)}>
          {I.chevR}
        </button>
      </motion.div>

      <div className="dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.label}
            className={`dot${i === index ? ' active' : ''}`}
            aria-label={s.label}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  )
}
