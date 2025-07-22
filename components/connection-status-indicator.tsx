"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Wifi, WifiOff, Activity, AlertCircle } from "lucide-react"
import { realtimeService } from "@/services/realtime-service"

interface ConnectionStatus {
  websocket: 'connecting' | 'connected' | 'disconnected' | 'unavailable'
  firestore: 'connected' | 'unavailable'
}

export default function ConnectionStatusIndicator({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<ConnectionStatus>({
    websocket: 'unavailable',
    firestore: 'unavailable'
  })
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Update connection status periodically
    const updateStatus = () => {
      const connectionStatus = realtimeService.getConnectionStatus()
      setStatus(connectionStatus)
    }

    // Initial update
    updateStatus()

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getOverallStatus = (): {
    status: 'connected' | 'partial' | 'disconnected' | 'offline'
    color: string
    icon: React.ReactNode
    text: string
    tooltip: string
  } => {
    if (!isOnline) {
      return {
        status: 'offline',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <WifiOff className="h-3 w-3" />,
        text: 'Offline',
        tooltip: 'No internet connection. Changes will sync when back online.'
      }
    }

    const wsConnected = status.websocket === 'connected'
    const firestoreConnected = status.firestore === 'connected'
    const wsConnecting = status.websocket === 'connecting'

    if (wsConnected && firestoreConnected) {
      return {
        status: 'connected',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <Activity className="h-3 w-3" />,
        text: 'Live',
        tooltip: 'Real-time updates active for transactions and blockchain events'
      }
    }

    if (wsConnecting || (firestoreConnected && status.websocket === 'unavailable')) {
      return {
        status: 'partial',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Wifi className="h-3 w-3" />,
        text: 'Partial',
        tooltip: firestoreConnected 
          ? 'Database connected, blockchain events unavailable'
          : 'Connecting to real-time services...'
      }
    }

    return {
      status: 'disconnected',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <AlertCircle className="h-3 w-3" />,
      text: 'Disconnected',
      tooltip: 'Real-time updates unavailable. Using cached data.'
    }
  }

  // Don't show indicator in development mode with auth bypass
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true') {
    return null
  }

  const connectionInfo = getOverallStatus()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${connectionInfo.color} ${className} flex items-center gap-1 text-xs font-medium`}
          >
            {connectionInfo.icon}
            {connectionInfo.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{connectionInfo.tooltip}</p>
            <div className="text-xs text-muted-foreground border-t pt-1">
              <p>Database: {status.firestore === 'connected' ? '✅ Connected' : '❌ Unavailable'}</p>
              <p>Blockchain: {
                status.websocket === 'connected' ? '✅ Connected' : 
                status.websocket === 'connecting' ? '🔄 Connecting...' :
                status.websocket === 'disconnected' ? '❌ Disconnected' : '➖ Unavailable'
              }</p>
              <p>Network: {isOnline ? '✅ Online' : '❌ Offline'}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}