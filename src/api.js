import { initialPeople } from './data'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const STORAGE_KEY = 'family-tree.people.v1'

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
  const response = await fetch(`${API_BASE_URL}/people`)
  if (!response.ok) throw new Error('家谱数据加载失败')
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(person),
  })
  if (!response.ok) throw new Error('成员保存失败')
  return response.json()
}

export function hasRemoteApi() {
  return Boolean(API_BASE_URL)
}
