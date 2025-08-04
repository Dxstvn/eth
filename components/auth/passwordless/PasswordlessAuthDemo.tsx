"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PasswordlessSignInForm,
  EmailSentCard,
  PasswordlessAuthToggle,
  EmailVerificationLoader,
  CrossDeviceEmailPrompt
} from "."

export default function PasswordlessAuthDemo() {
  const [demoEmail, setDemoEmail] = useState("user@example.com")
  const [authMethod, setAuthMethod] = useState(true) // true = passwordless

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-teal-900 font-display">
          Passwordless Authentication Components
        </h1>
        <p className="text-lg text-gray-600">
          Professional email-based authentication following ClearHold brand design principles
        </p>
      </div>

      <Tabs defaultValue="signin" className="max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="signin">Sign In Form</TabsTrigger>
          <TabsTrigger value="sent">Email Sent</TabsTrigger>
          <TabsTrigger value="toggle">Auth Toggle</TabsTrigger>
          <TabsTrigger value="loading">Loading State</TabsTrigger>
          <TabsTrigger value="cross-device">Cross Device</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="mt-8">
          <div className="flex justify-center">
            <PasswordlessSignInForm
              onSuccess={(email) => {
                setDemoEmail(email)
                console.log("Success:", email)
              }}
              onError={(error) => console.error("Error:", error)}
            />
          </div>
        </TabsContent>

        <TabsContent value="sent" className="mt-8">
          <div className="flex justify-center">
            <EmailSentCard
              email={demoEmail}
              onResendSuccess={() => console.log("Resend success")}
              onOpenEmailApp={() => console.log("Open email app")}
            />
          </div>
        </TabsContent>

        <TabsContent value="toggle" className="mt-8">
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Authentication Method Toggle</CardTitle>
                <CardDescription>
                  Switch between password and passwordless authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PasswordlessAuthToggle
                  isPasswordless={authMethod}
                  onToggle={setAuthMethod}
                />
                <p className="text-sm text-gray-600 text-center">
                  Current method: {authMethod ? "Passwordless (Email)" : "Traditional (Password)"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loading" className="mt-8">
          <div className="flex justify-center">
            <EmailVerificationLoader />
          </div>
        </TabsContent>

        <TabsContent value="cross-device" className="mt-8">
          <div className="flex justify-center">
            <CrossDeviceEmailPrompt
              onSubmit={async (email) => {
                console.log("Cross-device email:", email)
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 2000))
              }}
              onCancel={() => console.log("Cancelled")}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="max-w-4xl mx-auto bg-gray-50 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-teal-900 font-display">
          Component Features
        </h2>
        <ul className="space-y-2 text-gray-700">
          <li>✓ Professional "Continue with Email" button text instead of "Send Magic Link"</li>
          <li>✓ Rate limiting display with countdown timers</li>
          <li>✓ Email provider detection for quick access</li>
          <li>✓ Cross-device authentication support</li>
          <li>✓ Loading states with brand-compliant animations</li>
          <li>✓ Mobile-responsive design</li>
          <li>✓ Accessibility features (ARIA labels, keyboard navigation)</li>
          <li>✓ Error handling with user-friendly messages</li>
        </ul>
      </div>
    </div>
  )
}