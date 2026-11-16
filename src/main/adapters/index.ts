import type { FrameworkId } from '../../shared/types'
import { openspecAdapter } from './openspec'
import type { FrameworkAdapter } from './types'

export function getAdapter(id: FrameworkId): FrameworkAdapter {
  if (id === 'openspec') return openspecAdapter
  throw new Error('UNSUPPORTED_FRAMEWORK: Spec Kit support arrives in milestone M3')
}

/** Marker-folder detection for both frameworks (AC-010/011). */
export async function detectAll(root: string) {
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  return [
    { id: 'openspec' as const, found: existsSync(join(root, 'openspec')), evidence: 'openspec/ folder' },
    { id: 'speckit' as const, found: existsSync(join(root, '.specify')), evidence: '.specify/ folder' }
  ]
}
