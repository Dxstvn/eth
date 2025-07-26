"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Shield, Upload, Trash2 } from 'lucide-react'
import { useKYCWithAudit } from '@/context/kyc-context-with-audit'
import { kycAuditActions, KYCActionType, kycAuditLogger } from '@/lib/services/kyc-audit-logger'
import { useAuth } from '@/context/auth-context-v2'

/**
 * Example component showing how to integrate audit logging into KYC forms
 * This demonstrates best practices for security-aware KYC implementations
 */
export function KYCFormWithAuditExample() {
  const { user } = useAuth()
  const {
    kycData,
    updatePersonalInfo,
    viewPersonalInfo,
    uploadDocument,
    deleteDocument,
    isUserBlocked,
    error
  } = useKYCWithAudit()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: ''
  })
  
  const [viewedFields, setViewedFields] = useState<Set<string>>(new Set())
  
  // Log form field views (for sensitive data access tracking)
  const handleFieldFocus = (fieldName: string) => {
    if (!viewedFields.has(fieldName)) {
      viewPersonalInfo([fieldName])
      setViewedFields(prev => new Set(prev).add(fieldName))
    }
  }
  
  // Handle form field changes with audit logging
  const handleFieldChange = (fieldName: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
  }
  
  // Submit form with comprehensive audit logging
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isUserBlocked) {
      kycAuditActions.logFailedAuth('Form submission blocked - user restricted')
      return
    }
    
    try {
      // Update personal info (audit logging happens automatically in context)
      updatePersonalInfo(formData)
      
      // Additional custom logging for specific business requirements
      kycAuditLogger.log(KYCActionType.PERSONAL_INFO_SUBMITTED, {
        formSection: 'basic_info',
        fieldsSubmitted: Object.keys(formData).length,
        hasAllRequiredFields: true
      }, {
        kycId: kycData.kycId,
        dataClassification: 'confidential'
      })
      
    } catch (error) {
      console.error('Failed to submit form:', error)
      
      // Log the error
      kycAuditLogger.log(KYCActionType.KYC_SUSPICIOUS_ACTIVITY, {
        reason: 'Form submission error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { kycId: kycData.kycId })
    }
  }
  
  // Handle document upload with audit logging
  const handleDocumentUpload = (file: File, documentType: string) => {
    // Security check: file size limit
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      kycAuditLogger.log(KYCActionType.KYC_SUSPICIOUS_ACTIVITY, {
        reason: 'Oversized file upload attempt',
        fileName: file.name,
        fileSize: file.size,
        maxAllowed: maxSize
      }, { kycId: kycData.kycId })
      return
    }
    
    // Security check: file type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      kycAuditLogger.log(KYCActionType.KYC_SUSPICIOUS_ACTIVITY, {
        reason: 'Invalid file type upload attempt',
        fileName: file.name,
        fileType: file.type,
        allowedTypes: allowedTypes.join(', ')
      }, { kycId: kycData.kycId })
      return
    }
    
    // Log successful upload
    uploadDocument(documentType, file.name, file.size)
    
    // Simulate file processing
    // In production, this would upload to secure storage
  }
  
  // Handle document deletion with audit logging
  const handleDocumentDelete = (documentType: string, fileName: string) => {
    // Confirm deletion intent
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }
    
    // Log deletion
    deleteDocument(documentType, fileName)
  }
  
  // Monitor for suspicious activity patterns
  useEffect(() => {
    // Example: Detect rapid form changes (potential bot activity)
    let changeCount = 0
    const resetTimer = setInterval(() => {
      if (changeCount > 20) {
        kycAuditLogger.log(KYCActionType.KYC_SUSPICIOUS_ACTIVITY, {
          reason: 'Rapid form changes detected',
          changeCount,
          timeWindow: '10 seconds'
        }, { kycId: kycData.kycId })
      }
      changeCount = 0
    }, 10000)
    
    return () => clearInterval(resetTimer)
  }, [kycData.kycId])
  
  // Rate limiting example
  const [submitAttempts, setSubmitAttempts] = useState(0)
  const [lastSubmitTime, setLastSubmitTime] = useState(0)
  
  const checkRateLimit = (): boolean => {
    const now = Date.now()
    const timeSinceLastSubmit = now - lastSubmitTime
    
    if (timeSinceLastSubmit < 1000) { // Less than 1 second
      setSubmitAttempts(prev => prev + 1)
      
      if (submitAttempts >= 3) {
        kycAuditActions.logRateLimit('form_submission')
        return false
      }
    } else {
      setSubmitAttempts(1)
    }
    
    setLastSubmitTime(now)
    return true
  }
  
  return (
    <div className="space-y-6">
      {/* Security Alert */}
      {isUserBlocked && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account has been temporarily restricted due to security concerns.
            Please contact support for assistance.
          </AlertDescription>
        </Alert>
      )}
      
      {/* KYC Form */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Form with Audit Logging</CardTitle>
          <CardDescription>
            This example demonstrates comprehensive audit logging for KYC processes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  onFocus={() => handleFieldFocus('firstName')}
                  disabled={isUserBlocked}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  onFocus={() => handleFieldFocus('lastName')}
                  disabled={isUserBlocked}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onFocus={() => handleFieldFocus('email')}
                  disabled={isUserBlocked}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                  onFocus={() => handleFieldFocus('dateOfBirth')}
                  disabled={isUserBlocked}
                  required
                />
              </div>
            </div>
            
            {/* Document Upload Section */}
            <div className="space-y-2">
              <Label>Upload ID Document</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleDocumentUpload(file, 'passport')
                    }
                  }}
                  disabled={isUserBlocked}
                  className="hidden"
                  id="document-upload"
                />
                <label
                  htmlFor="document-upload"
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <span>Click to upload document</span>
                </label>
              </div>
            </div>
            
            {/* Submit Button with Rate Limiting */}
            <Button
              type="submit"
              disabled={isUserBlocked || isLoading}
              onClick={(e) => {
                if (!checkRateLimit()) {
                  e.preventDefault()
                  alert('Too many attempts. Please wait a moment.')
                }
              }}
              className="w-full"
            >
              {isLoading ? 'Submitting...' : 'Submit KYC Information'}
            </Button>
          </form>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Audit Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ All form interactions are logged for security compliance</li>
            <li>✓ Document uploads are validated for type and size</li>
            <li>✓ Rate limiting prevents abuse and bot attacks</li>
            <li>✓ Suspicious patterns trigger automatic security alerts</li>
            <li>✓ PII data is automatically masked in audit logs</li>
            <li>✓ Failed attempts are tracked and can trigger account blocks</li>
            <li>✓ All logs are tamper-proof with checksums</li>
            <li>✓ GDPR-compliant with configurable retention periods</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// Example usage in a page
export default function KYCAuditExamplePage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">KYC Form with Comprehensive Audit Logging</h1>
      <KYCFormWithAuditExample />
    </div>
  )
}