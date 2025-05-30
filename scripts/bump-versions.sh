# Usage: ./scripts/bump-version.sh <VERSION>
# Example: ./scripts/bump-version.sh 0.3.1

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/bump-version.sh <VERSION>"
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
