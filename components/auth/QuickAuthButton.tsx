"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mail, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import PasswordlessSignInForm from "./passwordless/PasswordlessSignInForm"

interface QuickAuthButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  buttonText?: string
  showIcon?: boolean
}

export default function QuickAuthButton({
  variant = "default",
  size = "default",
  className,
  buttonText = "Quick Sign In",
  showIcon = true
}: QuickAuthButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {showIcon && <Sparkles className="mr-2 h-4 w-4" />}
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Sign In with Email</DialogTitle>
          <DialogDescription>
            Get a secure sign-in link sent to your email. No password needed.
          </DialogDescription>
        </DialogHeader>
        <PasswordlessSignInForm
          onSuccess={(email) => {
            console.log("Magic link sent to:", email)
            // Keep dialog open to show success state
          }}
          onError={(error) => {
            console.error("Auth error:", error)
          }}
        />
        <div className="mt-4 text-center text-sm text-neutral-600">
          <p>
            Need to use a password?{" "}
            <Button
              variant="link"
              className="text-teal-700 hover:text-teal-900 p-0 h-auto"
              onClick={() => {
                setOpen(false)
                window.location.href = "/login"
              }}
            >
              Use traditional login
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}