# Advanced Configuration for Proton Docs MCP

This document covers advanced configuration options and customization for the Proton Docs MCP server.

## Browser Configuration

### Using Existing Chrome Profile

To use your existing Chrome profile where you're already logged into Proton:

```typescript
// In src/index.ts, modify the ensureBrowser method:
private async ensureBrowser() {
  if (!this.browser) {
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--user-data-dir=/Users/yourusername/Library/Application Support/Google/Chrome/Default'
      ],
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' // macOS
      // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // Windows
      // executablePath: '/usr/bin/google-chrome' // Linux
    });
  }
  // ... rest of method
}
```

### Headless Mode

For production use, enable headless mode:

```typescript
this.browser = await puppeteer.launch({
  headless: true, // Set to true for headless operation
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

### Performance Optimization

```typescript
this.browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ]
});
```

## Environment Variables

You can configure the MCP using environment variables:

```bash
# .env file
PROTON_DOCS_HEADLESS=true
PROTON_DOCS_TIMEOUT=30000
PROTON_DOCS_CHROME_PATH=/path/to/chrome
PROTON_DOCS_USER_DATA_DIR=/path/to/chrome/profile
```

Then update your code to use these:

```typescript
const config = {
  headless: process.env.PROTON_DOCS_HEADLESS === 'true',
  timeout: parseInt(process.env.PROTON_DOCS_TIMEOUT || '15000'),
  chromePath: process.env.PROTON_DOCS_CHROME_PATH,
  userDataDir: process.env.PROTON_DOCS_USER_DATA_DIR
};
```

## Custom Selectors

If Proton Docs updates their UI, you may need to update selectors:

```typescript
// Create a selectors configuration object
const SELECTORS = {
  documentTable: 'table',
  searchInput: 'input[placeholder*="Search"]',
  editorFrame: 'iframe[data-testid="editor-frame-edit"]',
  mainEditor: '[data-testid="main-editor"]',
  documentDropdown: '[data-testid="document-name-dropdown"]',
  renameOption: '[data-testid="dropdown-rename"]',
  // ... add more selectors
};
```

## Error Handling

Enhanced error handling with retries:

```typescript
private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.page!.waitForTimeout(1000 * (i + 1)); // Exponential backoff
    }
  }
  throw new Error('Max retries reached');
}
```

## Logging Configuration

Add comprehensive logging:

```typescript
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
    new transports.Console({
      format: format.simple()
    })
  ]
});
```

## Security Enhancements

### Sandboxing

Run the browser in a more secure sandboxed environment:

```typescript
this.browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection'
  ]
});
```

### Content Security

Limit what the browser can access:

```typescript
// Block unnecessary resources
await this.page!.setRequestInterception(true);
this.page!.on('request', (req) => {
  const resourceType = req.resourceType();
  if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
    req.abort();
  } else {
    req.continue();
  }
});
```

## Performance Monitoring

Add performance monitoring:

```typescript
private async measurePerformance<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    console.log(`${name} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`${name} failed after ${duration}ms:`, error);
    throw error;
  }
}
```

## Custom Tool Configuration

Create a configuration file for custom tools:

```json
// config/tools.json
{
  "tools": {
    "list_documents": {
      "timeout": 10000,
      "retries": 3,
      "cache": true
    },
    "create_document": {
      "timeout": 15000,
      "retries": 2,
      "cache": false
    }
  }
}
```

## Testing Configuration

For running tests:

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 30000
};
```

## Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Run as non-root user
RUN useradd -m -u 1001 mcpuser
USER mcpuser

CMD ["node", "dist/index.js"]
```

## Integration with Other Services

### Webhook Integration

```typescript
// Add webhook support for document changes
class WebhookHandler {
  async notifyDocumentCreated(documentUrl: string, title: string) {
    if (process.env.WEBHOOK_URL) {
      await fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'document_created',
          data: { documentUrl, title, timestamp: new Date().toISOString() }
        })
      });
    }
  }
}
```

### Database Integration

```typescript
// Store document metadata in a database
import sqlite3 from 'sqlite3';

class DocumentStore {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database('documents.db');
    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async saveDocument(url: string, title: string) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO documents (url, title, last_accessed) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [url, title],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }
}
```

This advanced configuration allows you to customize the Proton Docs MCP for your specific needs and environment.