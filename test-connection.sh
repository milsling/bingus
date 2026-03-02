#!/bin/bash
echo "Testing server on port 10000..."
echo ""
echo "1. Testing root page:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:10000/
echo ""
echo "2. Testing API /api/user:"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:10000/api/user
echo ""
echo "3. Testing API /api/bars:"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:10000/api/bars | head -c 100
echo ""
echo "4. Testing if JS bundle loads:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:10000/assets/index-*.js 2>/dev/null || echo "Bundle check failed"
