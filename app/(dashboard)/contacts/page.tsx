import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, SlidersHorizontal, Mail, Phone, Building, Star, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function ContactsPage() {
  // Sample contacts data
  const contacts = [
    {
      id: "C123456",
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "+1 (555) 123-4567",
      company: "Blockchain Properties LLC",
      type: "buyer",
      favorite: true,
    },
    {
      id: "C789012",
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      phone: "+1 (555) 987-6543",
      company: "Crypto Realty Group",
      type: "seller",
      favorite: false,
    },
    {
      id: "C345678",
      name: "Michael Chen",
      email: "michael.chen@example.com",
      phone: "+1 (555) 456-7890",
      company: "Digital Asset Properties",
      type: "agent",
      favorite: true,
    },
    {
      id: "C901234",
      name: "Emily Rodriguez",
      email: "emily.rodriguez@example.com",
      phone: "+1 (555) 234-5678",
      company: "Smart Contract Homes",
      type: "buyer",
      favorite: false,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-gray-500">Manage your real estate transaction contacts</p>
        </div>
        <Button asChild className="bg-black hover:bg-gray-800 text-white">
          <div className="flex items-center">
            <Plus className="mr-2 h-4 w-4" /> Add Contact
          </div>
        </Button>
      </div>

      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search contacts..." className="pl-8" />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <select className="p-2 border rounded-md w-full sm:w-[180px]">
                <option value="all">All Types</option>
                <option value="buyer">Buyers</option>
                <option value="seller">Sellers</option>
                <option value="agent">Agents</option>
              </select>
              <select className="p-2 border rounded-md w-full sm:w-[180px]">
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="recent">Recently Added</option>
                <option value="favorite">Favorites</option>
              </select>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {contacts.map((contact) => (
          <div key={contact.id} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-semibold">
                  {contact.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{contact.name}</h3>
                    {contact.favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    <Badge
                      className={
                        contact.type === "buyer"
                          ? "bg-blue-50 text-blue-700"
                          : contact.type === "seller"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-green-50 text-green-700"
                      }
                    >
                      {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 mt-1">
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span>{contact.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <span>{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>{contact.company}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">
                  <Mail className="mr-2 h-4 w-4" /> Contact
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit Contact</DropdownMenuItem>
                    <DropdownMenuItem>View Transactions</DropdownMenuItem>
                    <DropdownMenuItem>
                      {contact.favorite ? "Remove from Favorites" : "Add to Favorites"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Delete Contact</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

