import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, CheckCircle, Clock } from "lucide-react"

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Transactions</p>
              <p className="text-3xl font-bold mt-1">12</p>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <div className="flex items-center text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>8.2%</span>
            </div>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Value Locked</p>
              <p className="text-3xl font-bold mt-1">$1.2M</p>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <div className="flex items-center text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>12.5%</span>
            </div>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Completed Transactions</p>
              <p className="text-3xl font-bold mt-1">48</p>
            </div>
            <div className="h-12 w-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <div className="flex items-center text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>5.3%</span>
            </div>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Average Transaction Time</p>
              <p className="text-3xl font-bold mt-1">4.2 days</p>
            </div>
            <div className="h-12 w-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <div className="flex items-center text-red-600">
              <ArrowDownRight className="h-4 w-4 mr-1" />
              <span>2.1%</span>
            </div>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

