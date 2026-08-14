// 百度云 CFC Node.js 12 compatible proxy.
// Environment: SERVER_API_BASE_URL, INTERNAL_API_KEY, CORS_ORIGIN,
// FAMILY_ACCESS_CODE, AUTH_SECRET.
const crypto = require('crypto')
const http = require('http')
const https = require('https')

// Public reads remain available even when the private server route is unreachable.
// This mirrors the six real nodes currently transcribed from the Xiaoshikou image.
const PUBLIC_PEOPLE = [
  { id: 'cao-tongxiu', name: '曹同休', generation: 0, branch: '手绘图主线', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名与曹建列的上方连线来自第二张放大图，字形和父子关系待家人复核。', parentIds: [] },
  { id: 'cao-jianlie', name: '曹建列', generation: 1, branch: '手绘图主线', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名与曹立中的父子连线来自手绘世系图，年代、籍贯和是否为小石口始迁祖待家人核对。', parentIds: ['cao-tongxiu'] },
  { id: 'cao-lizhong', name: '曹立中', generation: 2, branch: '立中房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '手绘图中位于曹建列下方的主节点。', parentIds: ['cao-jianlie'] },
  { id: 'cao-yushan', name: '曹裕善', generation: 3, branch: '立中房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和与曹立中的分支关系来自手绘世系图，字形及生平信息待家人核对。', parentIds: ['cao-lizhong'] },
  { id: 'cao-haoshan', name: '曹好善', generation: 3, branch: '立中房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和与曹立中的分支关系来自手绘世系图，字形及生平信息待家人核对。', parentIds: ['cao-lizhong'] },
  { id: 'cao-wangshan', name: '曹王善', generation: 3, branch: '立中房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和与曹立中的分支关系来自手绘世系图，字形及生平信息待家人核对。', parentIds: ['cao-lizhong'] },
  { id: 'cao-bingshan', name: '曹秉善', generation: 3, branch: '立中房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和与曹立中的分支关系来自手绘世系图，字形及生平信息待家人核对。', parentIds: ['cao-lizhong'] },
  { id: 'cao-baozhong', name: '曹宝中', generation: 2, branch: '建列房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '第二张放大图中位于曹建列下方的主节点，字形和连线待家人复核。', parentIds: ['cao-jianlie'] },
  { id: 'cao-fushan', name: '曹福善', generation: 3, branch: '宝中房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和与曹宝中的分支关系来自第二张放大图，字形待家人复核。', parentIds: ['cao-baozhong'] },
  { id: 'cao-wanshan', name: '曹万善', generation: 3, branch: '宝中房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和与曹宝中的分支关系来自第二张放大图，字形待家人复核。', parentIds: ['cao-baozhong'] },
  { id: 'cao-rongshan', name: '曹荣善', generation: 3, branch: '宝中房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和与曹宝中的分支关系来自第二张放大图，字形待家人复核。', parentIds: ['cao-baozhong'] },
  { id: 'cao-lianshan', name: '曹连善', generation: 3, branch: '宝中房', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和与曹宝中的分支关系来自第二张放大图，字形待家人复核。', parentIds: ['cao-baozhong'] },
  { id: 'cao-jiujiang', name: '曹九江', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-bingshan'] },
  { id: 'cao-jiuxu', name: '曹九旭', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-bingshan'] },
  { id: 'cao-jiuzhou', name: '曹九州', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-fushan'] },
  { id: 'cao-jiushuai', name: '曹九帅', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-fushan'] },
  { id: 'cao-jiuda', name: '曹九达', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-fushan'] },
  { id: 'cao-jiuguo', name: '曹九国', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-wanshan'] },
  { id: 'cao-jiuju', name: '曹九居', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-wanshan'] },
  { id: 'cao-jiuceng', name: '曹九曾', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-rongshan'] },
  { id: 'cao-jiuquan', name: '曹九全', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-rongshan'] },
  { id: 'cao-jiuyou', name: '曹九有', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-lianshan'] },
  { id: 'cao-jiuwu', name: '曹九梧', generation: 4, branch: '九字辈·待核', gender: '男', years: '待考', location: '山西省朔州市应县南河种镇小石口村', status: '待确认', note: '姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。', parentIds: ['cao-lianshan'] },
]

exports.handler = function handler(event) {
  const method = event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method) || 'GET'
  if (method === 'OPTIONS') return Promise.resolve(response(204, ''))

  let rawPath = event.path || (event.requestContext && event.requestContext.http && event.requestContext.http.path) || '/api/people'
  rawPath = rawPath.replace(/^\/api/, '') || '/people'
  const pathOnly = rawPath.split('?')[0]
  if (event.rawQueryString) rawPath += `?${event.rawQueryString}`

  if (pathOnly === '/login') return Promise.resolve(login(event))
  const isPublicRead = method === 'GET' && pathOnly === '/people'
  if (isPublicRead) return Promise.resolve(response(200, JSON.stringify(PUBLIC_PEOPLE)))
  if (!isPublicRead && !isAuthenticated(event)) return Promise.resolve(response(401, JSON.stringify({ error: 'unauthorized' })))

  const base = (process.env.SERVER_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) return Promise.resolve(response(500, JSON.stringify({ error: 'SERVER_API_BASE_URL is not configured' })))

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
  const headers = event.headers || {}
  const authorization = headers.Authorization || headers.authorization || ''
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
