// Throwaway smoke for the streaming contract (build step 4c).
// Spins a mock Ollama HTTP server and drives OllamaProvider — verifies NDJSON
// stream parsing + onToken plumbing that the IPC layer relies on. Pure node.
import http from 'node:http'
import { AddressInfo } from 'node:net'
import { OllamaProvider } from '../src/lib/providers/ai/ollama'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/tags') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ models: [{ name: 'mock' }] }))
    return
  }
  if (req.url === '/api/chat') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      const streaming = JSON.parse(body || '{}').stream === true
      if (streaming) {
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson' })
        res.write(JSON.stringify({ message: { content: 'Hello' } }) + '\n')
        res.write(JSON.stringify({ message: { content: ' world' } }) + '\n')
        res.end(JSON.stringify({ message: { content: '' }, done: true }) + '\n')
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: { content: 'full answer' }, done: true }))
      }
    })
    return
  }
  res.writeHead(404)
  res.end()
})

async function main(): Promise<void> {
  await new Promise<void>((r) => server.listen(0, r))
  const port = (server.address() as AddressInfo).port
  const baseUrl = `http://localhost:${port}`
  const provider = new OllamaProvider({ model: 'mock', baseUrl })

  const conn = await provider.testConnection()
  assert(conn.ok, 'testConnection ok against mock /api/tags')

  const full = await provider.complete({ system: 'sys', user: 'hi' })
  assert(full === 'full answer', 'complete() returns single-JSON content')

  const tokens: string[] = []
  const streamed = await provider.stream({ system: 'sys', user: 'hi' }, (t) => tokens.push(t))
  assert(tokens.join('|') === 'Hello| world', 'stream() emits one onToken per NDJSON chunk')
  assert(streamed === 'Hello world', 'stream() resolves with concatenated text')

  // down-server path: clear error
  const down = new OllamaProvider({ model: 'x', baseUrl: 'http://localhost:1' })
  const dconn = await down.testConnection()
  assert(!dconn.ok && /not running/i.test(dconn.error ?? ''), 'down server -> clear not-running error')

  console.log('\nSTREAM SMOKE TEST PASSED')
}

main().then(
  () => {
    server.close()
    process.exit(0)
  },
  (err) => {
    console.error('\nSTREAM SMOKE TEST FAILED:', (err as Error).message)
    server.close()
    process.exit(1)
  },
)
