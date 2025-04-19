"use client"

import { useEffect } from "react"
import { useAuth } from "@/context/auth-context"

export default function UserEmailTracker() {
  const { user } = useAuth()

  useEffect(() => {
    if (user && user.email) {
      localStorage.setItem("current-user-email", user.email)
    } else {
      localStorage.removeItem("current-user-email")
    }
  }, [user])

  // This component doesn't render anything
  return null
}
