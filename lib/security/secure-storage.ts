import CryptoJS from 'crypto-js';

// Secure storage configuration
export interface SecureStorageConfig {
  encryptionKey?: string;
  enableEncryption: boolean;
  storageType: 'local' | 'session';
  keyPrefix: string;
}

// Default configuration
const defaultConfig: SecureStorageConfig = {
  enableEncryption: true,
  storageType: 'local',
  keyPrefix: 'clearhold_secure_',
};

// Generate encryption key from user-specific data
function generateEncryptionKey(): string {
  if (typeof window === 'undefined') return '';
  
  // Combine multiple browser-specific values for key generation
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    // Add a random component stored in session
    getOrCreateSessionSalt(),
  ];
  
  // Generate a deterministic key from components
  return CryptoJS.SHA256(components.join('|')).toString();
}

// Get or create a session-specific salt
function getOrCreateSessionSalt(): string {
  const saltKey = '_clearhold_salt';
  let salt = sessionStorage.getItem(saltKey);
  
  if (!salt) {
    salt = CryptoJS.lib.WordArray.random(128/8).toString();
    sessionStorage.setItem(saltKey, salt);
  }
  
  return salt;
}

// Secure storage class
export class SecureStorage {
  private config: SecureStorageConfig;
  private storage: Storage;
  private encryptionKey: string;
  
  constructor(config: Partial<SecureStorageConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.storage = this.config.storageType === 'local' 
      ? localStorage 
      : sessionStorage;
    this.encryptionKey = this.config.encryptionKey || generateEncryptionKey();
  }
  
  // Set item with optional encryption
  setItem(key: string, value: any, options?: { encrypt?: boolean }): void {
    const fullKey = this.config.keyPrefix + key;
    const shouldEncrypt = options?.encrypt ?? this.config.enableEncryption;
    
    try {
      const serialized = JSON.stringify({
        value,
        timestamp: Date.now(),
        encrypted: shouldEncrypt,
      });
      
      const data = shouldEncrypt 
        ? this.encrypt(serialized)
        : serialized;
      
      this.storage.setItem(fullKey, data);
    } catch (error) {
      console.error('SecureStorage: Failed to set item', error);
      throw new Error('Failed to store secure data');
    }
  }
  
  // Get item with automatic decryption
  getItem<T = any>(key: string): T | null {
    const fullKey = this.config.keyPrefix + key;
    
    try {
      const data = this.storage.getItem(fullKey);
      if (!data) return null;
      
      // Try to parse as encrypted data first
      let parsed: any;
      try {
        const decrypted = this.decrypt(data);
        parsed = JSON.parse(decrypted);
      } catch {
        // If decryption fails, try parsing as plain JSON
        parsed = JSON.parse(data);
      }
      
      return parsed.value;
    } catch (error) {
      console.error('SecureStorage: Failed to get item', error);
      return null;
    }
  }
  
  // Remove item
  removeItem(key: string): void {
    const fullKey = this.config.keyPrefix + key;
    this.storage.removeItem(fullKey);
  }
  
  // Clear all secure storage items
  clear(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.config.keyPrefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => this.storage.removeItem(key));
  }
  
  // Check if item exists
  hasItem(key: string): boolean {
    const fullKey = this.config.keyPrefix + key;
    return this.storage.getItem(fullKey) !== null;
  }
  
  // Get all keys
  getAllKeys(): string[] {
    const keys: string[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.config.keyPrefix)) {
        keys.push(key.substring(this.config.keyPrefix.length));
      }
    }
    
    return keys;
  }
  
  // Encryption methods
  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }
  
  private decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  
  // Set item with expiration
  setItemWithExpiry(key: string, value: any, expiryMs: number): void {
    const expiryTime = Date.now() + expiryMs;
    this.setItem(key, { value, expiryTime });
  }
  
  // Get item checking expiration
  getItemWithExpiry<T = any>(key: string): T | null {
    const item = this.getItem<{ value: T; expiryTime: number }>(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiryTime) {
      this.removeItem(key);
      return null;
    }
    
    return item.value;
  }
}

// Create default instances
export const secureLocalStorage = new SecureStorage({
  storageType: 'local',
});

export const secureSessionStorage = new SecureStorage({
  storageType: 'session',
});

// React hook for secure storage
export function useSecureStorage(
  key: string,
  initialValue?: any,
  config?: Partial<SecureStorageConfig>
) {
  const storage = React.useMemo(
    () => new SecureStorage(config),
    [config]
  );
  
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      const item = storage.getItem(key);
      return item ?? initialValue;
    } catch (error) {
      console.error('useSecureStorage: Failed to get initial value', error);
      return initialValue;
    }
  });
  
  const setValue = React.useCallback(
    (value: any) => {
      try {
        setStoredValue(value);
        storage.setItem(key, value);
      } catch (error) {
        console.error('useSecureStorage: Failed to set value', error);
      }
    },
    [key, storage]
  );
  
  const removeValue = React.useCallback(() => {
    try {
      storage.removeItem(key);
      setStoredValue(undefined);
    } catch (error) {
      console.error('useSecureStorage: Failed to remove value', error);
    }
  }, [key, storage]);
  
  return [storedValue, setValue, removeValue] as const;
}

// Sensitive data storage with additional protections
export class SensitiveDataStorage {
  private storage = new SecureStorage({
    enableEncryption: true,
    keyPrefix: 'clearhold_sensitive_',
  });
  
  // Store sensitive data with additional security
  storeSensitiveData(
    category: 'payment' | 'personal' | 'financial' | 'auth',
    key: string,
    data: any,
    expiryMinutes: number = 30
  ): void {
    const fullKey = `${category}_${key}`;
    
    // Add metadata for audit trail
    const wrappedData = {
      data,
      category,
      storedAt: Date.now(),
      accessCount: 0,
    };
    
    this.storage.setItemWithExpiry(
      fullKey,
      wrappedData,
      expiryMinutes * 60 * 1000
    );
    
    // Log sensitive data access
    if (typeof window !== 'undefined') {
      console.log(`[Security] Sensitive data stored: ${category}/${key}`);
    }
  }
  
  // Retrieve sensitive data with access logging
  retrieveSensitiveData<T = any>(
    category: 'payment' | 'personal' | 'financial' | 'auth',
    key: string
  ): T | null {
    const fullKey = `${category}_${key}`;
    const wrapped = this.storage.getItemWithExpiry<any>(fullKey);
    
    if (!wrapped) return null;
    
    // Update access count
    wrapped.accessCount++;
    this.storage.setItem(fullKey, wrapped);
    
    // Log access
    if (typeof window !== 'undefined') {
      console.log(
        `[Security] Sensitive data accessed: ${category}/${key} (count: ${wrapped.accessCount})`
      );
    }
    
    return wrapped.data;
  }
  
  // Clear all sensitive data
  clearAllSensitiveData(): void {
    this.storage.clear();
    console.log('[Security] All sensitive data cleared');
  }
  
  // Get sensitive data statistics
  getSensitiveDataStats(): Record<string, number> {
    const stats: Record<string, number> = {
      payment: 0,
      personal: 0,
      financial: 0,
      auth: 0,
    };
    
    const keys = this.storage.getAllKeys();
    keys.forEach(key => {
      const category = key.split('_')[0];
      if (category in stats) {
        stats[category]++;
      }
    });
    
    return stats;
  }
}

// Export singleton instance
export const sensitiveDataStorage = new SensitiveDataStorage();

import React from 'react';