import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { Browser, Page } from "puppeteer";
import { z } from "zod";

// Schema definitions for tool parameters
const ListDocumentsSchema = z.object({
  searchQuery: z.string().optional(),
  limit: z.number().default(20),
});

const ReadDocumentSchema = z.object({
  documentUrl: z.string(),
});

const CreateDocumentSchema = z.object({
  title: z.string(),
  content: z.string().optional(),
});

const SearchDocumentsSchema = z.object({
  query: z.string(),
});

const EditDocumentSchema = z.object({
  documentUrl: z.string(),
  content: z.string(),
  append: z.boolean().default(false),
});

const DeleteDocumentSchema = z.object({
  documentUrl: z.string(),
  permanent: z.boolean().default(false),
});

const ShareDocumentSchema = z.object({
  documentUrl: z.string(),
  email: z.string().email(),
  permission: z.enum(['view', 'edit']).default('view'),
});

const FormatTextSchema = z.object({
  documentUrl: z.string(),
  format: z.enum(['bold', 'italic', 'underline', 'strikethrough']),
  selection: z.string().optional(),
});

const CreateListSchema = z.object({
  documentUrl: z.string(),
  listType: z.enum(['bullet', 'numbered']),
  items: z.array(z.string()),
});

const InsertLinkSchema = z.object({
  documentUrl: z.string(),
  text: z.string(),
  url: z.string().url(),
});

const ChangeFontSchema = z.object({
  documentUrl: z.string(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
});

const DownloadDocumentSchema = z.object({
  documentUrl: z.string(),
  format: z.enum(['docx', 'pdf', 'txt', 'markdown']).default('docx'),
});

const CopyDocumentSchema = z.object({
  documentUrl: z.string(),
  newTitle: z.string(),
});

const GetVersionHistorySchema = z.object({
  documentUrl: z.string(),
});

const SetAlignmentSchema = z.object({
  documentUrl: z.string(),
  alignment: z.enum(['left', 'center', 'right', 'justify']),
});

class ProtonDocsServer {
  private server: Server;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "proton-docs-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async ensureBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: false, // Set to true for production
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // Uncomment to use existing Chrome profile
        // userDataDir: '/path/to/chrome/profile',
      });
    }
    if (!this.page) {
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 800 });
    }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_documents",
          description: "List recent documents from Proton Docs",
          inputSchema: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "Optional search query to filter documents",
              },
              limit: {
                type: "number",
                description: "Maximum number of documents to return",
                default: 20,
              },
            },
          },
        },
        {
          name: "read_document",
          description: "Read the content of a specific Proton Docs document",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document to read",
              },
            },
            required: ["documentUrl"],
          },
        },
        {
          name: "create_document",
          description: "Create a new document in Proton Docs",
          inputSchema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Title of the new document",
              },
              content: {
                type: "string",
                description: "Initial content of the document",
              },
            },
            required: ["title"],
          },
        },
        {
          name: "search_documents",
          description: "Search for documents in Proton Docs",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "edit_document",
          description: "Edit an existing document in Proton Docs",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document to edit",
              },
              content: {
                type: "string",
                description: "New content to add or replace",
              },
              append: {
                type: "boolean",
                description: "Whether to append content or replace it",
                default: false,
              },
            },
            required: ["documentUrl", "content"],
          },
        },
        {
          name: "delete_document",
          description: "Delete a document (move to trash or permanently delete)",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document to delete",
              },
              permanent: {
                type: "boolean",
                description: "Whether to permanently delete (requires document to be in trash)",
                default: false,
              },
            },
            required: ["documentUrl"],
          },
        },
        {
          name: "share_document",
          description: "Share a document with another user",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document to share",
              },
              email: {
                type: "string",
                description: "Email address to share with",
              },
              permission: {
                type: "string",
                enum: ["view", "edit"],
                description: "Permission level",
                default: "view",
              },
            },
            required: ["documentUrl", "email"],
          },
        },
        {
          name: "format_text",
          description: "Apply text formatting (bold, italic, underline, strikethrough)",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document",
              },
              format: {
                type: "string",
                enum: ["bold", "italic", "underline", "strikethrough"],
                description: "Format to apply",
              },
              selection: {
                type: "string",
                description: "Text to select before formatting (optional)",
              },
            },
            required: ["documentUrl", "format"],
          },
        },
        {
          name: "create_list",
          description: "Create a bullet or numbered list",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document",
              },
              listType: {
                type: "string",
                enum: ["bullet", "numbered"],
                description: "Type of list to create",
              },
              items: {
                type: "array",
                items: { type: "string" },
                description: "List items",
              },
            },
            required: ["documentUrl", "listType", "items"],
          },
        },
        {
          name: "insert_link",
          description: "Insert a hyperlink in the document",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document",
              },
              text: {
                type: "string",
                description: "Link text",
              },
              url: {
                type: "string",
                description: "Target URL",
              },
            },
            required: ["documentUrl", "text", "url"],
          },
        },
        {
          name: "change_font",
          description: "Change font family or size",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document",
              },
              fontFamily: {
                type: "string",
                description: "Font family (e.g., Arial, Times New Roman)",
              },
              fontSize: {
                type: "number",
                description: "Font size in pixels",
              },
            },
            required: ["documentUrl"],
          },
        },
        {
          name: "download_document",
          description: "Download a document in various formats",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document to download",
              },
              format: {
                type: "string",
                enum: ["docx", "pdf", "txt", "markdown"],
                description: "Download format",
                default: "docx",
              },
            },
            required: ["documentUrl"],
          },
        },
        {
          name: "copy_document",
          description: "Make a copy of a document",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document to copy",
              },
              newTitle: {
                type: "string",
                description: "Title for the copy",
              },
            },
            required: ["documentUrl", "newTitle"],
          },
        },
        {
          name: "get_version_history",
          description: "View version history of a document",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document",
              },
            },
            required: ["documentUrl"],
          },
        },
        {
          name: "set_alignment",
          description: "Set text alignment",
          inputSchema: {
            type: "object",
            properties: {
              documentUrl: {
                type: "string",
                description: "URL of the document",
              },
              alignment: {
                type: "string",
                enum: ["left", "center", "right", "justify"],
                description: "Text alignment",
              },
            },
            required: ["documentUrl", "alignment"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "list_documents":
          return await this.listDocuments(request.params.arguments);
        case "read_document":
          return await this.readDocument(request.params.arguments);
        case "create_document":
          return await this.createDocument(request.params.arguments);
        case "search_documents":
          return await this.searchDocuments(request.params.arguments);
        case "edit_document":
          return await this.editDocument(request.params.arguments);
        case "delete_document":
          return await this.deleteDocument(request.params.arguments);
        case "share_document":
          return await this.shareDocument(request.params.arguments);
        case "format_text":
          return await this.formatText(request.params.arguments);
        case "create_list":
          return await this.createList(request.params.arguments);
        case "insert_link":
          return await this.insertLink(request.params.arguments);
        case "change_font":
          return await this.changeFont(request.params.arguments);
        case "download_document":
          return await this.downloadDocument(request.params.arguments);
        case "copy_document":
          return await this.copyDocument(request.params.arguments);
        case "get_version_history":
          return await this.getVersionHistory(request.params.arguments);
        case "set_alignment":
          return await this.setAlignment(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async listDocuments(args: unknown) {
    const params = ListDocumentsSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto('https://docs.proton.me/u/1/recents', {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForSelector('table', { timeout: 10000 });

      if (params.searchQuery) {
        await this.page!.type('input[placeholder*="Search"]', params.searchQuery);
        await this.page!.keyboard.press('Enter');
        await this.page!.waitForTimeout(1000);
      }

      const documents = await this.page!.evaluate((limit) => {
        const rows = document.querySelectorAll('tbody tr');
        const docs = [];
        
        for (let i = 0; i < Math.min(rows.length, limit); i++) {
          const row = rows[i];
          const titleCell = row.querySelector('td:first-child');
          const viewedCell = row.querySelector('td:nth-child(2)');
          const createdByCell = row.querySelector('td:nth-child(3)');
          const locationCell = row.querySelector('td:nth-child(4)');
          
          if (titleCell) {
            docs.push({
              title: titleCell.textContent?.trim() || 'Untitled',
              viewed: viewedCell?.textContent?.trim() || '',
              createdBy: createdByCell?.textContent?.trim() || '',
              location: locationCell?.textContent?.trim() || '',
              url: row.getAttribute('data-url') || '',
            });
          }
        }
        
        return docs;
      }, params.limit);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ documents }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list documents: ${error}`
      );
    }
  }

  private async readDocument(args: unknown) {
    const params = ReadDocumentSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForSelector('iframe[data-testid="editor-frame-edit"]', {
        timeout: 15000,
      });

      const content = await this.page!.evaluate(() => {
        const iframe = document.querySelector('iframe[data-testid="editor-frame-edit"]') as HTMLIFrameElement;
        if (iframe && iframe.contentDocument) {
          const editor = iframe.contentDocument.querySelector('[data-testid="main-editor"]');
          if (editor) {
            return {
              text: editor.textContent || '',
              html: editor.innerHTML || '',
            };
          }
        }
        return { text: '', html: '' };
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify(content, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read document: ${error}`
      );
    }
  }

  private async createDocument(args: unknown) {
    const params = CreateDocumentSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto('https://docs.proton.me/u/1/doc', {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForTimeout(3000);

      // Check if rename dialog appears
      const renameInput = await this.page!.$('[data-testid="input-input-element"]');
      if (renameInput) {
        await renameInput.click({ clickCount: 3 });
        await renameInput.type(params.title);
        await this.page!.keyboard.press('Enter');
      } else {
        // Click on document title to rename
        await this.page!.click('[data-testid="document-name-dropdown"]');
        await this.page!.waitForSelector('[data-testid="dropdown-rename"]');
        await this.page!.click('[data-testid="dropdown-rename"]');
        await this.page!.waitForSelector('[data-testid="input-input-element"]');
        const titleInput = await this.page!.$('[data-testid="input-input-element"]');
        await titleInput!.click({ clickCount: 3 });
        await titleInput!.type(params.title);
        await this.page!.keyboard.press('Enter');
      }

      // Add content if provided
      if (params.content) {
        await this.page!.waitForSelector('iframe[data-testid="editor-frame-edit"]');
        const frame = this.page!.frames().find(f => f.name().includes('editor') || f.url().includes('editor'));
        if (frame) {
          await frame.click('[data-testid="main-editor"]');
          await frame.type('[data-testid="main-editor"]', params.content);
        }
      }

      await this.page!.waitForTimeout(2000);
      const documentUrl = this.page!.url();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            documentUrl,
            title: params.title,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create document: ${error}`
      );
    }
  }

  private async searchDocuments(args: unknown) {
    const params = SearchDocumentsSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto('https://docs.proton.me/u/1/recents', {
        waitUntil: 'networkidle2',
      });

      const searchInput = await this.page!.waitForSelector('input[placeholder*="Search"]');
      await searchInput.type(params.query);
      await this.page!.keyboard.press('Enter');
      await this.page!.waitForTimeout(2000);

      const results = await this.page!.evaluate(() => {
        const rows = document.querySelectorAll('tbody tr');
        const docs = [];
        
        rows.forEach(row => {
          const titleCell = row.querySelector('td:first-child');
          if (titleCell) {
            docs.push({
              title: titleCell.textContent?.trim() || '',
              url: row.getAttribute('data-url') || '',
            });
          }
        });
        
        return docs;
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            query: params.query,
            results,
            count: results.length,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to search documents: ${error}`
      );
    }
  }

  private async editDocument(args: unknown) {
    const params = EditDocumentSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForSelector('iframe[data-testid="editor-frame-edit"]');
      const frame = this.page!.frames().find(f => f.name().includes('editor') || f.url().includes('editor'));
      
      if (frame) {
        await frame.click('[data-testid="main-editor"]');
        
        if (params.append) {
          await this.page!.keyboard.down('Control');
          await this.page!.keyboard.press('End');
          await this.page!.keyboard.up('Control');
          await this.page!.keyboard.press('Enter');
        } else {
          await this.page!.keyboard.down('Control');
          await this.page!.keyboard.press('a');
          await this.page!.keyboard.up('Control');
        }

        await frame.type('[data-testid="main-editor"]', params.content);
      }

      await this.page!.waitForTimeout(2000);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            documentUrl: params.documentUrl,
            action: params.append ? 'appended' : 'replaced',
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to edit document: ${error}`
      );
    }
  }

  private async deleteDocument(args: unknown) {
    const params = DeleteDocumentSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      if (params.permanent) {
        // Navigate to trash first
        await this.page!.goto('https://docs.proton.me/u/1/trash', {
          waitUntil: 'networkidle2',
        });
        
        // Find and permanently delete the document
        // This would need specific implementation based on trash UI
        throw new McpError(
          ErrorCode.InvalidRequest,
          "Permanent deletion from trash not yet implemented"
        );
      } else {
        // Move to trash
        await this.page!.goto(params.documentUrl, {
          waitUntil: 'networkidle2',
        });

        await this.page!.click('[data-testid="document-name-dropdown"]');
        await this.page!.waitForSelector('[data-testid="dropdown-move-to-trash"]');
        await this.page!.click('[data-testid="dropdown-move-to-trash"]');
        
        // Confirm if needed
        const confirmButton = await this.page!.$('button:has-text("Move to trash")');
        if (confirmButton) {
          await confirmButton.click();
        }

        await this.page!.waitForTimeout(2000);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              action: 'moved_to_trash',
              documentUrl: params.documentUrl,
            }, null, 2),
          }],
        };
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete document: ${error}`
      );
    }
  }

  private async shareDocument(args: unknown) {
    const params = ShareDocumentSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      // Click share button
      await this.page!.click('button:has-text("Share")');
      await this.page!.waitForTimeout(1000);

      // Enter email
      const emailInput = await this.page!.waitForSelector('input[type="email"]');
      await emailInput.type(params.email);

      // Set permission if edit
      if (params.permission === 'edit') {
        const permissionDropdown = await this.page!.$('[data-testid="permission-dropdown"]');
        if (permissionDropdown) {
          await permissionDropdown.click();
          await this.page!.click('button:has-text("Can edit")');
        }
      }

      // Send invitation
      await this.page!.click('button:has-text("Send")');
      await this.page!.waitForTimeout(2000);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            documentUrl: params.documentUrl,
            sharedWith: params.email,
            permission: params.permission,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to share document: ${error}`
      );
    }
  }

  private async formatText(args: unknown) {
    const params = FormatTextSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForSelector('iframe[data-testid="editor-frame-edit"]');
      const frame = this.page!.frames().find(f => f.name().includes('editor') || f.url().includes('editor'));
      
      if (frame) {
        // Select text if provided
        if (params.selection) {
          await frame.click('[data-testid="main-editor"]');
          await this.page!.keyboard.down('Control');
          await this.page!.keyboard.press('f');
          await this.page!.keyboard.up('Control');
          await this.page!.keyboard.type(params.selection);
          await this.page!.keyboard.press('Escape');
        }

        // Apply formatting
        const formatMap = {
          bold: { selector: 'button[title*="Bold"]', shortcut: 'Control+b' },
          italic: { selector: 'button[title*="Italic"]', shortcut: 'Control+i' },
          underline: { selector: 'button[title*="Underline"]', shortcut: 'Control+u' },
          strikethrough: { selector: 'button[title*="Strike"]', shortcut: 'Control+Shift+x' },
        };

        const format = formatMap[params.format];
        
        // Try toolbar button first
        const button = await frame.$(format.selector);
        if (button) {
          await button.click();
        } else {
          // Use keyboard shortcut
          const keys = format.shortcut.split('+');
          for (const key of keys) {
            if (key !== keys[keys.length - 1]) {
              await this.page!.keyboard.down(key);
            }
          }
          await this.page!.keyboard.press(keys[keys.length - 1]);
          for (const key of keys.slice(0, -1)) {
            await this.page!.keyboard.up(key);
          }
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            format: params.format,
            applied: true,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to format text: ${error}`
      );
    }
  }

  private async createList(args: unknown) {
    const params = CreateListSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForSelector('iframe[data-testid="editor-frame-edit"]');
      const frame = this.page!.frames().find(f => f.name().includes('editor') || f.url().includes('editor'));
      
      if (frame) {
        await frame.click('[data-testid="main-editor"]');
        
        // Click list button
        const listSelector = params.listType === 'bullet' 
          ? 'button[title*="Bullet list"]'
          : 'button[title*="Numbered list"]';
        
        const listButton = await frame.$(listSelector);
        if (listButton) {
          await listButton.click();
        }

        // Type list items
        for (let i = 0; i < params.items.length; i++) {
          await frame.type('[data-testid="main-editor"]', params.items[i]);
          if (i < params.items.length - 1) {
            await this.page!.keyboard.press('Enter');
          }
        }

        // Exit list mode
        await this.page!.keyboard.press('Enter');
        await this.page!.keyboard.press('Enter');
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            listType: params.listType,
            itemCount: params.items.length,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create list: ${error}`
      );
    }
  }

  private async insertLink(args: unknown) {
    const params = InsertLinkSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForSelector('iframe[data-testid="editor-frame-edit"]');
      const frame = this.page!.frames().find(f => f.name().includes('editor') || f.url().includes('editor'));
      
      if (frame) {
        await frame.click('[data-testid="main-editor"]');
        
        // Type the text
        await frame.type('[data-testid="main-editor"]', params.text);
        
        // Select the text
        for (let i = 0; i < params.text.length; i++) {
          await this.page!.keyboard.down('Shift');
          await this.page!.keyboard.press('ArrowLeft');
          await this.page!.keyboard.up('Shift');
        }
        
        // Open link dialog
        await this.page!.keyboard.down('Control');
        await this.page!.keyboard.press('k');
        await this.page!.keyboard.up('Control');
        
        await this.page!.waitForTimeout(500);
        
        // Type URL
        await this.page!.keyboard.type(params.url);
        await this.page!.keyboard.press('Enter');
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            text: params.text,
            url: params.url,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to insert link: ${error}`
      );
    }
  }

  private async changeFont(args: unknown) {
    const params = ChangeFontSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForSelector('iframe[data-testid="editor-frame-edit"]');
      const frame = this.page!.frames().find(f => f.name().includes('editor') || f.url().includes('editor'));
      
      if (frame) {
        // Select all text
        await frame.click('[data-testid="main-editor"]');
        await this.page!.keyboard.down('Control');
        await this.page!.keyboard.press('a');
        await this.page!.keyboard.up('Control');
        
        // Change font family
        if (params.fontFamily) {
          const fontButton = await frame.$('button[aria-label*="Font"]');
          if (fontButton) {
            await fontButton.click();
            await this.page!.waitForTimeout(500);
            await this.page!.click(`button:has-text("${params.fontFamily}")`);
          }
        }
        
        // Change font size
        if (params.fontSize) {
          const sizeButton = await frame.$('button[aria-label*="Font size"]');
          if (sizeButton) {
            await sizeButton.click();
            await this.page!.waitForTimeout(500);
            await this.page!.click(`button:has-text("${params.fontSize}px")`);
          }
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            fontFamily: params.fontFamily,
            fontSize: params.fontSize,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to change font: ${error}`
      );
    }
  }

  private async downloadDocument(args: unknown) {
    const params = DownloadDocumentSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      // Open document menu
      await this.page!.click('[data-testid="document-name-dropdown"]');
      await this.page!.waitForSelector('[data-testid="dropdown-download"]');
      await this.page!.click('[data-testid="dropdown-download"]');

      // Select format if there's a submenu
      if (params.format !== 'docx') {
        await this.page!.waitForTimeout(500);
        const formatButton = await this.page!.$(`button:has-text("${params.format.toUpperCase()}")`);
        if (formatButton) {
          await formatButton.click();
        }
      }

      // Wait for download to start
      await this.page!.waitForTimeout(3000);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            format: params.format,
            message: "Download initiated",
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to download document: ${error}`
      );
    }
  }

  private async copyDocument(args: unknown) {
    const params = CopyDocumentSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      // Open document menu
      await this.page!.click('[data-testid="document-name-dropdown"]');
      await this.page!.waitForSelector('[data-testid="dropdown-make-copy"]');
      await this.page!.click('[data-testid="dropdown-make-copy"]');

      // Wait for copy dialog and enter new name
      await this.page!.waitForSelector('[data-testid="input-input-element"]');
      const nameInput = await this.page!.$('[data-testid="input-input-element"]');
      await nameInput!.click({ clickCount: 3 });
      await nameInput!.type(params.newTitle);
      
      // Confirm copy
      await this.page!.click('button:has-text("Copy")');
      await this.page!.waitForTimeout(3000);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            originalUrl: params.documentUrl,
            newTitle: params.newTitle,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to copy document: ${error}`
      );
    }
  }

  private async getVersionHistory(args: unknown) {
    const params = GetVersionHistorySchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      // Open document menu
      await this.page!.click('[data-testid="document-name-dropdown"]');
      await this.page!.waitForSelector('[data-testid="dropdown-version-history"]');
      await this.page!.click('[data-testid="dropdown-version-history"]');

      await this.page!.waitForTimeout(2000);

      // Extract version history if panel opens
      const versions = await this.page!.evaluate(() => {
        const versionElements = document.querySelectorAll('[data-testid="version-item"]');
        const versionList = [];
        
        versionElements.forEach(el => {
          const date = el.querySelector('[data-testid="version-date"]')?.textContent;
          const author = el.querySelector('[data-testid="version-author"]')?.textContent;
          if (date) {
            versionList.push({ date, author });
          }
        });
        
        return versionList;
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            documentUrl: params.documentUrl,
            versions,
            count: versions.length,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get version history: ${error}`
      );
    }
  }

  private async setAlignment(args: unknown) {
    const params = SetAlignmentSchema.parse(args);
    await this.ensureBrowser();
    
    try {
      await this.page!.goto(params.documentUrl, {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForSelector('iframe[data-testid="editor-frame-edit"]');
      const frame = this.page!.frames().find(f => f.name().includes('editor') || f.url().includes('editor'));
      
      if (frame) {
        await frame.click('[data-testid="main-editor"]');
        
        // Select paragraph
        await this.page!.keyboard.down('Control');
        await this.page!.keyboard.press('a');
        await this.page!.keyboard.up('Control');
        
        // Click alignment button
        const alignmentMap = {
          left: 'button[title*="Align left"]',
          center: 'button[title*="Align center"]',
          right: 'button[title*="Align right"]',
          justify: 'button[title*="Justify"]',
        };
        
        const alignButton = await frame.$(alignmentMap[params.alignment]);
        if (alignButton) {
          await alignButton.click();
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            alignment: params.alignment,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to set alignment: ${error}`
      );
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Proton Docs MCP server started");
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Start the server
const server = new ProtonDocsServer();
server.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});