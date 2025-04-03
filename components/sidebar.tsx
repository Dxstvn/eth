"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Building2, LayoutDashboard, FileText, Wallet, Users, Settings, HelpCircle, X, Plus } from "lucide-react"

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname()

  const routes = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Transactions",
      href: "/transactions",
      icon: Building2,
    },
    {
      name: "Documents",
      href: "/documents",
      icon: FileText,
    },
    {
      name: "Wallet",
      href: "/wallet",
      icon: Wallet,
    },
    {
      name: "Contacts",
      href: "/contacts",
      icon: Users,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
    {
      name: "Help & Support",
      href: "/support",
      icon: HelpCircle,
    },
  ]

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
          <Link href="/dashboard" className="flex items-center">
            <div className="w-8 h-8 rounded-md bg-teal-600 flex items-center justify-center text-white font-bold mr-2">
              CE
            </div>
            <span className="text-xl font-bold">CryptoEscrow</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="md:hidden">
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* New Transaction button */}
        <div className="p-4">
          <Button asChild className="w-full">
            <Link href="/transactions/new">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        </div>

        {/* Sidebar content */}
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="flex flex-col gap-1">
            {routes.map((route) => {
              const isActive = pathname === route.href || pathname?.startsWith(`${route.href}/`)

              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-teal-50 text-teal-700" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <route.icon className={cn("h-5 w-5", isActive ? "text-teal-700" : "text-gray-500")} />
                  {route.name}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* User profile */}
        <div className="mt-auto border-t p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-semibold">
              JD
            </div>
            <div>
              <p className="font-medium">John Doe</p>
              <p className="text-xs text-muted-foreground">john.doe@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

