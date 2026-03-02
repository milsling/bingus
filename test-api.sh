#!/bin/bash
echo "Testing API endpoints..."
echo ""
echo "1. Testing /api/user (current user):"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:5000/api/user
echo ""
echo "2. Testing /api/bars (bars list):"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:5000/api/bars | head -c 200
echo ""
echo "3. Testing /api/version:"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:5000/api/version
echo ""
