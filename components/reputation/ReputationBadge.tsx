'use client'

import React from 'react'
import { Shield, Star, TrendingUp, Award, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type ReputationLevel = 'unverified' | 'bronze' | 'silver' | 'gold' | 'platinum'

interface ReputationBadgeProps {
  score: number
  level: ReputationLevel
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
  verified?: boolean
  className?: string
  interactive?: boolean
  onClick?: () => void
}

const levelConfig = {
  unverified: {
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    icon: Shield,
    label: 'Unverified',
    gradient: 'from-gray-200 to-gray-300',
  },
  bronze: {
    color: 'bg-amber-50 text-amber-700 border-amber-400',
    icon: Shield,
    label: 'Bronze',
    gradient: 'from-amber-400 to-amber-600',
  },
  silver: {
    color: 'bg-gray-50 text-gray-700 border-gray-400',
    icon: Shield,
    label: 'Silver',
    gradient: 'from-gray-300 to-gray-500',
  },
  gold: {
    color: 'bg-yellow-50 text-yellow-700 border-yellow-400',
    icon: Shield,
    label: 'Gold',
    gradient: 'from-yellow-400 to-yellow-600',
  },
  platinum: {
    color: 'bg-purple-50 text-purple-700 border-purple-400',
    icon: Shield,
    label: 'Platinum',
    gradient: 'from-purple-400 to-purple-600',
  },
}

const sizeConfig = {
  sm: {
    badge: 'h-8 px-2 text-xs',
    icon: 'h-3.5 w-3.5',
    score: 'text-xs',
  },
  md: {
    badge: 'h-10 px-3 text-sm',
    icon: 'h-4 w-4',
    score: 'text-sm',
  },
  lg: {
    badge: 'h-12 px-4 text-base',
    icon: 'h-5 w-5',
    score: 'text-base',
  },
}

export function ReputationBadge({
  score,
  level,
  size = 'md',
  showScore = true,
  verified = false,
  className,
  interactive = true,
  onClick,
}: ReputationBadgeProps) {
  const config = levelConfig[level]
  const sizes = sizeConfig[size]
  const Icon = config.icon

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-all',
        config.color,
        sizes.badge,
        interactive && 'cursor-pointer hover:shadow-md hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <div className={cn('relative', sizes.icon)}>
        <Icon className={cn('h-full w-full')} />
        {verified && (
          <CheckCircle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-500 text-white" />
        )}
      </div>
      <span className="font-semibold">{config.label}</span>
      {showScore && (
        <>
          <span className="opacity-50">•</span>
          <span className={sizes.score}>{score}</span>
        </>
      )}
    </div>
  )

  if (!interactive) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{config.label} Member</p>
            <p className="text-sm text-muted-foreground">
              Reputation Score: {score}/100
            </p>
            {verified && (
              <p className="text-sm text-green-600">✓ Verified Identity</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Compact version for inline display
export function ReputationIndicator({
  score,
  level,
  className,
}: {
  score: number
  level: ReputationLevel
  className?: string
}) {
  const config = levelConfig[level]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1 text-sm',
              className
            )}
          >
            <div
              className={cn(
                'h-2 w-2 rounded-full bg-gradient-to-r',
                config.gradient
              )}
            />
            <span className="font-medium">{score}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label} • Score: {score}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Star rating display
export function ReputationStars({
  score,
  size = 'md',
  className,
}: {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const stars = Math.round((score / 100) * 5)
  const starSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            starSize[size],
            i < stars
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          )}
        />
      ))}
    </div>
  )
}