# Integration Tests - Real OpenAI API

This directory contains integration tests that make **REAL** OpenAI API calls. These tests are designed for:

- Debugging model changes with real API behavior
- Cost and performance comparison between different models
- Validating API integration end-to-end
- Rich debugging output (tokens, cost, latency, quality metrics)

**Important**: Unlike the 282 mocked unit/E2E tests in the main test suite, these integration tests:
- **Cost money** (real API calls)
- **Run slowly** (real network latency)
- **Require valid API key** (OPENAI_API_KEY)
- **Run locally only** (not in CI)

---

## Prerequisites

### 1. OpenAI API Key

Set your OpenAI API key in your environment:

```bash
export OPENAI_API_KEY=sk-...
```

**Important**: Tests will automatically skip if:
- No OPENAI_API_KEY is set
- API key contains 'test', 'mock', or 'fake'

### 2. Optional: Model Selection

By default, tests use `gpt-4o-mini`. To test with a different model:

```bash
export OPENAI_MODEL=gpt-5.4
# or
export OPENAI_MODEL=gpt-5.4-mini
# or
export OPENAI_MODEL=gpt-5-nano
```

---

## Running Tests

### Vitest Integration Tests (API-level)

Test the API routes directly with real OpenAI calls:

```bash
# Run all Vitest integration tests
npm run test:integration

# Run with watch mode (auto-rerun on changes)
npm run test:integration:watch

# Run with UI
npm run test:integration:ui
```

**11 tests total**:
- 5 chat API tests (prompt validation, markdown, multi-paragraph, lists, latency)
- 6 block action tests (translate, expand, ELI5, example, rewrite, ask)

### Playwright E2E Integration Tests (Browser-level)

Test the full application flow in a real browser:

```bash
# Run all E2E integration tests
npm run test:e2e:integration

# Run with UI
npm run test:e2e:integration:ui

# Run with debug mode (step through tests)
npm run test:e2e:integration:debug
```

**5 tests total**:
- 3 chat flow tests (create thread, markdown parsing, multi-turn conversation)
- 2 block action tests (ELI5 transformation, translate transformation)

---

## Test Reports

### Vitest Reports

After running Vitest integration tests, reports are saved to:

```
tests-integration/reports/
├── integration-test-report-YYYY-MM-DDTHH-MM-SS.json
└── latest.json
```

**Report includes**:
- Total tests and API calls
- Total cost and tokens
- Average/min/max latency
- Per-call metrics (tokens, cost, latency, quality)
- OpenAI metadata (response ID, finish reason, system fingerprint)

**Example report snippet**:
```json
{
  "totalTests": 11,
  "totalApiCalls": 11,
  "totalCost": 0.0023,
  "totalTokens": 4521,
  "avgLatencyMs": 1245,
  "minLatencyMs": 834,
  "maxLatencyMs": 2156,
  "calls": [
    {
      "testName": "Simple Prompt",
      "model": "gpt-4o-mini",
      "totalTokens": 412,
      "estimatedCost": 0.00019,
      "latencyMs": 1123,
      ...
    }
  ]
}
```

### Playwright Reports

Playwright integration tests generate HTML reports in:

```
playwright-report-integration/
```

View the report:
```bash
npx playwright show-report playwright-report-integration
```

---

## Cost Estimation

### Model Pricing (per 1M tokens, January 2025)

| Model | Input | Output | Typical Test Run |
|-------|-------|--------|-----------------|
| gpt-4o-mini | $0.15 | $0.60 | ~$0.002-0.005 |
| gpt-4o | $2.50 | $10.00 | ~$0.03-0.08 |
| gpt-4-turbo | $10.00 | $30.00 | ~$0.12-0.30 |
| gpt-3.5-turbo | $0.50 | $1.50 | ~$0.005-0.015 |

**Note**: Full integration test suite (11 Vitest + 5 Playwright) typically uses ~5,000-8,000 tokens total.

### Cost Examples

**gpt-4o-mini** (default):
- Full Vitest suite: ~$0.002-0.004
- Full E2E suite: ~$0.001-0.002
- Total: **~$0.005 per full run**

**gpt-4o**:
- Full Vitest suite: ~$0.02-0.05
- Full E2E suite: ~$0.01-0.03
- Total: **~$0.05 per full run**

**gpt-4-turbo**:
- Full Vitest suite: ~$0.08-0.20
- Full E2E suite: ~$0.04-0.10
- Total: **~$0.20 per full run**

---

## Model Comparison Workflow

Compare performance, cost, and quality across different models:

### Step 1: Run with gpt-4o-mini (baseline)

```bash
export OPENAI_MODEL=gpt-4o-mini
npm run test:integration
```

Check report:
```bash
cat tests-integration/reports/latest.json
```

Note the metrics:
- totalCost: $0.0023
- avgLatencyMs: 1245ms
- Quality metrics (hasMarkdown, blockCount, parseErrors)

### Step 2: Run with gpt-4o (comparison)

```bash
export OPENAI_MODEL=gpt-4o
npm run test:integration
```

Check report:
```bash
cat tests-integration/reports/latest.json
```

### Step 3: Compare Results

Compare the two reports:

```bash
# Get latest two reports
ls -lt tests-integration/reports/ | head -3

# Compare cost
# gpt-4o-mini: ~$0.002
# gpt-4o: ~$0.03 (15x more expensive)

# Compare latency
# gpt-4o-mini: ~1200ms avg
# gpt-4o: ~1500ms avg (slightly slower)

# Compare quality
# Check blockCount, hasMarkdown, parseErrors
# Generally similar quality, but gpt-4o may handle edge cases better
```

### Step 4: Decide on Model

Based on comparison:
- **Use gpt-4o-mini** if: cost-sensitive, quality is good enough
- **Use gpt-4o** if: need best quality, cost not a concern
- **Use gpt-3.5-turbo** if: need cheapest option, quality acceptable

---

## Debugging with Integration Tests

### Use Case 1: Investigate Model Behavior Change

```bash
# Current model
export OPENAI_MODEL=gpt-4o-mini
npm run test:integration

# New model
export OPENAI_MODEL=gpt-4o
npm run test:integration

# Compare reports to see behavior differences
```

### Use Case 2: Validate API Changes

After modifying API routes:

```bash
npm run test:integration
# Check that all tests pass
# Check report for unexpected cost/latency changes
```

### Use Case 3: Debug Markdown Parsing Issues

```bash
# Run specific test
npm run test:integration -- chat.integration.test.ts

# Check console output for actual markdown returned
# Check report for blockCount and parseErrors
```

---

## Test Structure

### Vitest Tests

Located in `tests-integration/api/`:

- **chat.integration.test.ts** - Chat API tests
  - Simple prompt validation
  - Markdown with code blocks
  - Multi-paragraph response
  - Technical prompt with lists
  - Latency benchmark

- **block-action.integration.test.ts** - Block action API tests
  - Translate (verify Chinese characters)
  - Expand (longer response validation)
  - ELI5 (simple language check)
  - Example (relevant example validation)
  - Rewrite (preserve meaning, emphasis)
  - Ask (answer relevance)

### Playwright Tests

Located in `e2e/tests-integration/`:

- **chat-real.spec.ts** - E2E chat flow tests
  - Create thread + receive real AI response
  - Parse real markdown correctly
  - Multi-turn conversation

- **block-actions-real.spec.ts** - E2E block action tests
  - Real ELI5 transformation
  - Real Translate transformation (verify Chinese)

---

## Utilities

### Test Reporter

`tests-integration/utils/test-reporter.ts` - Captures and logs:
- Token usage (prompt, completion, total)
- Estimated cost
- Response latency
- Response quality (markdown, block count, parse errors)
- OpenAI metadata

### API Helpers

`tests-integration/utils/api-helpers.ts` - Provides:
- `shouldRunIntegrationTests()` - Check if valid API key exists
- `callChatApiWithMetrics()` - Make chat API call with metrics
- `callBlockActionApiWithMetrics()` - Make block action call with metrics

---

## Troubleshooting

### Tests are skipped

**Symptom**: All tests show "⏭️ Skipping integration tests"

**Solution**: Ensure OPENAI_API_KEY is set:
```bash
echo $OPENAI_API_KEY
# Should show: sk-...

# If not set:
export OPENAI_API_KEY=sk-your-actual-key
```

### Tests fail with "OpenAI API key not found"

**Symptom**: Tests run but fail with API key error

**Solution**: Check that key is valid and not expired:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Costs are higher than expected

**Symptom**: Report shows unexpectedly high costs

**Solution**: Check which model is being used:
```bash
echo $OPENAI_MODEL
# If not set, defaults to gpt-4o-mini

# If set to gpt-4o or gpt-4-turbo, costs will be much higher
# To reset:
unset OPENAI_MODEL
```

### Tests timeout

**Symptom**: Tests fail with timeout errors

**Solution**: Increase timeout in test configs:
- Vitest: Edit `vitest.integration.config.ts` → `testTimeout`
- Playwright: Edit `playwright.integration.config.ts` → `timeout`

---

## Best Practices

1. **Run integration tests locally only** - Not in CI (expensive)
2. **Use gpt-4o-mini for regular testing** - Cheapest option
3. **Use gpt-4o for final validation** - Before major releases
4. **Review reports after each run** - Check for cost/quality regressions
5. **Run tests sequentially** - Already configured to avoid rate limits
6. **Keep tests focused** - Short prompts, clear assertions
7. **Monitor costs** - Review monthly OpenAI bill

---

## FAQ

**Q: Can I run these tests in CI?**

A: Not recommended. These tests cost money and require real API keys. Keep them for local validation only.

**Q: How often should I run integration tests?**

A: Run them:
- Before major releases
- When changing models
- When modifying API routes
- When investigating API issues

**Q: Can I run just one test?**

A: Yes!
```bash
# Vitest
npm run test:integration -- chat.integration.test.ts

# Playwright
npm run test:e2e:integration -- chat-real.spec.ts
```

**Q: How do I reduce costs?**

A:
- Use gpt-4o-mini (default)
- Run specific tests instead of full suite
- Use watch mode sparingly
- Review reports to identify expensive tests

**Q: What if I don't have an API key?**

A: All integration tests will automatically skip. The 282 mocked tests in the main suite will still run and provide full coverage.

---

## Summary

**Integration tests complement, not replace, mocked tests:**

| Type | Count | Speed | Cost | Where | Purpose |
|------|-------|-------|------|-------|---------|
| Mocked Unit/E2E | 282 | Fast | Free | CI + Local | Daily development |
| Integration | 16 | Slow | $$$ | Local only | Model validation |

**Total test coverage**: 298 tests (282 mocked + 16 integration)
