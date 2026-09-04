// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardView from '../src/views/DashboardView.vue'

const { api, router, session } = vi.hoisted(() => ({
  api: { get: vi.fn() },
  router: { push: vi.fn() },
  session: {
    obterPerfilLocal: vi.fn(),
  },
}))

vi.mock('../src/services/api', () => ({ default: api }))
vi.mock('vue-router', () => ({
  useRouter: () => router,
}))
vi.mock('../src/services/session', () => ({
  obterPerfilLocal: session.obterPerfilLocal,
}))

const metricasMock = {
  data: {
    sucesso: true,
    dados: {
      resumo: {
        totalAuditorias: 15,
        conformidadeMedia: 96,
        conformidadeCtq: 98,
        totalNaoConformidades: 4,
        tempoMedioMinutos: 14.5,
      },
      faixasConformidade: { metaAtingida: 12, alerta: 2, critico: 1 },
      detalheCtq: { totalConforme: 49, totalNaoConforme: 1, totalItens: 50, conformidadeCtq: 98 },
      severidadeNC: { totalNC: 4, ctq: 1, geral: 3 },
      paretoCategorias: [
        { categoria: 'Costura', quantidade: 3, percentual: 75, percentualAcumulado: 75 },
        { categoria: 'Montagem', quantidade: 1, percentual: 25, percentualAcumulado: 100 },
      ],
      serieTemporal: [
        { data: '2026-09-01', totalAuditorias: 7, conformidadeMedia: 94, totalNC: 3 },
        { data: '2026-09-02', totalAuditorias: 8, conformidadeMedia: 98, totalNC: 1 },
      ],
      rankingCelulas: [{ id: '1', nome: 'Linha 101', totalAuditorias: 15, conformidadeMedia: 96, totalNC: 4 }],
      topDefeitos: [{ pergunta: 'Tamanho do ponto', categoria: 'Costura', ctq: true, quantidadeNC: 3 }],
    },
  },
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    session.obterPerfilLocal.mockReturnValue({ id: 1, id_setor_fk: 2, id_celula_fk: 4 })
    api.get.mockImplementation((url) => {
      if (url === '/cadastros/setores') return Promise.resolve({ data: [{ id: 2, nome: 'Costura' }] })
      if (url === '/dados/modelos') return Promise.resolve({ data: [{ id: 10, nome: 'Modelo Alpha' }] })
      if (url === '/cadastros/celulas') return Promise.resolve({ data: [{ id: 4, id_setor_fk: 2, nome: 'Célula 101' }] })
      if (url === '/dashboard/metricas') return Promise.resolve(metricasMock)
      throw new Error(`url inesperada: ${url}`)
    })
  })

  it('carrega opções de filtro e busca métricas com setor e célula do perfil', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    expect(wrapper.vm.filtros.setorId).toBe('2')
    expect(wrapper.vm.filtros.celulaId).toBe('4')
    expect(api.get).toHaveBeenCalledWith('/dashboard/metricas', expect.objectContaining({
      params: expect.objectContaining({ setorId: '2', celulaId: '4' }),
    }))
    expect(wrapper.vm.dados.resumo.totalAuditorias).toBe(15)
  })

  it('renderiza cards de KPIs com métricas e status adequados', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    const cards = wrapper.findAll('.kpi-card')
    expect(cards.length).toBe(5)

    expect(wrapper.text()).toContain('96%')
    expect(wrapper.text()).toContain('Meta atingida')
    expect(wrapper.text()).toContain('15')
    expect(wrapper.text()).toContain('98%')
    expect(wrapper.text()).toContain('4')
    expect(wrapper.text()).toContain('14.5')
  })

  it('renderiza os 3 gráficos de rosca com faixas, CTQ e distribuição por categoria', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    expect(wrapper.find('.donuts-grid').exists()).toBe(true)
    const donutCards = wrapper.findAll('.donut-card')
    expect(donutCards.length).toBe(3)

    expect(wrapper.text()).toContain('Faixas de conformidade')
    expect(wrapper.text()).toContain('Qualidade crítica (CTQ)')
    expect(wrapper.text()).toContain('Distribuição de falhas')

    expect(wrapper.vm.donutMetas.total).toBe(15)
    expect(wrapper.vm.donutCtq.total).toBe(50)
    expect(wrapper.vm.donutCategorias.total).toBe(4)
  })

  it('renderiza o gráfico de Pareto com barras e percentuais acumulados', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    expect(wrapper.find('.pareto-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('Pareto de não conformidades por categoria')
    expect(wrapper.text()).toContain('Costura')
    expect(wrapper.text()).toContain('3 falhas (75%)')
    expect(wrapper.text()).toContain('Acumulado: 75%')
    expect(wrapper.text()).toContain('Montagem')
    expect(wrapper.text()).toContain('Acumulado: 100%')
  })

  it('renderiza a linha do tempo em SVG com pontos calculados', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    expect(wrapper.find('.trend-svg').exists()).toBe(true)
    expect(wrapper.find('.trend-polyline').exists()).toBe(true)
    expect(wrapper.vm.svgDados.pontos.length).toBe(2)
    expect(wrapper.vm.svgDados.polylinePoints).toBeTruthy()
    expect(wrapper.findAll('.trend-point').length).toBe(2)
  })

  it('renderiza o ranking de células e permite navegar para o histórico com filtros', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    expect(wrapper.find('.ranking-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('Linha 101')
    expect(wrapper.text()).toContain('1º')

    await wrapper.find('.btn-drilldown').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      path: '/consultar',
      query: expect.objectContaining({
        celulaId: '1',
      }),
    })
  })

  it('renderiza top defeitos e permite investigar ocorrência', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    expect(wrapper.find('.top-defeitos-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('Tamanho do ponto')
    expect(wrapper.text()).toContain('3 falhas')

    await wrapper.find('.btn-investigar').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      path: '/consultar',
      query: expect.objectContaining({
        busca: 'Tamanho do ponto',
      }),
    })
  })

  it('alterna períodos rápidos e atualiza filtros', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    wrapper.vm.selecionarPeriodo('hoje')
    await flushPromises()

    expect(wrapper.vm.periodoSelecionado).toBe('hoje')
    expect(wrapper.vm.filtros.dataInicio).toBe(wrapper.vm.filtros.dataFim)
    expect(api.get).toHaveBeenCalledWith('/dashboard/metricas', expect.anything())
  })

  it('exibe estado vazio quando não há auditorias no período', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/dashboard/metricas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              resumo: { totalAuditorias: 0, conformidadeMedia: 100, conformidadeCtq: 100, totalNaoConformidades: 0, tempoMedioMinutos: 0 },
              paretoCategorias: [],
              serieTemporal: [],
              rankingCelulas: [],
              topDefeitos: [],
            },
          },
        })
      }
      return Promise.resolve({ data: [] })
    })

    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Nenhuma auditoria encontrada')
  })

  it('exibe estado de erro e permite tentar novamente', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/dashboard/metricas') {
        return Promise.reject(new Error('Erro de conexão ao carregar dashboard.'))
      }
      return Promise.resolve({ data: [] })
    })

    const wrapper = shallowMount(DashboardView)
    await flushPromises()

    expect(wrapper.find('.error-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Erro de conexão ao carregar dashboard.')

    api.get.mockImplementation((url) => {
      if (url === '/dashboard/metricas') return Promise.resolve(metricasMock)
      return Promise.resolve({ data: [] })
    })

    await wrapper.find('.btn-retry').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-state').exists()).toBe(false)
    expect(wrapper.vm.dados.resumo.totalAuditorias).toBe(15)
  })
})
