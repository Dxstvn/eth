"use client"

import React, { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  Camera,
  Shield,
  ClipboardCheck,
  RefreshCw
} from "lucide-react"
import { DocumentUploadStep } from "./steps/DocumentUploadStep"
import { LivenessCheckStep } from "./steps/LivenessCheckStep"
import { AddressProofStep } from "./steps/AddressProofStep"
import { KYCVerificationWorkflow, WORKFLOW_STEPS, WorkflowStepName } from "@/lib/services/kyc-verification-workflow"
import { performFullVerification, generateVerificationReport } from "@/lib/services/mock-verification-service"

interface WorkflowStepStatus {
  name: WorkflowStepName
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  message?: string
}

export function KYCWorkflowDemo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStepStatus[]>([])
  const [documents, setDocuments] = useState<any>({})
  const [selfieData, setSelfieData] = useState<any>(null)
  const [addressProof, setAddressProof] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const steps = [
    { id: 'documents', title: 'Identity Documents', icon: FileText },
    { id: 'selfie', title: 'Selfie & Liveness', icon: Camera },
    { id: 'address', title: 'Address Proof', icon: ClipboardCheck },
    { id: 'verification', title: 'Verification', icon: Shield }
  ]
  
  const handleDocumentsComplete = useCallback((docs: any) => {
    setDocuments(docs)
    setCurrentStep(1)
  }, [])
  
  const handleSelfieComplete = useCallback((data: any) => {
    setSelfieData(data)
    setCurrentStep(2)
  }, [])
  
  const handleAddressComplete = useCallback((data: any) => {
    setAddressProof(data)
    setCurrentStep(3)
    // Automatically start verification
    handleStartVerification()
  }, [])
  
  const handleStartVerification = useCallback(async () => {
    setWorkflowStatus('processing')
    setError(null)
    
    // Initialize workflow steps
    const initialSteps: WorkflowStepStatus[] = WORKFLOW_STEPS.map(name => ({
      name: name as WorkflowStepName,
      status: 'pending'
    }))
    setWorkflowSteps(initialSteps)
    
    try {
      // Create workflow instance
      const workflow = new KYCVerificationWorkflow()
      
      // Simulate step-by-step processing
      for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
        const stepName = WORKFLOW_STEPS[i]
        
        // Update step status to in_progress
        setWorkflowSteps(prev => prev.map((step, index) => 
          index === i ? { ...step, status: 'in_progress' } : step
        ))
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
        
        // Update step status to completed (with 90% success rate)
        const success = Math.random() > 0.1
        setWorkflowSteps(prev => prev.map((step, index) => 
          index === i ? { 
            ...step, 
            status: success ? 'completed' : 'failed',
            message: success ? undefined : 'Verification failed'
          } : step
        ))
        
        if (!success && i < 4) { // Fail early for critical steps
          throw new Error(`${stepName} failed`)
        }
      }
      
      // Perform actual verification
      const primaryDoc = Object.values(documents).find((doc: any) => doc.type && doc.file)
      if (primaryDoc && selfieData?.capturedImage) {
        const result = await performFullVerification(
          primaryDoc.extractedData || primaryDoc.ocrResult?.extractedData,
          primaryDoc.file,
          selfieData.capturedImage,
          addressProof?.file
        )
        
        setVerificationResult(result)
        setWorkflowStatus(result.success ? 'completed' : 'failed')
      } else {
        throw new Error('Missing required documents')
      }
    } catch (err) {
      console.error('Verification error:', err)
      setError(err instanceof Error ? err.message : 'Verification failed')
      setWorkflowStatus('failed')
    }
  }, [documents, selfieData, addressProof])
  
  const handleRetry = useCallback(() => {
    setCurrentStep(0)
    setWorkflowStatus('idle')
    setVerificationResult(null)
    setWorkflowSteps([])
    setDocuments({})
    setSelfieData(null)
    setAddressProof(null)
    setError(null)
  }, [])
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <DocumentUploadStep
            onComplete={handleDocumentsComplete}
            initialDocuments={documents}
          />
        )
      case 1:
        return (
          <LivenessCheckStep
            onComplete={handleSelfieComplete}
            onBack={() => setCurrentStep(0)}
          />
        )
      case 2:
        return (
          <AddressProofStep
            onComplete={handleAddressComplete}
            onBack={() => setCurrentStep(1)}
          />
        )
      case 3:
        return (
          <Card className="shadow-soft border-gray-200">
            <CardHeader>
              <CardTitle className="text-2xl text-teal-900">Verification in Progress</CardTitle>
              <CardDescription className="text-gray-600">
                Please wait while we verify your documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {workflowStatus === 'processing' && (
                <div className="space-y-4">
                  {workflowSteps.map((step, index) => (
                    <div key={step.name} className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {step.status === 'completed' && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {step.status === 'failed' && (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        {step.status === 'in_progress' && (
                          <Loader2 className="h-5 w-5 text-teal-600 animate-spin" />
                        )}
                        {step.status === 'pending' && (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{step.name}</p>
                        {step.message && (
                          <p className="text-xs text-red-600">{step.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {workflowStatus === 'completed' && verificationResult && (
                <div className="space-y-4">
                  <Alert className={verificationResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                    {verificationResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={verificationResult.success ? "text-green-800" : "text-red-800"}>
                      {verificationResult.success 
                        ? "Your identity has been successfully verified!"
                        : "Verification failed. Please review the issues below."}
                    </AlertDescription>
                  </Alert>
                  
                  {/* Verification Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Overall Status</p>
                      <Badge 
                        variant={verificationResult.overallStatus === 'approved' ? 'success' : 'destructive'}
                        className="mt-1"
                      >
                        {verificationResult.overallStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Risk Level</p>
                      <Badge 
                        variant={verificationResult.riskAssessment?.level === 'low' ? 'success' : 'secondary'}
                        className="mt-1"
                      >
                        {verificationResult.riskAssessment?.level || 'Unknown'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Document Check</p>
                      <Badge 
                        variant={verificationResult.documentVerification?.isAuthentic ? 'success' : 'destructive'}
                        className="mt-1"
                      >
                        {verificationResult.documentVerification?.isAuthentic ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Face Match</p>
                      <Badge 
                        variant={verificationResult.faceMatch?.match ? 'success' : 'destructive'}
                        className="mt-1"
                      >
                        {verificationResult.faceMatch?.match ? 'Matched' : 'No Match'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-center gap-4 pt-4">
                    {verificationResult.success ? (
                      <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                        Continue to Dashboard
                      </Button>
                    ) : (
                      <Button onClick={handleRetry} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {workflowStatus === 'failed' && error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-soft p-6">
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full
                  ${isCompleted ? 'bg-teal-600 text-white' : 
                    isActive ? 'bg-teal-100 text-teal-600 border-2 border-teal-600' : 
                    'bg-gray-100 text-gray-400'}
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`ml-4 w-16 h-0.5 ${
                    isCompleted ? 'bg-teal-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
        <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />
      </div>
      
      {/* Step Content */}
      {renderStepContent()}
    </div>
  )
}