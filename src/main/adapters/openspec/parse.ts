import type { Delta, DeltaOp, Requirement, Scenario } from '../../../shared/types'

// Header shapes follow OpenSpec's own parser (dist/core/parsers/requirement-blocks.js, openspec 1.12.0).
const REQ_HEADER = /^###\s*Requirement:\s*(.+?)\s*$/i
const SCENARIO_HEADER = /^####\s*Scenario:\s*(.*?)\s*$/i
const STEP = /^\s*[-*]\s*\*\*(WHEN|THEN|AND|GIVEN)\*\*\s*(.*)$/i
const DELTA_HEADER = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i

function fenceMask(lines: string[]): boolean[] {
  let inFence = false
  return lines.map((l) => {
    if (/^\s*(```|~~~)/.test(l)) {
      inFence = !inFence
      return true
    }
    return inFence
  })
}

function splitLines(md: string): string[] {
  return md.replace(/\r\n/g, '\n').split('\n')
}

function parseScenario(title: string, body: string[]): Scenario {
  const steps = body.flatMap((l) => {
    const m = STEP.exec(l)
    return m ? [{ keyword: m[1].toUpperCase(), text: m[2].trim() }] : []
  })
  return { raw: [title, ...body].join('\n').trim(), steps }
}

/** Parses `### Requirement:` blocks from a section's lines. */
export function parseRequirements(lines: string[]): Requirement[] {
  const mask = fenceMask(lines)
  const reqs: Requirement[] = []
  let cur: { name: string; text: string[]; scen: { title: string; body: string[] }[] } | null = null
  const flush = () => {
    if (!cur) return
    reqs.push({
      name: cur.name,
      text: cur.text.join('\n').trim(),
      scenarios: cur.scen.map((s) => parseScenario(s.title, s.body))
    })
  }
  lines.forEach((l, i) => {
    const req = !mask[i] ? REQ_HEADER.exec(l) : null
    if (req) {
      flush()
      cur = { name: req[1], text: [], scen: [] }
      return
    }
    if (!cur) return
    const sc = !mask[i] ? SCENARIO_HEADER.exec(l) : null
    if (sc) cur.scen.push({ title: sc[1], body: [] })
    else if (cur.scen.length) cur.scen[cur.scen.length - 1].body.push(l)
    else cur.text.push(l)
  })
  flush()
  return reqs
}

/** Lines under the `## <title>` heading until the next `## ` heading. */
function section(lines: string[], mask: boolean[], title: RegExp): string[] {
  const start = lines.findIndex((l, i) => !mask[i] && title.test(l))
  if (start === -1) return []
  const end = lines.findIndex((l, i) => i > start && !mask[i] && /^##\s+/.test(l))
  return lines.slice(start + 1, end === -1 ? undefined : end)
}

export function parseSpec(md: string): { purpose: string; requirements: Requirement[] } {
  const lines = splitLines(md)
  const mask = fenceMask(lines)
  const purpose = section(lines, mask, /^##\s+Purpose\s*$/i).join('\n').trim()
  return { purpose, requirements: parseRequirements(section(lines, mask, /^##\s+Requirements\s*$/i)) }
}

export function parseDeltas(md: string, spec: string, unitId: string, archived: boolean): Delta[] {
  const lines = splitLines(md)
  const mask = fenceMask(lines)
  const out: Delta[] = []
  lines.forEach((l, i) => {
    const h = !mask[i] ? DELTA_HEADER.exec(l) : null
    if (!h) return
    const op = h[1].toUpperCase() as DeltaOp
    const end = lines.findIndex((x, j) => j > i && !mask[j] && /^##\s+/.test(x))
    const body = lines.slice(i + 1, end === -1 ? undefined : end)
    if (op === 'RENAMED') {
      let from = ''
      for (const b of body) {
        const f = /^\s*-?\s*FROM:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/.exec(b)
        const t = /^\s*-?\s*TO:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/.exec(b)
        if (f) from = f[1]
        else if (t) out.push({ spec, op, requirement: { name: t[1], text: '', scenarios: [] }, renamedFrom: from, unitId, archived })
      }
      return
    }
    for (const requirement of parseRequirements(body)) out.push({ spec, op, requirement, unitId, archived })
  })
  return out
}

export function parseTasks(md: string): { done: number; total: number; items: { text: string; done: boolean }[] } {
  const lines = splitLines(md)
  const mask = fenceMask(lines)
  const items = lines.flatMap((l, i) => {
    const m = !mask[i] ? /^\s*[-*]\s*\[( |x|X)\]\s*(.*)$/.exec(l) : null
    return m ? [{ text: m[2].trim(), done: m[1].toLowerCase() === 'x' }] : []
  })
  return { done: items.filter((t) => t.done).length, total: items.length, items }
}

/** First paragraph of `## Why`, else first non-heading paragraph. */
export function proposalSummary(md: string): string {
  const lines = splitLines(md)
  const mask = fenceMask(lines)
  const why = section(lines, mask, /^##\s+Why\s*$/i)
  const pool = why.length ? why : lines.filter((l) => !/^#/.test(l))
  const para: string[] = []
  for (const l of pool) {
    if (l.trim() === '') {
      if (para.length) break
      continue
    }
    para.push(l.trim())
  }
  return para.join(' ')
}
