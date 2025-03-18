#!/bin/sh

# Usage: ./scripts/build-all.sh <VERSION>
# Example: ./scripts/build-all.sh 0.1.0

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/build-all.sh <VERSION>"
  exit 1
fi

# Convert some version configuration
# package.json
yq eval ".version = \"$VERSION\"" -i package.json
# tauri.conf.json
yq eval ".version = \"$VERSION\"" -i src-tauri/tauri.conf.json
# Cargo.toml
pushd src-tauri
cargo set-version $VERSION
popd

# Create releases directory
mkdir -p releases

# Build for Android
pnpm tauri android build
cp ./src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk \
  ./releases/tauri-v$VERSION.apk

# Build for MacOS
pnpm tauri build --target aarch64-apple-darwin
cp ./src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/unhurry_${VERSION}_aarch64.dmg \
  ./releases/tauri-v$VERSION-macos-aarch64.dmg

# Build for Windows
# pnpm tauri build --target i686-pc-windows-msvc
# pnpm tauri build --target aarch64-pc-windows-msvc

# Build for GH Page
pnpm buildGHPage
