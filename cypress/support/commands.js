const baseUrl = Cypress.env('n8nBaseUrl')
const email = Cypress.env('n8nUserEmail')
const password = Cypress.env('n8nUserPassword')

Cypress.Commands.add('loginViaUi', () => {
  cy.visit('/signin')

  cy.get('input[type="email"]').should('be.visible').clear().type(email)
  cy.get('input[type="password"]').should('be.visible').clear().type(password, {
    log: false,
  })

  cy.contains('button, [role="button"]', /^sign in$/i).click()
  cy.url({ timeout: 20000 }).should('match', /\/home|\/workflows/)
  cy.get('[data-test-id="sidebar"], [data-test="sidebar"], .el-menu', {
    timeout: 20000,
  }).should('be.visible')

  if (baseUrl) {
    Cypress.config('baseUrl', baseUrl)
  }
})

Cypress.Commands.add('loginSession', () => {
  cy.session(
    ['n8n-auth-session', email],
    () => {
      cy.loginViaUi()
    },
    {
      validate: () => {
        cy.visit('/home')
        cy.url().should('include', '/home')
      },
      cacheAcrossSpecs: false,
    },
  )
})
