---
name: coderabbit
description: >-
  AI-powered code review skill that performs deep analysis of code changes.
  Use when the user asks for a code review, wants to find bugs, security issues,
  performance problems, or wants a second opinion on code quality. Inspired by
  CodeRabbit's systematic review approach.
---

# CodeRabbit — AI Code Review Skill

## Overview
CodeRabbit performs systematic, multi-dimensional code review on any code changes
in the ABHI project. It catches bugs, security vulnerabilities, performance
issues, and style inconsistencies that quick glances miss.

## When to Activate
- User asks to "review this code", "check for bugs", "is this safe?"
- Before merging significant changes
- After refactoring sessions
- When debugging mysterious failures

## Review Dimensions

### 🔴 Critical (Must Fix)
- **Security**: XSS, injection, exposed secrets, unsafe eval, CORS misconfig
- **Data Loss**: Missing error handling, uncaught promises, race conditions
- **Memory Leaks**: Unsubscribed observables, detached DOM refs, orphaned listeners

### 🟡 Important (Should Fix)
- **Performance**: N+1 queries, unnecessary re-renders, missing memoization
- **Correctness**: Off-by-one, null pointer paths, incorrect type coercion
- **Concurrency**: Shared mutable state, missing locks, async ordering bugs

### 🔵 Suggestions (Nice to Have)
- **Readability**: Complex conditionals, magic numbers, poor naming
- **Maintainability**: Code duplication, missing abstractions, tight coupling
- **Testing**: Missing test coverage, brittle assertions, untested edge cases

## Review Protocol

1. **Scope**: Identify all changed/new files
2. **Context**: Understand the intent of the change
3. **Line-by-Line**: Walk through each change systematically
4. **Cross-File**: Check for inconsistencies across the changeset
5. **Integration**: Verify the change works with existing code
6. **Report**: Produce a structured review with severity levels

## Output Format

```markdown
## 🐰 CodeRabbit Review

### Summary
Brief description of what was reviewed and overall assessment.

### 🔴 Critical Issues
- **[file:line]** Description of issue + suggested fix

### 🟡 Important Issues
- **[file:line]** Description of issue + suggested fix

### 🔵 Suggestions
- **[file:line]** Description of suggestion

### ✅ What Looks Good
- Positive observations about the code

### 📊 Review Score: X/10
```

## ABHI-Specific Checks

### Angular / Frontend
- Proper `OnDestroy` cleanup of subscriptions
- No direct DOM manipulation (use Angular renderer)
- Three.js resources disposed in `ngOnDestroy`
- Theme service properly integrated
- Proper change detection strategy

### FastAPI / Backend
- Pydantic model validation on all endpoints
- Proper async/await usage
- SQLite WAL mode preserved
- Error responses follow API contract
- No blocking I/O in async handlers

### Three.js / 3D
- GPU resources properly disposed (geometry, material, texture)
- Animation frame cleanup
- Proper scene graph management
- No texture memory leaks

### Security
- No hardcoded API keys or secrets
- Proper input sanitization
- CORS configuration verified
- Authentication middleware present on protected routes

