"use client"

import { useState } from "react"
import { ArrowRight, Clock, Lock, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"

export default function Home() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Get auth context
  const { signInWithGoogle } = useAuth()

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
      setError(null)
    } catch (err) {
      setError("Failed to sign in. Only admin emails are allowed.")
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleNotifyMe = () => {
    console.log("Notify me clicked for:", email)
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      setTimeout(() => setError(null), 3000)
      return
    }
    setError("Thanks! We'll notify you when we launch.")
    setTimeout(() => setError(null), 3000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-[#1a3b39] text-white">
      <div className="w-full max-w-6xl mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
        {/* Admin lock button at top */}
        <button
          onClick={handleGoogleSignIn}
          className="mb-12 bg-[#2a4b49] p-4 rounded-full hover:bg-[#345856] transition-colors"
        >
          <Lock className="h-5 w-5 text-[#5eead4]" />
        </button>

        {/* Main content */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-2">Secure Escrow</h1>
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-[#5eead4]">Coming Soon</h2>

          <p className="text-lg mb-12 text-gray-200">
            We're building a revolutionary platform for secure real estate transactions using cryptocurrency. Join our
            waitlist to be the first to know when we launch.
          </p>

          {/* Email subscription */}
          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-white text-gray-800 border-0"
              />
            </div>
            <Button
              onClick={handleNotifyMe}
              className="h-12 bg-[#5eead4] hover:bg-[#2dd4bf] text-[#1a3b39] font-medium px-6"
            >
              Notify Me <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className={`mb-8 text-center ${error.includes("Thanks") ? "text-[#5eead4]" : "text-red-300"}`}>
              {error}
            </div>
          )}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-8">
          {/* Card 1 */}
          <div className="bg-[#2a4b49]/70 backdrop-blur-sm p-8 rounded-lg text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-8 w-8 text-[#5eead4]" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Secure Transactions</h3>
            <p className="text-gray-300 text-sm">
              Smart contract-based escrow ensures funds are only released when all conditions are met.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#2a4b49]/70 backdrop-blur-sm p-8 rounded-lg text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-8 w-8 text-[#5eead4]" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Time Efficient</h3>
            <p className="text-gray-300 text-sm">
              Reduce closing time from weeks to days with our streamlined process.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#2a4b49]/70 backdrop-blur-sm p-8 rounded-lg text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-8 w-8 text-[#5eead4]" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Trustless System</h3>
            <p className="text-gray-300 text-sm">
              Eliminate intermediaries while maintaining compliance with regulations.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} CryptoEscrow. All rights reserved.</p>
      </footer>
    </div>
  )
}

