// The shapes every other file agrees on. If you only read one engine file,
// read this one: snippets and mutators are just objects of these types.

/** The five areas the picker groups challenges into (SRS FR-1). */
export type Category = 'async-fetch' | 'http-api' | 'dom-html' | 'data-json' | 'logic'

export const CATEGORY_LABELS: Record<Category, string> = {
  'async-fetch': 'Async & fetch',
  'http-api': 'HTTP & APIs',
  'dom-html': 'DOM & HTML',
  'data-json': 'Data & JSON',
  logic: 'Logic',
}

/**
 * One canned response for the fake fetch. Everything is optional so a snippet
 * only spells out what matters to its bug (e.g. just `status: 503`).
 */
export interface FakeResponse {
  status?: number // default 200
  body?: unknown // objects and arrays are sent as JSON; strings as-is
  headers?: Record<string, string>
  delay?: number // milliseconds before the response resolves
  /** Simulate a network failure: fetch rejects instead of resolving. */
  error?: 'network'
}

/** Routes keyed by "METHOD /path", e.g. "GET /api/deals". */
export type FakeApi = Record<string, FakeResponse>

/** A small, working piece of code plus the tests that prove it works. */
export interface Snippet {
  id: string
  title: string
  category: Category
  /** Working source. May contain /*@tag*\/ markers that steer mutators. */
  code: string
  /**
   * Test source, run after `code` in the same scope, so tests can call the
   * snippet's functions directly. Uses `test()`, `assert` and `api` from the harness.
   */
  tests: string
  /** Optional HTML placed in <body> before the code runs (DOM snippets). */
  html?: string
  fakeApi?: FakeApi
  /** Fallback symptom report, used when a mutator doesn't supply one. */
  ticket: string
}

/**
 * A place in the code where a mutator could inject its bug.
 * `start`/`end` are character offsets into the code, like String.slice uses.
 */
export interface Site {
  start: number
  end: number
}

export interface Link {
  label: string
  href: string
}

/** A rule that knows how to break one kind of thing, and how to teach the fix. */
export interface Mutator {
  id: string
  name: string
  category: Category
  /**
   * The marker name this mutator answers to. If a snippet contains /*@tag*\/
   * markers for this tag, the mutator may only act at marked sites.
   */
  tag: string
  /** Every place in `code` this bug could be injected. Empty means "doesn't apply". */
  findSites(code: string): Site[]
  /** Return `code` with the bug injected at exactly one site. */
  breakAt(code: string, site: Site): string
  /** Symptom report written like a customer ticket. */
  ticket: string
  /** Exactly three steps: where to look, what's wrong, how to fix. */
  hints: [string, string, string]
  theory: string
  links: Link[]
}

/** Everything the UI needs to show one challenge. */
export interface Challenge {
  snippet: Snippet
  mutator: Mutator
  seed: number
  /** Working code with markers stripped: what the reveal diff compares against. */
  original: string
  /** Code with one bug injected, markers stripped: what the editor shows. */
  broken: string
  /** 1-based line number the bug was injected on (in `broken`). */
  line: number
  ticket: string
}

/** One test's outcome inside the sandbox. */
export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

/**
 * What a Run returns. `status` separates "your tests ran" from "your code
 * never got that far", because the UI explains each one differently.
 */
export interface RunResult {
  status: 'ran' | 'syntax-error' | 'timeout' | 'crashed'
  tests: TestResult[]
  /** Top-level message for syntax errors, timeouts and crashes. */
  message?: string
}
