# Contributing to clever-tools

This document provides comprehensive information about the CI/CD setup and development workflow for the clever-tools project.

## CI/CD Overview

The project uses GitHub Actions for a sophisticated, multi-platform CI/CD pipeline that handles building, testing, and publishing the CLI tool across various platforms and package managers.

## Workflow Architecture

### Core Workflows

#### 1. Build Workflow (`build.yml`)
- **Type**: Reusable workflow that can be called by other workflows
- **Purpose**: Cross-platform binary building and packaging
- **Platforms**: Linux (Ubuntu), macOS-14, Windows (optional)
- **Node Version**: Configurable (default: node22)

**Build Process**:
1. **Bundle Phase**: Creates single `clever.cjs` file using Rollup
2. **Build Phase**: Compiles platform-specific binaries using @yao-pkg/pkg
3. **Archive Phase**: Packages binaries into platform-specific archives

**Artifacts Generated**:
- `bundle-cjs`: Single CommonJS bundle
- `build-linux`: Linux x64 binary
- `build-macos`: macOS ARM64 binary
- `build-win`: Windows x64 binary (optional)

#### 2. Preview System (`preview-publish.yml` & `preview-cleanup.yml`)
The preview system provides temporary builds for pull requests to enable testing before merging.

**Features**:
- Builds preview binaries for all PRs (except documentation-only changes)
- Optional Windows builds when `build:win` label is applied
- Publishes to Clever Cloud's Cellar storage
- Adds download links to PR comments
- Automatic cleanup when PRs are closed

**Exclusions**:
- Ignores `release-please--*` branches
- Skips builds for `*.md` file changes only

#### 3. Release Please (`release-please.yml`)
- **Trigger**: Pushes to `master` and `hotfix/**` branches
- **Purpose**: Automated release PR creation using Google's release-please
- **Features**:
  - Conventional commits parsing
  - Changelog generation with custom types
  - Version bumping based on commit types

#### 4. Release Workflow (`release.yml`)
The most comprehensive workflow that handles full release publishing across multiple platforms and package managers.

**Trigger**: Git tag pushes (e.g., `v1.2.3`)

### Release Publishing Pipeline

When a release tag is pushed, the following publishing targets are activated:

#### Build Artifacts
- Cross-platform binaries (Linux, macOS, Windows)
- RPM packages (with GPG signing)
- DEB packages
- Single CJS bundle

#### Publishing Targets

1. **GitHub Releases**: Binary artifacts upload
2. **Clever Cloud Cellar**: Archives and packages storage
3. **Package Managers**:
   - **AUR (Arch User Repository)**: Linux package for Arch users
   - **Homebrew**: macOS package manager
   - **Docker Hub**: Container image publishing
   - **Exherbo**: Linux distribution packages
   - **Nexus Repository**: RPM/DEB package hosting
   - **Winget**: Windows package manager (currently disabled)
   - **npm**: Node.js package registry (currently disabled)

## Development Workflow

### Branch Strategy
- **Main branch**: `master` (protected)
- **Hotfix branches**: `hotfix/**` (triggers release-please)
- **Feature branches**: Use conventional commit format

### Commit Convention
The project uses conventional commits for automated changelog generation:

```
feat: add new functionality
fix: bug fixes
perf: performance improvements
docs: documentation changes
style: code style changes
refactor: code refactoring
test: test changes
chore: maintenance tasks
```

### Custom Changelog Types
The project defines specific changelog sections:
- 🚀 Features (`feat`)
- 🐛 Bug Fixes (`fix`) 
- 💪 Performance Improvements (`perf`)
- Additional types (some marked as hidden in changelog)

## Build System

### Rollup Configuration
- **Input**: `bin/clever.js`
- **Output**: CommonJS with inline sourcemaps
- **Plugins**: node-resolve, commonjs, json
- **Special Handling**:
  - Import.meta.url transformations for pkg compatibility
  - Update-notifier lazy loading fixes
  - fsevents exclusion for macOS

### Binary Compilation
- **Tool**: @yao-pkg/pkg
- **Node Version**: Pinned to 22.17.0 via Volta
- **Targets**:
  - Linux: `node22-linux-x64`
  - macOS: `node22-macos-arm64`
  - Windows: `node22-win-x64`

### Package Generation
- **NFPM**: Used for RPM/DEB generation
- **GPG Signing**: RPM packages are GPG signed during creation
- **Templates**: Package-specific templates in `scripts/templates/`

## Environment Variables & Secrets

### Required Secrets
The CI/CD pipeline requires various secrets for publishing:

#### Cellar Storage (Preview & Release)
- `CC_CLEVER_TOOLS_PREVIEWS_CELLAR_BUCKET`
- `CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID`
- `CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY`
- `CC_CLEVER_TOOLS_RELEASES_CELLAR_BUCKET`
- `CC_CLEVER_TOOLS_RELEASES_CELLAR_KEY_ID`
- `CC_CLEVER_TOOLS_RELEASES_CELLAR_SECRET_KEY`

#### Package Manager Publishing
- `HOMEBREW_GIT_URL`: Homebrew tap repository
- `AUR_GIT_URL`: AUR repository
- `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`: Docker Hub credentials
- `DOCKER_IMAGE_NAME`: Docker image name
- `EXHERBO_GIT_URL`: Exherbo repository
- `NEXUS_USER`, `NEXUS_PASSWORD`: Nexus repository credentials
- `NEXUS_RPM_REPOSITORY`, `NEXUS_DEB_REPOSITORY`: Repository names

#### GPG Signing
- `RPM_GPG_PRIVATE_KEY`: Private key for RPM signing
- `RPM_GPG_PASSPHRASE`: Passphrase for GPG key

### Security Best Practices
- Minimal required permissions per job
- Pull request write access only for preview comments
- Contents read for most operations
- Secrets are scoped to specific workflows

## Testing Pull Requests

### Preview Builds
Every pull request automatically gets preview builds that can be tested:

1. **Automatic Builds**: Created for all PRs (except docs-only)
2. **Optional Windows**: Add `build:win` label for Windows builds
3. **Download Links**: Posted as PR comments
4. **Testing**: Use preview binaries to test changes
5. **Cleanup**: Automatically removed when PR is closed

### Manual Testing
Contributors can test locally using:
```bash
# Build preview for current branch
node scripts/preview.js build

# List available previews  
node scripts/preview.js list

# Update local preview cache
node scripts/preview.js update
```

## Deployment Strategy

### Multi-stage Process
1. **Build artifacts** in parallel across platforms
2. **Publish to storage** (Cellar, GitHub Releases)  
3. **Update package managers** (dependent on storage publishing)
4. **Multi-platform distribution** across Linux, macOS, Windows

### Concurrency Control
- Prevents parallel preview builds per branch
- Careful orchestration of publishing dependencies
- Error handling and rollback capabilities

## Troubleshooting

### Common Issues

#### Preview Build Failures
- Check if PR changes trigger builds (non-docs changes required)
- Verify Cellar storage credentials
- Check for Windows build requirement (`build:win` label)

#### Release Failures
- Ensure all required secrets are configured
- Verify tag format follows semantic versioning
- Check individual publishing target logs

#### Build Failures
- Node version compatibility (pinned to 22.17.0)
- Platform-specific binary compilation issues
- Archive creation problems

### Debugging Tools
- **GitHub Actions logs**: Detailed build information
- **Workflow runs**: Status and artifact information
- **Preview manifest**: JSON manifest of available previews
- **Local scripts**: Test builds locally before pushing

## Contributing Guidelines

1. **Fork and Branch**: Create feature branches from `master`
2. **Conventional Commits**: Use conventional commit format
3. **Test Locally**: Build and test changes locally when possible
4. **Preview Testing**: Use PR preview builds for integration testing
5. **Documentation**: Update relevant documentation for significant changes
6. **Release Notes**: Commit messages will auto-generate changelog entries

## Getting Help

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **PR Comments**: Get feedback on specific changes
- **CI Logs**: Check workflow logs for detailed error information

This CI/CD setup represents a production-ready pipeline for distributing a CLI tool across multiple platforms and package managers, with robust preview capabilities and automated release management.