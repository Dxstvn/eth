'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  ProfilePageMockup,
  TransactionPageMockup,
  DisputePageMockup,
  UserListingMockup,
  ReputationDetails,
  ReputationAlerts,
  ReputationGate,
  TransactionLimitIndicator,
} from '@/components/reputation'

export default function ReputationDemoPage() {
  const [showDetails, setShowDetails] = React.useState(false)

  // Demo user data
  const demoUser = {
    id: '123',
    name: 'Demo User',
    score: 75,
    level: 'gold' as const,
    verified: true,
  }

  // Demo alerts
  const demoAlerts = [
    {
      id: '1',
      type: 'increase' as const,
      title: 'Reputation Increased!',
      description: 'Transaction completed successfully',
      value: 10,
      timestamp: new Date(),
      read: false,
    },
    {
      id: '2',
      type: 'achievement' as const,
      title: 'Achievement Unlocked!',
      description: 'You earned the "Trusted Trader" badge',
      timestamp: new Date(),
      read: false,
    },
  ]

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Reputation System Demo</h1>
          <p className="text-muted-foreground">
            Explore ClearHold's comprehensive reputation and trust system
          </p>
        </div>
      </div>

      {/* Reputation Components Demo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reputation Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Reputation Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <ReputationAlerts
              alerts={demoAlerts}
              onDismiss={(id) => console.log('Dismiss:', id)}
              onAction={(alert) => console.log('Action:', alert)}
            />
          </CardContent>
        </Card>

        {/* Reputation Gate */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Access Control</CardTitle>
          </CardHeader>
          <CardContent>
            <ReputationGate
              requiredLevel="platinum"
              currentScore={demoUser.score}
              currentLevel={demoUser.level}
              feature="Instant Transactions"
              onUpgrade={() => console.log('Upgrade clicked')}
            >
              <div className="p-4 bg-green-50 rounded-lg">
                <p>You have access to instant transactions!</p>
              </div>
            </ReputationGate>
          </CardContent>
        </Card>

        {/* Transaction Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionLimitIndicator
              currentLevel={demoUser.level}
              transactionAmount={750000}
            />
          </CardContent>
        </Card>
      </div>

      {/* Page Mockups */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile Page</TabsTrigger>
          <TabsTrigger value="transaction">Transaction Page</TabsTrigger>
          <TabsTrigger value="dispute">Dispute Page</TabsTrigger>
          <TabsTrigger value="listing">User Listing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Page with Reputation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border rounded-lg overflow-hidden">
                <ProfilePageMockup />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transaction" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Page with Trust Scores</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border rounded-lg overflow-hidden">
                <TransactionPageMockup />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispute" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dispute Resolution with Reputation Impact</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border rounded-lg overflow-hidden">
                <DisputePageMockup />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Search with Reputation Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border rounded-lg overflow-hidden">
                <UserListingMockup />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reputation Details Modal */}
      <ReputationDetails
        open={showDetails}
        onOpenChange={setShowDetails}
        userId={demoUser.id}
        userName={demoUser.name}
        score={demoUser.score}
        level={demoUser.level}
        verified={demoUser.verified}
      />
    </div>
  )
}