// @vitest-environment jsdom

import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChecklistDocument from '../src/components/report/ChecklistDocument.vue'
import EvidenceGallery from '../src/components/report/EvidenceGallery.vue'
import DetalheRelatorioView from '../src/views/DetalheRelatorioView.vue'

const { api, route, router } = vi.hoisted(() => ({
  api: { get: vi.fn() },
  route: { params: { id: '42' } },
  router: { back: vi.fn(), push: vi.fn() },
}))

vi.mock('../src/services/api', () => ({ default: api }))
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }))

const documento = {
  id: 42,
  nomeModelo: 'Inspeção de qualidade',
  marca: 'FILA',
  nomeSetor: 'Produção',
  unidade: 'Unidade A',
  nomeCelula: 'Célula 2222',
  nomeUsuario: 'Pessoa Auditora',
  matricula: '1234',
  dataEnvio: '2026-08-28T12:00:00Z',
  pontuacao: 88,
  categorias: {
    Segurança: [
      { id: 10, pergunta: 'A área está organizada?', resposta: 'Conforme', foto: 'data:image/png;base64,nao-deve-ser-usada' },
      { id: 11, pergunta: 'Existe uma falha?', resposta: 'Não Conforme', observacao: 'TESTE', evidencia: { id: 30, disponivel: true } },
    ],
  },
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('ChecklistDocument', () => {
  it('renderiza documento formal sem incorporar fotos das respostas', () => {
    const wrapper = mount(ChecklistDocument, {
      props: { documento, evidencias: { total: 2, disponiveis: 1, itens: [{ id: 30 }] }, logoSrc: '/logo.png' },
    })

    expect(wrapper.find('.checklist-document').exists()).toBe(true)
    expect(wrapper.text()).toContain('Inspeção de qualidade')
    expect(wrapper.text()).toContain('2 anexos foram registrados')
    expect(wrapper.findAll('img')).toHaveLength(1)
    expect(wrapper.findAll('img')[0].attributes('src')).toBe('/logo.png')
    expect(wrapper.html()).not.toContain('nao-deve-ser-usada')
    expect(wrapper.find('.document-status').exists()).toBe(false)
    expect(wrapper.text()).toContain('Evidência: 1')
  })

  it('informa explicitamente quando as evidências expiraram', () => {
    const wrapper = mount(ChecklistDocument, {
      props: { documento, evidencias: { total: 3, disponiveis: 0, itens: [] } },
    })

    expect(wrapper.text()).toContain('3 anexos foram registrados durante a inspeção')
    expect(wrapper.text()).toContain('não estão mais disponíveis devido à política de retenção')
  })

  it('organiza impressão com assinatura na capa e respostas a partir da página seguinte', () => {
    const wrapper = mount(ChecklistDocument, {
      props: { documento, evidencias: { total: 1, disponiveis: 1, itens: [{ id: 30 }] }, modoImpressao: true },
    })

    expect(wrapper.find('.is-print-layout').exists()).toBe(true)
    expect(wrapper.find('.document-status').exists()).toBe(false)
    expect(wrapper.find('.evidence-record').exists()).toBe(false)
    expect(wrapper.find('.answer-evidence').exists()).toBe(false)
    expect(wrapper.find('.document-cover .document-footer').exists()).toBe(true)
    expect(wrapper.findAll('.document-footer')).toHaveLength(1)
    expect(wrapper.element.querySelector('.document-cover').compareDocumentPosition(
      wrapper.element.querySelector('.answers-section'),
    ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renderiza assinaturas por categoria quando presentes no documento', () => {
    const docComAssinaturas = {
      ...documento,
      assinaturasCategorias: {
        Segurança: 'data:image/png;base64,sigSeguranca',
      },
    }
    const wrapper = mount(ChecklistDocument, {
      props: { documento: docComAssinaturas },
    })

    const sigArea = wrapper.find('.category-signature-area')
    expect(sigArea.exists()).toBe(true)
    expect(sigArea.text()).toContain('Segurança')
    expect(sigArea.find('img').attributes('src')).toBe('data:image/png;base64,sigSeguranca')
  })
})

describe('EvidenceGallery', () => {
  const itens = [
    { id: 1, idPergunta: 10, pergunta: 'Área', mime: 'image/jpeg', url: 'data:image/jpeg;base64,um' },
    { id: 2, idPergunta: 11, pergunta: 'Equipamento', mime: 'image/png', conteudoUrl: 'data:image/png;base64,dois' },
  ]

  it('abre, navega e fecha o visualizador sem alterar o documento', async () => {
    const wrapper = mount(EvidenceGallery, { props: { evidencias: { total: 2, disponiveis: 2, itens } } })

    expect(wrapper.findAll('.evidence-thumbnail')).toHaveLength(2)
    await wrapper.findAll('.evidence-open')[0].trigger('click')
    expect(wrapper.find('.gallery-modal').exists()).toBe(true)
    expect(wrapper.find('.gallery-image').attributes('src')).toBe(itens[0].url)

    await wrapper.find('.modal-next').trigger('click')
    expect(wrapper.find('.gallery-image').attributes('src')).toBe(itens[1].conteudoUrl)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.gallery-modal').exists()).toBe(false)
  })

  it('não cria placeholder para arquivos expirados', () => {
    const wrapper = mount(EvidenceGallery, { props: { evidencias: { total: 2, disponiveis: 0, itens: [] } } })

    expect(wrapper.findAll('img')).toHaveLength(0)
    expect(wrapper.text()).toContain('não estão mais disponíveis devido à política de retenção')
  })
})

describe('DetalheRelatorioView', () => {
  it('carrega arquivos disponíveis pelo endpoint separado de evidências', async () => {
    const blob = new Blob(['imagem'], { type: 'image/jpeg' })
    const criarUrl = vi.fn().mockReturnValue('blob:evidencia-1')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: criarUrl })
    const revogarUrl = vi.fn()
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revogarUrl })
    api.get.mockImplementation((url) => {
      if (url === '/submissoes/42') return Promise.resolve({ data: {
        sucesso: true,
        dados: {
          id: 42,
          categorias: { Segurança: [{ idPergunta: 10, pergunta: 'Área', resposta: 'Conforme' }] },
          evidencias: { total: 1, disponiveis: 1, itens: [{ id: 7, idPergunta: 10, mime: 'image/jpeg', disponivel: true }] },
        },
      } })
      if (url === '/submissoes/42/evidencias/7') return Promise.resolve({ data: blob })
      throw new Error(`requisição inesperada: ${url}`)
    })

    const wrapper = shallowMount(DetalheRelatorioView)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/submissoes/42/evidencias/7', expect.objectContaining({ responseType: 'blob' }))
    expect(criarUrl).toHaveBeenCalledWith(blob)
    expect(wrapper.vm.evidencias.disponiveis).toBe(1)
    expect(wrapper.vm.evidencias.itens[0].conteudoUrl).toBe('blob:evidencia-1')
    wrapper.unmount()
    expect(revogarUrl).toHaveBeenCalledWith('blob:evidencia-1')
  })
})
