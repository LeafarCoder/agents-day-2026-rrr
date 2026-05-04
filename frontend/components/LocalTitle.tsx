'use client'

import { useEffect } from 'react'

export default function LocalTitle() {
  useEffect(() => {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      document.title += ' (local)'
    }
  }, [])
  return null
}
