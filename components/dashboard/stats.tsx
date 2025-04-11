"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, CheckCircle, Clock } from "lucide-react"
import { useState, useEffect } from "react"

export default function DashboardStats() {
  const [loading, setLoading] = useState(true)

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border border-neutral-100 shadow-md overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-neutral-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-neutral-200 rounded w-16"></div>
                </div>
                <div className="h-12 w-12 rounded-full bg-neutral-200"></div>
              </div>
              <div className="flex items-center mt-4">
                <div className="h-4 bg-neutral-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="relative border border-neutral-100 shadow-md overflow-hidden group hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 font-medium">Active Transactions</p>
              <p className="text-3xl font-bold mt-1 text-teal-900 font-display">12</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-900 group-hover:bg-teal-100 transition-colors">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <div className="flex items-center text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>8.2%</span>
            </div>
            <span className="text-neutral-500 ml-2">vs last month</span>
          </div>

          {/* Decorative element */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-900"></div>
        </CardContent>
      </Card>

      <Card className="relative border border-neutral-100 shadow-md overflow-hidden group hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 font-medium">Total Value Locked</p>
              <p className="text-3xl font-bold mt-1 text-teal-900 font-display">$1.2M</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gold-50 flex items-center justify-center text-gold-500 group-hover:bg-gold-100 transition-colors">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <div className="flex items-center text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>12.5%</span>
            </div>
            <span className="text-neutral-500 ml-2">vs last month</span>
          </div>

          {/* Decorative element */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gold-500"></div>
        </CardContent>
      </Card>

      <Card className="relative border border-neutral-100 shadow-md overflow-hidden group hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 font-medium">Completed Transactions</p>
              <p className="text-3xl font-bold mt-1 text-teal-900 font-display">48</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <div className="flex items-center text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>5.3%</span>
            </div>
            <span className="text-neutral-500 ml-2">vs last month</span>
          </div>

          {/* Decorative element */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500"></div>
        </CardContent>
      </Card>

      <Card className="relative border border-neutral-100 shadow-md overflow-hidden group hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 font-medium">Average Transaction Time</p>
              <p className="text-3xl font-bold mt-1 text-teal-900 font-display">4.2 days</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <div className="flex items-center text-red-600">
              <ArrowDownRight className="h-4 w-4 mr-1" />
              <span>2.1%</span>
            </div>
            <span className="text-neutral-500 ml-2">vs last month</span>
          </div>

          {/* Decorative element */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
        </CardContent>
      </Card>
    </div>
  )
}
