/**
 * KYC Load Testing Suite
 * Simulates concurrent users and stress tests the KYC system
 */

import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test'
import { EventEmitter } from 'events'

interface LoadTestConfig {
  concurrent_users: number
  ramp_up_time: number // seconds
  test_duration: number // seconds
  target_rps: number // requests per second
  scenarios: LoadTestScenario[]
}

interface LoadTestScenario {
  name: string
  weight: number // percentage of total traffic
  steps: LoadTestStep[]
}

interface LoadTestStep {
  action: 'navigate' | 'fill_form' | 'upload_file' | 'submit' | 'wait'
  target?: string
  data?: any
  duration?: number
  expect_response_time?: number
}

interface LoadTestResult {
  scenario: string
  user_id: number
  step: string
  start_time: number
  end_time: number
  response_time: number
  success: boolean
  error?: string
  memory_usage?: number
  network_data?: {
    requests: number
    total_size: number
    failed_requests: number
  }
}

interface LoadTestMetrics {
  total_requests: number
  successful_requests: number
  failed_requests: number
  average_response_time: number
  min_response_time: number
  max_response_time: number
  percentile_95: number
  percentile_99: number
  requests_per_second: number
  errors_per_second: number
  total_data_transferred: number
  memory_peak: number
  concurrent_users_peak: number
  test_duration: number
  scenarios_completed: number
}

class KYCLoadTester {
  private browsers: Browser[] = []
  private contexts: BrowserContext[] = []
  private results: LoadTestResult[] = []
  private eventEmitter = new EventEmitter()
  private isRunning = false
  private activeUsers = 0
  private startTime = 0

  constructor() {
    this.eventEmitter.setMaxListeners(1000) // Support many concurrent users
  }

  /**
   * Initialize browser instances for concurrent testing
   */
  async initialize(concurrentUsers: number) {
    console.log(`Initializing ${concurrentUsers} browser instances...`)
    
    for (let i = 0; i < Math.min(concurrentUsers, 20); i++) { // Limit to 20 browsers max
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      })
      
      this.browsers.push(browser)
      
      // Create multiple contexts per browser for more concurrent users
      const contextsPerBrowser = Math.ceil(concurrentUsers / this.browsers.length)
      for (let j = 0; j < contextsPerBrowser && this.contexts.length < concurrentUsers; j++) {
        const context = await browser.newContext({
          viewport: { width: 1366, height: 768 },
          userAgent: `LoadTestUser-${this.contexts.length + 1}`
        })
        
        this.contexts.push(context)
      }
    }
    
    console.log(`Initialized ${this.browsers.length} browsers with ${this.contexts.length} contexts`)
  }

  /**
   * Run complete load test with specified configuration
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestMetrics> {
    console.log(`Starting load test with ${config.concurrent_users} concurrent users`)
    console.log(`Ramp-up time: ${config.ramp_up_time}s, Duration: ${config.test_duration}s`)
    
    this.isRunning = true
    this.startTime = Date.now()
    this.results = []
    
    await this.initialize(config.concurrent_users)
    
    // Start users with ramp-up
    const userPromises: Promise<void>[] = []
    const rampUpInterval = (config.ramp_up_time * 1000) / config.concurrent_users
    
    for (let userId = 0; userId < config.concurrent_users; userId++) {
      const delay = userId * rampUpInterval
      
      userPromises.push(
        this.delayedUserStart(userId, delay, config)
      )
    }
    
    // Run for specified duration
    setTimeout(() => {
      this.isRunning = false
      console.log('Stopping load test...')
    }, config.test_duration * 1000)
    
    // Wait for all users to complete or stop
    await Promise.allSettled(userPromises)
    
    return this.calculateMetrics()
  }

  /**
   * Start a single user after a delay
   */
  private async delayedUserStart(userId: number, delay: number, config: LoadTestConfig): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delay))
    
    if (!this.isRunning) return
    
    this.activeUsers++
    console.log(`User ${userId} started (Active users: ${this.activeUsers})`)
    
    try {
      await this.simulateUser(userId, config)
    } catch (error) {
      console.error(`User ${userId} failed:`, error)
    } finally {
      this.activeUsers--
    }
  }

  /**
   * Simulate a single user's behavior
   */
  private async simulateUser(userId: number, config: LoadTestConfig): Promise<void> {
    const context = this.contexts[userId % this.contexts.length]
    if (!context) throw new Error(`No context available for user ${userId}`)
    
    const page = await context.newPage()
    
    // Track network requests
    const networkStats = {
      requests: 0,
      total_size: 0,
      failed_requests: 0
    }
    
    page.on('request', () => networkStats.requests++)
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkStats.failed_requests++
      }
      // Estimate response size
      networkStats.total_size += parseInt(response.headers()['content-length'] || '1000')
    })
    
    try {
      while (this.isRunning) {
        // Select scenario based on weight
        const scenario = this.selectScenario(config.scenarios)
        
        await this.executeScenario(userId, page, scenario, networkStats)
        
        // Random delay between scenarios (1-5 seconds)
        const thinkTime = Math.random() * 4000 + 1000
        await new Promise(resolve => setTimeout(resolve, thinkTime))
      }
    } finally {
      await page.close()
    }
  }

  /**
   * Select scenario based on weights
   */
  private selectScenario(scenarios: LoadTestScenario[]): LoadTestScenario {
    const random = Math.random() * 100
    let cumulative = 0
    
    for (const scenario of scenarios) {
      cumulative += scenario.weight
      if (random <= cumulative) {
        return scenario
      }
    }
    
    return scenarios[scenarios.length - 1] // Fallback to last scenario
  }

  /**
   * Execute a scenario for a user
   */
  private async executeScenario(
    userId: number,
    page: Page,
    scenario: LoadTestScenario,
    networkStats: any
  ): Promise<void> {
    for (const step of scenario.steps) {
      if (!this.isRunning) break
      
      const stepStart = Date.now()
      let success = true
      let error: string | undefined
      
      try {
        await this.executeStep(page, step)
      } catch (e) {
        success = false
        error = e instanceof Error ? e.message : 'Unknown error'
        console.error(`User ${userId} step failed:`, error)
      }
      
      const stepEnd = Date.now()
      const responseTime = stepEnd - stepStart
      
      // Check response time expectations
      if (step.expect_response_time && responseTime > step.expect_response_time) {
        success = false
        error = `Response time ${responseTime}ms exceeded expected ${step.expect_response_time}ms`
      }
      
      // Record result
      const result: LoadTestResult = {
        scenario: scenario.name,
        user_id: userId,
        step: step.action,
        start_time: stepStart,
        end_time: stepEnd,
        response_time: responseTime,
        success,
        error,
        memory_usage: await this.getMemoryUsage(page),
        network_data: { ...networkStats }
      }
      
      this.results.push(result)
      
      // Optional step delay
      if (step.duration) {
        await new Promise(resolve => setTimeout(resolve, step.duration))
      }
    }
  }

  /**
   * Execute individual step
   */
  private async executeStep(page: Page, step: LoadTestStep): Promise<void> {
    switch (step.action) {
      case 'navigate':
        if (!step.target) throw new Error('Navigate step requires target URL')
        await page.goto(step.target, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        })
        break
        
      case 'fill_form':
        if (!step.data) throw new Error('Fill form step requires data')
        
        // Fill various form fields based on data
        for (const [field, value] of Object.entries(step.data)) {
          const selector = `input[name="${field}"], textarea[name="${field}"], select[name="${field}"]`
          
          try {
            await page.waitForSelector(selector, { timeout: 5000 })
            await page.fill(selector, String(value))
            await page.waitForTimeout(50) // Small delay for natural input
          } catch (error) {
            console.warn(`Could not fill field ${field}:`, error)
          }
        }
        break
        
      case 'upload_file':
        const fileInput = page.locator('input[type="file"]').first()
        
        if (await fileInput.count() > 0) {
          // Create a test file blob
          const testFileContent = 'data:text/plain;base64,' + Buffer.from('Test file content').toString('base64')
          
          await fileInput.setInputFiles({
            name: 'test-document.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('Test file content for load testing')
          })
        }
        break
        
      case 'submit':
        const submitButton = page.locator('button[type="submit"], input[type="submit"]').first()
        
        if (await submitButton.count() > 0) {
          await submitButton.click()
          
          // Wait for response or navigation
          try {
            await page.waitForResponse(response => response.status() < 400, { timeout: 10000 })
          } catch (error) {
            // Continue even if no response captured
          }
        }
        break
        
      case 'wait':
        const waitTime = step.duration || 1000
        await page.waitForTimeout(waitTime)
        break
        
      default:
        throw new Error(`Unknown step action: ${step.action}`)
    }
  }

  /**
   * Get memory usage for a page
   */
  private async getMemoryUsage(page: Page): Promise<number> {
    try {
      return await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
    } catch {
      return 0
    }
  }

  /**
   * Calculate comprehensive metrics from test results
   */
  private calculateMetrics(): LoadTestMetrics {
    const successfulResults = this.results.filter(r => r.success)
    const failedResults = this.results.filter(r => !r.success)
    
    const responseTimes = successfulResults.map(r => r.response_time)
    responseTimes.sort((a, b) => a - b)
    
    const testDuration = Date.now() - this.startTime
    const testDurationSeconds = testDuration / 1000
    
    const p95Index = Math.floor(responseTimes.length * 0.95)
    const p99Index = Math.floor(responseTimes.length * 0.99)
    
    const totalDataTransferred = this.results.reduce((sum, r) => {
      return sum + (r.network_data?.total_size || 0)
    }, 0)
    
    const memoryUsages = this.results
      .map(r => r.memory_usage || 0)
      .filter(m => m > 0)
    
    const metrics: LoadTestMetrics = {
      total_requests: this.results.length,
      successful_requests: successfulResults.length,
      failed_requests: failedResults.length,
      average_response_time: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      min_response_time: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      max_response_time: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      percentile_95: responseTimes[p95Index] || 0,
      percentile_99: responseTimes[p99Index] || 0,
      requests_per_second: this.results.length / testDurationSeconds,
      errors_per_second: failedResults.length / testDurationSeconds,
      total_data_transferred: totalDataTransferred,
      memory_peak: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
      concurrent_users_peak: this.contexts.length,
      test_duration: testDurationSeconds,
      scenarios_completed: new Set(this.results.map(r => `${r.user_id}-${r.scenario}`)).size
    }
    
    return metrics
  }

  /**
   * Test API rate limiting under load
   */
  async testRateLimiting(): Promise<LoadTestResult[]> {
    console.log('Testing API rate limiting...')
    
    const context = this.contexts[0]
    if (!context) throw new Error('No context available for rate limiting test')
    
    const page = await context.newPage()
    const results: LoadTestResult[] = []
    
    // Send rapid requests to test rate limiting
    const requests = []
    const apiEndpoint = 'http://localhost:3000/api/kyc/submit'
    
    for (let i = 0; i < 100; i++) {
      requests.push(
        (async () => {
          const startTime = Date.now()
          
          try {
            const response = await page.request.post(apiEndpoint, {
              data: {
                test: true,
                iteration: i
              },
              timeout: 5000
            })
            
            const endTime = Date.now()
            
            results.push({
              scenario: 'Rate Limiting Test',
              user_id: 0,
              step: 'api_request',
              start_time: startTime,
              end_time: endTime,
              response_time: endTime - startTime,
              success: response.status() === 200 || response.status() === 429, // 429 is expected for rate limiting
              error: response.status() === 429 ? 'Rate limited (expected)' : undefined
            })
            
          } catch (error) {
            const endTime = Date.now()
            
            results.push({
              scenario: 'Rate Limiting Test',
              user_id: 0,
              step: 'api_request',
              start_time: startTime,
              end_time: endTime,
              response_time: endTime - startTime,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        })()
      )
    }
    
    await Promise.allSettled(requests)
    await page.close()
    
    return results
  }

  /**
   * Generate load test report
   */
  generateReport(metrics: LoadTestMetrics, rateLimitResults?: LoadTestResult[]): string {
    let report = '# KYC Load Test Report\n\n'
    report += `Generated: ${new Date().toISOString()}\n\n`
    
    report += '## Test Configuration\n\n'
    report += `- **Test Duration**: ${metrics.test_duration.toFixed(2)} seconds\n`
    report += `- **Concurrent Users**: ${metrics.concurrent_users_peak}\n`
    report += `- **Total Requests**: ${metrics.total_requests}\n`
    report += `- **Scenarios Completed**: ${metrics.scenarios_completed}\n\n`
    
    report += '## Performance Metrics\n\n'
    report += '| Metric | Value |\n'
    report += '|--------|-------|\n'
    report += `| Successful Requests | ${metrics.successful_requests} (${((metrics.successful_requests / metrics.total_requests) * 100).toFixed(2)}%) |\n`
    report += `| Failed Requests | ${metrics.failed_requests} (${((metrics.failed_requests / metrics.total_requests) * 100).toFixed(2)}%) |\n`
    report += `| Requests per Second | ${metrics.requests_per_second.toFixed(2)} RPS |\n`
    report += `| Errors per Second | ${metrics.errors_per_second.toFixed(2)} EPS |\n`
    report += `| Average Response Time | ${metrics.average_response_time.toFixed(2)} ms |\n`
    report += `| Min Response Time | ${metrics.min_response_time} ms |\n`
    report += `| Max Response Time | ${metrics.max_response_time} ms |\n`
    report += `| 95th Percentile | ${metrics.percentile_95} ms |\n`
    report += `| 99th Percentile | ${metrics.percentile_99} ms |\n`
    report += `| Peak Memory Usage | ${(metrics.memory_peak / 1024 / 1024).toFixed(2)} MB |\n`
    report += `| Total Data Transferred | ${(metrics.total_data_transferred / 1024 / 1024).toFixed(2)} MB |\n\n`
    
    // Analyze results by scenario
    const scenarioStats = new Map<string, { successful: number; failed: number; avgTime: number }>()
    
    this.results.forEach(result => {
      const stats = scenarioStats.get(result.scenario) || { successful: 0, failed: 0, avgTime: 0 }
      
      if (result.success) {
        stats.successful++
        stats.avgTime = (stats.avgTime * (stats.successful - 1) + result.response_time) / stats.successful
      } else {
        stats.failed++
      }
      
      scenarioStats.set(result.scenario, stats)
    })
    
    if (scenarioStats.size > 0) {
      report += '## Scenario Performance\n\n'
      report += '| Scenario | Successful | Failed | Avg Response Time (ms) |\n'
      report += '|----------|------------|--------|------------------------|\n'
      
      scenarioStats.forEach((stats, scenario) => {
        report += `| ${scenario} | ${stats.successful} | ${stats.failed} | ${stats.avgTime.toFixed(2)} |\n`
      })
      report += '\n'
    }
    
    // Rate limiting analysis
    if (rateLimitResults && rateLimitResults.length > 0) {
      const rateLimitedRequests = rateLimitResults.filter(r => r.error?.includes('Rate limited'))
      const successfulRequests = rateLimitResults.filter(r => r.success && !r.error)
      
      report += '## Rate Limiting Analysis\n\n'
      report += `- **Total Test Requests**: ${rateLimitResults.length}\n`
      report += `- **Rate Limited Requests**: ${rateLimitedRequests.length} (${((rateLimitedRequests.length / rateLimitResults.length) * 100).toFixed(2)}%)\n`
      report += `- **Successful Requests**: ${successfulRequests.length} (${((successfulRequests.length / rateLimitResults.length) * 100).toFixed(2)}%)\n`
      
      if (rateLimitedRequests.length > 0) {
        report += `- **Rate Limiting Working**: ✅ System properly rejected excess requests\n`
      } else {
        report += `- **Rate Limiting Status**: ⚠️ No rate limiting detected - verify configuration\n`
      }
      report += '\n'
    }
    
    // Performance evaluation
    report += '## Performance Evaluation\n\n'
    
    const issues: string[] = []
    const successes: string[] = []
    
    if (metrics.failed_requests / metrics.total_requests > 0.05) {
      issues.push(`High error rate: ${((metrics.failed_requests / metrics.total_requests) * 100).toFixed(2)}%`)
    } else {
      successes.push(`Low error rate: ${((metrics.failed_requests / metrics.total_requests) * 100).toFixed(2)}%`)
    }
    
    if (metrics.average_response_time > 2000) {
      issues.push(`High average response time: ${metrics.average_response_time.toFixed(2)}ms`)
    } else {
      successes.push(`Good average response time: ${metrics.average_response_time.toFixed(2)}ms`)
    }
    
    if (metrics.percentile_95 > 5000) {
      issues.push(`High 95th percentile response time: ${metrics.percentile_95}ms`)
    } else {
      successes.push(`Acceptable 95th percentile response time: ${metrics.percentile_95}ms`)
    }
    
    if (metrics.memory_peak > 100 * 1024 * 1024) { // 100MB
      issues.push(`High memory usage: ${(metrics.memory_peak / 1024 / 1024).toFixed(2)}MB`)
    } else {
      successes.push(`Reasonable memory usage: ${(metrics.memory_peak / 1024 / 1024).toFixed(2)}MB`)
    }
    
    if (successes.length > 0) {
      report += '### ✅ Performance Strengths\n\n'
      successes.forEach(success => {
        report += `- ${success}\n`
      })
      report += '\n'
    }
    
    if (issues.length > 0) {
      report += '### ⚠️ Performance Issues\n\n'
      issues.forEach(issue => {
        report += `- ${issue}\n`
      })
      report += '\n'
    }
    
    report += '## Recommendations\n\n'
    
    if (metrics.average_response_time > 1000) {
      report += '- **Optimize Response Times**: Consider caching, database indexing, or CDN implementation\n'
    }
    
    if (metrics.failed_requests > 0) {
      report += '- **Investigate Failures**: Review error logs and implement better error handling\n'
    }
    
    if (metrics.memory_peak > 50 * 1024 * 1024) {
      report += '- **Memory Optimization**: Implement better memory management and garbage collection\n'
    }
    
    report += '- **Horizontal Scaling**: Consider load balancing for higher concurrent user support\n'
    report += '- **Connection Pooling**: Optimize database connections for better resource utilization\n'
    report += '- **API Rate Limiting**: Ensure proper rate limiting is in place to prevent abuse\n'
    report += '- **Monitoring**: Implement real-time performance monitoring in production\n'
    
    return report
  }

  async cleanup() {
    console.log('Cleaning up load test resources...')
    this.isRunning = false
    
    for (const context of this.contexts) {
      try {
        await context.close()
      } catch (error) {
        console.error('Error closing context:', error)
      }
    }
    
    for (const browser of this.browsers) {
      try {
        await browser.close()
      } catch (error) {
        console.error('Error closing browser:', error)
      }
    }
    
    this.browsers = []
    this.contexts = []
  }
}

// Test scenarios for KYC system
const KYC_LOAD_TEST_SCENARIOS: LoadTestScenario[] = [
  {
    name: 'Complete KYC Registration',
    weight: 40, // 40% of traffic
    steps: [
      { action: 'navigate', target: 'http://localhost:3000/kyc', expect_response_time: 2000 },
      { action: 'wait', duration: 1000 },
      { action: 'navigate', target: 'http://localhost:3000/kyc/personal', expect_response_time: 2000 },
      { 
        action: 'fill_form', 
        data: {
          firstName: 'Load',
          lastName: 'Test',
          email: 'loadtest@example.com',
          phoneNumber: '555-0123',
          dateOfBirth: '1990-01-01',
          address: '123 Test St'
        },
        expect_response_time: 500
      },
      { action: 'submit', expect_response_time: 3000 },
      { action: 'navigate', target: 'http://localhost:3000/kyc/documents', expect_response_time: 2000 },
      { action: 'upload_file', expect_response_time: 5000 },
      { action: 'submit', expect_response_time: 8000 }
    ]
  },
  {
    name: 'KYC Status Check',
    weight: 30, // 30% of traffic
    steps: [
      { action: 'navigate', target: 'http://localhost:3000/kyc/status', expect_response_time: 2000 },
      { action: 'wait', duration: 2000 }
    ]
  },
  {
    name: 'Document Upload Only',
    weight: 20, // 20% of traffic
    steps: [
      { action: 'navigate', target: 'http://localhost:3000/kyc/documents', expect_response_time: 2000 },
      { action: 'upload_file', expect_response_time: 5000 },
      { action: 'submit', expect_response_time: 8000 }
    ]
  },
  {
    name: 'Admin Queue Access',
    weight: 10, // 10% of traffic
    steps: [
      { action: 'navigate', target: 'http://localhost:3000/admin/kyc', expect_response_time: 3000 },
      { action: 'wait', duration: 3000 }
    ]
  }
]

// Test configurations
const LOAD_TEST_CONFIGS = {
  light: {
    concurrent_users: 10,
    ramp_up_time: 30,
    test_duration: 120,
    target_rps: 5,
    scenarios: KYC_LOAD_TEST_SCENARIOS
  },
  moderate: {
    concurrent_users: 50,
    ramp_up_time: 60,
    test_duration: 300,
    target_rps: 25,
    scenarios: KYC_LOAD_TEST_SCENARIOS
  },
  heavy: {
    concurrent_users: 100,
    ramp_up_time: 120,
    test_duration: 600,
    target_rps: 50,
    scenarios: KYC_LOAD_TEST_SCENARIOS
  }
}

// Test suite
test.describe('KYC Load Tests', () => {
  let loadTester: KYCLoadTester

  test.beforeAll(async () => {
    loadTester = new KYCLoadTester()
  })

  test.afterAll(async () => {
    await loadTester.cleanup()
  })

  test('should handle light load (10 concurrent users)', async () => {
    const metrics = await loadTester.runLoadTest(LOAD_TEST_CONFIGS.light)
    
    expect(metrics.total_requests).toBeGreaterThan(0)
    expect(metrics.failed_requests / metrics.total_requests).toBeLessThan(0.05) // < 5% error rate
    expect(metrics.average_response_time).toBeLessThan(3000) // < 3s average
    expect(metrics.percentile_95).toBeLessThan(5000) // < 5s 95th percentile
    
    const report = loadTester.generateReport(metrics)
    require('fs').writeFileSync('./kyc-load-test-light.md', report)
    
    console.log('Light load test completed successfully')
  })

  test('should handle moderate load (50 concurrent users)', async () => {
    const metrics = await loadTester.runLoadTest(LOAD_TEST_CONFIGS.moderate)
    
    expect(metrics.total_requests).toBeGreaterThan(0)
    expect(metrics.failed_requests / metrics.total_requests).toBeLessThan(0.10) // < 10% error rate
    expect(metrics.average_response_time).toBeLessThan(5000) // < 5s average
    
    const report = loadTester.generateReport(metrics)
    require('fs').writeFileSync('./kyc-load-test-moderate.md', report)
    
    console.log('Moderate load test completed successfully')
  })

  test('should test API rate limiting', async () => {
    const rateLimitResults = await loadTester.testRateLimiting()
    
    expect(rateLimitResults.length).toBe(100)
    
    // Should have some rate limited requests if rate limiting is working
    const rateLimitedCount = rateLimitResults.filter(r => 
      r.error?.includes('Rate limited') || r.error?.includes('429')
    ).length
    
    // Log results for analysis
    console.log(`Rate limiting test: ${rateLimitedCount} requests were rate limited`)
    
    const report = loadTester.generateReport({
      total_requests: rateLimitResults.length,
      successful_requests: rateLimitResults.filter(r => r.success).length,
      failed_requests: rateLimitResults.filter(r => !r.success).length,
      average_response_time: 0,
      min_response_time: 0,
      max_response_time: 0,
      percentile_95: 0,
      percentile_99: 0,
      requests_per_second: 0,
      errors_per_second: 0,
      total_data_transferred: 0,
      memory_peak: 0,
      concurrent_users_peak: 1,
      test_duration: 0,
      scenarios_completed: 0
    }, rateLimitResults)
    
    require('fs').writeFileSync('./kyc-rate-limit-test.md', report)
  })

  // Stress test - only run manually or in specific CI environments
  test.skip('should handle heavy load (100 concurrent users)', async () => {
    const metrics = await loadTester.runLoadTest(LOAD_TEST_CONFIGS.heavy)
    
    expect(metrics.total_requests).toBeGreaterThan(0)
    // More lenient thresholds for stress test
    expect(metrics.failed_requests / metrics.total_requests).toBeLessThan(0.20) // < 20% error rate
    
    const report = loadTester.generateReport(metrics)
    require('fs').writeFileSync('./kyc-load-test-heavy.md', report)
    
    console.log('Heavy load test completed')
  })
})

export { 
  KYCLoadTester, 
  LoadTestConfig, 
  LoadTestScenario, 
  LoadTestStep, 
  LoadTestResult, 
  LoadTestMetrics,
  KYC_LOAD_TEST_SCENARIOS,
  LOAD_TEST_CONFIGS 
}