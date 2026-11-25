import { useEffect, useState } from 'react'

function OfflineBanner() {
  return (
    <div className="pwa-offline-banner" role="status" aria-live="polite">
      <span className="pwa-status-dot" aria-hidden="true" />
      You’re offline. Your code drafts stay saved on this device; online actions are paused.
    </div>
  )
}

function UpdateToast({ onRefresh, onDismiss }) {
  return (
    <aside className="pwa-update-toast" role="status" aria-live="polite">
      <span className="pwa-update-icon" aria-hidden="true">↻</span>
      <div className="pwa-update-copy"><strong>An update is ready</strong><span>Refresh when you’re ready to load it.</span></div>
      <button className="pwa-update-refresh" onClick={onRefresh} type="button">Refresh</button>
      <button className="pwa-update-dismiss" aria-label="Dismiss update notice" onClick={onDismiss} type="button">Later</button>
    </aside>
  )
}

export default function PwaNotifications() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [waitingWorker, setWaitingWorker] = useState(null)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return undefined
    let mounted = true
    let registrationRef

    const showWaitingUpdate = (worker) => {
      if (mounted && navigator.serviceWorker.controller && worker?.state === 'installed') {
        setWaitingWorker(worker)
      }
    }

    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        if (!mounted) return
        registrationRef = registration
        if (registration.waiting) showWaitingUpdate(registration.waiting)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker?.addEventListener('statechange', () => showWaitingUpdate(newWorker))
        })
        registration.update().catch(() => {})
      })
      .catch(() => {})

    const updateTimer = window.setInterval(() => registrationRef?.update().catch(() => {}), 60 * 60 * 1000)
    return () => {
      mounted = false
      window.clearInterval(updateTimer)
    }
  }, [])

  function refreshForUpdate() {
    if (!waitingWorker) return
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    setWaitingWorker(null)
  }

  return <>
    {!online && <OfflineBanner />}
    {waitingWorker && <UpdateToast onRefresh={refreshForUpdate} onDismiss={() => setWaitingWorker(null)} />}
  </>
}
