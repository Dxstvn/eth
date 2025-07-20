import '@testing-library/jest-dom'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.ethereum for wallet testing
Object.defineProperty(window, 'ethereum', {
  writable: true,
  value: {
    isMetaMask: true,
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
})

// Mock other wallet providers
Object.defineProperty(window, 'phantom', {
  writable: true,
  value: {
    solana: {
      isPhantom: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
      publicKey: null,
      on: jest.fn(),
    },
  },
})

Object.defineProperty(window, 'unisat', {
  writable: true,
  value: {
    getAddresses: jest.fn(),
    signMessage: jest.fn(),
    signPSBT: jest.fn(),
  },
})

// Mock crypto.getRandomValues
Object.defineProperty(global.crypto, 'getRandomValues', {
  value: (arr) => arr.map(() => Math.floor(Math.random() * 256))
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock Firebase
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  })),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
}))

// Mock Firebase app
jest.mock('@/lib/firebase-client', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  },
  googleProvider: {},
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
  }),
}))

// Mock local storage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock fetch
global.fetch = jest.fn()

// Mock AbortSignal.timeout
global.AbortSignal = {
  timeout: jest.fn(() => ({
    aborted: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
}
