import CryptoJS from 'crypto-js';
import { messageIntegrity, secureRandom, advancedEncryption } from './crypto-utils';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';

// Secure communication configuration
export const SECURE_COMM_CONFIG = {
  KEY_EXCHANGE_TIMEOUT: 30000, // 30 seconds
  MESSAGE_TTL: 300000, // 5 minutes
  NONCE_SIZE: 16,
  SESSION_KEY_SIZE: 32,
  HEARTBEAT_INTERVAL: 60000, // 1 minute
};

// Message types
export enum SecureMessageType {
  KEY_EXCHANGE_REQUEST = 'KEY_EXCHANGE_REQUEST',
  KEY_EXCHANGE_RESPONSE = 'KEY_EXCHANGE_RESPONSE',
  ENCRYPTED_MESSAGE = 'ENCRYPTED_MESSAGE',
  HEARTBEAT = 'HEARTBEAT',
  ERROR = 'ERROR',
}

// Secure message structure
export interface SecureMessage {
  id: string;
  type: SecureMessageType;
  timestamp: number;
  ttl: number;
  payload: any;
  signature?: string;
  nonce?: string;
}

// Key exchange data
export interface KeyExchangeData {
  sessionId: string;
  publicKey: string;
  nonce: string;
  timestamp: number;
  clientFingerprint: string;
}

// Encrypted payload
export interface EncryptedPayload {
  data: string;
  iv: string;
  hmac: string;
}

// Secure communication channel
export class SecureCommunicationChannel {
  private sessionId: string;
  private sessionKey: string | null = null;
  private remotePublicKey: string | null = null;
  private localPrivateKey: string;
  private localPublicKey: string;
  private messageQueue: Map<string, SecureMessage> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private onMessageCallback?: (message: any) => void;
  private onErrorCallback?: (error: Error) => void;
  
  constructor(
    private channelId: string,
    private isInitiator: boolean = true
  ) {
    this.sessionId = secureRandom.generateUUID();
    
    // Generate ephemeral key pair for this session
    const keyPair = this.generateEphemeralKeyPair();
    this.localPrivateKey = keyPair.privateKey;
    this.localPublicKey = keyPair.publicKey;
    
    if (this.isInitiator) {
      this.initiateKeyExchange();
    }
  }
  
  // Generate ephemeral ECDH key pair
  private generateEphemeralKeyPair(): { privateKey: string; publicKey: string } {
    // Simulate ECDH key generation using secure random
    const privateKeyBytes = secureRandom.generateBytes(32);
    const privateKey = Array.from(privateKeyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Derive public key from private key (simplified)
    const publicKey = CryptoJS.SHA256(privateKey + 'public').toString();
    
    return { privateKey, publicKey };
  }
  
  // Initiate key exchange
  private initiateKeyExchange(): void {
    const keyExchangeData: KeyExchangeData = {
      sessionId: this.sessionId,
      publicKey: this.localPublicKey,
      nonce: secureRandom.generateString(SECURE_COMM_CONFIG.NONCE_SIZE),
      timestamp: Date.now(),
      clientFingerprint: this.getClientFingerprint(),
    };
    
    const message: SecureMessage = {
      id: secureRandom.generateUUID(),
      type: SecureMessageType.KEY_EXCHANGE_REQUEST,
      timestamp: Date.now(),
      ttl: SECURE_COMM_CONFIG.KEY_EXCHANGE_TIMEOUT,
      payload: keyExchangeData,
    };
    
    this.sendMessage(message);
  }
  
  // Handle incoming message
  handleIncomingMessage(message: SecureMessage): void {
    try {
      // Verify message integrity
      if (!this.verifyMessageIntegrity(message)) {
        throw new Error('Message integrity check failed');
      }
      
      // Check TTL
      if (Date.now() > message.timestamp + message.ttl) {
        throw new Error('Message expired');
      }
      
      switch (message.type) {
        case SecureMessageType.KEY_EXCHANGE_REQUEST:
          this.handleKeyExchangeRequest(message);
          break;
        case SecureMessageType.KEY_EXCHANGE_RESPONSE:
          this.handleKeyExchangeResponse(message);
          break;
        case SecureMessageType.ENCRYPTED_MESSAGE:
          this.handleEncryptedMessage(message);
          break;
        case SecureMessageType.HEARTBEAT:
          this.handleHeartbeat(message);
          break;
        case SecureMessageType.ERROR:
          this.handleError(message);
          break;
      }
    } catch (error) {
      this.handleMessageError(error as Error, message);
    }
  }
  
  // Handle key exchange request
  private handleKeyExchangeRequest(message: SecureMessage): void {
    const keyExchangeData: KeyExchangeData = message.payload;
    
    // Validate key exchange data
    if (!keyExchangeData.publicKey || !keyExchangeData.nonce) {
      throw new Error('Invalid key exchange data');
    }
    
    // Store remote public key
    this.remotePublicKey = keyExchangeData.publicKey;
    
    // Generate session key
    this.sessionKey = this.deriveSessionKey(
      this.localPrivateKey,
      this.remotePublicKey,
      keyExchangeData.nonce
    );
    
    // Send response
    const responseData: KeyExchangeData = {
      sessionId: keyExchangeData.sessionId,
      publicKey: this.localPublicKey,
      nonce: secureRandom.generateString(SECURE_COMM_CONFIG.NONCE_SIZE),
      timestamp: Date.now(),
      clientFingerprint: this.getClientFingerprint(),
    };
    
    const response: SecureMessage = {
      id: secureRandom.generateUUID(),
      type: SecureMessageType.KEY_EXCHANGE_RESPONSE,
      timestamp: Date.now(),
      ttl: SECURE_COMM_CONFIG.KEY_EXCHANGE_TIMEOUT,
      payload: responseData,
      signature: this.signMessage(JSON.stringify(responseData)),
    };
    
    this.sendMessage(response);
    this.startHeartbeat();
  }
  
  // Handle key exchange response
  private handleKeyExchangeResponse(message: SecureMessage): void {
    const keyExchangeData: KeyExchangeData = message.payload;
    
    // Verify signature
    if (!this.verifyMessageSignature(message)) {
      throw new Error('Key exchange response signature invalid');
    }
    
    // Store remote public key
    this.remotePublicKey = keyExchangeData.publicKey;
    
    // Generate session key
    this.sessionKey = this.deriveSessionKey(
      this.localPrivateKey,
      this.remotePublicKey,
      keyExchangeData.nonce
    );
    
    this.startHeartbeat();
    
    securityLogger.log(
      SecurityEventType.SECURITY_CONFIG_CHANGED,
      SecurityEventSeverity.LOW,
      { event: 'Secure channel established', channelId: this.channelId }
    );
  }
  
  // Handle encrypted message
  private handleEncryptedMessage(message: SecureMessage): void {
    if (!this.sessionKey) {
      throw new Error('Session key not established');
    }
    
    const encryptedPayload: EncryptedPayload = message.payload;
    
    // Decrypt message
    const decryptedData = this.decryptMessage(encryptedPayload);
    
    if (this.onMessageCallback) {
      this.onMessageCallback(JSON.parse(decryptedData));
    }
  }
  
  // Send encrypted message
  sendEncryptedMessage(data: any): void {
    if (!this.sessionKey) {
      throw new Error('Secure channel not established');
    }
    
    const encryptedPayload = this.encryptMessage(JSON.stringify(data));
    
    const message: SecureMessage = {
      id: secureRandom.generateUUID(),
      type: SecureMessageType.ENCRYPTED_MESSAGE,
      timestamp: Date.now(),
      ttl: SECURE_COMM_CONFIG.MESSAGE_TTL,
      payload: encryptedPayload,
    };
    
    this.sendMessage(message);
  }
  
  // Encrypt message
  private encryptMessage(data: string): EncryptedPayload {
    if (!this.sessionKey) {
      throw new Error('Session key not available');
    }
    
    const iv = secureRandom.generateString(16);
    const encrypted = CryptoJS.AES.encrypt(data, this.sessionKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
    
    // Generate HMAC for integrity
    const hmac = CryptoJS.HmacSHA256(encrypted + iv, this.sessionKey).toString();
    
    return {
      data: encrypted,
      iv,
      hmac,
    };
  }
  
  // Decrypt message
  private decryptMessage(payload: EncryptedPayload): string {
    if (!this.sessionKey) {
      throw new Error('Session key not available');
    }
    
    // Verify HMAC
    const expectedHmac = CryptoJS.HmacSHA256(
      payload.data + payload.iv,
      this.sessionKey
    ).toString();
    
    if (payload.hmac !== expectedHmac) {
      throw new Error('Message HMAC verification failed');
    }
    
    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(payload.data, this.sessionKey, {
      iv: CryptoJS.enc.Hex.parse(payload.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
  
  // Derive session key using ECDH
  private deriveSessionKey(
    privateKey: string,
    publicKey: string,
    nonce: string
  ): string {
    // Simulate ECDH shared secret generation
    const sharedSecret = CryptoJS.SHA256(privateKey + publicKey).toString();
    
    // Derive session key with nonce
    return CryptoJS.PBKDF2(sharedSecret, nonce, {
      keySize: SECURE_COMM_CONFIG.SESSION_KEY_SIZE / 4,
      iterations: 10000,
    }).toString();
  }
  
  // Sign message
  private signMessage(data: string): string {
    return CryptoJS.HmacSHA256(data, this.localPrivateKey).toString();
  }
  
  // Verify message signature
  private verifyMessageSignature(message: SecureMessage): boolean {
    if (!message.signature || !this.remotePublicKey) return false;
    
    const expectedSignature = CryptoJS.HmacSHA256(
      JSON.stringify(message.payload),
      this.remotePublicKey
    ).toString();
    
    return message.signature === expectedSignature;
  }
  
  // Verify message integrity
  private verifyMessageIntegrity(message: SecureMessage): boolean {
    // Basic integrity checks
    return (
      message.id &&
      message.type &&
      message.timestamp &&
      message.ttl &&
      message.payload
    );
  }
  
  // Get client fingerprint
  private getClientFingerprint(): string {
    if (typeof window === 'undefined') return 'server';
    
    return CryptoJS.SHA256(
      navigator.userAgent +
      navigator.language +
      screen.width +
      screen.height
    ).toString();
  }
  
  // Start heartbeat
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeat: SecureMessage = {
        id: secureRandom.generateUUID(),
        type: SecureMessageType.HEARTBEAT,
        timestamp: Date.now(),
        ttl: SECURE_COMM_CONFIG.HEARTBEAT_INTERVAL,
        payload: { status: 'alive' },
      };
      
      this.sendMessage(heartbeat);
    }, SECURE_COMM_CONFIG.HEARTBEAT_INTERVAL);
  }
  
  // Handle heartbeat
  private handleHeartbeat(message: SecureMessage): void {
    // Respond to heartbeat
    const response: SecureMessage = {
      id: secureRandom.generateUUID(),
      type: SecureMessageType.HEARTBEAT,
      timestamp: Date.now(),
      ttl: SECURE_COMM_CONFIG.HEARTBEAT_INTERVAL,
      payload: { status: 'alive', responseToId: message.id },
    };
    
    this.sendMessage(response);
  }
  
  // Handle error
  private handleError(message: SecureMessage): void {
    const error = new Error(message.payload.error || 'Unknown secure communication error');
    this.handleMessageError(error, message);
  }
  
  // Handle message error
  private handleMessageError(error: Error, message?: SecureMessage): void {
    securityLogger.log(
      SecurityEventType.ERROR,
      SecurityEventSeverity.MEDIUM,
      {
        error: error.message,
        channelId: this.channelId,
        messageId: message?.id,
      }
    );
    
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
  
  // Send message (abstract - implement based on transport)
  private sendMessage(message: SecureMessage): void {
    // In real implementation, this would send via WebSocket, HTTP, etc.
    console.log('[SecureComm] Sending message:', message.type);
  }
  
  // Set message callback
  onMessage(callback: (message: any) => void): void {
    this.onMessageCallback = callback;
  }
  
  // Set error callback
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }
  
  // Close channel
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Clear sensitive data
    this.sessionKey = null;
    this.localPrivateKey = '0'.repeat(64);
    this.messageQueue.clear();
  }
}

// Secure WebSocket wrapper
export class SecureWebSocket {
  private ws: WebSocket | null = null;
  private channel: SecureCommunicationChannel | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  
  constructor(private url: string) {}
  
  // Connect with secure channel
  async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(this.url);
      this.channel = new SecureCommunicationChannel(this.url, true);
      
      this.ws.onopen = () => {
        console.log('[SecureWebSocket] Connected');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message: SecureMessage = JSON.parse(event.data);
          this.channel?.handleIncomingMessage(message);
        } catch (error) {
          console.error('[SecureWebSocket] Message parse error:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('[SecureWebSocket] Disconnected');
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('[SecureWebSocket] Error:', error);
      };
      
    } catch (error) {
      throw new Error(`Failed to connect to ${this.url}: ${error}`);
    }
  }
  
  // Send encrypted message
  sendSecure(data: any): void {
    if (!this.channel) {
      throw new Error('Secure channel not established');
    }
    
    this.channel.sendEncryptedMessage(data);
  }
  
  // Set message handler
  onSecureMessage(callback: (data: any) => void): void {
    this.channel?.onMessage(callback);
  }
  
  // Attempt reconnection
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`[SecureWebSocket] Reconnect attempt ${this.reconnectAttempts}`);
        this.connect();
      }, this.reconnectInterval);
    }
  }
  
  // Close connection
  close(): void {
    this.ws?.close();
    this.channel?.close();
  }
}

// TLS/SSL certificate pinning for HTTPS requests
export class CertificatePinner {
  private pinnedCertificates: Map<string, string[]> = new Map();
  
  // Pin certificate for domain
  pinCertificate(domain: string, certificateHashes: string[]): void {
    this.pinnedCertificates.set(domain, certificateHashes);
  }
  
  // Verify certificate (browser limitation - informational only)
  verifyCertificate(domain: string, certificateHash: string): boolean {
    const pinnedHashes = this.pinnedCertificates.get(domain);
    if (!pinnedHashes) return true; // No pinning configured
    
    return pinnedHashes.includes(certificateHash);
  }
  
  // Configure for ClearHold domains
  configureClearHoldPinning(): void {
    // In production, these would be actual certificate hashes
    this.pinCertificate('api.clearhold.app', [
      'sha256-YLh1dUR9y6Kja30RrAn7JKnbQG/uEtLMkBgFF2Fuihg=',
      'sha256-Vjs8r4z+80wjNcr1YKepWQboSIRi63WsWXhIMN+eWys='
    ]);
  }
}

// Export instances
export const certificatePinner = new CertificatePinner();
certificatePinner.configureClearHoldPinning();