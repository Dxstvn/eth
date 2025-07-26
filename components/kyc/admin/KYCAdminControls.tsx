"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Settings,
  Shield,
  FileText,
  Bell,
  Download,
  Activity,
  AlertCircle,
  Info,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  HelpCircle,
} from "lucide-react"
import { toast } from "sonner"

interface RiskSettings {
  autoApprovalThreshold: number
  autoRejectionThreshold: number
  flagForReviewThreshold: number
  enableAutoApproval: boolean
  enableAutoRejection: boolean
}

interface DocumentRequirements {
  id: string
  type: string
  required: boolean
  expiryCheck: boolean
  minQuality: number
}

interface NotificationSettings {
  emailNotifications: boolean
  slackIntegration: boolean
  webhookUrl: string
  notifyOnSubmission: boolean
  notifyOnApproval: boolean
  notifyOnRejection: boolean
  notifyOnFlagged: boolean
}

interface SystemHealth {
  apiStatus: "healthy" | "degraded" | "down"
  verificationServiceStatus: "healthy" | "degraded" | "down"
  storageStatus: "healthy" | "degraded" | "down"
  lastCheck: string
  uptime: number
  processingCapacity: number
}

export default function KYCAdminControls() {
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    autoApprovalThreshold: 20,
    autoRejectionThreshold: 80,
    flagForReviewThreshold: 50,
    enableAutoApproval: false,
    enableAutoRejection: false,
  })

  const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirements[]>([
    {
      id: "1",
      type: "Government ID",
      required: true,
      expiryCheck: true,
      minQuality: 80,
    },
    {
      id: "2",
      type: "Proof of Address",
      required: true,
      expiryCheck: false,
      minQuality: 70,
    },
    {
      id: "3",
      type: "Bank Statement",
      required: false,
      expiryCheck: false,
      minQuality: 60,
    },
  ])

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    slackIntegration: false,
    webhookUrl: "",
    notifyOnSubmission: true,
    notifyOnApproval: true,
    notifyOnRejection: true,
    notifyOnFlagged: true,
  })

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    apiStatus: "healthy",
    verificationServiceStatus: "healthy",
    storageStatus: "healthy",
    lastCheck: new Date().toISOString(),
    uptime: 99.9,
    processingCapacity: 85,
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch current settings
    fetchSettings()
    // Check system health
    const healthInterval = setInterval(checkSystemHealth, 60000) // Check every minute
    return () => clearInterval(healthInterval)
  }, [])

  const fetchSettings = async () => {
    try {
      // Fetch settings from API
      // Mock implementation for now
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      toast.error("Failed to load settings")
    }
  }

  const checkSystemHealth = async () => {
    try {
      // Check system health
      setSystemHealth({
        apiStatus: "healthy",
        verificationServiceStatus: "healthy",
        storageStatus: "healthy",
        lastCheck: new Date().toISOString(),
        uptime: 99.9,
        processingCapacity: Math.floor(Math.random() * 20) + 70,
      })
    } catch (error) {
      console.error("Failed to check system health:", error)
    }
  }

  const handleSaveRiskSettings = async () => {
    try {
      setLoading(true)
      // API call to save settings
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Mock delay
      toast.success("Risk settings saved successfully")
    } catch (error) {
      console.error("Failed to save risk settings:", error)
      toast.error("Failed to save risk settings")
    } finally {
      setLoading(false)
    }
  }

  const handleAddDocumentType = () => {
    const newDoc: DocumentRequirements = {
      id: Date.now().toString(),
      type: "New Document Type",
      required: false,
      expiryCheck: false,
      minQuality: 70,
    }
    setDocumentRequirements([...documentRequirements, newDoc])
  }

  const handleRemoveDocumentType = (id: string) => {
    setDocumentRequirements(documentRequirements.filter((doc) => doc.id !== id))
  }

  const handleExportData = async () => {
    try {
      setLoading(true)
      // API call to export data
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Mock delay
      toast.success("KYC data export started. You'll receive an email when ready.")
    } catch (error) {
      console.error("Failed to export data:", error)
      toast.error("Failed to export data")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500"
      case "degraded":
        return "bg-yellow-500"
      case "down":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Admin Controls</AlertTitle>
        <AlertDescription>
          Changes to these settings will affect all KYC processing. Please review carefully before saving.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="risk" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="risk">Risk Settings</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="export">Data Export</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Threshold Settings</CardTitle>
              <CardDescription>
                Configure automatic approval and rejection thresholds based on risk scores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Auto-Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically approve applications below the threshold
                    </p>
                  </div>
                  <Switch
                    checked={riskSettings.enableAutoApproval}
                    onCheckedChange={(checked) =>
                      setRiskSettings({ ...riskSettings, enableAutoApproval: checked })
                    }
                  />
                </div>

                {riskSettings.enableAutoApproval && (
                  <div className="space-y-2 pl-4">
                    <Label>Auto-Approval Risk Threshold: {riskSettings.autoApprovalThreshold}</Label>
                    <Slider
                      value={[riskSettings.autoApprovalThreshold]}
                      onValueChange={(value) =>
                        setRiskSettings({ ...riskSettings, autoApprovalThreshold: value[0] })
                      }
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Applications with risk score below {riskSettings.autoApprovalThreshold} will be auto-approved
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Auto-Rejection</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically reject applications above the threshold
                    </p>
                  </div>
                  <Switch
                    checked={riskSettings.enableAutoRejection}
                    onCheckedChange={(checked) =>
                      setRiskSettings({ ...riskSettings, enableAutoRejection: checked })
                    }
                  />
                </div>

                {riskSettings.enableAutoRejection && (
                  <div className="space-y-2 pl-4">
                    <Label>Auto-Rejection Risk Threshold: {riskSettings.autoRejectionThreshold}</Label>
                    <Slider
                      value={[riskSettings.autoRejectionThreshold]}
                      onValueChange={(value) =>
                        setRiskSettings({ ...riskSettings, autoRejectionThreshold: value[0] })
                      }
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Applications with risk score above {riskSettings.autoRejectionThreshold} will be auto-rejected
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Flag for Review Threshold: {riskSettings.flagForReviewThreshold}</Label>
                <Slider
                  value={[riskSettings.flagForReviewThreshold]}
                  onValueChange={(value) =>
                    setRiskSettings({ ...riskSettings, flagForReviewThreshold: value[0] })
                  }
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Applications with risk score above {riskSettings.flagForReviewThreshold} will be flagged for manual review
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveRiskSettings} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Risk Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Requirements</CardTitle>
              <CardDescription>
                Configure required documents and quality thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentRequirements.map((doc) => (
                <div key={doc.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <Input
                      value={doc.type}
                      onChange={(e) => {
                        setDocumentRequirements(
                          documentRequirements.map((d) =>
                            d.id === doc.id ? { ...d, type: e.target.value } : d
                          )
                        )
                      }}
                      className="max-w-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDocumentType(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={doc.required}
                        onCheckedChange={(checked) => {
                          setDocumentRequirements(
                            documentRequirements.map((d) =>
                              d.id === doc.id ? { ...d, required: checked } : d
                            )
                          )
                        }}
                      />
                      <Label>Required</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={doc.expiryCheck}
                        onCheckedChange={(checked) => {
                          setDocumentRequirements(
                            documentRequirements.map((d) =>
                              d.id === doc.id ? { ...d, expiryCheck: checked } : d
                            )
                          )
                        }}
                      />
                      <Label>Check Expiry</Label>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-sm">Min Quality: {doc.minQuality}%</Label>
                      <Slider
                        value={[doc.minQuality]}
                        onValueChange={(value) => {
                          setDocumentRequirements(
                            documentRequirements.map((d) =>
                              d.id === doc.id ? { ...d, minQuality: value[0] } : d
                            )
                          )
                        }}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button onClick={handleAddDocumentType} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Document Type
              </Button>

              <div className="flex justify-end">
                <Button disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Document Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when to receive KYC notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email alerts for KYC events
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Slack Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to Slack channel
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.slackIntegration}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, slackIntegration: checked })
                    }
                  />
                </div>

                {notificationSettings.slackIntegration && (
                  <div className="space-y-2 pl-4">
                    <Label>Webhook URL</Label>
                    <Input
                      placeholder="https://hooks.slack.com/services/..."
                      value={notificationSettings.webhookUrl}
                      onChange={(e) =>
                        setNotificationSettings({ ...notificationSettings, webhookUrl: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Notification Events</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>New Submission</Label>
                    <Switch
                      checked={notificationSettings.notifyOnSubmission}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, notifyOnSubmission: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Application Approved</Label>
                    <Switch
                      checked={notificationSettings.notifyOnApproval}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, notifyOnApproval: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Application Rejected</Label>
                    <Switch
                      checked={notificationSettings.notifyOnRejection}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, notifyOnRejection: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>High Risk Flagged</Label>
                    <Switch
                      checked={notificationSettings.notifyOnFlagged}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, notifyOnFlagged: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>
                Export KYC data for compliance and reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Input type="date" placeholder="Start date" />
                    <Input type="date" placeholder="End date" />
                  </div>
                </div>

                <div>
                  <Label>Export Format</Label>
                  <Select defaultValue="csv">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel (XLSX)</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Include Data</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch defaultChecked />
                      <Label className="font-normal">Personal Information</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch defaultChecked />
                      <Label className="font-normal">Verification Results</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch defaultChecked />
                      <Label className="font-normal">Risk Scores</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <Label className="font-normal">Document Images</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch defaultChecked />
                      <Label className="font-normal">Audit Logs</Label>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Export Notice</AlertTitle>
                <AlertDescription>
                  Large exports may take several minutes. You'll receive an email with the download link when ready.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button onClick={handleExportData} disabled={loading}>
                  <Download className="h-4 w-4 mr-2" />
                  Export KYC Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Monitoring</CardTitle>
              <CardDescription>
                Real-time status of KYC processing systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Status</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(systemHealth.apiStatus)}`} />
                      <span className="text-sm capitalize">{systemHealth.apiStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Verification Service</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(systemHealth.verificationServiceStatus)}`} />
                      <span className="text-sm capitalize">{systemHealth.verificationServiceStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Storage Service</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(systemHealth.storageStatus)}`} />
                      <span className="text-sm capitalize">{systemHealth.storageStatus}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>System Uptime</Label>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{systemHealth.uptime}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>

                <div className="space-y-2">
                  <Label>Processing Capacity</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            systemHealth.processingCapacity > 80
                              ? "bg-red-500"
                              : systemHealth.processingCapacity > 60
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${systemHealth.processingCapacity}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium">{systemHealth.processingCapacity}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Current load</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Last checked: {new Date(systemHealth.lastCheck).toLocaleString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkSystemHealth}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>Need Help?</AlertTitle>
            <AlertDescription>
              For technical support or system issues, contact the engineering team at tech@clearhold.app
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}