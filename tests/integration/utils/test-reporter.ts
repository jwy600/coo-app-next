import fs from 'fs';
import path from 'path';
import { calculateCost } from '@/lib/config/openai';

export interface ApiCallMetrics {
  testName: string;
  apiEndpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  responseLength: number;
  hasMarkdown: boolean;
  blockCount: number;
  parseErrors: number;
  responseId?: string;
  finishReason?: string;
  systemFingerprint?: string;
  timestamp: string;
}

export interface TestReport {
  totalTests: number;
  totalApiCalls: number;
  totalCost: number;
  totalTokens: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  calls: ApiCallMetrics[];
  generatedAt: string;
}

class TestReporter {
  private metrics: ApiCallMetrics[] = [];
  private reportDir: string;

  constructor() {
    this.reportDir = path.join(process.cwd(), 'tests-integration', 'reports');
    this.ensureReportDir();
  }

  private ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  recordApiCall(metrics: ApiCallMetrics) {
    this.metrics.push(metrics);
    this.logMetrics(metrics);
  }

  private logMetrics(metrics: ApiCallMetrics) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 ${metrics.testName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🤖 Model: ${metrics.model}`);
    console.log(`⏱️  Latency: ${metrics.latencyMs}ms`);
    console.log(`💬 Tokens: ${metrics.totalTokens} (prompt: ${metrics.promptTokens}, completion: ${metrics.completionTokens})`);
    console.log(`💰 Cost: $${metrics.estimatedCost.toFixed(6)}`);
    console.log(`📝 Response: ${metrics.responseLength} chars, ${metrics.blockCount} blocks`);
    console.log(`✨ Quality: ${metrics.hasMarkdown ? '✅ Markdown' : '❌ No markdown'}, ${metrics.parseErrors} errors`);
    if (metrics.responseId) {
      console.log(`🔑 Response ID: ${metrics.responseId}`);
    }
    if (metrics.finishReason) {
      console.log(`🏁 Finish: ${metrics.finishReason}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  generateReport(): TestReport {
    const totalCost = this.metrics.reduce((sum, m) => sum + m.estimatedCost, 0);
    const totalTokens = this.metrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const latencies = this.metrics.map(m => m.latencyMs);
    const avgLatency = latencies.length > 0
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      : 0;

    const report: TestReport = {
      totalTests: new Set(this.metrics.map(m => m.testName)).size,
      totalApiCalls: this.metrics.length,
      totalCost,
      totalTokens,
      avgLatencyMs: Math.round(avgLatency),
      minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : 0,
      maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
      calls: this.metrics,
      generatedAt: new Date().toISOString(),
    };

    return report;
  }

  saveReport() {
    const report = this.generateReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `integration-test-report-${timestamp}.json`;
    const filepath = path.join(this.reportDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    // Also save as latest
    const latestPath = path.join(this.reportDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    this.logSummary(report, filepath);
  }

  private logSummary(report: TestReport, filepath: string) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║         INTEGRATION TEST REPORT SUMMARY                ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Total Tests:       ${String(report.totalTests).padStart(4)} tests                         ║`);
    console.log(`║ Total API Calls:   ${String(report.totalApiCalls).padStart(4)} calls                        ║`);
    console.log(`║ Total Tokens:      ${String(report.totalTokens).padStart(6)} tokens                      ║`);
    console.log(`║ Total Cost:        $${report.totalCost.toFixed(4).padStart(6)}                          ║`);
    console.log(`║ Avg Latency:       ${String(report.avgLatencyMs).padStart(5)}ms                           ║`);
    console.log(`║ Min/Max Latency:   ${String(report.minLatencyMs).padStart(5)}ms / ${String(report.maxLatencyMs).padStart(5)}ms                  ║`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Report saved to:                                       ║`);
    console.log(`║ ${filepath.substring(filepath.length - 54).padEnd(54)} ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');
  }

  reset() {
    this.metrics = [];
  }
}

// Singleton instance
export const testReporter = new TestReporter();

// Helper to analyze response quality
export function analyzeResponseQuality(text: string): {
  hasMarkdown: boolean;
  blockCount: number;
  parseErrors: number;
} {
  const hasMarkdown = /[#*`\-\[\]]/.test(text);
  // Approximate "blocks" by paragraph breaks for reporting purposes only.
  const blockCount = text.trim() ? text.trim().split(/\n{2,}/).length : 0;
  return { hasMarkdown, blockCount, parseErrors: 0 };
}
