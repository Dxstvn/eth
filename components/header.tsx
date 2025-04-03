"use client"
import Link from "next/link"
import { Menu, X, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"

interface HeaderProps {
  isLandingPage: boolean
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function Header({ isLandingPage, sidebarOpen, setSidebarOpen }: HeaderProps) {
  const isMobile = useMobile()

  if (isLandingPage) {
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
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle Menu">
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          ) : (
            <>
              <nav className="hidden md:flex gap-6 ml-6">
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
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden">
        <Menu className="h-6 w-6" />
        <span className="sr-only">Open sidebar</span>
      </Button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex-1"></div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Button variant="ghost" size="icon" className="text-gray-700">
            <Bell className="h-5 w-5" />
            <span className="sr-only">View notifications</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

