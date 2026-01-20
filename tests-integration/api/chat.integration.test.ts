import { describe, test, expect, afterAll } from 'vitest';
import { shouldRunIntegrationTests, callChatApiWithMetrics } from '../utils/api-helpers';
import { testReporter } from '../utils/test-reporter';

const SKIP_TESTS = !shouldRunIntegrationTests();

describe.skipIf(SKIP_TESTS)('Chat API Integration Tests', () => {
  afterAll(() => {
    // Save report after all tests complete
    testReporter.saveReport();
  });

  test('should handle simple prompt and return valid response', async () => {
    const result = await callChatApiWithMetrics(
      'Simple Prompt',
      'What is the capital of France?'
    );

    // Verify response structure
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);

    // Verify metrics
    expect(result.metrics.totalTokens).toBeGreaterThan(0);
    expect(result.metrics.promptTokens).toBeGreaterThan(0);
    expect(result.metrics.completionTokens).toBeGreaterThan(0);
    expect(result.metrics.estimatedCost).toBeGreaterThan(0);
    expect(result.metrics.latencyMs).toBeGreaterThan(0);

    // Verify response contains expected content
    expect(result.text.toLowerCase()).toContain('paris');
  });

  test('should generate markdown with code blocks', async () => {
    const result = await callChatApiWithMetrics(
      'Markdown with Code',
      'Write a simple Python function that adds two numbers. Include a code block.'
    );

    // Verify response has markdown
    expect(result.metrics.hasMarkdown).toBe(true);

    // Verify code block is present
    expect(result.text).toMatch(/```/);

    // Verify blocks were parsed
    expect(result.metrics.blockCount).toBeGreaterThan(0);
    expect(result.metrics.parseErrors).toBe(0);
  });

  test('should generate multi-paragraph response', async () => {
    const result = await callChatApiWithMetrics(
      'Multi-paragraph Response',
      'Explain what React is in 3 paragraphs.'
    );

    // Verify multiple blocks/paragraphs
    expect(result.metrics.blockCount).toBeGreaterThanOrEqual(3);
    expect(result.metrics.parseErrors).toBe(0);

    // Verify response length is substantial
    expect(result.text.length).toBeGreaterThan(200);

    // Verify React is mentioned
    expect(result.text.toLowerCase()).toContain('react');
  });

  test('should handle technical prompt with lists', async () => {
    const result = await callChatApiWithMetrics(
      'Technical with Lists',
      'List 5 benefits of using TypeScript. Use a bullet list.'
    );

    // Verify markdown formatting (lists use -, *, or numbers)
    expect(result.metrics.hasMarkdown).toBe(true);

    // Verify list markers are present
    const hasListMarkers = /[-*]|\d\./.test(result.text);
    expect(hasListMarkers).toBe(true);

    // Verify TypeScript is mentioned
    expect(result.text.toLowerCase()).toContain('typescript');

    // Verify blocks were parsed
    expect(result.metrics.blockCount).toBeGreaterThan(0);
  });

  test('should benchmark real API latency', async () => {
    const result = await callChatApiWithMetrics(
      'Latency Benchmark',
      'Explain photosynthesis in one sentence.'
    );

    // Verify latency is recorded
    expect(result.metrics.latencyMs).toBeGreaterThan(0);

    // Real API calls should take at least 100ms
    expect(result.metrics.latencyMs).toBeGreaterThan(100);

    // Should complete within 30 seconds (generous upper bound)
    expect(result.metrics.latencyMs).toBeLessThan(30000);

    // Log latency for comparison
    console.log(`Real API latency: ${result.metrics.latencyMs}ms`);
  });
});

// If tests are skipped, log why
if (SKIP_TESTS) {
  console.log('⏭️  Skipping chat integration tests: No valid OPENAI_API_KEY found');
  console.log('   Set OPENAI_API_KEY environment variable to run these tests');
}
