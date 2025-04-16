"use client"

import type React from "react"

import { useState } from "react"
import { ArrowRight, CheckCircle, Lock, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import Link from "next/link"

export default function Home() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Get auth context
  const { signInWithGoogle } = useAuth()

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      setError("Failed to sign in. Only admin emails are allowed.")
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleNewsletterSignup = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      setTimeout(() => setError(null), 3000)
      return
    }

    setSuccess("Thanks for signing up! We'll keep you updated on our launch.")
    setEmail("")
    setTimeout(() => setSuccess(null), 5000)
  }

  const scrollToNewsletter = () => {
    document.getElementById("newsletter")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header with lock icon */}
      <header className="w-full bg-white border-b border-neutral-100 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-md bg-teal-900 flex items-center justify-center text-white font-bold mr-3">
              <span className="text-gold-500">CE</span>
            </div>
            <span className="text-xl font-display font-semibold text-teal-900">
              Crypto<span className="text-gold-500">Escrow</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleGoogleSignIn}
              className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
              aria-label="Developer Login"
            >
              <Lock className="h-5 w-5 text-teal-900" />
            </button>

            <Button
              onClick={scrollToNewsletter}
              className="bg-teal-900 hover:bg-teal-800 text-white hover:text-gold-300"
            >
              Join Waitlist
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-900 via-teal-800 to-teal-900"></div>

        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('/chromatic-flow.png')] bg-repeat opacity-5"></div>
        </div>

        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gold-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div
          className="absolute bottom-10 right-10 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>

        <div className="container px-4 md:px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col space-y-8">
              <div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6 text-white font-display">
                  <span className="block">Revolutionizing</span>
                  <span className="block">Real Estate with</span>
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-neutral-50 to-gold-300">
                    Blockchain Security
                  </span>
                </h1>
                <p className="text-xl text-neutral-100 max-w-[600px]">
                  Our escrow platform provides a secure, transparent solution for real estate transactions using
                  cryptocurrency, eliminating fraud and ensuring safe transfers.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={scrollToNewsletter} size="lg" variant="secondary" className="font-medium">
                  Join Waitlist <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  Learn More
                </Button>
              </div>

              <div className="flex items-center space-x-4 text-sm">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gold-400 flex items-center justify-center text-xs font-medium text-teal-900">
                    JD
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gold-300 flex items-center justify-center text-xs font-medium text-teal-900">
                    MK
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gold-200 flex items-center justify-center text-xs font-medium text-teal-900">
                    TS
                  </div>
                </div>
                <p className="text-neutral-100">Trusted by 1,000+ property investors</p>
              </div>
            </div>

            <div className="relative">
              <div className="glass-card p-6 shadow-2xl rounded-xl border border-white/10 backdrop-blur-sm">
                <img
                  src="/blockchain-real-estate-overview.png"
                  alt="Real estate transaction dashboard"
                  className="rounded-lg w-full"
                />
                <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-4 shadow-lg">
                  <p className="font-semibold text-teal-900 font-display">Average time saved</p>
                  <p className="text-3xl font-bold text-gold-500 font-display">14 days</p>
                  <p className="text-sm text-teal-700">per transaction</p>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-gold-500"></div>
              <div className="absolute top-1/2 -right-4 w-6 h-6 rounded-full bg-teal-500"></div>
            </div>
          </div>

          <div className="flex justify-center mt-16">
            <a href="#features" className="text-white/70 hover:text-white flex flex-col items-center animate-bounce">
              <span className="text-sm mb-2">Scroll to explore</span>
              <ChevronDown className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 bg-white">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-8">
            <h2 className="text-xl font-medium text-neutral-600">Trusted by industry leaders</h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70">
            <div className="h-8 w-32 bg-neutral-300 rounded flex items-center justify-center">
              <span className="text-neutral-600 font-semibold">COMPANY 1</span>
            </div>
            <div className="h-8 w-32 bg-neutral-300 rounded flex items-center justify-center">
              <span className="text-neutral-600 font-semibold">COMPANY 2</span>
            </div>
            <div className="h-8 w-32 bg-neutral-300 rounded flex items-center justify-center">
              <span className="text-neutral-600 font-semibold">COMPANY 3</span>
            </div>
            <div className="h-8 w-32 bg-neutral-300 rounded flex items-center justify-center">
              <span className="text-neutral-600 font-semibold">COMPANY 4</span>
            </div>
            <div className="h-8 w-32 bg-neutral-300 rounded flex items-center justify-center">
              <span className="text-neutral-600 font-semibold">COMPANY 5</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-neutral-50">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-teal-700 to-teal-900">
              Why Choose CryptoEscrow?
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-3xl mx-auto">
              Our platform combines the security of blockchain with the simplicity of traditional escrow services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300 hover:border-gold-200">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-teal-900 font-display">Secure Transactions</h3>
              <p className="text-neutral-600">
                Smart contract-based escrow ensures funds are only released when all conditions are met, providing
                unparalleled security.
              </p>
            </div>

            <div className="glass-card p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300 hover:border-gold-200">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gold-100 flex items-center justify-center text-gold-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-teal-900 font-display">Time Efficient</h3>
              <p className="text-neutral-600">
                Reduce closing time from weeks to days with our streamlined process, saving you valuable time and
                resources.
              </p>
            </div>

            <div className="glass-card p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300 hover:border-gold-200">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-teal-900 font-display">Trustless System</h3>
              <p className="text-neutral-600">
                Eliminate intermediaries while maintaining compliance with regulations, reducing costs and increasing
                transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-b from-white to-neutral-50">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-teal-700 to-teal-900">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-3xl mx-auto">
              Our platform simplifies the complex process of real estate transactions with cryptocurrency.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Connection line */}
            <div className="absolute top-24 left-1/2 h-[calc(100%-6rem)] w-0.5 bg-gradient-to-b from-teal-200 to-gold-200 -translate-x-1/2 hidden md:block"></div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
              {/* Step 1 */}
              <div className="relative md:text-right">
                <div className="md:absolute md:right-0 md:translate-x-1/2 z-10 bg-white w-12 h-12 rounded-full border-2 border-teal-200 flex items-center justify-center mb-4 md:mb-0 shadow-md">
                  <span className="text-teal-700 font-bold">1</span>
                </div>
                <div className="glass-card p-6 rounded-xl">
                  <h3 className="text-xl font-semibold mb-2 text-teal-900">Smart Contract-Based Escrow</h3>
                  <p className="text-neutral-600">
                    When a buyer and seller agree on a property sale, they deposit funds into a smart
                    contract-controlled escrow account.
                  </p>
                </div>
              </div>

              <div className="md:mt-32"></div>

              {/* Step 2 */}
              <div className="md:mt-32"></div>

              <div className="relative">
                <div className="md:absolute md:left-0 md:-translate-x-1/2 z-10 bg-white w-12 h-12 rounded-full border-2 border-gold-200 flex items-center justify-center mb-4 md:mb-0 shadow-md">
                  <span className="text-gold-700 font-bold">2</span>
                </div>
                <div className="glass-card p-6 rounded-xl">
                  <h3 className="text-xl font-semibold mb-2 text-teal-900">Verification & Compliance</h3>
                  <p className="text-neutral-600">
                    The platform verifies the identity of both parties (KYC/AML compliance) and ensures the property's
                    legal standing.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative md:text-right">
                <div className="md:absolute md:right-0 md:translate-x-1/2 z-10 bg-white w-12 h-12 rounded-full border-2 border-teal-200 flex items-center justify-center mb-4 md:mb-0 shadow-md">
                  <span className="text-teal-700 font-bold">3</span>
                </div>
                <div className="glass-card p-6 rounded-xl">
                  <h3 className="text-xl font-semibold mb-2 text-teal-900">Secure Fund Release</h3>
                  <p className="text-neutral-600">
                    Upon successful property transfer and legal approvals, the escrow releases funds to the seller
                    automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-teal-700 to-teal-900">
              What Our Clients Say
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-3xl mx-auto">
              Hear from property buyers, sellers, and agencies who have transformed their real estate transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              {/* Decorative quote mark */}
              <div className="absolute top-4 right-4 text-6xl text-teal-100 font-serif">"</div>

              <div className="relative z-10">
                <p className="text-lg mb-6">
                  "CryptoEscrow made our international property purchase seamless. The smart contract gave us peace of
                  mind throughout the entire process."
                </p>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center text-teal-800 font-semibold mr-3">
                    MC
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-teal-900">Michael Chen</p>
                    <p className="text-sm text-teal-600">Property Investor</p>
                  </div>
                </div>
              </div>

              {/* Decorative element */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600"></div>
            </div>

            <div className="glass-card p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              {/* Decorative quote mark */}
              <div className="absolute top-4 right-4 text-6xl text-gold-100 font-serif">"</div>

              <div className="relative z-10">
                <p className="text-lg mb-6">
                  "As a real estate agency, we've reduced transaction times by 70% using this platform. Our clients love
                  the transparency and security."
                </p>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center text-gold-800 font-semibold mr-3">
                    SJ
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-teal-900">Sarah Johnson</p>
                    <p className="text-sm text-gold-600">Real Estate Agent</p>
                  </div>
                </div>
              </div>

              {/* Decorative element */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-gold-400 to-gold-600"></div>
            </div>

            <div className="glass-card p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              {/* Decorative quote mark */}
              <div className="absolute top-4 right-4 text-6xl text-teal-100 font-serif">"</div>

              <div className="relative z-10">
                <p className="text-lg mb-6">
                  "The compliance features helped us navigate the complex regulatory landscape while still enjoying the
                  benefits of cryptocurrency transactions."
                </p>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center text-teal-800 font-semibold mr-3">
                    DR
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-teal-900">David Rodriguez</p>
                    <p className="text-sm text-teal-600">Property Developer</p>
                  </div>
                </div>
              </div>

              {/* Decorative element */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section id="newsletter" className="py-24 bg-gradient-to-b from-teal-900 to-teal-800 text-white">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">Join Our Waitlist</h2>
            <p className="text-xl text-teal-100 mb-8">
              Be the first to know when we launch and get exclusive early access to our platform.
            </p>

            <form onSubmit={handleNewsletterSignup} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-6">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-gold-400 focus:ring-gold-400"
                />
              </div>
              <Button
                type="submit"
                className="h-12 bg-gradient-to-r from-gold-400 to-gold-500 text-teal-900 font-medium px-6 hover:from-gold-500 hover:to-gold-600"
              >
                Join Waitlist <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            {error && <div className="mb-6 text-center text-red-300">{error}</div>}

            {success && (
              <div className="mb-6 text-center text-gold-300 flex items-center justify-center">
                <CheckCircle className="mr-2 h-5 w-5" />
                {success}
              </div>
            )}

            <p className="text-sm text-teal-200">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-neutral-200">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold mr-3">
                  <span className="text-gold-300">CE</span>
                </div>
                <span className="text-xl font-display font-semibold text-teal-900">
                  Crypto<span className="text-gold-500">Escrow</span>
                </span>
              </div>
              <p className="text-sm text-neutral-600">
                Secure, transparent escrow services for real estate transactions using cryptocurrency.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-teal-900 mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-teal-900 mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-teal-900 mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-teal-600 transition-colors">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-neutral-600">© {new Date().getFullYear()} CryptoEscrow. All rights reserved.</p>
            <p className="text-sm text-neutral-600 mt-4 md:mt-0">
              Cryptocurrency transactions are subject to applicable laws and regulations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
