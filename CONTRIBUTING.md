## Revision history

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 14/09/2026 | 0.1 | Initial English version | ViajaJunto Team |

## How to contribute

- Review the existing issues in the repository to understand what needs attention.
- If you identify a new issue, create it using the repository issue templates.
- Create a branch based on `develop` and implement the fix or feature.
- For external contributors, work from a fork of the repository.
- When the implementation is ready, open a pull request for review.

## Branching policy

Our branching policy follows a simplified GitFlow model:

### `main`

This branch contains the production-ready and validated version of the project. Direct commit and push access are restricted to maintain stability and security.

### `develop`

This is the integration branch for new features and fixes. Stable releases are merged into `main` from `develop`.

### Feature branch

Feature branches are used for implementing improvements and fixes linked to issues.

```bash
<issue-number>-feature-name
```

Example:

```bash
12-user-authentication
```

### Hotfix branch

Hotfix branches are created from `main` to correct production issues.

```bash
hotfix_issue_description
```

## Commit policy

Commit messages must clearly describe the changes and should be written in English.

### Co-authorship

When pairing or co-developing, add co-author information to the commit message.

```text
Add user login screen

Co-authored-by: <name> <email@domain.com>
Co-authored-by: <name> <email@domain.com>
```
