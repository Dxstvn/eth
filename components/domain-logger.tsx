"use client"

import { useEffect } from "react"

export default function DomainLogger() {
  useEffect(() => {
    console.log("Current domain:", window.location.hostname)
  }, [])

  return null
}

