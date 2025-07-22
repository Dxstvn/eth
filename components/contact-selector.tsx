"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  UserPlus, 
  Shield, 
  Wallet, 
  Mail, 
  AlertCircle,
  Plus,
  ExternalLink
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useContacts } from "@/context/contact-context"
import { Contact } from "@/services/contacts-api"
import Link from "next/link"

interface ContactSelectorProps {
  selectedContactId: string | null
  onContactSelect: (contact: Contact | null) => void
  transactionType?: "purchase" | "sale"
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  showWalletInfo?: boolean
  className?: string
}

export default function ContactSelector({
  selectedContactId,
  onContactSelect,
  transactionType = "purchase",
  label = "Select Contact",
  placeholder = "Choose a contact to transact with",
  required = false,
  error,
  showWalletInfo = true,
  className = ""
}: ContactSelectorProps) {
  const { contacts, loading, error: contactError, refreshContacts } = useContacts()
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])

  // Filter contacts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = contacts.filter(contact => 
        contact.first_name.toLowerCase().includes(query) ||
        contact.last_name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(query)
      )
      setFilteredContacts(filtered)
    }
  }, [contacts, searchQuery])

  const selectedContact = selectedContactId 
    ? contacts.find(contact => contact.id === selectedContactId) 
    : null

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getRoleInTransaction = () => {
    return transactionType === "purchase" ? "Seller" : "Buyer"
  }

  const handleContactChange = (contactId: string) => {
    if (contactId === "refresh") {
      refreshContacts()
      return
    }
    
    if (contactId === "add-new") {
      // This will be handled by the link
      return
    }

    const contact = contacts.find(c => c.id === contactId)
    onContactSelect(contact || null)
  }

  if (contactError) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Contacts</AlertTitle>
          <AlertDescription>
            {contactError}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshContacts}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Contact Selection */}
      <div className="space-y-2">
        <Label htmlFor="contact-select" className="flex items-center">
          {label} {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        <Select 
          value={selectedContactId || ""} 
          onValueChange={handleContactChange}
          disabled={loading}
        >
          <SelectTrigger
            id="contact-select"
            className={error ? "border-red-500" : ""}
          >
            <SelectValue placeholder={loading ? "Loading contacts..." : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {/* Search Input */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
            </div>
            
            {/* Action Items */}
            <div className="border-b">
              <SelectItem value="add-new" className="text-teal-600">
                <div className="flex items-center">
                  <UserPlus className="h-4 w-4 mr-2" />
                  <span>Add New Contact</span>
                  <ExternalLink className="h-3 w-3 ml-2" />
                </div>
              </SelectItem>
              <SelectItem value="refresh" className="text-blue-600">
                <div className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Refresh List</span>
                </div>
              </SelectItem>
            </div>
            
            {/* Contact List */}
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? "No contacts found matching your search" : "No contacts available"}
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  <div className="flex items-center space-x-2 w-full">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                        {getInitials(contact.first_name, contact.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {contact.email}
                      </div>
                    </div>
                    {contact.wallets && contact.wallets.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {contact.wallets.length} wallet{contact.wallets.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        
        {contacts.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            No contacts found.{" "}
            <Link href="/contacts" className="text-teal-600 hover:underline">
              Add your first contact
            </Link>{" "}
            to start creating transactions.
          </p>
        )}
        
        {contacts.length > 0 && !selectedContact && (
          <p className="text-sm text-muted-foreground">
            Don't see your counterparty?{" "}
            <Link href="/contacts" className="text-teal-600 hover:underline">
              Add a new contact
            </Link>{" "}
            first.
          </p>
        )}
      </div>

      {/* Selected Contact Information */}
      {selectedContact && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="" />
              <AvatarFallback className="bg-teal-100 text-teal-700">
                {getInitials(selectedContact.first_name, selectedContact.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-medium flex items-center gap-2">
                {selectedContact.first_name} {selectedContact.last_name}
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </h4>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {selectedContact.email}
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {getRoleInTransaction()}
            </Badge>
          </div>
          
          {showWalletInfo && selectedContact.wallets && selectedContact.wallets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                Verified Wallets ({selectedContact.wallets.length})
              </p>
              <div className="space-y-2">
                {selectedContact.wallets.map((wallet, index) => (
                  <div key={index} className="bg-white p-3 rounded border text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {wallet.network || 'Unknown Network'}
                          {wallet.isPrimary && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Primary
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 font-mono break-all">
                          {wallet.address}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(!selectedContact.wallets || selectedContact.wallets.length === 0) && showWalletInfo && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-amber-800">
                This contact hasn't added any wallet addresses yet. They'll need to add a wallet before you can create transactions.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Security Notice */}
      <Alert className="bg-teal-50 border-teal-200 text-teal-800">
        <Shield className="h-4 w-4" />
        <AlertTitle>Verified Transactions Only</AlertTitle>
        <AlertDescription>
          For security reasons, you can only transact with your verified contacts. This ensures wallet
          addresses are pre-verified and reduces the risk of errors.
        </AlertDescription>
      </Alert>
    </div>
  )
}