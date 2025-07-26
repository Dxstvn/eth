/**
 * KYC Page Load Performance Tests
 * Measures page load times for all KYC pages
 */

import { test, expect, chromium, Browser, Page } from '@playwright/test'
import { performance } from 'perf_hooks'

interface PageLoadMetrics {
  pageName: string
  loadTime: number
  domContentLoadedTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  totalBlockingTime: number
  networkRequests: number
  totalTransferSize: number
  jsExecutionTime: number
  memoryUsage: number
}

class KYCPerformanceTester {
  private browser: Browser
  private page: Page
  private metrics: PageLoadMetrics[] = []

  async initialize() {
    this.browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    })
    
    this.page = await context.newPage()
    
    // Enable performance tracking
    await this.page.addInitScript(() => {
      window.performanceMetrics = {
        networkRequests: 0,
        totalTransferSize: 0,
        jsExecutionTime: 0
      }
    })
  }

  async measurePageLoad(url: string, pageName: string): Promise<PageLoadMetrics> {
    const startTime = performance.now()
    
    // Track network requests
    const requests: any[] = []
    this.page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      })
    })

    const responses: any[] = []
    this.page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        transferSize: response.headers()['content-length'] || 0,
        timestamp: Date.now()
      })
    })

    // Navigate to page
    await this.page.goto(url, { waitUntil: 'networkidle' })
    
    const loadTime = performance.now() - startTime

    // Get Web Vitals metrics
    const webVitals = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics = {
          fcp: 0,
          lcp: 0,
          cls: 0,
          tbt: 0
        }

        // First Contentful Paint
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry
        if (fcpEntry) {
          metrics.fcp = fcpEntry.startTime
        }

        // Largest Contentful Paint
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          if (lastEntry) {
            metrics.lcp = lastEntry.startTime
          }
        })
        observer.observe({ entryTypes: ['largest-contentful-paint'] })

        // Cumulative Layout Shift
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          metrics.cls = clsValue
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // Total Blocking Time calculation
        const longTasks = performance.getEntriesByType('longtask')
        metrics.tbt = longTasks.reduce((total, task) => {
          return total + Math.max(0, task.duration - 50)
        }, 0)

        setTimeout(() => resolve(metrics), 2000)
      })
    }) as any

    // Get DOM Content Loaded time
    const domContentLoadedTime = await this.page.evaluate(() => {
      return performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
    })

    // Get memory usage
    const memoryUsage = await this.page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0
    })

    // Calculate total transfer size
    const totalTransferSize = responses.reduce((total, response) => {
      return total + parseInt(response.transferSize || '0')
    }, 0)

    const metrics: PageLoadMetrics = {
      pageName,
      loadTime,
      domContentLoadedTime,
      firstContentfulPaint: webVitals.fcp,
      largestContentfulPaint: webVitals.lcp,
      cumulativeLayoutShift: webVitals.cls,
      totalBlockingTime: webVitals.tbt,
      networkRequests: requests.length,
      totalTransferSize,
      jsExecutionTime: await this.getJSExecutionTime(),
      memoryUsage
    }

    this.metrics.push(metrics)
    return metrics
  }

  private async getJSExecutionTime(): Promise<number> {
    return await this.page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (entries.length > 0) {
        const navTiming = entries[0]
        return navTiming.loadEventEnd - navTiming.loadEventStart
      }
      return 0
    })
  }

  async measureAllPages(): Promise<PageLoadMetrics[]> {
    const pages = [
      { url: 'http://localhost:3000/kyc', name: 'KYC Landing Page' },
      { url: 'http://localhost:3000/kyc/personal', name: 'Personal Information Step' },
      { url: 'http://localhost:3000/kyc/documents', name: 'Document Upload Step' },
      { url: 'http://localhost:3000/kyc/risk-assessment', name: 'Risk Assessment Step' },
      { url: 'http://localhost:3000/kyc/verification', name: 'Identity Verification Step' },
      { url: 'http://localhost:3000/kyc/status', name: 'KYC Status Page' },
      { url: 'http://localhost:3000/kyc/review', name: 'Review Summary Page' },
      { url: 'http://localhost:3000/admin/kyc', name: 'Admin KYC Queue' }
    ]

    for (const page of pages) {
      try {
        await this.measurePageLoad(page.url, page.name)
        // Wait between measurements
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Failed to measure ${page.name}:`, error)
      }
    }

    return this.metrics
  }

  generateReport(): string {
    let report = '# KYC Page Load Performance Report\n\n'
    report += `Generated: ${new Date().toISOString()}\n\n`
    
    report += '## Performance Benchmarks\n\n'
    report += '| Page | Load Time (ms) | DOM Content Loaded (ms) | FCP (ms) | LCP (ms) | CLS | TBT (ms) | Requests | Transfer Size (KB) | Memory (MB) |\n'
    report += '|------|----------------|-------------------------|----------|----------|-----|----------|----------|-------------------|-------------|\n'
    
    this.metrics.forEach(metric => {
      report += `| ${metric.pageName} | ${metric.loadTime.toFixed(2)} | ${metric.domContentLoadedTime} | ${metric.firstContentfulPaint.toFixed(2)} | ${metric.largestContentfulPaint.toFixed(2)} | ${metric.cumulativeLayoutShift.toFixed(4)} | ${metric.totalBlockingTime.toFixed(2)} | ${metric.networkRequests} | ${(metric.totalTransferSize / 1024).toFixed(2)} | ${(metric.memoryUsage / 1024 / 1024).toFixed(2)} |\n`
    })

    report += '\n## Performance Thresholds\n\n'
    report += '- **Good Load Time**: < 2000ms\n'
    report += '- **Good FCP**: < 1800ms\n'
    report += '- **Good LCP**: < 2500ms\n'
    report += '- **Good CLS**: < 0.1\n'
    report += '- **Good TBT**: < 200ms\n\n'

    // Add analysis
    report += '## Analysis\n\n'
    const avgLoadTime = this.metrics.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.length
    const slowPages = this.metrics.filter(m => m.loadTime > 2000)
    const highCLSPages = this.metrics.filter(m => m.cumulativeLayoutShift > 0.1)

    report += `- **Average Load Time**: ${avgLoadTime.toFixed(2)}ms\n`
    report += `- **Slow Pages (>2s)**: ${slowPages.length} pages\n`
    report += `- **High CLS Pages (>0.1)**: ${highCLSPages.length} pages\n`

    if (slowPages.length > 0) {
      report += '\n### Slow Loading Pages:\n'
      slowPages.forEach(page => {
        report += `- ${page.pageName}: ${page.loadTime.toFixed(2)}ms\n`
      })
    }

    return report
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }
}

// Test suite
test.describe('KYC Page Load Performance', () => {
  let performanceTester: KYCPerformanceTester

  test.beforeAll(async () => {
    performanceTester = new KYCPerformanceTester()
    await performanceTester.initialize()
  })

  test.afterAll(async () => {
    await performanceTester.cleanup()
  })

  test('should measure load times for all KYC pages', async () => {
    const metrics = await performanceTester.measureAllPages()
    
    expect(metrics).toHaveLength(8)
    
    // Assert performance thresholds
    const criticalPages = ['KYC Landing Page', 'Personal Information Step', 'Document Upload Step']
    
    criticalPages.forEach(pageName => {
      const pageMetric = metrics.find(m => m.pageName === pageName)
      if (pageMetric) {
        expect(pageMetric.loadTime).toBeLessThan(3000) // 3s max for critical pages
        expect(pageMetric.firstContentfulPaint).toBeLessThan(2000) // 2s FCP
        expect(pageMetric.cumulativeLayoutShift).toBeLessThan(0.15) // Acceptable CLS
      }
    })

    // Generate report
    const report = performanceTester.generateReport()
    console.log(report)
    
    // Save report to file
    require('fs').writeFileSync('./kyc-page-load-report.md', report)
  })

  test('should measure mobile performance', async () => {
    // Re-initialize with mobile viewport
    await performanceTester.cleanup()
    
    const browser = await chromium.launch()
    const context = await browser.newContext({
      ...chromium.devices['iPhone 12'],
      // Simulate slower network
      networkConditions: {
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 kbps
        latency: 40 // 40ms RTT
      }
    })
    
    const page = await context.newPage()
    
    const startTime = performance.now()
    await page.goto('http://localhost:3000/kyc', { waitUntil: 'networkidle' })
    const mobileLoadTime = performance.now() - startTime
    
    // Mobile should load within 5s on slow 3G
    expect(mobileLoadTime).toBeLessThan(5000)
    
    await browser.close()
  })
})

export { KYCPerformanceTester, PageLoadMetrics }