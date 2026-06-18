const { defineConfig } = require('cypress')

let fileBaseUrl
try {
  fileBaseUrl = require('./cypress.env.json').n8nBaseUrl
} catch (error) {
  fileBaseUrl = undefined
}

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_n8nBaseUrl || fileBaseUrl || 'http://localhost:5678',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.spec.js',
  },
})
