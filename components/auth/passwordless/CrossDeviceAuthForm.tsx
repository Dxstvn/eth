"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  ArrowRight, 
  AlertCircle,
  Info,
  Mail,
  Shield
} from "lucide-react"

interface CrossDeviceAuthFormProps {
  onSubmit: (email: string) => void
  isLoading?: boolean
  error?: string | null
  className?: string
}

export default function CrossDeviceAuthForm({
  onSubmit,
  isLoading = false,
  error,
  className
}: CrossDeviceAuthFormProps) {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)

    if (!email) {
      setEmailError("Please enter your email address")
      return
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    onSubmit(email)
  }

  return (
    <Card className={className}>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
              <Monitor className="h-8 w-8 text-teal-900" />
            </div>
            <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center border-2 border-white">
              <Smartphone className="h-5 w-5 text-gold-700" />
            </div>
          </div>
        </div>
        <CardTitle className="text-2xl font-display">Cross-Device Sign In</CardTitle>
        <CardDescription className="text-base">
          It looks like you're signing in from a different device
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* Security Info */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Security Notice:</strong> We detected that you clicked the sign-in link on a different device than where you requested it. For your security, please confirm your email address.
          </AlertDescription>
        </Alert>

        {/* Device Icons */}
        <div className="flex justify-center items-center gap-4 py-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center mb-2">
              <Smartphone className="h-6 w-6 text-neutral-600" />
            </div>
            <p className="text-xs text-neutral-500">Mobile</p>
          </div>
          
          <ArrowRight className="h-5 w-5 text-neutral-400" />
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-2">
              <Monitor className="h-6 w-6 text-teal-900" />
            </div>
            <p className="text-xs text-neutral-500">Desktop</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {(error || emailError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || emailError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-teal-900 font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 focus:ring-teal-500"
                disabled={isLoading}
                autoFocus
                required
              />
            </div>
            <p className="text-xs text-neutral-500">
              Enter the same email you used to request the sign-in link
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-teal-900 hover:bg-teal-800 text-white font-medium"
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Complete Sign In"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        {/* Additional Info */}
        <Alert className="border-neutral-200">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Why am I seeing this?</strong> You requested a sign-in link on one device but opened it on another. This extra step helps protect your account from unauthorized access.
          </AlertDescription>
        </Alert>

        {/* Tips */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-neutral-900 mb-2">Tips for next time:</h4>
          <ul className="space-y-1 text-sm text-neutral-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Open the sign-in link on the same device where you requested it</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Use a password manager that syncs across devices</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Consider using our mobile app for easier access</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}