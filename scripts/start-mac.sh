#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "Building PreLegal..."
docker build -t prelegal .

echo "Starting PreLegal..."
docker run -d --name prelegal -p 8000:8000 --rm --env-file backend/.env prelegal

echo "PreLegal is running at http://localhost:8000"
