import { initialPeople } from './data'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const STORAGE_KEY = 'family-tree.people.v3'
const LEGACY_STORAGE_KEYS = ['family-tree.people.v1', 'family-tree.people.v2']
const TOKEN_KEY = 'family-tree.api-token.v1'
const LOCAL_EDITOR_HASH = '8f21a4cdd714d7bd887029d11c19e84622b57f2415dfe1b4a841e47f8a9c6237'

// 清理旧版山东平度演示数据；真实手绘图数据使用 v2。
if (typeof window !== 'undefined') LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))

function localPeople() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : null
    return Array.isArray(parsed) && parsed.length ? parsed : initialPeople
  } catch {
    return initialPeople
  }
}

export async function getPeople() {
  if (!API_BASE_URL) return localPeople()
  const response = await fetch(`${API_BASE_URL}/people`)
  if (!response.ok) {
    const error = new Error(response.status === 401 ? '请先输入家族访问口令' : '家谱数据加载失败')
    error.status = response.status
    throw error
  }
  return response.json()
}

export async function createPerson(person) {
  if (!API_BASE_URL) {
    const people = [...localPeople(), person]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(people))
    return person
  }
  const response = await fetch(`${API_BASE_URL}/people`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(person),
  })
  if (!response.ok) {
    const error = new Error(response.status === 401 ? '登录已过期，请重新输入口令' : '成员保存失败')
    error.status = response.status
    throw error
  }
  return response.json()
}

export async function updatePerson(person) {
  if (!API_BASE_URL) {
    const people = localPeople().map((current) => current.id === person.id ? person : current)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(people))
    return person
  }
  const response = await fetch(`${API_BASE_URL}/people/${encodeURIComponent(person.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(person),
  })
  if (!response.ok) {
    const error = new Error(response.status === 401 ? '登录已过期，请重新输入口令' : '成员更新失败')
    error.status = response.status
    throw error
  }
  return response.json()
}

export async function reviewPerson(id, decision) {
  if (!API_BASE_URL) {
    const status = decision === 'confirm' ? '已确认' : '已退回'
    const people = localPeople().map((person) => person.id === id ? { ...person, status } : person)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(people))
    return people.find((person) => person.id === id)
  }
  const response = await fetch(`${API_BASE_URL}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ id, decision }),
  })
  if (!response.ok) {
    const error = new Error(response.status === 401 ? '登录已过期，请重新输入口令' : '审核操作失败')
    error.status = response.status
    throw error
  }
  return response.json()
}

export function hasRemoteApi() {
  return Boolean(API_BASE_URL)
}

export function hasSession() {
  return Boolean(window.sessionStorage.getItem(TOKEN_KEY))
}

export function clearSession() {
  window.sessionStorage.removeItem(TOKEN_KEY)
}

export async function login(code) {
  if (!API_BASE_URL) {
    const bytes = new TextEncoder().encode(code)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    if (hash !== LOCAL_EDITOR_HASH) throw new Error('访问口令不正确')
    window.sessionStorage.setItem(TOKEN_KEY, 'local-editor')
    return
  }
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) throw new Error(response.status === 401 ? '访问口令不正确' : '登录服务暂时不可用')
  const data = await response.json()
  window.sessionStorage.setItem(TOKEN_KEY, data.token)
}

function authHeaders() {
  const token = window.sessionStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}
