import type { DrawingData } from '@/types/drawing'
import { request } from './http'

/** A row of the admin list: no `data`, which would be megabytes to render a few titles. */
export interface DrawingSummary {
  id: string
  title: string
  userName: string
  updatedAt: string
}

export interface DrawingWithAuthor {
  id: string
  title: string
  userName: string
  data: DrawingData
  updatedAt: string
}

export function listDrawings(): Promise<DrawingSummary[]> {
  return request<DrawingSummary[]>('/api/admin/drawings')
}

export function getDrawing(id: string): Promise<DrawingWithAuthor> {
  return request<DrawingWithAuthor>(`/api/admin/drawings/${id}`)
}

export function deleteDrawing(id: string): Promise<void> {
  return request<void>(`/api/admin/drawings/${id}`, { method: 'DELETE' })
}
