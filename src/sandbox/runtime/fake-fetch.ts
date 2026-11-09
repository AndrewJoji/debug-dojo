import type { FakeApi, FakeResponse } from '../../engine/types'

// FR-9: API snippets run against a fake `fetch` that returns set status codes,
// headers, delays and errors. No real network request ever leaves the sandbox.
//
// RULE FOR THIS FOLDER: this function is turned into source text with
// String(createFakeFetch) and pasted into the sandbox iframe. It must not use
// anything defined outside its own body (no imports, no module-level
// constants). `import type` is fine because types vanish when compiled.

export interface RecordedRequest {
  method: string
  /** Path plus query string, e.g. "/api/deals?page=2". */
  url: string
  /** Header names lower-cased, as the Headers API normalises them. */
  headers: Record<string, string>
  body: string | null
}

export interface FakeApiControl {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  /** Every request the code made, oldest first. Tests assert on this. */
  requests: RecordedRequest[]
  /** Change or add one route, e.g. api.route('GET /api/deals', { status: 503 }). */
  route(key: string, response: FakeResponse): void
  /** Back to the snippet's original routes, with no recorded requests. */
  reset(): void
}

export function createFakeFetch(routes: FakeApi = {}): FakeApiControl {
  // Real servers send a reason phrase with the status. Code under test may
  // print res.statusText in an error, so fill in the common ones.
  const STATUS_TEXT: Record<number, string> = {
    200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
    409: 'Conflict', 422: 'Unprocessable Content', 429: 'Too Many Requests',
    500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable',
  }
  // These statuses must not carry a body; the Response constructor throws if they do.
  const NO_BODY = [101, 204, 205, 304]

  let table: FakeApi = { ...routes }
  const requests: RecordedRequest[] = []

  async function fakeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    // fetch accepts a string, a URL or a Request object; normalise all three.
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    // Resolve against a dummy origin so relative paths like "/api/deals" parse.
    const parsed = new URL(rawUrl, 'http://sandbox.local')
    const pathAndQuery = parsed.pathname + parsed.search

    const headers: Record<string, string> = {}
    new Headers(init.headers).forEach((value, name) => {
      headers[name] = value
    })
    const body = typeof init.body === 'string' ? init.body : init.body == null ? null : String(init.body)
    requests.push({ method, url: pathAndQuery, headers, body })

    // Prefer an exact match including the query string, then the bare path.
    const response = table[`${method} ${pathAndQuery}`] ?? table[`${method} ${parsed.pathname}`]

    if (response?.delay) {
      await new Promise((resolve) => setTimeout(resolve, response.delay))
    }
    if (!response) {
      // An unknown route behaves like a real server: 404, not an exception.
      return new Response(JSON.stringify({ error: `No route for ${method} ${parsed.pathname}` }), {
        status: 404,
        statusText: 'Not Found',
        headers: { 'content-type': 'application/json' },
      })
    }
    if (response.error === 'network') {
      // Real fetch only rejects on network failure (never on 4xx/5xx), with
      // a TypeError. Matching that exactly is half of what API bugs teach.
      throw new TypeError('Failed to fetch')
    }

    const status = response.status ?? 200
    const responseHeaders = new Headers(response.headers)
    let text: string | null = null
    if (!NO_BODY.includes(status) && response.body !== undefined) {
      if (typeof response.body === 'string') {
        text = response.body
      } else {
        text = JSON.stringify(response.body)
        if (!responseHeaders.has('content-type')) responseHeaders.set('content-type', 'application/json')
      }
    }
    return new Response(text, { status, statusText: STATUS_TEXT[status] ?? '', headers: responseHeaders })
  }

  return {
    fetch: fakeFetch,
    requests,
    route(key, response) {
      table[key] = response
    },
    reset() {
      table = { ...routes }
      requests.length = 0 // empty in place so anyone holding the array sees it
    },
  }
}
