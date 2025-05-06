"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, Calendar, DollarSign, Clock, CheckCircle, X, Eye, Download, Shield } from "lucide-react"
import TransactionTimeline from "@/components/transaction-timeline"
import TransactionParties from "@/components/transaction-parties"
import { useToast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/file-upload"
import { useDatabaseStore } from "@/lib/mock-database"
import { useAuth } from "@/context/auth-context"
import TransactionReview from "@/components/transaction-review"
import SellerConfirmation from "@/components/seller-confirmation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import TransactionStageIndicator from "@/components/transaction-stage-indicator"

export default function TransactionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { getTransactionById, updateTransaction } = useDatabaseStore()
  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [currentDocument, setCurrentDocument] = useState<any>(null)
  const [requiredDocuments, setRequiredDocuments] = useState([
    { id: "doc1", name: "Purchase Agreement", type: "AGREEMENT", uploaded: true },
    { id: "doc2", name: "Property Inspection", type: "INSPECTION", uploaded: false },
    { id: "doc3", name: "Title Deed", type: "TITLE", uploaded: false },
  ])

  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true)
      try {
        // Get transaction from the database
        const txData = getTransactionById(id as string)
        if (txData) {
          setTransaction(txData)
        }
      } catch (error) {
        console.error("Error fetching transaction:", error)
        toast({
          title: "Error",
          description: "Failed to load transaction details. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchTransaction()
    }
  }, [id, toast, getTransactionById])

  // Determine if the current user is the buyer or seller
  const isBuyer = transaction?.initiatedBy === "seller"
  const isSeller = transaction?.initiatedBy === "buyer" || !transaction?.initiatedBy

  // For seller-initiated transactions where the buyer needs to review
  const needsBuyerReview = transaction?.status === "pending_buyer_review" && isBuyer

  // For buyer-initiated transactions where the seller needs to confirm conditions
  const needsSellerConfirmation = transaction?.status === "awaiting_seller_confirmation" && isSeller

  const handleBuyerReviewComplete = () => {
    // Refresh the transaction data
    const updatedTx = getTransactionById(id as string)
    if (updatedTx) {
      setTransaction(updatedTx)
    }
  }

  const handleSellerConfirmationComplete = () => {
    // Refresh the transaction data
    const updatedTx = getTransactionById(id as string)
    if (updatedTx) {
      setTransaction(updatedTx)
    }
  }

  if (loading) {
    return (
      <div className="container px-4 md:px-6 py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="container px-4 md:px-6 py-10">
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold">Transaction Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The transaction you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => router.push("/transactions")} className="mt-4">
            Back to Transactions
          </Button>
        </div>
      </div>
    )
  }

  // If the transaction needs buyer review, show the review component
  if (needsBuyerReview) {
    return (
      <div className="container px-4 md:px-6 py-10">
        <div className="mb-8">
          <Link href="/transactions" className="flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Transactions
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Review Transaction</h1>
          <p className="text-muted-foreground">Transaction ID: {transaction.id}</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <TransactionReview
            transactionId={transaction.id}
            propertyAddress={transaction.propertyAddress}
            propertyDescription={transaction.description}
            amount={transaction.amount}
            counterpartyName={transaction.counterparty}
            counterpartyWallet="0x71C7656EC7ab88b098defB751B7401B5f6d8976F" // Mock wallet address
            onReviewComplete={handleBuyerReviewComplete}
          />
        </div>
      </div>
    )
  }

  // If the transaction needs seller confirmation, show the confirmation component
  if (needsSellerConfirmation) {
    return (
      <div className="container px-4 md:px-6 py-10">
        <div className="mb-8">
          <Link href="/transactions" className="flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Transactions
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Confirm Transaction Conditions</h1>
          <p className="text-muted-foreground">Transaction ID: {transaction.id}</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <SellerConfirmation
            transactionId={transaction.id}
            propertyAddress={transaction.propertyAddress}
            amount={transaction.amount}
            buyerName={transaction.counterparty}
            buyerConditions={
              transaction.buyerConditions || {
                titleVerification: true,
                inspectionReport: true,
                appraisalService: false,
                fundingRequired: true,
                escrowPeriod: 30,
                automaticRelease: true,
                disputeResolution: true,
              }
            }
            onConfirmationComplete={handleSellerConfirmationComplete}
          />
        </div>
      </div>
    )
  }

  // Standard transaction detail view
  return (
    <div className="container px-4 md:px-6 py-10">
      <div className="mb-8">
        <Link href="/transactions" className="flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Transactions
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{transaction.propertyAddress}</h1>
            <p className="text-muted-foreground">Transaction ID: {transaction.id}</p>
          </div>
          <TransactionStageIndicator stage={transaction.status} size="lg" />
        </div>
      </div>

      {/* Transaction Role Banner */}
      {transaction.initiatedBy && (
        <Alert
          className={
            transaction.initiatedBy === "seller" ? "bg-teal-50 border-teal-200 mb-6" : "bg-blue-50 border-blue-200 mb-6"
          }
        >
          <Shield className={`h-4 w-4 ${transaction.initiatedBy === "seller" ? "text-teal-600" : "text-blue-600"}`} />
          <AlertTitle>
            {transaction.initiatedBy === "seller" ? "Seller Initiated Transaction" : "Buyer Initiated Transaction"}
          </AlertTitle>
          <AlertDescription>
            {transaction.initiatedBy === "seller"
              ? "This transaction was initiated by the seller. The buyer needs to review and add conditions before funding the escrow."
              : "This transaction was initiated by the buyer. The seller will be notified once funds are placed in escrow."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-teal-700 mr-2" />
              <span className="text-2xl font-bold">{transaction.amount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-amber-500 mr-2" />
              <span className="text-lg font-medium capitalize">{transaction.status.replace(/_/g, " ")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Date Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-teal-700 mr-2" />
              <span className="text-lg font-medium">{transaction.date}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Transaction Timeline</CardTitle>
              <CardDescription>Track the progress of your transaction</CardDescription>
            </CardHeader>
            <CardContent>
              {transaction.timeline ? (
                <TransactionTimeline events={transaction.timeline} />
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No timeline events available for this transaction.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transaction Documents</CardTitle>
                <CardDescription>Required documents for this transaction</CardDescription>
              </div>
              <Button onClick={() => setShowDocumentModal(true)} className="bg-teal-900 hover:bg-teal-800 text-white">
                <FileText className="mr-2 h-4 w-4" />
                Manage Documents
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requiredDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-teal-700 mr-3" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">Required for transaction completion</p>
                      </div>
                    </div>
                    {doc.uploaded ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentDocument(doc)
                          setShowUploadModal(true)
                        }}
                      >
                        Upload
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Transaction Parties</CardTitle>
              <CardDescription>People involved in this transaction</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionParties
                buyer={{
                  name: transaction.initiatedBy === "buyer" ? "You" : transaction.counterparty,
                  email: "buyer@example.com",
                }}
                seller={{
                  name: transaction.initiatedBy === "seller" ? "You" : transaction.counterparty,
                  email: "seller@example.com",
                }}
              />
            </CardContent>
          </Card>

          {transaction.buyerConditions && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Transaction Conditions</CardTitle>
                <CardDescription>Conditions set by the buyer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transaction.buyerConditions.titleVerification && (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Title Deeds Submission</span>
                    </div>
                  )}
                  {transaction.buyerConditions.inspectionReport && (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Inspection Report</span>
                    </div>
                  )}
                  {transaction.buyerConditions.appraisalService && (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Property Appraisal</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Escrow Period: {transaction.buyerConditions.escrowPeriod} days</span>
                  </div>
                  {transaction.buyerConditions.automaticRelease && (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Automatic Release When Verified</span>
                    </div>
                  )}
                  {transaction.buyerConditions.disputeResolution && (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Dispute Resolution Mechanism</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{transaction.propertyAddress}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{transaction.description}</p>
                </div>

                {transaction.escrowAddress && (
                  <div>
                    <p className="text-sm text-muted-foreground">Escrow Address</p>
                    <p className="font-mono text-xs break-all">{transaction.escrowAddress}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Upload {currentDocument?.name}</h3>
            <FileUpload
              dealId={transaction.id}
              documentType={currentDocument?.type}
              onUploadComplete={(fileData) => {
                setRequiredDocuments((prev) =>
                  prev.map((doc) => (doc.id === currentDocument?.id ? { ...doc, uploaded: true } : doc)),
                )
                setShowUploadModal(false)
              }}
            />
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowUploadModal(false)} className="mr-2">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Manage Transaction Documents</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDocumentModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Required Documents</h3>
                <div className="space-y-3">
                  {requiredDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-teal-700 mr-3" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">Required for transaction completion</p>
                        </div>
                      </div>
                      {doc.uploaded ? (
                        <div className="flex items-center">
                          <Button variant="ghost" size="sm" className="mr-2">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="mr-2">
                            <Download className="h-4 w-4" />
                          </Button>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentDocument(doc)
                            setShowDocumentModal(false)
                            setShowUploadModal(true)
                          }}
                        >
                          Upload
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Additional Documents</h3>
                <FileUpload
                  dealId={transaction.id}
                  onUploadComplete={(fileData) => {
                    toast({
                      title: "Document uploaded",
                      description: "Your document has been uploaded successfully.",
                    })
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
