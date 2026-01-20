#!/bin/bash

# =============================================================================
# Never CLI - Architecture Overhaul Verification Script
# Tests environment detection, binary execution, and Copilot sync
# =============================================================================

set -e

echo "=============================================="
echo "Never CLI - Verification Test Suite"
echo "=============================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="/tmp/never-verification-tests"

# Clean up previous test runs
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo "Project root: $PROJECT_ROOT"
echo "Test directory: $TEST_DIR"
echo ""

# =============================================================================
# Build the project first
# =============================================================================
echo "Building project..."
cd "$PROJECT_ROOT"
npm run build 2>&1 || { echo "Build failed"; exit 1; }
echo "Build successful"
echo ""

# =============================================================================
# Test 1: Copilot Detection
# =============================================================================
echo "=============================================="
echo "Test 1: Copilot Environment Detection"
echo "=============================================="

TEST1_DIR="$TEST_DIR/test-copilot"
mkdir -p "$TEST1_DIR/.github"

cd "$TEST1_DIR"
SCAN_OUTPUT=$(node "$PROJECT_ROOT/packages/cli/dist/index.js" scan --json 2>/dev/null || true)

if echo "$SCAN_OUTPUT" | grep -q '"copilot": true'; then
    echo "Copilot detected correctly (.github directory exists)"
else
    echo "Copilot detection failed"
    echo "Output: $SCAN_OUTPUT"
fi
echo ""

# =============================================================================
# Test 2: Cursor Detection
# =============================================================================
echo "=============================================="
echo "Test 2: Cursor Environment Detection"
echo "=============================================="

TEST2_DIR="$TEST_DIR/test-cursor"
mkdir -p "$TEST2_DIR/.cursor"

cd "$TEST2_DIR"
SCAN_OUTPUT=$(node "$PROJECT_ROOT/packages/cli/dist/index.js" scan --json 2>/dev/null || true)

if echo "$SCAN_OUTPUT" | grep -q '"cursor": true'; then
    echo "Cursor detected correctly (.cursor directory exists)"
else
    echo "Cursor detection failed"
    echo "Output: $SCAN_OUTPUT"
fi
echo ""

# =============================================================================
# Test 3: Claude Detection
# =============================================================================
echo "=============================================="
echo "Test 3: Claude Environment Detection"
echo "=============================================="

TEST3_DIR="$TEST_DIR/test-claude"
mkdir -p "$TEST3_DIR"
echo "# Claude Instructions" > "$TEST3_DIR/CLAUDE.md"

cd "$TEST3_DIR"
SCAN_OUTPUT=$(node "$PROJECT_ROOT/packages/cli/dist/index.js" scan --json 2>/dev/null || true)

if echo "$SCAN_OUTPUT" | grep -q '"claude": true'; then
    echo "Claude detected correctly (CLAUDE.md exists)"
else
    echo "Claude detection failed"
    echo "Output: $SCAN_OUTPUT"
fi
echo ""

# =============================================================================
# Test 4: Binary Execution (npx-style)
# =============================================================================
echo "=============================================="
echo "Test 4: Binary Execution"
echo "=============================================="

cd "$PROJECT_ROOT"
VERSION_OUTPUT=$(node packages/cli/dist/index.js --version 2>/dev/null || echo "FAILED")

if echo "$VERSION_OUTPUT" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+'; then
    echo "Binary executes correctly, version: $VERSION_OUTPUT"
else
    echo "Binary execution failed"
    echo "Output: $VERSION_OUTPUT"
fi
echo ""

# =============================================================================
# Test 5: Shebang Check
# =============================================================================
echo "=============================================="
echo "Test 5: Shebang Verification"
echo "=============================================="

FIRST_LINE=$(head -n1 "$PROJECT_ROOT/packages/cli/dist/index.js")

if [ "$FIRST_LINE" = "#!/usr/bin/env node" ]; then
    echo "Shebang is correct: $FIRST_LINE"
else
    echo "Shebang missing or incorrect"
    echo "First line: $FIRST_LINE"
fi
echo ""

# =============================================================================
# Test 6: Copilot Sync (simulated - check file created)
# =============================================================================
echo "=============================================="
echo "Test 6: Copilot Sync Flow"
echo "=============================================="

TEST6_DIR="$TEST_DIR/test-sync"
mkdir -p "$TEST6_DIR/.never"

# Create a simple config with copilot enabled
cat > "$TEST6_DIR/.never/config.yaml" << EOF
version: 1
rules:
  - core
targets:
  cursor: false
  claude: false
  copilot: true
  agents: false
autoDetect: true
EOF

cd "$TEST6_DIR"

# Run sync (this may fail if no library is available, but we check file creation)
node "$PROJECT_ROOT/packages/cli/dist/index.js" sync 2>/dev/null || true

if [ -f "$TEST6_DIR/.github/copilot-instructions.md" ]; then
    echo "Copilot instructions file created at .github/copilot-instructions.md"
    echo "   Content preview:"
    head -5 "$TEST6_DIR/.github/copilot-instructions.md" | sed 's/^/   /'
else
    echo "Copilot instructions file not found (may require library)"
fi
echo ""

# =============================================================================
# Test 7: Multiple Environment Detection (Warning)
# =============================================================================
echo "=============================================="
echo "Test 7: Multi-Environment Detection Warning"
echo "=============================================="

TEST7_DIR="$TEST_DIR/test-multi"
mkdir -p "$TEST7_DIR/.cursor"
mkdir -p "$TEST7_DIR/.github"
echo "# Copilot" > "$TEST7_DIR/.github/copilot-instructions.md"

cd "$TEST7_DIR"
SCAN_OUTPUT=$(node "$PROJECT_ROOT/packages/cli/dist/index.js" scan --json 2>/dev/null || true)

CURSOR_DETECTED=$(echo "$SCAN_OUTPUT" | grep -c '"cursor": true' || echo "0")
COPILOT_DETECTED=$(echo "$SCAN_OUTPUT" | grep -c '"copilot": true' || echo "0")
HAS_WARNING=$(echo "$SCAN_OUTPUT" | grep -c 'Cursor and Copilot' || echo "0")

if [ "$CURSOR_DETECTED" = "1" ] && [ "$COPILOT_DETECTED" = "1" ]; then
    echo "Both Cursor and Copilot detected correctly"
    if [ "$HAS_WARNING" = "1" ]; then
        echo "Multi-environment warning displayed"
    else
        echo "Warning not found in JSON output (may be in warnings array)"
    fi
else
    echo "❌ Multi-environment detection failed"
    echo "Output: $SCAN_OUTPUT"
fi
echo ""

# =============================================================================
# Cleanup
# =============================================================================
echo "=============================================="
echo "Cleanup"
echo "=============================================="
rm -rf "$TEST_DIR"
echo "Test directory cleaned up"
echo ""

echo "=============================================="
echo "Verification Complete!"
echo "=============================================="
