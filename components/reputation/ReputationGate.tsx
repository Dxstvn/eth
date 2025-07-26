'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Lock, TrendingUp, Info, Shield } from 'lucide-react'
import { ReputationBadge, ReputationLevel } from './ReputationBadge'

interface ReputationGateProps {
  requiredScore?: number
  requiredLevel?: ReputationLevel
  currentScore: number
  currentLevel: ReputationLevel
  feature: string
  children: React.ReactNode
  onUpgrade?: () => void
}

export function ReputationGate({
  requiredScore,
  requiredLevel,
  currentScore,
  currentLevel,
  feature,
  children,
  onUpgrade,
}: ReputationGateProps) {
  const levels: ReputationLevel[] = ['unverified', 'bronze', 'silver', 'gold', 'platinum']
  const currentLevelIndex = levels.indexOf(currentLevel)
  const requiredLevelIndex = requiredLevel ? levels.indexOf(requiredLevel) : -1

  const meetsScoreRequirement = !requiredScore || currentScore >= requiredScore
  const meetsLevelRequirement = !requiredLevel || currentLevelIndex >= requiredLevelIndex
  const hasAccess = meetsScoreRequirement && meetsLevelRequirement

  if (hasAccess) {
    return <>{children}</>
  }

  const pointsNeeded = requiredScore ? requiredScore - currentScore : 0
  const levelsNeeded = requiredLevel ? requiredLevelIndex - currentLevelIndex : 0

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Reputation Required</CardTitle>
          </div>
          <ReputationBadge
            score={currentScore}
            level={currentLevel}
            size="sm"
            interactive={false}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Access to <strong>{feature}</strong> requires:
        </p>

        {requiredLevel && !meetsLevelRequirement && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Required Level</span>
              <span className="font-medium capitalize">{requiredLevel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={(currentLevelIndex / requiredLevelIndex) * 100}
                className="flex-1 h-2"
              />
              <span className="text-xs text-muted-foreground">
                {levelsNeeded} level{levelsNeeded !== 1 ? 's' : ''} away
              </span>
            </div>
          </div>
        )}

        {requiredScore && !meetsScoreRequirement && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Required Score</span>
              <span className="font-medium">{requiredScore}/100</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={(currentScore / requiredScore) * 100}
                className="flex-1 h-2"
              />
              <span className="text-xs text-muted-foreground">
                {pointsNeeded} points needed
              </span>
            </div>
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How to improve your reputation</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Complete more transactions successfully</li>
              <li>Maintain quick response times</li>
              <li>Resolve disputes amicably</li>
              <li>Get positive reviews from counterparties</li>
            </ul>
          </AlertDescription>
        </Alert>

        {onUpgrade && (
          <Button className="w-full" onClick={onUpgrade}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Learn How to Upgrade
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Simple inline gate for smaller features
export function InlineReputationGate({
  requiredScore,
  requiredLevel,
  currentScore,
  currentLevel,
  children,
  fallback,
}: {
  requiredScore?: number
  requiredLevel?: ReputationLevel
  currentScore: number
  currentLevel: ReputationLevel
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const levels: ReputationLevel[] = ['unverified', 'bronze', 'silver', 'gold', 'platinum']
  const currentLevelIndex = levels.indexOf(currentLevel)
  const requiredLevelIndex = requiredLevel ? levels.indexOf(requiredLevel) : -1

  const meetsScoreRequirement = !requiredScore || currentScore >= requiredScore
  const meetsLevelRequirement = !requiredLevel || currentLevelIndex >= requiredLevelIndex
  const hasAccess = meetsScoreRequirement && meetsLevelRequirement

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Lock className="h-3 w-3" />
      <span>
        Requires {requiredLevel && `${requiredLevel} level`}
        {requiredLevel && requiredScore && ' or '}
        {requiredScore && `${requiredScore}+ reputation`}
      </span>
    </div>
  )
}

// Transaction limits based on reputation
export function TransactionLimitIndicator({
  currentLevel,
  transactionAmount,
}: {
  currentLevel: ReputationLevel
  transactionAmount: number
}) {
  const limits: Record<ReputationLevel, number> = {
    unverified: 10000,
    bronze: 50000,
    silver: 250000,
    gold: 1000000,
    platinum: Infinity,
  }

  const currentLimit = limits[currentLevel]
  const isWithinLimit = transactionAmount <= currentLimit
  const percentageUsed = Math.min((transactionAmount / currentLimit) * 100, 100)

  return (
    <Card className={!isWithinLimit ? 'border-red-200 bg-red-50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Transaction Limit</CardTitle>
          <Shield className={`h-4 w-4 ${isWithinLimit ? 'text-green-600' : 'text-red-600'}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Current Limit</span>
            <span className="font-medium">
              {currentLimit === Infinity ? 'Unlimited' : `$${currentLimit.toLocaleString()}`}
            </span>
          </div>
          <Progress
            value={percentageUsed}
            className={`h-2 ${!isWithinLimit ? '[&>div]:bg-red-500' : ''}`}
          />
          {!isWithinLimit && (
            <Alert className="mt-2">
              <AlertDescription className="text-sm">
                This transaction exceeds your current limit. Upgrade to{' '}
                <span className="font-medium">{getRequiredLevel(transactionAmount)}</span> level
                to proceed.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getRequiredLevel(amount: number): ReputationLevel {
  if (amount <= 10000) return 'unverified'
  if (amount <= 50000) return 'bronze'
  if (amount <= 250000) return 'silver'
  if (amount <= 1000000) return 'gold'
  return 'platinum'
}