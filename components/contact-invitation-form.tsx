"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Mail, Loader2 } from "lucide-react"
import { useContacts } from "@/context/contact-context"

interface ContactInvitationFormProps {
  onSuccess?: () => void
}

export default function ContactInvitationForm({ onSuccess }: ContactInvitationFormProps) {
  const { sendInvitation } = useContacts()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string }>({})

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset errors
    setErrors({})
    
    // Validate email
    if (!email.trim()) {
      setErrors({ email: "Email is required" })
      return
    }
    
    if (!validateEmail(email.trim())) {
      setErrors({ email: "Please enter a valid email address" })
      return
    }

    try {
      setLoading(true)
      await sendInvitation(email.trim())
      
      // Reset form
      setEmail("")
      onSuccess?.()
    } catch (err) {
      // Error is handled by the context and displayed via toast
      console.error("Error sending invitation:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-white shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-teal-600" />
          Invite Contact
        </CardTitle>
        <CardDescription>
          Send an invitation to connect with another ClearHold user
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-teal-700 hover:bg-teal-800"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}