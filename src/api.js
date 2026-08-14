import { initialPeople } from './data'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const STORAGE_KEY = 'family-tree.people.v2'
const LEGACY_STORAGE_KEY = 'family-tree.people.v1'
const TOKEN_KEY = 'family-tree.api-token.v1'

// 清理旧版山东平度演示数据；真实手绘图数据使用 v2。
if (typeof window !== 'undefined') window.localStorage.removeItem(LEGACY_STORAGE_KEY)

function localPeople() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : initialPeople
  } catch {
    return initialPeople
  }
}

export async function getPeople() {
  if (!API_BASE_URL) return localPeople()
  const response = await fetch(`${API_BASE_URL}/people`, { headers: authHeaders() })
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
  if (!API_BASE_URL) return
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
