# Copilot Instructions for ViajaJunto

## Primary routing rules
- Treat [AGENTS.md](../AGENTS.md) as the repository entry point for task routing and role selection.
- Treat this file as the default policy layer for AI-assisted changes and repository guardrails.
- Route task-specific behavior through the specialized files in [.github/agents](agents), [.github/instructions](instructions), and [.github/skills](skills) when they are relevant to the requested work.
- Always consider the documentation in [docs](../docs) as part of the project baseline, especially for requirements, architecture, and design decisions.

## Project context
- This repository contains the NestJS backend for the ViajaJunto travel-planning application.
- The application is designed for collaborative trip planning, shared itineraries, budgeting, and trip reviews.
- Keep the source code, comments, tests, and documentation in English.
- Prefer clear, descriptive names and maintainable TypeScript patterns.

## Coding standards
- Use TypeScript with strict type checking and avoid implicit any.
- Prefer small, focused modules and classes instead of large monolithic files.
- Follow NestJS conventions: controllers, services, modules, DTOs, and validation.
- Use dependency injection and keep business logic in service classes.
- Keep API contracts explicit through DTOs and validation pipes.
- Use camelCase for variables and methods, PascalCase for classes and interfaces, and UPPER_CASE for constants.

## Architecture expectations
- Keep the application modular and domain-oriented.
- Separate business logic from HTTP concerns.
- Use descriptive module names such as `auth`, `trips`, `destinations`, `activities`, `budget`, and `reviews`.
- Preserve a clean layering model: controller -> service -> repository/domain logic.

## Testing expectations
- Write tests for new business logic and bug fixes.
- Prefer Vitest for unit and integration tests.
- Verify behavior with real inputs and avoid mock-only assertions.
- Keep tests readable and deterministic.

## Documentation expectations
- All project documentation must be written in English.
- Maintain consistency across README files, docs, ADRs, and API notes.
- Use concise language and provide enough context for future contributors.

## Instruction routing
- Backend implementation work should follow [.github/agents/backend-engineer.agent.md](agents/backend-engineer.agent.md).
- TypeScript coding conventions should follow [.github/instructions/typescript.instructions.md](instructions/typescript.instructions.md).
- NestJS workflow and conventions should follow [.github/skills/nestjs-development.md](skills/nestjs-development.md).

## Contribution guidelines
- Keep changes scoped and avoid unrelated refactors.
- Explain the intent of your change in commit messages and PR descriptions.
- Prefer maintainable solutions over clever shortcuts.
- When creating new code, ensure it follows the project name and domain language of ViajaJunto.
