'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Shield,
  Clock,
  Minus,
} from 'lucide-react'
import { format } from 'date-fns'

interface HistoryEvent {
  id: string
  type: 'transaction' | 'dispute' | 'achievement' | 'stake' | 'review' | 'penalty'
  title: string
  description: string
  scoreChange: number
  timestamp: Date
  icon: React.ElementType
  iconColor: string
  metadata?: Record<string, any>
}

interface ReputationHistoryProps {
  userId: string
  limit?: number
}

export function ReputationHistory({ userId, limit }: ReputationHistoryProps) {
  // Mock data - would come from API
  const events: HistoryEvent[] = [
    {
      id: '1',
      type: 'transaction',
      title: 'Transaction Completed',
      description: 'Successfully completed $250,000 real estate escrow',
      scoreChange: 10,
      timestamp: new Date('2025-01-20T14:30:00'),
      icon: DollarSign,
      iconColor: 'text-green-600',
      metadata: {
        amount: '$250,000',
        counterparty: 'Sarah Johnson',
      },
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Achievement Unlocked',
      description: 'Earned "Quick Responder" badge',
      scoreChange: 5,
      timestamp: new Date('2025-01-19T09:15:00'),
      icon: Award,
      iconColor: 'text-purple-600',
    },
    {
      id: '3',
      type: 'review',
      title: 'Positive Review',
      description: '5-star review from buyer',
      scoreChange: 2,
      timestamp: new Date('2025-01-18T16:45:00'),
      icon: Users,
      iconColor: 'text-blue-600',
      metadata: {
        rating: 5,
        reviewer: 'Michael Chen',
      },
    },
    {
      id: '4',
      type: 'dispute',
      title: 'Dispute Resolved',
      description: 'Mutual resolution reached',
      scoreChange: 2,
      timestamp: new Date('2025-01-15T11:00:00'),
      icon: Shield,
      iconColor: 'text-orange-600',
    },
    {
      id: '5',
      type: 'penalty',
      title: 'Late Response',
      description: 'Failed to respond within 24 hours',
      scoreChange: -2,
      timestamp: new Date('2025-01-10T08:30:00'),
      icon: Clock,
      iconColor: 'text-red-600',
    },
    {
      id: '6',
      type: 'stake',
      title: 'Validator Rewards',
      description: 'Monthly validator participation bonus',
      scoreChange: 3,
      timestamp: new Date('2025-01-01T00:00:00'),
      icon: Shield,
      iconColor: 'text-indigo-600',
    },
  ]

  const displayEvents = limit ? events.slice(0, limit) : events

  return (
    <div className="space-y-4">
      {displayEvents.map((event) => (
        <Card key={event.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  event.scoreChange > 0
                    ? 'bg-green-100'
                    : event.scoreChange < 0
                    ? 'bg-red-100'
                    : 'bg-gray-100'
                }`}
              >
                <event.icon className={`h-5 w-5 ${event.iconColor}`} />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{event.title}</h4>
                  <ScoreChange value={event.scoreChange} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
                {event.metadata && (
                  <div className="flex items-center gap-2 mt-2">
                    {event.metadata.amount && (
                      <Badge variant="outline" className="text-xs">
                        {event.metadata.amount}
                      </Badge>
                    )}
                    {event.metadata.counterparty && (
                      <Badge variant="outline" className="text-xs">
                        with {event.metadata.counterparty}
                      </Badge>
                    )}
                    {event.metadata.rating && (
                      <Badge variant="outline" className="text-xs">
                        {event.metadata.rating} stars
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(event.timestamp, 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ScoreChange({ value }: { value: number }) {
  if (value === 0) {
    return (
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <Minus className="h-3 w-3" />
        <span>0</span>
      </div>
    )
  }

  const Icon = value > 0 ? TrendingUp : TrendingDown
  const color = value > 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      <span>{value > 0 ? '+' : ''}{value}</span>
    </div>
  )
}

// Timeline view for profile pages
export function ReputationTimeline({ userId }: { userId: string }) {
  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
      <ReputationHistory userId={userId} />
    </div>
  )
}