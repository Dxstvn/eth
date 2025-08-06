/**
 * Configuration for E2E tests
 * These tests use the real backend with Firebase emulators and Hardhat nodes
 */

export const testConfig = {
  // Use real backend with emulators
  useRealBackend: true,
  
  // Test user credentials for Firebase emulator
  testUsers: {
    existingUser: {
      email: 'test@example.com',
      password: 'testpassword123'
    },
    newUser: {
      email: 'newuser@example.com',
      password: 'newpassword123'
    }
  },
  
  // Timeouts for various operations
  timeouts: {
    emailSend: 5000,
    verification: 10000,
    navigation: 5000
  }
};

/**
 * Helper to wait for real backend operations
 */
export async function waitForBackendOperation(ms: number = 1000) {
  await new Promise(resolve => setTimeout(resolve, ms));
}