/**
 * ============================================================================
 * KISANOVA AUTOMATED SECRETS & CREDENTIALS AUDIT SUITE (test_secrets_audit.js)
 * ============================================================================
 * 
 * Verifies:
 * 1. Git Tracked Files: No .env, keys, or credentials are committed to git.
 * 2. High-Entropy & Known Secret Patterns: Scans all source code for leaked API keys,
 *    tokens, and private keys.
 * 3. Frontend Bundle Isolation: Confirms zero sensitive environment variables or
 *    credentials are leaked to client-side code.
 * 4. Backend Service Fail-Fast Security: Verifies that JWT_SECRET, BREVO_API_KEY,
 *    and BREVO_SENDER_EMAIL fail fast when missing and have no hardcoded production defaults.
 * 5. Repository .gitignore Integrity: Confirms broad protection against secret leaks.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASS: ${message}`);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.resolve(ROOT_DIR, 'frontend');
const BACKEND_DIR = path.resolve(ROOT_DIR, 'backend');

// Known dangerous secret signatures
const SECRET_SIGNATURES = [
  { name: 'Brevo Live API Key', regex: /xkeysib-[a-zA-Z0-9]{64}/ },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', regex: /(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{22,})/ },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z\\-_]{35}/ },
  { name: 'Stripe Live Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/ },
  { name: 'Private Key Header', regex: /-----BEGIN [A-Z\s]*PRIVATE KEY-----/ },
  { name: 'Hardcoded Personal Email in Backend Core', regex: /hassaanrana429@gmail\.com/ }
];

async function runAudit() {
  console.log('\n============================================================');
  console.log('🔒 RUNNING KISANOVA SECRETS AUDIT & LEAK PROTECTION SUITE');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Git Tracked Files Inspection
  // --------------------------------------------------------------------------
  console.log('Test 1: Git Tracked Files Inspection');
  {
    let trackedFiles = [];
    try {
      const output = execSync('git ls-files', { cwd: ROOT_DIR, encoding: 'utf8' });
      trackedFiles = output.split(/\r?\n/).filter(f => f.trim().length > 0);
    } catch (e) {
      console.warn('⚠️ git command not available or not a git repository. Skipping git ls-files check.');
    }

    if (trackedFiles.length > 0) {
      // 1.1 No .env files tracked (except .env.example)
      const leakedEnvFiles = trackedFiles.filter(f => {
        const base = path.basename(f);
        return base.startsWith('.env') && !base.includes('.example');
      });
      assert(leakedEnvFiles.length === 0, `No active .env files are tracked in git (Found: ${leakedEnvFiles.join(', ') || '0'})`);

      // 1.2 No private keys or cert files tracked
      const keyExtensions = ['.key', '.pem', '.pfx', '.p12', '.crt', '.cert'];
      const leakedKeyFiles = trackedFiles.filter(f => keyExtensions.some(ext => f.endsWith(ext)));
      assert(leakedKeyFiles.length === 0, `No private keys or certificates are tracked in git (Found: ${leakedKeyFiles.join(', ') || '0'})`);

      // 1.3 No credential JSON files tracked
      const leakedCredFiles = trackedFiles.filter(f => {
        const lower = f.toLowerCase();
        return (lower.includes('serviceaccount') || lower.includes('credential')) && lower.endsWith('.json');
      });
      assert(leakedCredFiles.length === 0, `No credential JSON files are tracked in git (Found: ${leakedCredFiles.join(', ') || '0'})`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 2: Secret Pattern Scanning Across Codebase
  // --------------------------------------------------------------------------
  console.log('\nTest 2: High-Entropy Secret Pattern Scanning Across Source Code');
  {
    function getSourceFiles(dir, fileList = []) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'dist', 'build', 'mysql_data'].includes(entry.name)) continue;
          getSourceFiles(fullPath, fileList);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (['.js', '.jsx', '.json', '.html', '.sql'].includes(ext)) {
            fileList.push(fullPath);
          }
        }
      }
      return fileList;
    }

    const allFiles = getSourceFiles(ROOT_DIR);
    assert(allFiles.length > 20, `Discovered ${allFiles.length} source files to scan for credentials`);

    const violations = [];
    for (const file of allFiles) {
      // Exclude this test file itself and test_production.js (which references past test emails)
      if (file.endsWith('test_secrets_audit.js') || file.endsWith('test_production.js')) continue;

      const content = fs.readFileSync(file, 'utf8');
      for (const signature of SECRET_SIGNATURES) {
        if (signature.regex.test(content)) {
          violations.push({
            file: path.relative(ROOT_DIR, file),
            pattern: signature.name
          });
        }
      }
    }

    assert(
      violations.length === 0,
      `Zero high-entropy secret patterns found in source code (${violations.map(v => `${v.pattern} in ${v.file}`).join(', ') || 'Clean'})`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 3: Frontend Bundle & Client Environment Isolation
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Frontend Environment & Bundle Leak Audit');
  {
    function getFrontendFiles(dir, list = []) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', 'dist', 'build'].includes(entry.name)) continue;
          getFrontendFiles(fullPath, list);
        } else if (entry.isFile() && ['.js', '.jsx', '.ts', '.tsx', '.html'].includes(path.extname(entry.name))) {
          list.push(fullPath);
        }
      }
      return list;
    }

    const frontendFiles = getFrontendFiles(path.join(FRONTEND_DIR, 'src'));
    const viteEnvUsages = new Set();
    const disallowedPatterns = ['SECRET', 'PASSWORD', 'PRIVATE', 'KEY', 'DB_', 'CLOUDINARY_API_SECRET', 'BREVO'];

    for (const file of frontendFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/import\.meta\.env\.([A-Z0-9_]+)/g) || [];
      for (const m of matches) {
        viteEnvUsages.add(m.replace('import.meta.env.', ''));
      }
    }

    console.log('   Discovered Frontend Environment Usages:', Array.from(viteEnvUsages).join(', ') || 'None');

    const leakingEnvs = Array.from(viteEnvUsages).filter(envVar =>
      disallowedPatterns.some(pat => envVar.toUpperCase().includes(pat))
    );

    assert(leakingEnvs.length === 0, 'No secret environment variables are referenced in frontend source code');

    // Only allowed public client configurations
    const allowedClientEnvs = new Set([
      'VITE_API_URL',
      'VITE_SOCKET_URL',
      'VITE_PUBLIC_APP_URL',
      'VITE_SELLER_APP_URL',
      'VITE_ADMIN_APP_URL',
      'MODE',
      'DEV',
      'PROD'
    ]);

    const unauthorizedEnvs = Array.from(viteEnvUsages).filter(v => !allowedClientEnvs.has(v));
    assert(unauthorizedEnvs.length === 0, `All frontend env variables are strictly whitelisted public URLs (Unauthorized: ${unauthorizedEnvs.join(', ') || 'None'})`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Backend Service Fail-Fast & No Hardcoded Defaults
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Backend Security Fail-Fast & Safe Defaults');
  {
    const { getJwtSecret } = require('./src/middleware/auth');
    const emailService = require('./src/services/emailService');

    // 4.1 JWT Secret Fails Fast
    const prevSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    let jwtSecretFailed = false;
    try {
      getJwtSecret();
    } catch (e) {
      jwtSecretFailed = e.message.includes('FATAL');
    }
    assert(jwtSecretFailed, 'JWT Secret missing throws FATAL security error (no insecure hardcoded fallback)');
    process.env.JWT_SECRET = prevSecret || 'test-audit-jwt-secret-placeholder-12345';

    // 4.2 Brevo API Key Fails Fast in Production
    const prevNodeEnv = process.env.NODE_ENV;
    const prevBrevoKey = process.env.BREVO_API_KEY;
    process.env.NODE_ENV = 'production';
    delete process.env.BREVO_API_KEY;
    let brevoKeyFailed = false;
    try {
      emailService.getApiKey();
    } catch (e) {
      brevoKeyFailed = e.message.includes('FATAL');
    }
    assert(brevoKeyFailed, 'BREVO_API_KEY missing in production throws FATAL configuration error');

    // 4.3 Brevo Sender Email Fails Fast in Production
    const prevSender = process.env.BREVO_SENDER_EMAIL;
    delete process.env.BREVO_SENDER_EMAIL;
    let brevoSenderFailed = false;
    try {
      emailService.getSender();
    } catch (e) {
      brevoSenderFailed = e.message.includes('FATAL');
    }
    assert(brevoSenderFailed, 'BREVO_SENDER_EMAIL missing in production throws FATAL configuration error');

    // Restore NODE_ENV to non-production
    process.env.NODE_ENV = prevNodeEnv;

    // 4.4 Non-production fallback is clean domain placeholder (not personal email)
    delete process.env.BREVO_SENDER_EMAIL;
    const devSender = emailService.getSender();
    assert(
      devSender.email === 'noreply@kisanova.com',
      `Email service sender falls back to safe domain placeholder (Current default: ${devSender.email})`
    );

    // Restore environment variables
    if (prevBrevoKey) process.env.BREVO_API_KEY = prevBrevoKey;
    if (prevSender) process.env.BREVO_SENDER_EMAIL = prevSender;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Repository .gitignore Fortification
  // --------------------------------------------------------------------------
  console.log('\nTest 5: Repository .gitignore Fortification');
  {
    const gitignoreContent = fs.readFileSync(path.join(ROOT_DIR, '.gitignore'), 'utf8');

    assert(gitignoreContent.includes('**/.env'), '.gitignore recursively ignores all nested .env files (**/.env)');
    assert(gitignoreContent.includes('*.key'), '.gitignore blocks private key files (*.key)');
    assert(gitignoreContent.includes('*.pem'), '.gitignore blocks PEM certificate files (*.pem)');
    assert(gitignoreContent.includes('*credentials*.json'), '.gitignore blocks credential JSON files');
  }

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} SECRETS AUDIT TESTS PASSED!`);
  console.log('============================================================\n');

  process.exit(0);
}

runAudit().catch(err => {
  console.error('\n❌ SECRETS AUDIT FAILED:', err);
  process.exit(1);
});
