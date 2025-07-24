import { securityLogger, SecurityEventType, SecurityEventSeverity } from './security-logging';

// Secure coding rule types
export enum SecureCodingRuleType {
  INPUT_VALIDATION = 'INPUT_VALIDATION',
  OUTPUT_ENCODING = 'OUTPUT_ENCODING',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  CRYPTOGRAPHY = 'CRYPTOGRAPHY',
  ERROR_HANDLING = 'ERROR_HANDLING',
  LOGGING = 'LOGGING',
  DATA_PROTECTION = 'DATA_PROTECTION',
  SESSION_MANAGEMENT = 'SESSION_MANAGEMENT',
  COMMUNICATION = 'COMMUNICATION',
}

// Secure coding violation
export interface SecureCodingViolation {
  id: string;
  rule: string;
  type: SecureCodingRuleType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  location: string;
  line?: number;
  column?: number;
  code?: string;
  fix?: string;
  detectedAt: number;
}

// Secure coding rule
export interface SecureCodingRule {
  id: string;
  name: string;
  type: SecureCodingRuleType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  pattern?: RegExp;
  validator?: (code: string) => SecureCodingViolation[];
  enabled: boolean;
}

// Secure coding practices enforcer
export class SecureCodingEnforcer {
  private static instance: SecureCodingEnforcer;
  private rules: Map<string, SecureCodingRule> = new Map();
  private violations: SecureCodingViolation[] = [];
  
  private constructor() {
    this.initializeDefaultRules();
  }
  
  static getInstance(): SecureCodingEnforcer {
    if (!SecureCodingEnforcer.instance) {
      SecureCodingEnforcer.instance = new SecureCodingEnforcer();
    }
    return SecureCodingEnforcer.instance;
  }
  
  // Initialize default secure coding rules
  private initializeDefaultRules(): void {
    const defaultRules: SecureCodingRule[] = [
      {
        id: 'no-eval',
        name: 'Avoid eval() usage',
        type: SecureCodingRuleType.INPUT_VALIDATION,
        severity: 'critical',
        description: 'eval() can execute arbitrary code and should be avoided',
        pattern: /eval\s*\(/g,
        enabled: true,
      },
      {
        id: 'no-innerhtml-without-sanitization',
        name: 'Sanitize innerHTML usage',
        type: SecureCodingRuleType.OUTPUT_ENCODING,
        severity: 'high',
        description: 'innerHTML usage without sanitization can lead to XSS',
        validator: (code: string) => {
          const violations: SecureCodingViolation[] = [];
          const innerhtmlPattern = /\.innerHTML\s*=/g;
          const sanitizePattern = /(sanitize|DOMPurify)/;
          
          let match;
          while ((match = innerhtmlPattern.exec(code)) !== null) {
            const lineStart = code.lastIndexOf('\n', match.index) + 1;
            const lineEnd = code.indexOf('\n', match.index);
            const line = code.substring(lineStart, lineEnd !== -1 ? lineEnd : code.length);
            
            if (!sanitizePattern.test(line)) {
              violations.push({
                id: `innerHTML-${match.index}`,
                rule: 'no-innerhtml-without-sanitization',
                type: SecureCodingRuleType.OUTPUT_ENCODING,
                severity: 'high',
                message: 'innerHTML usage without sanitization detected',
                location: 'code',
                code: line.trim(),
                fix: 'Use DOMPurify.sanitize() or textContent instead',
                detectedAt: Date.now(),
              });
            }
          }
          
          return violations;
        },
        enabled: true,
      },
      {
        id: 'no-hardcoded-secrets',
        name: 'No hardcoded secrets',
        type: SecureCodingRuleType.CRYPTOGRAPHY,
        severity: 'critical',
        description: 'Hardcoded secrets should not be present in code',
        validator: (code: string) => {
          const violations: SecureCodingViolation[] = [];
          const secretPatterns = [
            /api[_-]?key\s*[:=]\s*['"'][^'"]+[''"]/gi,
            /password\s*[:=]\s*['"'][^'"]+[''"]/gi,
            /secret\s*[:=]\s*['"'][^'"]+[''"]/gi,
            /private[_-]?key\s*[:=]\s*['"'][^'"]+[''"]/gi,
          ];
          
          secretPatterns.forEach((pattern, index) => {
            let match;
            while ((match = pattern.exec(code)) !== null) {
              violations.push({
                id: `hardcoded-secret-${index}-${match.index}`,
                rule: 'no-hardcoded-secrets',
                type: SecureCodingRuleType.CRYPTOGRAPHY,
                severity: 'critical',
                message: 'Hardcoded secret detected',
                location: 'code',
                code: match[0],
                fix: 'Use environment variables or secure configuration',
                detectedAt: Date.now(),
              });
            }
          });
          
          return violations;
        },
        enabled: true,
      },
      {
        id: 'secure-random-generation',
        name: 'Use secure random generation',
        type: SecureCodingRuleType.CRYPTOGRAPHY,
        severity: 'medium',
        description: 'Use cryptographically secure random number generation',
        validator: (code: string) => {
          const violations: SecureCodingViolation[] = [];
          const insecureRandomPattern = /Math\.random\(\)/g;
          const secureRandomPattern = /(crypto\.getRandomValues|secureRandom)/;
          
          let match;
          while ((match = insecureRandomPattern.exec(code)) !== null) {
            const contextStart = Math.max(0, match.index - 100);
            const contextEnd = Math.min(code.length, match.index + 100);
            const context = code.substring(contextStart, contextEnd);
            
            if (!secureRandomPattern.test(context)) {
              violations.push({
                id: `insecure-random-${match.index}`,
                rule: 'secure-random-generation',
                type: SecureCodingRuleType.CRYPTOGRAPHY,
                severity: 'medium',
                message: 'Insecure random number generation detected',
                location: 'code',
                code: match[0],
                fix: 'Use crypto.getRandomValues() or secureRandom utility',
                detectedAt: Date.now(),
              });
            }
          }
          
          return violations;
        },
        enabled: true,
      },
      {
        id: 'no-console-log-in-production',
        name: 'No console.log in production',
        type: SecureCodingRuleType.LOGGING,
        severity: 'low',
        description: 'console.log statements can expose sensitive information',
        pattern: /console\.log\(/g,
        enabled: true,
      },
      {
        id: 'validate-user-input',
        name: 'Validate user input',
        type: SecureCodingRuleType.INPUT_VALIDATION,
        severity: 'high',
        description: 'All user input should be validated',
        validator: (code: string) => {
          const violations: SecureCodingViolation[] = [];
          const inputSources = [
            /document\.getElementById\([^)]+\)\.value/g,
            /event\.target\.value/g,
            /formData\.get\(/g,
            /URLSearchParams/g,
          ];
          
          inputSources.forEach((pattern, index) => {
            let match;
            while ((match = pattern.exec(code)) !== null) {
              const contextStart = Math.max(0, match.index - 50);
              const contextEnd = Math.min(code.length, match.index + 200);
              const context = code.substring(contextStart, contextEnd);
              
              // Check if validation is present nearby
              if (!/validate|sanitize|escape|filter/.test(context)) {
                violations.push({
                  id: `unvalidated-input-${index}-${match.index}`,
                  rule: 'validate-user-input',
                  type: SecureCodingRuleType.INPUT_VALIDATION,
                  severity: 'high',
                  message: 'User input used without validation',
                  location: 'code',
                  code: match[0],
                  fix: 'Add input validation using validation schemas or sanitization',
                  detectedAt: Date.now(),
                });
              }
            }
          });
          
          return violations;
        },
        enabled: true,
      },
      {
        id: 'secure-error-handling',
        name: 'Secure error handling',
        type: SecureCodingRuleType.ERROR_HANDLING,
        severity: 'medium',
        description: 'Error messages should not expose sensitive information',
        validator: (code: string) => {
          const violations: SecureCodingViolation[] = [];
          const errorExposurePattern = /catch\s*\([^)]*\)\s*\{[^}]*console\.log\([^}]*error[^}]*\}/g;
          
          let match;
          while ((match = errorExposurePattern.exec(code)) !== null) {
            violations.push({
              id: `error-exposure-${match.index}`,
              rule: 'secure-error-handling',
              type: SecureCodingRuleType.ERROR_HANDLING,
              severity: 'medium',
              message: 'Error information may be exposed to console',
              location: 'code',
              code: match[0],
              fix: 'Use secure logging and avoid exposing error details',
              detectedAt: Date.now(),
            });
          }
          
          return violations;
        },
        enabled: true,
      },
      {
        id: 'no-sql-concatenation',
        name: 'No SQL string concatenation',
        type: SecureCodingRuleType.INPUT_VALIDATION,
        severity: 'critical',
        description: 'SQL queries should use parameterized statements',
        pattern: /SELECT.*\+.*FROM|INSERT.*\+.*INTO|UPDATE.*\+.*SET|DELETE.*\+.*FROM/gi,
        enabled: true,
      },
      {
        id: 'secure-cookie-settings',
        name: 'Secure cookie settings',
        type: SecureCodingRuleType.SESSION_MANAGEMENT,
        severity: 'medium',
        description: 'Cookies should have secure attributes',
        validator: (code: string) => {
          const violations: SecureCodingViolation[] = [];
          const cookiePattern = /document\.cookie\s*=\s*[^;]*(;|$)/g;
          
          let match;
          while ((match = cookiePattern.exec(code)) !== null) {
            const cookieValue = match[0];
            
            if (!cookieValue.includes('Secure') || 
                !cookieValue.includes('HttpOnly') || 
                !cookieValue.includes('SameSite')) {
              violations.push({
                id: `insecure-cookie-${match.index}`,
                rule: 'secure-cookie-settings',
                type: SecureCodingRuleType.SESSION_MANAGEMENT,
                severity: 'medium',
                message: 'Cookie missing security attributes',
                location: 'code',
                code: cookieValue,
                fix: 'Add Secure, HttpOnly, and SameSite attributes',
                detectedAt: Date.now(),
              });
            }
          }
          
          return violations;
        },
        enabled: true,
      },
      {
        id: 'no-insecure-protocols',
        name: 'No insecure protocols',
        type: SecureCodingRuleType.COMMUNICATION,
        severity: 'high',
        description: 'Use HTTPS instead of HTTP for external requests',
        pattern: /['"]http:\/\/[^'"]*['"]/g,
        enabled: true,
      },
    ];
    
    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }
  
  // Analyze code for security violations
  analyzeCode(code: string, filename?: string): SecureCodingViolation[] {
    const violations: SecureCodingViolation[] = [];
    
    this.rules.forEach(rule => {
      if (!rule.enabled) return;
      
      try {
        if (rule.validator) {
          // Use custom validator
          const ruleViolations = rule.validator(code);
          violations.push(...ruleViolations.map(v => ({
            ...v,
            location: filename || v.location,
          })));
        } else if (rule.pattern) {
          // Use regex pattern
          let match;
          while ((match = rule.pattern.exec(code)) !== null) {
            const lines = code.substring(0, match.index).split('\n');
            const line = lines.length;
            const column = lines[lines.length - 1].length + 1;
            
            violations.push({
              id: `${rule.id}-${match.index}`,
              rule: rule.id,
              type: rule.type,
              severity: rule.severity,
              message: rule.description,
              location: filename || 'code',
              line,
              column,
              code: match[0],
              detectedAt: Date.now(),
            });
          }
        }
      } catch (error) {
        securityLogger.log(
          SecurityEventType.ERROR,
          SecurityEventSeverity.LOW,
          { action: 'Secure coding rule analysis failed', rule: rule.id, error: (error as Error).message }
        );
      }
    });
    
    // Store violations
    this.violations.push(...violations);
    
    // Log significant violations
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      securityLogger.log(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecurityEventSeverity.HIGH,
        {
          action: 'Critical secure coding violations detected',
          filename: filename || 'unknown',
          criticalCount: criticalViolations.length,
          totalCount: violations.length,
        }
      );
    }
    
    return violations;
  }
  
  // Add custom rule
  addRule(rule: SecureCodingRule): void {
    this.rules.set(rule.id, rule);
  }
  
  // Remove rule
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }
  
  // Enable/disable rule
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }
  
  // Get all rules
  getAllRules(): SecureCodingRule[] {
    return Array.from(this.rules.values());
  }
  
  // Get rules by type
  getRulesByType(type: SecureCodingRuleType): SecureCodingRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.type === type);
  }
  
  // Get all violations
  getAllViolations(): SecureCodingViolation[] {
    return this.violations;
  }
  
  // Get violations by severity
  getViolationsBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): SecureCodingViolation[] {
    return this.violations.filter(v => v.severity === severity);
  }
  
  // Clear violations
  clearViolations(): void {
    this.violations = [];
  }
  
  // Generate security report
  generateReport(): {
    summary: {
      totalViolations: number;
      criticalViolations: number;
      highViolations: number;
      mediumViolations: number;
      lowViolations: number;
      rulesCovered: number;
      enabledRules: number;
    };
    violations: SecureCodingViolation[];
    topViolatedRules: Array<{ rule: string; count: number }>;
  } {
    const violations = this.getAllViolations();
    const rules = this.getAllRules();
    
    const summary = {
      totalViolations: violations.length,
      criticalViolations: violations.filter(v => v.severity === 'critical').length,
      highViolations: violations.filter(v => v.severity === 'high').length,
      mediumViolations: violations.filter(v => v.severity === 'medium').length,
      lowViolations: violations.filter(v => v.severity === 'low').length,
      rulesCovered: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
    };
    
    // Count violations by rule
    const ruleViolationCounts = new Map<string, number>();
    violations.forEach(v => {
      const count = ruleViolationCounts.get(v.rule) || 0;
      ruleViolationCounts.set(v.rule, count + 1);
    });
    
    const topViolatedRules = Array.from(ruleViolationCounts.entries())
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      summary,
      violations,
      topViolatedRules,
    };
  }
}

// Code quality metrics
export interface CodeQualityMetrics {
  linesOfCode: number;
  complexity: number;
  duplicateLines: number;
  testCoverage?: number;
  securityScore: number;
  maintainabilityIndex: number;
}

// Code quality analyzer
export class CodeQualityAnalyzer {
  private static instance: CodeQualityAnalyzer;
  
  private constructor() {}
  
  static getInstance(): CodeQualityAnalyzer {
    if (!CodeQualityAnalyzer.instance) {
      CodeQualityAnalyzer.instance = new CodeQualityAnalyzer();
    }
    return CodeQualityAnalyzer.instance;
  }
  
  // Analyze code quality
  analyzeQuality(code: string): CodeQualityMetrics {
    const lines = code.split('\n');
    const linesOfCode = lines.filter(line => 
      line.trim().length > 0 && !line.trim().startsWith('//')
    ).length;
    
    // Calculate cyclomatic complexity (simplified)
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?'];
    let complexity = 1; // Base complexity
    
    complexityKeywords.forEach(keyword => {
      const matches = code.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      if (matches) {
        complexity += matches.length;
      }
    });
    
    // Check for duplicate lines (simplified)
    const lineMap = new Map<string, number>();
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 5) { // Ignore very short lines
        lineMap.set(trimmed, (lineMap.get(trimmed) || 0) + 1);
      }
    });
    
    const duplicateLines = Array.from(lineMap.values())
      .filter(count => count > 1)
      .reduce((sum, count) => sum + count - 1, 0);
    
    // Calculate security score based on violations
    const enforcer = SecureCodingEnforcer.getInstance();
    const violations = enforcer.analyzeCode(code);
    const criticalPenalty = violations.filter(v => v.severity === 'critical').length * 20;
    const highPenalty = violations.filter(v => v.severity === 'high').length * 10;
    const mediumPenalty = violations.filter(v => v.severity === 'medium').length * 5;
    const lowPenalty = violations.filter(v => v.severity === 'low').length * 1;
    
    const totalPenalty = criticalPenalty + highPenalty + mediumPenalty + lowPenalty;
    const securityScore = Math.max(0, 100 - totalPenalty);
    
    // Calculate maintainability index (simplified version of Microsoft's formula)
    const halsteadVolume = linesOfCode * Math.log2(linesOfCode || 1); // Simplified
    const maintainabilityIndex = Math.max(0,
      171 - 5.2 * Math.log(halsteadVolume) - 0.23 * complexity - 16.2 * Math.log(linesOfCode)
    );
    
    return {
      linesOfCode,
      complexity,
      duplicateLines,
      securityScore: Math.round(securityScore),
      maintainabilityIndex: Math.round(maintainabilityIndex),
    };
  }
}

// Export singletons
export const secureCodingEnforcer = SecureCodingEnforcer.getInstance();
export const codeQualityAnalyzer = CodeQualityAnalyzer.getInstance();