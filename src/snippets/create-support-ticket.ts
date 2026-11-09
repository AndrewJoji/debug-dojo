// scaffold-example (written by Claude)
import { defineSnippet } from '../engine/define'

// A POST with a JSON body and a bearer token, the kind of call a support
// widget makes. The tests check the request itself (method, headers, body)
// as well as the result, using `api.requests` from the fake fetch.

export default defineSnippet({
  id: 'create-support-ticket',
  title: 'Create a support ticket',
  category: 'http-api',

  code: `async function createTicket(subject, token) {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({ subject }),
  });
  if (res.status === 401) throw new Error('Your session expired. Please sign in again.');
  if (!res.ok) throw new Error('Could not create ticket: ' + res.status);
  const data = await res.json();
  return data.id;
}
`,

  tests: `
test('creates a ticket and returns its id', async () => {
  assert.equal(await createTicket('Login broken', 'abc123'), 'T-1042');
});

test('sends JSON with a bearer token', async () => {
  await createTicket('Login broken', 'abc123');
  const request = api.requests[0];
  assert.equal(request.method, 'POST');
  assert.equal(request.headers['content-type'], 'application/json');
  assert.equal(request.headers['authorization'], 'Bearer abc123');
  assert.deepEqual(JSON.parse(request.body), { subject: 'Login broken' });
});

test('tells the user to sign in again on 401', async () => {
  api.route('POST /api/tickets', { status: 401, body: { error: 'token expired' } });
  await assert.rejects(() => createTicket('Login broken', 'old-token'), 'session expired');
});

test('reports other server errors with the status code', async () => {
  api.route('POST /api/tickets', { status: 500, body: { error: 'database unavailable' } });
  await assert.rejects(() => createTicket('Login broken', 'abc123'), '500');
});
`,

  fakeApi: {
    'POST /api/tickets': { status: 201, body: { id: 'T-1042', subject: 'Login broken' } },
  },

  ticket: 'Customers click "Send" in the help widget but no ticket ever reaches the support queue.',
})
