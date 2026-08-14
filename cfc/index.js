// 百度云 CFC Node.js 12 compatible proxy.
// Environment: SERVER_API_BASE_URL, INTERNAL_API_KEY, CORS_ORIGIN.
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

function response(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body, isBase64Encoded: false }
}

function corsHeaders(contentType) {
  return {
    'Content-Type': contentType || 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  }
}
