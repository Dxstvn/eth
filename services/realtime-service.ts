import { 
  doc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase-client'

// WebSocket connection for blockchain events
class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners = new Map<string, Set<Function>>()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isConnecting = false
  
  constructor(private url: string) {}

  connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve()
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
        
        this.ws.onopen = () => {
          console.log('🔌 WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason)
          this.isConnecting = false
          this.stopHeartbeat()
          
          // Attempt to reconnect if not a manual close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('🔌 WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private scheduleReconnect() {
    setTimeout(() => {
      this.reconnectAttempts++
      console.log(`🔌 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect().catch(() => {
        // Reconnect failed, will try again if under max attempts
      })
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts)) // Exponential backoff
  }

  private handleMessage(data: any) {
    const { type, transactionId, ...payload } = data
    
    if (type === 'pong') {
      return // Heartbeat response
    }

    // Emit to relevant listeners
    const eventKey = `${type}:${transactionId || 'global'}`
    const listeners = this.listeners.get(eventKey) || this.listeners.get(type) || new Set()
    
    listeners.forEach(callback => {
      try {
        callback(payload)
      } catch (error) {
        console.error('WebSocket listener error:', error)
      }
    })
  }

  subscribe(eventType: string, callback: Function, transactionId?: string): () => void {
    const eventKey = transactionId ? `${eventType}:${transactionId}` : eventType
    
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, new Set())
    }
    
    this.listeners.get(eventKey)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventKey)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(eventKey)
        }
      }
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket not connected, message not sent:', data)
    }
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close(1000) // Normal closure
      this.ws = null
    }
  }

  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' {
    if (this.isConnecting) return 'connecting'
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return 'connected'
    return 'disconnected'
  }
}

// Firestore real-time listeners
export class RealtimeService {
  private firestoreListeners = new Map<string, Unsubscribe>()
  private wsManager: WebSocketManager | null = null
  
  constructor() {
    // Initialize WebSocket for blockchain events (production only)
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_WS_URL) {
      this.wsManager = new WebSocketManager(process.env.NEXT_PUBLIC_WS_URL)
      this.wsManager.connect().catch(error => {
        console.warn('Failed to connect to WebSocket:', error)
      })
    }
  }

  // Subscribe to transaction updates via Firestore
  subscribeToTransaction(
    transactionId: string,
    callback: (transaction: any) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore not configured, skipping transaction subscription')
      return () => {}
    }

    const docRef = doc(db, 'transactions', transactionId)
    const listenerId = `transaction_${transactionId}`
    
    // Clean up existing listener
    this.unsubscribe(listenerId)
    
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap: DocumentSnapshot<DocumentData>) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() }
          callback(data)
        } else {
          console.warn(`Transaction ${transactionId} not found`)
        }
      },
      (error) => {
        console.error('Firestore transaction listener error:', error)
      }
    )

    this.firestoreListeners.set(listenerId, unsubscribe)
    
    return () => this.unsubscribe(listenerId)
  }

  // Subscribe to user's transactions
  subscribeToUserTransactions(
    userId: string,
    callback: (transactions: any[]) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore not configured, skipping user transactions subscription')
      return () => {}
    }

    const q = query(
      collection(db, 'transactions'),
      where('participants', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    )
    
    const listenerId = `user_transactions_${userId}`
    
    // Clean up existing listener
    this.unsubscribe(listenerId)
    
    const unsubscribe = onSnapshot(
      q,
      (querySnap: QuerySnapshot<DocumentData>) => {
        const transactions = querySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        callback(transactions)
      },
      (error) => {
        console.error('Firestore user transactions listener error:', error)
      }
    )

    this.firestoreListeners.set(listenerId, unsubscribe)
    
    return () => this.unsubscribe(listenerId)
  }

  // Subscribe to blockchain events via WebSocket
  subscribeToBlockchainEvents(
    eventType: string,
    callback: (data: any) => void,
    transactionId?: string
  ): () => void {
    if (!this.wsManager) {
      console.warn('WebSocket not available, skipping blockchain event subscription')
      return () => {}
    }

    return this.wsManager.subscribe(eventType, callback, transactionId)
  }

  // Subscribe to transaction status changes
  subscribeToTransactionStatus(
    transactionId: string,
    callback: (status: string, data: any) => void
  ): () => void {
    const unsubscribers: (() => void)[] = []

    // Subscribe to Firestore updates
    unsubscribers.push(
      this.subscribeToTransaction(transactionId, (transaction) => {
        callback(transaction.status, transaction)
      })
    )

    // Subscribe to blockchain events
    if (this.wsManager) {
      unsubscribers.push(
        this.subscribeToBlockchainEvents('status_change', (data) => {
          callback(data.newStatus, data)
        }, transactionId)
      )
    }

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }

  // Get WebSocket connection status
  getConnectionStatus() {
    return {
      websocket: this.wsManager ? this.wsManager.getConnectionStatus() : 'unavailable',
      firestore: db ? 'connected' : 'unavailable'
    }
  }

  // Send message via WebSocket
  sendBlockchainMessage(data: any) {
    if (this.wsManager) {
      this.wsManager.send(data)
    }
  }

  // Unsubscribe from specific listener
  private unsubscribe(listenerId: string) {
    const unsubscribe = this.firestoreListeners.get(listenerId)
    if (unsubscribe) {
      unsubscribe()
      this.firestoreListeners.delete(listenerId)
    }
  }

  // Clean up all listeners
  cleanup() {
    // Unsubscribe from all Firestore listeners
    this.firestoreListeners.forEach(unsubscribe => unsubscribe())
    this.firestoreListeners.clear()

    // Disconnect WebSocket
    if (this.wsManager) {
      this.wsManager.disconnect()
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService()