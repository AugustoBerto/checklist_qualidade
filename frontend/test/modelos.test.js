// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ModelosTab from '../src/components/admin/ModelosTab.vue'

const { api, toast } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

vi.mock('../src/services/api', () => ({ default: api }))
vi.mock('../src/services/feedback', () => ({ toast }))

describe('edição de modelos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: { dados: [] } })
    api.put.mockResolvedValue({ data: { sucesso: true } })
  })

  it('inclui no salvamento a pergunta ainda digitada no campo de adição', async () => {
    const wrapper = shallowMount(ModelosTab)
    await flushPromises()
    Object.assign(wrapper.vm.form, {
      id: 9, nomeModelo: 'Modelo', nomeMarca: 7, idSetor: 3, ativo: true,
    })
    wrapper.vm.categoriasUI = [{
      nome: 'CCCCCC', ctq: false,
      perguntas: [{ texto: 'Primeira' }, { texto: 'Segunda' }],
      novaPergunta: 'Terceira',
    }]

    await wrapper.vm.salvarChecklist()

    expect(api.put).toHaveBeenCalledWith('/cadastros/modelos/9', expect.objectContaining({
      categorias: { CCCCCC: { ctq: false, perguntas: ['Primeira', 'Segunda', 'Terceira'] } },
    }))
    expect(wrapper.emitted('catalogo-atualizado')).toHaveLength(1)
  })

  it('impede que categorias renomeadas para o mesmo nome sobrescrevam perguntas', async () => {
    const wrapper = shallowMount(ModelosTab)
    await flushPromises()
    Object.assign(wrapper.vm.form, {
      id: 9, nomeModelo: 'Modelo', nomeMarca: 7, idSetor: 3, ativo: true,
    })
    wrapper.vm.categoriasUI = [
      { nome: 'Teste', ctq: false, perguntas: [{ texto: 'Primeira' }], novaPergunta: '' },
      { nome: ' teste ', ctq: false, perguntas: [{ texto: 'Segunda' }], novaPergunta: '' },
    ]

    await wrapper.vm.salvarChecklist()

    expect(api.put).not.toHaveBeenCalled()
    expect(wrapper.vm.erroForm).toContain('categorias duplicadas')
  })

  it('importa uma categoria do catálogo sem erro no manipulador', async () => {
    api.get.mockImplementation((url) => Promise.resolve({ data: { dados: url.endsWith('categorias-padrao')
      ? [{ id: 4, nome: 'TESTE', ctq: false, perguntas: ['P1', 'P2'] }]
      : [] } }))
    const wrapper = shallowMount(ModelosTab)
    await flushPromises()
    wrapper.vm.categoriaPadraoSelecionada = 4

    expect(() => wrapper.vm.importarCategoriaCatalogo()).not.toThrow()
    expect(wrapper.vm.categoriasUI[0].perguntas).toHaveLength(2)
  })
})
