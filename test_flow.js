/**
 * test_flow.js — Pre-mass-audit flow validation
 * Tests one invoice from each scenario bucket and grades the output.
 * BATCHED EDITION (runs 5 at a time)
 * Run: node test_flow.js
 */

const { Client } = require('pg');

const API_URL  = "https://agentbuilder3.ingenw-innovation-nonprod.deloitte.com/api/v1/prediction/8570af9e-7d76-408a-b755-6821649759e9";
const DB_CONN  = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// ── Representative test cases — one from each scenario bucket ──────────────
const TEST_CASES = [
  { invoiceId: "INV-001", bucket: "✅ Clean", expectedRisk: ["LOW", "MEDIUM"], expectedFlags: [], forbiddenFlags: ["Blacklisted", "Shell", "Mismatch"] },
  { invoiceId: "INV-005", bucket: "✅ Clean (mid-range)", expectedRisk: ["LOW", "MEDIUM"], expectedFlags: [], forbiddenFlags: ["Blacklisted", "Shell", "Mismatch"] },
  { invoiceId: "INV-011", bucket: "⚠️ Qty mismatch", expectedRisk: ["MEDIUM", "HIGH"], expectedFlags: ["quantity", "mismatch"], forbiddenFlags: ["Blacklisted"] },
  { invoiceId: "INV-013", bucket: "⚠️ Qty mismatch", expectedRisk: ["MEDIUM", "HIGH"], expectedFlags: ["quantity", "mismatch"], forbiddenFlags: [] },
  { invoiceId: "INV-016", bucket: "🚨 Price overage / high shell risk", expectedRisk: ["HIGH", "CRITICAL"], expectedFlags: ["shell", "price"], forbiddenFlags: [] },
  { invoiceId: "INV-018", bucket: "🚨 Blacklisted vendor", expectedRisk: ["CRITICAL"], expectedFlags: ["blacklist", "blacklisted"], forbiddenFlags: [] },
  { invoiceId: "INV-019", bucket: "🚨 Missing PO or GRN", expectedRisk: ["HIGH", "CRITICAL"], expectedFlags: ["missing", "po", "grn"], forbiddenFlags: [] },
  { invoiceId: "INV-020", bucket: "🚨 GSTIN mismatch", expectedRisk: ["HIGH", "CRITICAL"], expectedFlags: ["gstin", "mismatch", "ITC"], forbiddenFlags: [] }
];

function parseResponse(rawData) {
  if (!rawData.text) return { isHITL: true, riskRating: "HITL_PAUSE", flags: [], raw: "" };

  if (rawData.text.includes('"type": "HITL_REQUIRED"')) {
    let riskLevel = "HITL";
    const rm = rawData.text.match(/"riskLevel"\s*:\s*"([^"]+)"/);
    if (rm) riskLevel = rm[1];
    return { isHITL: true, riskRating: riskLevel, flags: [], raw: rawData.text.substring(0, 300) };
  }

  try {
    const s = JSON.parse(rawData.text);
    return {
      isHITL: false,
      riskRating: s.risk_rating || "UNKNOWN",
      riskScore: s.risk_score ?? null,
      flags: s.flags_detected || [],
      recommended_action: s.recommended_action || "",
      explanation: (s.explanation || "").substring(0, 200),
      raw: rawData.text.substring(0, 200)
    };
  } catch(e) {
    const ratingMatch = rawData.text.match(/"risk_rating"\s*:\s*"([^"]+)"/);
    let flags = [];
    return {
      isHITL: false,
      riskRating: ratingMatch ? ratingMatch[1] : "PARSE_ERROR",
      flags,
      raw: rawData.text.substring(0, 300),
    };
  }
}

function gradeResult(testCase, result) {
  const issues = [];
  const passes = [];

  const riskOk = testCase.expectedRisk.includes(result.riskRating);
  if (riskOk) passes.push(`Risk: ${result.riskRating} ✓`);
  else issues.push(`Risk: got "${result.riskRating}", expected [${testCase.expectedRisk.join('/')}]`);

  const flagText = JSON.stringify(result.flags || []).toLowerCase();
  for (const keyword of testCase.expectedFlags) {
    if (flagText.includes(keyword.toLowerCase())) passes.push(`Flag "${keyword}" found ✓`);
    else issues.push(`Flag "${keyword}" NOT found`);
  }

  for (const keyword of testCase.forbiddenFlags) {
    if (flagText.includes(keyword.toLowerCase())) issues.push(`FALSE POSITIVE: "${keyword}"`);
  }

  if (testCase.expectedRisk.includes("CRITICAL") || testCase.expectedRisk.includes("HIGH")) {
    if (result.isHITL || result.recommended_action === "ESCALATE_TO_HUMAN") passes.push(`HITL triggered ✓`);
    else issues.push(`Missed HITL escalation`);
  }

  const score = passes.length / Math.max(passes.length + issues.length, 1);
  return { passes, issues, score: Math.round(score * 100) };
}

async function runTests() {
  const dbClient = new Client({ connectionString: DB_CONN });
  await dbClient.connect();
  console.log("✓ DB connected. Starting parallel batch test...\n");

  const results = [];
  let totalScore = 0;

  // Batch sizes of 5
  const CONCURRENCY = 5;

  for (let i = 0; i < TEST_CASES.length; i += CONCURRENCY) {
    const batch = TEST_CASES.slice(i, i + CONCURRENCY);
    console.log(`\n=================================================`);
    console.log(`🚀 Dispatching batch: ${batch.map(t => t.invoiceId).join(', ')}`);
    console.log(`=================================================`);

    const promises = batch.map(async (tc) => {
      const startTime = Date.now();
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: tc.invoiceId })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rawData = await response.json();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        const parsed = parseResponse(rawData);
        const grade  = gradeResult(tc, parsed);
        
        return { tc, parsed, grade, elapsed, error: null };
      } catch (err) {
        return { tc, parsed: null, grade: null, elapsed: 0, error: err.message };
      }
    });

    const batchResults = await Promise.all(promises);

    for (const r of batchResults) {
      if (r.error) {
        console.log(`❌ ${r.tc.invoiceId} API FAILED: ${r.error}`);
        continue;
      }

      console.log(`\n📋 ${r.tc.invoiceId} | ${r.tc.bucket} (in ${r.elapsed}s)`);
      if (r.parsed.isHITL) {
        console.log(`   🔴 HITL PAUSE — Risk: ${r.parsed.riskRating}`);
      } else {
        console.log(`   📊 Result: ${r.parsed.riskRating} | Flags: ${(r.parsed.flags || []).length} | Action: ${r.parsed.recommended_action}`);
      }
      console.log(`   🎯 Grade: ${r.grade.score}%`);
      r.grade.passes.forEach(p => console.log(`      ✓ ${p}`));
      r.grade.issues.forEach(i => console.log(`      ✗ ${i}`));

      totalScore += r.grade.score;
      results.push({
        invoiceId: r.tc.invoiceId,
        bucket: r.tc.bucket,
        riskRating: r.parsed.riskRating,
        score: r.grade.score,
        issues: r.grade.issues
      });
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`VERIFICATION REPORT`);
  console.log(`${'═'.repeat(70)}`);

  const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
  console.log(`\nOverall Accuracy: ${avgScore}% (${results.length} test cases)\n`);

  const header = `${'Invoice'.padEnd(12)} ${'Bucket'.padEnd(35)} ${'Risk'.padEnd(10)} ${'Score'.padEnd(7)} ${'Issues'}`;
  console.log(header);
  console.log('─'.repeat(header.length));
  results.forEach(r => {
    const issueStr = r.issues && r.issues.length > 0 ? r.issues[0] : '';
    console.log(
      `${r.invoiceId.padEnd(12)} ${r.bucket.substring(0, 34).padEnd(35)} ${(r.riskRating || 'ERR').padEnd(10)} ${String(r.score || 0).padEnd(7)}% ${issueStr}`
    );
  });

  if (avgScore >= 80) {
    console.log(`\n✅ VERDICT: SUFFICIENT (${avgScore}%). Safe to run mass_audit.js`);
  } else if (avgScore >= 60) {
    console.log(`\n⚠️  VERDICT: MARGINAL (${avgScore}%). Review issues before mass_audit.`);
  } else {
    console.log(`\n❌ VERDICT: LOW (${avgScore}%). Fix prompts before mass_audit.`);
  }

  await dbClient.end();
}

runTests().catch(console.error);
