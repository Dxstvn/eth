'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  Shield,
  Scale,
  FileText,
  MessageSquare,
  Clock,
  TrendingDown,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { ReputationBadge, ReputationIndicator } from '../ReputationBadge'
import { cn } from '@/lib/utils'

export function DisputePageMockup() {
  const dispute = {
    id: 'DISP-001',
    transactionId: 'TXN-001',
    status: 'under_review',
    createdAt: new Date('2025-01-18'),
    amount: '$450,000',
    type: 'contract_breach',
    plaintiff: {
      id: '123',
      name: 'Sarah Johnson',
      reputation: {
        score: 82,
        level: 'platinum' as const,
        verified: true,
      },
      disputeHistory: {
        total: 2,
        won: 2,
        lost: 0,
        mutualResolution: 0,
      },
    },
    defendant: {
      id: '456',
      name: 'Michael Chen',
      reputation: {
        score: 68,
        level: 'gold' as const,
        verified: true,
      },
      disputeHistory: {
        total: 3,
        won: 1,
        lost: 1,
        mutualResolution: 1,
      },
    },
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Dispute Header */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Scale className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle>Active Dispute Resolution</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Dispute ID: {dispute.id} • Transaction: {dispute.transactionId}
                </p>
              </div>
            </div>
            <Badge variant="destructive">
              {dispute.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Reputation Impact Warning */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle>Reputation Impact Notice</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>This dispute may affect your reputation score based on the outcome:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span><strong>If you win:</strong> +3 to +5 points</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-red-600" />
              <span><strong>If you lose:</strong> -10 points</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span><strong>Mutual resolution:</strong> +2 points</span>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Party Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Dispute Parties & Reputation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plaintiff */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-red-600">Plaintiff</h4>
                <Badge variant="outline" className="text-xs">Filing Party</Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dispute.plaintiff.name}</span>
                  <ReputationBadge
                    score={dispute.plaintiff.reputation.score}
                    level={dispute.plaintiff.reputation.level}
                    verified={dispute.plaintiff.reputation.verified}
                    size="sm"
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-2">Dispute History</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Disputes:</span>
                      <span className="ml-1 font-medium">{dispute.plaintiff.disputeHistory.total}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="ml-1 font-medium text-green-600">
                        {dispute.plaintiff.disputeHistory.total > 0
                          ? Math.round((dispute.plaintiff.disputeHistory.won / dispute.plaintiff.disputeHistory.total) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        Won: {dispute.plaintiff.disputeHistory.won}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        Lost: {dispute.plaintiff.disputeHistory.lost}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Mutual: {dispute.plaintiff.disputeHistory.mutualResolution}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reputation Risk Assessment */}
                <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Low Risk Profile</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    High reputation score with excellent dispute history
                  </p>
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden md:block" />

            {/* Defendant */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-blue-600">Defendant</h4>
                <Badge variant="outline" className="text-xs">Responding Party</Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dispute.defendant.name}</span>
                  <ReputationBadge
                    score={dispute.defendant.reputation.score}
                    level={dispute.defendant.reputation.level}
                    verified={dispute.defendant.reputation.verified}
                    size="sm"
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-2">Dispute History</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Disputes:</span>
                      <span className="ml-1 font-medium">{dispute.defendant.disputeHistory.total}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="ml-1 font-medium text-yellow-600">
                        {dispute.defendant.disputeHistory.total > 0
                          ? Math.round((dispute.defendant.disputeHistory.won / dispute.defendant.disputeHistory.total) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        Won: {dispute.defendant.disputeHistory.won}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        Lost: {dispute.defendant.disputeHistory.lost}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Mutual: {dispute.defendant.disputeHistory.mutualResolution}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reputation Risk Assessment */}
                <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">Moderate Risk Profile</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mixed dispute history may indicate pattern
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Potential Reputation Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Potential Reputation Impact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h5 className="font-medium text-sm">For Plaintiff (Sarah Johnson)</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Current Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">82</span>
                  <ReputationIndicator score={82} level="platinum" />
                </div>
              </div>
              <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                <p className="text-xs text-muted-foreground mb-1">If Won</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600">87</span>
                  <span className="text-sm text-green-600">+5</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                <p className="text-xs text-muted-foreground mb-1">If Lost</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600">72</span>
                  <span className="text-sm text-red-600">-10</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h5 className="font-medium text-sm">For Defendant (Michael Chen)</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Current Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">68</span>
                  <ReputationIndicator score={68} level="gold" />
                </div>
              </div>
              <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                <p className="text-xs text-muted-foreground mb-1">If Won</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600">73</span>
                  <span className="text-sm text-green-600">+5</span>
                  <Badge variant="outline" className="ml-2 text-xs">Level Up</Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                <p className="text-xs text-muted-foreground mb-1">If Lost</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600">58</span>
                  <span className="text-sm text-red-600">-10</span>
                  <Badge variant="destructive" className="ml-2 text-xs">Level Down</Badge>
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Actual reputation changes may vary based on arbitrator findings, 
              response times, and cooperation level during the dispute process.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Mobile Summary */}
      <div className="md:hidden">
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-base">Quick Dispute Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Dispute Amount</span>
              <span className="font-medium">{dispute.amount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Filed</span>
              <span className="font-medium">{dispute.createdAt.toLocaleDateString()}</span>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Plaintiff Risk</span>
                <Badge variant="outline" className="bg-green-100 text-xs">Low</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Defendant Risk</span>
                <Badge variant="outline" className="bg-yellow-100 text-xs">Moderate</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}