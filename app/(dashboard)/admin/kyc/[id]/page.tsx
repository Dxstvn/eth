"use client"

import React from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import KYCApplicationDetail from "@/components/kyc/admin/KYCApplicationDetail"
import { useAuth } from "@/context/auth-context-v2"
import { toast } from "sonner"

export default function KYCApplicationPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const applicationId = params.id as string

  // Check admin access
  React.useEffect(() => {
    if (user && !user.isAdmin) {
      router.push("/dashboard")
      toast.error("Access denied. Admin privileges required.")
    }
  }, [user, router])

  if (!user?.isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/dashboard/admin/kyc")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Queue
      </Button>

      <KYCApplicationDetail
        applicationId={applicationId}
        onClose={() => router.push("/dashboard/admin/kyc")}
      />
    </div>
  )
}