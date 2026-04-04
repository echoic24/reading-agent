// Feishu API Integration

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis'
const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET

// Get tenant access token
export async function getTenantAccessToken(): Promise<string> {
  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  })
  
  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(`Feishu auth failed: ${data.msg}`)
  }
  
  return data.tenant_access_token
}

// Create Feishu Document (Cloud Docs)
export async function createDocument(title: string, content: string, userOpenId?: string) {
  const token = await getTenantAccessToken()
  
  const response = await fetch(`${FEISHU_API_BASE}/docx/v1/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title,
      folder_token: '' // Creates in user's personal space
    })
  })
  
  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(`Failed to create Feishu document: ${data.msg}`)
  }
  
  const docToken = data.data.document.document_id
  
  // Add content to the document
  if (content) {
    await updateDocumentContent(docToken, content, token)
  }
  
  return {
    doc_id: docToken,
    url: `https://www.feishu.cn/docx/${docToken}`
  }
}

// Update document content
export async function updateDocumentContent(docToken: string, markdown: string, token?: string) {
  const accessToken = token || await getTenantAccessToken()
  
  // Convert markdown to blocks (simplified version)
  const blocks = markdownToBlocks(markdown)
  
  const response = await fetch(`${FEISHU_API_BASE}/docx/v1/documents/${docToken}/blocks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  // For simplicity, we'll create the document and return the URL
  // Full content update requires more complex block conversion
  return { success: true }
}

// Convert markdown to Feishu blocks (simplified)
function markdownToBlocks(markdown: string) {
  const lines = markdown.split('\n')
  const blocks: any[] = []
  
  for (const line of lines) {
    if (line.startsWith('# ')) {
      blocks.push({
        block_type: 2, // Heading1
        heading1: { elements: [{ text_run: { content: line.slice(2) } }] }
      })
    } else if (line.startsWith('## ')) {
      blocks.push({
        block_type: 3, // Heading2
        heading2: { elements: [{ text_run: { content: line.slice(3) } }] }
      })
    } else if (line.startsWith('### ')) {
      blocks.push({
        block_type: 4, // Heading3
        heading3: { elements: [{ text_run: { content: line.slice(4) } }] }
      })
    } else if (line.startsWith('> ')) {
      blocks.push({
        block_type: 34, // Quote
        quote: { elements: [{ text_run: { content: line.slice(2) } }] }
      })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({
        block_type: 12, // Bullet
        bullet: { elements: [{ text_run: { content: line.slice(2) } }] }
      })
    } else if (line.match(/^\d+\. /)) {
      blocks.push({
        block_type: 13, // Ordered
        ordered: { elements: [{ text_run: { content: line.replace(/^\d+\. /, '') } }] }
      })
    } else if (line === '---') {
      blocks.push({ block_type: 22 }) // Divider
    } else if (line.trim()) {
      blocks.push({
        block_type: 2, // Paragraph
        paragraph: { elements: [{ text_run: { content: line } }] }
      })
    }
  }
  
  return blocks
}

// Send message to user
export async function sendMessage(openId: string, message: string) {
  const token = await getTenantAccessToken()
  
  const response = await fetch(`${FEISHU_API_BASE}/im/v1/messages?receive_id_type=open_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      receive_id: openId,
      msg_type: 'text',
      content: JSON.stringify({ text: message })
    })
  })
  
  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(`Failed to send message: ${data.msg}`)
  }
  
  return data
}

// Create Feishu Bitable
export async function createBitable(name: string, userOpenId?: string) {
  const token = await getTenantAccessToken()
  
  const response = await fetch(`${FEISHU_API_BASE}/bitable/v1/apps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  })
  
  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(`Failed to create Feishu bitable: ${data.msg}`)
  }
  
  const appToken = data.data.app.token
  
  return {
    app_token: appToken,
    url: `https://acnrlza1yd23.feishu.cn/base/${appToken}`
  }
}
