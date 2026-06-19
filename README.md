# n8n AI Agent Workflow — Cypress Test Suite

End-to-end tests for the **n8n AI Agent workflow**, written in [Cypress](https://www.cypress.io/). The suite covers authentication flows, workflow validation, node-issue detection, execution triggering, and execution history verification against a locally running n8n instance.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Setup](#setup)
  - [1. Install Dependencies](#1-install-dependencies)
  - [2. Configure Environment Variables](#2-configure-environment-variables)
- [Test Suites](#test-suites)
  - [Suite 1 — n8n Authentication](#suite-1--n8n-authentication)
  - [Suite 2 — n8n Workflow Validation (AI Agent)](#suite-2--n8n-workflow-validation-ai-agent)
- [Test Cases](#test-cases)
- [Test Dependencies](#test-dependencies)
- [Running the Tests](#running-the-tests)
- [Screenshots](#screenshots)
- [Known Limitations & Notes](#known-limitations--notes)
- [Contributing](#contributing)

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18.x |
| npm / yarn | any recent version |
| Cypress | ≥ 13.x (installed as a dev dependency) |
| n8n | running locally on the configured port |

> The n8n instance must have a valid user account and an **AI Agent workflow** (with a Google Gemini Chat Model node) already imported before running the tests.

---

## Project Structure

```
.
├── cypress/
│   ├── e2e/
│   │   └── n8n-ai-agent-workflow.spec.js   # All test cases (this suite)
│   ├── screenshots/                         # Auto-generated on cy.screenshot()
│   └── support/
│       ├── commands.js
│       └── e2e.js
├── cypress.config.js                        # Cypress configuration
├── cypress.env.json                         # ⚠️ Local secrets — never commit
├── .gitignore
├── package.json
└── README.md
```

> **`cypress.env.json` must be added to `.gitignore`** — it contains credentials. See [Configure Environment Variables](#2-configure-environment-variables) for the required shape.

---

## Setup

### 1. Install Dependencies

```bash
npm install
```

Or with Yarn:

```bash
yarn install
```

### 2. Configure Environment Variables

Create a `cypress.env.json` file in the project root. This file is **not tracked by Git** (see `.gitignore`).

```json
{
  "n8nBaseUrl": "http://localhost:5678",
  "n8nUserEmail": "your-email@example.com",
  "n8nUserPassword": "YourPassword",
  "n8nWorkflowId": "SmqM4KAYXK8F3FjD"
}
```

| Variable | Description | Required |
|---|---|---|
| `n8nBaseUrl` | Full base URL of your n8n instance | Yes |
| `n8nUserEmail` | Email of the n8n account used for testing | Yes |
| `n8nUserPassword` | Password for the account above | Yes |
| `n8nWorkflowId` | ID of the AI Agent workflow to test | Yes |

> `workflowId` is validated in `beforeEach` for the Authentication suite — tests will fail fast with a descriptive error if it is missing or empty.

---

## Test Suites

### Suite 1 — n8n Authentication

**File:** `cypress/e2e/n8n-ai-agent-workflow.spec.js`  
**`describe` block:** `n8n Authentication`

Tests the login flow at `/signin` in both success and failure scenarios.

**`beforeEach` setup:**
- Clears cookies and localStorage to guarantee a clean, unauthenticated state before every test.
- Applies `n8nBaseUrl` from env if provided.
- Asserts that `workflowId` is a non-empty string (fast-fail guard).

---

### Suite 2 — n8n Workflow Validation (AI Agent)

**File:** `cypress/e2e/n8n-ai-agent-workflow.spec.js`  
**`describe` block:** `n8n Workflow Validation (AI Agent)`

Tests the AI Agent workflow page: its existence, node health, execution behaviour, and execution history.

**`beforeEach` setup:**
- Applies `n8nBaseUrl` from env if provided.
- Uses `cy.session()` to establish and cache an authenticated session (keyed to `['n8n-auth-session', email]`), avoiding a full login round-trip before every test.

---

## Test Cases

### TC01 — Successful Login

**Suite:** Authentication  
**Goal:** Verify that a valid user can log in and is redirected to the main app.

**Steps:**
1. Intercepts `POST **/rest/login`.
2. Visits `/signin`, fills in email and password from env, clicks the **Sign In** button.
3. Waits for the intercepted login request to complete.

**Assertions:**
- Login response status is `200`.
- Response body contains a `data` property.
- URL after redirect matches `/home` or `/workflows`.
- Sidebar element (`[data-test-id="sidebar"]`, `.el-menu`, etc.) is visible.

**Artifact:** Screenshot taken on completion.
![Screenshot](./cypress/screenshots/n8n-ai-agent-workflow.spec.js/n8n%20Authentication%20--%20TC01%20-%20logs%20in%20successfully%20and%20redirects%20to%20the%20main%20app.png)

---

### TC02 — Invalid Credentials Show Error Toast

**Suite:** Authentication  
**Goal:** Confirm that submitting wrong credentials produces an HTTP error and displays an error message to the user.

> ⚠️ **TC02 always uses hardcoded invalid credentials** (`invalid.user.never.exists@example.com` / `DefinitelyWrongPassword123!`). It must never use values from `cypress.env.json` — this is intentional to avoid accidental lockouts on real accounts.

**Steps:**
1. Intercepts `POST **/rest/login`.
2. Visits `/signin`, fills hardcoded invalid credentials, clicks **Sign In**.
3. Waits for the intercepted login request.

**Assertions:**
- Login response status is `401` or `403`.
- Error message matching `"Wrong username or password. Do you have caps lock on?"` is visible within 5 seconds.

**Artifact:** Screenshot taken on completion.
![Screenshot](./cypress/screenshots/n8n-ai-agent-workflow.spec.js/n8n%20Authentication%20--%20TC02%20-%20shows%20an%20error%20toast%20when%20login%20credentials%20are%20invalid.png)

---

### TC03 — Workflow Exists and Loads Successfully

**Suite:** Workflow Validation  
**Goal:** Verify that the AI Agent workflow page loads, the URL contains the correct workflow ID, and the "AI Agent" node label is rendered on the canvas.

**Steps:**
1. Intercepts `GET **/rest/workflows/{workflowId}`.
2. Visits `/workflow/{workflowId}`.

**Assertions:**
- URL includes `/workflow/{workflowId}`.
- Text `"AI Agent"` is visible on the page within 5 seconds.

**Artifact:** Screenshot taken on completion.
![Screenshot](./cypress/screenshots/n8n-ai-agent-workflow.spec.js/n8n%20Workflow%20Validation%20(AI%20Agent)%20--%20TC03%20-%20verifies%20workflow%20exists%20and%20loads%20successfully.png)

---

### TC04 — Workflow Node Issues Are Detected

**Suite:** Workflow Validation  
**Goal:** Confirm that node-issue indicators (`[data-test-id="node-issues"]`) are present on the workflow canvas, indicating misconfigured or credential-less nodes.

**Steps:**
1. Visits `/workflow/{workflowId}`.
2. Queries all `[data-test-id="node-issues"]` elements.
3. Logs the count to the Cypress command log.

**Assertions:**
- The count of issue indicators is greater than `0`.

**Artifact:** Screenshot taken automatically if any issues are found.

![Screenshot](./cypress/screenshots/n8n-ai-agent-workflow.spec.js/n8n%20Workflow%20Validation%20(AI%20Agent)%20--%20TC04%20-%20identifies%20workflow%20node%20issues.png)

> **Note:** This test intentionally expects issues to exist. A passing result means the workflow has unresolved node issues (e.g. missing Google Gemini credentials), which is the expected state for this test environment.

---

### TC05 — Workflow Execution Fails Due to Missing Credentials

**Suite:** Workflow Validation  
**Goal:** Trigger the workflow via the chat interface and assert that an error notification appears, confirming the execution fails when Google Gemini credentials are absent.

**Steps:**
1. Visits `/workflow/{workflowId}`.
2. Clicks the execution button (CSS: `._executionButtons_1uyi2_130 > [data-state="closed"] > .button`).
3. Types `"hi"` into `.chat-inputs` and clicks `.chat-input-send-button`.

**Assertions:**
- An element matching `.el-notification--error` is visible within 5 seconds.

**Artifact:** Screenshot taken on completion.

![Screenshot](./cypress/screenshots/n8n-ai-agent-workflow.spec.js/n8n%20Workflow%20Validation%20(AI%20Agent)%20--%20TC05%20-%20executes%20the%20workflow%20and%20verifies%20execution%20fails%20due%20to%20missing%20credentials.png)

> ⚠️ **TC06 depends on this test having run first in the same Cypress session.** Run the full spec file rather than selecting individual tests to ensure the execution record exists.

---

### TC06 — Failed Execution Appears in Execution History

**Suite:** Workflow Validation  
**Goal:** Navigate to the global execution history, verify via the API response that at least one finished, failed execution exists, and confirm it is clickable with error detail visible in the UI.

> **Dependency:** TC05 must have run and triggered at least one failed execution before TC06 executes.

**Steps:**
1. Intercepts `GET **/rest/executions**`.
2. Visits `/home/executions`.
3. Waits for the executions API response.

**Assertions (API level):**
- Response status is `200`.
- `executionList.length` is greater than `0`.
  - Response body is normalised across n8n versions: checks `body.data`, `body.results`, and the root `body` array in that order.
- At least one execution satisfies both:
  - `finished === true` **or** `stoppedAt != null`
  - `status` or `waitTill` matches `/error|failed/i`

**Assertions (UI level):**
- A row or list item matching `/error|failed/i` is visible within 15 seconds.
- Clicking the first failed execution row reveals detail text matching `Google Gemini Chat Model`, `error`, `failed`, or `credential` within 15 seconds.

**Artifact:** Screenshot taken on completion.

![Screenshot](./cypress/screenshots/n8n-ai-agent-workflow.spec.js/n8n%20Workflow%20Validation%20(AI%20Agent)%20--%20TC06%20-%20shows%20the%20failed%20execution%20in%20Execution%20History%20with%20error%20detail.png)
---



# Jenkins run Results 
![Result](cypress/jenkinsScreenshot/jenkins%20cypress%20test%20TC01%20-%20TC06.png)

## Test Dependencies

```
TC01  ──► independent
TC02  ──► independent
TC03  ──► independent (uses cy.session for auth)
TC04  ──► independent (uses cy.session for auth)
TC05  ──► independent (uses cy.session for auth)
TC06  ──► depends on TC05 (requires a failed execution record to exist)
```

> Always run the **full spec file** when running Suite 2. Running TC06 in isolation will likely fail if no failed execution exists from a previous TC05 run.

---

## Running the Tests

### Open Cypress GUI (interactive mode)

```bash
npx cypress open
```

Select `n8n-ai-agent-workflow.spec.js` from the test runner.

### Run headlessly (CI / command line)

```bash
npx cypress run --spec "cypress/e2e/n8n-ai-agent-workflow.spec.js"
```

### Run a specific test by title (grep — requires `@cypress/grep` plugin)

```bash
npx cypress run --env grep="TC01"
```

### Run with a different base URL (override env at runtime)

```bash
npx cypress run --env n8nBaseUrl=http://192.168.1.50:5678
```

### Run in headed mode (visible browser, non-interactive)

```bash
npx cypress run --headed --spec "cypress/e2e/n8n-ai-agent-workflow.spec.js"
```

---

## Screenshots

`cy.screenshot()` is called at the end of every test case. Screenshots are saved to:

```
cypress/screenshots/n8n-ai-agent-workflow.spec.js/
```

Screenshots are named automatically by Cypress using the describe/it block titles. On CI, they are preserved as build artifacts for post-run inspection.

> To prevent screenshots from being committed, add `cypress/screenshots/` to `.gitignore`.

---

## Known Limitations & Notes

**Hardcoded execution button selector (TC05)**  
The selector `._executionButtons_1uyi2_130 > [data-state="closed"] > .button` is a generated CSS class name that may change across n8n releases. If TC05 breaks after an n8n upgrade, inspect the updated DOM and update this selector.

**Hardcoded workflow ID in TC06 assertion**  
TC06 checks for the string `"Google Gemini Chat Model"` in the execution detail panel. This string must match a node name in the target workflow. Update it if the workflow's node is renamed.

**TC06 execution list shape varies by n8n version**  
The response normalisation in TC06 (`body.data || body.results || body`) accounts for known variations across n8n versions. Verify the actual shape against `GET /rest/executions/<id>` on your installed version before adding stricter assertions.

**Load test coverage**  
This Cypress suite covers functional and UI-level tests only. Concurrent load testing (100 virtual users) is handled separately by the JMeter test plan (`n8n_test_plan.jmx`).

**Session caching**  
Suite 2 uses `cy.session()` to cache the authenticated state. If the n8n session cookie expires mid-run (e.g. during a very slow CI machine run), subsequent tests in Suite 2 will re-authenticate automatically on the next `beforeEach`.

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Add or update tests under `cypress/e2e/`.
3. Never commit `cypress.env.json` or any file containing credentials.
4. Open a pull request with a description of what was changed and why.

---

