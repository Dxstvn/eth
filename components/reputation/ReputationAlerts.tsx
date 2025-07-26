'use client'

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Bell,
  X,
  ChevronRight,
  Shield,
  Star,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReputationAlert {
  id: string
  type: 'increase' | 'decrease' | 'achievement' | 'warning' | 'milestone'
  title: string
  description: string
  value?: number
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

interface ReputationAlertsProps {
  alerts: ReputationAlert[]
  onDismiss: (id: string) => void
  onAction?: (alert: ReputationAlert) => void
}

export function ReputationAlerts({ alerts, onDismiss, onAction }: ReputationAlertsProps) {
  const unreadAlerts = alerts.filter(a => !a.read)

  if (unreadAlerts.length === 0) return null

  return (
    <div className="space-y-3">
      {unreadAlerts.map((alert) => (
        <ReputationAlertItem
          key={alert.id}
          alert={alert}
          onDismiss={onDismiss}
          onAction={onAction}
        />
      ))}
    </div>
  )
}

function ReputationAlertItem({
  alert,
  onDismiss,
  onAction,
}: {
  alert: ReputationAlert
  onDismiss: (id: string) => void
  onAction?: (alert: ReputationAlert) => void
}) {
  const config = {
    increase: {
      icon: TrendingUp,
      color: 'border-green-200 bg-green-50',
      iconColor: 'text-green-600',
    },
    decrease: {
      icon: TrendingDown,
      color: 'border-red-200 bg-red-50',
      iconColor: 'text-red-600',
    },
    achievement: {
      icon: Award,
      color: 'border-purple-200 bg-purple-50',
      iconColor: 'text-purple-600',
    },
    warning: {
      icon: AlertTriangle,
      color: 'border-orange-200 bg-orange-50',
      iconColor: 'text-orange-600',
    },
    milestone: {
      icon: Star,
      color: 'border-blue-200 bg-blue-50',
      iconColor: 'text-blue-600',
    },
  }

  const alertConfig = config[alert.type]
  const Icon = alertConfig.icon

  return (
    <Alert className={cn('relative', alertConfig.color)}>
      <Icon className={cn('h-4 w-4', alertConfig.iconColor)} />
      <AlertTitle className="pr-8">{alert.title}</AlertTitle>
      <AlertDescription className="mt-1">
        <p>{alert.description}</p>
        {alert.value && (
          <p className="mt-1">
            <span className={cn('font-semibold', alertConfig.iconColor)}>
              {alert.type === 'increase' ? '+' : alert.type === 'decrease' ? '-' : ''}
              {alert.value} points
            </span>
          </p>
        )}
        {alert.actionUrl && (
          <Button
            variant="link"
            size="sm"
            className="mt-2 p-0 h-auto"
            onClick={() => onAction?.(alert)}
          >
            {alert.actionLabel || 'View Details'}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={() => onDismiss(alert.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  )
}

// Notification Center Component
export function ReputationNotificationCenter({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  // Mock data - would come from API
  const notifications: ReputationAlert[] = [
    {
      id: '1',
      type: 'increase',
      title: 'Reputation Increased!',
      description: 'Transaction completed successfully with Sarah Johnson',
      value: 10,
      timestamp: new Date('2025-01-20T10:00:00'),
      read: false,
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Achievement Unlocked!',
      description: 'You earned the "Quick Responder" badge',
      timestamp: new Date('2025-01-19T15:30:00'),
      read: false,
      actionUrl: '/achievements',
      actionLabel: 'View Achievement',
    },
    {
      id: '3',
      type: 'milestone',
      title: 'Milestone Reached!',
      description: 'You\'ve reached Gold level status',
      timestamp: new Date('2025-01-18T09:00:00'),
      read: true,
    },
    {
      id: '4',
      type: 'warning',
      title: 'Response Time Alert',
      description: 'Your average response time has increased to 2 hours',
      timestamp: new Date('2025-01-17T14:00:00'),
      read: true,
      actionUrl: '/settings/notifications',
      actionLabel: 'Adjust Settings',
    },
  ]

  const [alerts, setAlerts] = React.useState(notifications)

  const handleDismiss = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a))
  }

  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Reputation Updates</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {alerts.map((alert) => (
            <NotificationItem
              key={alert.id}
              alert={alert}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
        {alerts.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No new reputation updates
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NotificationItem({
  alert,
  onDismiss,
}: {
  alert: ReputationAlert
  onDismiss: (id: string) => void
}) {
  const config = {
    increase: { icon: TrendingUp, color: 'text-green-600' },
    decrease: { icon: TrendingDown, color: 'text-red-600' },
    achievement: { icon: Award, color: 'text-purple-600' },
    warning: { icon: AlertTriangle, color: 'text-orange-600' },
    milestone: { icon: Star, color: 'text-blue-600' },
  }

  const Icon = config[alert.type].icon
  const iconColor = config[alert.type].color

  return (
    <div
      className={cn(
        'p-4 hover:bg-muted/50 transition-colors',
        !alert.read && 'bg-blue-50/50'
      )}
    >
      <div className="flex gap-3">
        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center bg-muted')}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-sm', !alert.read && 'font-semibold')}>
            {alert.title}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {alert.description}
          </p>
          {alert.value && (
            <p className="text-sm mt-1">
              <span className={cn('font-medium', iconColor)}>
                {alert.type === 'increase' ? '+' : alert.type === 'decrease' ? '-' : ''}
                {alert.value} points
              </span>
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {getRelativeTime(alert.timestamp)}
            </span>
          </div>
        </div>
        {!alert.read && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={() => onDismiss(alert.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Mobile-optimized notification badge
export function ReputationNotificationBadge({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  if (count === 0) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative p-2"
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
      >
        {count > 9 ? '9+' : count}
      </Badge>
    </Button>
  )
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}