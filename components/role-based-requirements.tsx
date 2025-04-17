"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, FileText, CheckSquare, Scale, Clock, Zap, DollarSign, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useState, useEffect } from "react"

export interface ContractRequirements {
  // Seller requirements
  titleVerification: boolean
  inspectionReport: boolean
  appraisalService: boolean

  // Buyer requirements
  fundingRequired: boolean

  // Common requirements
  escrowPeriod: number
  automaticRelease: boolean
  disputeResolution: boolean
}

interface RoleBasedRequirementsProps {
  transactionType: "purchase" | "sale"
  onChange: (options: ContractRequirements) => void
  initialOptions?: ContractRequirements
}

export default function RoleBasedRequirements({
  transactionType,
  onChange,
  initialOptions,
}: RoleBasedRequirementsProps) {
  const isBuyer = transactionType === "purchase"
  const isSeller = transactionType === "sale"

  const [options, setOptions] = useState<ContractRequirements>(
    initialOptions || {
      // Seller requirements
      titleVerification: true,
      inspectionReport: true,
      appraisalService: false,

      // Buyer requirements
      fundingRequired: true,

      // Common requirements
      escrowPeriod: 30,
      automaticRelease: true,
      disputeResolution: true,
    },
  )

  useEffect(() => {
    if (initialOptions) {
      setOptions(initialOptions)
    }
  }, [initialOptions])

  const handleChange = (key: keyof ContractRequirements, value: boolean | number) => {
    const newOptions = { ...options, [key]: value }
    setOptions(newOptions)
    onChange(newOptions)
  }

  return (
    <div className="space-y-6">
      {/* Role-specific explanation */}
      <Alert className="bg-teal-50 border-teal-200 text-teal-800">
        <Info className="h-4 w-4" />
        <AlertTitle>{isBuyer ? "Requirements for the Seller" : "Requirements for the Buyer"}</AlertTitle>
        <AlertDescription>
          {isBuyer
            ? "These are the requirements the seller must fulfill before funds will be released from escrow."
            : "The buyer must fulfill these requirements before the transaction can proceed."}
        </AlertDescription>
      </Alert>

      <Card className="border-teal-100">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Buyer's view - Requirements for the seller */}
            {isBuyer && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-teal-600" />
                    <Label htmlFor="title-verification" className="font-medium text-teal-900">
                      Title Verification Required
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-teal-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Requires the seller to provide proof that the property title is clear and there are no liens
                          or encumbrances
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="title-verification"
                    checked={options.titleVerification}
                    onCheckedChange={(checked) => handleChange("titleVerification", checked)}
                    className="data-[state=checked]:bg-teal-600"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-600" />
                    <Label htmlFor="inspection-report" className="font-medium text-teal-900">
                      Inspection Report Required
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-teal-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Requires the seller to provide a professional inspection report before funds can be released
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="inspection-report"
                    checked={options.inspectionReport}
                    onCheckedChange={(checked) => handleChange("inspectionReport", checked)}
                    className="data-[state=checked]:bg-teal-600"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-600" />
                    <Label htmlFor="appraisal-service" className="font-medium text-teal-900">
                      Appraisal Required
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-teal-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Requires the seller to provide a professional property appraisal before funds can be released
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="appraisal-service"
                    checked={options.appraisalService}
                    onCheckedChange={(checked) => handleChange("appraisalService", checked)}
                    className="data-[state=checked]:bg-teal-600"
                  />
                </div>
              </>
            )}

            {/* Seller's view - Requirements for the buyer */}
            {isSeller && (
              <>
                <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Buyer Requirements</AlertTitle>
                  <AlertDescription>
                    The buyer will be required to deposit funds into the escrow contract. You will need to provide the
                    following documentation:
                  </AlertDescription>
                </Alert>

                <div className="pl-4 border-l-2 border-teal-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-teal-600" />
                    <span className="text-teal-900">Title Verification Documents</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-600" />
                    <span className="text-teal-900">Property Inspection Report</span>
                  </div>

                  {options.appraisalService && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-600" />
                      <span className="text-teal-900">Property Appraisal</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-teal-600" />
                    <Label htmlFor="funding-required" className="font-medium text-teal-900">
                      Buyer Funding Required
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-teal-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          The buyer must deposit the agreed amount into the escrow contract
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="funding-required"
                    checked={options.fundingRequired}
                    onCheckedChange={(checked) => handleChange("fundingRequired", checked)}
                    className="data-[state=checked]:bg-teal-600"
                    disabled={true}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-600" />
                    <Label htmlFor="appraisal-service" className="font-medium text-teal-900">
                      Include Appraisal Requirement
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-teal-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          You will need to provide a professional property appraisal
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="appraisal-service"
                    checked={options.appraisalService}
                    onCheckedChange={(checked) => handleChange("appraisalService", checked)}
                    className="data-[state=checked]:bg-teal-600"
                  />
                </div>
              </>
            )}

            {/* Common requirements for both roles */}
            <div className="pt-4 border-t border-neutral-200">
              <h3 className="font-medium text-teal-900 mb-4">Common Requirements</h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-teal-600" />
                  <Label htmlFor="automatic-release" className="font-medium text-teal-900">
                    Automatic Release When Verified
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-teal-600" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Automatically releases funds from escrow when all required conditions are verified
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="automatic-release"
                  checked={options.automaticRelease}
                  onCheckedChange={(checked) => handleChange("automaticRelease", checked)}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-teal-600" />
                  <Label htmlFor="dispute-resolution" className="font-medium text-teal-900">
                    Dispute Resolution Mechanism
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-teal-600" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Includes a dispute resolution mechanism in the smart contract to handle disagreements
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="dispute-resolution"
                  checked={options.disputeResolution}
                  onCheckedChange={(checked) => handleChange("disputeResolution", checked)}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-teal-600" />
                  <Label htmlFor="escrow-period" className="font-medium text-teal-900">
                    Maximum Escrow Period (days)
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-teal-600" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Maximum time period for the escrow before automatic refund if conditions are not met
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="escrow-period"
                  type="number"
                  min="1"
                  max="365"
                  value={options.escrowPeriod}
                  onChange={(e) => handleChange("escrowPeriod", Number.parseInt(e.target.value) || 30)}
                  className="w-20 text-right"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
