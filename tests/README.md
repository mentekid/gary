# Testing Guide

## Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once (for CI)
npm run test:run

# Run only main process tests
npm run test:main

# Run only renderer tests
npm run test:renderer

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Verification Pipeline

Before committing or pushing code:

```bash
# Run lint + tests + build
npm run verify

# Same thing (for CI)
npm run ci
```

This runs:
1. **Lint** - TypeScript type checking
2. **Tests** - Full test suite
3. **Build** - Compile all code

## Test Structure

```
tests/
├── fixtures/
│   └── mock-vault/          # Test campaign data
├── setup/
│   └── renderer.ts          # Renderer test setup (mocks window.electron)
├── unit/
│   ├── agent/              # Agent controller tests
│   ├── renderer/           # React component & store tests
│   └── vault/              # File system & parsing tests
└── integration/            # End-to-end flow tests (future)
```

## Configuration

- **Main process tests**: `vitest.config.main.ts` (Node environment)
- **Renderer tests**: `vitest.config.renderer.ts` (happy-dom for React)
- **All tests**: `vitest.config.ts` (default)

## Writing Tests

Focus on **critical behaviors and edge cases**, not obvious string values:

✅ **Good tests:**
- State machine transitions (e.g., file state priority rules)
- Agentic loop behavior (e.g., newline injection after tool use)
- Recursive algorithms (e.g., tree building with deep nesting)
- Error handling and edge cases

❌ **Avoid:**
- Testing string content directly
- Testing framework behavior
- Testing things that are immediately obvious

## Coverage Goals

**Current coverage**: ~40-50% (focused on critical paths)

**Critical paths covered:**
- Message streaming pipeline (newline injection)
- File state tracking state machine
- Tree building algorithm
- Markdown frontmatter parsing
- Agentic loop with max turns

## Adding New Tests

1. Create test file next to the code or in `tests/unit/{domain}/`
2. Import from aliased paths: `@main`, `@renderer`, `@common`
3. Mock external dependencies (Electron, Anthropic SDK)
4. Test critical behaviors, not implementation details
5. Run `npm run verify` before committing
