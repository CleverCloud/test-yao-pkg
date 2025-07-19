#!/bin/bash

set -euo pipefail

# Configuration
PACKAGE_NAME="clever-tools"
VERSION="1.0.0"
RELEASE="1"
ARCH="x86_64"
BINARY_PATH="build/main/linux/clever"
BUILD_ROOT="/tmp/rpm-build"
SPEC_FILE="$BUILD_ROOT/SPECS/${PACKAGE_NAME}.spec"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if rpmbuild is available
if ! command -v rpmbuild &> /dev/null; then
    log_error "rpmbuild is not installed. Please install rpm-build package."
    exit 1
fi

# Check if binary exists
if [ ! -f "$BINARY_PATH" ]; then
    log_error "Binary not found at $BINARY_PATH"
    log_info "Please run the build process first to create the binary"
    exit 1
fi

# Clean and create build directory structure
log_info "Setting up RPM build environment..."
rm -rf "$BUILD_ROOT"
mkdir -p "$BUILD_ROOT"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# Create RPM spec file
log_info "Creating RPM spec file..."
cat > "$SPEC_FILE" << EOF
Name:           ${PACKAGE_NAME}
Version:        ${VERSION}
Release:        ${RELEASE}%{?dist}
Summary:        Clever Cloud CLI tool
License:        Apache-2.0
URL:            https://github.com/CleverCloud/clever-tools
BuildArch:      ${ARCH}
AutoReqProv:    no

%description
Command line tool for Clever Cloud platform management.
Deploy applications, manage add-ons, and monitor your services.

%prep
# No preparation needed for binary package

%build
# No build needed for binary package

%install
mkdir -p %{buildroot}/usr/bin
cp %{_sourcedir}/clever %{buildroot}/usr/bin/clever
chmod 755 %{buildroot}/usr/bin/clever

%files
/usr/bin/clever

%changelog
* $(date +'%a %b %d %Y') Builder <builder@example.com> - ${VERSION}-${RELEASE}
- Initial RPM package
EOF

# Copy binary to SOURCES
log_info "Copying binary to build sources..."
cp "$BINARY_PATH" "$BUILD_ROOT/SOURCES/clever"

# Build the RPM
log_info "Building RPM package..."
rpmbuild --define "_topdir $BUILD_ROOT" -bb "$SPEC_FILE"

# Find and display the generated RPM
RPM_FILE=$(find "$BUILD_ROOT/RPMS" -name "*.rpm" | head -1)

if [ -n "$RPM_FILE" ]; then
    log_info "RPM package built successfully:"
    echo "  Location: $RPM_FILE"
    echo "  Size: $(du -h "$RPM_FILE" | cut -f1)"
    
    # Copy to current directory
    FINAL_RPM="${PACKAGE_NAME}-${VERSION}-${RELEASE}.${ARCH}.rpm"
    cp "$RPM_FILE" "$FINAL_RPM"
    log_info "RPM copied to: $FINAL_RPM"
    
    # Display package info
    log_info "Package information:"
    rpm -qip "$FINAL_RPM"
else
    log_error "Failed to find generated RPM package"
    exit 1
fi

log_info "RPM build completed successfully!"