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
      categorias: { CCCCCC: { ctq: false, ordem: 1, perguntas: ['Primeira', 'Segunda', 'Terceira'] } },
    }))
    expect(wrapper.emitted('catalogo-atualizado')).toHaveLength(1)
  })

  it('envia a versão recebida no detalhe e orienta revisão em conflito concorrente', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/cadastros/modelos/9') {
        return Promise.resolve({ data: {
          sucesso: true,
          modelo: {
            id: 9, nome: 'Modelo', nomeMarca: 7, id_setor: 3, ativo: true, versao: 4,
            categorias: { CATEGORIA: { ctq: false, perguntas: ['Pergunta'] } }
          }
        } })
      }
      return Promise.resolve({ data: { dados: [] } })
    })
    const wrapper = shallowMount(ModelosTab)
    await flushPromises()

    await wrapper.vm.abrirEdicao({ id: 9 })
    expect(wrapper.vm.form.versao).toBe(4)

    api.put.mockRejectedValueOnce({
      response: { status: 409, data: { codigo: 'MODELO_ALTERADO_CONCORRENTEMENTE' } }
    })
    await wrapper.vm.salvarChecklist()

    expect(api.put).toHaveBeenCalledWith('/cadastros/modelos/9', expect.objectContaining({ versao: 4 }))
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('alterado por outra pessoa'))
    expect(wrapper.vm.erroForm).toContain('Recarregue')
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

  it('importa múltiplas categorias do catálogo de uma só vez', async () => {
    api.get.mockImplementation((url) => Promise.resolve({ data: { dados: url.endsWith('categorias-padrao')
      ? [
          { id: 10, nome: 'Solado', ctq: true, perguntas: ['S1', 'S2'] },
          { id: 20, nome: 'Costura', ctq: false, perguntas: ['C1'] },
        ]
      : [] } }))
    const wrapper = shallowMount(ModelosTab)
    await flushPromises()

    wrapper.vm.categoriasPadraoSelecionadas = [10, 20]
    expect(wrapper.vm.totalCategoriasSelecionadas).toBe(2)
    expect(wrapper.vm.textoBotaoImportar).toBe('Importar (2)')
    expect(wrapper.vm.categoriasSelecionadasOrdenadas.map(categoria => categoria.nome)).toEqual(['Solado', 'Costura'])

    wrapper.vm.importarCategoriaCatalogo()

    expect(wrapper.vm.categoriasUI).toHaveLength(2)
    expect(wrapper.vm.categoriasUI[0].nome).toBe('Solado')
    expect(wrapper.vm.categoriasUI[0].ctq).toBe(true)
    expect(wrapper.vm.categoriasUI[0].perguntas).toHaveLength(2)
    expect(wrapper.vm.categoriasUI[1].nome).toBe('Costura')
    expect(wrapper.vm.categoriasUI[1].ctq).toBe(false)
    expect(wrapper.vm.categoriasUI[1].perguntas).toHaveLength(1)
    expect(wrapper.vm.categoriasPadraoSelecionadas).toEqual([])
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('2 categorias importadas'))
  })

  it('ao importar em lote, importa as novas e avisa sobre categorias que já existiam', async () => {
    api.get.mockImplementation((url) => Promise.resolve({ data: { dados: url.endsWith('categorias-padrao')
      ? [
          { id: 10, nome: 'Solado', ctq: true, perguntas: ['S1'] },
          { id: 20, nome: 'Costura', ctq: false, perguntas: ['C1'] },
        ]
      : [] } }))
    const wrapper = shallowMount(ModelosTab)
    await flushPromises()

    wrapper.vm.categoriasUI = [{ nome: 'Costura', ctq: false, perguntas: [{ texto: 'Existente' }], novaPergunta: '' }]
    wrapper.vm.categoriasPadraoSelecionadas = [10, 20]

    wrapper.vm.importarCategoriaCatalogo()

    expect(wrapper.vm.categoriasUI).toHaveLength(2)
    expect(wrapper.vm.categoriasUI[0].nome).toBe('Costura')
    expect(wrapper.vm.categoriasUI[1].nome).toBe('Solado')
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Categoria "Solado" importada'))
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('já foi adicionada'))
  })

  it('permite alternar a visibilidade de perguntas de uma categoria individualmente', async () => {
    const wrapper = shallowMount(ModelosTab)
    await flushPromises()

    wrapper.vm.categoriasUI = [
      { nome: 'Montagem', ctq: false, expandida: true, perguntas: [{ texto: 'Pergunta 1' }], novaPergunta: '' }
    ]

    expect(wrapper.vm.categoriasUI[0].expandida).toBe(true)
    wrapper.vm.categoriasUI[0].expandida = false
    expect(wrapper.vm.categoriasUI[0].expandida).toBe(false)
  })

  it('permite recolher e expandir todas as categorias em lote', async () => {
    const wrapper = shallowMount(ModelosTab)
    await flushPromises()

    wrapper.vm.categoriasUI = [
      { nome: 'Cat 1', ctq: false, expandida: true, perguntas: [{ texto: 'P1' }, { texto: 'P2' }], novaPergunta: '' },
      { nome: 'Cat 2', ctq: true, expandida: true, perguntas: [{ texto: 'P3' }], novaPergunta: '' }
    ]

    expect(wrapper.vm.totalPerguntasModelo).toBe(3)

    wrapper.vm.alternarTodasCategorias(false)
    expect(wrapper.vm.categoriasUI.every(c => c.expandida === false)).toBe(true)

    wrapper.vm.alternarTodasCategorias(true)
    expect(wrapper.vm.categoriasUI.every(c => c.expandida === true)).toBe(true)
  })
})
