// scaffold-example (written by Claude)
import { defineSnippet } from '../engine/define'

// A GET request, a status check and a JSON body: the smallest realistic
// API call. Missing await and unchecked res.ok both break it.
//
// Tip for writing snippets: `code` and `tests` are template literals, so a
// backtick or ${ inside them must be escaped (\` and \${). Plain string
// concatenation, as below, avoids that and keeps the file readable.

export default defineSnippet({
  id: 'fetch-deal-titles',
  title: 'Load deal titles',
  category: 'async-fetch',

  code: `async function loadDealTitles() {
  const res = await fetch('/api/deals');
  if (!res.ok) throw new Error('Deals request failed: ' + res.status);
  const deals = await res.json();
  return deals.map((deal) => deal.title);
}
`,

  tests: `
test('returns the title of every deal', async () => {
  assert.deepEqual(await loadDealTitles(), ['Switch OLED', 'Steam Deck']);
});

test('throws an error that mentions the status when the API returns 503', async () => {
  api.route('GET /api/deals', { status: 503, body: { error: 'maintenance' } });
  await assert.rejects(() => loadDealTitles(), '503');
});
`,

  fakeApi: {
    'GET /api/deals': {
      status: 200,
      delay: 20,
      body: [
        { id: 1, title: 'Switch OLED', price: 299 },
        { id: 2, title: 'Steam Deck', price: 349 },
      ],
    },
  },

  ticket: 'The deals list shows undefined.',
})
