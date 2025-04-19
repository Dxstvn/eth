"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

interface DocumentPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: any // Replace 'any' with a more specific type if available
  onApprove?: (documentId: string) => Promise<void>
  onDecline?: (documentId: string) => Promise<void>
}

export default function DocumentPreviewModal({
  open,
  onOpenChange,
  document,
  onApprove,
  onDecline,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    if (!document?.id || !onApprove) return

    setLoading(true)
    try {
      await onApprove(document.id)
      onOpenChange(false) // Close the modal after approval
    } catch (error) {
      console.error("Error approving document:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    if (!document?.id || !onDecline) return

    setLoading(true)
    try {
      await onDecline(document.id)
      onOpenChange(false) // Close the modal after declining
    } catch (error) {
      console.error("Error declining document:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Document Preview</DialogTitle>
          <DialogDescription>Review the document before approving or declining.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {document ? (
            <div className="flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{document.name}</p>
              <p className="text-sm text-muted-foreground">Type: {document.type || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">Size: {document.size || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">
                Uploaded on: {new Date(document.uploadedAt).toLocaleDateString()}
              </p>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {/* Placeholder for document preview */}
                  Document preview is not available in this demo.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No document selected.</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <div className="flex">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDecline}
              disabled={loading || !onDecline}
              className="ml-2"
            >
              Decline
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={loading || !onApprove}
              className="ml-2 bg-teal-900 hover:bg-teal-800 text-white"
            >
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
