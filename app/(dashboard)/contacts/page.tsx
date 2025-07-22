"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Users, Clock, Download, Upload } from "lucide-react"
import ContactInvitationForm from "@/components/contact-invitation-form"
import PendingInvitations from "@/components/pending-invitations"
import ContactList from "@/components/contact-list"
import ContactImportExport from "@/components/contact-import-export"
import { ContactProvider, useContacts } from "@/context/contact-context"

function ContactsPageContent() {
  const { contacts, pendingInvitations } = useContacts()

  return (
    <div className="container px-4 md:px-6 py-6 sm:py-10 max-w-7xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your contact network for secure transactions
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white">
              <Users className="h-3 w-3 mr-1" />
              {contacts.length} Contact{contacts.length !== 1 ? 's' : ''}
            </Badge>
            {pendingInvitations.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                <Clock className="h-3 w-3 mr-1" />
                {pendingInvitations.length} Pending
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="contacts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto">
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">My Contacts</span>
            <span className="sm:hidden">Contacts</span>
            {contacts.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {contacts.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Pending</span>
            <span className="sm:hidden">Pending</span>
            {pendingInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {pendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="invite" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Invite</span>
            <span className="sm:hidden">Invite</span>
          </TabsTrigger>

          <TabsTrigger value="import-export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Import/Export</span>
            <span className="sm:hidden">I/E</span>
          </TabsTrigger>
        </TabsList>

        {/* My Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <ContactList />
        </TabsContent>

        {/* Pending Invitations Tab */}
        <TabsContent value="invitations" className="space-y-6">
          <PendingInvitations />
        </TabsContent>

        {/* Invite New Contact Tab */}
        <TabsContent value="invite" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ContactInvitationForm />
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              {/* Help Content */}
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 p-6 rounded-lg border border-teal-100">
                <h3 className="text-lg font-semibold text-teal-900 mb-3">
                  How Contact Invitations Work
                </h3>
                <div className="space-y-3 text-sm text-teal-800">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-medium text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Send Invitation</p>
                      <p className="text-teal-700">Enter the email address of another ClearHold user to send them a contact invitation.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-medium text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-medium">They Accept</p>
                      <p className="text-teal-700">The recipient will see your invitation in their pending list and can choose to accept or decline.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-medium text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Start Transacting</p>
                      <p className="text-teal-700">Once connected, you can easily select them for transactions and see their verified wallet addresses.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Benefits of Connected Contacts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Verified wallet addresses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Faster transaction setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Trusted transaction partners</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Reduced transaction errors</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Import/Export Tab */}
        <TabsContent value="import-export" className="space-y-6">
          <ContactImportExport />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ContactsPage() {
  return (
    <ContactProvider>
      <ContactsPageContent />
    </ContactProvider>
  )
}
