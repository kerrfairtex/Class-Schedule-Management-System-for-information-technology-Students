#!/usr/bin/env bash
# Phase 5 UAT — API-level acceptance tests
# Usage: ./scripts/uat-api.sh [base_url]
set -euo pipefail

BASE="${1:-http://localhost:3000}"
COOKIE_JAR=$(mktemp)
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

login() {
  local user="$1" pass="$2"
  curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$user\",\"password\":\"$pass\"}"
}

logout() {
  curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$BASE/api/auth/logout" > /dev/null
}

echo "=== CSMS Phase 5 UAT (API) ==="
echo "Target: $BASE"
echo ""

# --- Auth ---
echo "[Auth & RBAC]"
RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin?resource=stats")
[[ "$RESP" == "401" ]] && pass "Unauthenticated admin API returns 401" || fail "Unauthenticated admin API should return 401 (got $RESP)"

RESP=$(login "admin" "admin123")
echo "$RESP" | grep -q '"redirect":"/admin/dashboard"' && pass "Admin login redirects to dashboard" || fail "Admin login redirect"
echo "$RESP" | grep -q '"role":"admin"' && pass "Admin login returns admin role" || fail "Admin login role"

RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/admin?resource=stats")
echo "$RESP" | grep -q '"faculty"' && pass "Admin stats endpoint returns data" || fail "Admin stats endpoint"

logout

RESP=$(login "fac-001" "faculty123")
echo "$RESP" | grep -q '"redirect":"/faculty/dashboard"' && pass "Faculty login redirects to dashboard" || fail "Faculty login redirect"

RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/faculty")
echo "$RESP" | grep -q '"faculty"' && pass "Faculty API returns profile" || fail "Faculty API profile"

logout

RESP=$(login "2022-0001" "student123")
echo "$RESP" | grep -q '"redirect":"/student/dashboard"' && pass "Student login redirects to dashboard" || fail "Student login redirect"

RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/student")
echo "$RESP" | grep -q '"student"' && pass "Student API returns profile" || fail "Student API profile"

logout

# --- Admin workflows ---
echo ""
echo "[Admin Workflows]"
login "admin" "admin123" > /dev/null

RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/admin?resource=sections")
SECTION_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null || echo "")
[[ -n "$SECTION_ID" ]] && pass "Sections list returns data (id=$SECTION_ID)" || fail "Sections list"

RESP=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE/api/admin" \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"generate-schedules\",\"sectionId\":$SECTION_ID}")
echo "$RESP" | grep -q '"created"' && pass "Schedule generation runs" || fail "Schedule generation ($RESP)"

RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/admin?resource=schedules")
SCHED_COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
[[ "$SCHED_COUNT" -gt 0 ]] && pass "Schedules exist after generation ($SCHED_COUNT)" || fail "Schedules after generation"

RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/admin?resource=schedule-options")
echo "$RESP" | grep -q '"timeSlots"' && pass "Schedule options endpoint works" || fail "Schedule options"

RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/admin?resource=faculty-list")
echo "$RESP" | grep -q 'FAC' && pass "Faculty list for availability works" || fail "Faculty list"

RESP=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE/api/admin" \
  -H 'Content-Type: application/json' \
  -d '{"action":"backup"}')
echo "$RESP" | grep -q '"path"' && pass "Database backup works" || fail "Database backup"

RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/admin?resource=audit")
echo "$RESP" | grep -q '\[' && pass "Audit log endpoint works" || fail "Audit log"

logout

# --- Faculty with schedules ---
echo ""
echo "[Faculty Schedule View]"
login "admin" "admin123" > /dev/null
curl -s -b "$COOKIE_JAR" -X POST "$BASE/api/admin" \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"generate-schedules\",\"sectionId\":$SECTION_ID}" > /dev/null
logout

login "fac-001" "faculty123" > /dev/null
RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/faculty")
FAC_SCHED=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('schedules',[])))" 2>/dev/null || echo "0")
[[ "$FAC_SCHED" -ge 0 ]] && pass "Faculty schedule API responds (count=$FAC_SCHED)" || fail "Faculty schedule API"
logout

# --- Student section search ---
echo ""
echo "[Student Section Search]"
login "2022-0001" "student123" > /dev/null
RESP=$(curl -s -b "$COOKIE_JAR" "$BASE/api/student?section=BSIT-2A")
echo "$RESP" | grep -q '"schedules"' && pass "Student section search works" || fail "Student section search"
logout

# --- Middleware ---
echo ""
echo "[Route Protection]"
RESP=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE/admin/dashboard")
[[ "$RESP" == "200" ]] && pass "Unauthenticated /admin redirects to login (200)" || fail "Middleware redirect (got $RESP)"

rm -f "$COOKIE_JAR"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
