// Minimal typings for the subset used by Store (avoids adding @types/better-sqlite3).
declare module 'better-sqlite3' {
  interface Statement {
    run(...params: unknown[]): unknown
    get(...params: unknown[]): unknown
    all(...params: unknown[]): unknown[]
  }
  export default class Database {
    constructor(path: string)
    exec(sql: string): this
    prepare(sql: string): Statement
  }
}
