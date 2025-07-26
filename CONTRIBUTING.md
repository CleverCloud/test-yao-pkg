# Contributing to clever-tools

This guide helps you contribute to the clever-tools project, covering the CI/CD workflows and development process.

## Workflow Overview

The project uses GitHub Actions with four main workflows:

```mermaid
graph TD
    %% Triggers
    PR[Pull Request] --> PRP[preview-publish.yml]
    PUSH_MASTER[Push to master] --> RP[release-please.yml]
    TAG[Git Tag Push] --> REL[release.yml]
    
    %% Preview workflow
    PRP --> BUILD1[build.yml<br/>Reusable Workflow]
    BUILD1 --> BUNDLE[bundle-cjs job]
    BUNDLE --> BUILD_LINUX[build-linux job]
    BUNDLE --> BUILD_MACOS[build-macos job] 
    BUNDLE --> BUILD_WIN[build-windows job<br/>if build:win label]
    
    BUILD_LINUX --> PUB_PREVIEW[publish job<br/>Upload to Cellar<br/>Comment on PR]
    BUILD_MACOS --> PUB_PREVIEW
    BUILD_WIN --> PUB_PREVIEW
    
    %% Release workflow
    REL --> BUILD2[build.yml<br/>Reusable Workflow]
    REL --> PACKAGE_RPM[package-rpm job]
    REL --> PACKAGE_DEB[package-deb job]
    
    BUILD2 --> GITHUB_REL[update-github-release]
    BUILD2 --> CELLAR_ARC[publish-cellar-archives]
    PACKAGE_RPM --> CELLAR_RPM[publish-cellar-rpm]
    PACKAGE_DEB --> CELLAR_DEB[publish-cellar-deb]
    
    %% Package managers (depend on cellar archives)
    CELLAR_ARC --> AUR[publish-aur]
    CELLAR_ARC --> HOMEBREW[publish-homebrew]
    CELLAR_ARC --> DOCKER[publish-dockerhub]
    CELLAR_ARC --> EXHERBO[publish-exherbo]
    
    %% Nexus (depend on specific builds)
    PACKAGE_RPM --> NEXUS_RPM[publish-nexus-rpm]
    PACKAGE_DEB --> NEXUS_DEB[publish-nexus-deb]
    
    %% Cleanup workflow
    PR_CLOSE[PR Closed] --> CLEANUP[preview-cleanup.yml]
    
    %% Styling
    classDef trigger fill:#e1f5fe
    classDef workflow fill:#f3e5f5
    classDef job fill:#e8f5e8
    classDef publish fill:#fff3e0
    
    class PR,PUSH_MASTER,TAG,PR_CLOSE trigger
    class PRP,RP,REL,CLEANUP,BUILD1,BUILD2 workflow
    class BUNDLE,BUILD_LINUX,BUILD_MACOS,BUILD_WIN,PACKAGE_RPM,PACKAGE_DEB job
    class PUB_PREVIEW,GITHUB_REL,CELLAR_ARC,CELLAR_RPM,CELLAR_DEB,AUR,HOMEBREW,DOCKER,EXHERBO,NEXUS_RPM,NEXUS_DEB publish
```

### Key Workflows

1. **build.yml** - Reusable workflow that creates cross-platform binaries (Linux, macOS, Windows)
2. **preview-publish.yml** - Builds preview binaries for PRs and publishes download links
3. **release-please.yml** - Creates automated release PRs based on conventional commits
4. **release.yml** - Publishes releases to GitHub, package managers, and repositories

### Script-Based Architecture

Most CI/CD operations are implemented as Node.js scripts rather than inline shell commands in GitHub Actions. This approach provides several benefits:

- **Consistency**: All scripts follow the same patterns (argument validation, error handling, help text)
- **Testability**: Scripts can be run locally for development and debugging
- **Maintainability**: Complex logic is easier to read and modify in dedicated files
- **Reusability**: Scripts can be called from multiple workflows or run manually
- **Documentation**: Each script includes usage examples and environment variable requirements

Scripts are located in the `/scripts` directory and use shared utilities from `/scripts/lib` for common operations like file paths, process execution, and terminal formatting.

### Environment Variables and Secrets

The following table lists all environment variables and secrets used across workflows and scripts:

| Variable                                     | Type     | Description                                      | Used By                  |
|----------------------------------------------|----------|--------------------------------------------------|--------------------------|
| `CI_TOKEN`                                   | Secret   | GitHub token for release-please automation       | release-please.yml       |
| `GITHUB_TOKEN`                               | Secret   | GitHub token for release uploads                 | update-github-release.js |
| `NPM_TOKEN`                                  | Secret   | npm registry authentication token                | release.yml              |
| `RPM_GPG_PRIVATE_KEY`                        | Secret   | GPG private key for signing RPM packages         | package-nfpm.js          |
| `RPM_GPG_PASSPHRASE`                         | Secret   | Passphrase for RPM GPG key                       | package-nfpm.js          |
| `SSH_PRIVATE_KEY`                            | Secret   | SSH key for Git operations (AUR, Homebrew, etc.) | Multiple publish scripts |
| `DOCKERHUB_TOKEN`                            | Secret   | Docker Hub authentication token                  | publish-dockerhub.js     |
| `NEXUS_PASSWORD`                             | Secret   | Nexus repository password                        | publish-nexus.js         |
| `CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID`     | Secret   | Cellar S3 access key for previews                | preview scripts          |
| `CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY` | Secret   | Cellar S3 secret key for previews                | preview scripts          |
| `CC_CLEVER_TOOLS_RELEASES_CELLAR_KEY_ID`     | Secret   | Cellar S3 access key for releases                | publish-cellar.js        |
| `CC_CLEVER_TOOLS_RELEASES_CELLAR_SECRET_KEY` | Secret   | Cellar S3 secret key for releases                | publish-cellar.js        |
| `CC_CLEVER_TOOLS_PREVIEWS_CELLAR_BUCKET`     | Variable | Cellar S3 bucket name for preview builds         | preview scripts          |
| `CC_CLEVER_TOOLS_RELEASES_CELLAR_BUCKET`     | Variable | Cellar S3 bucket name for release builds         | publish-cellar.js        |
| `AUR_GIT_URL`                                | Variable | Git URL for AUR package repository               | publish-aur.js           |
| `HOMEBREW_GIT_URL`                           | Variable | Git URL for Homebrew formula repository          | publish-homebrew.js      |
| `DOCKERHUB_GIT_URL`                          | Variable | Git URL for Docker Hub repository                | publish-dockerhub.js     |
| `EXHERBO_GIT_URL`                            | Variable | Git URL for Exherbo package repository           | publish-exherbo.js       |
| `DOCKERHUB_USERNAME`                         | Variable | Docker Hub username                              | publish-dockerhub.js     |
| `DOCKER_IMAGE_NAME`                          | Variable | Docker image name for publishing                 | publish-dockerhub.js     |
| `NEXUS_USER`                                 | Variable | Nexus repository username                        | publish-nexus.js         |
| `NEXUS_RPM_REPOSITORY`                       | Variable | Nexus RPM repository identifier                  | publish-nexus.js         |
| `NEXUS_DEB_REPOSITORY`                       | Variable | Nexus DEB repository identifier                  | publish-nexus.js         |

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

## Build System

The build process creates cross-platform binaries using:
- **Bundling**: Rollup creates a single `clever.cjs` file
- **Compilation**: @yao-pkg/pkg compiles Node.js binaries for Linux, macOS, and Windows
- **Packaging**: NFPM generates RPM/DEB packages with GPG signing

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
scripts/preview.js build

# Manually publish a preview for current branch
scripts/preview.js publish

# List available previews  
scripts/preview.js list

# Update local preview cache
scripts/preview.js update
```

## Troubleshooting

### Common Issues

#### Preview Build Failures
- Ensure PR has non-documentation changes (`.md` files are ignored)
- Add `build:win` label if Windows builds are needed
- Check GitHub Actions logs for detailed error information

#### Build Failures
- Verify Node.js version compatibility (project uses Node 22)
- Check workflow logs in the Actions tab
- Test builds locally using the preview script: `./scripts/preview.js build`

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
