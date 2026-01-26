import { describe, test, expect, afterAll } from 'vitest';
import { shouldRunIntegrationTests, callBlockActionApiWithMetrics } from '../utils/api-helpers';
import { testReporter } from '../utils/test-reporter';

const SKIP_TESTS = !shouldRunIntegrationTests();

describe.skipIf(SKIP_TESTS)('Block Action API Integration Tests', () => {
  afterAll(() => {
    // Save report after all tests complete
    testReporter.saveReport();
  });

  test('should translate text to Chinese', async () => {
    const blockText = 'React is a JavaScript library for building user interfaces.';

    const result = await callBlockActionApiWithMetrics(
      'Translate Action',
      'translate',
      blockText
    );

    // Verify response exists
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);

    // Verify Chinese characters are present (Unicode range for Chinese)
    const hasChinese = /[\u4e00-\u9fff]/.test(result.text);
    expect(hasChinese).toBe(true);

    // Verify metrics
    expect(result.metrics.totalTokens).toBeGreaterThan(0);
    expect(result.metrics.estimatedCost).toBeGreaterThan(0);
  });

  test('should expand text with more detail', async () => {
    const blockText = 'TypeScript adds static typing to JavaScript.';

    const result = await callBlockActionApiWithMetrics(
      'Expand Action',
      'expand',
      blockText
    );

    // Verify response is longer than original
    expect(result.text.length).toBeGreaterThan(blockText.length);

    // Should be significantly expanded (at least 2x longer)
    expect(result.text.length).toBeGreaterThan(blockText.length * 2);

    // Verify TypeScript is mentioned
    expect(result.text.toLowerCase()).toContain('typescript');

    // Verify blocks were parsed
    expect(result.metrics.blockCount).toBeGreaterThan(0);
  });

  test('should explain like I\'m five', async () => {
    const blockText = 'Machine learning algorithms use statistical techniques to enable computers to improve at tasks with experience.';

    const result = await callBlockActionApiWithMetrics(
      'ELI5 Action',
      'eli5',
      blockText
    );

    // Verify response exists
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);

    // ELI5 should use simpler language (check for absence of complex terms)
    const hasComplexTerms = /statistical|algorithms|techniques/.test(result.text.toLowerCase());

    // Response should be easier to understand (subjective, but we can check it's different)
    expect(result.text).not.toBe(blockText);

    // Verify metrics
    expect(result.metrics.blockCount).toBeGreaterThan(0);
  });

  test('should provide relevant example', async () => {
    const blockText = 'Functions in JavaScript can be passed as arguments to other functions.';

    const result = await callBlockActionApiWithMetrics(
      'Example Action',
      'example',
      blockText
    );

    // Verify response exists and is substantial
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(20);

    // Example should contain code or concrete illustration
    const hasCodeOrExample = /function|=>|\(|\)/.test(result.text);
    expect(hasCodeOrExample).toBe(true);

    // Verify metrics
    expect(result.metrics.blockCount).toBeGreaterThan(0);
  });

  test('should rewrite text emphasizing highlighted phrases', async () => {
    const blockText = 'React uses a virtual DOM to efficiently update the user interface.';
    const highlightedPhrases = 'virtual DOM, efficiently';

    const result = await callBlockActionApiWithMetrics(
      'Rewrite Action',
      'rewrite',
      blockText,
      highlightedPhrases
    );

    // Verify response exists
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);

    // Response should be different from original
    expect(result.text).not.toBe(blockText);

    // Should still mention the key concepts
    expect(result.text.toLowerCase()).toMatch(/virtual dom|dom/);

    // Verify metrics
    expect(result.metrics.blockCount).toBeGreaterThan(0);
  });

  test('should answer question about selected text', async () => {
    const blockText = 'TypeScript is a superset of JavaScript that adds static typing. It compiles to plain JavaScript and can run anywhere JavaScript runs.';
    const question = 'What does TypeScript compile to?';

    const result = await callBlockActionApiWithMetrics(
      'Ask Action',
      'ask',
      blockText,
      question
    );

    // Verify response exists
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);

    // Answer should mention JavaScript
    expect(result.text.toLowerCase()).toContain('javascript');

    // Verify it's a relevant answer (not just repeating the question)
    expect(result.text.toLowerCase()).not.toBe(question.toLowerCase());

    // Verify metrics
    expect(result.metrics.blockCount).toBeGreaterThan(0);
  });
});

// If tests are skipped, log why
if (SKIP_TESTS) {
  console.log('⏭️  Skipping block action integration tests: No valid OPENAI_API_KEY found');
  console.log('   Set OPENAI_API_KEY environment variable to run these tests');
}
