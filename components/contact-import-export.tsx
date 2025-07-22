"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Download, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  FileJson,
  FileSpreadsheet,
  Loader2
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useContacts } from "@/context/contact-context"
import { Contact } from "@/services/contacts-api"
import { useToast } from "@/components/ui/use-toast"

interface ImportPreview {
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  valid: boolean
  errors: string[]
}

export default function ContactImportExport() {
  const { contacts, sendInvitation } = useContacts()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importText, setImportText] = useState("")
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Export contacts to CSV
  const exportToCSV = () => {
    setExporting(true)
    
    try {
      const headers = ['First Name', 'Last Name', 'Email', 'Phone Number', 'Wallets', 'Date Added']
      const csvContent = [
        headers.join(','),
        ...contacts.map(contact => [
          `"${contact.first_name}"`,
          `"${contact.last_name}"`,
          `"${contact.email}"`,
          `"${contact.phone_number || ''}"`,
          `"${contact.wallets?.map(w => `${w.network}:${w.address}`).join('; ') || ''}"`,
          `"${new Date(contact.relationshipCreatedAt).toLocaleDateString()}"`
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `clearhold-contacts-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: `Exported ${contacts.length} contacts to CSV`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export contacts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  // Export contacts to JSON
  const exportToJSON = () => {
    setExporting(true)
    
    try {
      const exportData = {
        exported_at: new Date().toISOString(),
        contact_count: contacts.length,
        contacts: contacts.map(contact => ({
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone_number: contact.phone_number,
          wallets: contact.wallets,
          date_added: contact.relationshipCreatedAt
        }))
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `clearhold-contacts-${new Date().toISOString().split('T')[0]}.json`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: `Exported ${contacts.length} contacts to JSON`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export contacts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  // Parse import text and validate
  const parseImportText = (text: string): ImportPreview[] => {
    const lines = text.trim().split('\n').filter(line => line.trim())
    const preview: ImportPreview[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const errors: string[] = []
      let email = '', first_name = '', last_name = '', phone_number = ''

      // Try to parse as CSV
      if (line.includes(',')) {
        const parts = line.split(',').map(part => part.trim().replace(/"/g, ''))
        
        if (parts.length >= 3) {
          first_name = parts[0]
          last_name = parts[1]
          email = parts[2]
          phone_number = parts[3] || ''
        } else {
          errors.push('CSV format should be: First Name, Last Name, Email, Phone (optional)')
        }
      } else {
        // Try to parse as just email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (emailRegex.test(line)) {
          email = line
          // Extract name from email if possible
          const namePart = email.split('@')[0]
          const nameParts = namePart.split(/[._]/)
          if (nameParts.length >= 2) {
            first_name = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
            last_name = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
          } else {
            first_name = namePart.charAt(0).toUpperCase() + namePart.slice(1)
            last_name = ''
          }
        } else {
          errors.push('Invalid email format')
        }
      }

      // Validate required fields
      if (!email) {
        errors.push('Email is required')
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid email format')
      }

      if (!first_name) {
        errors.push('First name is required')
      }

      // Check if contact already exists
      const existingContact = contacts.find(c => c.email.toLowerCase() === email.toLowerCase())
      if (existingContact) {
        errors.push('Contact already exists in your list')
      }

      preview.push({
        email,
        first_name,
        last_name,
        phone_number,
        valid: errors.length === 0,
        errors
      })
    }

    return preview
  }

  // Handle import text change
  const handleImportTextChange = (text: string) => {
    setImportText(text)
    if (text.trim()) {
      const preview = parseImportText(text)
      setImportPreview(preview)
      setShowPreview(true)
    } else {
      setImportPreview([])
      setShowPreview(false)
    }
  }

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      handleImportTextChange(content)
    }
    reader.readAsText(file)
  }

  // Execute import
  const executeImport = async () => {
    setImporting(true)
    const validContacts = importPreview.filter(contact => contact.valid)
    
    let successCount = 0
    let errorCount = 0

    for (const contact of validContacts) {
      try {
        await sendInvitation(contact.email)
        successCount++
      } catch (error) {
        errorCount++
        console.error(`Failed to send invitation to ${contact.email}:`, error)
      }
    }

    toast({
      title: "Import Complete",
      description: `Sent ${successCount} invitations. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
      variant: errorCount > 0 ? "destructive" : "default",
    })

    // Reset form
    setImportText("")
    setImportPreview([])
    setShowPreview(false)
    setImporting(false)
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const validImportCount = importPreview.filter(c => c.valid).length
  const invalidImportCount = importPreview.filter(c => !c.valid).length

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card className="bg-white shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-teal-600" />
            Export Contacts
          </CardTitle>
          <CardDescription>
            Download your contacts in CSV or JSON format for backup or sharing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={exportToCSV}
              disabled={contacts.length === 0 || exporting}
              variant="outline"
              className="w-full"
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Export as CSV
            </Button>
            
            <Button
              onClick={exportToJSON}
              disabled={contacts.length === 0 || exporting}
              variant="outline"
              className="w-full"
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="mr-2 h-4 w-4" />
              )}
              Export as JSON
            </Button>
          </div>
          
          {contacts.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              You don't have any contacts to export yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="bg-white shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-teal-600" />
            Import Contacts
          </CardTitle>
          <CardDescription>
            Import contacts by uploading a file or pasting email addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div>
            <Label htmlFor="file-import">Upload File (CSV or TXT)</Label>
            <Input
              ref={fileInputRef}
              id="file-import"
              type="file"
              accept=".csv,.txt,.json"
              onChange={handleFileImport}
              className="mt-1"
            />
          </div>

          {/* Text Import */}
          <div>
            <Label htmlFor="text-import">Or Paste Email Addresses</Label>
            <Textarea
              id="text-import"
              placeholder={`Enter email addresses (one per line) or CSV data:
john.doe@example.com
Jane, Smith, jane.smith@example.com, 555-123-4567
michael.chen@example.com`}
              value={importText}
              onChange={(e) => handleImportTextChange(e.target.value)}
              className="mt-1 min-h-[120px]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports: email addresses (one per line) or CSV format (First Name, Last Name, Email, Phone)
            </p>
          </div>

          {/* Import Preview */}
          {showPreview && importPreview.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h4 className="font-medium">Import Preview</h4>
                <div className="flex gap-2">
                  {validImportCount > 0 && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {validImportCount} valid
                    </span>
                  )}
                  {invalidImportCount > 0 && (
                    <span className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {invalidImportCount} invalid
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {importPreview.map((contact, index) => (
                  <div
                    key={index}
                    className={`p-3 border-b last:border-b-0 ${
                      contact.valid ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{contact.email}</p>
                        {contact.phone_number && (
                          <p className="text-sm text-gray-500">{contact.phone_number}</p>
                        )}
                      </div>
                      <div className="flex items-center">
                        {contact.valid ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                    {contact.errors.length > 0 && (
                      <div className="mt-2">
                        {contact.errors.map((error, errorIndex) => (
                          <p key={errorIndex} className="text-xs text-red-600">
                            • {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {validImportCount > 0 && (
                <div className="space-y-2">
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-blue-800">
                      Importing contacts will send invitation emails to {validImportCount} recipient{validImportCount !== 1 ? 's' : ''}. 
                      They'll need to accept the invitations to become your contacts.
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    onClick={executeImport}
                    disabled={importing}
                    className="w-full bg-teal-700 hover:bg-teal-800"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Invitations...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Send {validImportCount} Invitation{validImportCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}