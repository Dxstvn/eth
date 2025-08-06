"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  AlertCircle, 
  Clock, 
  Mail, 
  WifiOff,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  XCircle
} from "lucide-react"
import Link from "next/link"

interface ErrorStateProps {
  type: "expired" | "invalid-email" | "network" | "invalid-link" | "generic"
  message?: string
  onRetry?: () => void
  onBack?: () => void
  className?: string
}

export function PasswordlessErrorState({
  type,
  message,
  onRetry,
  onBack,
  className
}: ErrorStateProps) {
  const getErrorContent = () => {
    switch (type) {
      case "expired":
        return {
          icon: <Clock className="h-8 w-8 text-amber-600" />,
          iconBg: "bg-amber-100",
          title: "Link Expired",
          description: "This sign-in link has expired for your security.",
          suggestion: "Sign-in links are valid for 1 hour. Please request a new one.",
          primaryAction: {
            label: "Request New Link",
            href: "/login"
          }
        }

      case "invalid-email":
        return {
          icon: <Mail className="h-8 w-8 text-red-600" />,
          iconBg: "bg-red-100",
          title: "Invalid Email",
          description: message || "Please enter a valid email address.",
          suggestion: "Make sure your email is in the format: name@example.com",
          showRetry: true
        }

      case "network":
        return {
          icon: <WifiOff className="h-8 w-8 text-neutral-600" />,
          iconBg: "bg-neutral-100",
          title: "Connection Error",
          description: "We couldn't connect to our servers.",
          suggestion: "Please check your internet connection and try again.",
          showRetry: true,
          additionalActions: [
            {
              label: "Check System Status",
              href: "/status",
              external: true
            }
          ]
        }

      case "invalid-link":
        return {
          icon: <ShieldAlert className="h-8 w-8 text-red-600" />,
          iconBg: "bg-red-100",
          title: "Invalid Sign-in Link",
          description: "This link is not valid or may have been used already.",
          suggestion: "For security, each link can only be used once. Please request a new sign-in link.",
          primaryAction: {
            label: "Back to Login",
            href: "/login"
          }
        }

      case "generic":
      default:
        return {
          icon: <XCircle className="h-8 w-8 text-red-600" />,
          iconBg: "bg-red-100",
          title: "Something Went Wrong",
          description: message || "We encountered an error while processing your request.",
          suggestion: "Please try again. If the problem persists, contact support.",
          showRetry: true,
          additionalActions: [
            {
              label: "Contact Support",
              href: "/support"
            }
          ]
        }
    }
  }

  const errorContent = getErrorContent()

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full ${errorContent.iconBg} flex items-center justify-center`}>
            {errorContent.icon}
          </div>
        </div>
        <CardTitle className="text-2xl font-display">{errorContent.title}</CardTitle>
        <CardDescription className="text-base">
          {errorContent.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Details */}
        <Alert className="border-neutral-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorContent.suggestion}
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="space-y-3">
          {/* Primary Action */}
          {errorContent.primaryAction && (
            <Link href={errorContent.primaryAction.href} className="block">
              <Button className="w-full bg-teal-900 hover:bg-teal-800 text-white">
                {errorContent.primaryAction.label}
              </Button>
            </Link>
          )}

          {/* Retry Button */}
          {errorContent.showRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}

          {/* Back Button */}
          {onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>

        {/* Additional Actions */}
        {errorContent.additionalActions && errorContent.additionalActions.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            {errorContent.additionalActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="text-sm text-teal-700 hover:text-teal-900 block text-center"
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noopener noreferrer" : undefined}
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Specific error components for easier usage
export function ExpiredLinkError(props: Omit<ErrorStateProps, "type">) {
  return <PasswordlessErrorState {...props} type="expired" />
}

export function InvalidEmailError(props: Omit<ErrorStateProps, "type">) {
  return <PasswordlessErrorState {...props} type="invalid-email" />
}

export function NetworkError(props: Omit<ErrorStateProps, "type">) {
  return <PasswordlessErrorState {...props} type="network" />
}

export function InvalidLinkError(props: Omit<ErrorStateProps, "type">) {
  return <PasswordlessErrorState {...props} type="invalid-link" />
}

export function GenericError(props: Omit<ErrorStateProps, "type">) {
  return <PasswordlessErrorState {...props} type="generic" />
}