"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Clock,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
} from "lucide-react"
import { toast } from "sonner"

interface AnalyticsData {
  conversionFunnel: {
    stage: string
    count: number
    percentage: number
  }[]
  completionTimeMetrics: {
    average: number
    median: number
    p95: number
    trend: number
  }
  dropOffAnalysis: {
    step: string
    dropOffRate: number
    completions: number
    abandonments: number
  }[]
  geographicDistribution: {
    country: string
    applications: number
    approvalRate: number
  }[]
  riskScoreDistribution: {
    range: string
    count: number
    percentage: number
  }[]
  documentRejectionReasons: {
    reason: string
    count: number
    percentage: number
  }[]
  timeBasedTrends: {
    date: string
    submissions: number
    approvals: number
    rejections: number
  }[]
  overallMetrics: {
    totalApplications: number
    approvalRate: number
    averageProcessingTime: number
    pendingApplications: number
  }
}

export default function KYCAnalytics() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30d")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      // Mock data - replace with actual API call
      setAnalyticsData({
        conversionFunnel: [
          { stage: "Started", count: 5000, percentage: 100 },
          { stage: "Personal Info", count: 4500, percentage: 90 },
          { stage: "Documents", count: 3800, percentage: 76 },
          { stage: "Verification", count: 3200, percentage: 64 },
          { stage: "Completed", count: 3000, percentage: 60 },
        ],
        completionTimeMetrics: {
          average: 12.5,
          median: 10.2,
          p95: 28.7,
          trend: -15.3,
        },
        dropOffAnalysis: [
          { step: "Email Verification", dropOffRate: 5, completions: 4750, abandonments: 250 },
          { step: "Personal Information", dropOffRate: 10, completions: 4275, abandonments: 475 },
          { step: "Document Upload", dropOffRate: 15.8, completions: 3600, abandonments: 675 },
          { step: "Identity Verification", dropOffRate: 8.4, completions: 3300, abandonments: 300 },
          { step: "Financial Information", dropOffRate: 6.3, completions: 3100, abandonments: 200 },
        ],
        geographicDistribution: [
          { country: "United States", applications: 1450, approvalRate: 85 },
          { country: "United Kingdom", applications: 680, approvalRate: 88 },
          { country: "Canada", applications: 520, approvalRate: 90 },
          { country: "Germany", applications: 380, approvalRate: 87 },
          { country: "France", applications: 290, approvalRate: 86 },
          { country: "Others", applications: 680, approvalRate: 82 },
        ],
        riskScoreDistribution: [
          { range: "0-20 (Low)", count: 1800, percentage: 45 },
          { range: "21-50 (Medium)", count: 1600, percentage: 40 },
          { range: "51-80 (High)", count: 480, percentage: 12 },
          { range: "81-100 (Very High)", count: 120, percentage: 3 },
        ],
        documentRejectionReasons: [
          { reason: "Poor Quality", count: 145, percentage: 32 },
          { reason: "Expired Document", count: 98, percentage: 22 },
          { reason: "Document Mismatch", count: 87, percentage: 19 },
          { reason: "Incomplete Information", count: 65, percentage: 14 },
          { reason: "Suspected Forgery", count: 35, percentage: 8 },
          { reason: "Other", count: 20, percentage: 5 },
        ],
        timeBasedTrends: Array.from({ length: 30 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (29 - i))
          return {
            date: date.toISOString().split("T")[0],
            submissions: Math.floor(Math.random() * 50) + 100,
            approvals: Math.floor(Math.random() * 40) + 80,
            rejections: Math.floor(Math.random() * 10) + 5,
          }
        }),
        overallMetrics: {
          totalApplications: 4000,
          approvalRate: 82.5,
          averageProcessingTime: 2.3,
          pendingApplications: 89,
        },
      })
    } catch (error) {
      console.error("Failed to fetch analytics data:", error)
      toast.error("Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }

  if (loading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">KYC Analytics Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive insights into your KYC process performance
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.overallMetrics.totalApplications.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.overallMetrics.approvalRate}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.overallMetrics.averageProcessingTime} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.overallMetrics.pendingApplications}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="trends">Time Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>
                  User progression through the KYC process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel
                      dataKey="count"
                      data={analyticsData.conversionFunnel}
                      isAnimationActive
                    >
                      <LabelList position="center" fill="#fff" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Drop-off Analysis</CardTitle>
                <CardDescription>
                  Where users abandon the KYC process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.dropOffAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="step" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="dropOffRate" fill="#ff8042" name="Drop-off Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Completion Time Metrics</CardTitle>
              <CardDescription>
                How long users take to complete KYC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Average</p>
                  <p className="text-2xl font-bold">
                    {analyticsData.completionTimeMetrics.average} min
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Median</p>
                  <p className="text-2xl font-bold">
                    {analyticsData.completionTimeMetrics.median} min
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">95th Percentile</p>
                  <p className="text-2xl font-bold">
                    {analyticsData.completionTimeMetrics.p95} min
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Trend</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    {analyticsData.completionTimeMetrics.trend > 0 ? (
                      <TrendingUp className="h-5 w-5 text-red-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-green-500" />
                    )}
                    {Math.abs(analyticsData.completionTimeMetrics.trend)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>
                KYC applications by country
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.geographicDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="country" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="applications" fill="#8884d8" name="Applications" />
                  <Bar yAxisId="right" dataKey="approvalRate" fill="#82ca9d" name="Approval Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Score Distribution</CardTitle>
                <CardDescription>
                  Distribution of risk scores across applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.riskScoreDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, percentage }) => `${range}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.riskScoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Rejection Reasons</CardTitle>
                <CardDescription>
                  Common reasons for document rejection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={analyticsData.documentRejectionReasons}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="reason" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ff8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Trends</CardTitle>
              <CardDescription>
                Submissions, approvals, and rejections over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.timeBasedTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="submissions"
                    stroke="#8884d8"
                    name="Submissions"
                  />
                  <Line
                    type="monotone"
                    dataKey="approvals"
                    stroke="#82ca9d"
                    name="Approvals"
                  />
                  <Line
                    type="monotone"
                    dataKey="rejections"
                    stroke="#ff8042"
                    name="Rejections"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}