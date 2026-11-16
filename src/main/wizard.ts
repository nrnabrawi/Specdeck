import { existsSync, realpathSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { KEBAB, openspecDocs, openspecDraftSchema, speckitDraftSchema, type OpenspecDraft } from '../shared/wizard'
import type { Project } from '../shared/types'
import type { Store } from './db'

const draftKey = (p: Project) => `draft:${p.id}:${p.framework}`
const ALLOWED = /^(proposal\.md|design\.md|tasks\.md|specs\/[a-z0-9]+(-[a-z0-9]+)*\/spec\.md)$/

export function loadDraft(store: Store, p: Project): unknown {
  const raw = store.getSetting(draftKey(p))
  return raw ? JSON.parse(raw) : null
}

/**
 * SPEC §10 write scope: only these markdown files inside an existing, non-archived openspec/changes/<name>/ folder.
 * Throws instead of writing anything else.
 */
export async function writeChangeDoc(root: string, name: string, rel: string, content: string): Promise<string> {
  if (!KEBAB.test(name)) throw new Error(`Invalid change name: ${name}`)
  if (!ALLOWED.test(rel)) throw new Error(`Not a writable change document: ${rel}`)
  const dir = join(root, 'openspec', 'changes', name)
  if (!existsSync(dir)) throw new Error(`Change "${name}" does not exist yet`)
  const target = resolve(dir, rel)
  const base = realpathSync(dir)
  await mkdir(dirname(target), { recursive: true })
  // after mkdir, resolve symlinks so a linked folder cannot point the write outside the change
  if (!realpathSync(dirname(target)).startsWith(base + sep) && realpathSync(dirname(target)) !== base) throw new Error('Path escapes the change folder')
  await writeFile(target, content, 'utf8')
  return `openspec/changes/${name}/${rel}`
}

export interface SaveResult {
  wrote: string[]
  draftOnly: boolean
}

/** Save draft (AC-052): always keep the draft in app data; if the OpenSpec change already exists, also write its documents. */
export async function saveDraft(store: Store, p: Project, state: unknown): Promise<SaveResult> {
  const schema = p.framework === 'openspec' ? openspecDraftSchema : speckitDraftSchema
  const draft = schema.parse(state)
  store.setSetting(draftKey(p), JSON.stringify(draft))
  if (p.framework !== 'openspec') return { wrote: [], draftOnly: true }
  const d = draft as OpenspecDraft
  if (!d.name || !existsSync(join(p.path, 'openspec', 'changes', d.name))) return { wrote: [], draftOnly: true }
  const wrote: string[] = []
  for (const doc of openspecDocs(d)) wrote.push(await writeChangeDoc(p.path, d.name, doc.path, doc.content))
  return { wrote, draftOnly: false }
}

