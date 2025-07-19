#!/bin/bash

set -euo pipefail

# Configuration
VERSION="main"
BINARY_PATH="build/$VERSION/linux/clever"
BUILD_ROOT="/tmp/rpm-build"
SPEC_FILE="$BUILD_ROOT/SPECS/clever-tools.spec"

# Clean and create build directory structure
echo "Setting up RPM build environment..."
rm -rf "$BUILD_ROOT"
mkdir -p "$BUILD_ROOT"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# Create RPM spec file
echo "Creating RPM spec file..."
cat > "$SPEC_FILE" << EOF
Name:           clever-tools
Version:        ${VERSION}
Release:        1
BuildArch:      x86_64
License:        Apache-2.0
Vendor:         Clever Cloud
URL:            https://github.com/CleverCloud/clever-tools
Summary:        Command Line Interface for Clever Cloud.

%description
Command Line Interface for Clever Cloud.

%install
mkdir -p %{buildroot}/usr/bin
cp %{_sourcedir}/clever %{buildroot}/usr/bin/clever
chmod 755 %{buildroot}/usr/bin/clever

%files
/usr/bin/clever
EOF

# Copy binary to SOURCES
echo "Copying binary to build sources..."
cp "$BINARY_PATH" "$BUILD_ROOT/SOURCES/clever"

# Build the RPM
echo "Building RPM package..."
rpmbuild --define "_topdir $BUILD_ROOT" -bb "$SPEC_FILE"

# Find and display the generated RPM
RPM_FILE=$(find "$BUILD_ROOT/RPMS" -name "*.rpm" | head -1)

if [ -n "$RPM_FILE" ]; then
    # Copy to current directory
    FINAL_RPM="clever-tools-${VERSION}.rpm"
    cp "$RPM_FILE" "$FINAL_RPM"
    echo "RPM copied to: $FINAL_RPM"

    # Display package info
    echo "Package information:"
    rpm -qip "$FINAL_RPM"
else
    echo "ERROR: Failed to find generated RPM package"
    exit 1
fi

echo "RPM build completed successfully!"
