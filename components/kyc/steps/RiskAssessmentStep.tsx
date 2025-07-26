"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, Shield, AlertCircle, ChevronRight } from "lucide-react"
import { useKYC } from "@/context/kyc-context"
import { countries } from "@/lib/countries"

const fundSources = [
  { value: "employment", label: "Employment/Salary" },
  { value: "business", label: "Business Income" },
  { value: "investment", label: "Investment Returns" },
  { value: "inheritance", label: "Inheritance" },
  { value: "savings", label: "Personal Savings" },
  { value: "real_estate", label: "Real Estate" },
  { value: "retirement", label: "Retirement/Pension" },
  { value: "other", label: "Other" }
]

const purposeOptions = [
  { value: "real_estate_purchase", label: "Real Estate Purchase" },
  { value: "real_estate_sale", label: "Real Estate Sale" },
  { value: "business_transaction", label: "Business Transaction" },
  { value: "vehicle_purchase", label: "Vehicle Purchase" },
  { value: "art_collectibles", label: "Art & Collectibles" },
  { value: "freelance_services", label: "Freelance Services" },
  { value: "other", label: "Other" }
]

const volumeRanges = [
  { value: "0-10k", label: "Less than $10,000" },
  { value: "10k-50k", label: "$10,000 - $50,000" },
  { value: "50k-100k", label: "$50,000 - $100,000" },
  { value: "100k-500k", label: "$100,000 - $500,000" },
  { value: "500k-1m", label: "$500,000 - $1,000,000" },
  { value: "1m+", label: "More than $1,000,000" }
]

interface RiskAssessmentStepProps {
  onNext: () => void
  onBack: () => void
}

export default function RiskAssessmentStep({ onNext, onBack }: RiskAssessmentStepProps) {
  const { kycData, updateRiskAssessment, markStepCompleted } = useKYC()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPEPDetails, setShowPEPDetails] = useState(false)
  const [showSanctionsDetails, setShowSanctionsDetails] = useState(false)
  const [showOtherFunds, setShowOtherFunds] = useState(false)
  const [showOtherPurpose, setShowOtherPurpose] = useState(false)
  const [showTaxCountries, setShowTaxCountries] = useState(false)

  const [formData, setFormData] = useState({
    sourceOfFunds: kycData.riskAssessment?.sourceOfFunds || [],
    sourceOfFundsOther: kycData.riskAssessment?.sourceOfFundsOther || "",
    expectedMonthlyVolume: kycData.riskAssessment?.expectedMonthlyVolume || "",
    purposeOfUse: kycData.riskAssessment?.purposeOfUse || [],
    purposeOfUseOther: kycData.riskAssessment?.purposeOfUseOther || "",
    isPEP: kycData.riskAssessment?.isPEP || false,
    pepDetails: kycData.riskAssessment?.pepDetails || "",
    hasSanctions: kycData.riskAssessment?.hasSanctions || false,
    sanctionsDetails: kycData.riskAssessment?.sanctionsDetails || "",
    taxResidencyCountry: kycData.riskAssessment?.taxResidencyCountry || "",
    hasTaxObligationsElsewhere: kycData.riskAssessment?.hasTaxObligationsElsewhere || false,
    taxObligationsCountries: kycData.riskAssessment?.taxObligationsCountries || [],
    hasUSPersonStatus: kycData.riskAssessment?.hasUSPersonStatus || false,
    acceptedTerms: kycData.riskAssessment?.acceptedTerms || false,
    consentToScreening: kycData.riskAssessment?.consentToScreening || false
  })

  useEffect(() => {
    setShowOtherFunds(formData.sourceOfFunds.includes("other"))
    setShowOtherPurpose(formData.purposeOfUse.includes("other"))
  }, [formData.sourceOfFunds, formData.purposeOfUse])

  const handleFundSourceChange = (value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sourceOfFunds: checked 
        ? [...prev.sourceOfFunds, value]
        : prev.sourceOfFunds.filter(s => s !== value)
    }))
  }

  const handlePurposeChange = (value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      purposeOfUse: checked 
        ? [...prev.purposeOfUse, value]
        : prev.purposeOfUse.filter(p => p !== value)
    }))
  }

  const handleTaxCountryChange = (country: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      taxObligationsCountries: checked 
        ? [...prev.taxObligationsCountries, country]
        : prev.taxObligationsCountries.filter(c => c !== country)
    }))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (formData.sourceOfFunds.length === 0) {
      newErrors.sourceOfFunds = "Please select at least one source of funds"
    }
    if (showOtherFunds && !formData.sourceOfFundsOther.trim()) {
      newErrors.sourceOfFundsOther = "Please describe other source of funds"
    }
    if (!formData.expectedMonthlyVolume) {
      newErrors.expectedMonthlyVolume = "Please select expected transaction volume"
    }
    if (formData.purposeOfUse.length === 0) {
      newErrors.purposeOfUse = "Please select at least one purpose"
    }
    if (showOtherPurpose && !formData.purposeOfUseOther.trim()) {
      newErrors.purposeOfUseOther = "Please describe other purpose"
    }
    if (formData.isPEP && !formData.pepDetails.trim()) {
      newErrors.pepDetails = "Please provide details about PEP status"
    }
    if (formData.hasSanctions && !formData.sanctionsDetails.trim()) {
      newErrors.sanctionsDetails = "Please provide details about sanctions"
    }
    if (!formData.taxResidencyCountry) {
      newErrors.taxResidencyCountry = "Please select your tax residency country"
    }
    if (formData.hasTaxObligationsElsewhere && formData.taxObligationsCountries.length === 0) {
      newErrors.taxObligationsCountries = "Please select countries where you have tax obligations"
    }
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = "Please accept the terms and conditions"
    }
    if (!formData.consentToScreening) {
      newErrors.consentToScreening = "Please consent to compliance screening"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      updateRiskAssessment(formData)
      markStepCompleted("risk_assessment")
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          This information helps us comply with regulatory requirements and ensure the security of all transactions on our platform.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment & Compliance</CardTitle>
          <CardDescription>
            Please provide accurate information to help us understand your use of the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Source of Funds */}
          <div className="space-y-3">
            <Label>Source of Funds *</Label>
            <p className="text-sm text-gray-600">Select all that apply</p>
            <div className="space-y-2">
              {fundSources.map(source => (
                <div key={source.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={source.value}
                    checked={formData.sourceOfFunds.includes(source.value)}
                    onCheckedChange={(checked) => handleFundSourceChange(source.value, checked as boolean)}
                  />
                  <Label htmlFor={source.value} className="font-normal cursor-pointer">
                    {source.label}
                  </Label>
                </div>
              ))}
            </div>
            {errors.sourceOfFunds && (
              <p className="text-sm text-red-600">{errors.sourceOfFunds}</p>
            )}
            
            {showOtherFunds && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="sourceOfFundsOther">Please specify other source</Label>
                <Textarea
                  id="sourceOfFundsOther"
                  value={formData.sourceOfFundsOther}
                  onChange={(e) => setFormData(prev => ({ ...prev, sourceOfFundsOther: e.target.value }))}
                  placeholder="Describe your other source of funds"
                  rows={3}
                />
                {errors.sourceOfFundsOther && (
                  <p className="text-sm text-red-600">{errors.sourceOfFundsOther}</p>
                )}
              </div>
            )}
          </div>

          {/* Expected Transaction Volume */}
          <div className="space-y-2">
            <Label htmlFor="volume">Expected Monthly Transaction Volume *</Label>
            <Select
              value={formData.expectedMonthlyVolume}
              onValueChange={(value) => setFormData(prev => ({ ...prev, expectedMonthlyVolume: value }))}
            >
              <SelectTrigger id="volume">
                <SelectValue placeholder="Select expected volume" />
              </SelectTrigger>
              <SelectContent>
                {volumeRanges.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.expectedMonthlyVolume && (
              <p className="text-sm text-red-600">{errors.expectedMonthlyVolume}</p>
            )}
          </div>

          {/* Purpose of Use */}
          <div className="space-y-3">
            <Label>Purpose of Using ClearHold *</Label>
            <p className="text-sm text-gray-600">Select all that apply</p>
            <div className="space-y-2">
              {purposeOptions.map(purpose => (
                <div key={purpose.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={purpose.value}
                    checked={formData.purposeOfUse.includes(purpose.value)}
                    onCheckedChange={(checked) => handlePurposeChange(purpose.value, checked as boolean)}
                  />
                  <Label htmlFor={purpose.value} className="font-normal cursor-pointer">
                    {purpose.label}
                  </Label>
                </div>
              ))}
            </div>
            {errors.purposeOfUse && (
              <p className="text-sm text-red-600">{errors.purposeOfUse}</p>
            )}
            
            {showOtherPurpose && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="purposeOfUseOther">Please specify other purpose</Label>
                <Textarea
                  id="purposeOfUseOther"
                  value={formData.purposeOfUseOther}
                  onChange={(e) => setFormData(prev => ({ ...prev, purposeOfUseOther: e.target.value }))}
                  placeholder="Describe your other purpose"
                  rows={3}
                />
                {errors.purposeOfUseOther && (
                  <p className="text-sm text-red-600">{errors.purposeOfUseOther}</p>
                )}
              </div>
            )}
          </div>

          {/* PEP Declaration */}
          <div className="space-y-3">
            <Label>Politically Exposed Person (PEP) Declaration *</Label>
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-gray-700">
                  A PEP is someone who holds or has held a prominent public position, including immediate family members and close associates.
                </p>
              </div>
            </div>
            <RadioGroup
              value={formData.isPEP ? "yes" : "no"}
              onValueChange={(value) => {
                const isPEP = value === "yes"
                setFormData(prev => ({ ...prev, isPEP }))
                setShowPEPDetails(isPEP)
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="pep-no" />
                <Label htmlFor="pep-no">No, I am not a PEP</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="pep-yes" />
                <Label htmlFor="pep-yes">Yes, I am a PEP</Label>
              </div>
            </RadioGroup>
            
            {showPEPDetails && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="pepDetails">Please provide details *</Label>
                <Textarea
                  id="pepDetails"
                  value={formData.pepDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, pepDetails: e.target.value }))}
                  placeholder="Describe your position and relationship"
                  rows={3}
                />
                {errors.pepDetails && (
                  <p className="text-sm text-red-600">{errors.pepDetails}</p>
                )}
              </div>
            )}
          </div>

          {/* Sanctions Declaration */}
          <div className="space-y-3">
            <Label>Sanctions Declaration *</Label>
            <RadioGroup
              value={formData.hasSanctions ? "yes" : "no"}
              onValueChange={(value) => {
                const hasSanctions = value === "yes"
                setFormData(prev => ({ ...prev, hasSanctions }))
                setShowSanctionsDetails(hasSanctions)
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="sanctions-no" />
                <Label htmlFor="sanctions-no">
                  I confirm that I am not subject to any sanctions or located in a sanctioned country
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="sanctions-yes" />
                <Label htmlFor="sanctions-yes">
                  I need to disclose information about sanctions
                </Label>
              </div>
            </RadioGroup>
            
            {showSanctionsDetails && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="sanctionsDetails">Please provide details *</Label>
                <Textarea
                  id="sanctionsDetails"
                  value={formData.sanctionsDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, sanctionsDetails: e.target.value }))}
                  placeholder="Provide details about sanctions"
                  rows={3}
                />
                {errors.sanctionsDetails && (
                  <p className="text-sm text-red-600">{errors.sanctionsDetails}</p>
                )}
              </div>
            )}
          </div>

          {/* Tax Residency */}
          <div className="space-y-2">
            <Label htmlFor="taxResidency">Tax Residency Country *</Label>
            <Select
              value={formData.taxResidencyCountry}
              onValueChange={(value) => setFormData(prev => ({ ...prev, taxResidencyCountry: value }))}
            >
              <SelectTrigger id="taxResidency">
                <SelectValue placeholder="Select your tax residency country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map(country => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.taxResidencyCountry && (
              <p className="text-sm text-red-600">{errors.taxResidencyCountry}</p>
            )}
          </div>

          {/* Additional Tax Obligations */}
          <div className="space-y-3">
            <Label>Do you have tax obligations in other countries? *</Label>
            <RadioGroup
              value={formData.hasTaxObligationsElsewhere ? "yes" : "no"}
              onValueChange={(value) => {
                const hasTaxObligations = value === "yes"
                setFormData(prev => ({ ...prev, hasTaxObligationsElsewhere: hasTaxObligations }))
                setShowTaxCountries(hasTaxObligations)
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="tax-no" />
                <Label htmlFor="tax-no">No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="tax-yes" />
                <Label htmlFor="tax-yes">Yes</Label>
              </div>
            </RadioGroup>
            
            {showTaxCountries && (
              <div className="ml-6 space-y-2">
                <Label>Select countries where you have tax obligations *</Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                  {countries.map(country => (
                    <div key={country.code} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tax-${country.code}`}
                        checked={formData.taxObligationsCountries.includes(country.code)}
                        onCheckedChange={(checked) => handleTaxCountryChange(country.code, checked as boolean)}
                      />
                      <Label htmlFor={`tax-${country.code}`} className="font-normal cursor-pointer">
                        {country.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.taxObligationsCountries && (
                  <p className="text-sm text-red-600">{errors.taxObligationsCountries}</p>
                )}
              </div>
            )}
          </div>

          {/* US Person Status */}
          <div className="space-y-3">
            <Label>US Person Status *</Label>
            <RadioGroup
              value={formData.hasUSPersonStatus ? "yes" : "no"}
              onValueChange={(value) => setFormData(prev => ({ ...prev, hasUSPersonStatus: value === "yes" }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="us-no" />
                <Label htmlFor="us-no">I am not a US Person</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="us-yes" />
                <Label htmlFor="us-yes">I am a US Person (US citizen, resident, or green card holder)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Consent and Terms */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="screening"
                checked={formData.consentToScreening}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consentToScreening: checked as boolean }))}
              />
              <div className="space-y-1">
                <Label htmlFor="screening" className="font-normal cursor-pointer">
                  I consent to compliance screening *
                </Label>
                <p className="text-sm text-gray-600">
                  I understand that ClearHold will perform sanctions and PEP screening as part of the verification process.
                </p>
              </div>
            </div>
            {errors.consentToScreening && (
              <p className="text-sm text-red-600 ml-6">{errors.consentToScreening}</p>
            )}

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.acceptedTerms}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptedTerms: checked as boolean }))}
              />
              <div className="space-y-1">
                <Label htmlFor="terms" className="font-normal cursor-pointer">
                  I accept the terms and conditions *
                </Label>
                <p className="text-sm text-gray-600">
                  I confirm that all information provided is accurate and complete. I understand that providing false information may result in account termination.
                </p>
              </div>
            </div>
            {errors.acceptedTerms && (
              <p className="text-sm text-red-600 ml-6">{errors.acceptedTerms}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleSubmit}>
              Continue to Review
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}