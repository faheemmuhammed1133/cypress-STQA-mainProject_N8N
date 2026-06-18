describe('n8n Authentication', () => {
  const baseUrl = Cypress.env('n8nBaseUrl')
  const email = Cypress.env('n8nUserEmail')
  const password = Cypress.env('n8nUserPassword')
  const workflowId = Cypress.env('n8nWorkflowId')

  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    if (baseUrl) {
      Cypress.config('baseUrl', baseUrl)
    }
    expect(workflowId, 'workflowId should be provided via cypress.env.json').to.be.a('string').and.not.be.empty
  })

  it('TC01 - logs in successfully and redirects to the main app', () => {
    cy.intercept('POST', '**/rest/login').as('loginRequest')

    cy.visit('/signin')
    cy.get('input[type="email"]').should('be.visible').clear().type(email)
    cy.get('input[type="password"]').should('be.visible').clear().type(password, {
      log: false,
    })
    cy.contains('button, [role="button"]', /^sign in$/i).click()
    cy.wait(5000);

    cy.wait('@loginRequest').then(({ response }) => {
      expect(response?.statusCode).to.eq(200)
      expect(response?.body).to.have.property('data')
    })

    cy.url({ timeout: 2000 }).should('match', /\/home|\/workflows/)
    cy.get('[data-test-id="sidebar"], [data-test="sidebar"], .el-menu', {
      timeout: 2000,
    }).should('be.visible')
cy.screenshot();
  })

  it('TC02 - shows an error toast when login credentials are invalid', () => {
    // NOTE: TC02 must always use hardcoded invalid credentials, never Cypress.env() values.
    const invalidEmail = 'invalid.user.never.exists@example.com'
    const invalidPassword = 'DefinitelyWrongPassword123!'

    cy.intercept('POST', '**/rest/login').as('loginRequest')

    cy.visit('/signin')
    cy.get('input[type="email"]').should('be.visible').clear().type(invalidEmail)
    cy.get('input[type="password"]').should('be.visible').clear().type(invalidPassword, {
      log: false,
    })
    cy.contains('button, [role="button"]', /^sign in$/i).click()

    cy.wait('@loginRequest').then(({ response }) => {
      expect([401, 403]).to.include(response?.statusCode)
    })

    cy.contains(/Wrong username or password. Do you have caps lock on?/i, {
      timeout: 5000,
    }).should('be.visible')
cy.screenshot();
  })
})

describe('n8n Workflow Validation (AI Agent)', () => {
  const baseUrl = Cypress.env('n8nBaseUrl')
  const email = Cypress.env('n8nUserEmail')
  const password = Cypress.env('n8nUserPassword')
  const workflowId = Cypress.env('n8nWorkflowId')

  const workflowApiPattern = () => `**/rest/workflows/${workflowId}`
  const workflowPagePath = () => `/workflow/${workflowId}`

  beforeEach(() => {
    if (baseUrl) {
      Cypress.config('baseUrl', baseUrl)
    }

    // Establish authenticated session for non-login test cases.
    cy.session(['n8n-auth-session', email], () => {
      cy.visit('/signin')
      cy.get('input[type="email"]').should('be.visible').clear().type(email)
      cy.get('input[type="password"]').should('be.visible').clear().type(password, {
        log: false,
      })
      cy.contains('button, [role="button"]', /^sign in$/i).click()
      cy.url({ timeout: 5000 }).should('match', /\/home|\/workflows/)
    })
  })

  it('TC03 - verifies workflow exists and loads successfully', () => {
    cy.intercept('GET', workflowApiPattern()).as('getWorkflow')
    
    cy.visit(workflowPagePath())

  cy.url().should('include', `/workflow/${workflowId}`)

  cy.contains('AI Agent', { timeout: 5000 })
  .should('be.visible')
  
    
    cy.url().should('include', `/workflow/${workflowId}`)
  cy.screenshot();
  })

  ///////////////////////////////////////////////////////////////////////////////////////////


  it('TC04 - identifies workflow node issues', () => {
  cy.visit(workflowPagePath())
  
  cy.get('[data-test-id="node-issues"]').then(($issues) => {
    cy.wait(2000);
    const issueCount = $issues.length

    cy.log(`Found ${issueCount} node issue(s)`)

    if (issueCount > 0) {
      cy.screenshot()
    }

    expect(issueCount).to.be.greaterThan(0)
  })
})

  it('TC05 - executes the workflow and verifies execution fails due to missing credentials', () => {
    cy.visit(workflowPagePath())

    cy.get('._executionButtons_1uyi2_130 > [data-state="closed"] > .button').click()

    cy.get('.chat-inputs').clear().type("hi")
    cy.get('.chat-input-send-button').click()

    cy.get('.el-notification--error', {
      timeout: 5000,}).should('be.visible')
    cy.screenshot()
  })

  it('TC06 - shows the failed execution in Execution History with error detail', () => {
    // NOTE: TC06 depends on TC05 having executed at least once in this run.
    cy.intercept('GET', '**/rest/executions**').as('getExecutions')

    cy.visit('/home/executions')

    cy.wait('@getExecutions').then(({ response }) => {
      expect(response?.statusCode).to.eq(200)

      // NOTE: n8n response fields can vary by version; verify shape against /rest/executions/<id> before finalizing strict assertions.
      const executions = response?.body?.data || response?.body?.results || response?.body || []
      const executionList = Array.isArray(executions)
        ? executions
        : Array.isArray(executions?.results)
          ? executions.results
          : []

      expect(executionList.length).to.be.greaterThan(0)

      const hasFailedFinishedExecution = executionList.some((execution) => {
        const isFinished = execution?.finished === true || execution?.stoppedAt != null

        const isFailed = /error|failed/i.test(
          `${execution?.status || ''} ${execution?.waitTill || ''}`,
        )

        return isFinished && isFailed
      })

      expect(hasFailedFinishedExecution).to.eq(true)
    })

    cy.contains('tr, [role="row"], .execution-list-item', /error|failed/i, {
      timeout: 15000,
    }).should('be.visible')

    cy.contains('tr, [role="row"], .execution-list-item', /error|failed/i)
      .first()
      .click({ force: true })

    cy.contains('div, span', /Google Gemini Chat Model|error|failed|credential/i, {
      timeout: 15000,
    }).should('be.visible')

    cy.screenshot();
  })
})
