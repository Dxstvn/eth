"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, Search, SlidersHorizontal, Upload, AlertCircle, Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useDatabaseStore } from "@/lib/mock-database"
import { useAuth } from "@/context/auth-context"
import { downloadFromIPFS, isIPFSNodeAvailable } from "@/lib/ipfs-client"
import { decryptFile } from "@/lib/crypto-utils"
import FileUpload from "@/components/file-upload"
import IPFSStatus from "@/components/ipfs-status"

export default function DocumentsPage() {
  const { user } = useAuth()
  const { getDocuments, getTransactions, addDocument } = useDatabaseStore()

  const [dealId, setDealId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [documents, setDocuments] = useState(getDocuments())
  const [transactions, setTransactions] = useState(getTransactions())
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState("newest")
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [ipfsAvailable, setIpfsAvailable] = useState<boolean | null>(null)
  const [checkingIpfs, setCheckingIpfs] = useState(false)

  // Check IPFS availability on mount
  useEffect(() => {
    const checkIpfs = async () => {
      setCheckingIpfs(true)
      try {
        const available = await isIPFSNodeAvailable()
        setIpfsAvailable(available)
      } catch (err) {
        console.error("Error checking IPFS:", err)
        setIpfsAvailable(false)
      } finally {
        setCheckingIpfs(false)
      }
    }

    checkIpfs()
  }, [])

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Refresh data
  useEffect(() => {
    setDocuments(getDocuments())
    setTransactions(getTransactions())
  }, [getDocuments, getTransactions])

  const handleUploadComplete = (
    cid: string,
    fileKey: string,
    encryptionKey: string,
    fileName: string,
    fileSize: string,
    fileType: string,
  ) => {
    if (!user) {
      setError("User not authenticated")
      return
    }

    try {
      // Prepare document metadata
      const newDocument = {
        name: fileName,
        cid: cid,
        fileKey: fileKey, // Store the fileKey for Filebase
        encryptionKey: encryptionKey,
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        size: fileSize,
        type: fileType,
        status: "pending" as const,
        dealId: dealId,
      }

      // Add to mock database
      addDocument(newDocument)

      // Update local state
      setDocuments(getDocuments())

      // Close dialog after a short delay
      setTimeout(() => {
        setShowUploadDialog(false)
      }, 2000)
    } catch (err) {
      console.error("Error saving document metadata:", err)
      setError(`Failed to save document metadata: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleDownload = async (document: any) => {
    if (downloadingId) return // Prevent multiple downloads

    // Check IPFS availability before attempting download
    setCheckingIpfs(true)
    const available = await isIPFSNodeAvailable()
    setIpfsAvailable(available)
    setCheckingIpfs(false)

    if (!available) {
      setError("IPFS service is not available. Cannot download document.")
      return
    }

    setDownloadingId(document.cid)
    try {
      // Download encrypted file from IPFS using fileKey
      const encryptedBlob = await downloadFromIPFS(document.fileKey || document.cid) // Support both new and old documents

      // Decrypt the file
      const decryptedBlob = await decryptFile(encryptedBlob, document.encryptionKey)

      // Create download link
      const url = URL.createObjectURL(decryptedBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = document.name
      document.body.appendChild(a)
      a.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
    } catch (err) {
      console.error("Download error:", err)
      setError(`Failed to download document: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setDownloadingId(null)
    }
  }

  const checkIpfsConnection = async () => {
    setCheckingIpfs(true)
    setError(null)
    try {
      const available = await isIPFSNodeAvailable()
      setIpfsAvailable(available)
      if (!available) {
        setError("IPFS service is still not available. Document uploads and downloads will not work.")
      }
    } catch (err) {
      console.error("Error checking IPFS:", err)
      setIpfsAvailable(false)
      setError(`Failed to check IPFS connection: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setCheckingIpfs(false)
    }
  }

  // Filter and sort documents
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const getTime = (timestamp: string) => new Date(timestamp).getTime()

      switch (sortOrder) {
        case "newest":
          return getTime(b.uploadedAt) - getTime(a.uploadedAt)
        case "oldest":
          return getTime(a.uploadedAt) - getTime(b.uploadedAt)
        case "name_asc":
          return a.name.localeCompare(b.name)
        case "name_desc":
          return b.name.localeCompare(a.name)
        default:
          return 0
      }
    })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Documents</h1>
          <p className="text-neutral-600">Manage and access all your transaction documents</p>
        </div>
        <div className="flex items-center gap-2">
          <IPFSStatus />
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="bg-brand-600 hover:bg-brand-700">
                <Upload className="mr-2 h-4 w-4" /> Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a document to IPFS. The file will be encrypted before uploading.
                </DialogDescription>
              </DialogHeader>

              {ipfsAvailable === false && (
                <Alert className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>IPFS Not Available</AlertTitle>
                  <AlertDescription>
                    <p>Cannot connect to IPFS service. File uploads will not work until connection is restored.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkIpfsConnection}
                      disabled={checkingIpfs}
                      className="mt-2"
                    >
                      {checkingIpfs ? (
                        <>
                          <Database className="mr-2 h-4 w-4 animate-spin" /> Checking...
                        </>
                      ) : (
                        <>
                          <Database className="mr-2 h-4 w-4" /> Check Connection
                        </>
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="deal">Select Deal</Label>
                  <Select value={dealId} onValueChange={setDealId}>
                    <SelectTrigger id="deal">
                      <SelectValue placeholder="Select a deal" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactions.map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.propertyAddress} ({deal.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {dealId && <FileUpload onUploadComplete={handleUploadComplete} dealId={dealId} />}

                {error && !dealId && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Please select a deal first</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && !showUploadDialog && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {ipfsAvailable === false && !error && (
        <Alert className="bg-amber-50 text-amber-700 border-amber-200 mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>IPFS Not Available</AlertTitle>
          <AlertDescription>
            <p>
              Cannot connect to IPFS service. Document uploads and downloads will not work until connection is restored.
            </p>
            <Button variant="outline" size="sm" onClick={checkIpfsConnection} disabled={checkingIpfs} className="mt-2">
              {checkingIpfs ? (
                <>
                  <Database className="mr-2 h-4 w-4 animate-spin" /> Checking...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" /> Check Connection
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-8 shadow-soft border-0">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documents..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
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
              <Button
                variant="outline"
                size="icon"
                className="text-brand-700 hover:bg-brand-50 hover:text-brand-800 border-brand-200"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-gray-200 p-2 rounded-md h-10 w-10"></div>
                  <div className="w-full">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="space-y-4">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className="bg-white border border-gray-100 rounded-lg p-5 shadow-soft hover:shadow-md transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-gray-100 p-2 rounded-md">
                    <FileText className="h-6 w-6 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1 text-brand-900">{document.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                      <span>
                        {document.type || "DOC"} • {document.size || "Unknown size"}
                      </span>
                      <span>Added on {new Date(document.uploadedAt).toLocaleDateString()}</span>
                      <span>Transaction: {document.dealId}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      document.status === "signed"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }
                  >
                    {document.status === "signed" ? "Signed" : "Pending"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap text-brand-700 hover:bg-brand-50 hover:text-brand-800 border-brand-200"
                    onClick={() => handleDownload(document)}
                    disabled={downloadingId === document.cid || ipfsAvailable === false}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {downloadingId === document.cid ? "Downloading..." : "Download"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-neutral-50 rounded-lg">
          <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-brand-900 mb-1">No documents found</h3>
          <p className="text-neutral-500">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Upload your first document to get started"}
          </p>
        </div>
      )}
    </div>
  )
}
