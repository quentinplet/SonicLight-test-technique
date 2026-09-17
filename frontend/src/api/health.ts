import { request } from './http'

export interface Health {
  status: 'ok'
}

export function getHealth(): Promise<Health> {
  return request<Health>('/api/health')
}
