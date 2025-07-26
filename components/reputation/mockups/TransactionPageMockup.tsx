'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowRight,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  MessageSquare,
} from 'lucide-react'
import { TrustScore } from '../TrustScore'
import { ReputationBadge, ReputationIndicator } from '../ReputationBadge'

export function TransactionPageMockup() {
  const transaction = {
    id: 'TXN-001',
    type: 'real_estate',
    amount: '$450,000',
    status: 'in_escrow',
    createdAt: new Date('2025-01-15'),
    expectedCompletion: new Date('2025-02-15'),
    buyer: {
      id: '123',
      name: 'Sarah Johnson',
      reputation: {
        score: 82,
        level: 'platinum' as const,
        verified: true,
      },
      stats: {
        transactionCount: 45,
        successRate: 98.2,
        memberSince: new Date('2023-05-10'),
        lastActive: new Date('2025-01-20'),
      },
    },
    seller: {
      id: '456',
      name: 'Michael Chen',
      reputation: {
        score: 68,
        level: 'gold' as const,
        verified: true,
      },
      stats: {
        transactionCount: 23,
        successRate: 95.6,
        memberSince: new Date('2023-11-20'),
        lastActive: new Date('2025-01-19'),
      },
    },
  }

  const [selectedUser, setSelectedUser] = React.useState<'buyer' | 'seller' | null>(null)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Transaction Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Real Estate Escrow Transaction</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Transaction ID: {transaction.id}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {transaction.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-xl font-semibold">{transaction.amount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm">{transaction.createdAt.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expected Completion</p>
              <p className="text-sm">{transaction.expectedCompletion.toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Assessment Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Trust Assessment:</strong> Both parties have verified identities and good reputation scores. 
          This transaction has a <Badge variant="outline" className="ml-1">Low Risk</Badge> rating based on 
          participant history.
        </AlertDescription>
      </Alert>

      {/* Party Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buyer Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Buyer</h3>
            <ReputationBadge
              score={transaction.buyer.reputation.score}
              level={transaction.buyer.reputation.level}
              verified={transaction.buyer.reputation.verified}
              size="sm"
              onClick={() => setSelectedUser('buyer')}
            />
          </div>
          
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{transaction.buyer.name}</h4>
                <ReputationIndicator
                  score={transaction.buyer.reputation.score}
                  level={transaction.buyer.reputation.level}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Transactions</p>
                  <p className="font-medium">{transaction.buyer.stats.transactionCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="font-medium">{transaction.buyer.stats.successRate}%</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => setSelectedUser('buyer')}
              >
                View Full Profile
              </Button>
            </CardContent>
          </Card>

          {/* Buyer Trust Score */}
          <TrustScore
            userId={transaction.buyer.id}
            userName={transaction.buyer.name}
            score={transaction.buyer.reputation.score}
            level={transaction.buyer.reputation.level}
            verified={transaction.buyer.reputation.verified}
            transactionCount={transaction.buyer.stats.transactionCount}
            successRate={transaction.buyer.stats.successRate}
            memberSince={transaction.buyer.stats.memberSince}
            lastActive={transaction.buyer.stats.lastActive}
            compact={true}
            onViewDetails={() => setSelectedUser('buyer')}
          />
        </div>

        {/* Seller Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Seller</h3>
            <ReputationBadge
              score={transaction.seller.reputation.score}
              level={transaction.seller.reputation.level}
              verified={transaction.seller.reputation.verified}
              size="sm"
              onClick={() => setSelectedUser('seller')}
            />
          </div>
          
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{transaction.seller.name}</h4>
                <ReputationIndicator
                  score={transaction.seller.reputation.score}
                  level={transaction.seller.reputation.level}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Transactions</p>
                  <p className="font-medium">{transaction.seller.stats.transactionCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="font-medium">{transaction.seller.stats.successRate}%</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => setSelectedUser('seller')}
              >
                View Full Profile
              </Button>
            </CardContent>
          </Card>

          {/* Seller Trust Score */}
          <TrustScore
            userId={transaction.seller.id}
            userName={transaction.seller.name}
            score={transaction.seller.reputation.score}
            level={transaction.seller.reputation.level}
            verified={transaction.seller.reputation.verified}
            transactionCount={transaction.seller.stats.transactionCount}
            successRate={transaction.seller.stats.successRate}
            memberSince={transaction.seller.stats.memberSince}
            lastActive={transaction.seller.stats.lastActive}
            compact={true}
            onViewDetails={() => setSelectedUser('seller')}
          />
        </div>
      </div>

      {/* Reputation-Based Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Benefits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Platinum member fee discount applied</span>
            </div>
            <Badge variant="outline" className="bg-green-100">-30%</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Priority support available</span>
            </div>
            <Button size="sm" variant="outline">
              <MessageSquare className="h-3 w-3 mr-1" />
              Contact Support
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-sm">Enhanced dispute protection active</span>
            </div>
            <span className="text-xs text-muted-foreground">Gold+ benefit</span>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Responsive Design */}
      <div className="md:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Trust Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Overall Risk</span>
              <Badge variant="outline" className="bg-green-100">Low</Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Buyer Trust</span>
                <ReputationIndicator
                  score={transaction.buyer.reputation.score}
                  level={transaction.buyer.reputation.level}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Seller Trust</span>
                <ReputationIndicator
                  score={transaction.seller.reputation.score}
                  level={transaction.seller.reputation.level}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}