import { existsSync, realpathSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { importChange, isLossy, KEBAB, openspecDocs, openspecDraftSchema, regen, speckitDraftSchema, type OpenspecDraft } from '../shared/wizard'
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
  /** Existing files the form cannot fully represent; nothing is written until the caller lists them in `replace`. */
  needsConfirm?: string[]
}

const read = (p: string) => readFile(p, 'utf8').catch(() => null)
const sameText = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim()

/** Loads an existing, non-archived change into the form (OpenSpec). `lossy` lists files whose content the form cannot fully show. */
export async function loadChange(root: string, name: string) {
  if (!KEBAB.test(name)) throw new Error(`Invalid change name: ${name}`)
  const dir = join(root, 'openspec', 'changes', name)
  if (!existsSync(dir)) throw new Error(`Change "${name}" not found`)
  const files: Record<string, string> = {}
  for (const f of ['proposal.md', 'design.md', 'tasks.md']) {
    const t = await read(join(dir, f))
    if (t !== null) files[f] = t
  }
  for (const e of await readdir(join(dir, 'specs'), { withFileTypes: true }).catch(() => [])) {
    const t = e.isDirectory() && KEBAB.test(e.name) ? await read(join(dir, 'specs', e.name, 'spec.md')) : null
    if (t !== null) files[`specs/${e.name}/spec.md`] = t
  }
  return importChange(name, files)
}

/**
 * Save draft (AC-052): always keep the draft in app data; if the OpenSpec change already exists, also write its documents.
 * Files the user did not change are left alone; replacing a file the form cannot fully represent needs `replace` approval.
 */
export async function saveDraft(store: Store, p: Project, state: unknown, replace: string[] = []): Promise<SaveResult> {
  const schema = p.framework === 'openspec' ? openspecDraftSchema : speckitDraftSchema
  const draft = schema.parse(state)
  store.setSetting(draftKey(p), JSON.stringify(draft))
  if (p.framework !== 'openspec') return { wrote: [], draftOnly: true }
  const d = draft as OpenspecDraft
  if (!d.name || !existsSync(join(p.path, 'openspec', 'changes', d.name))) return { wrote: [], draftOnly: true }

  const todo: { path: string; content: string }[] = []
  const needsConfirm: string[] = []
  for (const doc of openspecDocs(d)) {
    const existing = await read(join(p.path, 'openspec', 'changes', d.name, doc.path))
    if (existing !== null) {
      if (sameText(existing, doc.content) || sameText(regen(doc.path, existing), doc.content)) continue // unchanged in the form
      if (isLossy(doc.path, existing) && !replace.includes(doc.path)) needsConfirm.push(doc.path)
    }
    todo.push(doc)
  }
  if (needsConfirm.length) return { wrote: [], draftOnly: false, needsConfirm }
  const wrote: string[] = []
  for (const doc of todo) wrote.push(await writeChangeDoc(p.path, d.name, doc.path, doc.content))
  return { wrote, draftOnly: false }
}
