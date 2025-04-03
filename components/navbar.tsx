"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"

export default function Navbar() {
  const isMobile = useMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center">
            <div className="w-8 h-8 rounded-md bg-teal-600 flex items-center justify-center text-white font-bold mr-2">
              CE
            </div>
            <span className="text-xl font-bold">CryptoEscrow</span>
          </Link>
        </div>

        {isMobile ? (
          <>
            <Button variant="ghost" size="icon" onClick={toggleMenu} aria-label="Toggle Menu">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>

            {isMenuOpen && (
              <div className="absolute top-16 left-0 right-0 bg-white border-b shadow-lg p-4 flex flex-col gap-2">
                <Link href="/how-it-works" className="py-2 hover:text-teal-600" onClick={toggleMenu}>
                  How It Works
                </Link>
                <Link href="/features" className="py-2 hover:text-teal-600" onClick={toggleMenu}>
                  Features
                </Link>
                <Link href="/pricing" className="py-2 hover:text-teal-600" onClick={toggleMenu}>
                  Pricing
                </Link>
                <Link href="/about" className="py-2 hover:text-teal-600" onClick={toggleMenu}>
                  About
                </Link>
                <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                  <Button asChild variant="outline">
                    <Link href="/login" onClick={toggleMenu}>
                      Log In
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/signup" onClick={toggleMenu}>
                      Sign Up
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <nav className="hidden md:flex gap-6 ml-6">
              <Link href="/how-it-works" className="text-sm font-medium hover:text-teal-600 transition-colors">
                How It Works
              </Link>
              <Link href="/features" className="text-sm font-medium hover:text-teal-600 transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-sm font-medium hover:text-teal-600 transition-colors">
                Pricing
              </Link>
              <Link href="/about" className="text-sm font-medium hover:text-teal-600 transition-colors">
                About
              </Link>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <Button asChild variant="ghost">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

