"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Download, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Archive, 
  MoreVertical,
  FileText,
  Share2,
  Tag
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface DocumentFile {
  id: string
  filename: string
  url: string
  contentType: string
  size: number
  uploadedAt: string
  uploadedBy: string
  documentType: string
  status: 'pending' | 'approved' | 'rejected'
  fullPath?: string
}

interface DocumentBulkOperationsProps {
  documents: DocumentFile[]
  selectedDocuments: string[]
  onSelectionChange: (selected: string[]) => void
  onBulkAction: (action: string, documentIds: string[]) => Promise<void>
  onPreview: (document: DocumentFile) => void
}

export default function DocumentBulkOperations({
  documents,
  selectedDocuments,
  onSelectionChange,
  onBulkAction,
  onPreview
}: DocumentBulkOperationsProps) {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    action: string
    title: string
    description: string
    variant: 'default' | 'destructive'
  } | null>(null)
  const { toast } = useToast()

  const isAllSelected = documents.length > 0 && selectedDocuments.length === documents.length
  const isPartiallySelected = selectedDocuments.length > 0 && selectedDocuments.length < documents.length

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(documents.map(doc => doc.id))
    }
  }

  const handleSelectDocument = (docId: string) => {
    if (selectedDocuments.includes(docId)) {
      onSelectionChange(selectedDocuments.filter(id => id !== docId))
    } else {
      onSelectionChange([...selectedDocuments, docId])
    }
  }

  const handleBulkAction = (action: string) => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select documents to perform bulk actions",
        variant: "destructive",
      })
      return
    }

    const actionConfigs = {
      approve: {
        title: "Approve Documents",
        description: `Are you sure you want to approve ${selectedDocuments.length} document(s)?`,
        variant: 'default' as const
      },
      reject: {
        title: "Reject Documents", 
        description: `Are you sure you want to reject ${selectedDocuments.length} document(s)?`,
        variant: 'destructive' as const
      },
      delete: {
        title: "Delete Documents",
        description: `Are you sure you want to permanently delete ${selectedDocuments.length} document(s)? This action cannot be undone.`,
        variant: 'destructive' as const
      },
      archive: {
        title: "Archive Documents",
        description: `Are you sure you want to archive ${selectedDocuments.length} document(s)?`,
        variant: 'default' as const
      },
      download: {
        title: "Download Documents",
        description: `Download ${selectedDocuments.length} document(s) as a ZIP file?`,
        variant: 'default' as const
      }
    }

    const config = actionConfigs[action as keyof typeof actionConfigs]
    if (config) {
      setPendingAction({ action, ...config })
      if (action === 'download') {
        // Direct download without confirmation
        executeAction(action)
      } else {
        setIsConfirmDialogOpen(true)
      }
    }
  }

  const executeAction = async (action: string) => {
    try {
      await onBulkAction(action, selectedDocuments)
      onSelectionChange([]) // Clear selection after action
      setIsConfirmDialogOpen(false)
      setPendingAction(null)
      
      toast({
        title: "Action Completed",
        description: `Successfully ${action === 'delete' ? 'deleted' : action + 'd'} ${selectedDocuments.length} document(s)`,
      })
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "Failed to complete action",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  return (
    <>
      <Card className="bg-white shadow-soft border-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isPartiallySelected
                  }}
                  onCheckedChange={handleSelectAll}
                />
                Documents ({documents.length})
              </CardTitle>
              {selectedDocuments.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedDocuments.length} document(s) selected
                </p>
              )}
            </div>

            {/* Bulk Actions - Mobile Responsive */}
            {selectedDocuments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('approve')}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Approve</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('reject')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Reject</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('download')}
                  className="text-teal-600 border-teal-200 hover:bg-teal-50"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Download</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('delete')}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
              <p className="text-gray-500">Upload documents to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Selection Checkbox */}
                  <Checkbox
                    checked={selectedDocuments.includes(doc.id)}
                    onCheckedChange={() => handleSelectDocument(doc.id)}
                  />

                  {/* Document Icon */}
                  <div className="bg-teal-100 p-2 rounded-lg flex-shrink-0">
                    <FileText className="h-5 w-5 text-teal-700" />
                  </div>

                  {/* Document Info - Mobile Responsive */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {doc.filename}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {doc.documentType.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusBadge(doc.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreview(doc)}
                          className="p-2"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingAction?.title}</DialogTitle>
            <DialogDescription>
              {pendingAction?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => pendingAction && executeAction(pendingAction.action)}
              variant={pendingAction?.variant === 'destructive' ? 'destructive' : 'default'}
              className="flex-1"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}