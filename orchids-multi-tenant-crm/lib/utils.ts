import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getRecommendationColor(recommendation: string): string {
  const colors: Record<string, string> = {
    'BIND': 'bg-green-100 text-green-800',
    'BIND WITH CONDITIONS': 'bg-yellow-100 text-yellow-800',
    'NEGOTIATE': 'bg-orange-100 text-orange-800',
    'DECLINE': 'bg-red-100 text-red-800',
  }
  return colors[recommendation] || 'bg-gray-100 text-gray-800'
}

export function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600'
  if (score >= 6) return 'text-yellow-600'
  if (score >= 4) return 'text-orange-600'
  return 'text-red-600'
}
