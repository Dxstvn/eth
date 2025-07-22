/**
 * Performance testing utilities for validating optimizations
 */

import { performanceMonitor } from './performance-monitor'
import { cacheService } from './cache-service'

interface PerformanceTestResult {
  testName: string
  passed: boolean
  value: number
  threshold: number
  message: string
}

class PerformanceTest {
  private results: PerformanceTestResult[] = []

  /**
   * Test page load performance
   */
  async testPageLoad(): Promise<PerformanceTestResult> {
    const metrics = performanceMonitor.getPageLoadMetrics()
    const loadTime = metrics?.loadTime || 0
    const threshold = 3000 // 3 seconds

    const result: PerformanceTestResult = {
      testName: 'Page Load Time',
      passed: loadTime <= threshold,
      value: loadTime,
      threshold,
      message: `Page loaded in ${loadTime.toFixed(2)}ms (threshold: ${threshold}ms)`
    }

    this.results.push(result)
    return result
  }

  /**
   * Test First Contentful Paint
   */
  async testFirstContentfulPaint(): Promise<PerformanceTestResult> {
    const metrics = performanceMonitor.getPageLoadMetrics()
    const fcp = metrics?.firstContentfulPaint || 0
    const threshold = 1500 // 1.5 seconds

    const result: PerformanceTestResult = {
      testName: 'First Contentful Paint',
      passed: fcp <= threshold && fcp > 0,
      value: fcp,
      threshold,
      message: `FCP: ${fcp.toFixed(2)}ms (threshold: ${threshold}ms)`
    }

    this.results.push(result)
    return result
  }

  /**
   * Test Largest Contentful Paint
   */
  async testLargestContentfulPaint(): Promise<PerformanceTestResult> {
    const metrics = performanceMonitor.getPageLoadMetrics()
    const lcp = metrics?.largestContentfulPaint || 0
    const threshold = 2500 // 2.5 seconds

    const result: PerformanceTestResult = {
      testName: 'Largest Contentful Paint',
      passed: lcp <= threshold && lcp > 0,
      value: lcp,
      threshold,
      message: `LCP: ${lcp.toFixed(2)}ms (threshold: ${threshold}ms)`
    }

    this.results.push(result)
    return result
  }

  /**
   * Test cache performance
   */
  async testCachePerformance(): Promise<PerformanceTestResult> {
    const stats = cacheService.getStats()
    const memoryUtilization = stats.memory.utilization
    const threshold = 80 // 80% utilization

    const result: PerformanceTestResult = {
      testName: 'Cache Utilization',
      passed: memoryUtilization <= threshold,
      value: memoryUtilization,
      threshold,
      message: `Cache utilization: ${memoryUtilization.toFixed(1)}% (threshold: ${threshold}%)`
    }

    this.results.push(result)
    return result
  }

  /**
   * Test bundle size (estimated based on loaded scripts)
   */
  async testBundleSize(): Promise<PerformanceTestResult> {
    if (typeof window === 'undefined') {
      return {
        testName: 'Bundle Size',
        passed: true,
        value: 0,
        threshold: 0,
        message: 'Cannot test bundle size on server'
      }
    }

    const scripts = Array.from(document.querySelectorAll('script[src]'))
    const scriptCount = scripts.length
    const threshold = 10 // Max 10 script files

    const result: PerformanceTestResult = {
      testName: 'Bundle Size (Script Count)',
      passed: scriptCount <= threshold,
      value: scriptCount,
      threshold,
      message: `${scriptCount} script files loaded (threshold: ${threshold})`
    }

    this.results.push(result)
    return result
  }

  /**
   * Test resource loading efficiency
   */
  async testResourceLoading(): Promise<PerformanceTestResult> {
    const resourceMetrics = performanceMonitor.getResourceMetrics()
    const avgLoadTime = resourceMetrics.length > 0 
      ? resourceMetrics.reduce((sum, r) => sum + r.duration, 0) / resourceMetrics.length 
      : 0
    const threshold = 500 // 500ms average

    const result: PerformanceTestResult = {
      testName: 'Average Resource Load Time',
      passed: avgLoadTime <= threshold,
      value: avgLoadTime,
      threshold,
      message: `Average resource load time: ${avgLoadTime.toFixed(2)}ms (threshold: ${threshold}ms)`
    }

    this.results.push(result)
    return result
  }

  /**
   * Test component render performance
   */
  async testComponentRenderTime(): Promise<PerformanceTestResult> {
    const metrics = performanceMonitor.getMetrics()
    const componentMetrics = metrics.filter(m => m.context?.type === 'component')
    
    if (componentMetrics.length === 0) {
      return {
        testName: 'Component Render Time',
        passed: true,
        value: 0,
        threshold: 100,
        message: 'No component metrics available'
      }
    }

    const avgRenderTime = componentMetrics.reduce((sum, m) => sum + m.value, 0) / componentMetrics.length
    const threshold = 100 // 100ms average

    const result: PerformanceTestResult = {
      testName: 'Average Component Render Time',
      passed: avgRenderTime <= threshold,
      value: avgRenderTime,
      threshold,
      message: `Average component render: ${avgRenderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
    }

    this.results.push(result)
    return result
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<PerformanceTestResult[]> {
    console.group('🚀 Performance Tests')
    
    const tests = [
      this.testPageLoad(),
      this.testFirstContentfulPaint(),
      this.testLargestContentfulPaint(),
      this.testCachePerformance(),
      this.testBundleSize(),
      this.testResourceLoading(),
      this.testComponentRenderTime()
    ]

    const results = await Promise.all(tests)
    
    // Log results
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${result.testName}: ${result.message}`)
    })

    const passed = results.filter(r => r.passed).length
    const total = results.length
    const score = (passed / total) * 100

    console.log(`\n📊 Performance Score: ${score.toFixed(1)}% (${passed}/${total} tests passed)`)
    console.groupEnd()

    return results
  }

  /**
   * Get test results
   */
  getResults(): PerformanceTestResult[] {
    return [...this.results]
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = []
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const results = this.getResults()
    const passed = results.filter(r => r.passed).length
    const total = results.length
    const score = total > 0 ? (passed / total) * 100 : 0

    let report = `# ClearHold Performance Report\n\n`
    report += `**Overall Score: ${score.toFixed(1)}%** (${passed}/${total} tests passed)\n\n`
    report += `Generated: ${new Date().toISOString()}\n\n`
    report += `## Test Results\n\n`

    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'
      report += `### ${result.testName}\n`
      report += `- **Status:** ${status}\n`
      report += `- **Value:** ${result.value.toFixed(2)}${result.testName.includes('Time') ? 'ms' : ''}\n`
      report += `- **Threshold:** ${result.threshold}${result.testName.includes('Time') ? 'ms' : ''}\n`
      report += `- **Message:** ${result.message}\n\n`
    })

    report += `## Recommendations\n\n`
    
    const failedTests = results.filter(r => !r.passed)
    if (failedTests.length === 0) {
      report += `All performance tests passed! 🎉\n\n`
    } else {
      failedTests.forEach(test => {
        report += `- **${test.testName}:** ${this.getRecommendation(test)}\n`
      })
    }

    return report
  }

  private getRecommendation(test: PerformanceTestResult): string {
    switch (test.testName) {
      case 'Page Load Time':
        return 'Optimize bundle size, enable code splitting, and improve server response times.'
      case 'First Contentful Paint':
        return 'Optimize critical rendering path, inline critical CSS, and preload key resources.'
      case 'Largest Contentful Paint':
        return 'Optimize images, remove render-blocking resources, and improve server response times.'
      case 'Cache Utilization':
        return 'Increase cache limits or implement more aggressive cache eviction policies.'
      case 'Bundle Size (Script Count)':
        return 'Implement more aggressive code splitting and remove unused dependencies.'
      case 'Average Resource Load Time':
        return 'Optimize resource sizes, enable compression, and use CDN for static assets.'
      case 'Average Component Render Time':
        return 'Optimize component logic, implement React.memo, and reduce unnecessary re-renders.'
      default:
        return 'Review and optimize this metric according to best practices.'
    }
  }
}

// Export singleton instance
export const performanceTest = new PerformanceTest()

// Utility function to run tests in development
export async function runPerformanceTests() {
  if (process.env.NODE_ENV === 'development') {
    // Wait for page to be fully loaded
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true })
      })
    }

    // Wait a bit more for metrics to be collected
    setTimeout(async () => {
      await performanceTest.runAllTests()
    }, 2000)
  }
}

// Auto-run tests in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  runPerformanceTests()
}