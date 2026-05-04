'use client'
import { useEffect, useState } from 'react'

export function useIsMobile(query = '(max-width: 640px)') {
  const [is, setIs] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setIs(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])
  return is
}
