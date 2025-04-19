"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star, MoreHorizontal, Mail, Search } from "lucide-react"
import { useDatabaseStore } from "@/lib/mock-database"
import { useAuth } from "@/context/auth-context"

export default function ContactsPage() {
  const { getContacts } = useDatabaseStore()
  const { isDemoAccount } = useAuth()
  const [contacts, setContacts] = useState(getContacts())
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("All Types")
  const [sortOrder, setSortOrder] = useState("Name (A-Z)")

  // Filter and sort contacts
  const filteredContacts = contacts
    .filter((contact) => {
      // Search filter
      const matchesSearch =
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchQuery.toLowerCase())

      // Type filter
      const matchesType = typeFilter === "All Types" || contact.type === typeFilter.toLowerCase()

      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      // Sort order
      if (sortOrder === "Name (A-Z)") {
        return a.name.localeCompare(b.name)
      } else if (sortOrder === "Name (Z-A)") {
        return b.name.localeCompare(a.name)
      } else if (sortOrder === "Company (A-Z)") {
        return a.company.localeCompare(b.company)
      } else if (sortOrder === "Company (Z-A)") {
        return b.company.localeCompare(a.company)
      }
      return 0
    })

  const toggleFavorite = (id: string) => {
    setContacts((prevContacts) =>
      prevContacts.map((contact) => (contact.id === id ? { ...contact, favorite: !contact.favorite } : contact)),
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-gray-500">Manage your real estate transaction contacts</p>
        </div>
        <Button className="bg-teal-900 hover:bg-teal-800 text-white">
          <span className="mr-2">+</span> Add Contact
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search contacts..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="border rounded-md px-3 py-2 bg-white"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option>All Types</option>
              <option>Buyer</option>
              <option>Seller</option>
              <option>Agent</option>
            </select>
            <select
              className="border rounded-md px-3 py-2 bg-white"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option>Name (A-Z)</option>
              <option>Name (Z-A)</option>
              <option>Company (A-Z)</option>
              <option>Company (Z-A)</option>
            </select>
            <Button variant="outline" size="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span className="sr-only">Toggle view</span>
            </Button>
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center border-t">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No contacts found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              {isDemoAccount
                ? "No contacts match your search criteria. Try adjusting your filters or add a new contact."
                : "You don't have any contacts yet. Add your first contact to get started."}
            </p>
            <Button className="bg-teal-900 hover:bg-teal-800 text-white">
              <span className="mr-2">+</span> Add Contact
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-800 font-medium text-lg mr-4">
                    {contact.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <h3 className="font-medium">{contact.name}</h3>
                      <button
                        onClick={() => toggleFavorite(contact.id)}
                        className={`ml-2 ${contact.favorite ? "text-yellow-500" : "text-gray-300"}`}
                      >
                        <Star size={16} fill={contact.favorite ? "currentColor" : "none"} />
                      </button>
                      <span
                        className={`ml-2 text-xs px-2 py-1 rounded-full ${
                          contact.type === "buyer"
                            ? "bg-blue-100 text-blue-800"
                            : contact.type === "seller"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                      <span>{contact.email}</span>
                      <span className="hidden md:inline">•</span>
                      <span>{contact.phone}</span>
                      <span className="hidden md:inline">•</span>
                      <span>{contact.company}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="hidden md:flex">
                      <Mail size={16} className="mr-1" /> Contact
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
