// scaffold-example (written by Claude)
import { defineSnippet } from '../engine/define'

// Fetch data and render it into the page. `html` is placed in <body> before
// the code runs, so the tests can check the DOM the code produced.
// This snippet has no res.ok check, so the drop-ok-check mutator doesn't
// apply to it: a good example of appliesTo() returning false.

export default defineSnippet({
  id: 'render-deal-list',
  title: 'Render the deal list',
  category: 'dom-html',

  html: `<h2>Today's deals</h2>
<ul id="deal-list"></ul>
<p class="deal-count"></p>`,

  code: `async function renderDeals() {
  const res = await fetch('/api/deals');
  const deals = await res.json();

  const list = document.querySelector('#deal-list');
  list.replaceChildren();
  for (const deal of deals) {
    const item = document.createElement('li');
    item.textContent = deal.title + ': $' + deal.price;
    list.append(item);
  }

  document.querySelector('.deal-count').textContent = deals.length + ' deals';
}
`,

  tests: `
test('renders one list item per deal', async () => {
  await renderDeals();
  const items = document.querySelectorAll('#deal-list li');
  assert.equal(items.length, 2);
  assert.equal(items[0].textContent, 'Switch OLED: $299');
});

test('shows how many deals there are', async () => {
  await renderDeals();
  assert.equal(document.querySelector('.deal-count').textContent, '2 deals');
});

test('does not duplicate items when rendered twice', async () => {
  await renderDeals();
  await renderDeals();
  assert.equal(document.querySelectorAll('#deal-list li').length, 2);
});
`,

  fakeApi: {
    'GET /api/deals': {
      body: [
        { id: 1, title: 'Switch OLED', price: 299 },
        { id: 2, title: 'Steam Deck', price: 349 },
      ],
    },
  },

  ticket: "Today's deals section is empty, even though the API returns deals.",
})
