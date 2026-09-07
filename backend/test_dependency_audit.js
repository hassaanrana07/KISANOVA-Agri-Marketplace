/**
 * test_dependency_audit.js
 * Automated dependency vulnerability and security audit test suite.
 * Validates backend and frontend direct dependencies and lockfile packages against
 * known security advisories (CVE/GHSA).
 */

const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

function parseSemver(v) {
  const clean = v.replace(/^[^0-9]*/, '').split('-')[0];
  const parts = clean.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    raw: v
  };
}

function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  return p1.patch - p2.patch;
}

console.log('=== KISANOVA DEPENDENCY SECURITY AUDIT ===\n');

// 1. Check Backend package.json version bounds
console.log('Test Suite 1: Backend Direct Dependencies Security Baseline');
const backendPkgPath = path.resolve(__dirname, 'package.json');
const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf8'));

// Express >= 4.21.2
const expressVer = backendPkg.dependencies['express'];
assert(
  compareSemver(expressVer, '4.21.2') >= 0,
  `express constraint is ${expressVer} (>= 4.21.2 required to protect against CVE-2024-43796, CVE-2024-43799, CVE-2024-45296)`
);

// MySQL2 >= 3.9.8
const mysqlVer = backendPkg.dependencies['mysql2'];
assert(
  compareSemver(mysqlVer, '3.9.8') >= 0,
  `mysql2 constraint is ${mysqlVer} (>= 3.9.8 required to protect against CVE-2024-21508 prototype pollution)`
);

// Multer >= 1.4.5-lts.2
const multerVer = backendPkg.dependencies['multer'];
assert(
  multerVer.includes('1.4.5-lts.2') || compareSemver(multerVer, '1.4.5') >= 0,
  `multer constraint is ${multerVer} (>= 1.4.5-lts.2 required to avoid vulnerable dicer multipart parser)`
);

// JsonWebToken >= 9.0.2
const jwtVer = backendPkg.dependencies['jsonwebtoken'];
assert(
  compareSemver(jwtVer, '9.0.2') >= 0,
  `jsonwebtoken constraint is ${jwtVer} (>= 9.0.2 required)`
);

// 2. Check Frontend package.json version bounds
console.log('\nTest Suite 2: Frontend Direct Dependencies Security Baseline');
const frontendPkgPath = path.resolve(__dirname, '../frontend/package.json');
const frontendPkg = JSON.parse(fs.readFileSync(frontendPkgPath, 'utf8'));

// Axios >= 1.7.4
const axiosVer = frontendPkg.dependencies['axios'];
assert(
  compareSemver(axiosVer, '1.7.4') >= 0,
  `axios constraint is ${axiosVer} (>= 1.7.4 required to protect against CVE-2024-39338 SSRF)`
);

// Vite >= 5.4.6
const viteVer = frontendPkg.devDependencies['vite'];
assert(
  compareSemver(viteVer, '5.4.6') >= 0,
  `vite constraint is ${viteVer} (>= 5.4.6 required to protect against CVE-2024-45811, CVE-2024-45812, CVE-2024-45814)`
);

// 3. Check Backend Lockfile Installed Packages
console.log('\nTest Suite 3: Backend Lockfile Installed Vulnerability Audit');
const backendLock = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package-lock.json'), 'utf8'));
const bPackages = backendLock.packages || {};

const bInstalled = {};
for (const [k, v] of Object.entries(bPackages)) {
  if (!k) continue;
  const name = k.replace(/^node_modules\//, '');
  bInstalled[name] = v.version;
}

assert(
  bInstalled['express'] && compareSemver(bInstalled['express'], '4.21.2') >= 0,
  `backend installed express: ${bInstalled['express']} (>= 4.21.2)`
);

assert(
  bInstalled['mysql2'] && compareSemver(bInstalled['mysql2'], '3.9.8') >= 0,
  `backend installed mysql2: ${bInstalled['mysql2']} (>= 3.9.8)`
);

assert(
  bInstalled['path-to-regexp'] && compareSemver(bInstalled['path-to-regexp'], '0.1.12') >= 0,
  `backend installed path-to-regexp: ${bInstalled['path-to-regexp']} (>= 0.1.12 fixes ReDoS CVE-2024-45296)`
);

assert(
  bInstalled['send'] && compareSemver(bInstalled['send'], '0.19.0') >= 0,
  `backend installed send: ${bInstalled['send']} (>= 0.19.0 fixes CVE-2024-43796)`
);

assert(
  bInstalled['serve-static'] && compareSemver(bInstalled['serve-static'], '1.16.0') >= 0,
  `backend installed serve-static: ${bInstalled['serve-static']} (>= 1.16.0 fixes CVE-2024-43799)`
);

assert(
  bInstalled['body-parser'] && compareSemver(bInstalled['body-parser'], '1.20.3') >= 0,
  `backend installed body-parser: ${bInstalled['body-parser']} (>= 1.20.3 fixes CVE-2024-45590)`
);

assert(
  bInstalled['cookie'] && compareSemver(bInstalled['cookie'], '0.7.0') >= 0,
  `backend installed cookie: ${bInstalled['cookie']} (>= 0.7.0 fixes CVE-2024-47764)`
);

assert(
  bInstalled['ws'] && compareSemver(bInstalled['ws'], '8.17.1') >= 0,
  `backend installed ws: ${bInstalled['ws']} (>= 8.17.1 fixes CVE-2024-37890)`
);

// 4. Check Frontend Lockfile Installed Packages
console.log('\nTest Suite 4: Frontend Lockfile Installed Vulnerability Audit');
const frontendLock = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../frontend/package-lock.json'), 'utf8'));
const fPackages = frontendLock.packages || {};

const fInstalled = {};
for (const [k, v] of Object.entries(fPackages)) {
  if (!k) continue;
  const name = k.replace(/^node_modules\//, '');
  fInstalled[name] = v.version;
}

assert(
  fInstalled['axios'] && compareSemver(fInstalled['axios'], '1.7.4') >= 0,
  `frontend installed axios: ${fInstalled['axios']} (>= 1.7.4)`
);

assert(
  fInstalled['vite'] && compareSemver(fInstalled['vite'], '5.4.6') >= 0,
  `frontend installed vite: ${fInstalled['vite']} (>= 5.4.6)`
);

assert(
  fInstalled['braces'] && compareSemver(fInstalled['braces'], '3.0.3') >= 0,
  `frontend installed braces: ${fInstalled['braces']} (>= 3.0.3 fixes ReDoS CVE-2024-4068)`
);

assert(
  fInstalled['micromatch'] && compareSemver(fInstalled['micromatch'], '4.0.8') >= 0,
  `frontend installed micromatch: ${fInstalled['micromatch']} (>= 4.0.8 fixes ReDoS CVE-2024-4067)`
);

assert(
  fInstalled['follow-redirects'] && compareSemver(fInstalled['follow-redirects'], '1.15.6') >= 0,
  `frontend installed follow-redirects: ${fInstalled['follow-redirects']} (>= 1.15.6 fixes CVE-2024-28849)`
);

// 5. Check Absence of Known Vulnerable Legacy Packages
console.log('\nTest Suite 5: Absence of Deprecated & Insecure Packages');
const bannedPackages = ['dicer', 'event-stream', 'flatmap-stream', 'left-pad'];
for (const banned of bannedPackages) {
  assert(!bInstalled[banned], `Backend does not include vulnerable package '${banned}'`);
  assert(!fInstalled[banned], `Frontend does not include vulnerable package '${banned}'`);
}

// Summary
console.log('\n=== AUDIT SUMMARY ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('All dependency security audit checks passed successfully!\n');
  process.exit(0);
}
