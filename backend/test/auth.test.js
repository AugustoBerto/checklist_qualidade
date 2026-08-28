const assert = require('node:assert/strict')
const { afterEach, test } = require('node:test')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET ||= 'segredo-de-teste-com-tamanho-suficiente'
process.env.CHECKLIST_INITIAL_ADMIN_MATRICULA ||= 'bootstrap-1'
const autorizar = require('../middlewares/auth')
const db = require('../db')
const originalQuery = db.query

afterEach(() => { db.query = originalQuery })

test('JWT expirado é informado como não autenticado', async () => {
  const token = jwt.sign({ matricula: '123' }, process.env.JWT_SECRET, { expiresIn: -1 })
  const req = { headers: { cookie: `token=${token}` } }
  const resposta = {}
  const res = {
    status(codigo) { resposta.status = codigo; return this },
    json(corpo) { resposta.corpo = corpo; return this },
  }

  await autorizar()(req, res, () => assert.fail('não deveria autorizar'))

  assert.equal(resposta.status, 401)
  assert.equal(resposta.corpo.mensagem, 'Token inválido ou expirado.')
})

test('cookie percent-encoded inválido retorna 401 JSON', async () => {
  const req = { headers: { cookie: 'token=%' } }
  const resposta = {}
  const res = {
    status(codigo) { resposta.status = codigo; return this },
    json(corpo) { resposta.corpo = corpo; return this },
  }

  await autorizar()(req, res, () => assert.fail('não deveria autorizar'))

  assert.equal(resposta.status, 401)
  assert.deepEqual(resposta.corpo, { sucesso: false, mensagem: 'Token inválido ou expirado.' })
})

test('primeiro login sincroniza identidade como perfil pendente sem liberar acesso', async () => {
  let consulta
  db.query = async (sql, params) => {
    consulta = { sql, params }
    return { rows: [{ id: 7, nome: 'Pessoa', matricula: '123', papel: 'PENDENTE', ativo: 0 }] }
  }
  const token = jwt.sign({ matricula: '123', nome: 'Pessoa', funcao: 'Analista' }, process.env.JWT_SECRET)
  const req = { headers: { cookie: `token=${token}` } }
  const resposta = {}
  const res = {
    status(codigo) { resposta.status = codigo; return this },
    json(corpo) { resposta.corpo = corpo; return this },
  }

  await autorizar()(req, res, () => assert.fail('perfil pendente não deveria ser autorizado'))

  assert.equal(resposta.status, 403)
  assert.equal(resposta.corpo.codigo, 'PERFIL_CHECKLIST_PENDENTE')
  assert.match(consulta.sql, /ON CONFLICT \(matricula\) DO UPDATE/)
  assert.deepEqual(consulta.params, ['Pessoa', null, 'Analista', '123'])
})

test('matrícula inicial assume ADMIN somente enquanto todos os perfis estão pendentes', async () => {
  const consultas = []
  db.query = async (sql) => {
    consultas.push(sql)
    if (/INSERT INTO usuarios/.test(sql)) {
      return { rows: [{ id: 8, nome: 'Bootstrap', matricula: 'bootstrap-1', papel: 'PENDENTE', ativo: 0 }] }
    }
    return { rows: [{ id: 8, nome: 'Bootstrap', matricula: 'bootstrap-1', papel: 'ADMIN', ativo: 1 }] }
  }

  const perfil = await autorizar.sincronizarPerfil({ matricula: 'bootstrap-1', nome: 'Bootstrap' })

  assert.equal(perfil.papel, 'ADMIN')
  assert.equal(perfil.ativo, 1)
  assert.match(consultas[1], /NOT EXISTS \(SELECT 1 FROM usuarios WHERE papel <> 'PENDENTE'\)/)
})
