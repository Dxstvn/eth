/**
 * KYC Encryption/Decryption Performance Tests
 * Measures encryption performance for different data sizes and types
 */

import { test, expect } from '@playwright/test'
import { performance } from 'perf_hooks'
import { KYCEncryptionService, KYCFieldType } from '@/lib/security/kyc-encryption'
import { createHash, randomBytes } from 'crypto'

interface EncryptionMetrics {
  operation: 'encrypt' | 'decrypt'
  dataType: 'text' | 'file' | 'binary'
  dataSize: number // bytes
  executionTime: number // ms
  throughput: number // bytes/ms
  memoryUsage: number // bytes
  cpuUsage: number // percentage
}

interface EncryptionBenchmark {
  fieldType: KYCFieldType
  dataSize: number
  iterations: number
  metrics: EncryptionMetrics[]
  averageEncryptionTime: number
  averageDecryptionTime: number
  throughput: number
  memoryPeak: number
}

class EncryptionPerformanceTester {
  private encryptionService: KYCEncryptionService
  private testData: Map<string, any> = new Map()

  constructor() {
    this.encryptionService = new KYCEncryptionService()
    this.generateTestData()
  }

  private generateTestData() {
    // Text data of various sizes
    const textSizes = [100, 1024, 10240, 102400] // 100B, 1KB, 10KB, 100KB
    textSizes.forEach(size => {
      this.testData.set(`text_${size}`, 'A'.repeat(size))
    })

    // Binary data (simulating files)
    const binarySizes = [1024, 51200, 512000, 1048576, 5242880] // 1KB, 50KB, 500KB, 1MB, 5MB
    binarySizes.forEach(size => {
      this.testData.set(`binary_${size}`, randomBytes(size))
    })

    // Structured JSON data
    const jsonData = {
      personalInfo: {
        firstName: 'John'.repeat(100),
        lastName: 'Doe'.repeat(100),
        address: 'Street Address'.repeat(200),
        documents: Array(50).fill({
          type: 'passport',
          number: 'AB123456789',
          expiryDate: '2030-12-31',
          issuingCountry: 'US'
        })
      }
    }
    this.testData.set('json_large', JSON.stringify(jsonData))
  }

  async measureMemoryUsage(operation: () => Promise<any>): Promise<{ result: any, memoryUsed: number }> {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const initialMemory = (performance as any).memory.usedJSHeapSize
      const result = await operation()
      const finalMemory = (performance as any).memory.usedJSHeapSize
      return { result, memoryUsed: finalMemory - initialMemory }
    } else {
      // Node.js environment
      const initialMemory = process.memoryUsage().heapUsed
      const result = await operation()
      const finalMemory = process.memoryUsage().heapUsed
      return { result, memoryUsed: finalMemory - initialMemory }
    }
  }

  async benchmarkEncryption(
    data: string | Buffer,
    dataType: 'text' | 'file' | 'binary',
    iterations: number = 10
  ): Promise<EncryptionMetrics[]> {
    const metrics: EncryptionMetrics[] = []
    const password = 'test-password-123'

    for (let i = 0; i < iterations; i++) {
      // Encryption benchmark
      const encryptStartTime = performance.now()
      const { result: encryptedData, memoryUsed: encryptMemory } = await this.measureMemoryUsage(async () => {
        if (dataType === 'file' && data instanceof Buffer) {
          // Create a File object for file encryption
          const file = new File([data], 'test-file.bin', { type: 'application/octet-stream' })
          return await this.encryptionService.encryptFile(file, password)
        } else {
          return await this.encryptionService.encryptData(data.toString(), KYCFieldType.PERSONAL_INFO, password)
        }
      })

      const encryptEndTime = performance.now()
      const encryptionTime = encryptEndTime - encryptStartTime

      metrics.push({
        operation: 'encrypt',
        dataType,
        dataSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data.toString()),
        executionTime: encryptionTime,
        throughput: (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data.toString())) / encryptionTime,
        memoryUsage: encryptMemory,
        cpuUsage: await this.getCPUUsage(encryptionTime)
      })

      // Decryption benchmark
      const decryptStartTime = performance.now()
      const { result: decryptedData, memoryUsed: decryptMemory } = await this.measureMemoryUsage(async () => {
        if (dataType === 'file') {
          return await this.encryptionService.decryptFile(encryptedData, password)
        } else {
          return await this.encryptionService.decryptData(encryptedData, password)
        }
      })

      const decryptEndTime = performance.now()
      const decryptionTime = decryptEndTime - decryptStartTime

      metrics.push({
        operation: 'decrypt',
        dataType,
        dataSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data.toString()),
        executionTime: decryptionTime,
        throughput: (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data.toString())) / decryptionTime,
        memoryUsage: decryptMemory,
        cpuUsage: await this.getCPUUsage(decryptionTime)
      })

      // Verify data integrity
      if (dataType === 'file') {
        const originalHash = createHash('sha256').update(data).digest('hex')
        const decryptedBuffer = await decryptedData.arrayBuffer()
        const decryptedHash = createHash('sha256').update(new Uint8Array(decryptedBuffer)).digest('hex')
        expect(originalHash).toBe(decryptedHash)
      } else {
        expect(decryptedData).toBe(data.toString())
      }
    }

    return metrics
  }

  private async getCPUUsage(duration: number): Promise<number> {
    // Simulate CPU usage calculation (in real implementation, this would measure actual CPU)
    // For now, return estimated based on execution time
    if (duration > 1000) return 80 // High CPU for operations > 1s
    if (duration > 500) return 60  // Medium CPU for operations > 500ms
    if (duration > 100) return 40  // Low CPU for operations > 100ms
    return 20 // Very low CPU for fast operations
  }

  async runComprehensiveBenchmark(): Promise<EncryptionBenchmark[]> {
    const benchmarks: EncryptionBenchmark[] = []

    // Test different field types and data sizes
    const testCases = [
      { fieldType: KYCFieldType.PERSONAL_INFO, dataKey: 'text_1024', iterations: 20 },
      { fieldType: KYCFieldType.PERSONAL_INFO, dataKey: 'text_10240', iterations: 15 },
      { fieldType: KYCFieldType.PERSONAL_INFO, dataKey: 'json_large', iterations: 10 },
      { fieldType: KYCFieldType.DOCUMENT, dataKey: 'binary_51200', iterations: 10 },
      { fieldType: KYCFieldType.DOCUMENT, dataKey: 'binary_512000', iterations: 5 },
      { fieldType: KYCFieldType.DOCUMENT, dataKey: 'binary_1048576', iterations: 3 },
      { fieldType: KYCFieldType.DOCUMENT, dataKey: 'binary_5242880', iterations: 2 }
    ]

    for (const testCase of testCases) {
      const data = this.testData.get(testCase.dataKey)
      if (!data) continue

      const dataType = testCase.dataKey.startsWith('binary') ? 'file' : 'text'
      const metrics = await this.benchmarkEncryption(data, dataType, testCase.iterations)

      const encryptionMetrics = metrics.filter(m => m.operation === 'encrypt')
      const decryptionMetrics = metrics.filter(m => m.operation === 'decrypt')

      const avgEncryptionTime = encryptionMetrics.reduce((sum, m) => sum + m.executionTime, 0) / encryptionMetrics.length
      const avgDecryptionTime = decryptionMetrics.reduce((sum, m) => sum + m.executionTime, 0) / decryptionMetrics.length
      const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length
      const memoryPeak = Math.max(...metrics.map(m => m.memoryUsage))

      benchmarks.push({
        fieldType: testCase.fieldType,
        dataSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data.toString()),
        iterations: testCase.iterations,
        metrics,
        averageEncryptionTime: avgEncryptionTime,
        averageDecryptionTime: avgDecryptionTime,
        throughput: avgThroughput,
        memoryPeak
      })
    }

    return benchmarks
  }

  async benchmarkConcurrentEncryption(concurrency: number = 5): Promise<any> {
    const testData = this.testData.get('text_10240')
    const password = 'test-password-123'
    
    const startTime = performance.now()
    
    const promises = Array(concurrency).fill(null).map(async (_, index) => {
      const operationStartTime = performance.now()
      
      try {
        const encrypted = await this.encryptionService.encryptData(
          testData, 
          KYCFieldType.PERSONAL_INFO, 
          password
        )
        
        const decrypted = await this.encryptionService.decryptData(encrypted, password)
        
        const operationEndTime = performance.now()
        
        return {
          index,
          success: true,
          executionTime: operationEndTime - operationStartTime,
          dataIntegrity: decrypted === testData
        }
      } catch (error) {
        const operationEndTime = performance.now()
        
        return {
          index,
          success: false,
          executionTime: operationEndTime - operationStartTime,
          error: error.message,
          dataIntegrity: false
        }
      }
    })

    const results = await Promise.all(promises)
    const endTime = performance.now()
    
    const successfulOperations = results.filter(r => r.success)
    const failedOperations = results.filter(r => !r.success)
    
    return {
      concurrency,
      totalTime: endTime - startTime,
      successfulOperations: successfulOperations.length,
      failedOperations: failedOperations.length,
      averageExecutionTime: successfulOperations.reduce((sum, r) => sum + r.executionTime, 0) / successfulOperations.length,
      dataIntegrityCheck: successfulOperations.every(r => r.dataIntegrity),
      results
    }
  }

  generateReport(benchmarks: EncryptionBenchmark[], concurrencyResults: any[]): string {
    let report = '# KYC Encryption Performance Report\n\n'
    report += `Generated: ${new Date().toISOString()}\n\n`

    // Executive Summary
    report += '## Executive Summary\n\n'
    const totalOperations = benchmarks.reduce((sum, b) => sum + (b.iterations * 2), 0) // *2 for encrypt + decrypt
    const avgEncryptionTime = benchmarks.reduce((sum, b) => sum + b.averageEncryptionTime, 0) / benchmarks.length
    const avgDecryptionTime = benchmarks.reduce((sum, b) => sum + b.averageDecryptionTime, 0) / benchmarks.length
    const avgThroughput = benchmarks.reduce((sum, b) => sum + b.throughput, 0) / benchmarks.length

    report += `- **Total Operations Tested**: ${totalOperations}\n`
    report += `- **Average Encryption Time**: ${avgEncryptionTime.toFixed(2)}ms\n`
    report += `- **Average Decryption Time**: ${avgDecryptionTime.toFixed(2)}ms\n`
    report += `- **Average Throughput**: ${(avgThroughput * 1000 / 1024).toFixed(2)} KB/s\n\n`

    // Detailed Benchmarks
    report += '## Encryption Performance by Data Size\n\n'
    report += '| Field Type | Data Size (KB) | Iterations | Avg Encryption (ms) | Avg Decryption (ms) | Throughput (KB/s) | Memory Peak (KB) |\n'
    report += '|------------|----------------|------------|---------------------|---------------------|-------------------|------------------|\n'

    benchmarks.forEach(benchmark => {
      const sizeKB = (benchmark.dataSize / 1024).toFixed(2)
      const throughputKBs = (benchmark.throughput * 1000 / 1024).toFixed(2)
      const memoryKB = (benchmark.memoryPeak / 1024).toFixed(2)
      
      report += `| ${benchmark.fieldType} | ${sizeKB} | ${benchmark.iterations} | ${benchmark.averageEncryptionTime.toFixed(2)} | ${benchmark.averageDecryptionTime.toFixed(2)} | ${throughputKBs} | ${memoryKB} |\n`
    })

    // Performance Analysis by Data Size
    report += '\n## Performance Analysis by Data Size\n\n'
    
    const sizeGroups = {
      'Small (< 10KB)': benchmarks.filter(b => b.dataSize < 10240),
      'Medium (10KB - 100KB)': benchmarks.filter(b => b.dataSize >= 10240 && b.dataSize < 102400),
      'Large (100KB - 1MB)': benchmarks.filter(b => b.dataSize >= 102400 && b.dataSize < 1048576),
      'Very Large (> 1MB)': benchmarks.filter(b => b.dataSize >= 1048576)
    }

    Object.entries(sizeGroups).forEach(([groupName, groupBenchmarks]) => {
      if (groupBenchmarks.length > 0) {
        const avgEncrypt = groupBenchmarks.reduce((sum, b) => sum + b.averageEncryptionTime, 0) / groupBenchmarks.length
        const avgDecrypt = groupBenchmarks.reduce((sum, b) => sum + b.averageDecryptionTime, 0) / groupBenchmarks.length
        const avgThroughput = groupBenchmarks.reduce((sum, b) => sum + b.throughput, 0) / groupBenchmarks.length
        
        report += `**${groupName}**:\n`
        report += `- Average Encryption Time: ${avgEncrypt.toFixed(2)}ms\n`
        report += `- Average Decryption Time: ${avgDecrypt.toFixed(2)}ms\n`
        report += `- Average Throughput: ${(avgThroughput * 1000 / 1024).toFixed(2)} KB/s\n\n`
      }
    })

    // Concurrent Operations Results
    if (concurrencyResults.length > 0) {
      report += '## Concurrent Encryption Performance\n\n'
      report += '| Concurrency Level | Total Time (ms) | Success Rate | Avg Operation Time (ms) | Data Integrity |\n'
      report += '|------------------|-----------------|--------------|-------------------------|----------------|\n'
      
      concurrencyResults.forEach(result => {
        const successRate = ((result.successfulOperations / result.concurrency) * 100).toFixed(1)
        const dataIntegrity = result.dataIntegrityCheck ? '✅' : '❌'
        
        report += `| ${result.concurrency} | ${result.totalTime.toFixed(2)} | ${successRate}% | ${result.averageExecutionTime.toFixed(2)} | ${dataIntegrity} |\n`
      })
    }

    // Performance Insights
    report += '\n## Performance Insights\n\n'
    
    // Find bottlenecks
    const slowestEncryption = benchmarks.reduce((max, b) => b.averageEncryptionTime > max.averageEncryptionTime ? b : max)
    const fastestEncryption = benchmarks.reduce((min, b) => b.averageEncryptionTime < min.averageEncryptionTime ? b : min)
    
    report += `**Encryption Performance**:\n`
    report += `- Fastest: ${(fastestEncryption.dataSize / 1024).toFixed(2)}KB in ${fastestEncryption.averageEncryptionTime.toFixed(2)}ms\n`
    report += `- Slowest: ${(slowestEncryption.dataSize / 1024).toFixed(2)}KB in ${slowestEncryption.averageEncryptionTime.toFixed(2)}ms\n`
    
    // Memory usage analysis
    const maxMemoryUsage = Math.max(...benchmarks.map(b => b.memoryPeak))
    report += `- Peak Memory Usage: ${(maxMemoryUsage / 1024 / 1024).toFixed(2)}MB\n\n`

    // Scalability Analysis
    report += '**Scalability Analysis**:\n'
    const smallDataPerf = benchmarks.find(b => b.dataSize < 10240)
    const largeDataPerf = benchmarks.find(b => b.dataSize > 1048576)
    
    if (smallDataPerf && largeDataPerf) {
      const sizeRatio = largeDataPerf.dataSize / smallDataPerf.dataSize
      const timeRatio = largeDataPerf.averageEncryptionTime / smallDataPerf.averageEncryptionTime
      
      report += `- Size increased ${sizeRatio.toFixed(1)}x, time increased ${timeRatio.toFixed(1)}x\n`
      report += `- Scalability coefficient: ${(timeRatio / sizeRatio).toFixed(2)} (closer to 1.0 is better)\n\n`
    }

    // Recommendations
    report += '## Performance Recommendations\n\n'
    
    if (avgEncryptionTime > 2000) {
      report += '⚠️ **High encryption times detected**:\n'
      report += '- Consider using Web Workers for encryption operations\n'
      report += '- Implement progressive encryption for large files\n'
      report += '- Add user feedback during long operations\n\n'
    }
    
    if (maxMemoryUsage > 50 * 1024 * 1024) { // 50MB
      report += '⚠️ **High memory usage detected**:\n'
      report += '- Implement streaming encryption for large files\n'
      report += '- Consider chunked processing for files > 10MB\n'
      report += '- Add memory cleanup after operations\n\n'
    }
    
    const concurrentSuccessRate = concurrencyResults.length > 0 ? 
      concurrencyResults.reduce((sum, r) => sum + (r.successfulOperations / r.concurrency), 0) / concurrencyResults.length : 1
    
    if (concurrentSuccessRate < 0.95) {
      report += '⚠️ **Concurrent operation issues detected**:\n'
      report += '- Review thread safety of encryption operations\n'
      report += '- Implement proper error handling for concurrent operations\n'
      report += '- Consider operation queuing for high concurrency\n\n'
    }

    // Performance Thresholds
    report += '## Performance Thresholds\n\n'
    report += '**Target Performance Metrics**:\n'
    report += '- Text encryption (< 10KB): < 100ms\n'
    report += '- Document encryption (< 1MB): < 1000ms\n'
    report += '- Large file encryption (< 10MB): < 5000ms\n'
    report += '- Memory usage per operation: < 20MB\n'
    report += '- Concurrent operation success rate: > 95%\n'
    report += '- Data integrity: 100%\n\n'

    // Optimization Strategies
    report += '## Optimization Strategies\n\n'
    report += '1. **Web Workers**: Move encryption operations to background threads\n'
    report += '2. **Streaming**: Process large files in chunks to reduce memory usage\n'
    report += '3. **Caching**: Cache encryption keys where security permits\n'
    report += '4. **Compression**: Compress data before encryption for better performance\n'
    report += '5. **Progressive Enhancement**: Show progress indicators for long operations\n'
    report += '6. **Error Recovery**: Implement retry mechanisms for failed operations\n'

    return report
  }
}

// Test suite
test.describe('KYC Encryption Performance', () => {
  let performanceTester: EncryptionPerformanceTester

  test.beforeAll(async () => {
    performanceTester = new EncryptionPerformanceTester()
  })

  test('should benchmark encryption performance for different data sizes', async () => {
    const benchmarks = await performanceTester.runComprehensiveBenchmark()
    
    expect(benchmarks).toHaveLength(7) // Based on test cases defined
    
    // Assert performance thresholds
    benchmarks.forEach(benchmark => {
      if (benchmark.dataSize < 10240) { // < 10KB
        expect(benchmark.averageEncryptionTime).toBeLessThan(200) // 200ms for small data
        expect(benchmark.averageDecryptionTime).toBeLessThan(100) // 100ms for decryption
      } else if (benchmark.dataSize < 1048576) { // < 1MB
        expect(benchmark.averageEncryptionTime).toBeLessThan(2000) // 2s for medium data
        expect(benchmark.averageDecryptionTime).toBeLessThan(1000) // 1s for decryption
      } else { // > 1MB
        expect(benchmark.averageEncryptionTime).toBeLessThan(8000) // 8s for large data
        expect(benchmark.averageDecryptionTime).toBeLessThan(4000) // 4s for decryption
      }
      
      // Memory usage should be reasonable
      expect(benchmark.memoryPeak).toBeLessThan(100 * 1024 * 1024) // 100MB max
    })

    console.log('Encryption benchmarks completed:', benchmarks.length)
  })

  test('should handle concurrent encryption operations', async () => {
    const concurrencyLevels = [3, 5, 10]
    const concurrencyResults = []

    for (const concurrency of concurrencyLevels) {
      const result = await performanceTester.benchmarkConcurrentEncryption(concurrency)
      concurrencyResults.push(result)
      
      // Assert minimum success rate
      const successRate = result.successfulOperations / result.concurrency
      expect(successRate).toBeGreaterThan(0.9) // 90% success rate minimum
      
      // Assert data integrity
      expect(result.dataIntegrityCheck).toBe(true)
      
      // Performance should degrade gracefully with concurrency
      if (concurrency <= 5) {
        expect(result.averageExecutionTime).toBeLessThan(1000) // 1s for low concurrency
      } else {
        expect(result.averageExecutionTime).toBeLessThan(2000) // 2s for high concurrency
      }
    }

    console.log('Concurrent encryption results:', concurrencyResults)
  })

  test('should generate comprehensive performance report', async () => {
    const benchmarks = await performanceTester.runComprehensiveBenchmark()
    const concurrencyResults = [
      await performanceTester.benchmarkConcurrentEncryption(5),
      await performanceTester.benchmarkConcurrentEncryption(10)
    ]
    
    const report = performanceTester.generateReport(benchmarks, concurrencyResults)
    
    expect(report).toContain('# KYC Encryption Performance Report')
    expect(report).toContain('## Executive Summary')
    expect(report).toContain('## Encryption Performance by Data Size')
    expect(report).toContain('## Concurrent Encryption Performance')
    expect(report).toContain('## Performance Recommendations')
    
    // Save report
    require('fs').writeFileSync('./kyc-encryption-performance-report.md', report)
    console.log('Encryption performance report generated')
  })

  test('should verify encryption quality and security', async () => {
    const testData = 'sensitive-kyc-data-12345'
    const password1 = 'password123'
    const password2 = 'different-password'
    
    // Encrypt with first password
    const encrypted1 = await performanceTester['encryptionService'].encryptData(
      testData, 
      KYCFieldType.PERSONAL_INFO, 
      password1
    )
    
    // Encrypt same data with different password
    const encrypted2 = await performanceTester['encryptionService'].encryptData(
      testData, 
      KYCFieldType.PERSONAL_INFO, 
      password2
    )
    
    // Encrypted data should be different with different passwords
    expect(encrypted1).not.toBe(encrypted2)
    
    // Should decrypt correctly with correct password
    const decrypted1 = await performanceTester['encryptionService'].decryptData(encrypted1, password1)
    expect(decrypted1).toBe(testData)
    
    // Should fail with wrong password
    await expect(async () => {
      await performanceTester['encryptionService'].decryptData(encrypted1, password2)
    }).rejects.toThrow()
  })
})

export { EncryptionPerformanceTester, EncryptionMetrics, EncryptionBenchmark }