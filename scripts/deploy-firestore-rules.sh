#!/usr/bin/env bash
# Deploy HAIBO Firestore rules (run from repo root after: firebase login)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT="${FIREBASE_PROJECT:-haibo-tours}"

if command -v firebase >/dev/null 2>&1; then
  firebase deploy --only firestore:rules --project "$PROJECT"
else
  npx --yes firebase-tools@13 deploy --only firestore:rules --project "$PROJECT"
fi

echo "Firestore rules deployed to project: $PROJECT"
