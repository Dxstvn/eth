// Request Queue for Offline Support

import { QueuedRequest, RequestOptions } from './types';
import { apiLogger } from './logger';

export class RequestQueue {
  private static instance: RequestQueue;
  private queue: QueuedRequest[] = [];
  private isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
  private isProcessing = false;
  private maxQueueSize = 50;
  private maxRetries = 3;
  private storageKey = 'clearhold_request_queue';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.loadQueue();
      this.setupEventListeners();
    }
  }

  static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue();
    }
    return RequestQueue.instance;
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      apiLogger.log({ method: 'SYSTEM', endpoint: 'NETWORK', status: 200, message: 'Network online' });
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      apiLogger.log({ method: 'SYSTEM', endpoint: 'NETWORK', status: 0, message: 'Network offline' });
      this.isOnline = false;
    });

    // Process queue on visibility change (when tab becomes active)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.processQueue();
      }
    });
  }

  private loadQueue(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter out expired requests (older than 24 hours)
        const now = Date.now();
        this.queue = parsed.filter((req: QueuedRequest) => 
          now - req.timestamp < 24 * 60 * 60 * 1000
        );
        this.saveQueue();
      }
    } catch (error) {
      console.error('Failed to load request queue:', error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save request queue:', error);
      // If localStorage is full, remove oldest items
      if (this.queue.length > this.maxQueueSize / 2) {
        this.queue = this.queue.slice(-this.maxQueueSize / 2);
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
        } catch {
          // If still failing, clear the queue
          this.queue = [];
        }
      }
    }
  }

  async addToQueue(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<string> {
    // Check queue size limit
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Request queue is full. Please try again when online.');
    }

    const queuedRequest: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      method,
      endpoint,
      data,
      options,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(queuedRequest);
    this.saveQueue();

    apiLogger.log({
      method: 'QUEUE',
      endpoint,
      status: 202,
      message: `Request queued (ID: ${queuedRequest.id})`
    });

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return queuedRequest.id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    apiLogger.log({
      method: 'QUEUE',
      endpoint: 'PROCESS',
      message: `Processing ${this.queue.length} queued requests`
    });

    try {
      while (this.queue.length > 0 && this.isOnline) {
        const request = this.queue[0];

        try {
          // Import apiClient dynamically to avoid circular dependency
          const { apiClient } = await import('./client');
          
          await apiClient.request(
            request.method,
            request.endpoint,
            request.data,
            { ...request.options, skipQueue: true }
          );

          // Remove successful request from queue
          this.queue.shift();
          this.saveQueue();

          apiLogger.log({
            method: 'QUEUE',
            endpoint: request.endpoint,
            status: 200,
            message: `Queued request completed (ID: ${request.id})`
          });
        } catch (error: any) {
          request.retries++;

          if (request.retries >= this.maxRetries) {
            // Remove failed request after max retries
            this.queue.shift();
            apiLogger.logError('QUEUE', request.endpoint, {
              message: `Request failed after ${this.maxRetries} retries`,
              originalError: error
            });
          } else {
            // Move to end of queue for retry
            this.queue.push(this.queue.shift()!);
            apiLogger.log({
              method: 'QUEUE',
              endpoint: request.endpoint,
              status: 0,
              message: `Request retry ${request.retries}/${this.maxRetries} (ID: ${request.id})`
            });
          }

          this.saveQueue();

          // Add delay before next attempt
          await new Promise(resolve => setTimeout(resolve, 1000 * request.retries));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getQueuedRequests(): QueuedRequest[] {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    apiLogger.log({
      method: 'QUEUE',
      endpoint: 'CLEAR',
      message: 'Request queue cleared'
    });
  }

  removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex(req => req.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  isRequestQueued(method: string, endpoint: string): boolean {
    return this.queue.some(req => 
      req.method === method && req.endpoint === endpoint
    );
  }
}

export const requestQueue = RequestQueue.getInstance();