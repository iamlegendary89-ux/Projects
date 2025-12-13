# SmartMatch Development Rules & Best Practices

## 🧭 Engineering Philosophy

SmartMatch engineering is guided by one principle: **build software that stands the test of time — scalable, reliable, and maintainable.**

### Core Principles

- **Predictable**: Every system must behave deterministically under defined conditions.
- **Observable**: Every workflow is measurable, logged, and testable.
- **Evolvable**: Architecture must invite change, not resist it.
- **Clarity over cleverness**: Readable code beats "smart" code every time.
- **Automation as a teammate**: Enforce standards and checks through CI, not manual policing.

## 📋 Code Quality Standards

### 🎯 Clean Code Principles

| Principle | Enforcement | Description |
|-----------|-------------|-------------|
| Single Responsibility | 🔒 Mandatory | Each class/function serves one clear purpose |
| Open/Closed | ⚙️ Recommended | Open for extension, closed for modification |
| Liskov Substitution | ⚙️ Recommended | Subtypes must be substitutable for base types |
| Interface Segregation | ⚙️ Recommended | Clients depend only on methods they use |
| Dependency Inversion | 🔒 Mandatory | High-level modules depend on abstractions, not implementations |

### 🚀 Modern TypeScript Best Practices

#### Type Safety (100% Strict)
```typescript
interface User {
  readonly id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function processUser(user: User): string {
  return user.name; // Type safe
}
```

🔒 **Mandatory**: Never use `any`. Always use strict mode and explicit interfaces.

#### Interface Design

Use interfaces for contracts, generics for reusability, and discriminated unions for safe control flow.

```typescript
interface IService {
  execute(input: Input): AsyncResult<Output>;
}

type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

#### Error Handling

Use railway-oriented error flow and contextual custom errors.

```typescript
async function processData(input: Input): AsyncResult<Output> {
  const validation = validateInput(input);
  if (!validation.success) return validation;
  return await processValidatedData(validation.data);
}
```

### ⚡ Performance & Efficiency

#### Memory Management

Use streaming, lazy evaluation, and cleanup patterns.

```typescript
async function* processLargeFile(filePath: string): AsyncIterable<Chunk> {
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) yield processChunk(chunk);
}
```

#### Algorithm Optimization

Prefer Map, Set, and WeakMap over arrays for lookups.

Use caching and lazy initialization for performance-critical operations.

**Measure before optimizing.**

### 🏗️ Architecture Patterns

#### Clean Architecture Layers
```
├── Domain (Entities, Value Objects)
├── Application (Use Cases, Services)
├── Infrastructure (Persistence, APIs)
└── Presentation (CLI, API, UI)
```

🔒 **Mandatory**: Each layer depends only inward. No circular imports.

#### Dependency Injection

Program to interfaces, inject dependencies in constructors, and avoid direct instantiation.

### 🧱 SOLID Implementation

Use strategy patterns and validators to separate concerns and keep modules extensible.

### 📝 Code Style & Conventions

#### Naming Conventions

| Type | Convention |
|------|------------|
| Classes | PascalCase |
| Interfaces | PascalCase with I prefix |
| Types | PascalCase |
| Functions | camelCase |
| Variables | camelCase |
| Constants | UPPER_SNAKE_CASE |
| Private members | _camelCase |

#### File Organization
```
src/
├── core/           # Domain entities, types
├── services/       # Application services
├── infrastructure/ # External dependencies
├── processors/     # Data processing
├── orchestration/  # Workflow coordination
└── cli/            # Command-line interface
```

⚙️ **Recommended**: Keep files <300 lines, modules <1000 lines.

### 🧪 Testing Standards

#### Structure

Tests follow Arrange–Act–Assert pattern. Each use case should have success, error, and edge tests.

#### Coverage

- **Branches**: ≥ 80%
- **Functions**: ≥ 80%
- **Lines**: ≥ 80%
- **Statements**: ≥ 80%

#### Test Philosophy

🔒 **Mandatory**: Tests are documentation. No feature is "done" without a test.

### 🔒 Security Best Practices

#### Input Validation

All external input must be validated via schemas (e.g., Joi, Zod).

#### Secure Defaults

Set safe configuration defaults and sanitize all user inputs.

#### Dependency Security

Run automated dependency audits weekly.

Never import unverified or deprecated packages.

### 📊 Performance Standards

| Metric | Target | Enforcement |
|--------|--------|-------------|
| API Response | <500ms (P95) | 🔒 |
| DB Query | <100ms (P95) | ⚙️ |
| Memory Usage | <256MB/container | ⚙️ |
| Throughput | 1000+ ops/sec | ⚙️ |

### 🔍 Code Review & Quality Control

#### PR Review Scoring Matrix

| Category | Weight | Target |
|----------|--------|--------|
| Type Safety | 20% | No `any`, strict TS |
| Testing | 25% | 80%+ coverage |
| Maintainability | 20% | Cyclomatic <10 |
| Security | 15% | Input validated |
| Performance | 10% | Meets thresholds |
| Documentation | 10% | Clear JSDoc |

A PR must score ≥ 85% overall to pass without rework.

#### Quality Gates

- ✅ ESLint passes with zero errors
- ✅ TypeScript compiles with `--strict`
- ✅ Tests & coverage thresholds met
- ✅ Security and dependency scans pass
- ✅ No performance regressions

#### Refactor & Review Protocol

- Write tests before refactor.
- Measure complexity and performance before & after.
- Refactor one concern per PR.
- Summarize improvement metrics in commit message.
- Reviewers verify both behavior and readability.

### 📚 Documentation & Communication

#### Code Documentation

All public APIs and service functions require JSDoc/TSDoc headers.

```typescript
/**
 * Sends a welcome email to the user.
 * @param user - Target user
 * @returns Result of send operation
 */
```

#### Developer Documentation

Every new feature must include:

- README.md or docs/feature-name.md
- Example usage
- Test plan summary

### 🧱 Dependency Policy

| Category | Allowed | Notes |
|----------|---------|-------|
| Core | TypeScript, Zod, Axios, Day.js | Stable, supported |
| Logging | Winston, Pino | ✅ Preferred |
| Validation | Joi, Zod | ✅ Mandatory |
| Utility | Lodash (partial imports only) | Avoid if native available |
| Forbidden | Deprecated, eval-based libs | ❌ Disallowed |

### 💬 Review Culture Charter

SmartMatch reviews are built on trust, clarity, and growth.

- Critique code, not coders.
- Ask before assuming. Seek intent.
- Acknowledge good work as visibly as errors.
- Block only on mandatory standards.
- Suggest, don't command.

⚙️ **Recommended**: Every review should leave the code — and the coder — better than before.

### 🚀 Continuous Improvement

#### Core Metrics

| Metric | Target |
|--------|--------|
| Cyclomatic Complexity | <10/function |
| Maintainability Index | >80 |
| Technical Debt Ratio | <5% |
| Duplication | <3% |

#### Quality Dashboard

Track weekly:

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| Coverage | 80% | — | — |
| Complexity | <10 | — | — |
| Lint Warnings | 0 | — | — |
| Review Score | ≥85% | — | — |

#### Regular Practices

- Monthly dependency updates
- Quarterly security reviews
- Continuous refactoring of core modules
- Benchmarking key flows bi-monthly

### 🧩 Enforcement Levels

| Tag | Meaning |
|-----|---------|
| 🔒 Mandatory | Non-negotiable. Must pass before merge. |
| ⚙️ Recommended | Strongly advised for consistency and quality. |
| 💡 Advisory | Optional but valuable for maintainability or clarity. |

### 📚 Reference Materials

- **Clean Code** – Robert C. Martin
- **Clean Architecture** – Robert C. Martin
- **Domain-Driven Design** – Eric Evans
- **TypeScript Deep Dive** – Basarat Syed
- **Functional Programming in TypeScript** – Greg Young

---

## 🏁 Closing Principle

**"Code is not just for machines to execute — it's for humans to read, reason about, and improve."**

Every SmartMatch engineer is responsible for clarity, quality, and long-term sustainability in every line written.
