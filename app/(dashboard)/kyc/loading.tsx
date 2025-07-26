import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/design-system"
import { ResponsiveContainer } from "@/components/ui/responsive-container"

export default function KYCLoading() {
  return (
    <ResponsiveContainer>
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <Skeleton.Text className="w-48 h-8 mb-2" />
          <Skeleton.Text className="w-96 h-4" />
        </div>

        {/* Progress Steps Skeleton */}
        <Card className="shadow-soft p-6">
          <div className="flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex-1 flex flex-col items-center">
                <Skeleton.Circle className="w-10 h-10 mb-2" />
                <Skeleton.Text className="w-24 h-4 mb-1" />
                <Skeleton.Text className="w-32 h-3" />
              </div>
            ))}
          </div>
        </Card>

        {/* Content Skeleton */}
        <Card className="shadow-soft">
          <div className="p-6 space-y-4">
            <Skeleton.Text className="w-64 h-6" />
            <Skeleton.Text className="w-full h-4" />
            <Skeleton.Text className="w-full h-4" />
            <Skeleton.Text className="w-3/4 h-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Skeleton.Card className="h-32" />
              <Skeleton.Card className="h-32" />
            </div>
            
            <div className="flex justify-between mt-6">
              <Skeleton.Button />
              <Skeleton.Button />
            </div>
          </div>
        </Card>
      </div>
    </ResponsiveContainer>
  )
}