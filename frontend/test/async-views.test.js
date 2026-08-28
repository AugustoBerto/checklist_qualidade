// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CheckSelecao from '../src/views/CheckSelecao.vue'
import ConfiguracoesView from '../src/views/ConfiguracoesView.vue'
import ConsultarView from '../src/views/ConsultarView.vue'

const { api, route, router, toast } = vi.hoisted(() => ({
  api: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
  route: { query: { aba: 'modelos' } },
  router: {
    push: vi.fn(),
    replace: vi.fn().mockResolvedValue(undefined),
  },
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('../src/services/api', () => ({ default: api }))
vi.mock('../src/services/feedback', () => ({
  dialog: { confirm: vi.fn() },
  toast,
}))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolver, rejecter) => {
    resolve = resolver
    reject = rejecter
  })
  return { promise, reject, resolve }
}

const respostaLista = (dados = []) => ({ data: { dados } })

describe('respostas assíncronas vigentes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = { aba: 'modelos' }
  })

  it('mantém dados da aba mais recente quando a anterior termina depois', async () => {
    const setores = deferred()
    const unidades = deferred()
    api.get.mockImplementation((url) => {
      if (url === '/cadastros/setores') return setores.promise
      if (url === '/cadastros/unidades') return unidades.promise
      return Promise.resolve(respostaLista())
    })
    const wrapper = shallowMount(ConfiguracoesView)

    wrapper.vm.mudarAba('setores')
    wrapper.vm.mudarAba('unidades')
    unidades.resolve(respostaLista([{ id: 2, nome: 'Unidade B', ativo: true }]))
    await flushPromises()
    setores.resolve(respostaLista([{ id: 1, nome: 'Setor A', ativo: true }]))
    await flushPromises()

    expect(wrapper.vm.abaAtiva).toBe('unidades')
    expect(wrapper.vm.dados.unidades).toEqual([{ id: 2, nome: 'Unidade B', ativo: true }])
  })

  it('invalida dados pendentes ao trocar para aba sem nova busca', async () => {
    const setores = deferred()
    api.get.mockImplementation((url) => url === '/cadastros/setores'
      ? setores.promise
      : Promise.resolve(respostaLista()))
    const wrapper = shallowMount(ConfiguracoesView)

    wrapper.vm.mudarAba('setores')
    wrapper.vm.mudarAba('modelos')
    setores.resolve(respostaLista([{ id: 1, nome: 'Setor A', ativo: true }]))
    await flushPromises()

    expect(wrapper.vm.abaAtiva).toBe('modelos')
    expect(wrapper.vm.dados.setores).toEqual([])
    expect(wrapper.vm.isLoading).toBe(false)
  })

  it('mantém modelos da seleção mais recente', async () => {
    const modelosA = deferred()
    const modelosB = deferred()
    api.get.mockImplementation((url, config) => {
      if (url === '/cadastros/marcas') return Promise.resolve(respostaLista([]))
      if (url === '/cadastros/celulas') return Promise.resolve(respostaLista([]))
      if (url === '/cadastros/setores') return Promise.resolve(respostaLista([]))
      if (url === '/dados/modelos' && config.params.marca_id === 1) return modelosA.promise
      if (url === '/dados/modelos' && config.params.marca_id === 2) return modelosB.promise
      throw new Error(`requisição inesperada: ${url}`)
    })
    const wrapper = shallowMount(CheckSelecao)
    await flushPromises()

    const chamadaA = wrapper.vm.carregarModelos({ id: 1 }, 10)
    const chamadaB = wrapper.vm.carregarModelos({ id: 2 }, 20)
    modelosB.resolve(respostaLista([{ id: 2, nome: 'Modelo B' }]))
    await chamadaB
    modelosA.resolve(respostaLista([{ id: 1, nome: 'Modelo A' }]))
    await chamadaA

    expect(wrapper.vm.opcoesModelos).toEqual([{ label: 'Modelo B', value: 2 }])
  })

  it('invalida modelos pendentes quando o setor é limpo', async () => {
    const modelos = deferred()
    api.get.mockImplementation((url) => {
      if (url === '/dados/modelos') return modelos.promise
      return Promise.resolve(respostaLista())
    })
    const wrapper = shallowMount(CheckSelecao)
    await flushPromises()
    wrapper.vm.form.setor_selecionado = 10
    await nextTick()

    const chamada = wrapper.vm.carregarModelos({ id: 1 }, 10)
    wrapper.vm.form.setor_selecionado = ''
    await nextTick()
    modelos.resolve(respostaLista([{ id: 1, nome: 'Modelo A' }]))
    await chamada

    expect(wrapper.vm.opcoesModelos).toEqual([])
  })

  it('filtra células pelo setor e pela marca, mantendo células sem marca globais', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/cadastros/marcas') return Promise.resolve(respostaLista([
        { id: 1, nome: 'FILA' },
        { id: 2, nome: 'NIKE' },
      ]))
      if (url === '/cadastros/celulas') return Promise.resolve(respostaLista([
        { id: 10, nome: 'Global', id_setor_fk: 5, id_marca_fk: null },
        { id: 11, nome: 'FILA', id_setor_fk: 5, id_marca_fk: 1 },
        { id: 12, nome: 'NIKE', id_setor_fk: 5, id_marca_fk: 2 },
        { id: 13, nome: 'Outro setor', id_setor_fk: 6, id_marca_fk: null },
      ]))
      if (url === '/cadastros/setores') return Promise.resolve(respostaLista([
        { id: 5, nome: 'Produção' },
        { id: 6, nome: 'Expedição' },
      ]))
      if (url === '/dados/modelos') return Promise.resolve(respostaLista())
      throw new Error(`requisição inesperada: ${url}`)
    })
    const wrapper = shallowMount(CheckSelecao)
    await flushPromises()

    await wrapper.vm.selecionarMarca({ id: 1, nome: 'FILA' })
    wrapper.vm.form.setor_selecionado = 5
    await flushPromises()

    expect(wrapper.vm.opcoesCelulas).toEqual([
      { label: 'Global', value: 10 },
      { label: 'FILA', value: 11 },
    ])

    wrapper.vm.form.celula_selecionada = 11
    await wrapper.vm.selecionarMarca({ id: 2, nome: 'NIKE' })

    expect(wrapper.vm.form.celula_selecionada).toBe('')
    expect(wrapper.vm.opcoesCelulas).toEqual([
      { label: 'Global', value: 10 },
      { label: 'NIKE', value: 12 },
    ])
  })

  it('preserva o modelo escolhido antes do setor quando ele continua disponível', async () => {
    api.get.mockImplementation((url, config = {}) => {
      if (url === '/cadastros/marcas') return Promise.resolve(respostaLista([{ id: 1, nome: 'FILA' }]))
      if (url === '/cadastros/celulas') return Promise.resolve(respostaLista([]))
      if (url === '/cadastros/setores') return Promise.resolve(respostaLista([{ id: 5, nome: 'Produção' }]))
      if (url === '/dados/modelos') return Promise.resolve(respostaLista([
        { id: 7, nome: 'Modelo A', id_setor_fk: config.params?.setor_id || 5 },
      ]))
      throw new Error(`requisição inesperada: ${url}`)
    })
    const wrapper = shallowMount(CheckSelecao)
    await flushPromises()

    await wrapper.vm.selecionarMarca({ id: 1, nome: 'FILA' })
    wrapper.vm.form.modelo = 7
    wrapper.vm.form.setor_selecionado = 5
    await flushPromises()

    expect(wrapper.vm.form.modelo).toBe(7)
    expect(wrapper.vm.opcoesModelos).toEqual([{ label: 'Modelo A', value: 7 }])
  })

  it('mantém o histórico da busca mais recente', async () => {
    const buscaA = deferred()
    const buscaB = deferred()
    let chamadasHistorico = 0
    api.get.mockImplementation((url) => {
      if (url !== '/submissoes') return Promise.resolve(respostaLista())
      chamadasHistorico += 1
      if (chamadasHistorico === 1) {
        return Promise.resolve({ data: { sucesso: true, dados: [], paginacao: {} } })
      }
      return chamadasHistorico === 2 ? buscaA.promise : buscaB.promise
    })
    const wrapper = shallowMount(ConsultarView)
    await flushPromises()

    wrapper.vm.filtros.busca = 'A'
    const chamadaA = wrapper.vm.buscarChecklists(1)
    wrapper.vm.filtros.busca = 'B'
    const chamadaB = wrapper.vm.buscarChecklists(1)
    buscaB.resolve({ data: { sucesso: true, dados: [{ id: 2 }], paginacao: { page: 1 } } })
    await chamadaB
    buscaA.resolve({ data: { sucesso: true, dados: [{ id: 1 }], paginacao: { page: 1 } } })
    await chamadaA

    expect(wrapper.vm.checklists).toEqual([{ id: 2 }])
  })

  it('limpar somente a busca textual dispara uma única busca', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [], paginacao: {} } })
    const wrapper = shallowMount(ConsultarView)
    await flushPromises()
    wrapper.vm.filtros.busca = 'modelo'
    await nextTick()
    api.get.mockClear()

    wrapper.vm.limparFiltros()
    await flushPromises()

    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/submissoes', expect.any(Object))
  })

  it('aborta a busca de histórico ao desmontar', async () => {
    const pendente = deferred()
    let signal
    api.get.mockImplementation((url, config) => {
      if (url === '/submissoes') {
        signal = config.signal
        return pendente.promise
      }
      return Promise.resolve(respostaLista())
    })
    const wrapper = shallowMount(ConsultarView)
    await nextTick()

    wrapper.unmount()

    expect(signal.aborted).toBe(true)
    pendente.resolve({ data: { sucesso: true, dados: [], paginacao: {} } })
  })
})
