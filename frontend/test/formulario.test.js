// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FormularioView from '../src/views/FormularioView.vue'

const { api, route, router, toast, draft } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  route: { params: { modelo: '7' }, query: {} },
  router: { push: vi.fn() },
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  draft: {
    load: vi.fn(),
    schedule: vi.fn(),
    setPhoto: vi.fn(),
    removePhoto: vi.fn(),
    flush: vi.fn(),
    discard: vi.fn(),
    clear: vi.fn(),
  },
}))

vi.mock('../src/services/api', () => ({ default: api }))
vi.mock('../src/services/feedback', () => ({ toast }))
vi.mock('../src/services/session', () => ({ obterPerfilLocal: () => ({ id: 1, id_setor_fk: 2, id_celula_fk: 3 }) }))
vi.mock('../src/services/draftPersistence', () => ({ createDraftPersistence: () => draft }))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))

const respostaPerguntas = {
  data: {
    sucesso: true,
    modelo: { id: 7, nome: 'Modelo atual', versao: 2 },
    respostasAgrupadas: { Categoria: [{ id: 10, texto: 'Pergunta', variavel: 'p1' }] },
  },
}

describe('carregamento do formulário', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    draft.load.mockResolvedValue(null)
    draft.discard.mockResolvedValue(undefined)
    api.get.mockResolvedValue(respostaPerguntas)
  })

  it('exibe loading e só renderiza o formulário depois de carregar perguntas', async () => {
    let resolver
    api.get.mockReturnValue(new Promise(resolve => { resolver = resolve }))
    const wrapper = shallowMount(FormularioView)

    expect(wrapper.findComponent({ name: 'FeedbackState' }).props('type')).toBe('loading')
    expect(wrapper.find('form').exists()).toBe(false)

    resolver(respostaPerguntas)
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.vm.nomeModelo).toBe('Modelo atual')
    expect(wrapper.vm.versaoModelo).toBe(2)
  })

  it('exibe erro com retry e não mostra formulário vazio', async () => {
    api.get.mockRejectedValueOnce({ response: { data: { mensagem: 'Falha de rede' } } })
    const wrapper = shallowMount(FormularioView)
    await flushPromises()

    const feedback = wrapper.findComponent({ name: 'FeedbackState' })
    expect(feedback.props('type')).toBe('error')
    expect(feedback.props('message')).toBe('Falha de rede')
    expect(wrapper.find('form').exists()).toBe(false)

    api.get.mockResolvedValueOnce(respostaPerguntas)
    await feedback.vm.$emit('retry')
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('descarta rascunho legado ou de versão incompatível', async () => {
    draft.load.mockResolvedValueOnce({
      metadata: { respostas: { p1: 'Conforme' } },
      fotos: {},
    })
    const wrapper = shallowMount(FormularioView)
    await flushPromises()

    expect(draft.discard).toHaveBeenCalledOnce()
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('descartado'))
    expect(wrapper.vm.respostas).toEqual({})
  })

  it('cancela o carregamento e não restaura handlers depois do unmount', async () => {
    let resolver
    api.get.mockImplementationOnce((_url, { signal }) => new Promise((resolve, reject) => {
      resolver = resolve
      signal.addEventListener('abort', () => reject({ code: 'ERR_CANCELED' }))
    }))
    const wrapper = shallowMount(FormularioView)
    expect(window.onFotoCapturada).toBeTypeOf('function')

    wrapper.unmount()
    resolver?.(respostaPerguntas)
    await flushPromises()

    expect(window.onFotoCapturada).toBeUndefined()
    expect(draft.load).not.toHaveBeenCalled()
  })

  it('detecta categoria não conforme, aceita foto opcional e exige assinatura da categoria ao submeter', async () => {
    const wrapper = shallowMount(FormularioView)
    await flushPromises()

    expect(wrapper.vm.categoriaTemNaoConformidade('Categoria')).toBe(false)
    expect(wrapper.vm.categoriasNaoConformes).toEqual([])

    wrapper.vm.respostas.p1 = 'Não Conforme'
    wrapper.vm.observacoesNaoConformes.p1 = 'Defeito encontrado'
    expect(wrapper.vm.categoriaTemNaoConformidade('Categoria')).toBe(true)
    expect(wrapper.vm.categoriasNaoConformes).toEqual(['Categoria'])

    await wrapper.find('form').trigger('submit')
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('A assinatura para a categoria "Categoria" é obrigatória'))
    expect(api.post).not.toHaveBeenCalled()

    wrapper.vm.assinaturasCategorias['Categoria'] = 'data:image/png;base64,sigCat'
    await wrapper.find('form').trigger('submit')
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('A assinatura geral do auditor é obrigatória'))
    expect(api.post).not.toHaveBeenCalled()

    wrapper.vm.assinatura = 'data:image/png;base64,sigGeral'
    api.post.mockResolvedValueOnce({ data: { sucesso: true, id_formulario: 123 } })
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/checklists/salvar', expect.objectContaining({
      assinatura: 'data:image/png;base64,sigGeral',
      assinaturas_categorias: { Categoria: 'data:image/png;base64,sigCat' },
      respostas: [
        expect.objectContaining({
          id_pergunta: 10,
          resposta: 'Não Conforme',
          observacao: 'Defeito encontrado',
          foto: null,
        }),
      ],
    }))
  })

  it('renderiza badge vetorial CTQ e permite recolher e expandir todas as categorias', async () => {
    const respostaMulti = {
      data: {
        sucesso: true,
        modelo: { id: 7, nome: 'Modelo com 2 categorias', versao: 2 },
        respostasAgrupadas: {
          Cat1: [{ id: 10, texto: 'P1', variavel: 'p1', ctq: true }],
          Cat2: [{ id: 20, texto: 'P2', variavel: 'p2', ctq: false }],
        },
      },
    }
    api.get.mockResolvedValueOnce(respostaMulti)
    const wrapper = shallowMount(FormularioView)
    await flushPromises()

    expect(wrapper.find('.badge-ctq-pill').exists()).toBe(true)
    expect(wrapper.find('.badge-ctq-pill').text()).toContain('CRÍTICO (CTQ)')

    expect(wrapper.vm.estatisticasCategorias.Cat1.total).toBe(1)
    expect(wrapper.vm.estatisticasCategorias.Cat1.respondidas).toBe(0)
    expect(wrapper.vm.estatisticasCategorias.Cat1.completo).toBe(false)

    wrapper.vm.respostas.p1 = 'Conforme'
    expect(wrapper.vm.estatisticasCategorias.Cat1.respondidas).toBe(1)
    expect(wrapper.vm.estatisticasCategorias.Cat1.completo).toBe(true)

    wrapper.vm.alternarTodasCategorias(false)
    expect(wrapper.vm.categoriasAbertas.Cat1).toBe(false)
    expect(wrapper.vm.categoriasAbertas.Cat2).toBe(false)

    wrapper.vm.alternarTodasCategorias(true)
    expect(wrapper.vm.categoriasAbertas.Cat1).toBe(true)
    expect(wrapper.vm.categoriasAbertas.Cat2).toBe(true)
  })

  it('mantém texto de pendentes oculto inicialmente e só exibe ao tentar finalizar com itens pendentes', async () => {
    const resposta = {
      data: {
        sucesso: true,
        modelo: { id: 7, nome: 'Modelo com pendência', versao: 2 },
        respostasAgrupadas: {
          Montagem: [{ id: 10, texto: 'P1', variavel: 'p1' }],
        },
      },
    }
    api.get.mockResolvedValueOnce(resposta)
    const wrapper = shallowMount(FormularioView)
    await flushPromises()

    expect(wrapper.vm.tentouFinalizar).toBe(false)
    expect(wrapper.find('.progresso-pendentes').exists()).toBe(false)

    await wrapper.find('form').trigger('submit')
    expect(wrapper.vm.tentouFinalizar).toBe(true)
    expect(wrapper.find('.progresso-pendentes').exists()).toBe(true)
    expect(wrapper.find('.progresso-pendentes').text()).toContain('Montagem')

    wrapper.vm.respostas.p1 = 'Conforme'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.progresso-pendentes').exists()).toBe(false)
  })
})
