// 百度云 CFC Node.js 12 compatible proxy.
// Environment: SERVER_API_BASE_URL, INTERNAL_API_KEY, CORS_ORIGIN,
// FAMILY_ACCESS_CODE, AUTH_SECRET.
const crypto = require('crypto')
const http = require('http')
const https = require('https')

exports.handler = function handler(event) {
  const method = event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method) || 'GET'
  if (method === 'OPTIONS') return Promise.resolve(response(204, ''))

  const base = (process.env.SERVER_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) return Promise.resolve(response(500, JSON.stringify({ error: 'SERVER_API_BASE_URL is not configured' })))

  let rawPath = event.path || (event.requestContext && event.requestContext.http && event.requestContext.http.path) || '/api/people'
  rawPath = rawPath.replace(/^\/api/, '') || '/people'
  if (event.rawQueryString) rawPath += `?${event.rawQueryString}`

  if (rawPath === '/login') return Promise.resolve(login(event))
  if (!isAuthenticated(event)) return Promise.resolve(response(401, JSON.stringify({ error: 'unauthorized' })))

  const target = new URL(`${base}${rawPath}`)
  const payload = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body)) : null
  const transport = target.protocol === 'https:' ? https : http

  return new Promise((resolve) => {
    const req = transport.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_API_KEY || '',
        ...(payload ? { 'Content-Length': payload.length } : {}),
      },
    }, (upstream) => {
      const chunks = []
      upstream.on('data', (chunk) => chunks.push(chunk))
      upstream.on('end', () => resolve({
        statusCode: upstream.statusCode || 502,
        headers: corsHeaders(upstream.headers['content-type']),
        body: Buffer.concat(chunks).toString('utf8'),
        isBase64Encoded: false,
      }))
    })
    req.on('error', (error) => resolve(response(502, JSON.stringify({ error: error.message }))))
    if (payload) req.write(payload)
    req.end()
  })
}

function login(event) {
  if ((event.httpMethod || 'POST') !== 'POST') return response(405, JSON.stringify({ error: 'method_not_allowed' }))
  const configuredCode = process.env.FAMILY_ACCESS_CODE || ''
  const secret = process.env.AUTH_SECRET || ''
  if (!configuredCode || !secret) return response(500, JSON.stringify({ error: 'auth_not_configured' }))
  let payload
  try { payload = JSON.parse(event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : '{}') } catch { return response(400, JSON.stringify({ error: 'invalid_json' })) }
  if (!safeEqual(String(payload.code || ''), configuredCode)) return response(401, JSON.stringify({ error: 'invalid_code' }))
  const now = Math.floor(Date.now() / 1000)
  const claims = { sub: 'family-member', iat: now, exp: now + 7 * 24 * 60 * 60 }
  const encoded = base64url(JSON.stringify(claims))
  const signature = base64url(crypto.createHmac('sha256', secret).update(encoded).digest('base64'))
  return response(200, JSON.stringify({ token: `${encoded}.${signature}`, expiresAt: claims.exp }))
}

function isAuthenticated(event) {
  const authorization = event.headers?.Authorization || event.headers?.authorization || ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  const [encoded, signature] = token.split('.')
  const secret = process.env.AUTH_SECRET || ''
  if (!encoded || !signature || !secret) return false
  const expected = base64url(crypto.createHmac('sha256', secret).update(encoded).digest('base64'))
  if (!safeEqual(signature, expected)) return false
  try { return JSON.parse(Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64').toString('utf8')).exp > Math.floor(Date.now() / 1000) } catch { return false }
}

function safeEqual(left, right) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function base64url(value) {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function response(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body, isBase64Encoded: false }
}

function corsHeaders(contentType) {
  return {
    'Content-Type': contentType || 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  }
}
