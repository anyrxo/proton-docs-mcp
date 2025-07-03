#!/usr/bin/env node

/**
 * Example usage of the Proton Docs MCP
 * This script demonstrates how to interact with the MCP programmatically
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

class ProtonDocsMCPClient {
  constructor() {
    this.client = new Client(
      {
        name: 'proton-docs-example',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  async connect() {
    // Start the MCP server
    const serverProcess = spawn('node', ['../dist/index.js'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    // Create transport
    const transport = new StdioClientTransport({
      readable: serverProcess.stdout,
      writable: serverProcess.stdin,
    });

    await this.client.connect(transport);
    console.log('Connected to Proton Docs MCP server');
  }

  async listDocuments() {
    console.log('\n=== Listing Documents ===');
    const result = await this.client.callTool({
      name: 'list_documents',
      arguments: { limit: 5 }
    });
    
    const response = JSON.parse(result.content[0].text);
    console.log(`Found ${response.documents.length} documents:`);
    response.documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title} (${doc.viewed})`);
    });
    return response.documents;
  }

  async createDocument(title, content) {
    console.log(`\n=== Creating Document: ${title} ===`);
    const result = await this.client.callTool({
      name: 'create_document',
      arguments: { title, content }
    });
    
    const response = JSON.parse(result.content[0].text);
    console.log(`Document created: ${response.documentUrl}`);
    return response;
  }

  async searchDocuments(query) {
    console.log(`\n=== Searching for: ${query} ===`);
    const result = await this.client.callTool({
      name: 'search_documents',
      arguments: { query }
    });
    
    const response = JSON.parse(result.content[0].text);
    console.log(`Found ${response.count} matching documents`);
    return response.results;
  }

  async readDocument(documentUrl) {
    console.log(`\n=== Reading Document ===`);
    const result = await this.client.callTool({
      name: 'read_document',
      arguments: { documentUrl }
    });
    
    const response = JSON.parse(result.content[0].text);
    console.log(`Content length: ${response.text.length} characters`);
    console.log(`First 100 characters: ${response.text.substring(0, 100)}...`);
    return response;
  }

  async formatText(documentUrl, format) {
    console.log(`\n=== Applying ${format} formatting ===`);
    const result = await this.client.callTool({
      name: 'format_text',
      arguments: { documentUrl, format }
    });
    
    const response = JSON.parse(result.content[0].text);
    console.log(`Formatting applied: ${response.success}`);
    return response;
  }

  async createList(documentUrl, listType, items) {
    console.log(`\n=== Creating ${listType} list ===`);
    const result = await this.client.callTool({
      name: 'create_list',
      arguments: { documentUrl, listType, items }
    });
    
    const response = JSON.parse(result.content[0].text);
    console.log(`List created with ${response.itemCount} items`);
    return response;
  }

  async shareDocument(documentUrl, email, permission) {
    console.log(`\n=== Sharing document with ${email} ===`);
    const result = await this.client.callTool({
      name: 'share_document',
      arguments: { documentUrl, email, permission }
    });
    
    const response = JSON.parse(result.content[0].text);
    console.log(`Document shared: ${response.success}`);
    return response;
  }

  async downloadDocument(documentUrl, format) {
    console.log(`\n=== Downloading document as ${format} ===`);
    const result = await this.client.callTool({
      name: 'download_document',
      arguments: { documentUrl, format }
    });
    
    const response = JSON.parse(result.content[0].text);
    console.log(`Download initiated: ${response.message}`);
    return response;
  }
}

// Example workflow
async function runExample() {
  const client = new ProtonDocsMCPClient();
  
  try {
    await client.connect();
    
    // List existing documents
    const documents = await client.listDocuments();
    
    // Create a new document
    const newDoc = await client.createDocument(
      'MCP Test Document',
      'This document was created using the Proton Docs MCP.\n\nIt demonstrates automated document creation.'
    );
    
    // Search for documents
    await client.searchDocuments('MCP');
    
    // Read the document we just created
    await client.readDocument(newDoc.documentUrl);
    
    // Apply formatting
    await client.formatText(newDoc.documentUrl, 'bold');
    
    // Create a list
    await client.createList(newDoc.documentUrl, 'bullet', [
      'First item',
      'Second item',
      'Third item'
    ]);
    
    // Share the document (uncomment to test)
    // await client.shareDocument(newDoc.documentUrl, 'test@example.com', 'view');
    
    // Download the document
    await client.downloadDocument(newDoc.documentUrl, 'pdf');
    
    console.log('\n=== Example completed successfully! ===');
    
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

module.exports = { ProtonDocsMCPClient };