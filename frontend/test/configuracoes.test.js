// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ConfiguracoesView from '../src/views/ConfiguracoesView.vue'

const { api, dialog, route, router, toast } = vi.hoisted(() => ({
  api: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
  dialog: { confirm: vi.fn() },
  route: { query: { aba: 'setores' } },
  router: { replace: vi.fn().mockResolvedValue(undefined) },
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('../src/services/api', () => ({ default: api }))
vi.mock('../src/services/feedback', () => ({ dialog, toast }))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))

const respostaLista = { data: { dados: [] } }

const montar = async (aba) => {
  route.query = { aba }
  api.get.mockResolvedValue(respostaLista)
  api.put.mockResolvedValue({ data: { sucesso: true } })
  const wrapper = shallowMount(ConfiguracoesView)
  await flushPromises()
  return wrapper
}

describe('edição de cadastros administrativos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserva ativo ao editar setor', async () => {
    const wrapper = await montar('setores')
    await wrapper.vm.abrirModal({ id: 1, nome: 'Setor', ativo: true })
    wrapper.vm.form.nome = 'Setor revisado'

    await wrapper.vm.salvarItem()

    expect(api.put).toHaveBeenCalledWith('/cadastros/setores/1', {
      nome: 'Setor revisado',
      ativo: true,
    })
  })

  it('preserva ativo ao editar unidade', async () => {
    const wrapper = await montar('unidades')
    await wrapper.vm.abrirModal({ id: 2, nome: 'Unidade', ativo: true })
    wrapper.vm.form.nome = 'Unidade revisada'

    await wrapper.vm.salvarItem()

    expect(api.put).toHaveBeenCalledWith('/cadastros/unidades/2', {
      nome: 'Unidade revisada',
      ativo: true,
    })
  })

  it('preserva ativo e FKs ao editar célula', async () => {
    const wrapper = await montar('celulas')
    await wrapper.vm.abrirModal({
      id: 3,
      nome: 'Célula',
      ativo: true,
      id_setor_fk: 4,
      id_marca_fk: 5,
    })
    wrapper.vm.form.nome = 'Célula revisada'

    await wrapper.vm.salvarItem()

    expect(api.put).toHaveBeenCalledWith('/cadastros/celulas/3', {
      nome: 'Célula revisada',
      ativo: true,
      id_setor_fk: 4,
      id_marca_fk: 5,
    })
  })

  it('recarrega categorias após um modelo sincronizar o catálogo', async () => {
    const wrapper = await montar('modelos')
    wrapper.vm.dados.categorias = [{ id: 1, nome: 'ANTIGA' }]

    wrapper.findComponent({ name: 'ModelosTab' }).vm.$emit('catalogo-atualizado')
    wrapper.vm.mudarAba('categorias')
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/cadastros/categorias-padrao', expect.any(Object))
  })
})
