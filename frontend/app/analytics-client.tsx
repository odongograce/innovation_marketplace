'use client'

import React, { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'

export default function AnalyticsClient() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {

    try {
      document.documentElement.setAttribute('data-google-analytics-opt-out', '')
    } catch (e) {
    
    }

    setMounted(true)
  }, [])

  if (!mounted) return null

  return <Analytics />
}
