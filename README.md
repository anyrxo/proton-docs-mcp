# Proton Docs MCP

A Model Context Protocol (MCP) server that enables AI assistants like Claude Desktop, Cursor, and other MCP-compatible clients to interact with your Proton Docs documents through browser automation.

## ✨ Features

- 📄 **Create documents** with custom titles and content
- 📖 **Read document contents** directly from Proton Docs
- ✏️ **Edit documents** with append or replace functionality
- 📝 **Text formatting** (bold, italic, underline, strikethrough)
- 📋 **List management** (ordered and unordered lists)
- 🔗 **Link insertion** and management
- 🎨 **Font customization** (family, size, color)
- 📐 **Text alignment** (left, center, right, justify)
- 🗑️ **Delete documents** (to trash or permanently)
- 📤 **Export documents** (DOCX, PDF, TXT, Markdown)
- 🔍 **Search documents** by content
- 👥 **Share documents** with other users
- 📊 **Document listing** with optional search filtering
- 📚 **Version history** access
- 🔐 **Secure browser automation** through Puppeteer

## 📋 Prerequisites

- Node.js 16 or higher
- Valid Proton account with access to Proton Docs
- Claude Desktop, Cursor, or any MCP-compatible client

## 🚀 Quick Start

### 1. Install from npm (Recommended)

```bash
npm install -g proton-docs-mcp
```

### 2. Or install from source

```bash
git clone https://github.com/anyrxo/proton-docs-mcp.git
cd proton-docs-mcp
npm install
npm run build
```

## ⚙️ Configuration

### Claude Desktop

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "proton-docs": {
      "command": "node",
      "args": ["path/to/proton-docs-mcp/dist/index.js"],
      "env": {
        "PROTON_EMAIL": "your-email@proton.me",
        "PROTON_PASSWORD": "your-password"
      }
    }
  }
}
```

### Cursor

Add to your Cursor settings:

```json
{
  "mcp.servers": {
    "proton-docs": {
      "command": "node",
      "args": ["path/to/proton-docs-mcp/dist/index.js"],
      "env": {
        "PROTON_EMAIL": "your-email@proton.me",
        "PROTON_PASSWORD": "your-password"
      }
    }
  }
}
```

### Environment Variables

Set your Proton credentials as environment variables:

```bash
export PROTON_EMAIL="your-email@proton.me"
export PROTON_PASSWORD="your-password"
```

Or create a `.env` file in the project root:

```
PROTON_EMAIL=your-email@proton.me
PROTON_PASSWORD=your-password
```

## 🎯 Usage Examples

Once configured, you can ask your AI assistant:

- "Create a new document titled 'Meeting Notes' with today's agenda"
- "List all my Proton Docs documents"
- "Read the contents of my 'Project Plan' document"
- "Make the text in my document bold and add a bulleted list"
- "Export my document as a PDF"
- "Share my document with colleague@example.com with edit permissions"
- "Search for documents containing 'quarterly report'"
- "Delete the old draft document"

## 🛠️ Available Tools

The MCP provides these tools:

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_documents` | List all documents with optional search | `searchQuery?`, `limit` |
| `create_document` | Create a new document | `title`, `content?` |
| `read_document` | Read document contents | `documentUrl` |
| `edit_document` | Edit document content | `documentUrl`, `content`, `append?` |
| `delete_document` | Delete a document | `documentUrl`, `permanent?` |
| `search_documents` | Search documents by content | `query` |
| `share_document` | Share document with user | `documentUrl`, `email`, `permission` |
| `format_text` | Apply text formatting | `documentUrl`, `format`, `text?` |
| `insert_list` | Create lists in document | `documentUrl`, `type`, `items` |
| `insert_link` | Add links to document | `documentUrl`, `text`, `url` |
| `change_font` | Modify font properties | `documentUrl`, `property`, `value` |
| `align_text` | Set text alignment | `documentUrl`, `alignment` |
| `export_document` | Export to various formats | `documentUrl`, `format` |
| `get_version_history` | Access document versions | `documentUrl` |
| `copy_document` | Duplicate a document | `documentUrl`, `newTitle?` |

## 🧪 Testing

Test if the MCP is working:

```bash
# Build the project
npm run build

# Test connection
npm run dev
```

## 🔧 Troubleshooting

### Authentication Issues

1. Verify your Proton credentials are correct
2. Check if 2FA is enabled (may require app-specific password)
3. Ensure environment variables are properly set

### Browser Automation Issues

- Make sure you have sufficient system resources
- Check if Proton Docs is accessible in your region
- Verify network connectivity to Proton services

### Tool not showing in Claude/Cursor

1. Restart your AI client after configuration
2. Check the logs for any error messages
3. Verify the path to the MCP server is correct
4. Ensure all dependencies are installed

## 📝 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 🔒 Security Considerations

- **Credentials**: Store credentials securely using environment variables
- **Browser Isolation**: Each session runs in a separate browser instance
- **No Data Storage**: No document content is cached or stored locally
- **HTTPS Only**: All communication with Proton services uses HTTPS
- **Session Management**: Automatic cleanup of browser sessions

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🐛 Known Issues

- Large documents may take time to process
- Complex formatting operations might require multiple steps
- Rate limiting may apply for extensive operations
- Browser automation requires graphical environment

## 📮 Support

- Issues: [GitHub Issues](https://github.com/anyrxo/proton-docs-mcp/issues)
- Discussions: [GitHub Discussions](https://github.com/anyrxo/proton-docs-mcp/discussions)

## 🏆 Why Choose Proton Docs MCP?

- **🔒 Privacy-First**: Built for Proton's privacy-focused ecosystem
- **🤖 AI-Native**: Designed specifically for AI assistant integration  
- **⚡ Comprehensive**: 14+ tools covering all document management needs
- **🛡️ Secure**: No data storage, browser isolation, HTTPS-only
- **📦 Easy Install**: npm package with global CLI support
- **🔧 Professional**: Production-ready with proper error handling
- **📚 Well-Documented**: Complete guides and examples included

## 🔗 Related Projects

- [proton-drive-mcp](https://github.com/anyrxo/proton-drive-mcp) - MCP server for Proton Drive
- [Model Context Protocol](https://github.com/modelcontextprotocol) - Official MCP specification

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/anyrxo/proton-docs-mcp?style=social)
![GitHub forks](https://img.shields.io/github/forks/anyrxo/proton-docs-mcp?style=social)
![GitHub issues](https://img.shields.io/github/issues/anyrxo/proton-docs-mcp)
![GitHub license](https://img.shields.io/github/license/anyrxo/proton-docs-mcp)
![npm version](https://img.shields.io/npm/v/proton-docs-mcp)
![npm downloads](https://img.shields.io/npm/dm/proton-docs-mcp)

---

Made with ❤️ for the Proton ecosystem and AI automation community