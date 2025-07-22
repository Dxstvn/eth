import { apiClient } from "./api/client"

export interface ContactInvitation {
  id: string
  senderId: string
  senderEmail: string
  senderFirstName: string
  senderLastName?: string
  senderPhone?: string
  senderWallets?: any[]
  receiverId: string
  receiverEmail: string
  receiverFirstName: string
  receiverLastName?: string
  receiverPhone?: string
  receiverWallets?: any[]
  status: 'pending' | 'accepted' | 'denied'
  createdAt: string
  processedAt?: string
}

export interface Contact {
  id: string
  contactUid: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  wallets: any[]
  accepted: boolean
  relationshipCreatedAt: string
}

/**
 * Send a contact invitation to another user
 */
export async function sendContactInvitation(contactEmail: string) {
  const response = await apiClient.post('/contact/invite', {
    contactEmail: contactEmail.trim().toLowerCase()
  })

  if (!response.success) {
    throw new Error(response.error || "Failed to send invitation")
  }

  return response.data
}

/**
 * Get pending contact invitations for the current user
 */
export async function getPendingInvitations(): Promise<ContactInvitation[]> {
  const response = await apiClient.get('/contact/pending')

  if (!response.success) {
    throw new Error(response.error || "Failed to get pending invitations")
  }

  return response.data.invitations || []
}

/**
 * Respond to a contact invitation (accept or deny)
 */
export async function respondToInvitation(invitationId: string, action: "accept" | "deny") {
  const response = await apiClient.post('/contact/response', {
    invitationId: invitationId.trim(),
    action
  })

  if (!response.success) {
    throw new Error(response.error || "Failed to respond to invitation")
  }

  return response.data
}

/**
 * Get the user's contacts
 */
export async function getUserContacts(): Promise<Contact[]> {
  const response = await apiClient.get('/contact/contacts')

  if (!response.success) {
    throw new Error(response.error || "Failed to get contacts")
  }

  return response.data.contacts || []
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId: string) {
  const response = await apiClient.delete(`/contact/contacts/${contactId}`)

  if (!response.success) {
    throw new Error(response.error || "Failed to delete contact")
  }

  return response.data
}

/**
 * Search contacts by name or email
 */
export function searchContacts(contacts: Contact[], query: string): Contact[] {
  if (!query.trim()) {
    return contacts
  }

  const searchTerm = query.toLowerCase().trim()
  return contacts.filter(contact => 
    contact.first_name.toLowerCase().includes(searchTerm) ||
    contact.last_name.toLowerCase().includes(searchTerm) ||
    contact.email.toLowerCase().includes(searchTerm) ||
    `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm)
  )
}
