# Project Agents

This repository follows a lightweight agent-based workflow for day-to-day engineering tasks.

## Routing overview
- Use [AGENTS.md](AGENTS.md) as the repository-level router for task selection and scope.
- Use [.github/copilot-instructions.md](.github/copilot-instructions.md) as the default repository policy and guardrails for all contributors and AI assistants.
- Route domain-specific guidance to specialized files under [.github/agents](.github/agents), [.github/instructions](.github/instructions), and [.github/skills](.github/skills).
- Also treat the documentation folder [docs](docs) as part of the project source of truth for requirements, architecture, and visual identity references.

## Default rules
- Always write code, tests, comments, and documentation in English.
- Keep the architecture aligned with NestJS and TypeScript best practices.
- Prefer clear domain-driven naming for modules and entities.
- Add tests for business rules, validation, and edge cases.

## Available agent roles

### Backend Engineer
Use this role for API design, controllers, services, DTOs, authentication, and validation.

### Test Engineer
Use this role for unit tests, integration tests, bug reproduction, and regression coverage.

### Documentation Maintainer
Use this role for README files, documentation pages, architecture notes, and onboarding content.

## Instruction routing
- Use [.github/agents/backend-engineer.agent.md](.github/agents/backend-engineer.agent.md) for server-side implementation work.
- Use [.github/instructions/typescript.instructions.md](.github/instructions/typescript.instructions.md) for TypeScript-specific coding rules.
- Use [.github/skills/nestjs-development.md](.github/skills/nestjs-development.md) for NestJS conventions and project delivery workflow.

## Working convention
- Keep tasks small and measurable.
- Avoid large mixed-purpose changes.
- Preserve modular structure and keep the codebase readable for new contributors.
