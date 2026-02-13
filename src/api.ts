const API_URL = import.meta.env.VITE_API_URL as string

export async function getTasks() {
  const res = await fetch(`${API_URL}/tasks`)
  if (!res.ok) throw new Error('Failed to fetch tasks')
  return res.json()
}
