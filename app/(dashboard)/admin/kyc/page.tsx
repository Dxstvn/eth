"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  FileText,
  AlertCircle,
  TrendingUp,
  Shield,
  Filter,
  Download,
} from "lucide-react"
import KYCQueueManager from "@/components/kyc/admin/KYCQueueManager"
import KYCAnalytics from "@/components/kyc/admin/KYCAnalytics"
import KYCAdminControls from "@/components/kyc/admin/KYCAdminControls"
import { useAuth } from "@/context/auth-context-v2"
import { useRouter } from "next/navigation"
import { apiClient } from "@/services/api"
import { toast } from "sonner"

interface KYCStats {
  total: number
  pending: number
  approved: number
  rejected: number
  inReview: number
  averageCompletionTime: number
  todaySubmissions: number
  weeklyGrowth: number
}

interface RecentApplication {
  id: string
  userId: string
  userName: string
  userEmail: string
  status: "pending" | "approved" | "rejected" | "in_review"
  submittedAt: string
  riskScore: number
  completionPercentage: number
}

export default function KYCAdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState<KYCStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    inReview: 0,
    averageCompletionTime: 0,
    todaySubmissions: 0,
    weeklyGrowth: 0,
  })
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([])
  const [loading, setLoading] = useState(true)

  // Check admin access
  useEffect(() => {
    if (user && !user.isAdmin) {
      router.push("/dashboard")
      toast.error("Access denied. Admin privileges required.")
    }
  }, [user, router])

  // Fetch KYC statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        // Mock data for now - will be replaced with actual API calls
        setStats({
          total: 1247,
          pending: 89,
          approved: 1032,
          rejected: 76,
          inReview: 50,
          averageCompletionTime: 12.5,
          todaySubmissions: 23,
          weeklyGrowth: 15.3,
        })

        setRecentApplications([
          {
            id: "kyc-001",
            userId: "user-001",
            userName: "John Smith",
            userEmail: "john.smith@example.com",
            status: "pending",
            submittedAt: new Date().toISOString(),
            riskScore: 25,
            completionPercentage: 100,
          },
          {
            id: "kyc-002",
            userId: "user-002",
            userName: "Sarah Johnson",
            userEmail: "sarah.j@example.com",
            status: "in_review",
            submittedAt: new Date(Date.now() - 3600000).toISOString(),
            riskScore: 15,
            completionPercentage: 100,
          },
          {
            id: "kyc-003",
            userId: "user-003",
            userName: "Mike Chen",
            userEmail: "mike.chen@example.com",
            status: "approved",
            submittedAt: new Date(Date.now() - 7200000).toISOString(),
            riskScore: 10,
            completionPercentage: 100,
          },
        ])
      } catch (error) {
        console.error("Failed to fetch KYC stats:", error)
        toast.error("Failed to load KYC statistics")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Set up real-time updates
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement search functionality
    console.log("Searching for:", searchQuery)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500"
      case "rejected":
        return "bg-red-500"
      case "pending":
        return "bg-yellow-500"
      case "in_review":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getRiskColor = (score: number) => {
    if (score <= 20) return "text-green-600"
    if (score <= 50) return "text-yellow-600"
    return "text-red-600"
  }

  if (!user?.isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">KYC Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage and review KYC applications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or application ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.weeklyGrowth}%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inReview} currently in review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.approved / stats.total) * 100).toFixed(1)}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageCompletionTime} min</div>
            <p className="text-xs text-muted-foreground">
              {stats.todaySubmissions} submissions today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Application Queue</TabsTrigger>
          <TabsTrigger value="recent">Recent Applications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Admin Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <KYCQueueManager />
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>
                Latest KYC applications submitted to the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentApplications.map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/admin/kyc/${application.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(application.status)}`} />
                      <div>
                        <p className="font-medium">{application.userName}</p>
                        <p className="text-sm text-muted-foreground">{application.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">
                          Risk Score:{" "}
                          <span className={`font-medium ${getRiskColor(application.riskScore)}`}>
                            {application.riskScore}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(application.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={application.status === "approved" ? "default" : "secondary"}>
                        {application.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <KYCAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <KYCAdminControls />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="outline" size="sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            View Flagged
          </Button>
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Risk Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}