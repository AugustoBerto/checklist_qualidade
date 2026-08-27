const assert = require('node:assert/strict')
const { Readable, Writable } = require('node:stream')
const { test } = require('node:test')

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET ||= 'segredo-de-teste-com-tamanho-suficiente'

const db = require('../db')
const app = require('../index')

db.query = async () => ({ rows: [{
  id: 1,
  nome: 'Teste',
  matricula: '123',
  papel: 'ADMIN',
  ativo: 1,
  funcao: 'ADMIN',
}] })

const request = (path, options = {}) => new Promise((resolve, reject) => {
  const req = Readable.from(options.body === undefined ? [] : [options.body])
  const headers = Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value]))
  if (options.body !== undefined) headers['content-length'] = Buffer.byteLength(options.body)
  Object.assign(req, {
    method: options.method || 'GET',
    url: path,
    originalUrl: path,
    headers,
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    httpVersion: '1.1',
    connection: { encrypted: false },
    socket: { encrypted: false },
  })
  const chunks = []
  const res = new Writable({ write(chunk, _encoding, callback) { chunks.push(chunk); callback() } })
  Object.assign(res, {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    getHeader(name) { return this.headers[name.toLowerCase()] },
    removeHeader(name) { delete this.headers[name.toLowerCase()] },
    getHeaders() { return this.headers },
    end(chunk) { if (chunk) chunks.push(Buffer.from(chunk)); this.emit('finish'); resolve({ status: this.statusCode, headers: this.headers, json: () => JSON.parse(Buffer.concat(chunks).toString()) }) },
  })
  res.on('error', reject)
  app.handle(req, res, (error) => reject(error || new Error('request did not finish')))
})

test('cookie percent-encoded inválido retorna 401 JSON', async () => {
  const response = await request('/api/dados/modelos', { headers: { Cookie: 'token=%' } })
  assert.equal(response.status, 401)
  assert.match(response.headers['content-type'], /application\/json/)
})

test('erro inesperado retorna 500 JSON sem stack', async () => {
  const response = await request('/api/test/error')
  assert.equal(response.status, 500)
  assert.deepEqual(response.json(), { sucesso: false, mensagem: 'Erro interno do servidor.' })
})

test('corpo literal null chega ao controller como objeto vazio', async () => {
  const token = require('jsonwebtoken').sign({ matricula: '123' }, process.env.JWT_SECRET)
  const response = await request('/api/checklists/salvar', {
    method: 'POST',
    headers: { Cookie: `token=${token}`, 'Content-Type': 'application/json' },
    body: 'null',
  })
  assert.equal(response.status, 400)
  assert.match(response.headers['content-type'], /application\/json/)
  assert.deepEqual(response.json(), { sucesso: false, mensagem: 'Dados incompletos ou inválidos.' })
})

test('corpo JSON primitivo não nulo retorna JSON inválido', async () => {
  const token = require('jsonwebtoken').sign({ matricula: '123' }, process.env.JWT_SECRET)
  const response = await request('/api/checklists/salvar', {
    method: 'POST',
    headers: { Cookie: `token=${token}`, 'Content-Type': 'application/json' },
    body: 'true',
  })
  assert.equal(response.status, 400)
  assert.match(response.headers['content-type'], /application\/json/)
  assert.deepEqual(response.json(), { sucesso: false, mensagem: 'JSON inválido.' })
})
