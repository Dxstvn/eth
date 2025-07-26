"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  FileText, 
  Shield, 
  Check, 
  Edit2, 
  AlertCircle, 
  ChevronRight,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  DollarSign,
  Globe,
  FileCheck
} from "lucide-react"
import { useKYC } from "@/context/kyc-context"
import { useRouter } from "next/navigation"
import { countries } from "@/lib/countries"

interface SectionProps {
  title: string
  icon: React.ReactNode
  verified: boolean
  onEdit: () => void
  children: React.ReactNode
}

function ReviewSection({ title, icon, verified, onEdit, children }: SectionProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <div className="flex items-center mt-1">
              {verified ? (
                <Badge variant="success" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Pending Verification
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

interface InfoRowProps {
  label: string
  value: string | undefined
  icon?: React.ReactNode
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  if (!value) return null
  
  return (
    <div className="flex items-start space-x-3 py-2">
      {icon && <div className="text-gray-500 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

export default function KYCReviewSummary() {
  const router = useRouter()
  const { kycData, submitKYC, isLoading } = useKYC()
  const [acceptedFinalTerms, setAcceptedFinalTerms] = useState(false)
  const [digitalSignature, setDigitalSignature] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const getCountryName = (code: string) => {
    return countries.find(c => c.code === code)?.name || code
  }

  const getFundSourceLabels = (sources: string[]) => {
    const labels: Record<string, string> = {
      employment: "Employment/Salary",
      business: "Business Income",
      investment: "Investment Returns",
      inheritance: "Inheritance",
      savings: "Personal Savings",
      real_estate: "Real Estate",
      retirement: "Retirement/Pension",
      other: "Other"
    }
    return sources.map(s => labels[s] || s).join(", ")
  }

  const getPurposeLabels = (purposes: string[]) => {
    const labels: Record<string, string> = {
      real_estate_purchase: "Real Estate Purchase",
      real_estate_sale: "Real Estate Sale",
      business_transaction: "Business Transaction",
      vehicle_purchase: "Vehicle Purchase",
      art_collectibles: "Art & Collectibles",
      freelance_services: "Freelance Services",
      other: "Other"
    }
    return purposes.map(p => labels[p] || p).join(", ")
  }

  const getVolumeLabel = (volume: string) => {
    const labels: Record<string, string> = {
      "0-10k": "Less than $10,000",
      "10k-50k": "$10,000 - $50,000",
      "50k-100k": "$50,000 - $100,000",
      "100k-500k": "$100,000 - $500,000",
      "500k-1m": "$500,000 - $1,000,000",
      "1m+": "More than $1,000,000"
    }
    return labels[volume] || volume
  }

  const calculateRiskScore = () => {
    let score = 0
    const assessment = kycData.riskAssessment
    
    if (assessment) {
      // Higher volumes increase risk
      if (assessment.expectedMonthlyVolume === "500k-1m" || assessment.expectedMonthlyVolume === "1m+") {
        score += 2
      } else if (assessment.expectedMonthlyVolume === "100k-500k") {
        score += 1
      }
      
      // PEP status increases risk
      if (assessment.isPEP) score += 3
      
      // Sanctions concerns increase risk
      if (assessment.hasSanctions) score += 5
      
      // Multiple tax obligations
      if (assessment.taxObligationsCountries && assessment.taxObligationsCountries.length > 2) {
        score += 1
      }
      
      // US Person status
      if (assessment.hasUSPersonStatus) score += 1
    }
    
    if (score >= 5) return "high"
    if (score >= 2) return "medium"
    return "low"
  }

  const handleEdit = (section: string) => {
    switch (section) {
      case "personal":
        router.push("/kyc/personal")
        break
      case "documents":
        router.push("/kyc/documents")
        break
      case "risk":
        router.push("/kyc/risk-assessment")
        break
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!acceptedFinalTerms) {
      newErrors.terms = "Please accept the terms and conditions"
    }
    
    if (!digitalSignature.trim()) {
      newErrors.signature = "Please provide your digital signature"
    } else if (digitalSignature.trim().split(" ").length < 2) {
      newErrors.signature = "Please enter your full name as signature"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    
    try {
      await submitKYC()
      router.push("/kyc/status")
    } catch (error) {
      console.error("Failed to submit KYC:", error)
    }
  }

  const riskScore = calculateRiskScore()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Review Your Information</h1>
        <p className="text-gray-600">
          Please review all information carefully before submitting for verification
        </p>
      </div>

      {/* Risk Assessment Badge */}
      <div className="flex justify-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full">
          <Shield className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium">Risk Assessment:</span>
          <Badge 
            variant={riskScore === "low" ? "success" : riskScore === "medium" ? "warning" : "destructive"}
            className="ml-1"
          >
            {riskScore.toUpperCase()} RISK
          </Badge>
        </div>
      </div>

      {/* Personal Information Section */}
      <ReviewSection
        title="Personal Information"
        icon={<User className="h-5 w-5 text-gray-600" />}
        verified={!!kycData.personalInfo}
        onEdit={() => handleEdit("personal")}
      >
        {kycData.personalInfo ? (
          <div className="grid md:grid-cols-2 gap-x-6">
            <InfoRow 
              label="Full Name" 
              value={`${kycData.personalInfo.firstName} ${kycData.personalInfo.middleName || ""} ${kycData.personalInfo.lastName}`.trim()}
              icon={<User className="h-4 w-4" />}
            />
            <InfoRow 
              label="Date of Birth" 
              value={kycData.personalInfo.dateOfBirth}
              icon={<Calendar className="h-4 w-4" />}
            />
            <InfoRow 
              label="Nationality" 
              value={getCountryName(kycData.personalInfo.nationality)}
              icon={<Globe className="h-4 w-4" />}
            />
            <InfoRow 
              label="Country of Residence" 
              value={getCountryName(kycData.personalInfo.countryOfResidence)}
              icon={<Globe className="h-4 w-4" />}
            />
            <div className="md:col-span-2">
              <InfoRow 
                label="Address" 
                value={`${kycData.personalInfo.address}, ${kycData.personalInfo.city}, ${kycData.personalInfo.state} ${kycData.personalInfo.postalCode}, ${getCountryName(kycData.personalInfo.country)}`}
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>
            <InfoRow 
              label="Phone Number" 
              value={kycData.personalInfo.phoneNumber}
              icon={<Phone className="h-4 w-4" />}
            />
            <InfoRow 
              label="Email" 
              value={kycData.personalInfo.email}
              icon={<Mail className="h-4 w-4" />}
            />
            <InfoRow 
              label="Occupation" 
              value={kycData.personalInfo.occupation}
              icon={<Briefcase className="h-4 w-4" />}
            />
            {kycData.personalInfo.employer && (
              <InfoRow 
                label="Employer" 
                value={kycData.personalInfo.employer}
                icon={<Briefcase className="h-4 w-4" />}
              />
            )}
          </div>
        ) : (
          <p className="text-gray-500">Information not provided</p>
        )}
      </ReviewSection>

      {/* Document Information Section */}
      <ReviewSection
        title="Documents"
        icon={<FileText className="h-5 w-5 text-gray-600" />}
        verified={!!kycData.documentInfo}
        onEdit={() => handleEdit("documents")}
      >
        {kycData.documentInfo ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-x-6">
              <InfoRow 
                label="ID Type" 
                value={kycData.documentInfo.idType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                icon={<FileCheck className="h-4 w-4" />}
              />
              <InfoRow 
                label="ID Number" 
                value={kycData.documentInfo.idNumber}
              />
              <InfoRow 
                label="ID Expiry Date" 
                value={kycData.documentInfo.idExpiryDate}
                icon={<Calendar className="h-4 w-4" />}
              />
              <InfoRow 
                label="Address Proof Type" 
                value={kycData.documentInfo.addressProofType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                icon={<FileCheck className="h-4 w-4" />}
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center">
                <div className={`w-full h-24 rounded-lg flex items-center justify-center ${
                  kycData.documentInfo.idFrontUrl ? "bg-green-50 border-2 border-green-200" : "bg-gray-100"
                }`}>
                  <FileCheck className={`h-8 w-8 ${
                    kycData.documentInfo.idFrontUrl ? "text-green-600" : "text-gray-400"
                  }`} />
                </div>
                <p className="text-sm mt-2">ID Front</p>
              </div>
              
              {kycData.documentInfo.idType !== "passport" && (
                <div className="text-center">
                  <div className={`w-full h-24 rounded-lg flex items-center justify-center ${
                    kycData.documentInfo.idBackUrl ? "bg-green-50 border-2 border-green-200" : "bg-gray-100"
                  }`}>
                    <FileCheck className={`h-8 w-8 ${
                      kycData.documentInfo.idBackUrl ? "text-green-600" : "text-gray-400"
                    }`} />
                  </div>
                  <p className="text-sm mt-2">ID Back</p>
                </div>
              )}
              
              <div className="text-center">
                <div className={`w-full h-24 rounded-lg flex items-center justify-center ${
                  kycData.documentInfo.addressProofUrl ? "bg-green-50 border-2 border-green-200" : "bg-gray-100"
                }`}>
                  <FileCheck className={`h-8 w-8 ${
                    kycData.documentInfo.addressProofUrl ? "text-green-600" : "text-gray-400"
                  }`} />
                </div>
                <p className="text-sm mt-2">Address Proof</p>
              </div>
              
              <div className="text-center">
                <div className={`w-full h-24 rounded-lg flex items-center justify-center ${
                  kycData.documentInfo.selfieUrl ? "bg-green-50 border-2 border-green-200" : "bg-gray-100"
                }`}>
                  <FileCheck className={`h-8 w-8 ${
                    kycData.documentInfo.selfieUrl ? "text-green-600" : "text-gray-400"
                  }`} />
                </div>
                <p className="text-sm mt-2">Selfie</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Documents not uploaded</p>
        )}
      </ReviewSection>

      {/* Risk Assessment Section */}
      <ReviewSection
        title="Risk Assessment & Compliance"
        icon={<Shield className="h-5 w-5 text-gray-600" />}
        verified={!!kycData.riskAssessment}
        onEdit={() => handleEdit("risk")}
      >
        {kycData.riskAssessment ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-x-6">
              <InfoRow 
                label="Source of Funds" 
                value={getFundSourceLabels(kycData.riskAssessment.sourceOfFunds)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              {kycData.riskAssessment.sourceOfFundsOther && (
                <InfoRow 
                  label="Other Source Details" 
                  value={kycData.riskAssessment.sourceOfFundsOther}
                />
              )}
              <InfoRow 
                label="Expected Monthly Volume" 
                value={getVolumeLabel(kycData.riskAssessment.expectedMonthlyVolume)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <InfoRow 
                label="Purpose of Use" 
                value={getPurposeLabels(kycData.riskAssessment.purposeOfUse)}
              />
              {kycData.riskAssessment.purposeOfUseOther && (
                <InfoRow 
                  label="Other Purpose Details" 
                  value={kycData.riskAssessment.purposeOfUseOther}
                />
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">PEP Status</span>
                <Badge variant={kycData.riskAssessment.isPEP ? "destructive" : "success"}>
                  {kycData.riskAssessment.isPEP ? "Yes" : "No"}
                </Badge>
              </div>
              {kycData.riskAssessment.pepDetails && (
                <InfoRow label="PEP Details" value={kycData.riskAssessment.pepDetails} />
              )}
              
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Sanctions Status</span>
                <Badge variant={kycData.riskAssessment.hasSanctions ? "destructive" : "success"}>
                  {kycData.riskAssessment.hasSanctions ? "Disclosed" : "Clear"}
                </Badge>
              </div>
              {kycData.riskAssessment.sanctionsDetails && (
                <InfoRow label="Sanctions Details" value={kycData.riskAssessment.sanctionsDetails} />
              )}
              
              <InfoRow 
                label="Tax Residency" 
                value={getCountryName(kycData.riskAssessment.taxResidencyCountry)}
                icon={<Globe className="h-4 w-4" />}
              />
              
              {kycData.riskAssessment.hasTaxObligationsElsewhere && (
                <InfoRow 
                  label="Additional Tax Obligations" 
                  value={kycData.riskAssessment.taxObligationsCountries?.map(c => getCountryName(c)).join(", ")}
                />
              )}
              
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">US Person Status</span>
                <Badge variant={kycData.riskAssessment.hasUSPersonStatus ? "warning" : "success"}>
                  {kycData.riskAssessment.hasUSPersonStatus ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Assessment not completed</p>
        )}
      </ReviewSection>

      {/* Terms and Digital Signature */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Terms & Digital Signature</CardTitle>
          <CardDescription>
            Please accept the terms and provide your digital signature to submit your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="final-terms"
                checked={acceptedFinalTerms}
                onCheckedChange={(checked) => setAcceptedFinalTerms(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="final-terms" className="font-normal cursor-pointer">
                  I confirm that all information provided is accurate and complete
                </Label>
                <p className="text-sm text-gray-600">
                  I understand that providing false or misleading information may result in the rejection of my application 
                  and potential account termination. I authorize ClearHold to verify all information provided and conduct 
                  necessary background checks for compliance purposes.
                </p>
              </div>
            </div>
            {errors.terms && (
              <p className="text-sm text-red-600 ml-6">{errors.terms}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signature">Digital Signature (Full Legal Name) *</Label>
            <input
              id="signature"
              type="text"
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
              placeholder="Enter your full name as it appears on your ID"
              className="w-full px-3 py-2 border rounded-md font-serif text-lg italic"
              style={{ fontFamily: "Georgia, serif" }}
            />
            {errors.signature && (
              <p className="text-sm text-red-600">{errors.signature}</p>
            )}
            <p className="text-xs text-gray-500">
              By typing your name above, you are electronically signing this document
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your information is encrypted and securely stored. We use bank-level security to protect your data 
          and comply with all regulatory requirements. The verification process typically takes 24-48 hours.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push("/kyc/risk-assessment")}>
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? "Submitting..." : "Submit for Verification"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}