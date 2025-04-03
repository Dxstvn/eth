"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowRight, Mail, Shield, Clock, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLoginModal from "@/components/admin-login-modal"
import { useAuth } from "@/context/auth-context"
import { useFirebase } from "@/components/firebase-provider"
import { useRouter } from "next/navigation"

export default function ComingSoonPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const { isAdmin } = useAuth()
  const { initialized } = useFirebase()
  const router = useRouter()
  const [statusMessage, setStatusMessage] = useState<{
    title: string
    message: string
    type: "success" | "error" | "info"
  } | null>(null)

  // Redirect to dashboard if already authenticated as admin
  useEffect(() => {
    if (initialized && isAdmin) {
      router.push("/dashboard")
    }
  }, [isAdmin, router, initialized])

  // Clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Regular email submission for waitlist
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setEmail("")
      setStatusMessage({
        title: "Success!",
        message: "You've been added to our waitlist. We'll notify you when we launch.",
        type: "success",
      })
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-900 to-teal-800 flex flex-col">
      {/* Status message toast */}
      {statusMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg min-w-[300px] animate-in slide-in-from-right ${
            statusMessage.type === "success"
              ? "bg-green-100 border-green-500 text-green-800"
              : statusMessage.type === "error"
                ? "bg-red-100 border-red-500 text-red-800"
                : "bg-blue-100 border-blue-500 text-blue-800"
          }`}
        >
          <div className="font-semibold">{statusMessage.title}</div>
          <div className="text-sm">{statusMessage.message}</div>
          <button
            onClick={() => setStatusMessage(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-teal-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
        <div className="max-w-3xl w-full text-center">
          {/* Lock icon at the top center - clickable for admin login */}
          <div className="flex justify-center mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAdminModalOpen(true)}
              className="bg-teal-600 rounded-full p-4 shadow-lg hover:bg-teal-700"
              disabled={!initialized}
            >
              <Lock className="h-8 w-8 text-white" />
              <span className="sr-only">Admin Login</span>
            </Button>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Secure Escrow <span className="text-teal-300">Coming Soon</span>
          </h1>

          <p className="text-xl text-teal-100 mb-12 max-w-2xl mx-auto">
            We're building a revolutionary platform for secure real estate transactions using cryptocurrency. Join our
            waitlist to be the first to know when we launch.
          </p>

          {/* Email Subscription Form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-12">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-700 h-5 w-5" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  className="pl-10 bg-white text-teal-900 border-teal-200 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600 text-white h-12" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Notify Me"}
                {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </div>
          </form>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: <Shield className="h-8 w-8 text-teal-300" />,
                title: "Secure Transactions",
                description: "Smart contract-based escrow ensures funds are only released when all conditions are met.",
              },
              {
                icon: <Clock className="h-8 w-8 text-teal-300" />,
                title: "Time Efficient",
                description: "Reduce closing time from weeks to days with our streamlined process.",
              },
              {
                icon: <Lock className="h-8 w-8 text-teal-300" />,
                title: "Trustless System",
                description: "Eliminate intermediaries while maintaining compliance with regulations.",
              },
            ].map((feature, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-teal-200/10">
                <div className="text-center flex flex-col items-center">
                  <div className="flex items-center justify-center mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-teal-100">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-teal-200/70">
        <p>© {new Date().getFullYear()} CryptoEscrow. All rights reserved.</p>
      </footer>

      {/* Admin Login Modal */}
      <AdminLoginModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />

      {/* Add CSS for animations */}
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes slide-in-from-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-in {
          animation-duration: 0.3s;
          animation-timing-function: ease-out;
          animation-fill-mode: both;
        }
        .slide-in-from-right {
          animation-name: slide-in-from-right;
        }
      `}</style>
    </div>
  )
}

