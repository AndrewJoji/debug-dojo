import { describe, expect, it } from 'vitest'
import { guardLoops } from '../src/sandbox/loop-guard'
import { runInNode } from '../src/sandbox/node-runner'
import { createFakeFetch } from '../src/sandbox/runtime/fake-fetch'
import { TIMEOUT_MESSAGE } from '../src/sandbox/prepare'

describe('fake fetch', () => {
  it('returns the configured status, headers and JSON body', async () => {
    const api = createFakeFetch({
      'GET /api/deals': { status: 200, body: [{ id: 1 }], headers: { 'x-total-count': '1' } },
    })
    const res = await api.fetch('/api/deals')
    expect(res.ok).toBe(true)
    expect(res.headers.get('x-total-count')).toBe('1')
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(await res.json()).toEqual([{ id: 1 }])
  })

  it('resolves (does not reject) on HTTP errors, like real fetch', async () => {
    const api = createFakeFetch({ 'GET /api/x': { status: 503, body: { error: 'down' } } })
    const res = await api.fetch('/api/x')
    expect(res.ok).toBe(false)
    expect(res.status).toBe(503)
    expect(res.statusText).toBe('Service Unavailable')
  })

  it('returns 404 for unknown routes', async () => {
    const res = await createFakeFetch({}).fetch('/nope')
    expect(res.status).toBe(404)
  })

  it('rejects with TypeError on a network error', async () => {
    const api = createFakeFetch({ 'GET /api/x': { error: 'network' } })
    await expect(api.fetch('/api/x')).rejects.toThrow(TypeError)
  })

  it('waits for the configured delay', async () => {
    const api = createFakeFetch({ 'GET /slow': { delay: 50, body: 'ok' } })
    const started = Date.now()
    await api.fetch('/slow')
    expect(Date.now() - started).toBeGreaterThanOrEqual(45)
  })

  it('records requests and supports per-test route overrides', async () => {
    const api = createFakeFetch({ 'POST /api/t': { status: 201, body: { id: 1 } } })
    await api.fetch('/api/t?x=1', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
    })
    expect(api.requests).toEqual([
      { method: 'POST', url: '/api/t?x=1', headers: { 'content-type': 'application/json' }, body: '{"a":1}' },
    ])
    api.route('POST /api/t', { status: 500 })
    expect((await api.fetch('/api/t', { method: 'POST' })).status).toBe(500)
    api.reset()
    expect(api.requests).toEqual([])
    expect((await api.fetch('/api/t', { method: 'POST' })).status).toBe(201)
  })
})

describe('loop guard', () => {
  it('adds a guard to every kind of loop without changing line numbers', () => {
    const code = 'for (;;) {}\nwhile (x) y();\ndo { z() } while (x)\nfor (const a of b) {}'
    const result = guardLoops(code)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.code.match(/__guard\(\)/g)).toHaveLength(4)
    expect(result.code.split('\n')).toHaveLength(4)
    expect(result.code).toContain('while (x) {__guard();y();}')
  })

  it('reports syntax errors with a line number', () => {
    const result = guardLoops('const a = 1;\nconst = 2;')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.line).toBe(2)
  })
})

describe('harness', () => {
  it('stops an infinite loop with a clear message', async () => {
    const started = Date.now()
    const result = await runInNode({ code: 'while (true) {}', tests: "test('never', () => {})" })
    expect(result.status).toBe('timeout')
    expect(result.message).toBe(TIMEOUT_MESSAGE)
    expect(Date.now() - started).toBeLessThan(4500)
  }, 10_000)

  it('stops a test that awaits a promise that never settles', async () => {
    const result = await runInNode({
      code: 'function hang() { return new Promise(() => {}) }',
      tests: "test('hangs', async () => { await hang() })",
    })
    expect(result.status).toBe('timeout')
    expect(result.tests[0].passed).toBe(false)
  }, 10_000)

  it('reports a syntax error in user code before running anything', async () => {
    const result = await runInNode({ code: 'function (', tests: "test('x', () => {})" })
    expect(result.status).toBe('syntax-error')
    expect(result.message).toMatch(/^Line 1:/)
  })

  it('reports top-level crashes', async () => {
    const result = await runInNode({ code: 'null.x', tests: "test('x', () => {})" })
    expect(result.status).toBe('crashed')
  })

  it('shows a Promise the way a console would in assertion messages', async () => {
    const result = await runInNode({
      code: 'async function f() { return 1 }',
      tests: "test('needs await', () => { assert.deepEqual(f(), 1) })",
    })
    expect(result.tests[0].error).toBe('expected 1 but got Promise { <pending> }')
  })

  it('restores the real fetch afterwards', async () => {
    const before = globalThis.fetch
    await runInNode({ code: '', tests: "test('x', () => {})" })
    expect(globalThis.fetch).toBe(before)
  })
})
