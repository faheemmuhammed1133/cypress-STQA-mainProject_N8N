import './commands'

const baseUrl = Cypress.env('n8nBaseUrl')

// Keep runtime baseUrl aligned with env so cy.visit('/...') resolves correctly.
if (baseUrl) {
  Cypress.config('baseUrl', baseUrl)
}
