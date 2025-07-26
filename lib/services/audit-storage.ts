import { KYCAuditEntry } from './kyc-audit-logger';

// Storage interface for audit logs
export interface AuditStorage {
  store(entry: KYCAuditEntry): Promise<void>;
  retrieve(filters: AuditRetrievalFilters): Promise<KYCAuditEntry[]>;
  delete(id: string): Promise<boolean>;
  deleteExpired(): Promise<number>;
  export(filters: AuditRetrievalFilters, format: 'json' | 'csv'): Promise<string>;
  getStats(): Promise<AuditStorageStats>;
}

export interface AuditRetrievalFilters {
  id?: string;
  userId?: string;
  kycId?: string;
  action?: string | string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'userId';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditStorageStats {
  totalEntries: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  storageSize: number;
  entriesByAction: Record<string, number>;
  entriesByUser: Record<string, number>;
}

// In-memory storage implementation for development
export class InMemoryAuditStorage implements AuditStorage {
  private entries: Map<string, KYCAuditEntry> = new Map();
  private retentionDays: number = 90;
  
  constructor(retentionDays?: number) {
    if (retentionDays) {
      this.retentionDays = retentionDays;
    }
  }
  
  async store(entry: KYCAuditEntry): Promise<void> {
    this.entries.set(entry.id, entry);
    
    // Auto-cleanup old entries periodically
    if (this.entries.size % 100 === 0) {
      await this.deleteExpired();
    }
  }
  
  async retrieve(filters: AuditRetrievalFilters): Promise<KYCAuditEntry[]> {
    let results = Array.from(this.entries.values());
    
    // Apply filters
    if (filters.id) {
      results = results.filter(e => e.id === filters.id);
    }
    
    if (filters.userId) {
      results = results.filter(e => e.userId === filters.userId);
    }
    
    if (filters.kycId) {
      results = results.filter(e => e.kycId === filters.kycId);
    }
    
    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      results = results.filter(e => actions.includes(e.action));
    }
    
    if (filters.dateFrom) {
      results = results.filter(e => e.timestamp >= filters.dateFrom!.getTime());
    }
    
    if (filters.dateTo) {
      results = results.filter(e => e.timestamp <= filters.dateTo!.getTime());
    }
    
    // Sort
    const sortBy = filters.sortBy || 'timestamp';
    const sortOrder = filters.sortOrder || 'desc';
    
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'action':
          comparison = a.action.localeCompare(b.action);
          break;
        case 'userId':
          comparison = a.userId.localeCompare(b.userId);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    results = results.slice(offset, offset + limit);
    
    return results;
  }
  
  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }
  
  async deleteExpired(): Promise<number> {
    const cutoffDate = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const [id, entry] of this.entries) {
      if (entry.timestamp < cutoffDate) {
        this.entries.delete(id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  async export(filters: AuditRetrievalFilters, format: 'json' | 'csv'): Promise<string> {
    const entries = await this.retrieve({ ...filters, limit: undefined });
    
    if (format === 'json') {
      return JSON.stringify({
        exportDate: new Date().toISOString(),
        filters,
        entries,
        summary: {
          totalEntries: entries.length,
          dateRange: entries.length > 0 ? {
            from: new Date(Math.min(...entries.map(e => e.timestamp))).toISOString(),
            to: new Date(Math.max(...entries.map(e => e.timestamp))).toISOString()
          } : null
        }
      }, null, 2);
    }
    
    // CSV format
    const headers = [
      'ID', 'Timestamp', 'Action', 'User ID', 'KYC ID', 'Session ID',
      'Details', 'Changes Before', 'Changes After', 'IP Address',
      'User Agent', 'Data Classification', 'PII Masked'
    ];
    
    const rows = entries.map(entry => [
      entry.id,
      new Date(entry.timestamp).toISOString(),
      entry.action,
      entry.userId,
      entry.kycId || '',
      entry.sessionId || '',
      JSON.stringify(entry.details),
      entry.changes ? JSON.stringify(entry.changes.before) : '',
      entry.changes ? JSON.stringify(entry.changes.after) : '',
      entry.metadata.ipAddress || '',
      entry.metadata.userAgent || '',
      entry.compliance.dataClassification,
      entry.compliance.piiMasked ? 'Yes' : 'No'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  async getStats(): Promise<AuditStorageStats> {
    const entries = Array.from(this.entries.values());
    
    const entriesByAction: Record<string, number> = {};
    const entriesByUser: Record<string, number> = {};
    
    for (const entry of entries) {
      entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
      entriesByUser[entry.userId] = (entriesByUser[entry.userId] || 0) + 1;
    }
    
    return {
      totalEntries: entries.length,
      oldestEntry: entries.length > 0 
        ? new Date(Math.min(...entries.map(e => e.timestamp)))
        : undefined,
      newestEntry: entries.length > 0
        ? new Date(Math.max(...entries.map(e => e.timestamp)))
        : undefined,
      storageSize: JSON.stringify(entries).length, // Approximate size in bytes
      entriesByAction,
      entriesByUser
    };
  }
}

// Production storage implementation (interface for actual database)
export class ProductionAuditStorage implements AuditStorage {
  private apiEndpoint: string;
  
  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }
  
  async store(entry: KYCAuditEntry): Promise<void> {
    const response = await fetch(`${this.apiEndpoint}/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to store audit entry: ${response.statusText}`);
    }
  }
  
  async retrieve(filters: AuditRetrievalFilters): Promise<KYCAuditEntry[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (value instanceof Date) {
          params.append(key, value.toISOString());
        } else if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });
    
    const response = await fetch(`${this.apiEndpoint}/audit?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to retrieve audit entries: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async delete(id: string): Promise<boolean> {
    const response = await fetch(`${this.apiEndpoint}/audit/${id}`, {
      method: 'DELETE'
    });
    
    return response.ok;
  }
  
  async deleteExpired(): Promise<number> {
    const response = await fetch(`${this.apiEndpoint}/audit/cleanup`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete expired entries: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.deletedCount;
  }
  
  async export(filters: AuditRetrievalFilters, format: 'json' | 'csv'): Promise<string> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (value instanceof Date) {
          params.append(key, value.toISOString());
        } else if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });
    
    params.append('format', format);
    
    const response = await fetch(`${this.apiEndpoint}/audit/export?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to export audit entries: ${response.statusText}`);
    }
    
    return response.text();
  }
  
  async getStats(): Promise<AuditStorageStats> {
    const response = await fetch(`${this.apiEndpoint}/audit/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to get audit stats: ${response.statusText}`);
    }
    
    return response.json();
  }
}

// Factory function to create appropriate storage based on environment
export function createAuditStorage(): AuditStorage {
  if (process.env.NODE_ENV === 'production' && process.env.AUDIT_API_ENDPOINT) {
    return new ProductionAuditStorage(process.env.AUDIT_API_ENDPOINT);
  }
  
  return new InMemoryAuditStorage();
}

// Singleton instance
let storageInstance: AuditStorage | null = null;

export function getAuditStorage(): AuditStorage {
  if (!storageInstance) {
    storageInstance = createAuditStorage();
  }
  return storageInstance;
}