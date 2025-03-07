# 757 Community Site

This repository contains the source code for the 757 Community website.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server                          |
| `npm run build`           | Build your production site                       |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run validate`        | Validate JSON data files against schemas         |
| `npm run update-calendar` | Update calendar events from external sources     |

## JSON Data Validation

This project uses JSON Schema validation to ensure data integrity. The validation is performed in two ways:

1. **GitHub Actions**: Automatically validates JSON files against their schemas on push and pull requests.
2. **Local Validation**: You can validate JSON files locally using the following command:

```bash
npm run validate
```

### Setting up Git Hooks (Optional)

To automatically validate JSON files before each commit, you can set up a pre-commit hook:

1. Install husky:
```bash
npm install husky --save-dev
npx husky install
```

2. Add the pre-commit hook:
```bash
npx husky add .husky/pre-commit "npm run validate"
```

This will prevent commits if the JSON files don't conform to their schemas.

### JSON Schemas

The JSON schemas are located in the `src/data/schemas` directory:

- `conferences.schema.json`: Schema for conference data
- `meetups.schema.json`: Schema for meetup data

When adding or modifying data in the JSON files, make sure they conform to these schemas.

### Automated Calendar Updates

This project includes a GitHub Actions workflow that automatically updates calendar events every 6 hours. The workflow can also be triggered manually. See `.github/workflows/update-calendar.yml` for details.
