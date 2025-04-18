"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Clock, LockKeyhole, Shield, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { motion } from "framer-motion"

interface TransactionSuccessProps {
  transactionId: string
  propertyAddress: string
  counterpartyName: string
  amount: string
  currency: string
  transactionType: "purchase" | "sale"
  contractRequirements: {
    titleVerification: boolean
    inspectionReport: boolean
    appraisalService: boolean
    fundingRequired: boolean
    escrowPeriod: number
    automaticRelease: boolean
    disputeResolution: boolean
  }
}

export default function TransactionSuccess({
  transactionId,
  propertyAddress,
  counterpartyName,
  amount,
  currency,
  transactionType,
  contractRequirements,
}: TransactionSuccessProps) {
  const isBuyer = transactionType === "purchase"
  const isSeller = transactionType === "sale"

  return (
    <div className="container px-4 md:px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-4">
            <LockKeyhole className="h-8 w-8 text-teal-700" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-teal-900">
            {isBuyer ? "Funds Securely Held in Escrow" : "Escrow Contract Created"}
          </h1>
          <p className="text-neutral-600 mt-2">
            {isBuyer
              ? "Your funds are now locked in a smart contract and will only be released when all required conditions are met."
              : "Your escrow contract has been created successfully and is ready for the buyer to deposit funds."}
          </p>
        </div>

        <Card className="mb-6 border-teal-100 shadow-md">
          <CardHeader className="pb-2 border-b">
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Smart contract has been deployed to the blockchain</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-500">Transaction ID</h3>
                <p className="font-medium">{transactionId}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-500">Status</h3>
                <div className="flex items-center">
                  <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {isBuyer ? "Awaiting Seller Documents" : "Awaiting Buyer Funding"}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-500">Property</h3>
                <p className="font-medium">{propertyAddress}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-500">Counterparty</h3>
                <p className="font-medium">{counterpartyName}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-500">
                  {isBuyer ? "Amount in Escrow" : "Expected Amount"}
                </h3>
                <p className="font-medium">
                  {amount} {currency.toUpperCase()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-500">Estimated Completion</h3>
                <p className="font-medium">7-14 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="mb-6 bg-teal-50 border-teal-200 text-teal-800">
          <Shield className="h-4 w-4" />
          <AlertTitle>{isBuyer ? "Funds Securely Held in Escrow" : "Escrow Contract Created Successfully"}</AlertTitle>
          <AlertDescription>
            {isBuyer
              ? "Your funds are locked in a smart contract and will only be released when all required conditions are met and verified."
              : "The escrow contract has been created. Once the buyer deposits funds, they will be held securely until all conditions are met."}
          </AlertDescription>
        </Alert>

        <Card className="mb-6 border-0 shadow-md">
          <CardHeader className="pb-2 border-b">
            <CardTitle>Next Steps Required</CardTitle>
            <CardDescription>The following steps must be completed to finalize the transaction</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Buyer's view - steps */}
              {isBuyer && (
                <>
                  <div className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-teal-900">Funds Deposited in Escrow</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        You have successfully deposited funds into the escrow contract
                      </p>
                      <div className="mt-2 flex items-center text-xs text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" /> Completed
                      </div>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                        <span className="text-sm font-bold">2</span>
                      </div>
                      <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-teal-900">Seller Document Submission</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        The seller must upload required documents:
                        {contractRequirements.titleVerification && " Title deeds submission,"}
                        {contractRequirements.inspectionReport && " Inspection report,"}
                        {contractRequirements.appraisalService && " Property appraisal"}
                      </p>
                      <div className="mt-2 flex items-center text-xs text-amber-800">
                        <Clock className="h-3 w-3 mr-1" /> Waiting for seller
                        <span className="ml-auto text-neutral-500">Estimated: 1-3 days</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
                        <span className="text-sm font-bold">3</span>
                      </div>
                      <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-700">Document Verification</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        Documents will be verified for authenticity and compliance with requirements
                      </p>
                      <div className="mt-2 flex items-center text-xs text-neutral-500">
                        <Clock className="h-3 w-3 mr-1" /> Awaiting previous step
                        <span className="ml-auto text-neutral-500">Estimated: 2-4 days</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
                        <span className="text-sm font-bold">4</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-700">Funds Release</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        Once all conditions are met, funds will be released from escrow to the seller
                      </p>
                      <div className="mt-2 flex items-center text-xs text-neutral-500">
                        <Clock className="h-3 w-3 mr-1" /> Awaiting previous steps
                        <span className="ml-auto text-neutral-500">Estimated: 1-2 days</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Seller's view - steps */}
              {isSeller && (
                <>
                  <div className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-teal-900">Escrow Contract Created</h3>
                      <p className="text-sm text-neutral-600 mt-1">You have successfully created the escrow contract</p>
                      <div className="mt-2 flex items-center text-xs text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" /> Completed
                      </div>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                        <span className="text-sm font-bold">2</span>
                      </div>
                      <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-teal-900">Buyer Funding</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        The buyer must deposit funds into the escrow contract
                      </p>
                      <div className="mt-2 flex items-center text-xs text-amber-800">
                        <Clock className="h-3 w-3 mr-1" /> Waiting for buyer
                        <span className="ml-auto text-neutral-500">Estimated: 1-3 days</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                        <span className="text-sm font-bold">3</span>
                      </div>
                      <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-teal-900">Your Document Submission</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        You need to upload the following required documents:
                      </p>
                      <ul className="ml-6 list-circle">
                        {contractRequirements.titleVerification && <li>Title deeds submission</li>}
                        {contractRequirements.inspectionReport && <li>Inspection report</li>}
                        {contractRequirements.appraisalService && <li>Property appraisal</li>}
                      </ul>
                      <div className="mt-2 flex items-center text-xs text-amber-800">
                        <Clock className="h-3 w-3 mr-1" /> Action required
                        <span className="ml-auto text-neutral-500">Estimated: 1-3 days</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
                        <span className="text-sm font-bold">4</span>
                      </div>
                      <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-700">Document Verification</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        Your documents will be verified for authenticity and compliance with requirements
                      </p>
                      <div className="mt-2 flex items-center text-xs text-neutral-500">
                        <Clock className="h-3 w-3 mr-1" /> Awaiting previous step
                        <span className="ml-auto text-neutral-500">Estimated: 2-4 days</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
                        <span className="text-sm font-bold">5</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-700">Funds Release</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        Once all conditions are met, funds will be released from escrow to you
                      </p>
                      <div className="mt-2 flex items-center text-xs text-neutral-500">
                        <Clock className="h-3 w-3 mr-1" /> Awaiting previous steps
                        <span className="ml-auto text-neutral-500">Estimated: 1-2 days</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            {isBuyer
              ? "Please monitor the transaction status. You'll be notified when the seller uploads the required documents."
              : "Please upload the required documents in the transaction details page to proceed with the escrow process."}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
          <Button asChild className="bg-teal-900 hover:bg-teal-800 text-white">
            <Link href={`/transactions/${transactionId}`} className="flex items-center">
              View Transaction Details <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
