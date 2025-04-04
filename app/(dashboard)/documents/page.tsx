import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, Search, SlidersHorizontal, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function DocumentsPage() {
  // Sample documents data
  const documents = [
    {
      id: "DOC123456",
      name: "Purchase Agreement - 123 Blockchain Ave",
      type: "PDF",
      size: "2.4 MB",
      date: "2023-04-15",
      status: "signed",
      transaction: "TX123456",
    },
    {
      id: "DOC789012",
      name: "Property Inspection Report - 456 Smart Contract St",
      type: "PDF",
      size: "5.1 MB",
      date: "2023-04-10",
      status: "pending",
      transaction: "TX789012",
    },
    {
      id: "DOC345678",
      name: "Title Transfer Documents - 789 Ledger Lane",
      type: "PDF",
      size: "1.8 MB",
      date: "2023-03-28",
      status: "signed",
      transaction: "TX345678",
    },
    {
      id: "DOC901234",
      name: "Escrow Agreement - 321 Crypto Court",
      type: "PDF",
      size: "3.2 MB",
      date: "2023-03-15",
      status: "pending",
      transaction: "TX901234",
    },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-gray-500">Manage and access all your transaction documents</p>
        </div>
        <Button asChild className="bg-black hover:bg-gray-800 text-white">
          <div className="flex items-center">
            <Upload className="mr-2 h-4 w-4" /> Upload Document
          </div>
        </Button>
      </div>

      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search documents..." className="pl-8" />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="newest">
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {documents.map((document) => (
          <div key={document.id} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-gray-100 p-2 rounded-md">
                  <FileText className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{document.name}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span>
                      {document.type} • {document.size}
                    </span>
                    <span>Added on {document.date}</span>
                    <span>Transaction: {document.transaction}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={
                    document.status === "signed" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                  }
                >
                  {document.status === "signed" ? "Signed" : "Pending"}
                </Badge>
                <Button variant="outline" size="sm" className="whitespace-nowrap">
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

