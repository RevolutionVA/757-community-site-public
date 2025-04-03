$workflowContent = @"
name: Validate JSON Files

on:
  push:
    paths:
      - 'src/data/*.json'
      - 'src/data/schemas/*.json'
  pull_request:
    paths:
      - 'src/data/*.json'
      - 'src/data/schemas/*.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install -g ajv-cli ajv-formats

      - name: Validate conferences.json
        run: |
          ajv validate -s src/data/schemas/conferences.schema.json -d src/data/conferences.json --strict=false --all-errors

      - name: Validate meetup-groups.json
        run: |
          ajv validate -s src/data/schemas/meetups.schema.json -d src/data/meetup-groups.json --strict=false --all-errors
"@

# Ensure the directory exists
if (-not (Test-Path ".github/workflows")) {
    New-Item -ItemType Directory -Path ".github/workflows" -Force
}

# Write the workflow file
$workflowContent | Out-File -FilePath ".github/workflows/validate-json.yml" -Encoding utf8 