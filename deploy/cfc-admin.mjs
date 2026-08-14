import crypto from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'

const CFC_HOST = process.env.CFC_HOST || 'cfc.bj.baidubce.com'
const FUNCTION_NAME = process.env.CFC_FUNCTION_NAME || 'FamilyTreeApiFunction'
const credentials = fs.readFileSync(process.env.BCE_CREDENTIALS || `${process.env.HOME}/.bce/credentials`, 'utf8')
const accessKey = credentials.match(/^bce_access_key_id\s*=\s*(.+)$/m)?.[1]?.trim()
const secretKey = credentials.match(/^bce_secret_access_key\s*=\s*(.+)$/m)?.[1]?.trim()
if (!accessKey || !secretKey) throw new Error('BCE credentials not found')

function encode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
}

function sign(method, path, query = '') {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const prefix = `bce-auth-v1/${accessKey}/${timestamp}/1800`
  const canonical = `${method}\n${path}\n${query}\nhost:${encode(CFC_HOST)}`
  const signingKey = crypto.createHmac('sha256', secretKey).update(prefix).digest('hex')
  const signature = crypto.createHmac('sha256', signingKey).update(canonical).digest('hex')
  return `${prefix}/host/${signature}`
}

function request(method, path, query = '', body = '') {
  return new Promise((resolve, reject) => {
    const suffix = query ? `?${query}` : ''
    const payload = body ? Buffer.from(body) : null
    const req = https.request({
      hostname: CFC_HOST,
      path: `${path}${suffix}`,
      method,
      headers: {
        Host: CFC_HOST,
        Authorization: sign(method, path, query),
        ...(payload ? { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': payload.length } : {}),
      },
    }, (response) => {
      let output = ''
      response.on('data', (chunk) => { output += chunk })
      response.on('end', () => {
        let parsed = output
        try { parsed = JSON.parse(output) } catch {}
        if (response.statusCode >= 400) reject(new Error(`CFC HTTP ${response.statusCode}: ${JSON.stringify(parsed)}`))
        else resolve(parsed)
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function listFunctions() {
  const result = await request('GET', '/v1/functions')
  return result.Functions || []
}

async function createFunction() {
  const existing = (await listFunctions()).find((item) => item.FunctionName === FUNCTION_NAME)
  if (existing) return existing
  const keyFile = process.env.FAMILY_TREE_INTERNAL_KEY_FILE
  if (!keyFile) throw new Error('FAMILY_TREE_INTERNAL_KEY_FILE is required')
  const body = JSON.stringify({
    Code: { ZipFile: fs.readFileSync(process.env.CFC_ZIP || '/private/tmp/family-tree-cfc.zip').toString('base64'), Publish: true, DryRun: false },
    Description: '家谱网站 API proxy to the family-tree server',
    FunctionName: FUNCTION_NAME,
    Timeout: 10,
    Handler: 'index.handler',
    Runtime: 'nodejs12',
    MemorySize: 128,
    Environment: { Variables: {
      SERVER_API_BASE_URL: process.env.SERVER_API_BASE_URL || 'http://180.76.180.105/genealogy/api',
      INTERNAL_API_KEY: fs.readFileSync(keyFile, 'utf8').trim(),
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://caoyuchun2003.github.io',
    }},
  })
  return request('POST', '/v1/functions', '', body)
}

async function createTrigger(functionBrn) {
  const query = `FunctionBrn=${encode(functionBrn)}`
  const relations = (await request('GET', '/v1/relation', query)).Relation || []
  const existing = relations.find((relation) => relation.Data?.ResourcePath === '/api/{proxy+}')
  if (existing) return existing
  return request('POST', '/v1/relation', '', JSON.stringify({
    Target: functionBrn,
    Source: 'cfc-http-trigger/v1/CFCAPI',
    Data: { AuthType: 'anonymous', Method: 'GET,POST,OPTIONS', ResourcePath: '/api/{proxy+}' },
  }))
}

const command = process.argv[2] || 'deploy'
if (command === 'list') {
  for (const item of await listFunctions()) console.log(JSON.stringify({ name: item.FunctionName, brn: item.FunctionBrn }))
} else if (command === 'create') {
  const functionInfo = await createFunction()
  console.log(JSON.stringify({ function: functionInfo.FunctionName, brn: functionInfo.FunctionBrn }))
} else {
  const functionInfo = await createFunction()
  const trigger = await createTrigger(functionInfo.FunctionBrn)
  const data = trigger.Data || trigger.Relation?.[0]?.Data || {}
  console.log(JSON.stringify({ function: functionInfo.FunctionName, endpoint: data.EndpointPrefix, resourcePath: data.ResourcePath, apiBaseUrl: `${data.EndpointPrefix}/api` }))
}
