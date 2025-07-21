"use client"

import { useState } from "react"
import { useAuth } from "@/context/auth-context-v2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail } from "lucide-react"
import Link from "next/link"

export function PasswordResetForm() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await requestPasswordReset(email)
      setSubmitted(true)
    } catch (error) {
      console.error("Password reset error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We've sent a password reset link to {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-4">
            <div className="rounded-full bg-green-100 p-3">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Please check your email and follow the instructions to reset your password.
            The link will expire in 1 hour.
          </p>
          <div className="text-center space-y-2">
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false)
                setEmail("")
              }}
              className="w-full"
            >
              Send Another Email
            </Button>
            <Link href="/sign-in" className="text-sm text-primary hover:underline">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Remember your password? </span>
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}