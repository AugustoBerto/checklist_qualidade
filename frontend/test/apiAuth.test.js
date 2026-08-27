import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'

const authApi = { post: vi.fn() }
const router = {
  currentRoute: { value: { path: '/selecao' } },
  replace: vi.fn().mockResolvedValue(undefined),
}
const armazenamento = new Map()

vi.stubGlobal('localStorage', {
  getItem: (chave) => armazenamento.get(chave) ?? null,
  removeItem: (chave) => armazenamento.delete(chave),
  setItem: (chave, valor) => armazenamento.set(chave, String(valor)),
})
vi.mock('../src/services/auth', () => ({ authApi }))

const { default: api, configurarInterceptorDeAutenticacao } = await import('../src/services/api')

const respostaNaoAutorizada = (config) => Promise.reject(new AxiosError(
  'Não autorizado',
  'ERR_BAD_REQUEST',
  config,
  null,
  { status: 401, statusText: 'Unauthorized', headers: {}, config, data: {} },
))

describe('renovação da sessão da API', () => {
  beforeAll(() => configurarInterceptorDeAutenticacao(router))

  beforeEach(() => {
    armazenamento.clear()
    localStorage.setItem('usuario', '{"nome":"Pessoa"}')
    authApi.post.mockReset()
    router.replace.mockClear()
  })

  it('renova uma vez e repete requisições concorrentes que receberam 401', async () => {
    const tentativas = new Map()
    api.defaults.adapter = (config) => {
      const total = (tentativas.get(config.url) || 0) + 1
      tentativas.set(config.url, total)
      return total === 1
        ? respostaNaoAutorizada(config)
        : Promise.resolve({ data: config.url, status: 200, statusText: 'OK', headers: {}, config })
    }
    authApi.post.mockResolvedValue({ status: 200 })

    const respostas = await Promise.all([api.get('/primeira'), api.get('/segunda')])

    expect(respostas.map(({ data }) => data)).toEqual(['/primeira', '/segunda'])
    expect(authApi.post).toHaveBeenCalledOnce()
    expect(authApi.post).toHaveBeenCalledWith('/auth/me')
    expect(router.replace).not.toHaveBeenCalled()
    expect(localStorage.getItem('usuario')).not.toBeNull()
  })

  it('encerra a sessão quando a renovação falha', async () => {
    api.defaults.adapter = respostaNaoAutorizada
    authApi.post.mockRejectedValue(new Error('Refresh expirado'))

    await expect(api.get('/protegido')).rejects.toBeInstanceOf(Error)

    expect(localStorage.getItem('usuario')).toBeNull()
    expect(router.replace).toHaveBeenCalledWith('/login')
  })

  it('mantém a sessão quando a requisição repetida falha por outro motivo', async () => {
    let tentativa = 0
    api.defaults.adapter = (config) => {
      tentativa += 1
      if (tentativa === 1) return respostaNaoAutorizada(config)
      return Promise.reject(new AxiosError(
        'Falha interna',
        'ERR_BAD_RESPONSE',
        config,
        null,
        { status: 500, statusText: 'Internal Server Error', headers: {}, config, data: {} },
      ))
    }
    authApi.post.mockResolvedValue({ status: 200 })

    await expect(api.get('/instavel')).rejects.toMatchObject({ response: { status: 500 } })

    expect(localStorage.getItem('usuario')).not.toBeNull()
    expect(router.replace).not.toHaveBeenCalled()
  })
})
