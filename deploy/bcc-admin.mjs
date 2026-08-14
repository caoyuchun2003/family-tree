import crypto from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'

const host = process.env.BCC_HOST || 'bcc.bj.baidubce.com'
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
  const canonical = `${method}\n${path}\n${query}\nhost:${encode(host)}`
  const signingKey = crypto.createHmac('sha256', secretKey).update(prefix).digest('hex')
  const signature = crypto.createHmac('sha256', signingKey).update(canonical).digest('hex')
  return `${prefix}/host/${signature}`
}

function request(method, path, query = '', body = '') {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(body) : null
    const req = https.request({ hostname: host, path: `${path}${query ? `?${query}` : ''}`, method, headers: { Host: host, Authorization: sign(method, path, query), ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}) } }, (response) => {
      let output = ''
      response.on('data', (chunk) => { output += chunk })
      response.on('end', () => {
        let parsed = output
        try { parsed = JSON.parse(output) } catch {}
        if (response.statusCode >= 400) reject(new Error(`BCC HTTP ${response.statusCode}: ${JSON.stringify(parsed)}`))
        else resolve(parsed)
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

const command = process.argv[2] || 'instances'
if (command === 'instances') {
  const result = await request('GET', '/v2/instance', 'maxKeys=1000')
  if (!result.instances?.length) console.log(JSON.stringify(result))
  for (const instance of result.instances || []) console.log(JSON.stringify({ id: instance.id, name: instance.name, privateIps: instance.privateIps, publicIps: instance.publicIps, securityGroupIds: instance.securityGroupIds, vpcId: instance.vpcId }))
} else if (command === 'security-groups') {
  const instanceId = process.argv[3]
  if (!instanceId) throw new Error('usage: security-groups <instance-id>')
  const result = await request('GET', '/v2/securityGroup', `instanceId=${encode(instanceId)}&maxKeys=1000`)
  console.log(JSON.stringify(result))
} else {
  throw new Error(`unknown command: ${command}`)
}
