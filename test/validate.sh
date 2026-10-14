#!/usr/bin/env bash
# ==============================================================================
# Automated Build & Test Validation Script for CloudOps Hub CI/CD Pipeline
# ==============================================================================

set -e

echo "=========================================================="
echo " Starting Automated Build & Test Stage..."
echo "=========================================================="

FAILED=0

# Test 1: Check essential web assets
echo -n "[TEST 1] Verifying web source assets (HTML, CSS, JS)... "
if [ -f "src/index.html" ] && [ -f "src/style.css" ] && [ -f "src/script.js" ]; then
    echo "PASSED ✓"
else
    echo "FAILED ✗ - Missing critical files in src/"
    FAILED=1
fi

# Test 2: HTML Structure Integrity
echo -n "[TEST 2] Checking HTML document integrity and syntax... "
if grep -q "<!DOCTYPE html>" "src/index.html" && grep -q "</html>" "src/index.html"; then
    echo "PASSED ✓"
else
    echo "FAILED ✗ - Malformed HTML structure in src/index.html"
    FAILED=1
fi

# Test 3: Verify Dockerfile definition
echo -n "[TEST 3] Inspecting Dockerfile syntax requirements... "
if grep -q "^FROM " "Dockerfile" && grep -q "COPY " "Dockerfile" && grep -q "EXPOSE " "Dockerfile"; then
    echo "PASSED ✓"
else
    echo "FAILED ✗ - Dockerfile missing standard FROM/COPY/EXPOSE instructions"
    FAILED=1
fi

# Test 4: Verify Kubernetes manifests existence & structure
echo -n "[TEST 4] Validating Kubernetes manifests in k8s/... "
if [ -f "k8s/deployment.yaml" ] && [ -f "k8s/service.yaml" ]; then
    if grep -q "kind: Deployment" "k8s/deployment.yaml" && grep -q "kind: Service" "k8s/service.yaml"; then
        echo "PASSED ✓"
    else
        echo "FAILED ✗ - Manifests do not define required Deployment and Service kinds"
        FAILED=1
    fi
else
    echo "FAILED ✗ - Missing k8s/deployment.yaml or k8s/service.yaml"
    FAILED=1
fi

echo "=========================================================="
if [ $FAILED -eq 0 ]; then
    echo " All Build & Lint Tests PASSED successfully! (Exit 0)"
    echo "=========================================================="
    exit 0
else
    echo " Build & Lint Tests FAILED! (Exit 1)"
    echo "=========================================================="
    exit 1
fi
