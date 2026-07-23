import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

/**
 * Thin wrapper around lottie-react that fetches a remote animation JSON
 * (e.g. from lottiefiles.com) and falls back to a plain spinner if the
 * fetch fails, so a network hiccup never blanks the screen.
 *
 * Usage:
 *   <LottiePlayer src="/lottie/searching.json" size={140} />
 *   <LottiePlayer src="https://assets9.lottiefiles.com/packages/lf20_xyz.json" loop />
 */
export default function LottiePlayer({ src, size = 120, loop = true, className = '' }) {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setFailed(false)
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error('lottie fetch failed')
        return res.json()
      })
      .then((json) => { if (!cancelled) setData(json) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [src])

  if (failed) {
    return (
      <div
        className={`lottie-wrap ${className}`}
        style={{ width: size, height: size }}
      >
        <div
          className="spinner-ring"
          style={{ width: size * 0.6, height: size * 0.6 }}
        />
      </div>
    )
  }

  if (!data) {
    return <div className={`lottie-wrap ${className}`} style={{ width: size, height: size }} />
  }

  return (
    <div className={`lottie-wrap ${className}`} style={{ width: size, height: size }}>
      <Lottie animationData={data} loop={loop} style={{ width: size, height: size }} />
    </div>
  )
}
