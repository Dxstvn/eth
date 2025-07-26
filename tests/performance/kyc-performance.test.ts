/**
 * KYC Performance Benchmarking Test Suite
 * Comprehensive performance testing for KYC system components
 */

import { test, expect, chromium, Browser, Page } from '@playwright/test'
import { performance } from 'perf_hooks'
import { KYCEncryptionService, KYCFieldType } from '@/lib/security/kyc-encryption'
import { kycEncryption } from '@/lib/security/kyc-encryption'

interface PerformanceMetrics {
  operation: string
  averageTime: number
  minTime: number
  maxTime: number
  memoryBefore: number
  memoryAfter: number
  memoryDelta: number
  throughput?: number
  samples: number
  timestamp: number
}

interface FormPerformanceMetrics {
  componentName: string
  renderTime: number
  firstInputDelay: number
  formValidationTime: number
  submitTime: number
  memoryUsage: number
  reRenderCount: number
}

interface FileUploadMetrics {
  fileName: string
  fileSize: number
  uploadTime: number
  encryptionTime: number
  validationTime: number
  throughputMBps: number
  memoryPeak: number
  networkUtilization: number
}

class KYCPerformanceBenchmark {
  private browser: Browser | null = null
  private page: Page | null = null
  private encryptionService: KYCEncryptionService
  private metrics: PerformanceMetrics[] = []

  constructor() {
    this.encryptionService = new KYCEncryptionService()
  }

  async initialize() {
    this.browser = await chromium.launch({
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--enable-precise-memory-info',
        '--js-flags=--expose-gc'
      ]
    })
    
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    })
    
    this.page = await context.newPage()
    
    // Enable performance monitoring
    await this.page.addInitScript(() => {
      (window as any).performanceMonitor = {
        startTime: 0,
        endTime: 0,
        memorySnapshots: [],
        renderCount: 0,
        
        startTimer: () => {
          (window as any).performanceMonitor.startTime = performance.now()
        },
        
        endTimer: () => {
          (window as any).performanceMonitor.endTime = performance.now()
          return (window as any).performanceMonitor.endTime - (window as any).performanceMonitor.startTime
        },
        
        captureMemory: () => {
          if ((performance as any).memory) {
            const memory = (performance as any).memory
            return {
              used: memory.usedJSHeapSize,
              total: memory.totalJSHeapSize,
              limit: memory.jsHeapSizeLimit
            }
          }
          return null
        },
        
        forceGC: () => {
          if ((window as any).gc) {
            (window as any).gc()
          }
        }
      }
    })
  }

  /**
   * Benchmark page load performance for all KYC pages
   */
  async benchmarkPageLoads(): Promise<PerformanceMetrics[]> {
    if (!this.page) throw new Error('Browser not initialized')

    const pages = [
      { url: 'http://localhost:3000/kyc', name: 'KYC Landing Page' },
      { url: 'http://localhost:3000/kyc/personal', name: 'Personal Information Form' },
      { url: 'http://localhost:3000/kyc/documents', name: 'Document Upload Form' },
      { url: 'http://localhost:3000/kyc/risk-assessment', name: 'Risk Assessment Form' },
      { url: 'http://localhost:3000/kyc/verification', name: 'Identity Verification' },
      { url: 'http://localhost:3000/kyc/status', name: 'KYC Status Dashboard' },
      { url: 'http://localhost:3000/admin/kyc', name: 'Admin KYC Queue' }
    ]

    const pageMetrics: PerformanceMetrics[] = []

    for (const pageInfo of pages) {
      const samples: number[] = []
      const memorySnapshots: number[] = []

      // Run multiple samples for statistical accuracy
      for (let i = 0; i < 5; i++) {
        // Force garbage collection
        await this.page.evaluate(() => {
          if ((window as any).gc) (window as any).gc()
        })

        const memoryBefore = await this.page.evaluate(() => {
          return (window as any).performanceMonitor.captureMemory()?.used || 0
        })

        const startTime = performance.now()
        
        await this.page.goto(pageInfo.url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        })
        
        // Wait for React hydration and component mounting
        await this.page.waitForTimeout(1000)
        
        const endTime = performance.now()
        const loadTime = endTime - startTime

        const memoryAfter = await this.page.evaluate(() => {
          return (window as any).performanceMonitor.captureMemory()?.used || 0
        })

        samples.push(loadTime)
        memorySnapshots.push(memoryAfter - memoryBefore)

        // Clear page for next iteration
        await this.page.goto('about:blank')
        await this.page.waitForTimeout(500)
      }

      const metric: PerformanceMetrics = {
        operation: `Page Load: ${pageInfo.name}`,
        averageTime: samples.reduce((a, b) => a + b, 0) / samples.length,
        minTime: Math.min(...samples),
        maxTime: Math.max(...samples),
        memoryBefore: 0,
        memoryAfter: 0,
        memoryDelta: memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length,
        samples: samples.length,
        timestamp: Date.now()
      }

      pageMetrics.push(metric)
      this.metrics.push(metric)
    }

    return pageMetrics
  }

  /**
   * Benchmark form submission performance
   */
  async benchmarkFormSubmissions(): Promise<FormPerformanceMetrics[]> {
    if (!this.page) throw new Error('Browser not initialized')

    const formMetrics: FormPerformanceMetrics[] = []

    // Test Personal Information Form
    await this.page.goto('http://localhost:3000/kyc/personal')
    
    const personalFormMetrics = await this.page.evaluate(async () => {
      const monitor = (window as any).performanceMonitor
      
      monitor.startTimer()
      
      // Fill form fields
      const firstNameInput = document.querySelector('input[name="firstName"]') as HTMLInputElement
      const lastNameInput = document.querySelector('input[name="lastName"]') as HTMLInputElement
      const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
      
      if (firstNameInput && lastNameInput && emailInput) {
        // Measure first input delay
        const inputStartTime = performance.now()
        firstNameInput.focus()
        firstNameInput.value = 'John'
        firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))
        const firstInputDelay = performance.now() - inputStartTime

        // Fill remaining fields
        lastNameInput.value = 'Doe'
        lastNameInput.dispatchEvent(new Event('input', { bubbles: true }))
        emailInput.value = 'john.doe@example.com'
        emailInput.dispatchEvent(new Event('input', { bubbles: true }))

        // Measure validation time
        const validationStartTime = performance.now()
        const form = document.querySelector('form')
        if (form) {
          // Trigger validation
          form.dispatchEvent(new Event('submit', { bubbles: true }))
        }
        const validationTime = performance.now() - validationStartTime

        return {
          componentName: 'Personal Information Form',
          renderTime: monitor.endTimer(),
          firstInputDelay,
          formValidationTime: validationTime,
          submitTime: 0,
          memoryUsage: monitor.captureMemory()?.used || 0,
          reRenderCount: monitor.renderCount || 0
        }
      }
      
      return null
    })

    if (personalFormMetrics) {
      formMetrics.push(personalFormMetrics)
    }

    return formMetrics
  }

  /**
   * Benchmark file upload performance
   */
  async benchmarkFileUploads(): Promise<FileUploadMetrics[]> {
    const uploadMetrics: FileUploadMetrics[] = []

    // Test different file sizes and types
    const testFiles = [
      { size: 100 * 1024, name: 'small-document.pdf', type: 'application/pdf' }, // 100KB
      { size: 1024 * 1024, name: 'medium-image.jpg', type: 'image/jpeg' },      // 1MB
      { size: 5 * 1024 * 1024, name: 'large-document.pdf', type: 'application/pdf' }, // 5MB
      { size: 10 * 1024 * 1024, name: 'very-large-image.png', type: 'image/png' }     // 10MB
    ]

    for (const fileInfo of testFiles) {
      // Create test file blob
      const testData = new Uint8Array(fileInfo.size)
      for (let i = 0; i < testData.length; i++) {
        testData[i] = i % 256
      }
      
      const testFile = new File([testData], fileInfo.name, { type: fileInfo.type })

      // Benchmark file upload and encryption
      const samples: FileUploadMetrics[] = []
      
      for (let i = 0; i < 3; i++) {
        const memoryBefore = process.memoryUsage().heapUsed

        // Measure encryption time
        const encryptionStartTime = performance.now()
        
        const password = 'test-password-123'
        let encryptedResult
        
        try {
          encryptedResult = await this.encryptionService.encryptFile(
            testFile, 
            password,
            (progress) => {
              // Track progress if needed
            }
          )
        } catch (error) {
          console.error(`Failed to encrypt file ${fileInfo.name}:`, error)
          continue
        }

        const encryptionTime = performance.now() - encryptionStartTime
        const memoryAfter = process.memoryUsage().heapUsed
        const memoryPeak = memoryAfter - memoryBefore

        // Calculate throughput
        const throughputMBps = (fileInfo.size / (1024 * 1024)) / (encryptionTime / 1000)

        const uploadMetric: FileUploadMetrics = {
          fileName: fileInfo.name,
          fileSize: fileInfo.size,
          uploadTime: encryptionTime, // Using encryption as upload simulation
          encryptionTime,
          validationTime: 0, // Would measure actual validation in real implementation
          throughputMBps,
          memoryPeak,
          networkUtilization: 0 // Would measure in real network scenario
        }

        samples.push(uploadMetric)
      }

      // Average the samples
      if (samples.length > 0) {
        const avgMetric: FileUploadMetrics = {
          fileName: fileInfo.name,
          fileSize: fileInfo.size,
          uploadTime: samples.reduce((sum, s) => sum + s.uploadTime, 0) / samples.length,
          encryptionTime: samples.reduce((sum, s) => sum + s.encryptionTime, 0) / samples.length,
          validationTime: samples.reduce((sum, s) => sum + s.validationTime, 0) / samples.length,
          throughputMBps: samples.reduce((sum, s) => sum + s.throughputMBps, 0) / samples.length,
          memoryPeak: samples.reduce((sum, s) => sum + s.memoryPeak, 0) / samples.length,
          networkUtilization: 0
        }

        uploadMetrics.push(avgMetric)
      }
    }

    return uploadMetrics
  }

  /**
   * Benchmark encryption/decryption performance
   */
  async benchmarkEncryptionPerformance(): Promise<PerformanceMetrics[]> {
    const encryptionMetrics: PerformanceMetrics[] = []

    // Test different data sizes and field types
    const testCases = [
      { data: 'John Doe', fieldType: KYCFieldType.FULL_NAME, description: 'Short Text Field' },
      { data: '123-45-6789', fieldType: KYCFieldType.SSN, description: 'SSN Field' },
      { data: '1234 Main St, Anytown, ST 12345, USA', fieldType: KYCFieldType.ADDRESS, description: 'Address Field' },
      { data: 'A'.repeat(1000), fieldType: KYCFieldType.DOCUMENT, description: 'Large Text (1KB)' },
      { data: 'B'.repeat(10000), fieldType: KYCFieldType.DOCUMENT, description: 'Very Large Text (10KB)' }
    ]

    for (const testCase of testCases) {
      const encryptionSamples: number[] = []
      const decryptionSamples: number[] = []
      const memorySamples: number[] = []
      const password = 'test-password-strong-123'

      // Run multiple samples for statistical accuracy
      for (let i = 0; i < 10; i++) {
        const memoryBefore = process.memoryUsage().heapUsed

        // Benchmark encryption
        const encryptStartTime = performance.now()
        const encrypted = this.encryptionService.encryptPII(
          testCase.data,
          testCase.fieldType,
          password
        )
        const encryptTime = performance.now() - encryptStartTime

        // Benchmark decryption
        const decryptStartTime = performance.now()
        const decrypted = this.encryptionService.decryptPII(encrypted, password)
        const decryptTime = performance.now() - decryptStartTime

        const memoryAfter = process.memoryUsage().heapUsed

        // Verify correctness
        expect(decrypted).toBe(testCase.data)

        encryptionSamples.push(encryptTime)
        decryptionSamples.push(decryptTime)
        memorySamples.push(memoryAfter - memoryBefore)

        // Force garbage collection to prevent memory buildup
        if (global.gc) global.gc()
      }

      // Create encryption metric
      const encryptMetric: PerformanceMetrics = {
        operation: `Encryption: ${testCase.description}`,
        averageTime: encryptionSamples.reduce((a, b) => a + b, 0) / encryptionSamples.length,
        minTime: Math.min(...encryptionSamples),
        maxTime: Math.max(...encryptionSamples),
        memoryBefore: 0,
        memoryAfter: 0,
        memoryDelta: memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length,
        throughput: testCase.data.length / (encryptionSamples.reduce((a, b) => a + b, 0) / encryptionSamples.length / 1000), // bytes per second
        samples: encryptionSamples.length,
        timestamp: Date.now()
      }

      // Create decryption metric
      const decryptMetric: PerformanceMetrics = {
        operation: `Decryption: ${testCase.description}`,
        averageTime: decryptionSamples.reduce((a, b) => a + b, 0) / decryptionSamples.length,
        minTime: Math.min(...decryptionSamples),
        maxTime: Math.max(...decryptionSamples),
        memoryBefore: 0,
        memoryAfter: 0,
        memoryDelta: memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length,
        throughput: testCase.data.length / (decryptionSamples.reduce((a, b) => a + b, 0) / decryptionSamples.length / 1000),
        samples: decryptionSamples.length,
        timestamp: Date.now()
      }

      encryptionMetrics.push(encryptMetric, decryptMetric)
    }

    this.metrics.push(...encryptionMetrics)
    return encryptionMetrics
  }

  /**
   * Monitor memory usage over time during KYC workflow
   */
  async benchmarkMemoryUsage(): Promise<PerformanceMetrics> {
    if (!this.page) throw new Error('Browser not initialized')

    const memorySnapshots: number[] = []
    const timeSnapshots: number[] = []

    // Start monitoring
    const monitoringInterval = setInterval(async () => {
      try {
        const memory = await this.page!.evaluate(() => {
          return (window as any).performanceMonitor.captureMemory()?.used || 0
        })
        memorySnapshots.push(memory)
        timeSnapshots.push(Date.now())
      } catch (error) {
        console.error('Memory monitoring error:', error)
      }
    }, 1000) // Sample every second

    try {
      // Simulate complete KYC workflow
      await this.page.goto('http://localhost:3000/kyc')
      await this.page.waitForTimeout(2000)

      await this.page.goto('http://localhost:3000/kyc/personal')
      await this.page.waitForTimeout(2000)

      await this.page.goto('http://localhost:3000/kyc/documents')
      await this.page.waitForTimeout(2000)

      await this.page.goto('http://localhost:3000/kyc/risk-assessment')
      await this.page.waitForTimeout(2000)

      await this.page.goto('http://localhost:3000/kyc/status')
      await this.page.waitForTimeout(2000)

    } finally {
      clearInterval(monitoringInterval)
    }

    const memoryMetric: PerformanceMetrics = {
      operation: 'Memory Usage During KYC Workflow',
      averageTime: 0,
      minTime: Math.min(...memorySnapshots),
      maxTime: Math.max(...memorySnapshots),
      memoryBefore: memorySnapshots[0] || 0,
      memoryAfter: memorySnapshots[memorySnapshots.length - 1] || 0,
      memoryDelta: (memorySnapshots[memorySnapshots.length - 1] || 0) - (memorySnapshots[0] || 0),
      samples: memorySnapshots.length,
      timestamp: Date.now()
    }

    this.metrics.push(memoryMetric)
    return memoryMetric
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): string {
    const now = new Date()
    let report = '# KYC Performance Benchmark Report\n\n'
    report += `Generated: ${now.toISOString()}\n`
    report += `Total Metrics: ${this.metrics.length}\n\n`

    // Summary table
    report += '## Performance Summary\n\n'
    report += '| Operation | Avg Time (ms) | Min Time (ms) | Max Time (ms) | Memory Delta (bytes) | Throughput | Samples |\n'
    report += '|-----------|---------------|---------------|---------------|---------------------|------------|----------|\n'

    this.metrics.forEach(metric => {
      const throughputStr = metric.throughput ? `${metric.throughput.toFixed(2)} B/s` : 'N/A'
      report += `| ${metric.operation} | ${metric.averageTime.toFixed(2)} | ${metric.minTime.toFixed(2)} | ${metric.maxTime.toFixed(2)} | ${metric.memoryDelta.toFixed(0)} | ${throughputStr} | ${metric.samples} |\n`
    })

    // Performance analysis
    report += '\n## Performance Analysis\n\n'

    const pageLoadMetrics = this.metrics.filter(m => m.operation.includes('Page Load'))
    const encryptionMetrics = this.metrics.filter(m => m.operation.includes('Encryption'))
    const decryptionMetrics = this.metrics.filter(m => m.operation.includes('Decryption'))

    if (pageLoadMetrics.length > 0) {
      const avgPageLoad = pageLoadMetrics.reduce((sum, m) => sum + m.averageTime, 0) / pageLoadMetrics.length
      report += `### Page Load Performance\n`
      report += `- Average page load time: ${avgPageLoad.toFixed(2)}ms\n`
      report += `- Slowest page: ${pageLoadMetrics.reduce((max, m) => m.averageTime > max.averageTime ? m : max).operation}\n`
      report += `- Fastest page: ${pageLoadMetrics.reduce((min, m) => m.averageTime < min.averageTime ? m : min).operation}\n\n`
    }

    if (encryptionMetrics.length > 0) {
      const avgEncryption = encryptionMetrics.reduce((sum, m) => sum + m.averageTime, 0) / encryptionMetrics.length
      report += `### Encryption Performance\n`
      report += `- Average encryption time: ${avgEncryption.toFixed(2)}ms\n`
      report += `- Average throughput: ${encryptionMetrics.reduce((sum, m) => sum + (m.throughput || 0), 0) / encryptionMetrics.length} bytes/second\n\n`
    }

    if (decryptionMetrics.length > 0) {
      const avgDecryption = decryptionMetrics.reduce((sum, m) => sum + m.averageTime, 0) / decryptionMetrics.length
      report += `### Decryption Performance\n`
      report += `- Average decryption time: ${avgDecryption.toFixed(2)}ms\n`
      report += `- Average throughput: ${decryptionMetrics.reduce((sum, m) => sum + (m.throughput || 0), 0) / decryptionMetrics.length} bytes/second\n\n`
    }

    // Performance recommendations
    report += '## Recommendations\n\n'

    const slowOperations = this.metrics.filter(m => m.averageTime > 1000)
    if (slowOperations.length > 0) {
      report += '### Performance Issues Detected\n\n'
      slowOperations.forEach(op => {
        report += `- **${op.operation}**: ${op.averageTime.toFixed(2)}ms (consider optimization)\n`
      })
      report += '\n'
    }

    const memoryIntensiveOps = this.metrics.filter(m => m.memoryDelta > 10 * 1024 * 1024) // > 10MB
    if (memoryIntensiveOps.length > 0) {
      report += '### High Memory Usage Detected\n\n'
      memoryIntensiveOps.forEach(op => {
        report += `- **${op.operation}**: ${(op.memoryDelta / 1024 / 1024).toFixed(2)}MB memory delta\n`
      })
      report += '\n'
    }

    report += '### General Recommendations\n\n'
    report += '- Consider lazy loading for large components\n'
    report += '- Implement progressive file upload for large files\n'
    report += '- Use Web Workers for encryption operations\n'
    report += '- Optimize form validation with debouncing\n'
    report += '- Implement proper memory cleanup in React components\n'

    return report
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics
  }
}

// Test suite
test.describe('KYC Performance Benchmarks', () => {
  let benchmark: KYCPerformanceBenchmark

  test.beforeAll(async () => {
    benchmark = new KYCPerformanceBenchmark()
    await benchmark.initialize()
  })

  test.afterAll(async () => {
    await benchmark.cleanup()
  })

  test('should benchmark page load performance', async () => {
    const metrics = await benchmark.benchmarkPageLoads()
    
    expect(metrics.length).toBeGreaterThan(0)
    
    // Assert performance thresholds
    metrics.forEach(metric => {
      expect(metric.averageTime).toBeLessThan(5000) // 5s max load time
      expect(metric.memoryDelta).toBeLessThan(50 * 1024 * 1024) // 50MB max memory increase
    })
  })

  test('should benchmark form submission performance', async () => {
    const metrics = await benchmark.benchmarkFormSubmissions()
    
    expect(metrics.length).toBeGreaterThan(0)
    
    metrics.forEach(metric => {
      expect(metric.firstInputDelay).toBeLessThan(100) // 100ms max input delay
      expect(metric.formValidationTime).toBeLessThan(500) // 500ms max validation
    })
  })

  test('should benchmark file upload performance', async () => {
    const metrics = await benchmark.benchmarkFileUploads()
    
    expect(metrics.length).toBeGreaterThan(0)
    
    metrics.forEach(metric => {
      // Throughput should be reasonable (at least 1MB/s for encryption)
      if (metric.fileSize > 1024 * 1024) { // For files > 1MB
        expect(metric.throughputMBps).toBeGreaterThan(1)
      }
      
      // Memory usage should be reasonable (less than 3x file size)
      expect(metric.memoryPeak).toBeLessThan(metric.fileSize * 3)
    })
  })

  test('should benchmark encryption performance', async () => {
    const metrics = await benchmark.benchmarkEncryptionPerformance()
    
    expect(metrics.length).toBeGreaterThan(0)
    
    const encryptionMetrics = metrics.filter(m => m.operation.includes('Encryption'))
    const decryptionMetrics = metrics.filter(m => m.operation.includes('Decryption'))
    
    // Encryption should be reasonably fast
    encryptionMetrics.forEach(metric => {
      expect(metric.averageTime).toBeLessThan(100) // 100ms max for small data
    })
    
    // Decryption should be faster than encryption
    decryptionMetrics.forEach(metric => {
      expect(metric.averageTime).toBeLessThan(50) // 50ms max for decryption
    })
  })

  test('should monitor memory usage during workflow', async () => {
    const memoryMetric = await benchmark.benchmarkMemoryUsage()
    
    expect(memoryMetric).toBeDefined()
    expect(memoryMetric.samples).toBeGreaterThan(5) // Should have multiple samples
    
    // Memory growth should be reasonable
    expect(memoryMetric.memoryDelta).toBeLessThan(100 * 1024 * 1024) // 100MB max growth
  })

  test('should generate performance report', async () => {
    // Run all benchmarks first
    await benchmark.benchmarkPageLoads()
    await benchmark.benchmarkEncryptionPerformance()
    await benchmark.benchmarkMemoryUsage()
    
    const report = benchmark.generateReport()
    
    expect(report).toContain('# KYC Performance Benchmark Report')
    expect(report).toContain('## Performance Summary')
    expect(report).toContain('## Performance Analysis')
    expect(report).toContain('## Recommendations')
    
    // Save report for CI
    const fs = require('fs')
    fs.writeFileSync('./kyc-performance-report.md', report)
  })
})

export { KYCPerformanceBenchmark, PerformanceMetrics, FormPerformanceMetrics, FileUploadMetrics }