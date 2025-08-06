import { describe, test, beforeAll, expect } from 'vitest'
import fetch from 'node-fetch'

/**
 * RESOURCE MONITORING TEST SUITE
 * Monitors backend resource usage and performance characteristics
 * 
 * This suite monitors:
 * - Response time patterns
 * - Concurrent connection handling
 * - Memory usage indicators
 * - Error rate patterns
 * - Service availability metrics
 */
describe('Resource Monitoring Suite', () => {
  const BACKEND_URL = 'http://localhost:3000'
  
  interface PerformanceMetrics {
    timestamp: number
    responseTime: number
    status: number
    success: boolean
    endpoint: string
    payloadSize?: number
  }
  
  const performanceData: PerformanceMetrics[] = []
  
  beforeAll(async () => {
    // Verify backend is running
    try {
      const health = await fetch(`${BACKEND_URL}/health`)
      if (!health.ok) {
        throw new Error('Backend not healthy')
      }
      console.log('Backend is healthy, starting resource monitoring...')
    } catch (error) {
      console.error('Backend services not running. Start with: npm run dev:fullstack')
      throw error
    }
  })
  
  describe('Response Time Monitoring', () => {
    test('should monitor baseline response times', async () => {
      const baselineTests = 20
      const endpoints = [
        { path: '/health', name: 'Health Check' },
        { path: '/auth/signInEmailPass', name: 'Auth Endpoint', method: 'POST', body: { email: 'test@test.com', password: 'test' } }
      ]
      
      console.log('Collecting baseline response time metrics...')
      
      for (const endpoint of endpoints) {
        for (let i = 0; i < baselineTests; i++) {
          const startTime = Date.now()
          
          try {
            const response = await fetch(`${BACKEND_URL}${endpoint.path}`, {
              method: endpoint.method || 'GET',
              headers: endpoint.body ? { 'Content-Type': 'application/json' } : undefined,
              body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
            })
            
            const responseTime = Date.now() - startTime
            
            performanceData.push({
              timestamp: Date.now(),
              responseTime,
              status: response.status,
              success: response.ok || response.status === 401, // 401 is expected for invalid auth
              endpoint: endpoint.name
            })
            
            if (response.ok || response.status === 401) {
              try {
                await response.json()
              } catch {
                // Response might not be JSON
              }
            }
          } catch (error) {
            performanceData.push({
              timestamp: Date.now(),
              responseTime: Date.now() - startTime,
              status: 0,
              success: false,
              endpoint: endpoint.name
            })
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      // Analyze baseline metrics
      const healthMetrics = performanceData.filter(d => d.endpoint === 'Health Check')
      const authMetrics = performanceData.filter(d => d.endpoint === 'Auth Endpoint')
      
      const healthAvg = healthMetrics.reduce((sum, m) => sum + m.responseTime, 0) / healthMetrics.length
      const authAvg = authMetrics.reduce((sum, m) => sum + m.responseTime, 0) / authMetrics.length
      
      const healthSuccess = healthMetrics.filter(m => m.success).length / healthMetrics.length
      const authSuccess = authMetrics.filter(m => m.success).length / authMetrics.length
      
      console.log(`
Baseline Response Time Metrics:
├── Health Check Endpoint:
│   ├── Average Response Time: ${healthAvg.toFixed(2)}ms
│   ├── Success Rate: ${(healthSuccess * 100).toFixed(1)}%
│   └── Reliability: ${healthSuccess > 0.95 ? 'Excellent ✓' : healthSuccess > 0.9 ? 'Good' : 'Needs Attention ⚠️'}
├── Auth Endpoint:
│   ├── Average Response Time: ${authAvg.toFixed(2)}ms
│   ├── Success Rate: ${(authSuccess * 100).toFixed(1)}%
│   └── Reliability: ${authSuccess > 0.95 ? 'Excellent ✓' : authSuccess > 0.9 ? 'Good' : 'Needs Attention ⚠️'}
└── Overall Performance: ${healthAvg < 1000 && authAvg < 3000 ? 'Optimal ✓' : 'Acceptable'}
      `)
      
      // Performance expectations
      expect(healthAvg).toBeLessThan(1000) // Health check should be fast
      expect(authAvg).toBeLessThan(5000)   // Auth should complete within 5s
      expect(healthSuccess).toBeGreaterThan(0.9) // 90% success rate minimum
    }, 60000)
    
    test('should detect response time degradation patterns', async () => {
      const degradationTests = 30
      const testIntervals = [100, 200, 500, 1000] // Different intervals between requests
      
      console.log('Testing for response time degradation patterns...')
      
      for (const interval of testIntervals) {
        const testResults = []
        
        for (let i = 0; i < degradationTests; i++) {
          const startTime = Date.now()
          
          try {
            const response = await fetch(`${BACKEND_URL}/health`)
            const responseTime = Date.now() - startTime
            
            testResults.push({
              requestNumber: i + 1,
              responseTime,
              status: response.status,
              success: response.ok
            })
            
            if (response.ok) {
              await response.json()
            }
          } catch (error) {
            testResults.push({
              requestNumber: i + 1,
              responseTime: Date.now() - startTime,
              status: 0,
              success: false
            })
          }
          
          await new Promise(resolve => setTimeout(resolve, interval))
        }
        
        // Analyze degradation
        const firstHalf = testResults.slice(0, Math.floor(degradationTests / 2))
        const secondHalf = testResults.slice(Math.floor(degradationTests / 2))
        
        const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.responseTime, 0) / firstHalf.length
        const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.responseTime, 0) / secondHalf.length
        
        const degradationPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
        
        console.log(`
Degradation Test (${interval}ms intervals):
├── First Half Average: ${firstHalfAvg.toFixed(2)}ms
├── Second Half Average: ${secondHalfAvg.toFixed(2)}ms
├── Degradation: ${degradationPercentage > 0 ? '+' : ''}${degradationPercentage.toFixed(1)}%
└── Status: ${Math.abs(degradationPercentage) < 20 ? 'Stable ✓' : Math.abs(degradationPercentage) < 50 ? 'Moderate Drift' : 'Significant Degradation ⚠️'}
        `)
        
        // Should not degrade significantly over time
        expect(Math.abs(degradationPercentage)).toBeLessThan(100) // Less than 100% degradation
      }
    }, 120000)
  })
  
  describe('Concurrent Connection Monitoring', () => {
    test('should monitor concurrent connection handling', async () => {
      const concurrencyLevels = [5, 10, 20, 30]
      
      console.log('Testing concurrent connection handling...')
      
      for (const concurrency of concurrencyLevels) {
        const startTime = Date.now()
        
        const promises = Array.from({ length: concurrency }, (_, i) =>
          fetch(`${BACKEND_URL}/health`)
            .then(async (response) => {
              const responseTime = Date.now() - startTime
              const data = response.ok ? await response.json() : null
              return {
                id: i,
                responseTime,
                status: response.status,
                success: response.ok,
                dbConnected: data?.firebase === 'connected'
              }
            }).catch((error) => ({
              id: i,
              responseTime: Date.now() - startTime,
              status: 0,
              success: false,
              error: error.message,
              dbConnected: false
            }))
        )
        
        const results = await Promise.all(promises)
        
        const successful = results.filter(r => r.success).length
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
        const maxResponseTime = Math.max(...results.map(r => r.responseTime))
        const minResponseTime = Math.min(...results.map(r => r.responseTime))
        const dbConnections = results.filter(r => r.dbConnected).length
        
        console.log(`
Concurrency Level ${concurrency}:
├── Successful Connections: ${successful}/${concurrency}
├── Database Connections: ${dbConnections}/${concurrency}
├── Average Response Time: ${avgResponseTime.toFixed(2)}ms
├── Min/Max Response Time: ${minResponseTime}ms / ${maxResponseTime}ms
├── Success Rate: ${((successful / concurrency) * 100).toFixed(1)}%
└── Connection Efficiency: ${successful === concurrency ? 'Perfect ✓' : successful > concurrency * 0.8 ? 'Good' : 'Poor ⚠️'}
        `)
        
        // All connections should succeed at reasonable concurrency levels
        if (concurrency <= 20) {
          expect(successful).toBe(concurrency)
        } else {
          expect(successful).toBeGreaterThan(concurrency * 0.7) // At least 70% success for higher concurrency
        }
        
        // Small delay between concurrency tests
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }, 90000)
  })
  
  describe('Memory Usage Indicators', () => {
    test('should monitor memory usage through response patterns', async () => {
      const memoryTests = [
        { name: 'Small Payload', size: 1000 },
        { name: 'Medium Payload', size: 10000 },
        { name: 'Large Payload', size: 100000 },
        { name: 'Extra Large Payload', size: 500000 }
      ]
      
      // Create test user for memory tests
      const createResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `memory-monitor-${Date.now()}@example.com`,
          password: 'MemoryTest123@'
        })
      })
      
      if (!createResponse.ok) {
        console.log('Could not create test user for memory monitoring')
        return
      }
      
      const userData = await createResponse.json() as any
      const authToken = userData.token
      
      console.log('Testing memory usage patterns with varying payload sizes...')
      
      for (const test of memoryTests) {
        const payload = 'x'.repeat(test.size)
        const memoryTestResults = []
        
        // Test each payload size multiple times
        for (let i = 0; i < 5; i++) {
          const startTime = Date.now()
          
          try {
            const response = await fetch(`${BACKEND_URL}/auth/profile`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({
                displayName: `Memory Test ${i}`,
                bio: payload
              })
            })
            
            const responseTime = Date.now() - startTime
            
            memoryTestResults.push({
              attempt: i + 1,
              responseTime,
              status: response.status,
              success: response.ok || response.status === 404, // 404 acceptable if endpoint not implemented
              payloadSize: test.size
            })
            
            if (response.ok) {
              await response.json()
            }
          } catch (error) {
            memoryTestResults.push({
              attempt: i + 1,
              responseTime: Date.now() - startTime,
              status: 0,
              success: false,
              error: (error as Error).message,
              payloadSize: test.size
            })
          }
          
          // Small delay between attempts
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        const avgResponseTime = memoryTestResults.reduce((sum, r) => sum + r.responseTime, 0) / memoryTestResults.length
        const successCount = memoryTestResults.filter(r => r.success).length
        const maxResponseTime = Math.max(...memoryTestResults.map(r => r.responseTime))
        
        console.log(`
${test.name} (${test.size} bytes):
├── Average Response Time: ${avgResponseTime.toFixed(2)}ms
├── Max Response Time: ${maxResponseTime}ms
├── Success Rate: ${(successCount / 5 * 100).toFixed(1)}%
├── Memory Efficiency: ${avgResponseTime < test.size / 100 ? 'Excellent ✓' : avgResponseTime < test.size / 10 ? 'Good' : 'Needs Optimization ⚠️'}
└── Payload Handling: ${successCount === 5 ? 'Perfect ✓' : successCount >= 3 ? 'Good' : 'Poor ⚠️'}
        `)
        
        // Response time should scale reasonably with payload size
        expect(avgResponseTime).toBeLessThan(30000) // 30 second max for any payload
        expect(successCount).toBeGreaterThan(0) // At least some should succeed
      }
    }, 180000)
  })
  
  describe('Error Rate Monitoring', () => {
    test('should monitor error patterns under normal load', async () => {
      const normalLoadTests = 50
      const errorTypes = new Map<number, number>()
      const responseTimes: number[] = []
      
      console.log('Monitoring error patterns under normal load...')
      
      for (let i = 0; i < normalLoadTests; i++) {
        const startTime = Date.now()
        
        try {
          // Mix of valid and invalid requests to see error handling
          const isValidRequest = i % 3 !== 0 // 2/3 valid, 1/3 invalid
          
          const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(isValidRequest ? {
              email: `error-test-${i}@example.com`,
              password: 'ValidPassword123@'
            } : {
              email: 'invalid-email',
              password: '' // Invalid data
            })
          })
          
          const responseTime = Date.now() - startTime
          responseTimes.push(responseTime)
          
          const currentCount = errorTypes.get(response.status) || 0
          errorTypes.set(response.status, currentCount + 1)
          
          if (response.ok || response.status >= 400) {
            try {
              await response.json()
            } catch {
              // Response might not be JSON
            }
          }
        } catch (error) {
          const responseTime = Date.now() - startTime
          responseTimes.push(responseTime)
          
          const currentCount = errorTypes.get(0) || 0
          errorTypes.set(0, currentCount + 1)
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // Analyze error patterns
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const totalErrors = Array.from(errorTypes.entries()).reduce((sum, [status, count]) => {
        return status >= 500 || status === 0 ? sum + count : sum
      }, 0)
      const errorRate = (totalErrors / normalLoadTests) * 100
      
      console.log(`
Error Pattern Analysis:
├── Total Requests: ${normalLoadTests}
├── Error Rate: ${errorRate.toFixed(1)}%
├── Average Response Time: ${avgResponseTime.toFixed(2)}ms
├── Status Code Distribution:
${Array.from(errorTypes.entries()).map(([status, count]) => 
  `│   ├── ${status === 0 ? 'Network Error' : `HTTP ${status}`}: ${count} (${((count/normalLoadTests)*100).toFixed(1)}%)`
).join('\n')}
└── Error Handling: ${errorRate < 5 ? 'Excellent ✓' : errorRate < 15 ? 'Good' : 'Needs Attention ⚠️'}
      `)
      
      // Error rate should be reasonable
      expect(errorRate).toBeLessThan(20) // Less than 20% server errors
      
      // Should have good distribution of expected status codes
      const has200or401 = errorTypes.has(200) || errorTypes.has(401) || errorTypes.has(429)
      expect(has200or401).toBe(true) // Should have some successful or expected error responses
    }, 120000)
  })
  
  describe('Service Availability Monitoring', () => {
    test('should monitor service availability over time', async () => {
      const availabilityPeriod = 60000 // 1 minute
      const checkInterval = 5000 // Every 5 seconds
      const checks = Math.floor(availabilityPeriod / checkInterval)
      
      console.log(`Monitoring service availability for ${availabilityPeriod/1000} seconds...`)
      
      const availabilityResults = []
      const startTime = Date.now()
      
      for (let i = 0; i < checks; i++) {
        const checkStartTime = Date.now()
        
        try {
          const response = await fetch(`${BACKEND_URL}/health`)
          const responseTime = Date.now() - checkStartTime
          const data = response.ok ? await response.json() : null
          
          availabilityResults.push({
            checkNumber: i + 1,
            timestamp: Date.now() - startTime,
            available: response.ok,
            responseTime,
            status: response.status,
            systemStatus: data?.status,
            dbStatus: data?.firebase
          })
        } catch (error) {
          availabilityResults.push({
            checkNumber: i + 1,
            timestamp: Date.now() - startTime,
            available: false,
            responseTime: Date.now() - checkStartTime,
            status: 0,
            error: (error as Error).message
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      }
      
      // Calculate availability metrics
      const totalChecks = availabilityResults.length
      const successfulChecks = availabilityResults.filter(r => r.available).length
      const uptimePercentage = (successfulChecks / totalChecks) * 100
      const avgResponseTime = availabilityResults.reduce((sum, r) => sum + r.responseTime, 0) / totalChecks
      const maxResponseTime = Math.max(...availabilityResults.map(r => r.responseTime))
      const dbAvailableChecks = availabilityResults.filter(r => r.dbStatus === 'connected').length
      const dbUptimePercentage = (dbAvailableChecks / totalChecks) * 100
      
      console.log(`
Service Availability Report:
├── Monitoring Period: ${availabilityPeriod/1000}s
├── Total Checks: ${totalChecks}
├── Successful Checks: ${successfulChecks}
├── Service Uptime: ${uptimePercentage.toFixed(2)}%
├── Database Uptime: ${dbUptimePercentage.toFixed(2)}%
├── Average Response Time: ${avgResponseTime.toFixed(2)}ms
├── Max Response Time: ${maxResponseTime}ms
├── Availability Grade: ${uptimePercentage >= 99 ? 'A+ ✓' : uptimePercentage >= 95 ? 'A' : uptimePercentage >= 90 ? 'B' : 'C ⚠️'}
└── Service Health: ${uptimePercentage >= 95 && dbUptimePercentage >= 95 ? 'Excellent ✓' : 'Needs Monitoring ⚠️'}
      `)
      
      // Service should be highly available
      expect(uptimePercentage).toBeGreaterThan(90) // 90% uptime minimum
      expect(avgResponseTime).toBeLessThan(2000) // Average response under 2s
      
      // Database should also be available
      if (dbAvailableChecks > 0) {
        expect(dbUptimePercentage).toBeGreaterThan(90) // 90% database uptime
      }
    }, 90000)
  })
})