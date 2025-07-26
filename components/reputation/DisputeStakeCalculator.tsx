'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, TrendingUp, Shield, Calculator, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StakeCalculation {
  stakeAmount: number
  percentage: number
  tier: string
  warning: string | null
  potentialSavings: {
    toNextTier: number
    toPlatinum: number
    percentageReduction: number
  }
}

interface DisputeStakeCalculatorProps {
  reputationScore: number
  initialTransactionAmount?: number
  onStakeCalculated?: (calculation: StakeCalculation) => void
}

const reputationTiers = {
  platinum: { min: 900, max: 1000, percentage: 2.0, color: 'bg-purple-500' },
  gold: { min: 750, max: 899, percentage: 2.5, color: 'bg-yellow-500' },
  silver: { min: 500, max: 749, percentage: 3.5, color: 'bg-gray-400' },
  bronze: { min: 200, max: 499, percentage: 5.0, color: 'bg-orange-600' },
  unverified: { min: 0, max: 199, percentage: 10.0, color: 'bg-red-500' },
}

export function DisputeStakeCalculator({
  reputationScore,
  initialTransactionAmount = 10000,
  onStakeCalculated,
}: DisputeStakeCalculatorProps) {
  const [transactionAmount, setTransactionAmount] = useState(initialTransactionAmount)
  const [calculation, setCalculation] = useState<StakeCalculation | null>(null)

  const getReputationTier = (score: number): string => {
    if (score >= 900) return 'platinum'
    if (score >= 750) return 'gold'
    if (score >= 500) return 'silver'
    if (score >= 200) return 'bronze'
    return 'unverified'
  }

  const calculateStake = (amount: number, score: number): StakeCalculation => {
    const tier = getReputationTier(score)
    const tierInfo = reputationTiers[tier as keyof typeof reputationTiers]
    const percentage = tierInfo.percentage
    
    let stakeAmount = (amount * percentage) / 100
    
    // Apply minimum and maximum limits
    stakeAmount = Math.max(Math.min(stakeAmount, 50000), 50)
    
    // Calculate savings
    const currentStake = stakeAmount
    const platinumStake = Math.max(Math.min((amount * 2) / 100, 50000), 50)
    
    let nextTierStake = currentStake
    let nextTierName = ''
    
    if (tier !== 'platinum') {
      const tiers = ['unverified', 'bronze', 'silver', 'gold', 'platinum']
      const currentIndex = tiers.indexOf(tier)
      if (currentIndex < tiers.length - 1) {
        nextTierName = tiers[currentIndex + 1]
        const nextTierInfo = reputationTiers[nextTierName as keyof typeof reputationTiers]
        nextTierStake = Math.max(Math.min((amount * nextTierInfo.percentage) / 100, 50000), 50)
      }
    }
    
    return {
      stakeAmount,
      percentage,
      tier,
      warning: percentage >= 5.0 ? 'High stake percentage due to lower reputation tier' : null,
      potentialSavings: {
        toNextTier: currentStake - nextTierStake,
        toPlatinum: currentStake - platinumStake,
        percentageReduction: tier !== 'platinum' 
          ? ((currentStake - platinumStake) / currentStake) * 100 
          : 0,
      },
    }
  }

  useEffect(() => {
    const newCalculation = calculateStake(transactionAmount, reputationScore)
    setCalculation(newCalculation)
    onStakeCalculated?.(newCalculation)
  }, [transactionAmount, reputationScore, onStakeCalculated])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  if (!calculation) return null

  const tierInfo = reputationTiers[calculation.tier as keyof typeof reputationTiers]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Dispute Stake Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transaction Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="transaction-amount">Transaction Amount</Label>
          <Input
            id="transaction-amount"
            type="number"
            value={transactionAmount}
            onChange={(e) => setTransactionAmount(Number(e.target.value) || 0)}
            className="text-lg"
            min="0"
            step="1000"
          />
          <p className="text-sm text-muted-foreground">
            Enter the transaction amount you want to dispute
          </p>
        </div>

        <Separator />

        {/* Current Stake Calculation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Your Reputation Tier</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  <div className={`w-2 h-2 rounded-full ${tierInfo.color} mr-2`} />
                  {calculation.tier}
                </Badge>
                <span className="text-sm font-medium">{reputationScore} points</span>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Your reputation tier determines the stake percentage required for disputes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-muted rounded-lg space-y-3"
            >
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Required Stake</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(calculation.stakeAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Stake Percentage</span>
                <Badge variant={calculation.percentage >= 5 ? 'destructive' : 'secondary'}>
                  {formatPercentage(calculation.percentage)}
                </Badge>
              </div>
            </motion.div>

            {/* Warning Alert */}
            <AnimatePresence>
              {calculation.warning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert variant="warning" className="border-orange-500/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{calculation.warning}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Separator />

        {/* Potential Savings */}
        {calculation.potentialSavings.percentageReduction > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h4 className="font-medium">Potential Savings with Higher Reputation</h4>
            </div>

            <div className="grid gap-3">
              {calculation.potentialSavings.toNextTier > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Reach next tier</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    Save {formatCurrency(calculation.potentialSavings.toNextTier)}
                  </span>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Reach Platinum tier</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-purple-600">
                    Save {formatCurrency(calculation.potentialSavings.toPlatinum)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(calculation.potentialSavings.percentageReduction)} reduction
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Tier Comparison Table */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Stake by Reputation Tier</h4>
          <div className="grid gap-2">
            {Object.entries(reputationTiers).map(([tier, info]) => {
              const tierStake = Math.max(
                Math.min((transactionAmount * info.percentage) / 100, 50000),
                50
              )
              const isCurrentTier = tier === calculation.tier
              
              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    isCurrentTier 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${info.color}`} />
                    <span className="text-sm capitalize font-medium">{tier}</span>
                    <span className="text-xs text-muted-foreground">
                      ({info.min}+ points)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {formatPercentage(info.percentage)}
                    </Badge>
                    <span className={`text-sm font-medium ${
                      isCurrentTier ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {formatCurrency(tierStake)}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}