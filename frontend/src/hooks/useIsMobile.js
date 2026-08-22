import { useState, useEffect } from 'react'

// Tracks whether the viewport is at or below `breakpoint` (matches the
// site's existing ~640px mobile breakpoint used elsewhere in global.css).
// Used across the admin dashboard's inline-styled components, which have
// no CSS classes to hang a real @media query off of.
export function useIsMobile(breakpoint = 640) {
  const query = `(max-width: ${breakpoint}px)`
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setIsMobile(e.matches)
    // Re-read on mount: `query` can change between the lazy initial state
    // and this effect, and the listener alone would not catch that.
    setIsMobile(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return isMobile
}
