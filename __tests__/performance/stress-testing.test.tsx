import { describe, test, beforeAll, expect } from 'vitest'
import fetch from 'node-fetch'

/**
 * STRESS TESTING SUITE
 * Tests backend behavior under extreme load conditions
 * 
 * This suite tests:
 * - High concurrent user load
 * - Rate limiting behavior
 * - System recovery after overload
 * - Memory and resource exhaustion scenarios
 * - Error handling under stress
 */
describe('Stress Testing Suite', () => {
  const BACKEND_URL = 'http://localhost:3000'
  
  // Stress test parameters
  const STRESS_LEVELS = {
    LIGHT: 20,
    MEDIUM: 50,
    HEAVY: 100,
    EXTREME: 200
  }
  
  // Performance thresholds under stress
  const STRESS_THRESHOLDS = {
    MAX_RESPONSE_TIME: 10000,    // 10 seconds max response time under stress
    MIN_SUCCESS_RATE: 0.3,       // At least 30% success rate under extreme load
    RECOVERY_TIME: 5000          // System should recover within 5 seconds
  }
  
  beforeAll(async () => {
    // Verify backend is running
    try {
      const health = await fetch(`${BACKEND_URL}/health`)
      if (!health.ok) {
        throw new Error('Backend not healthy')
      }
      console.log('Backend is healthy, starting stress tests...')
      console.log('⚠️  WARNING: These tests may temporarily overload the backend')
    } catch (error) {
      console.error('Backend services not running. Start with: npm run dev:fullstack')
      throw error
    }
  })
  
  describe('Authentication Stress Testing', () => {
    test('should handle light concurrent load (20 users)', async () => {
      await runAuthenticationStressTest(STRESS_LEVELS.LIGHT, 'Light')
    }, 60000)
    
    test('should handle medium concurrent load (50 users)', async () => {
      await runAuthenticationStressTest(STRESS_LEVELS.MEDIUM, 'Medium')
    }, 90000)
    
    test('should handle heavy concurrent load (100 users)', async () => {
      await runAuthenticationStressTest(STRESS_LEVELS.HEAVY, 'Heavy')
    }, 120000)
    
    test('should survive extreme concurrent load (200 users)', async () => {
      const results = await runAuthenticationStressTest(STRESS_LEVELS.EXTREME, 'Extreme')
      
      // Under extreme load, we expect some failures but system should not crash
      expect(results.successRate).toBeGreaterThan(STRESS_THRESHOLDS.MIN_SUCCESS_RATE)
      expect(results.avgResponseTime).toBeLessThan(STRESS_THRESHOLDS.MAX_RESPONSE_TIME)
      
      // Verify system recovery
      await verifySystemRecovery()
    }, 180000)
  })
  
  describe('Rate Limiting Stress Testing', () => {
    test('should enforce rate limits under rapid fire requests', async () => {
      const rapidFireCount = 100
      const startTime = Date.now()
      
      console.log(`Sending ${rapidFireCount} rapid fire requests...`)
      
      const promises = Array.from({ length: rapidFireCount }, (_, i) =>
        fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `rapid-${i}@test.com`,
            password: 'password'
          })
        }).then(async (response) => ({
          index: i,
          status: response.status,
          rateLimited: response.status === 429,
          responseTime: Date.now() - startTime
        })).catch((error) => ({
          index: i,
          status: 0,
          rateLimited: false,
          error: error.message,
          responseTime: Date.now() - startTime
        }))
      )
      
      const results = await Promise.all(promises)
      const rateLimitedCount = results.filter(r => r.rateLimited).length
      const errorCount = results.filter(r => r.status === 0).length
      const successCount = results.filter(r => r.status === 200).length
      
      console.log(`
Rate Limiting Stress Test Results:
├── Total Requests: ${rapidFireCount}
├── Rate Limited (429): ${rateLimitedCount}
├── Successful (200): ${successCount}
├── Errors: ${errorCount}
├── Rate Limiting Percentage: ${((rateLimitedCount / rapidFireCount) * 100).toFixed(1)}%
└── System Response: ${rateLimitedCount > 0 ? 'Rate Limiting Active ✓' : 'No Rate Limiting Detected ⚠️'}
      `)
      
      // Rate limiting should kick in for rapid requests
      expect(rateLimitedCount).toBeGreaterThan(rapidFireCount * 0.3) // At least 30% should be rate limited
      expect(errorCount).toBeLessThan(rapidFireCount * 0.1) // Less than 10% should error out
    }, 120000)
    
    test('should recover after rate limiting subsides', async () => {
      // First trigger rate limiting
      const rapidRequests = Array.from({ length: 20 }, (_, i) =>
        fetch(`${BACKEND_URL}/health`)
      )
      
      await Promise.all(rapidRequests)
      
      // Wait for rate limiting to subside
      console.log('Waiting for rate limiting to subside...')
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      
      // Test recovery
      const recoveryStartTime = Date.now()
      const recoveryResponse = await fetch(`${BACKEND_URL}/health`)
      const recoveryTime = Date.now() - recoveryStartTime
      
      console.log(`
Rate Limiting Recovery Test:
├── Recovery Response Status: ${recoveryResponse.status}
├── Recovery Time: ${recoveryTime}ms
└── System Status: ${recoveryResponse.ok ? 'Recovered ✓' : 'Still Impacted ⚠️'}
      `)
      
      expect(recoveryResponse.ok).toBe(true)
      expect(recoveryTime).toBeLessThan(STRESS_THRESHOLDS.RECOVERY_TIME)
    }, 60000)
  })
  
  describe('Memory and Resource Stress Testing', () => {
    test('should handle multiple large payloads simultaneously', async () => {
      // Create a test user first
      const createResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `memory-stress-${Date.now()}@example.com`,
          password: 'StressTest123@'
        })
      })
      
      if (!createResponse.ok) {
        console.log('Could not create test user for memory stress test')
        return
      }
      
      const userData = await createResponse.json() as any
      const authToken = userData.token
      
      // Create large payloads
      const largePayload = 'x'.repeat(100000) // 100KB payload
      const concurrentRequests = 10
      
      console.log(`Sending ${concurrentRequests} concurrent large payloads (100KB each)...`)
      
      const startTime = Date.now()
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        fetch(`${BACKEND_URL}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            displayName: `Memory Stress Test ${i}`,
            bio: largePayload
          })
        }).then(async (response) => ({
          index: i,
          status: response.status,
          success: response.ok || response.status === 404,
          responseTime: Date.now() - startTime
        })).catch((error) => ({
          index: i,
          status: 0,
          success: false,
          error: error.message,
          responseTime: Date.now() - startTime
        }))
      )
      
      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
      
      console.log(`
Memory Stress Test Results:
├── Concurrent Large Payloads: ${concurrentRequests}
├── Payload Size: 100KB each
├── Total Data: ${(concurrentRequests * 100)}KB
├── Successful: ${successful}
├── Failed: ${failed}
├── Total Time: ${totalTime}ms
├── Average Response Time: ${avgResponseTime.toFixed(2)}ms
└── Memory Handling: ${failed === 0 ? 'Excellent ✓' : failed < concurrentRequests * 0.5 ? 'Good' : 'Needs Improvement ⚠️'}
      `)
      
      // System should handle reasonable memory load
      expect(successful).toBeGreaterThan(0)
      expect(avgResponseTime).toBeLessThan(STRESS_THRESHOLDS.MAX_RESPONSE_TIME)
    }, 120000)
  })
  
  describe('Database Connection Stress Testing', () => {
    test('should maintain database connections under load', async () => {
      const dbRequests = 30
      const startTime = Date.now()
      
      console.log(`Testing database connection stability with ${dbRequests} concurrent requests...`)
      
      // Make requests that likely hit the database
      const promises = Array.from({ length: dbRequests }, (_, i) =>
        fetch(`${BACKEND_URL}/health`)
          .then(async (response) => {
            const responseTime = Date.now() - startTime
            const data = response.ok ? await response.json() : null
            return {
              index: i,
              status: response.status,
              success: response.ok,
              responseTime,
              dbConnected: data?.firebase === 'connected'
            }
          }).catch((error) => ({
            index: i,
            status: 0,
            success: false,
            error: error.message,
            responseTime: Date.now() - startTime,
            dbConnected: false
          }))
      )
      
      const results = await Promise.all(promises)
      const successful = results.filter(r => r.success).length
      const dbConnected = results.filter(r => r.dbConnected).length
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
      
      console.log(`
Database Connection Stress Test Results:
├── Concurrent DB Requests: ${dbRequests}
├── Successful Responses: ${successful}
├── Database Connected: ${dbConnected}
├── Average Response Time: ${avgResponseTime.toFixed(2)}ms
├── Connection Stability: ${dbConnected === successful ? 'Stable ✓' : 'Unstable ⚠️'}
└── Success Rate: ${((successful / dbRequests) * 100).toFixed(1)}%
      `)
      
      // Database connections should remain stable
      expect(successful).toBeGreaterThan(dbRequests * 0.8) // At least 80% success
      expect(dbConnected).toBeGreaterThan(dbRequests * 0.8) // At least 80% DB connected
    }, 90000)
  })
  
  describe('System Recovery Testing', () => {
    test('should recover gracefully after overload', async () => {
      // Phase 1: Overload the system
      console.log('Phase 1: Overloading system...')
      const overloadPromises = Array.from({ length: 100 }, (_, i) =>
        fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `overload-${i}@test.com`,
            password: 'password'
          })
        }).catch(() => ({ status: 0 }))
      )
      
      await Promise.all(overloadPromises)
      
      // Phase 2: Wait for system to stabilize
      console.log('Phase 2: Waiting for system stabilization...')
      await new Promise(resolve => setTimeout(resolve, 15000)) // Wait 15 seconds
      
      // Phase 3: Test recovery
      console.log('Phase 3: Testing system recovery...')
      const recoveryTests = []
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now()
        
        const promise = fetch(`${BACKEND_URL}/health`)
          .then(async (response) => {
            const responseTime = Date.now() - startTime
            const data = response.ok ? await response.json() : null
            return {
              attempt: i + 1,
              status: response.status,
              success: response.ok,
              responseTime,
              healthy: data?.status === 'OK'
            }
          }).catch((error) => ({
            attempt: i + 1,
            status: 0,
            success: false,
            error: error.message,
            responseTime: Date.now() - startTime,
            healthy: false
          }))
        
        recoveryTests.push(promise)
        
        // Small delay between recovery tests
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      const recoveryResults = await Promise.all(recoveryTests)
      const allHealthy = recoveryResults.every(r => r.healthy)
      const avgRecoveryTime = recoveryResults.reduce((sum, r) => sum + r.responseTime, 0) / recoveryResults.length
      
      console.log(`
System Recovery Test Results:
├── Recovery Tests: ${recoveryResults.length}
├── All Healthy: ${allHealthy ? 'Yes ✓' : 'No ⚠️'}
├── Average Response Time: ${avgRecoveryTime.toFixed(2)}ms
├── Individual Results:
${recoveryResults.map(r => 
  `│   ├── Test ${r.attempt}: ${r.responseTime}ms (${r.healthy ? 'HEALTHY' : 'UNHEALTHY'})`
).join('\n')}
└── Recovery Status: ${allHealthy && avgRecoveryTime < STRESS_THRESHOLDS.RECOVERY_TIME ? 'Excellent ✓' : 'Needs Monitoring ⚠️'}
      `)
      
      // System should recover fully
      expect(allHealthy).toBe(true)
      expect(avgRecoveryTime).toBeLessThan(STRESS_THRESHOLDS.RECOVERY_TIME)
    }, 180000)
  })
  
  // Helper function for authentication stress testing
  async function runAuthenticationStressTest(userCount: number, level: string) {
    const startTime = Date.now()
    
    console.log(`Starting ${level} authentication stress test with ${userCount} concurrent users...`)
    
    const promises = Array.from({ length: userCount }, (_, i) =>
      fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `stress-${level.toLowerCase()}-${i}-${Date.now()}@example.com`,
          password: 'StressTest123@',
          displayName: `Stress Test User ${i}`
        })
      }).then(async (response) => {
        const responseTime = Date.now() - startTime
        return {
          id: i,
          status: response.status,
          success: response.ok,
          responseTime,
          rateLimited: response.status === 429
        }
      }).catch((error) => ({
        id: i,
        status: 0,
        success: false,
        responseTime: Date.now() - startTime,
        rateLimited: false,
        error: error.message
      }))
    )
    
    const results = await Promise.all(promises)
    const totalTime = Date.now() - startTime
    
    // Analyze results
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const rateLimited = results.filter(r => r.rateLimited).length
    const errors = results.filter(r => r.status === 0).length
    const successRate = successful / userCount
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
    const maxResponseTime = Math.max(...results.map(r => r.responseTime))
    
    console.log(`
${level} Stress Test Results:
├── Concurrent Users: ${userCount}
├── Successful: ${successful}
├── Failed: ${failed}
├── Rate Limited: ${rateLimited}
├── Errors: ${errors}
├── Total Time: ${totalTime}ms
├── Success Rate: ${(successRate * 100).toFixed(1)}%
├── Average Response Time: ${avgResponseTime.toFixed(2)}ms
├── Max Response Time: ${maxResponseTime}ms
└── System Performance: ${successRate > 0.7 ? 'Excellent ✓' : successRate > 0.5 ? 'Good' : successRate > 0.3 ? 'Fair' : 'Poor ⚠️'}
    `)
    
    return {
      userCount,
      successful,
      failed,
      rateLimited,
      errors,
      successRate,
      avgResponseTime,
      maxResponseTime,
      totalTime
    }
  }
  
  // Helper function to verify system recovery
  async function verifySystemRecovery() {
    console.log('Verifying system recovery after extreme load...')
    
    // Wait for system to stabilize
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // Test basic functionality
    const healthCheck = await fetch(`${BACKEND_URL}/health`)
    const healthData = healthCheck.ok ? await healthCheck.json() : null
    
    console.log(`
System Recovery Verification:
├── Health Check Status: ${healthCheck.status}
├── System Status: ${healthData?.status || 'Unknown'}
├── Database Status: ${healthData?.firebase || 'Unknown'}
└── Recovery: ${healthCheck.ok && healthData?.status === 'OK' ? 'Complete ✓' : 'Incomplete ⚠️'}
    `)
    
    expect(healthCheck.ok).toBe(true)
    if (healthData) {
      expect(healthData.status).toBe('OK')
    }
  }
})