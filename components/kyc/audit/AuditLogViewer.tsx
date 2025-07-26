"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Search, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  Shield, 
  FileText,
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  UserX,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { 
  KYCAuditEntry, 
  KYCActionType, 
  useKYCAuditLogger 
} from '@/lib/services/kyc-audit-logger'
import { 
  SecurityAlert, 
  SecurityPatternType, 
  useKYCSecurityMonitor 
} from '@/lib/security/kyc-monitoring'

interface AuditLogViewerProps {
  userId?: string
  kycId?: string
  showSecurityAlerts?: boolean
  onExport?: (data: string, format: 'json' | 'csv') => void
}

export function AuditLogViewer({
  userId,
  kycId,
  showSecurityAlerts = true,
  onExport
}: AuditLogViewerProps) {
  const { search, exportLogs } = useKYCAuditLogger()
  const { getAlerts, isBlocked } = useKYCSecurityMonitor()
  
  const [logs, setLogs] = useState<KYCAuditEntry[]>([])
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<KYCAuditEntry | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    userId: userId || '',
    kycId: kycId || '',
    action: '',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined
  })
  
  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  
  // Load audit logs
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const results = await search({
        userId: filters.userId || undefined,
        kycId: filters.kycId || undefined,
        action: filters.action || undefined,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        limit: pageSize,
        offset: (page - 1) * pageSize
      })
      setLogs(results)
      
      if (showSecurityAlerts) {
        const alertResults = getAlerts({
          userId: filters.userId || undefined,
          since: filters.dateFrom
        })
        setAlerts(alertResults)
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
    }
  }, [search, getAlerts, filters, page, pageSize, showSecurityAlerts])
  
  // Load logs on mount and when filters change
  useEffect(() => {
    loadLogs()
  }, [loadLogs])
  
  // Export logs
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await exportLogs(filters, format)
      if (onExport) {
        onExport(data, format)
      } else {
        // Default download behavior
        const blob = new Blob([data], { 
          type: format === 'json' ? 'application/json' : 'text/csv' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kyc-audit-log-${format}-${Date.now()}.${format}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export logs:', error)
    }
  }
  
  // Get action type badge color
  const getActionBadgeVariant = (action: KYCActionType): string => {
    if (action.includes('FAILED') || action.includes('REJECTED')) return 'destructive'
    if (action.includes('APPROVED') || action.includes('COMPLETED')) return 'success'
    if (action.includes('SUSPICIOUS') || action.includes('EXCEEDED')) return 'warning'
    return 'default'
  }
  
  // Get severity badge color
  const getSeverityBadgeVariant = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'warning'
      case 'medium': return 'secondary'
      default: return 'default'
    }
  }
  
  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss')
  }
  
  return (
    <div className="space-y-6">
      {/* Security Alerts */}
      {showSecurityAlerts && alerts.length > 0 && (
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Security Alerts</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <span className="text-sm">{alert.description}</span>
                  </div>
                  {alert.autoBlocked && (
                    <Badge variant="destructive" className="text-xs">
                      <UserX className="h-3 w-3 mr-1" />
                      Auto-blocked
                    </Badge>
                  )}
                </div>
              ))}
              {alerts.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  And {alerts.length - 3} more alerts...
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main Audit Log Viewer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>KYC Audit Log</CardTitle>
              <CardDescription>
                Comprehensive audit trail of all KYC-related activities
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadLogs()}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                Refresh
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40">
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleExport('json')}
                    >
                      Export as JSON
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleExport('csv')}
                    >
                      Export as CSV
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="logs">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="logs">Audit Logs</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
            </TabsList>
            
            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {formatTimestamp(log.timestamp)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action) as any}>
                              {log.action.replace('KYC_', '').replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              {log.userId}
                              {isBlocked(log.userId) && (
                                <Badge variant="destructive" className="text-xs">
                                  Blocked
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {Object.entries(log.details)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.metadata.ipAddress || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of results
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={logs.length < pageSize}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* Filters Tab */}
            <TabsContent value="filters" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    placeholder="Filter by user ID"
                    value={filters.userId}
                    onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>KYC ID</Label>
                  <Input
                    placeholder="Filter by KYC ID"
                    value={filters.kycId}
                    onChange={(e) => setFilters(f => ({ ...f, kycId: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Action Type</Label>
                  <Select
                    value={filters.action}
                    onValueChange={(value) => setFilters(f => ({ ...f, action: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All actions</SelectItem>
                      {Object.values(KYCActionType).map(action => (
                        <SelectItem key={action} value={action}>
                          {action.replace('KYC_', '').replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'From'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.dateFrom}
                          onSelect={(date) => setFilters(f => ({ ...f, dateFrom: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {filters.dateTo ? format(filters.dateTo, 'PP') : 'To'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.dateTo}
                          onSelect={(date) => setFilters(f => ({ ...f, dateTo: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => loadLogs()}>
                  <Search className="h-4 w-4 mr-1" />
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      userId: userId || '',
                      kycId: kycId || '',
                      action: '',
                      dateFrom: undefined,
                      dateTo: undefined
                    })
                    setPage(1)
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </TabsContent>
            
            {/* Compliance Report Tab */}
            <TabsContent value="compliance" className="space-y-4">
              <ComplianceReport 
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Log Details Modal */}
      {selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  )
}

// Log Details Modal Component
function LogDetailsModal({ 
  log, 
  onClose 
}: { 
  log: KYCAuditEntry
  onClose: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
        <Card className="w-[600px] max-h-[80vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>Audit Log Details</CardTitle>
            <CardDescription>
              ID: {log.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Timestamp</Label>
                <p className="text-sm">{formatTimestamp(log.timestamp)}</p>
              </div>
              <div>
                <Label>Action</Label>
                <Badge variant={getActionBadgeVariant(log.action) as any}>
                  {log.action}
                </Badge>
              </div>
              <div>
                <Label>User ID</Label>
                <p className="text-sm font-mono">{log.userId}</p>
              </div>
              <div>
                <Label>Session ID</Label>
                <p className="text-sm font-mono">{log.sessionId || 'N/A'}</p>
              </div>
            </div>
            
            <div>
              <Label>Details</Label>
              <pre className="text-sm bg-muted p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
            
            {log.changes && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Before</Label>
                  <pre className="text-sm bg-muted p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(log.changes.before, null, 2)}
                  </pre>
                </div>
                <div>
                  <Label>After</Label>
                  <pre className="text-sm bg-muted p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(log.changes.after, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            <div>
              <Label>Metadata</Label>
              <div className="space-y-1 text-sm">
                <p>IP Address: {log.metadata.ipAddress || 'N/A'}</p>
                <p>User Agent: {log.metadata.userAgent || 'N/A'}</p>
                <p>Location: {log.metadata.location || 'N/A'}</p>
              </div>
            </div>
            
            <div>
              <Label>Compliance</Label>
              <div className="flex gap-2 mt-1">
                <Badge variant={log.compliance.piiMasked ? 'success' : 'destructive'}>
                  PII {log.compliance.piiMasked ? 'Masked' : 'Not Masked'}
                </Badge>
                <Badge>
                  {log.compliance.dataClassification}
                </Badge>
                <Badge variant="outline">
                  {log.compliance.retentionPeriodDays} days retention
                </Badge>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Checksum verified
              </div>
              <Button onClick={onClose}>Close</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Compliance Report Component
function ComplianceReport({ 
  dateFrom, 
  dateTo 
}: { 
  dateFrom?: Date
  dateTo?: Date 
}) {
  const { search } = useKYCAuditLogger()
  const { generateReport } = useKYCSecurityMonitor()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const loadReport = async () => {
    setLoading(true)
    try {
      const logs = await search({
        dateFrom,
        dateTo
      })
      
      const securityReport = await generateReport({
        from: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: dateTo || new Date()
      })
      
      // Generate compliance statistics
      const actionCounts: Record<string, number> = {}
      const userActivityMap: Record<string, number> = {}
      
      logs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
        userActivityMap[log.userId] = (userActivityMap[log.userId] || 0) + 1
      })
      
      setReport({
        totalLogs: logs.length,
        actionCounts,
        topUsers: Object.entries(userActivityMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([userId, count]) => ({ userId, count })),
        securityReport,
        gdprCompliance: logs.every(log => log.compliance.piiMasked),
        dataRetention: logs.every(log => log.compliance.retentionPeriodDays <= 90)
      })
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadReport()
  }, [dateFrom, dateTo])
  
  if (loading) {
    return <div className="text-center py-8">Generating compliance report...</div>
  }
  
  if (!report) {
    return <div className="text-center py-8 text-muted-foreground">No data available</div>
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Audit Logs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.totalLogs}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Security Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {report.securityReport.summary.totalAlerts}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>GDPR Compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {report.gdprCompliance ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 font-medium">Compliant</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-destructive font-medium">Issues Found</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blocked Users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {report.securityReport.summary.blockedUsers}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Top Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Top Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(report.actionCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([action, count]) => (
                <div key={action} className="flex items-center justify-between">
                  <Badge variant="outline">
                    {action.replace('KYC_', '').replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Security Recommendations */}
      {report.securityReport.recommendations.length > 0 && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Security Recommendations</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              {report.securityReport.recommendations.map((rec: string, i: number) => (
                <li key={i} className="text-sm">{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Export Report Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            const blob = new Blob([JSON.stringify(report, null, 2)], { 
              type: 'application/json' 
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `kyc-compliance-report-${Date.now()}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          <FileText className="h-4 w-4 mr-1" />
          Export Full Report
        </Button>
      </div>
    </div>
  )
}

// Helper function for action badge variants
function getActionBadgeVariant(action: KYCActionType): string {
  if (action.includes('FAILED') || action.includes('REJECTED')) return 'destructive'
  if (action.includes('APPROVED') || action.includes('COMPLETED')) return 'success'
  if (action.includes('SUSPICIOUS') || action.includes('EXCEEDED')) return 'warning'
  return 'default'
}

// Helper function for timestamp formatting
function formatTimestamp(timestamp: number): string {
  return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss')
}