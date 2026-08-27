const assert = require('node:assert/strict')
const { test } = require('node:test')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET ||= 'segredo-de-teste-com-tamanho-suficiente'
const autorizar = require('../middlewares/auth')

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
