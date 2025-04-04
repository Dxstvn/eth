"use client"

import { useEffect } from "react"

export default function DomainLogger() {
  useEffect(() => {
    // Log the current domain with styling
    console.log(
      "%c CURRENT DOMAIN INFO ",
      "background: #3b82f6; color: white; font-weight: bold; padding: 4px; border-radius: 4px;",
    )
    console.log("Domain:", window.location.hostname)
    console.log("Full URL:", window.location.href)
    console.log("Example v0 domain: lite.vusercontent.net")

    // Check if it's a v0 preview domain
    if (window.location.hostname.includes("lite.vusercontent.net")) {
      console.log(
        "%c V0 PREVIEW DOMAIN DETECTED ",
        "background: #10b981; color: white; font-weight: bold; padding: 4px; border-radius: 4px;",
      )
      console.log("Add this domain to Firebase authorized domains!")
    }
  }, [])

  return null
}

