import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Capture unhandled renderer errors to the local diagnostic log (no upload).
window.addEventListener('error', (e) => {
  window.app?.logError('renderer', `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`)
})
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason
  window.app?.logError('renderer', r instanceof Error ? (r.stack ?? r.message) : String(r))
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
