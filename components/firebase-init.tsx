"use client"

import { useEffect } from "react"
import { app } from "@/lib/firebase"

export default function FirebaseInit() {
  useEffect(() => {
    if (app) {
      console.log("Firebase initialized successfully")
    } else {
      console.error("Firebase initialization failed")
    }
  }, [])

  return null // This component doesn't render anything
}

