"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, AlertCircle, Mail, CheckCircle, Sparkles, KeyRound } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/context/auth-context-v2"
import PasswordlessSignInForm from "@/components/auth/passwordless/PasswordlessSignInForm"

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"reset" | "passwordless">("reset")

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email) {
      setError("Please enter your email address")
      return
    }

    setLoading(true)

    try {
      await requestPasswordReset(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email. Please try again.")
      console.error("Password reset error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      {/* Gradient header */}
      <div className="w-full bg-gradient-to-b from-teal-900 to-transparent h-32 absolute top-0 left-0 z-0"></div>

      <Link
        href="/login"
        className="absolute top-8 left-8 z-10 flex items-center text-white hover:text-gold-300 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
      </Link>

      <div className="w-full max-w-md z-10">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 rounded-md bg-teal-900 flex items-center justify-center text-white font-bold mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gold-500"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span className="text-2xl font-display font-semibold text-teal-900">
                Clear<span className="text-gold-500">Hold</span>
              </span>
            </div>
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-teal-900 font-display">
            Can't Access Your Account?
          </h1>
          <p className="mt-2 text-neutral-600">
            Choose how you'd like to regain access
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "reset" | "passwordless")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="reset" className="data-[state=active]:bg-teal-900 data-[state=active]:text-white">
              <KeyRound className="mr-2 h-4 w-4" />
              Reset Password
            </TabsTrigger>
            <TabsTrigger value="passwordless" className="data-[state=active]:bg-teal-900 data-[state=active]:text-white">
              <Sparkles className="mr-2 h-4 w-4" />
              Passwordless Sign In
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reset" className="mt-0">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-display">Reset Your Password</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {error && activeTab === "reset" && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success ? (
                  <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Email Sent</AlertTitle>
                    <AlertDescription>
                      If an account exists with the email {email}, you will receive a password reset link shortly.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-teal-900 hover:bg-teal-800 text-white font-medium" 
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </form>
                )}
              </CardContent>
              <CardFooter className="flex justify-center pb-6">
                <p className="text-sm text-neutral-600">
                  Remember your password?{" "}
                  <Link href="/login" className="text-teal-700 hover:text-teal-900">
                    Back to login
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="passwordless" className="mt-0">
            <PasswordlessSignInForm 
              className="border-0 shadow-lg"
              initialEmail={email}
              onSuccess={(sentEmail) => {
                // Success is handled within the component
                console.log("Magic link sent to:", sentEmail)
              }}
              onError={(error) => {
                console.error("Passwordless error:", error)
              }}
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-neutral-600">
                Prefer to reset your password?{" "}
                <Button
                  variant="link"
                  className="text-teal-700 hover:text-teal-900 p-0 h-auto"
                  onClick={() => setActiveTab("reset")}
                >
                  Use password reset
                </Button>
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Why choose passwordless?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• No need to remember or create a new password</li>
            <li>• More secure than traditional passwords</li>
            <li>• Quick access with just your email</li>
            <li>• Works across all your devices</li>
          </ul>
        </div>
      </div>
    </div>
  )
}