/**
 * KYC File Upload Performance Tests
 * Benchmarks file upload speeds for various file sizes and types
 */

import { test, expect, chromium, Browser, Page } from '@playwright/test'
import { createReadStream, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { performance } from 'perf_hooks'

interface FileUploadMetrics {
  fileName: string
  fileSize: number // bytes
  uploadTime: number // ms
  throughput: number // bytes/ms
  encryptionTime: number // ms
  processingTime: number // ms
  memoryPeakUsage: number // bytes
  networkRequests: number
  errorRate: number
}

interface LoadTestResults {
  concurrentUploads: number
  successfulUploads: number
  failedUploads: number
  averageUploadTime: number
  throughput: number
  serverResponseTimes: number[]
  errorMessages: string[]
}

class FileUploadPerformanceTester {
  private browser: Browser
  private page: Page
  private testFiles: { name: string, size: number, path: string }[] = []

  async initialize() {
    this.browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    })
    
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      permissions: ['camera', 'microphone']
    })
    
    this.page = await context.newPage()
    
    // Create test files
    await this.createTestFiles()
    
    // Navigate to upload page
    await this.page.goto('http://localhost:3000/kyc/documents')
  }

  private async createTestFiles() {
    const sizes = [
      { name: 'small-image.jpg', size: 100 * 1024 }, // 100KB
      { name: 'medium-image.jpg', size: 1024 * 1024 }, // 1MB
      { name: 'large-image.jpg', size: 5 * 1024 * 1024 }, // 5MB
      { name: 'max-size-image.jpg', size: 10 * 1024 * 1024 }, // 10MB
      { name: 'small-pdf.pdf', size: 500 * 1024 }, // 500KB
      { name: 'large-pdf.pdf', size: 8 * 1024 * 1024 } // 8MB
    ]

    for (const file of sizes) {
      const filePath = join(__dirname, 'temp', file.name)
      const buffer = Buffer.alloc(file.size, 'A') // Fill with 'A' characters
      
      // Add proper file headers for images
      if (file.name.includes('.jpg')) {
        // Minimal JPEG header
        const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])
        buffer.set(jpegHeader, 0)
        buffer.set(Buffer.from([0xFF, 0xD9]), buffer.length - 2) // JPEG end marker
      }
      
      writeFileSync(filePath, buffer)
      this.testFiles.push({
        name: file.name,
        size: file.size,
        path: filePath
      })
    }
  }

  async measureSingleFileUpload(filePath: string, fileName: string): Promise<FileUploadMetrics> {
    const fileSize = require('fs').statSync(filePath).size
    
    // Monitor memory usage
    let peakMemoryUsage = 0
    const memoryInterval = setInterval(async () => {
      const memoryUsage = await this.page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0
      })
      peakMemoryUsage = Math.max(peakMemoryUsage, memoryUsage)
    }, 100)

    // Track network requests
    const networkRequests: any[] = []
    this.page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        })
      }
    })

    const startTime = performance.now()
    let encryptionStartTime = 0
    let encryptionEndTime = 0
    let processingStartTime = 0
    let processingEndTime = 0

    try {
      // Set up file input
      const fileInput = await this.page.locator('input[type="file"]').first()
      
      // Monitor for encryption/processing phases
      await this.page.exposeFunction('onEncryptionStart', () => {
        encryptionStartTime = performance.now()
      })
      
      await this.page.exposeFunction('onEncryptionEnd', () => {
        encryptionEndTime = performance.now()
      })
      
      await this.page.exposeFunction('onProcessingStart', () => {
        processingStartTime = performance.now()
      })
      
      await this.page.exposeFunction('onProcessingEnd', () => {
        processingEndTime = performance.now()
      })

      // Upload file
      await fileInput.setInputFiles(filePath)
      
      // Wait for upload completion
      await this.page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 })
      
      const endTime = performance.now()
      const totalUploadTime = endTime - startTime

      clearInterval(memoryInterval)

      return {
        fileName,
        fileSize,
        uploadTime: totalUploadTime,
        throughput: fileSize / totalUploadTime,
        encryptionTime: encryptionEndTime - encryptionStartTime,
        processingTime: processingEndTime - processingStartTime,
        memoryPeakUsage: peakMemoryUsage,
        networkRequests: networkRequests.length,
        errorRate: 0
      }

    } catch (error) {
      clearInterval(memoryInterval)
      
      return {
        fileName,
        fileSize,
        uploadTime: 0,
        throughput: 0,
        encryptionTime: 0,
        processingTime: 0,
        memoryPeakUsage: peakMemoryUsage,
        networkRequests: networkRequests.length,
        errorRate: 1
      }
    }
  }

  async runLoadTest(concurrentUploads: number = 5): Promise<LoadTestResults> {
    const results: LoadTestResults = {
      concurrentUploads,
      successfulUploads: 0,
      failedUploads: 0,
      averageUploadTime: 0,
      throughput: 0,
      serverResponseTimes: [],
      errorMessages: []
    }

    // Monitor server response times
    this.page.on('response', response => {
      if (response.url().includes('/api/kyc/upload')) {
        const responseTime = Date.now() - (response.request() as any).timestamp
        results.serverResponseTimes.push(responseTime)
      }
    })

    const uploadPromises: Promise<FileUploadMetrics>[] = []
    
    // Create concurrent upload tasks
    for (let i = 0; i < concurrentUploads; i++) {
      const testFile = this.testFiles[i % this.testFiles.length]
      uploadPromises.push(this.measureSingleFileUpload(testFile.path, `concurrent-${i}-${testFile.name}`))
    }

    // Execute all uploads concurrently
    const uploadResults = await Promise.allSettled(uploadPromises)
    
    let totalUploadTime = 0
    let totalThroughput = 0

    uploadResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const metrics = result.value
        if (metrics.errorRate === 0) {
          results.successfulUploads++
          totalUploadTime += metrics.uploadTime
          totalThroughput += metrics.throughput
        } else {
          results.failedUploads++
          results.errorMessages.push(`Upload ${index} failed`)
        }
      } else {
        results.failedUploads++
        results.errorMessages.push(`Upload ${index} rejected: ${result.reason}`)
      }
    })

    if (results.successfulUploads > 0) {
      results.averageUploadTime = totalUploadTime / results.successfulUploads
      results.throughput = totalThroughput / results.successfulUploads
    }

    return results
  }

  async testNetworkConditions() {
    const networkConditions = [
      { name: 'Fast 3G', download: 1.5 * 1024 * 1024 / 8, upload: 750 * 1024 / 8, latency: 40 },
      { name: 'Slow 3G', download: 400 * 1024 / 8, upload: 400 * 1024 / 8, latency: 400 },
      { name: 'WiFi', download: 30 * 1024 * 1024 / 8, upload: 15 * 1024 * 1024 / 8, latency: 2 }
    ]

    const results = []

    for (const condition of networkConditions) {
      // Create new context with network throttling
      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 }
      })

      const page = await context.newPage()
      
      // Throttle network
      const client = await page.context().newCDPSession(page)
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: condition.download,
        uploadThroughput: condition.upload,
        latency: condition.latency
      })

      await page.goto('http://localhost:3000/kyc/documents')

      // Test upload with medium file
      const mediumFile = this.testFiles.find(f => f.name.includes('medium'))
      if (mediumFile) {
        const startTime = performance.now()
        
        try {
          const fileInput = await page.locator('input[type="file"]').first()
          await fileInput.setInputFiles(mediumFile.path)
          await page.waitForSelector('[data-testid="upload-success"]', { timeout: 60000 })
          
          const endTime = performance.now()
          
          results.push({
            networkCondition: condition.name,
            uploadTime: endTime - startTime,
            fileSize: mediumFile.size,
            success: true
          })
        } catch (error) {
          results.push({
            networkCondition: condition.name,
            uploadTime: 0,
            fileSize: mediumFile.size,
            success: false,
            error: error.message
          })
        }
      }

      await context.close()
    }

    return results
  }

  generateReport(metrics: FileUploadMetrics[], loadTestResults: LoadTestResults[], networkResults: any[]): string {
    let report = '# KYC File Upload Performance Report\n\n'
    report += `Generated: ${new Date().toISOString()}\n\n`

    // Single file upload metrics
    report += '## Single File Upload Performance\n\n'
    report += '| File Name | Size (MB) | Upload Time (ms) | Throughput (KB/s) | Encryption Time (ms) | Processing Time (ms) | Peak Memory (MB) | Network Requests | Error Rate |\n'
    report += '|-----------|-----------|------------------|-------------------|---------------------|---------------------|-----------------|------------------|------------|\n'
    
    metrics.forEach(metric => {
      const sizeMB = (metric.fileSize / 1024 / 1024).toFixed(2)
      const throughputKBs = (metric.throughput * 1000 / 1024).toFixed(2)
      const memoryMB = (metric.memoryPeakUsage / 1024 / 1024).toFixed(2)
      
      report += `| ${metric.fileName} | ${sizeMB} | ${metric.uploadTime.toFixed(2)} | ${throughputKBs} | ${metric.encryptionTime.toFixed(2)} | ${metric.processingTime.toFixed(2)} | ${memoryMB} | ${metric.networkRequests} | ${(metric.errorRate * 100).toFixed(1)}% |\n`
    })

    // Load test results
    report += '\n## Concurrent Upload Load Test Results\n\n'
    loadTestResults.forEach((result, index) => {
      report += `### ${result.concurrentUploads} Concurrent Uploads\n`
      report += `- **Successful Uploads**: ${result.successfulUploads}\n`
      report += `- **Failed Uploads**: ${result.failedUploads}\n`
      report += `- **Success Rate**: ${((result.successfulUploads / result.concurrentUploads) * 100).toFixed(1)}%\n`
      report += `- **Average Upload Time**: ${result.averageUploadTime.toFixed(2)}ms\n`
      report += `- **Average Throughput**: ${(result.throughput * 1000 / 1024).toFixed(2)} KB/s\n`
      
      if (result.serverResponseTimes.length > 0) {
        const avgResponseTime = result.serverResponseTimes.reduce((a, b) => a + b, 0) / result.serverResponseTimes.length
        report += `- **Average Server Response Time**: ${avgResponseTime.toFixed(2)}ms\n`
      }
      
      if (result.errorMessages.length > 0) {
        report += '- **Errors**:\n'
        result.errorMessages.forEach(error => {
          report += `  - ${error}\n`
        })
      }
      report += '\n'
    })

    // Network conditions test
    report += '## Network Conditions Performance\n\n'
    report += '| Network Type | Upload Time (ms) | File Size (MB) | Effective Speed (KB/s) | Success |\n'
    report += '|--------------|------------------|----------------|------------------------|----------|\n'
    
    networkResults.forEach(result => {
      const sizeMB = (result.fileSize / 1024 / 1024).toFixed(2)
      const speedKBs = result.success ? ((result.fileSize / 1024) / (result.uploadTime / 1000)).toFixed(2) : 'N/A'
      const success = result.success ? '✅' : '❌'
      
      report += `| ${result.networkCondition} | ${result.uploadTime.toFixed(2)} | ${sizeMB} | ${speedKBs} | ${success} |\n`
    })

    // Performance analysis
    report += '\n## Performance Analysis\n\n'
    
    const avgUploadTime = metrics.reduce((sum, m) => sum + m.uploadTime, 0) / metrics.length
    const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length
    const avgEncryptionTime = metrics.reduce((sum, m) => sum + m.encryptionTime, 0) / metrics.length
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorRate, 0)

    report += `- **Average Upload Time**: ${avgUploadTime.toFixed(2)}ms\n`
    report += `- **Average Throughput**: ${(avgThroughput * 1000 / 1024).toFixed(2)} KB/s\n`
    report += `- **Average Encryption Time**: ${avgEncryptionTime.toFixed(2)}ms\n`
    report += `- **Overall Error Rate**: ${((totalErrors / metrics.length) * 100).toFixed(1)}%\n\n`

    // Recommendations
    report += '## Performance Recommendations\n\n'
    
    if (avgUploadTime > 5000) {
      report += '- ⚠️ **High upload times detected** - Consider implementing chunked uploads for large files\n'
    }
    
    if (avgEncryptionTime > 2000) {
      report += '- ⚠️ **High encryption times** - Consider using Web Workers for encryption to avoid blocking UI\n'
    }
    
    if (totalErrors > 0) {
      report += '- ⚠️ **Upload failures detected** - Review error handling and retry mechanisms\n'
    }
    
    const maxMemoryUsage = Math.max(...metrics.map(m => m.memoryPeakUsage)) / 1024 / 1024
    if (maxMemoryUsage > 100) {
      report += `- ⚠️ **High memory usage** (${maxMemoryUsage.toFixed(2)}MB peak) - Implement streaming for large files\n`
    }

    report += '\n## Performance Thresholds\n\n'
    report += '- **Acceptable Upload Time**: < 3000ms for files under 5MB\n'
    report += '- **Good Throughput**: > 500 KB/s on good network\n'
    report += '- **Acceptable Encryption Time**: < 1500ms for files under 5MB\n'
    report += '- **Target Success Rate**: > 95%\n'
    report += '- **Memory Usage**: < 50MB peak for single upload\n'

    return report
  }

  async cleanup() {
    // Clean up test files
    this.testFiles.forEach(file => {
      try {
        unlinkSync(file.path)
      } catch (error) {
        console.warn(`Failed to delete test file ${file.path}:`, error)
      }
    })

    if (this.browser) {
      await this.browser.close()
    }
  }
}

// Test suite
test.describe('KYC File Upload Performance', () => {
  let performanceTester: FileUploadPerformanceTester

  test.beforeAll(async () => {
    performanceTester = new FileUploadPerformanceTester()
    await performanceTester.initialize()
  })

  test.afterAll(async () => {
    await performanceTester.cleanup()
  })

  test('should benchmark single file uploads', async () => {
    const metrics: FileUploadMetrics[] = []
    
    for (const testFile of performanceTester['testFiles']) {
      const metric = await performanceTester.measureSingleFileUpload(testFile.path, testFile.name)
      metrics.push(metric)
      
      // Basic performance assertions
      if (testFile.size <= 1024 * 1024) { // Files under 1MB
        expect(metric.uploadTime).toBeLessThan(3000) // Should upload in under 3s
      } else if (testFile.size <= 5 * 1024 * 1024) { // Files under 5MB
        expect(metric.uploadTime).toBeLessThan(10000) // Should upload in under 10s
      }
      
      expect(metric.errorRate).toBe(0) // No errors expected
      expect(metric.throughput).toBeGreaterThan(0) // Should have positive throughput
    }

    console.log('Single file upload metrics:', metrics)
  })

  test('should handle concurrent uploads', async () => {
    const concurrencyLevels = [3, 5, 10]
    const loadTestResults: LoadTestResults[] = []

    for (const concurrency of concurrencyLevels) {
      const result = await performanceTester.runLoadTest(concurrency)
      loadTestResults.push(result)
      
      // Assert minimum success rate
      const successRate = result.successfulUploads / result.concurrentUploads
      expect(successRate).toBeGreaterThan(0.8) // 80% success rate minimum
    }

    console.log('Load test results:', loadTestResults)
  })

  test('should perform under different network conditions', async () => {
    const networkResults = await performanceTester.testNetworkConditions()
    
    // WiFi should always succeed
    const wifiResult = networkResults.find(r => r.networkCondition === 'WiFi')
    expect(wifiResult?.success).toBe(true)
    
    // Fast 3G should generally succeed
    const fast3GResult = networkResults.find(r => r.networkCondition === 'Fast 3G')
    if (fast3GResult) {
      expect(fast3GResult.uploadTime).toBeLessThan(15000) // 15s max on Fast 3G
    }

    console.log('Network condition results:', networkResults)
  })

  test('should generate comprehensive performance report', async () => {
    const metrics: FileUploadMetrics[] = []
    const loadTestResults: LoadTestResults[] = []
    
    // Run all tests
    for (const testFile of performanceTester['testFiles']) {
      const metric = await performanceTester.measureSingleFileUpload(testFile.path, testFile.name)
      metrics.push(metric)
    }
    
    const loadResult = await performanceTester.runLoadTest(5)
    loadTestResults.push(loadResult)
    
    const networkResults = await performanceTester.testNetworkConditions()
    
    // Generate comprehensive report
    const report = performanceTester.generateReport(metrics, loadTestResults, networkResults)
    
    expect(report).toContain('# KYC File Upload Performance Report')
    expect(report).toContain('## Single File Upload Performance')
    expect(report).toContain('## Concurrent Upload Load Test Results')
    expect(report).toContain('## Network Conditions Performance')
    
    // Save report
    require('fs').writeFileSync('./kyc-file-upload-report.md', report)
    console.log('Performance report generated')
  })
})

export { FileUploadPerformanceTester, FileUploadMetrics, LoadTestResults }