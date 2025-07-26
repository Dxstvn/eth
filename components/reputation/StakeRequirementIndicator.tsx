'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp, Shield, AlertTriangle, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StakeRequirementIndicatorProps {
  reputationScore: number
  className?: string
}

const reputationTiers = [
  { 
    name: 'Unverified', 
    min: 0, 
    max: 199, 
    stake: 10.0, 
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    icon: AlertTriangle
  },
  { 
    name: 'Bronze', 
    min: 200, 
    max: 499, 
    stake: 5.0, 
    color: 'bg-orange-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    icon: Shield
  },
  { 
    name: 'Silver', 
    min: 500, 
    max: 749, 
    stake: 3.5, 
    color: 'bg-gray-400',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
    icon: Shield
  },
  { 
    name: 'Gold', 
    min: 750, 
    max: 899, 
    stake: 2.5, 
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    icon: Award
  },
  { 
    name: 'Platinum', 
    min: 900, 
    max: 1000, 
    stake: 2.0, 
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    icon: Award
  },
]

export function StakeRequirementIndicator({ 
  reputationScore, 
  className 
}: StakeRequirementIndicatorProps) {
  const currentTier = reputationTiers.find(
    tier => reputationScore >= tier.min && reputationScore <= tier.max
  ) || reputationTiers[0]
  
  const currentIndex = reputationTiers.indexOf(currentTier)
  const nextTier = currentIndex < reputationTiers.length - 1 ? reputationTiers[currentIndex + 1] : null
  
  const progressToNextTier = nextTier
    ? ((reputationScore - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100

  const potentialSavings = currentTier.stake - reputationTiers[reputationTiers.length - 1].stake
  const Icon = currentTier.icon

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Dispute Stake Requirements
          </span>
          <Badge variant="outline" className="capitalize">
            <div className={`w-2 h-2 rounded-full ${currentTier.color} mr-2`} />
            {currentTier.name} Tier
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Stake Percentage */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${currentTier.bgColor}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${currentTier.textColor}`} />
              <span className="font-medium">Your Current Stake Rate</span>
            </div>
            <span className={`text-2xl font-bold ${currentTier.textColor}`}>
              {currentTier.stake}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            of transaction amount required for disputes
          </p>
        </motion.div>

        {/* High Stake Warning */}
        {currentTier.stake >= 5.0 && (
          <Alert variant="warning" className="border-orange-500/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your stake requirement is {currentTier.stake >= 10 ? 'very ' : ''}high due to your {currentTier.name.toLowerCase()} reputation tier. 
              Improve your reputation to reduce dispute costs.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress to Next Tier */}
        {nextTier && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextTier.name}</span>
              <span className="font-medium">
                {reputationScore} / {nextTier.min} points
              </span>
            </div>
            <Progress value={progressToNextTier} className="h-2" />
            <div className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">
                Reach {nextTier.min} points to reduce stake to {nextTier.stake}%
              </span>
            </div>
          </div>
        )}

        {/* Tier Comparison */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Stake Requirements by Tier
          </h4>
          <div className="grid gap-2">
            {reputationTiers.map((tier, index) => {
              const isCurrent = tier === currentTier
              const isPast = reputationScore > tier.max
              const isFuture = reputationScore < tier.min
              
              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    isCurrent 
                      ? 'bg-primary/10 border border-primary/20' 
                      : isPast
                      ? 'opacity-60'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                    <div>
                      <span className={`text-sm font-medium ${
                        isCurrent ? 'text-primary' : ''
                      }`}>
                        {tier.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({tier.min}+ points)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={isCurrent ? 'default' : 'outline'}
                      className="font-mono"
                    >
                      {tier.stake}%
                    </Badge>
                    {isFuture && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Save {(currentTier.stake - tier.stake).toFixed(1)}% per dispute
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Motivation Message */}
        {potentialSavings > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  Maximize Your Savings
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reaching Platinum tier could save you up to {potentialSavings}% on every dispute stake
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Example Calculations */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground font-medium">
            Example stake amounts for your tier:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">$10K transaction:</span>
              <span className="font-medium ml-1">
                ${(10000 * currentTier.stake / 100).toLocaleString()}
              </span>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">$50K transaction:</span>
              <span className="font-medium ml-1">
                ${(50000 * currentTier.stake / 100).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}