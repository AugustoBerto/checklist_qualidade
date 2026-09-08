// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import DashboardView from '../src/views/DashboardView.vue'

const { api, router, session } = vi.hoisted(() => ({
  api: { get: vi.fn() },
  router: { push: vi.fn(), replace: vi.fn(), currentRoute: { value: { query: {} } } },
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
    router.currentRoute = ref({ query: {} })
    router.replace.mockImplementation(({ query }) => { router.currentRoute.value = { query }; return Promise.resolve() })
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
    expect(wrapper.text()).toContain('14,5')
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
  it('usa limites consistentes e distingue ausência de CTQ de conformidade total', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()
    expect(wrapper.vm.classeStatusConformidade(85)).toBe('status-alerta')
    expect(wrapper.vm.classeStatusConformidade(84)).toBe('status-critico')
    expect(wrapper.vm.classeStatusConformidade(95)).toBe('status-meta-atingida')
    wrapper.vm.dados = { ...metricasMock.data.dados, detalheCtq: { totalItens: 0 } }
    await flushPromises()
    expect(wrapper.find('.kpi-card-ctq').text()).toContain('Sem itens CTQ avaliados')
    expect(wrapper.find('.kpi-card-ctq .kpi-value').text()).toBe('—')
    wrapper.unmount()
  })

  it('limpa modelo e célula incompatíveis ao trocar de setor', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()
    wrapper.vm.modelosOptions = [{ id: 10, id_setor_fk: 2 }, { id: 11, id_setor_fk: 3 }]
    wrapper.vm.filtros.modeloId = '10'
    wrapper.vm.filtros.setorId = '3'
    wrapper.vm.onSetorChange()
    await flushPromises()
    expect(wrapper.vm.filtros.modeloId).toBe('')
    expect(wrapper.vm.filtros.celulaId).toBe('')
    expect(wrapper.vm.modelosFiltrados.map(m => m.id)).toEqual([11])
    wrapper.unmount()
  })

  it('não consulta datas invertidas nem repete consulta ao abrir período personalizado', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()
    api.get.mockClear()
    wrapper.vm.selecionarPeriodo('custom')
    expect(api.get).not.toHaveBeenCalled()
    wrapper.vm.filtros.dataInicio = '2026-09-10'
    wrapper.vm.filtros.dataFim = '2026-09-01'
    await wrapper.vm.carregarMetricas()
    expect(api.get).not.toHaveBeenCalled()
    expect(wrapper.vm.error).toContain('data inicial')
    expect(wrapper.vm.isLoading).toBe(false)
    wrapper.unmount()
  })

  it('posiciona datas proporcionalmente e limita rótulos sem remover pontos', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()
    wrapper.vm.dados = { ...metricasMock.data.dados, serieTemporal: [
      { data: '2026-09-01', conformidadeMedia: 80 },
      { data: '2026-09-02', conformidadeMedia: 90 },
      { data: '2026-09-11', conformidadeMedia: 95 },
    ] }
    await flushPromises()
    expect(wrapper.vm.svgDados.pontos.map(p => p.x)).toEqual([60, 111, 570])
    wrapper.vm.dados = { ...metricasMock.data.dados, serieTemporal: Array.from({ length: 30 }, (_, i) => ({
      data: `2026-09-${String(i + 1).padStart(2, '0')}`, conformidadeMedia: 95, totalAuditorias: 1,
    })) }
    await flushPromises()
    expect(wrapper.findAll('.trend-point')).toHaveLength(30)
    expect(wrapper.findAll('.axis-x-text').length).toBeLessThanOrEqual(7)
    await wrapper.find('.trend-point').trigger('focus')
    expect(wrapper.findAll('.trend-tooltip .tooltip-row')).toHaveLength(3)
    wrapper.unmount()
  })

  it('inclui no destaque Pareto a categoria que cruza os 80%', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()
    expect(wrapper.findAll('.fill-vital')).toHaveLength(2)
    wrapper.unmount()
  })

  it('carrega indicadores sem esperar filtros e preserva opções bem-sucedidas', async () => {
    let liberarSetores
    api.get.mockImplementation((url) => {
      if (url === '/cadastros/setores') return new Promise(resolve => { liberarSetores = resolve })
      if (url === '/dados/modelos') return Promise.reject(new Error('Falha nos modelos'))
      if (url === '/dashboard/metricas') return Promise.resolve(metricasMock)
      return Promise.resolve({ data: [] })
    })
    const wrapper = shallowMount(DashboardView)
    await flushPromises()
    expect(wrapper.vm.isLoading).toBe(false)
    expect(wrapper.findAll('.kpi-card')).toHaveLength(5)
    liberarSetores({ data: [{ id: 2, nome: 'Costura' }] })
    await flushPromises()
    expect(wrapper.vm.setoresOptions).toEqual([{ id: 2, nome: 'Costura' }])
    expect(wrapper.find('.filter-warning').exists()).toBe(true)
    wrapper.unmount()
  })

  it('limita o Pareto a 15 categorias sem recalcular percentuais nem cortar a distribuição', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()
    const categorias = Array.from({ length: 20 }, (_, i) => ({
      categoria: `Categoria ${i + 1}`, quantidade: 1, percentual: 5, percentualAcumulado: (i + 1) * 5,
    }))
    wrapper.vm.dados = { ...metricasMock.data.dados, resumo: { ...metricasMock.data.dados.resumo, totalNaoConformidades: 20 }, paretoCategorias: categorias }
    await flushPromises()
    expect(wrapper.findAll('.pareto-item')).toHaveLength(15)
    expect(wrapper.find('.pareto-limit-note').text()).toContain('15 de 20')
    expect(wrapper.findAll('.pareto-item')[14].text()).toContain('Acumulado: 75%')
    expect(wrapper.vm.donutCategorias.segmentos.at(-1).count).toBe(16)
    wrapper.unmount()
  })

  it('exibe resumo e volumes diários na evolução sem modificar a ordem do gráfico', async () => {
    const wrapper = shallowMount(DashboardView)
    await flushPromises()
    expect(wrapper.find('.trend-summary').text()).toContain('+4 p.p.')
    expect(wrapper.vm.resumoEvolucao).toEqual({ dias: 2, diasNaMeta: 1, variacao: 4 })
    const linhas = wrapper.findAll('.trend-daily-table tbody tr')
    expect(linhas).toHaveLength(2)
    expect(linhas[0].text()).toContain('02/09/2026')
    expect(linhas[0].findAll('td').map(td => td.text())).toEqual(['8', '1', '98%'])
    expect(wrapper.vm.svgDados.pontos[0].data).toBe('2026-09-01')
    wrapper.vm.dados = { ...metricasMock.data.dados, serieTemporal: [metricasMock.data.dados.serieTemporal[0]] }
    await flushPromises()
    expect(wrapper.vm.resumoEvolucao.variacao).toBeNull()
    expect(wrapper.find('.trend-summary').text()).toContain('—')
    wrapper.unmount()
  })

  it('alterna o modo BI mantendo filtros, dados e demais parâmetros da rota', async () => {
    router.currentRoute.value = { query: { origem: 'tv' } }
    const wrapper = shallowMount(DashboardView, { attachTo: document.body })
    await flushPromises()
    const filtrosAntes = { ...wrapper.vm.filtros }
    await wrapper.vm.alternarModoBi()
    await flushPromises()
    expect(wrapper.find('.bi-viewport').exists()).toBe(true)
    expect(wrapper.find('.bi-toolbar').text()).toContain('Sair do modo BI')
    expect(wrapper.find('.filtros-card').isVisible()).toBe(false)
    expect(wrapper.findAll('.kpi-card')).toHaveLength(5)
    expect(wrapper.findAll('.donut-card')).toHaveLength(3)
    expect(router.currentRoute.value.query).toEqual({ origem: 'tv', bi: '1' })
    expect(wrapper.vm.filtros).toEqual(filtrosAntes)
    expect(wrapper.vm.estiloBi.transform).toContain('scale(')
    await wrapper.vm.alternarModoBi()
    await flushPromises()
    expect(wrapper.find('.bi-viewport').exists()).toBe(false)
    expect(wrapper.find('.filtros-card').isVisible()).toBe(true)
    expect(router.currentRoute.value.query).toEqual({ origem: 'tv' })
    expect(wrapper.vm.estiloBi).toBeUndefined()
    wrapper.unmount()
  })

  it('ajusta a escala do painel ao redimensionar a janela', async () => {
    router.currentRoute.value = { query: { bi: '1' } }
    const wrapper = shallowMount(DashboardView)
    await flushPromises()
    wrapper.vm.tamanhoTela = { largura: 1920, altura: 1080 }
    expect(wrapper.vm.estiloBi.transform).toContain('scale(1)')
    wrapper.vm.tamanhoTela = { largura: 960, altura: 540 }
    expect(wrapper.vm.estiloBi.transform).toContain('scale(0.5)')
    wrapper.unmount()
  })

})
