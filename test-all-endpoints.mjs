#!/usr/bin/env node
// =============================================================================
// test-all-endpoints.mjs
//
// Actually calls every real backend endpoint over HTTP (via fetch) and
// records the real response. Not a code review — this hits a genuinely
// running server. Requires Node 18+ (built-in fetch/FormData/Blob).
//
// USAGE:
//   1. Make sure your backend is actually running (npm run dev, or
//      whatever you use) against a real database with a seeded
//      super_admin (see src/db/seed.ts / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
//      in your .env).
//   2. Fill in the CONFIG block below (base URL + admin credentials).
//   3. node test-all-endpoints.mjs
//   4. Read the console output as it runs, and open
//      ENDPOINT_TEST_REPORT.md afterward for the full record.
//
// WHAT THIS DOES:
//   - Logs in as a real super_admin and keeps a real session cookie.
//   - Walks through the real dependency chain (publisher -> publication ->
//     volume -> issue -> author -> editor -> reviewer -> article -> review
//     assignment -> ...) creating real rows via the real API, the same way
//     an admin using the UI would, storing each real id for reuse.
//   - Hits every GET/POST/PATCH route that exists in this backend
//     (verified directly against src/modules/*/*.routes.ts and src/app.ts's
//     mount prefixes — not guessed).
//   - Tests both a happy path and at least one realistic failure path per
//     endpoint (missing auth, bad id, invalid body) where practical.
//   - Uploads a real (tiny, hand-built, valid) PDF for every
//     file-upload endpoint — doesn't skip these.
//   - Writes ENDPOINT_TEST_REPORT.md with the literal request/response for
//     every single call made, plus a pass/fail summary table.
//
// WHAT THIS DOES NOT DO (documented, not silently skipped):
//   - Test the reviewer's own authenticated endpoints' happy path
//     (GET /api/reviewer/my-reviews, GET /api/reviewer/manuscripts/:id,
//     PATCH /api/reviewer/reviews/:id) beyond the unauthenticated-failure
//     case. A reviewer login has no admin-settable password (by design —
//     see users.service.ts's createUser) — completing that flow needs a
//     real "set your password" email, which this script has no way to
//     intercept. Test that path manually once, or extend RUN_REVIEWER_FLOW
//     below if you have SMTP capture (Mailhog/Mailtrap) you can query.
//   - Verify real email delivery (Resend) — only checks that the
//     triggering endpoint itself succeeded; check your server logs /
//     Resend dashboard for actual delivery.
//   - Verify real R2 file storage — only checks the endpoint returned a
//     URL-shaped response; doesn't fetch that URL back.
//   - Clean up after itself. Every "create" call here is a real row in
//     your real database (this app has no real delete anywhere — see
//     docs/PERMISSIONS.md). Everything created is clearly named/titled
//     with a "TEST_" prefix and today's ISO timestamp so you can find and
//     manually remove it afterward if you don't want it kept.
// =============================================================================

// ─────────────────────────── CONFIG — edit this ───────────────────────────
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:4000/api";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme";
// Set to true only if you have a way to complete the reviewer
// "set your password" email flow yourself and want to fill in a real
// reviewer login below to test those three endpoints' happy path too.
const RUN_REVIEWER_FLOW = false;
const REVIEWER_EMAIL = "";
const REVIEWER_PASSWORD = "";
// ────────────────────────────────────────────────────────────────────────

import { writeFileSync } from "node:fs";

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const results = []; // { method, path, request, status, body, verdict, notes }
let cookie = "";

function log(...args) {
  console.log(...args);
}

async function call(method, path, { body, isForm, form, auth = true, expectStatus } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {};
  if (auth && cookie) headers.Cookie = cookie;

  let fetchBody;
  if (isForm) {
    fetchBody = form; // real FormData, browser/node sets multipart boundary itself
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  let res, json, text;
  try {
    res = await fetch(url, { method, headers, body: fetchBody });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0]; // keep just "name=value"
    text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  } catch (err) {
    const record = {
      method,
      path,
      request: isForm ? "[multipart form]" : body,
      status: "NETWORK_ERROR",
      responseBody: String(err),
      verdict: "FAIL",
      notes: `Could not reach ${url} — is the server actually running?`,
    };
    results.push(record);
    log(`  ✗ ${method} ${path} — NETWORK ERROR: ${err.message}`);
    return { ok: false, status: 0, body: null };
  }

  const verdict = expectStatus
    ? res.status === expectStatus
      ? "PASS"
      : "FAIL"
    : res.status < 500
      ? "PASS"
      : "FAIL"; // default: "didn't crash" is the bar unless a specific status was expected

  results.push({
    method,
    path,
    request: isForm ? "[multipart form — see notes]" : body,
    status: res.status,
    responseBody: json ?? text,
    verdict,
    notes: expectStatus ? `Expected ${expectStatus}` : "",
  });

  const mark = verdict === "PASS" ? "✓" : "✗";
  log(`  ${mark} ${method} ${path} → ${res.status}`);

  return { ok: res.ok, status: res.status, body: json };
}

// A real, minimal, valid PDF — hand-built (same construction used to
// verify the Document Import Pipeline for real during development —
// magic bytes + real xref table, not just a renamed .txt file).
function realPdfBlob() {
  const content = "BT /F1 24 Tf 72 700 Td (Test PDF) Tj ET";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

async function main() {
  log(`\n=== Testing ${BASE_URL} — run ${RUN_ID} ===\n`);

  // ───────────────────────── AUTH ─────────────────────────
  log("── Auth ──");
  await call("GET", "/auth/me", { auth: false }); // unauthenticated — should be 401, not a crash
  const login = await call("POST", "/auth/login", {
    auth: false,
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    expectStatus: 200,
  });
  if (!login.ok) {
    log("\n!!! Login failed — check ADMIN_EMAIL/ADMIN_PASSWORD at the top of this file. Stopping. !!!\n");
    writeReport();
    process.exit(1);
  }
  await call("POST", "/auth/login", { auth: false, body: { email: ADMIN_EMAIL, password: "definitely-wrong" }, expectStatus: 401 });
  await call("GET", "/auth/me", { expectStatus: 200 });
  await call("POST", "/auth/forgot-password", { auth: false, body: { email: ADMIN_EMAIL } });
  await call("POST", "/auth/forgot-password", { auth: false, body: { email: "nobody-real@example.com" } }); // should behave identically (no leak)
  await call("POST", "/auth/reset-password", { auth: false, body: { token: "not-a-real-token", password: "SomeNewPassword123" }, expectStatus: 400 });

  // ─────────────────────── PUBLISHERS ───────────────────────
  log("\n── Publishers ──");
  const publisherSlug = `test-publisher-${RUN_ID}`;
  const pub = await call("POST", "/admin/publishers", {
    body: {
      slug: publisherSlug,
      name: `TEST_Publisher_${RUN_ID}`,
      status: "active",
    },
    expectStatus: 201,
  });
  const publisherId = pub.body?.data?.id;
  await call("GET", "/publishers");
  await call("GET", `/publishers/${publisherSlug}`);
  await call("GET", `/publishers/${publisherId}/publications`);
  await call("GET", `/admin/publishers/${publisherId}`);
  await call("GET", "/admin/publishers/not-a-real-id", { expectStatus: 404 });
  await call("PATCH", `/admin/publishers/${publisherId}`, { body: { name: `TEST_Publisher_Updated_${RUN_ID}` } });
  await call("POST", "/admin/publishers", { auth: false, body: { slug: "x", name: "x", status: "active" }, expectStatus: 401 });

  // ─────────────────────── PUBLICATIONS ───────────────────────
  log("\n── Publications ──");
  const pubSlug = `test-journal-${RUN_ID}`;
  const publication = await call("POST", "/admin/publications", {
    body: {
      slug: pubSlug,
      publisherId,
      name: `TEST_Journal_${RUN_ID}`,
      shortName: "TJ",
      status: "active",
    },
    expectStatus: 201,
  });
  const publicationId = publication.body?.data?.id;
  await call("GET", "/publications");
  await call("GET", `/publications/${pubSlug}`);
  await call("GET", `/admin/publications/${publicationId}`);
  await call("PATCH", `/admin/publications/${publicationId}`, { body: { tagline: "Updated via test script" } });
  await call("PATCH", `/admin/publications/${publicationId}`, { body: { status: "archived" } }); // exercises the publications.delete-OR-update branch
  await call("POST", "/admin/publications", { body: { slug: "bad" /* missing required fields */ }, expectStatus: 400 });

  // ─────────────────────── VOLUMES ───────────────────────
  log("\n── Volumes ──");
  const volume = await call("POST", "/admin/volumes", {
    body: { publicationId, number: 1, year: 2026, status: "active" },
    expectStatus: 201,
  });
  const volumeId = volume.body?.data?.id;
  await call("GET", "/admin/volumes");
  await call("GET", `/publications/${publicationId}/volumes`);
  await call("GET", `/volumes/${volumeId}`);
  await call("GET", "/volumes/not-a-real-id", { expectStatus: 404 });
  await call("PATCH", `/admin/volumes/${volumeId}`, { body: { year: 2027 } });

  // ─────────────────────── ISSUES ───────────────────────
  log("\n── Issues ──");
  const issue = await call("POST", "/admin/issues", {
    body: { volumeId, publicationId, number: 1, label: "Issue 1", status: "current" },
    expectStatus: 201,
  });
  const issueId = issue.body?.data?.id;
  await call("GET", "/admin/issues");
  await call("GET", `/volumes/${volumeId}/issues`);
  await call("GET", `/publications/${publicationId}/issues`);
  await call("GET", `/publications/${publicationId}/current-issue`);
  await call("GET", `/issues/${issueId}`);
  await call("PATCH", `/admin/issues/${issueId}`, { body: { label: "Issue 1 (Updated)" } });

  // ─────────────────────── AUTHORS ───────────────────────
  log("\n── Authors ──");
  const authorSlug = `test-author-${RUN_ID}`;
  const author = await call("POST", "/admin/authors", {
    body: {
      slug: authorSlug,
      firstName: "Test",
      lastName: `Author_${RUN_ID}`,
      fullName: `Test Author_${RUN_ID}`,
    },
    expectStatus: 201,
  });
  const authorId = author.body?.data?.id;
  await call("GET", "/authors");
  await call("GET", `/authors/${authorSlug}`);
  await call("GET", `/authors/${authorId}/articles`);
  await call("GET", `/admin/authors/${authorId}`);
  await call("PATCH", `/admin/authors/${authorId}`, { body: { bio: "Updated via test script" } });

  // ─────────────────────── EDITORS ───────────────────────
  log("\n── Editors ──");
  const editorSlug = `test-editor-${RUN_ID}`;
  const editor = await call("POST", "/admin/editors", {
    body: {
      slug: editorSlug,
      name: `Test Editor_${RUN_ID}`,
      role: "managing_editor",
      publicationId,
      status: "active",
    },
    expectStatus: 201,
  });
  const editorId = editor.body?.data?.id;
  await call("GET", "/admin/editors");
  await call("GET", `/publications/${publicationId}/editorial-board`);
  await call("GET", `/editors/${editorSlug}`);
  await call("GET", `/admin/editors/${editorId}`);
  await call("PATCH", `/admin/editors/${editorId}`, { body: { bio: "Updated via test script" } });

  // ─────────────────────── REVIEWERS ───────────────────────
  log("\n── Reviewers ──");
  const reviewer = await call("POST", "/admin/reviewers", {
    body: {
      name: `Test Reviewer_${RUN_ID}`,
      email: `test-reviewer-${RUN_ID}@example.com`,
      status: "active",
      expertise: ["Testing"],
    },
    expectStatus: 201,
  });
  const reviewerId = reviewer.body?.data?.id;
  await call("GET", "/admin/reviewers");
  await call("GET", `/admin/reviewers/${reviewerId}`);
  await call("PATCH", `/admin/reviewers/${reviewerId}`, { body: { country: "Testland" } });

  // ─────────────────────── ARTICLES ───────────────────────
  log("\n── Articles ──");
  const articleSlug = `test-article-${RUN_ID}`;
  const article = await call("POST", "/admin/articles", {
    body: {
      slug: articleSlug,
      title: `TEST_Article_${RUN_ID}`,
      abstract: "A test abstract created by test-all-endpoints.mjs.",
      publicationId,
      articleType: "Research Article",
      status: "draft",
      authorIds: authorId ? [authorId] : [],
      editorIds: editorId ? [editorId] : [],
    },
    expectStatus: 201,
  });
  const articleId = article.body?.data?.id;
  await call("GET", "/admin/articles");
  await call("GET", `/admin/articles/${articleId}`);
  await call("PATCH", `/admin/articles/${articleId}`, { body: { abstract: "Updated abstract via test script." } });
  // public list/detail — won't show yet, article isn't published; confirms the visibility rule holds
  await call("GET", "/articles");
  await call("GET", `/articles/${articleSlug}`, { auth: false, expectStatus: 404 });

  log("  — walking the real editorial workflow transition chain —");
  const transitions = ["submitted", "under_review", "accepted", "scheduled", "published"];
  for (const status of transitions) {
    await call("PATCH", `/admin/articles/${articleId}/status`, { body: { status } });
  }
  await call("PATCH", `/admin/articles/${articleId}/status`, { body: { status: "draft" } }); // published -> draft is valid (unpublish)
  await call("PATCH", `/admin/articles/${articleId}/status`, { body: { status: "published" } }); // republish so the public-page test below works
  await call("PATCH", `/admin/articles/${articleId}/status`, { body: { status: "under_review" }, expectStatus: 400 }); // published -> under_review is NOT a valid transition

  // now it's really published — confirm it really shows up publicly
  await call("GET", `/articles/${articleSlug}`, { auth: false, expectStatus: 200 });

  // ─────────────────────── REVIEWS (assignment) ───────────────────────
  log("\n── Reviews (assignment) ──");
  const review = await call("POST", "/admin/reviews", {
    body: { manuscriptId: articleId, reviewerId, dueDate: "2026-12-31" },
    expectStatus: 201,
  });
  const reviewId = review.body?.data?.id;
  await call("GET", "/admin/reviews");
  await call("GET", `/admin/reviews?manuscriptId=${articleId}`);
  await call("GET", `/admin/reviews?reviewerId=${reviewerId}`);
  await call("GET", `/admin/reviews/${reviewId}`);
  // duplicate assignment — should be rejected (real unique constraint)
  await call("POST", "/admin/reviews", { body: { manuscriptId: articleId, reviewerId }, expectStatus: 409 });
  await call("POST", "/admin/reviews", { body: { manuscriptId: "not-a-real-id", reviewerId }, expectStatus: 400 });

  // ─────────────────────── REVIEWER SELF-SERVICE ───────────────────────
  log("\n── Reviewer self-service (unauthenticated-failure paths always; happy path only if RUN_REVIEWER_FLOW) ──");
  await call("GET", "/reviewer/my-reviews", { auth: false, expectStatus: 401 });
  await call("GET", `/reviewer/manuscripts/${articleId}`, { auth: false, expectStatus: 401 });
  await call("PATCH", `/reviewer/reviews/${reviewId}`, { auth: false, body: { status: "completed" }, expectStatus: 401 });

  if (RUN_REVIEWER_FLOW && REVIEWER_EMAIL && REVIEWER_PASSWORD) {
    const savedAdminCookie = cookie;
    const reviewerLogin = await call("POST", "/auth/login", {
      auth: false,
      body: { email: REVIEWER_EMAIL, password: REVIEWER_PASSWORD },
      expectStatus: 200,
    });
    if (reviewerLogin.ok) {
      await call("GET", "/reviewer/my-reviews", { expectStatus: 200 });
      await call("GET", `/reviewer/manuscripts/${articleId}`); // 200 only if this reviewer is genuinely assigned to it
      await call("PATCH", `/reviewer/reviews/${reviewId}`, {
        body: { status: "completed", recommendation: "accept", comments: "Looks good — via test script." },
      });
    }
    cookie = savedAdminCookie; // switch back to admin for the rest of the run
  } else {
    log("  (skipped happy-path — set RUN_REVIEWER_FLOW + REVIEWER_EMAIL/PASSWORD at the top of this file to test it)");
  }

  // ─────────────────────── INDEXING ───────────────────────
  log("\n── Indexing ──");
  const indexing = await call("POST", "/admin/indexing", {
    body: { publicationId, name: `TEST_Index_${RUN_ID}`, status: "unconfirmed" },
    expectStatus: 201,
  });
  const indexingId = indexing.body?.data?.id;
  await call("GET", "/admin/indexing");
  await call("GET", `/publications/${publicationId}/indexing`);
  await call("GET", `/admin/indexing/${indexingId}`);
  await call("PATCH", `/admin/indexing/${indexingId}`, { body: { status: "confirmed" } });

  // ─────────────────────── CONTACT ───────────────────────
  log("\n── Contact ──");
  const contact = await call("POST", "/contact", {
    auth: false,
    body: {
      name: `TEST_Contact_${RUN_ID}`,
      email: "test-contact@example.com",
      subject: "Test message from test-all-endpoints.mjs",
      message: "This is a real test message sent by the endpoint test script.",
    },
    expectStatus: 201,
  });
  const contactMessageId = contact.body?.data?.id;
  await call("GET", "/admin/contact-messages");
  await call("GET", `/admin/contact-messages/${contactMessageId}`);
  await call("PATCH", `/admin/contact-messages/${contactMessageId}/status`, { body: { status: "read" } });
  await call("POST", "/contact", { auth: false, body: { name: "x" /* missing fields */ }, expectStatus: 400 });

  // ─────────────────────── SUBMISSIONS (real file upload) ───────────────────────
  log("\n── Manuscript Submission (real PDF upload) ──");
  {
    const form = new FormData();
    form.append("manuscript", realPdfBlob(), "test-manuscript.pdf");
    form.append("title", `TEST_Submission_${RUN_ID}`);
    form.append("abstract", "A real test submission sent by the endpoint test script.");
    form.append("articleType", "Research Article");
    form.append("publicationId", publicationId);
    form.append("correspondingAuthor", JSON.stringify({ name: "Test Submitter", email: "test-submitter@example.com" }));
    form.append("additionalAuthors", JSON.stringify([]));
    await call("POST", "/submissions", { auth: false, isForm: true, form, expectStatus: 201 });
  }
  {
    // failure path: no file attached at all
    const form = new FormData();
    form.append("title", "Missing manuscript file");
    form.append("abstract", "abstract");
    form.append("articleType", "Research Article");
    form.append("publicationId", publicationId);
    form.append("correspondingAuthor", JSON.stringify({ name: "X", email: "x@example.com" }));
    await call("POST", "/submissions", { auth: false, isForm: true, form, expectStatus: 400 });
  }

  // ─────────────────────── UPLOADS (real file) ───────────────────────
  log("\n── Uploads (real PDF) ──");
  {
    const form = new FormData();
    form.append("file", realPdfBlob(), "test-upload.pdf");
    form.append("folder", "test-script-uploads");
    await call("POST", "/admin/uploads", { isForm: true, form, expectStatus: 201 });
  }
  await call("POST", "/admin/uploads", { auth: false, isForm: true, form: new FormData(), expectStatus: 401 });

  // ─────────────────────── DOCUMENT IMPORT (real file) ───────────────────────
  log("\n── Document Import (real PDF) ──");
  {
    const form = new FormData();
    form.append("file", realPdfBlob(), "test-import.pdf");
    await call("POST", "/admin/import", { isForm: true, form, expectStatus: 201 });
  }
  {
    const form = new FormData();
    form.append("file", new Blob(["not a real document"], { type: "text/plain" }), "fake.txt");
    await call("POST", "/admin/import", { isForm: true, form, expectStatus: 400 });
  }

  // ─────────────────────── USERS ───────────────────────
  log("\n── Users ──");
  const newUserEmail = `test-user-${RUN_ID}@example.com`;
  const newUser = await call("POST", "/admin/users", {
    body: { name: `TEST_User_${RUN_ID}`, email: newUserEmail, role: "editorial_subadmin" },
    expectStatus: 201,
  });
  const newUserId = newUser.body?.data?.id;
  await call("GET", "/admin/users");
  await call("GET", `/admin/users/${newUserId}`);
  if (newUser.body?.data && "passwordHash" in newUser.body.data) {
    log("  ✗ SECURITY: password_hash was present in the create-user response body!");
    results[results.length - 1].notes += " ⚠ passwordHash leaked in response!";
  }
  await call("PATCH", `/admin/users/${newUserId}`, { body: { active: false } });
  await call("PATCH", `/admin/users/${newUserId}`, { body: { active: true } });
  await call("POST", "/admin/users", { auth: false, body: { name: "x", email: "x@example.com", role: "admin" }, expectStatus: 401 });

  // ─────────────────────── SEARCH ───────────────────────
  log("\n── Search ──");
  await call("GET", `/search?q=${encodeURIComponent("test")}`, { auth: false });
  await call("GET", "/search", { auth: false }); // no query param — check it doesn't crash

  // ─────────────────────── RESEARCH ASSISTANT ───────────────────────
  log("\n── Research Assistant ──");
  await call("POST", "/research-assistant/query", { auth: false, body: { question: "What is this journal about?" } });
  await call("POST", "/research-assistant/query", { auth: false, body: { question: "" } }); // documented EMPTY_QUERY case

  // ─────────────────────── LOGOUT ───────────────────────
  log("\n── Logout ──");
  await call("POST", "/auth/logout", { expectStatus: 200 });
  await call("GET", "/auth/me", { expectStatus: 200 }); // by design: 200 + data:null when logged out, never 401 — see getMe()

  writeReport();
}

function writeReport() {
  const total = results.length;
  const passed = results.filter((r) => r.verdict === "PASS").length;
  const failed = total - passed;

  let md = `# Endpoint Test Report — run ${RUN_ID}\n\n`;
  md += `Base URL: \`${BASE_URL}\`\n\n`;
  md += `**${passed}/${total} calls passed.**\n\n`;
  if (failed > 0) {
    md += `## Failures\n\n`;
    for (const r of results.filter((x) => x.verdict === "FAIL")) {
      md += `- \`${r.method} ${r.path}\` → ${r.status} ${r.notes}\n`;
    }
    md += `\n`;
  }
  md += `## Full log\n\n`;
  for (const r of results) {
    md += `### ${r.method} ${r.path}\n`;
    md += `**Status:** ${r.status} — **${r.verdict}**${r.notes ? ` (${r.notes})` : ""}\n\n`;
    md += `**Request body:**\n\`\`\`json\n${r.request === undefined ? "(none)" : JSON.stringify(r.request, null, 2)}\n\`\`\`\n\n`;
    md += `**Response:**\n\`\`\`json\n${JSON.stringify(r.responseBody, null, 2)}\n\`\`\`\n\n`;
  }

  writeFileSync("ENDPOINT_TEST_REPORT.md", md, "utf-8");
  log(`\n=== Done: ${passed}/${total} passed. Full report: ENDPOINT_TEST_REPORT.md ===\n`);
  if (failed > 0) {
    log(`Failures:`);
    for (const r of results.filter((x) => x.verdict === "FAIL")) {
      log(`  ${r.method} ${r.path} → ${r.status} ${r.notes}`);
    }
  }
}

main().catch((err) => {
  console.error("Script crashed:", err);
  writeReport();
  process.exit(1);
});