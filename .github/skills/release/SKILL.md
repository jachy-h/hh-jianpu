# Release Skill - hh-jianpu Version Release

## Purpose
Automate the version release process for hh-jianpu monorepo project.

## Usage
Invoke this skill to release a new version. The skill will:
1. Check workspace status
2. Update version numbers in all package.json files
3. Update CHANGELOG.md
4. Run tests
5. Build the project
6. Create git commit and tag

## Parameters
- `version_type`: "patch" | "minor" | "major" (default: "patch")
- `new_version`: Optional explicit version string (e.g., "0.3.0")

## Files Modified
- `package.json` (root)
- `packages/core/package.json`
- `apps/web/package.json`
- `CHANGELOG.md`

## Commands Executed
```bash
# Run tests
cd packages/core && pnpm test -- --run

# Build project
pnpm build

# Git operations
git add .
git commit -m "chore: release v{VERSION}"
git tag "v{VERSION}"
```

## Post-Release Steps
After the skill completes, manually:
1. Push to remote: `git push origin main`
2. Push tags: `git push origin v{VERSION}`
3. Publish to npm (if applicable)

## Error Handling
- Stops if workspace has uncommitted changes (unless confirmed)
- Validates version type
- Fails fast on test or build errors
