"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import {
  Filter,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  User,
  Flag,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import KYCApplicationDetail from "./KYCApplicationDetail"

interface QueueItem {
  id: string
  userId: string
  userName: string
  userEmail: string
  status: "pending" | "in_review" | "approved" | "rejected" | "more_info_required"
  submittedAt: string
  lastUpdated: string
  riskScore: number
  completionPercentage: number
  priority: "low" | "normal" | "high"
  assignedTo?: string
  documentsCount: number
  flagged: boolean
  country: string
}

interface FilterOptions {
  status: string
  priority: string
  assignedTo: string
  riskLevel: string
  dateRange: string
  flagged: boolean
}

interface SortOptions {
  field: "submittedAt" | "riskScore" | "completionPercentage" | "priority"
  direction: "asc" | "desc"
}

export default function KYCQueueManager() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    priority: "all",
    assignedTo: "all",
    riskLevel: "all",
    dateRange: "all",
    flagged: false,
  })
  const [sort, setSort] = useState<SortOptions>({
    field: "submittedAt",
    direction: "desc",
  })
  const [searchQuery, setSearchQuery] = useState("")

  // Mock reviewers for assignment
  const reviewers = [
    { id: "reviewer-1", name: "Alice Johnson" },
    { id: "reviewer-2", name: "Bob Smith" },
    { id: "reviewer-3", name: "Carol Davis" },
  ]

  useEffect(() => {
    fetchQueueItems()
  }, [filters, sort])

  const fetchQueueItems = async () => {
    try {
      setLoading(true)
      // Mock data - replace with actual API call
      const mockData: QueueItem[] = [
        {
          id: "kyc-001",
          userId: "user-001",
          userName: "John Smith",
          userEmail: "john.smith@example.com",
          status: "pending",
          submittedAt: new Date(Date.now() - 3600000).toISOString(),
          lastUpdated: new Date(Date.now() - 1800000).toISOString(),
          riskScore: 25,
          completionPercentage: 100,
          priority: "normal",
          documentsCount: 3,
          flagged: false,
          country: "United States",
        },
        {
          id: "kyc-002",
          userId: "user-002",
          userName: "Sarah Johnson",
          userEmail: "sarah.j@example.com",
          status: "in_review",
          submittedAt: new Date(Date.now() - 7200000).toISOString(),
          lastUpdated: new Date(Date.now() - 600000).toISOString(),
          riskScore: 15,
          completionPercentage: 100,
          priority: "normal",
          assignedTo: "Alice Johnson",
          documentsCount: 4,
          flagged: false,
          country: "Canada",
        },
        {
          id: "kyc-003",
          userId: "user-003",
          userName: "Mike Chen",
          userEmail: "mike.chen@example.com",
          status: "pending",
          submittedAt: new Date(Date.now() - 10800000).toISOString(),
          lastUpdated: new Date(Date.now() - 10800000).toISOString(),
          riskScore: 65,
          completionPercentage: 100,
          priority: "high",
          documentsCount: 3,
          flagged: true,
          country: "China",
        },
        {
          id: "kyc-004",
          userId: "user-004",
          userName: "Emma Wilson",
          userEmail: "emma.w@example.com",
          status: "more_info_required",
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
          lastUpdated: new Date(Date.now() - 3600000).toISOString(),
          riskScore: 35,
          completionPercentage: 85,
          priority: "normal",
          assignedTo: "Bob Smith",
          documentsCount: 2,
          flagged: false,
          country: "United Kingdom",
        },
      ]

      // Apply filters
      let filtered = mockData
      if (filters.status !== "all") {
        filtered = filtered.filter((item) => item.status === filters.status)
      }
      if (filters.priority !== "all") {
        filtered = filtered.filter((item) => item.priority === filters.priority)
      }
      if (filters.flagged) {
        filtered = filtered.filter((item) => item.flagged)
      }

      // Apply search
      if (searchQuery) {
        filtered = filtered.filter(
          (item) =>
            item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Apply sort
      filtered.sort((a, b) => {
        const aValue = a[sort.field]
        const bValue = b[sort.field]
        const direction = sort.direction === "asc" ? 1 : -1

        if (typeof aValue === "string" && typeof bValue === "string") {
          return aValue.localeCompare(bValue) * direction
        }
        return ((aValue as number) - (bValue as number)) * direction
      })

      setQueueItems(filtered)
    } catch (error) {
      console.error("Failed to fetch queue items:", error)
      toast.error("Failed to load queue items")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(queueItems.map((item) => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleBulkAssign = async (reviewerId: string) => {
    try {
      // API call to assign selected items
      toast.success(`Assigned ${selectedItems.length} applications to reviewer`)
      setSelectedItems([])
      fetchQueueItems()
    } catch (error) {
      console.error("Failed to assign applications:", error)
      toast.error("Failed to assign applications")
    }
  }

  const handleBulkPriority = async (priority: string) => {
    try {
      // API call to update priority
      toast.success(`Updated priority for ${selectedItems.length} applications`)
      setSelectedItems([])
      fetchQueueItems()
    } catch (error) {
      console.error("Failed to update priority:", error)
      toast.error("Failed to update priority")
    }
  }

  const handleExport = async () => {
    try {
      // API call to export data
      toast.success("Queue data exported successfully")
    } catch (error) {
      console.error("Failed to export data:", error)
      toast.error("Failed to export data")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "in_review":
        return "bg-blue-100 text-blue-800"
      case "more_info_required":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "normal":
        return "bg-gray-100 text-gray-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRiskColor = (score: number) => {
    if (score <= 20) return "text-green-600"
    if (score <= 50) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>KYC Application Queue</CardTitle>
            <CardDescription>
              Manage and review pending KYC applications
            </CardDescription>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="more_info_required">More Info Required</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={filters.flagged ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters({ ...filters, flagged: !filters.flagged })}
            >
              <Flag className="h-4 w-4 mr-2" />
              Flagged
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
            <span className="text-sm">
              {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Assign to
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Select Reviewer</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {reviewers.map((reviewer) => (
                    <DropdownMenuItem
                      key={reviewer.id}
                      onClick={() => handleBulkAssign(reviewer.id)}
                    >
                      {reviewer.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Flag className="h-4 w-4 mr-2" />
                    Set Priority
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkPriority("high")}>
                    High Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkPriority("normal")}>
                    Normal Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkPriority("low")}>
                    Low Priority
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Queue Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === queueItems.length && queueItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSort({ field: "submittedAt", direction: sort.direction === "asc" ? "desc" : "asc" })}
                  >
                    Submitted
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSort({ field: "riskScore", direction: sort.direction === "asc" ? "desc" : "asc" })}
                  >
                    Risk Score
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : queueItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No applications found
                  </TableCell>
                </TableRow>
              ) : (
                queueItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.flagged && <Flag className="h-4 w-4 text-red-500" />}
                        <div>
                          <p className="font-medium">{item.userName}</p>
                          <p className="text-sm text-muted-foreground">{item.userEmail}</p>
                          <p className="text-xs text-muted-foreground">{item.country}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)} variant="secondary">
                        {item.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{new Date(item.submittedAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.submittedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getRiskColor(item.riskScore)}`}>
                        {item.riskScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(item.priority)} variant="secondary">
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{item.assignedTo || "-"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DialogTrigger asChild>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DropdownMenuItem>
                              <User className="h-4 w-4 mr-2" />
                              Assign Reviewer
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Flag className="h-4 w-4 mr-2" />
                              Set Priority
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-green-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Quick Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <XCircle className="h-4 w-4 mr-2" />
                              Quick Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                          <KYCApplicationDetail applicationId={item.id} />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Queue Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {queueItems.length} of {queueItems.length} applications
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Avg. wait time: 2.5 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>3 high priority</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}