'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  Star,
  Award,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ReputationBadge, ReputationLevel } from './ReputationBadge'
import { cn } from '@/lib/utils'

interface TrustScoreProps {
  userId: string
  userName: string
  score: number
  level: ReputationLevel
  verified: boolean
  transactionCount: number
  successRate: number
  memberSince: Date
  lastActive: Date
  isCounterparty?: boolean
  compact?: boolean
  onViewDetails?: () => void
}

export function TrustScore({
  userId,
  userName,
  score,
  level,
  verified,
  transactionCount,
  successRate,
  memberSince,
  lastActive,
  isCounterparty = false,
  compact = false,
  onViewDetails,
}: TrustScoreProps) {
  const trustLevel = getTrustLevel(score)
  const riskLevel = getRiskLevel(score, successRate, transactionCount)

  if (compact) {
    return <CompactTrustScore {...arguments[0]} />
  }

  return (
    <Card className={cn(
      'transition-all',
      isCounterparty && 'border-primary/20 bg-primary/5'
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Trust Score</CardTitle>
          <ReputationBadge
            score={score}
            level={level}
            verified={verified}
            size="sm"
            onClick={onViewDetails}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trust Level Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Trust</span>
            <Badge
              variant={
                trustLevel === 'Very High'
                  ? 'default'
                  : trustLevel === 'High'
                  ? 'secondary'
                  : trustLevel === 'Moderate'
                  ? 'outline'
                  : 'destructive'
              }
            >
              {trustLevel}
            </Badge>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        {/* Risk Assessment */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={cn(
                'h-4 w-4',
                riskLevel === 'Low' ? 'text-green-600' :
                riskLevel === 'Medium' ? 'text-yellow-600' :
                'text-red-600'
              )} />
              <span className="text-sm font-medium">Risk Level</span>
            </div>
            <span className={cn(
              'text-sm font-medium',
              riskLevel === 'Low' ? 'text-green-600' :
              riskLevel === 'Medium' ? 'text-yellow-600' :
              'text-red-600'
            )}>
              {riskLevel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on transaction history and user behavior
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-sm font-medium">{transactionCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="text-sm font-medium">{successRate}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Member Since</p>
            <p className="text-sm font-medium">
              {memberSince.toLocaleDateString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last Active</p>
            <p className="text-sm font-medium">
              {getRelativeTime(lastActive)}
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="space-y-2">
          <TrustIndicator
            met={verified}
            label="Verified Identity"
            icon={CheckCircle}
          />
          <TrustIndicator
            met={transactionCount >= 10}
            label="Experienced Trader (10+ transactions)"
            icon={Award}
          />
          <TrustIndicator
            met={successRate >= 95}
            label="High Success Rate (95%+)"
            icon={TrendingUp}
          />
          <TrustIndicator
            met={score >= 60}
            label="Gold+ Reputation Level"
            icon={Star}
          />
        </div>

        {/* View Details Button */}
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onViewDetails}
          >
            View Full Reputation Details
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for transaction pages
function CompactTrustScore({
  userName,
  score,
  level,
  verified,
  transactionCount,
  successRate,
  onViewDetails,
}: TrustScoreProps) {
  const trustLevel = getTrustLevel(score)

  return (
    <Card className="cursor-pointer hover:shadow-md transition-all" onClick={onViewDetails}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium">{userName}</h4>
            <p className="text-sm text-muted-foreground">
              {transactionCount} transactions • {successRate}% success
            </p>
          </div>
          <ReputationBadge
            score={score}
            level={level}
            verified={verified}
            size="sm"
            interactive={false}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Trust Level:</span>
            <Badge variant="outline" className="text-xs">
              {trustLevel}
            </Badge>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to view full reputation details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}

// Trust indicator component
function TrustIndicator({
  met,
  label,
  icon: Icon,
}: {
  met: boolean
  label: string
  icon: React.ElementType
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 text-sm',
      met ? 'text-foreground' : 'text-muted-foreground'
    )}>
      <Icon className={cn(
        'h-4 w-4',
        met ? 'text-green-600' : 'text-gray-400'
      )} />
      <span className={met ? '' : 'line-through'}>{label}</span>
    </div>
  )
}

// Helper functions
function getTrustLevel(score: number): string {
  if (score >= 80) return 'Very High'
  if (score >= 60) return 'High'
  if (score >= 40) return 'Moderate'
  if (score >= 20) return 'Low'
  return 'Very Low'
}

function getRiskLevel(
  score: number,
  successRate: number,
  transactionCount: number
): string {
  if (score >= 60 && successRate >= 95 && transactionCount >= 10) {
    return 'Low'
  }
  if (score >= 40 && successRate >= 90 && transactionCount >= 5) {
    return 'Medium'
  }
  return 'High'
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return date.toLocaleDateString()
}

// Widget version for dashboards
export function TrustScoreWidget({
  score,
  level,
  trend = 0,
}: {
  score: number
  level: ReputationLevel
  trend?: number
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Your Trust Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{score}</span>
          <span className="text-sm text-muted-foreground">/100</span>
          {trend !== 0 && (
            <Badge
              variant={trend > 0 ? 'default' : 'destructive'}
              className="text-xs"
            >
              {trend > 0 ? '+' : ''}{trend}
            </Badge>
          )}
        </div>
        <Progress value={score} className="h-1 mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {level.charAt(0).toUpperCase() + level.slice(1)} Level
        </p>
      </CardContent>
    </Card>
  )
}