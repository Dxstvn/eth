// [SECURITY] Example Secure KYC Form Component

import React, { useState, useCallback } from 'react';
import { useKYCEncryption, KYCEncryptionUtils } from '@/app/(dashboard)/kyc/utils/encryption-helpers';
import { KYCFieldType } from '@/lib/security/kyc-encryption';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, Lock, AlertCircle } from 'lucide-react';

/**
 * Example secure KYC form with client-side encryption
 * This component demonstrates how to:
 * 1. Encrypt PII data before submission
 * 2. Handle document encryption with progress
 * 3. Generate integrity proofs
 * 4. Store encrypted data securely
 */
export function SecureKYCForm() {
  const kycEncryption = useKYCEncryption();
  const [isInitialized, setIsInitialized] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submissionProof, setSubmissionProof] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    ssn: '',
    taxId: '',
    address: '',
    phone: '',
    email: '',
  });
  
  const [documents, setDocuments] = useState<{
    passport?: File;
    utilityBill?: File;
  }>({});
  
  // Initialize encryption with user password
  const handleInitialize = useCallback(async () => {
    try {
      // In production, get password from secure authentication
      const password = prompt('[SECURITY] Enter your encryption password:');
      if (!password) return;
      
      await kycEncryption.initialize(password);
      setIsInitialized(true);
      
      // Check for existing KYC status
      const existingStatus = await kycEncryption.getKYCStatus();
      if (existingStatus) {
        console.log('[SECURITY] Found existing KYC status:', existingStatus);
      }
    } catch (error) {
      console.error('[SECURITY] Initialization failed:', error);
      alert('Failed to initialize encryption');
    }
  }, [kycEncryption]);
  
  // Handle form field changes
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle document upload
  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    documentType: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setDocuments(prev => ({ ...prev, [documentType]: file }));
  };
  
  // Submit encrypted form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isInitialized) {
      alert('Please initialize encryption first');
      return;
    }
    
    try {
      console.log('[SECURITY] Starting KYC submission encryption...');
      
      // 1. Validate fields
      for (const [field, value] of Object.entries(formData)) {
        if (value) {
          const fieldType = getFieldType(field);
          if (!KYCEncryptionUtils.validateField(value, fieldType)) {
            alert(`Invalid format for ${field}`);
            return;
          }
        }
      }
      
      // 2. Encrypt form data
      const encryptedFormData = await kycEncryption.encryptFormData(formData);
      console.log('[SECURITY] Form data encrypted');
      
      // 3. Encrypt documents
      const encryptedDocuments: Record<string, any> = {};
      
      for (const [docType, file] of Object.entries(documents)) {
        if (file) {
          console.log(`[SECURITY] Encrypting ${docType}...`);
          const encrypted = await kycEncryption.encryptDocument(
            file,
            docType,
            (progress) => setUploadProgress(progress)
          );
          encryptedDocuments[docType] = encrypted;
          setUploadProgress(0);
        }
      }
      
      // 4. Generate submission proof
      const submissionData = {
        encryptedFormData,
        encryptedDocuments: Object.keys(encryptedDocuments),
        submittedAt: new Date().toISOString(),
      };
      
      const proof = kycEncryption.generateSubmissionProof(submissionData);
      setSubmissionProof(proof);
      
      // 5. Store KYC status
      await kycEncryption.storeKYCStatus({
        level: 2,
        verified: false,
        documents: Object.keys(encryptedDocuments),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });
      
      console.log('[SECURITY] KYC submission completed with proof:', proof);
      
      // 6. In production, send encrypted data to backend
      // await submitToBackend({ encryptedFormData, encryptedDocuments, proof });
      
      alert('KYC data encrypted and ready for submission!');
    } catch (error) {
      console.error('[SECURITY] Encryption failed:', error);
      alert('Failed to encrypt KYC data');
    }
  };
  
  // Helper to get field type
  const getFieldType = (field: string): KYCFieldType => {
    const mapping: Record<string, KYCFieldType> = {
      fullName: KYCFieldType.FULL_NAME,
      dateOfBirth: KYCFieldType.DATE_OF_BIRTH,
      ssn: KYCFieldType.SSN,
      taxId: KYCFieldType.TAX_ID,
      address: KYCFieldType.ADDRESS,
      phone: KYCFieldType.PHONE,
      email: KYCFieldType.EMAIL,
    };
    return mapping[field] || KYCFieldType.DOCUMENT;
  };
  
  // Render masked value for sensitive fields
  const renderMaskedValue = (field: string, value: string) => {
    if (!value) return '';
    const fieldType = getFieldType(field);
    return KYCEncryptionUtils.maskSensitiveData(value, fieldType);
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Secure KYC Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isInitialized ? (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-4">Initialize encryption to protect your data</p>
              <Button onClick={handleInitialize}>
                Initialize Encryption
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Your data will be encrypted locally before submission
                </AlertDescription>
              </Alert>
              
              {/* Personal Information */}
              <div className="space-y-3">
                <h3 className="font-semibold">Personal Information</h3>
                
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                />
                
                <Input
                  type="date"
                  placeholder="Date of Birth"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                />
                
                <Input
                  type="text"
                  placeholder="SSN (123-45-6789)"
                  value={formData.ssn}
                  onChange={(e) => handleFieldChange('ssn', e.target.value)}
                />
                {formData.ssn && (
                  <p className="text-sm text-gray-500">
                    Masked: {renderMaskedValue('ssn', formData.ssn)}
                  </p>
                )}
                
                <Input
                  type="text"
                  placeholder="Tax ID"
                  value={formData.taxId}
                  onChange={(e) => handleFieldChange('taxId', e.target.value)}
                />
              </div>
              
              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="font-semibold">Contact Information</h3>
                
                <Input
                  type="text"
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                />
                
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                />
                
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
              </div>
              
              {/* Document Upload */}
              <div className="space-y-3">
                <h3 className="font-semibold">Documents</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Passport
                  </label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, 'passport')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Utility Bill
                  </label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, 'utilityBill')}
                  />
                </div>
                
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm">Encrypting document...</p>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
              </div>
              
              <Button type="submit" className="w-full">
                <Lock className="w-4 h-4 mr-2" />
                Encrypt and Submit
              </Button>
            </form>
          )}
          
          {/* Submission Proof */}
          {submissionProof && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Submission Proof</h4>
              <div className="space-y-1 text-sm font-mono">
                <p>Hash: {submissionProof.hash.substring(0, 32)}...</p>
                <p>Signature: {submissionProof.signature.substring(0, 32)}...</p>
                <p>Timestamp: {new Date(submissionProof.timestamp).toISOString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SecureKYCForm;