#!/bin/bash
set -e
set -x

echo "Starting build test..."
npx tsx script/build.ts
echo "Build completed with exit code: $?"
