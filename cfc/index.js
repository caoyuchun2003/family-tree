// 百度云函数 CFC 的轻量代理示例。
// 环境变量：SERVER_API_BASE_URL、INTERNAL_API_KEY

export async function handler(event) {
  const base = (process.env.SERVER_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) return response(500, { error: 'SERVER_API_BASE_URL is not configured' })

  const method = event.httpMethod || event.requestContext?.http?.method || 'GET'
  const rawPath = event.path || event.requestContext?.http?.path || '/people'
  const path = rawPath.replace(/^\/api/, '') || '/people'
  const body = event.body || undefined
  const upstream = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': process.env.INTERNAL_API_KEY || '',
    },
    body: ['GET', 'HEAD'].includes(method) ? undefined : body,
  })
  const text = await upstream.text()
  return {
    statusCode: upstream.status,
    headers: corsHeaders(),
    body: text,
    isBase64Encoded: false,
  }
}

function response(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) }
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  }
}
