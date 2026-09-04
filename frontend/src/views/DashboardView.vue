<template>
  <div class="page-container dashboard-page">
    <PageHeader
      title="Dashboard de qualidade"
      subtitle="Indicadores de desempenho, conformidade e análise de desvios operacionais."
      icon="mdi mdi-chart-box-outline"
    >
      <template #actions>
        <button
          type="button"
          class="btn-refresh"
          @click="carregarMetricas"
          :disabled="isLoading"
          title="Atualizar dados do dashboard"
        >
          <i class="mdi mdi-refresh" :class="{ 'mdi-spin': isLoading }"></i>
          <span>Atualizar</span>
        </button>
      </template>
    </PageHeader>

    <!-- Barra de Filtros Integrada -->
    <div class="card filtros-card">
      <div class="filtros-header">
        <div class="periodo-chips" role="group" aria-label="Seleção rápida de período">
          <button
            type="button"
            class="chip-btn"
            :class="{ active: periodoSelecionado === 'hoje' }"
            @click="selecionarPeriodo('hoje')"
          >
            Hoje
          </button>
          <button
            type="button"
            class="chip-btn"
            :class="{ active: periodoSelecionado === '7d' }"
            @click="selecionarPeriodo('7d')"
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            class="chip-btn"
            :class="{ active: periodoSelecionado === '30d' }"
            @click="selecionarPeriodo('30d')"
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            class="chip-btn"
            :class="{ active: periodoSelecionado === 'mes' }"
            @click="selecionarPeriodo('mes')"
          >
            Mês atual
          </button>
          <button
            type="button"
            class="chip-btn"
            :class="{ active: periodoSelecionado === 'custom' }"
            @click="selecionarPeriodo('custom')"
          >
            Personalizado
          </button>
        </div>

        <button
          v-if="temFiltrosAtivos"
          type="button"
          class="btn-limpar-filtros"
          @click="limparFiltros"
          title="Restaurar filtros padrões"
        >
          <i class="mdi mdi-filter-remove-outline"></i>
          <span>Limpar</span>
        </button>
      </div>

      <!-- Inputs de Data quando Personalizado -->
      <div v-if="periodoSelecionado === 'custom'" class="custom-dates-row">
        <div class="date-field">
          <label for="dash-data-inicio">Data inicial:</label>
          <input
            id="dash-data-inicio"
            type="date"
            v-model="filtros.dataInicio"
            @change="carregarMetricas"
            class="input-date"
          />
        </div>
        <div class="date-field">
          <label for="dash-data-fim">Data final:</label>
          <input
            id="dash-data-fim"
            type="date"
            v-model="filtros.dataFim"
            @change="carregarMetricas"
            class="input-date"
          />
        </div>
      </div>

      <!-- Linha de Seletores (Setor, Célula, Modelo) -->
      <div class="filtros-grid">
        <div class="filter-field">
          <label for="dash-filtro-setor" class="filter-label">Setor</label>
          <select
            id="dash-filtro-setor"
            v-model="filtros.setorId"
            @change="onSetorChange"
            class="filter-select"
          >
            <option value="">Todos os setores</option>
            <option v-for="s in setoresOptions" :key="s.id" :value="s.id">
              {{ s.nome }}
            </option>
          </select>
        </div>

        <div class="filter-field">
          <label for="dash-filtro-celula" class="filter-label">Célula / linha</label>
          <select
            id="dash-filtro-celula"
            v-model="filtros.celulaId"
            @change="carregarMetricas"
            class="filter-select"
          >
            <option value="">Todas as células</option>
            <option v-for="c in celulasFiltradas" :key="c.id" :value="c.id">
              {{ c.nome }}
            </option>
          </select>
        </div>

        <div class="filter-field">
          <label for="dash-filtro-modelo" class="filter-label">Modelo</label>
          <select
            id="dash-filtro-modelo"
            v-model="filtros.modeloId"
            @change="carregarMetricas"
            class="filter-select"
          >
            <option value="">Todos os modelos</option>
            <option v-for="m in modelosOptions" :key="m.id" :value="m.id">
              {{ m.nome }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Feedback de Carregamento -->
    <div v-if="isLoading" class="card status-card loading-state">
      <div class="spinner-large"></div>
      <p>Calculando indicadores e consolidando auditorias...</p>
    </div>

    <!-- Feedback de Erro com Retry -->
    <div v-else-if="error" class="card status-card error-state" role="alert">
      <i class="mdi mdi-alert-circle-outline state-icon"></i>
      <h3>Não foi possível carregar os indicadores</h3>
      <p>{{ error }}</p>
      <button type="button" class="btn-retry" @click="carregarMetricas">
        <i class="mdi mdi-reload"></i>
        <span>Tentar novamente</span>
      </button>
    </div>

    <!-- Conteúdo Principal do Dashboard -->
    <div v-else class="dashboard-content">
      <!-- Estado Vazio -->
      <div v-if="dados.resumo.totalAuditorias === 0" class="card status-card empty-state">
        <i class="mdi mdi-clipboard-text-search-outline state-icon"></i>
        <h3>Nenhuma auditoria encontrada</h3>
        <p>Não foram encontrados checklists realizados com os filtros e período informados.</p>
        <button type="button" class="btn-reset-filters" @click="limparFiltros">
          <span>Ver últimos 7 dias</span>
        </button>
      </div>

      <template v-else>
        <!-- GRID DE CARDS DE KPIS -->
        <section class="kpi-cards-grid" aria-label="Indicadores Chave de Desempenho">
          <!-- KPI 1: Conformidade Geral -->
          <div class="card kpi-card kpi-card-conformidade" :class="classeStatusConformidade(dados.resumo.conformidadeMedia)">
            <div class="kpi-header">
              <span class="kpi-title">Conformidade geral</span>
              <div class="kpi-icon-wrapper" :class="classeStatusConformidade(dados.resumo.conformidadeMedia)">
                <i class="mdi mdi-shield-check-outline"></i>
              </div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">{{ dados.resumo.conformidadeMedia }}%</span>
              <span class="kpi-badge" :class="classeStatusConformidade(dados.resumo.conformidadeMedia)">
                {{ labelStatusConformidade(dados.resumo.conformidadeMedia) }}
              </span>
            </div>
            <div class="kpi-footer">
              <span class="meta-tag">Meta: &ge; 95%</span>
              <span class="kpi-context">{{ dados.resumo.totalAuditorias }} checklists avaliados</span>
            </div>
          </div>

          <!-- KPI 2: Auditorias Concluídas -->
          <div class="card kpi-card kpi-card-auditorias">
            <div class="kpi-header">
              <span class="kpi-title">Auditorias concluídas</span>
              <div class="kpi-icon-wrapper kpi-icon-info">
                <i class="mdi mdi-clipboard-check-outline"></i>
              </div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">{{ dados.resumo.totalAuditorias }}</span>
            </div>
            <div class="kpi-footer">
              <span class="kpi-context">Checklists finalizados no período</span>
            </div>
          </div>

          <!-- KPI 3: Conformidade CTQ (Crítico para Qualidade) -->
          <div class="card kpi-card kpi-card-ctq" :class="classeStatusConformidade(dados.resumo.conformidadeCtq)">
            <div class="kpi-header">
              <span class="kpi-title">Índice crítico (CTQ)</span>
              <div class="kpi-icon-wrapper kpi-icon-ctq">
                <i class="mdi mdi-alert-decagram-outline"></i>
              </div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">{{ dados.resumo.conformidadeCtq }}%</span>
              <span class="badge-ctq-pill" title="Pontos críticos para a qualidade">
                <span class="ctq-pill-dot"></span>
                <span>CTQ</span>
              </span>
            </div>
            <div class="kpi-footer">
              <span class="kpi-context">Itens de processo de alto risco</span>
            </div>
          </div>

          <!-- KPI 4: Total de Não Conformidades -->
          <div class="card kpi-card kpi-card-nc" :class="{ 'kpi-card-nc-alert': dados.resumo.totalNaoConformidades > 0 }">
            <div class="kpi-header">
              <span class="kpi-title">Não conformidades</span>
              <div class="kpi-icon-wrapper kpi-icon-danger">
                <i class="mdi mdi-close-octagon-outline"></i>
              </div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value kpi-danger-text">{{ dados.resumo.totalNaoConformidades }}</span>
            </div>
            <div class="kpi-footer">
              <span class="kpi-context">Total de apontamentos com falha</span>
            </div>
          </div>

          <!-- KPI 5: Duração Média da Auditoria -->
          <div class="card kpi-card kpi-card-tempo">
            <div class="kpi-header">
              <span class="kpi-title">Tempo médio / inspeção</span>
              <div class="kpi-icon-wrapper kpi-icon-time">
                <i class="mdi mdi-clock-outline"></i>
              </div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">{{ dados.resumo.tempoMedioMinutos }} <small class="kpi-unit">min</small></span>
            </div>
            <div class="kpi-footer">
              <span class="kpi-context">Duração média em chão de fábrica</span>
            </div>
          </div>
        </section>

        <!-- SEÇÃO DE GRÁFICOS PRINCIPAIS (PARETO + LINHA DO TEMPO) -->
        <section class="charts-grid" aria-label="Gráficos de Análise">
          <!-- Gráfico 1: Pareto de Não Conformidades por Categoria -->
          <div class="card chart-card pareto-card">
            <div class="chart-header">
              <div class="chart-title-group">
                <div class="chart-title-row">
                  <div class="chart-icon-box icon-box-pareto">
                    <i class="mdi mdi-chart-bar"></i>
                  </div>
                  <div class="chart-title-text">
                    <h2 class="chart-title">Pareto de não conformidades por categoria</h2>
                    <p class="chart-subtitle">Identificação dos processos que mais geram desvios (Regra 80/20)</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="dados.paretoCategorias.length === 0" class="pareto-empty">
              <i class="mdi mdi-checkbox-marked-circle-outline pareto-empty-icon"></i>
              <h4>Zero não conformidades!</h4>
              <p>Todas as categorias auditadas no período obtiveram 100% de conformidade.</p>
            </div>

            <div v-else class="pareto-bars-list">
              <div
                v-for="item in dados.paretoCategorias"
                :key="item.categoria"
                class="pareto-item"
              >
                <div class="pareto-info-row">
                  <span class="pareto-category-name" :title="item.categoria">{{ item.categoria }}</span>
                  <div class="pareto-badges">
                    <span class="pareto-count">{{ item.quantidade }} {{ item.quantidade === 1 ? 'falha' : 'falhas' }} ({{ item.percentual }}%)</span>
                    <span class="pareto-acumulado" :class="{ 'acumulado-vital': item.percentualAcumulado <= 80 }">
                      Acumulado: {{ item.percentualAcumulado }}%
                    </span>
                  </div>
                </div>

                <!-- Barra de Progresso com destaque 80/20 -->
                <div class="pareto-progress-track">
                  <div
                    class="pareto-progress-fill"
                    :class="{ 'fill-vital': item.percentualAcumulado <= 80 }"
                    :style="{ width: `${item.percentual}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Gráfico 2: Evolução Diária da Conformidade (SVG Nativo) -->
          <div class="card chart-card trend-card">
            <div class="chart-header">
              <div class="chart-title-group">
                <div class="chart-title-row">
                  <div class="chart-icon-box icon-box-trend">
                    <i class="mdi mdi-chart-timeline-variant"></i>
                  </div>
                  <div class="chart-title-text">
                    <h2 class="chart-title">Evolução da conformidade diária</h2>
                    <p class="chart-subtitle">Acompanhamento contínuo da taxa de conformidade (%) ao longo do tempo</p>
                  </div>
                </div>
              </div>
              <div class="trend-legend">
                <span class="legend-item">
                  <span class="legend-line line-qualidade"></span>
                  <span>Conformidade real</span>
                </span>
                <span class="legend-item">
                  <span class="legend-line line-meta"></span>
                  <span>Meta (95%)</span>
                </span>
              </div>
            </div>

            <div v-if="dados.serieTemporal.length === 0" class="pareto-empty">
              <i class="mdi mdi-calendar-blank-outline pareto-empty-icon"></i>
              <h4>Sem dados temporais</h4>
              <p>Não há inspeções distribuídas no período selecionado.</p>
            </div>

            <div v-else class="trend-chart-container">
              <svg viewBox="0 0 600 240" class="trend-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#b1072c" stop-opacity="0.3" />
                    <stop offset="100%" stop-color="#b1072c" stop-opacity="0.0" />
                  </linearGradient>
                </defs>

                <!-- Linhas Horizontais de Grade (0%, 25%, 50%, 75%, 100%) -->
                <line x1="45" y1="20" x2="585" y2="20" class="grid-line" />
                <line x1="45" y1="65" x2="585" y2="65" class="grid-line" />
                <line x1="45" y1="110" x2="585" y2="110" class="grid-line" />
                <line x1="45" y1="155" x2="585" y2="155" class="grid-line" />
                <line x1="45" y1="200" x2="585" y2="200" class="grid-line base-line" />

                <!-- Rótulos do Eixo Y -->
                <text x="38" y="24" class="axis-text">100%</text>
                <text x="38" y="69" class="axis-text">75%</text>
                <text x="38" y="114" class="axis-text">50%</text>
                <text x="38" y="159" class="axis-text">25%</text>
                <text x="38" y="204" class="axis-text">0%</text>

                <!-- Linha Tracejada de Meta (95%) -->
                <line x1="45" y1="29" x2="585" y2="29" class="meta-line" />

                <!-- Área sob a Curva com Gradiente -->
                <polygon v-if="svgDados.areaPoints" :points="svgDados.areaPoints" fill="url(#trendGradient)" />

                <!-- Linha Principal de Conformidade -->
                <polyline
                  v-if="svgDados.polylinePoints"
                  :points="svgDados.polylinePoints"
                  class="trend-polyline"
                />

                <!-- Pontos Interativos com Círculo -->
                <g v-for="(ponto, idx) in svgDados.pontos" :key="idx">
                  <circle
                    :cx="ponto.x"
                    :cy="ponto.y"
                    r="5"
                    class="trend-point"
                    :class="{ 'point-below-target': ponto.conformidadeMedia < 95 }"
                    @mouseenter="hoverPoint = ponto"
                    @mouseleave="hoverPoint = null"
                  />
                  <!-- Rótulo do Eixo X (Data) -->
                  <text
                    :x="ponto.x"
                    y="222"
                    class="axis-x-text"
                    text-anchor="middle"
                  >
                    {{ formatarDataEixo(ponto.data) }}
                  </text>
                </g>
              </svg>

              <!-- Tooltip Interativo Flutuante -->
              <div v-if="hoverPoint" class="trend-tooltip">
                <strong>{{ formatarDataBr(hoverPoint.data) }}</strong>
                <div class="tooltip-row">
                  <span>Conformidade:</span>
                  <strong :class="hoverPoint.conformidadeMedia >= 95 ? 'text-success' : 'text-danger'">
                    {{ hoverPoint.conformidadeMedia }}%
                  </strong>
                </div>
                <div class="tooltip-row">
                  <span>Auditorias:</span>
                  <span>{{ hoverPoint.totalAuditorias }}</span>
                </div>
                <div class="tooltip-row">
                  <span>Conformidade:</span>
                  <strong :class="hoverPoint.conformidadeMedia >= 95 ? 'text-success' : 'text-danger'">
                    {{ hoverPoint.conformidadeMedia }}%
                  </strong>
                </div>
                <div class="tooltip-row">
                  <span>Auditorias:</span>
                  <span>{{ hoverPoint.totalAuditorias }}</span>
                </div>
                <div class="tooltip-row">
                  <span>Não conformes:</span>
                  <span>{{ hoverPoint.totalNC }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SEÇÃO ANALÍTICA INFERIOR (RANKING DE CÉLULAS + TOP 5 DEFEITOS) -->
        <section class="analytics-bottom-grid" aria-label="Detalhamento por Célula e Defeito">
          <!-- Bloco 1: Ranking de Conformidade por Célula -->
          <div class="card ranking-card">
            <div class="chart-header">
              <div class="chart-title-group">
                <div class="chart-title-row">
                  <div class="chart-icon-box icon-box-ranking">
                    <i class="mdi mdi-format-list-numbered"></i>
                  </div>
                  <div class="chart-title-text">
                    <h2 class="chart-title">Ranking de conformidade por célula</h2>
                    <p class="chart-subtitle">Desempenho comparativo entre as linhas auditadas no período</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="dados.rankingCelulas.length === 0" class="pareto-empty">
              <i class="mdi mdi-factory pareto-empty-icon"></i>
              <h4>Nenhuma célula com dados</h4>
              <p>Não há registros suficientes para ranqueamento.</p>
            </div>

            <div v-else class="ranking-list">
              <div
                v-for="(celula, idx) in dados.rankingCelulas"
                :key="celula.id || idx"
                class="ranking-item"
              >
                <!-- Posição no Ranking -->
                <div class="ranking-rank-box" :class="`rank-box-${idx + 1}`">
                  <span>{{ idx + 1 }}º</span>
                </div>

                <!-- Detalhes da Célula -->
                <div class="ranking-details">
                  <div class="ranking-header-row">
                    <strong class="ranking-cell-name" :title="celula.nome">{{ celula.nome }}</strong>
                    <button
                      type="button"
                      class="btn-drilldown"
                      @click="navegarParaConsultarCelula(celula)"
                      title="Ver relatórios desta célula no histórico"
                    >
                      <i class="mdi mdi-open-in-new"></i>
                      <span>Auditorias</span>
                    </button>
                  </div>

                  <div class="ranking-metrics-row">
                    <div class="ranking-tags">
                      <span class="ranking-tag" title="Total de auditorias realizadas">
                        <i class="mdi mdi-clipboard-text-outline"></i>
                        <span>{{ celula.totalAuditorias }} {{ celula.totalAuditorias === 1 ? 'auditoria' : 'auditorias' }}</span>
                      </span>
                      <span
                        class="ranking-tag"
                        :class="{ 'tag-nc-alerta': celula.totalNC > 0 }"
                        title="Total de não conformidades"
                      >
                        <i class="mdi mdi-alert-circle-outline"></i>
                        <span>{{ celula.totalNC }} {{ celula.totalNC === 1 ? 'não conf.' : 'não conf.' }}</span>
                      </span>
                    </div>

                    <div class="ranking-progress-wrap" title="Taxa de conformidade média">
                      <div class="ranking-track">
                        <div
                          class="ranking-fill"
                          :class="classeStatusConformidade(celula.conformidadeMedia)"
                          :style="{ width: `${celula.conformidadeMedia}%` }"
                        ></div>
                      </div>
                      <span
                        class="ranking-rate-badge"
                        :class="classeStatusConformidade(celula.conformidadeMedia)"
                      >
                        {{ celula.conformidadeMedia }}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bloco 2: Top 5 Defeitos Mais Recorrentes -->
          <div class="card top-defeitos-card">
            <div class="chart-header">
              <div class="chart-title-group">
                <div class="chart-title-row">
                  <div class="chart-icon-box icon-box-defeitos">
                    <i class="mdi mdi-alert-circle-outline"></i>
                  </div>
                  <div class="chart-title-text">
                    <h2 class="chart-title">Top defeitos recorrentes</h2>
                    <p class="chart-subtitle">Itens de checklist que mais apresentaram não conformidades</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="dados.topDefeitos.length === 0" class="pareto-empty">
              <i class="mdi mdi-check-decagram-outline pareto-empty-icon"></i>
              <h4>Nenhum defeito apontado!</h4>
              <p>Nenhuma não conformidade encontrada nos filtros aplicados.</p>
            </div>

            <div v-else class="top-defeitos-list">
              <div
                v-for="(defeito, idx) in dados.topDefeitos"
                :key="idx"
                class="defeito-item"
              >
                <div class="defeito-rank-box" :class="`rank-box-${idx + 1}`">
                  <span>{{ idx + 1 }}º</span>
                </div>
                <div class="defeito-details">
                  <div class="defeito-title-row">
                    <strong class="defeito-pergunta">{{ defeito.pergunta }}</strong>
                    <span v-if="defeito.ctq" class="badge-ctq-pill" title="Item crítico para a qualidade">
                      <span class="ctq-pill-dot"></span>
                      <span>CTQ</span>
                    </span>
                  </div>
                  <div class="defeito-meta-row">
                    <span class="defeito-cat-tag">
                      <i class="mdi mdi-tag-outline"></i>
                      {{ defeito.categoria }}
                    </span>
                    <span class="defeito-count-badge">
                      <strong>{{ defeito.quantidadeNC }}</strong> {{ defeito.quantidadeNC === 1 ? 'falha' : 'falhas' }}
                    </span>
                    <button
                      type="button"
                      class="btn-investigar"
                      @click="navegarParaConsultarBusca(defeito.pergunta)"
                      title="Investigar checklists com esta ocorrência"
                    >
                      <i class="mdi mdi-magnify"></i>
                      <span>Investigar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '../components/PageHeader.vue';
import api from '../services/api';
import { obterPerfilLocal } from '../services/session';

const router = useRouter();

let requisicao = null;
let desmontado = false;

const isLoading = ref(true);
const error = ref('');
const periodoSelecionado = ref('7d');
const hoverPoint = ref(null);

const setoresOptions = ref([]);
const celulasOptions = ref([]);
const modelosOptions = ref([]);

const filtros = reactive({
  dataInicio: '',
  dataFim: '',
  setorId: '',
  celulaId: '',
  modeloId: '',
});

const dados = ref({
  resumo: {
    totalAuditorias: 0,
    conformidadeMedia: 100,
    conformidadeCtq: 100,
    totalNaoConformidades: 0,
    tempoMedioMinutos: 0,
  },
  paretoCategorias: [],
  serieTemporal: [],
  rankingCelulas: [],
  topDefeitos: [],
});

const celulasFiltradas = computed(() => {
  if (!filtros.setorId) return celulasOptions.value;
  return celulasOptions.value.filter((c) => String(c.id_setor_fk ?? c.id_setor) === String(filtros.setorId));
});

const temFiltrosAtivos = computed(() => {
  return periodoSelecionado.value !== '7d'
    || Boolean(filtros.setorId)
    || Boolean(filtros.celulaId)
    || Boolean(filtros.modeloId)
    || (periodoSelecionado.value === 'custom' && (Boolean(filtros.dataInicio) || Boolean(filtros.dataFim)));
});

const classeStatusConformidade = (taxa) => {
  if (taxa >= 95) return 'status-meta-atingida';
  if (taxa >= 90) return 'status-alerta';
  return 'status-critico';
};

const labelStatusConformidade = (taxa) => {
  if (taxa >= 95) return 'Meta atingida';
  if (taxa >= 90) return 'Atenção';
  return 'Abaixo da meta';
};

const formatarDataIso = (date) => {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const formatarDataEixo = (dataStr) => {
  if (!dataStr || typeof dataStr !== 'string') return '';
  const partes = dataStr.slice(0, 10).split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}`;
  return dataStr;
};

const formatarDataBr = (dataStr) => {
  if (!dataStr || typeof dataStr !== 'string') return '';
  const partes = dataStr.slice(0, 10).split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return dataStr;
};

// Computação de Coordenadas do Gráfico SVG
const svgDados = computed(() => {
  const serie = dados.value.serieTemporal || [];
  if (!serie.length) return { pontos: [], polylinePoints: '', areaPoints: '' };

  const startX = 60;
  const endX = 570;
  const topY = 20; // 100%
  const bottomY = 200; // 0%
  const chartHeight = bottomY - topY; // 180

  const n = serie.length;
  const stepX = n > 1 ? (endX - startX) / (n - 1) : 0;

  const pontos = serie.map((item, idx) => {
    const x = n === 1 ? (startX + endX) / 2 : startX + idx * stepX;
    const taxa = Math.max(0, Math.min(100, item.conformidadeMedia || 0));
    const y = topY + ((100 - taxa) / 100) * chartHeight;
    return {
      ...item,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    };
  });

  const polylinePoints = pontos.map((p) => `${p.x},${p.y}`).join(' ');
  const firstPoint = pontos[0];
  const lastPoint = pontos[pontos.length - 1];
  const areaPoints = `${firstPoint.x},${bottomY} ${polylinePoints} ${lastPoint.x},${bottomY}`;

  return { pontos, polylinePoints, areaPoints };
});

const selecionarPeriodo = (tipo) => {
  periodoSelecionado.value = tipo;
  const hoje = new Date();

  if (tipo === 'hoje') {
    const hojeStr = formatarDataIso(hoje);
    filtros.dataInicio = hojeStr;
    filtros.dataFim = hojeStr;
  } else if (tipo === '7d') {
    const dInicio = new Date();
    dInicio.setDate(hoje.getDate() - 6);
    filtros.dataInicio = formatarDataIso(dInicio);
    filtros.dataFim = formatarDataIso(hoje);
  } else if (tipo === '30d') {
    const dInicio = new Date();
    dInicio.setDate(hoje.getDate() - 29);
    filtros.dataInicio = formatarDataIso(dInicio);
    filtros.dataFim = formatarDataIso(hoje);
  } else if (tipo === 'mes') {
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    filtros.dataInicio = formatarDataIso(primeiroDia);
    filtros.dataFim = formatarDataIso(hoje);
  } else if (tipo === 'custom') {
    // Mantém as datas atuais ou deixa para o usuário selecionar
  }

  void carregarMetricas();
};

const onSetorChange = () => {
  if (filtros.celulaId) {
    const celulaValida = celulasFiltradas.value.some((c) => String(c.id) === String(filtros.celulaId));
    if (!celulaValida) filtros.celulaId = '';
  }
  void carregarMetricas();
};

const limparFiltros = () => {
  filtros.setorId = '';
  filtros.celulaId = '';
  filtros.modeloId = '';
  selecionarPeriodo('7d');
};

const carregarOpcoesAuxiliares = async () => {
  try {
    const [resSetores, resModelos, resCelulas] = await Promise.all([
      api.get('/cadastros/setores'),
      api.get('/dados/modelos'),
      api.get('/cadastros/celulas'),
    ]);
    if (desmontado) return;
    setoresOptions.value = resSetores.data?.dados || resSetores.data || [];
    modelosOptions.value = resModelos.data?.dados || resModelos.data || [];
    celulasOptions.value = resCelulas.data?.dados || resCelulas.data || [];
  } catch (err) {
    console.error('Erro ao carregar opções de filtros:', err);
  }
};

const carregarMetricas = async () => {
  requisicao?.abort();
  const controller = new AbortController();
  requisicao = controller;
  isLoading.value = true;
  error.value = '';

  try {
    const params = {};
    if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
    if (filtros.dataFim) params.dataFim = filtros.dataFim;
    if (filtros.setorId) params.setorId = filtros.setorId;
    if (filtros.celulaId) params.celulaId = filtros.celulaId;
    if (filtros.modeloId) params.modeloId = filtros.modeloId;

    const res = await api.get('/dashboard/metricas', { params, signal: controller.signal });
    if (desmontado || controller.signal.aborted) return;

    if (res.data?.sucesso && res.data.dados) {
      dados.value = res.data.dados;
    } else {
      throw new Error(res.data?.mensagem || 'Falha ao processar dados.');
    }
  } catch (err) {
    if (desmontado || controller.signal.aborted || err?.code === 'ERR_CANCELED') return;
    console.error('Erro ao carregar métricas:', err);
    error.value = err.response?.data?.mensagem || err.message || 'Falha ao buscar indicadores do dashboard.';
  } finally {
    if (requisicao === controller) {
      requisicao = null;
      if (!desmontado) isLoading.value = false;
    }
  }
};

// Navegação Cruzada / Drill-Down
const navegarParaConsultarCelula = (celula) => {
  const query = {};
  if (celula.id && celula.id !== '0') query.celulaId = String(celula.id);
  if (filtros.setorId) query.setorId = String(filtros.setorId);
  if (filtros.modeloId) query.modeloId = String(filtros.modeloId);
  if (filtros.dataInicio) query.dataInicio = String(filtros.dataInicio);
  if (filtros.dataFim) query.dataFim = String(filtros.dataFim);
  router.push({ path: '/consultar', query });
};

const navegarParaConsultarBusca = (termo) => {
  const query = { busca: termo };
  if (filtros.setorId) query.setorId = String(filtros.setorId);
  if (filtros.celulaId) query.celulaId = String(filtros.celulaId);
  if (filtros.modeloId) query.modeloId = String(filtros.modeloId);
  if (filtros.dataInicio) query.dataInicio = String(filtros.dataInicio);
  if (filtros.dataFim) query.dataFim = String(filtros.dataFim);
  router.push({ path: '/consultar', query });
};

onMounted(async () => {
  const perfil = obterPerfilLocal();
  if (perfil?.id_setor_fk) {
    filtros.setorId = String(perfil.id_setor_fk);
  }
  if (perfil?.id_celula_fk) {
    filtros.celulaId = String(perfil.id_celula_fk);
  }

  // Define período inicial de 7 dias
  const hoje = new Date();
  const dInicio = new Date();
  dInicio.setDate(hoje.getDate() - 6);
  filtros.dataInicio = formatarDataIso(dInicio);
  filtros.dataFim = formatarDataIso(hoje);

  await carregarOpcoesAuxiliares();
  if (desmontado) return;
  await carregarMetricas();
});

onUnmounted(() => {
  desmontado = true;
  requisicao?.abort();
});
</script>

<style scoped>
/* ==========================================
   CARDS BASE E ELEVAÇÃO DE SUPERFÍCIE
   ========================================== */
.card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.dashboard-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 4rem;
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  color: var(--primary, #b1072c);
  border: 1.5px solid #cbd5e1;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.btn-refresh:hover:not(:disabled) {
  background: #fff1f2;
  border-color: #fecdd3;
  color: var(--primary, #b1072c);
  transform: translateY(-1px);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* FILTROS CARD */
.filtros-card {
  margin-bottom: 1.75rem;
  padding: 1.35rem;
  border-top: 4px solid #64748b;
}

.filtros-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding-bottom: 1.15rem;
  border-bottom: 1.5px solid #f1f5f9;
}

.periodo-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip-btn {
  background: #f8fafc;
  color: #475569;
  border: 1.5px solid #cbd5e1;
  padding: 0.45rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.chip-btn.active {
  background: var(--primary, #b1072c);
  color: #ffffff;
  border-color: var(--primary, #b1072c);
  box-shadow: 0 3px 8px rgba(177, 7, 44, 0.28);
}

.btn-limpar-filtros {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #cbd5e1;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.btn-limpar-filtros:hover {
  color: var(--primary, #b1072c);
  background: #fff1f2;
  border-color: #fecdd3;
}

.custom-dates-row {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  padding: 0.85rem 1.15rem;
  background: #f1f5f9;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  flex-wrap: wrap;
}

.date-field {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.input-date {
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  color: #0f172a;
  background: #ffffff;
  transition: border-color 0.2s ease;
}

.input-date:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
}

.filtros-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.15rem;
  margin-top: 1.15rem;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.filter-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
}

.filter-select {
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
  color: #0f172a;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.12);
}

/* ==========================================
   CARDS DE KPIS TEMÁTICOS E ELEVAÇÃO
   ========================================== */
.kpi-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.kpi-card {
  padding: 1.35rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  border-top: 4px solid #94a3b8;
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.04);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  position: relative;
  background: #ffffff;
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px -3px rgba(15, 23, 42, 0.09), 0 4px 6px -2px rgba(15, 23, 42, 0.04);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.85rem;
}

.kpi-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
}

.kpi-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  background: #f1f5f9;
  color: #475569;
  flex-shrink: 0;
}

.kpi-icon-info {
  background: #eff6ff;
  color: #2563eb;
}

.kpi-icon-ctq {
  background: #fff1f2;
  color: var(--primary, #b1072c);
}

.kpi-icon-danger {
  background: #fef2f2;
  color: #dc2626;
}

.kpi-icon-time {
  background: #f5f3ff;
  color: #7c3aed;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}

.kpi-value {
  font-size: 2.15rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  letter-spacing: -0.5px;
}

.kpi-unit {
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
}

.kpi-danger-text {
  color: #dc2626;
}

.kpi-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
}

.badge-ctq-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0.22rem 0.65rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: #fff1f2;
  color: var(--primary, #b1072c);
  border: 1px solid #fecdd3;
}

.ctq-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary, #b1072c);
  animation: pulse-dot 1.8s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
}

.kpi-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: #64748b;
  border-top: 1px solid #f1f5f9;
  padding-top: 0.65rem;
}

.meta-tag {
  font-weight: 700;
  color: #334155;
}

/* Temas Individuais de Borda e Acentos de KPI */
.kpi-card-conformidade.status-meta-atingida {
  border-top-color: #10b981;
}
.kpi-card-conformidade.status-alerta {
  border-top-color: #f59e0b;
}
.kpi-card-conformidade.status-critico {
  border-top-color: #ef4444;
}

.status-meta-atingida .kpi-icon-wrapper {
  background: #ecfdf5;
  color: #059669;
}
.status-meta-atingida.kpi-badge {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.status-alerta .kpi-icon-wrapper {
  background: #fffbeb;
  color: #d97706;
}
.status-alerta.kpi-badge {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.status-critico .kpi-icon-wrapper {
  background: #fef2f2;
  color: #dc2626;
}
.status-critico.kpi-badge {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecdd3;
}

.kpi-card-auditorias {
  border-top-color: #2563eb;
}

.kpi-card-ctq {
  border-top-color: var(--primary, #b1072c);
}
.kpi-card-ctq.status-meta-atingida {
  border-top-color: #10b981;
}
.kpi-card-ctq.status-alerta {
  border-top-color: #f59e0b;
}
.kpi-card-ctq.status-critico {
  border-top-color: var(--primary, #b1072c);
}

.kpi-card-nc {
  border-top-color: #cbd5e1;
}
.kpi-card-nc.kpi-card-nc-alert {
  border-top-color: #dc2626;
}

.kpi-card-tempo {
  border-top-color: #7c3aed;
}

/* ==========================================
   SEÇÃO DE GRÁFICOS (GRID 2 COLUNAS)
   ========================================== */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
}

.pareto-card {
  border-top: 4px solid var(--primary, #b1072c);
}

.trend-card {
  border-top: 4px solid #2563eb;
}

.chart-header {
  background: #ffffff;
  padding: 1.25rem 1.35rem;
  border-bottom: 1.5px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.chart-title-group {
  display: flex;
  flex-direction: column;
}

.chart-title-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.chart-title-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.chart-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  flex-shrink: 0;
}

.icon-box-pareto {
  background: #fff1f2;
  color: var(--primary, #b1072c);
  border: 1px solid #fecdd3;
}

.icon-box-trend {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #dbeafe;
}

.icon-box-ranking {
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fde68a;
}

.icon-box-defeitos {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecdd3;
}

.chart-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.3;
}

.chart-subtitle {
  font-size: 0.82rem;
  color: #64748b;
  margin: 0;
}

/* ==========================================
   PARETO BARS
   ========================================== */
.pareto-bars-list {
  padding: 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.pareto-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.pareto-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.pareto-category-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pareto-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.pareto-count {
  font-weight: 600;
  color: #475569;
}

.pareto-acumulado {
  background: #f1f5f9;
  color: #475569;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.75rem;
  border: 1px solid #e2e8f0;
}

.pareto-acumulado.acumulado-vital {
  background: #fff1f2;
  color: var(--primary, #b1072c);
  border-color: #fecdd3;
  font-weight: 700;
}

.pareto-progress-track {
  width: 100%;
  height: 10px;
  background: #e2e8f0;
  border-radius: 5px;
  overflow: hidden;
}

.pareto-progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 5px;
  transition: width 0.4s ease;
}

.pareto-progress-fill.fill-vital {
  background: var(--primary, #b1072c);
}

.pareto-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1.5rem;
}

.pareto-empty-icon {
  font-size: 3.5rem;
  color: #10b981;
  margin-bottom: 0.75rem;
}

.pareto-empty h4 {
  color: #065f46;
  margin-bottom: 0.25rem;
}

.pareto-empty p {
  color: #64748b;
  font-size: 0.9rem;
}

/* ==========================================
   LINHA DO TEMPO (SVG TREND)
   ========================================== */
.trend-legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.78rem;
  color: #475569;
  font-weight: 600;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.legend-line {
  width: 20px;
  height: 3px;
  border-radius: 2px;
}

.line-qualidade {
  background: var(--primary, #b1072c);
}

.line-meta {
  background: #059669;
  border-top: 2px dashed #059669;
  height: 0;
}

.trend-chart-container {
  position: relative;
  width: 100%;
  height: 240px;
  padding: 1.25rem 1.35rem 1rem;
  box-sizing: border-box;
}

.trend-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.grid-line {
  stroke: #e2e8f0;
  stroke-width: 1;
  stroke-dasharray: 2, 4;
}

.base-line {
  stroke: #cbd5e1;
  stroke-width: 1.5;
  stroke-dasharray: none;
}

.meta-line {
  stroke: #059669;
  stroke-width: 1.8;
  stroke-dasharray: 5, 4;
}

.axis-text {
  font-size: 10px;
  fill: #64748b;
  text-anchor: end;
  font-family: inherit;
  font-weight: 600;
}

.axis-x-text {
  font-size: 10px;
  fill: #475569;
  font-weight: 600;
  font-family: inherit;
}

.trend-polyline {
  fill: none;
  stroke: var(--primary, #b1072c);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-point {
  fill: #ffffff;
  stroke: var(--primary, #b1072c);
  stroke-width: 2.5;
  cursor: pointer;
  transition: r 0.15s ease, stroke-width 0.15s ease;
}

.trend-point:hover {
  r: 7.5;
  stroke-width: 3.5;
}

.point-below-target {
  stroke: #dc2626;
  fill: #fef2f2;
}

.trend-tooltip {
  position: absolute;
  top: 15px;
  right: 20px;
  background: #0f172a;
  color: #f8fafc;
  padding: 0.65rem 0.95rem;
  border-radius: 8px;
  font-size: 0.8rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  z-index: 10;
  border: 1px solid #334155;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
}

.text-success {
  color: #34d399;
}

.text-danger {
  color: #f87171;
}

.fw-bold {
  font-weight: 700;
}

/* ==========================================
   SEÇÃO ANALÍTICA INFERIOR (GRID 2 COLUNAS)
   ========================================== */
.analytics-bottom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
  gap: 1.5rem;
}

.ranking-card,
.top-defeitos-card {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
}

.ranking-card {
  border-top: 4px solid #d97706;
}

.top-defeitos-card {
  border-top: 4px solid #dc2626;
}

/* ==========================================
   RANKING DE CÉLULAS (LEADERBOARD MODERNO)
   ========================================== */
.ranking-list {
  padding: 1.25rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-height: 520px;
  overflow-y: auto;
}

.ranking-list::-webkit-scrollbar {
  width: 6px;
}

.ranking-list::-webkit-scrollbar-track {
  background: transparent;
}

.ranking-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.ranking-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1.1rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.ranking-item:hover {
  transform: translateX(3px);
  border-color: #cbd5e1;
  box-shadow: 0 4px 8px rgba(15, 23, 42, 0.06);
}

.ranking-rank-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.88rem;
  font-weight: 800;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.ranking-rank-box.rank-box-1 {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
  border-color: #fcd34d;
  box-shadow: 0 2px 4px rgba(180, 83, 9, 0.15);
}

.ranking-rank-box.rank-box-2 {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  color: #334155;
  border-color: #cbd5e1;
}

.ranking-rank-box.rank-box-3 {
  background: linear-gradient(135deg, #ffedd5, #fed7aa);
  color: #9a3412;
  border-color: #fdba74;
}

.ranking-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.ranking-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.ranking-cell-name {
  font-size: 0.95rem;
  color: var(--text-primary, #0f172a);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking-metrics-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ranking-tags {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.ranking-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.ranking-tag.tag-nc-alerta {
  background: #fef2f2;
  border-color: #fecdd3;
  color: #dc2626;
  font-weight: 700;
}

.ranking-progress-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 140px;
}

.ranking-track {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.ranking-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.ranking-fill.status-meta-atingida {
  background: #10b981;
}

.ranking-fill.status-alerta {
  background: #f59e0b;
}

.ranking-fill.status-critico {
  background: #ef4444;
}

.ranking-rate-badge {
  font-size: 0.84rem;
  font-weight: 800;
  min-width: 44px;
  text-align: right;
}

.ranking-rate-badge.status-meta-atingida {
  color: #059669;
}

.ranking-rate-badge.status-alerta {
  color: #d97706;
}

.ranking-rate-badge.status-critico {
  color: #dc2626;
}

.btn-drilldown {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-drilldown:hover {
  background: #fff1f2;
  border-color: #fca5a5;
  color: var(--primary, #b1072c);
  transform: translateY(-1px);
}

/* ==========================================
   TOP DEFEITOS LIST
   ========================================== */
.top-defeitos-list {
  padding: 1.25rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.defeito-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.85rem 1.1rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.defeito-item:hover {
  transform: translateX(3px);
  border-color: #cbd5e1;
  box-shadow: 0 4px 8px rgba(15, 23, 42, 0.06);
}

.defeito-rank-box {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.88rem;
  font-weight: 800;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.rank-box-1 {
  background: #fee2e2;
  color: #b1072c;
  border-color: #fecdd3;
}

.rank-box-2 {
  background: #ffedd5;
  color: #c2410c;
  border-color: #fed7aa;
}

.rank-box-3 {
  background: #fef3c7;
  color: #b45309;
  border-color: #fde68a;
}

.defeito-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.defeito-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.defeito-pergunta {
  font-size: 0.92rem;
  color: #0f172a;
  font-weight: 700;
}

.defeito-meta-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
}

.defeito-cat-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-weight: 600;
}

.defeito-count-badge {
  background: #fff1f2;
  color: #b1072c;
  border: 1px solid #fecdd3;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
}

.btn-investigar {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.btn-investigar:hover {
  background: #fff1f2;
  border-color: #fca5a5;
  color: var(--primary, #b1072c);
}

/* ==========================================
   FEEDBACK STATES
   ========================================== */
.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1.5rem;
  margin-top: 1.5rem;
}

.state-icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.loading-state p {
  color: #64748b;
  font-weight: 500;
  margin-top: 1rem;
}

.spinner-large {
  width: 44px;
  height: 44px;
  border: 4px solid #f1f5f9;
  border-top-color: var(--primary, #b1072c);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.error-state .state-icon {
  color: #ef4444;
}

.error-state h3 {
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.error-state p {
  color: #64748b;
  margin-bottom: 1.25rem;
  max-width: 480px;
}

.btn-retry,
.btn-reset-filters {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--primary, #b1072c);
  color: white;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-retry:hover,
.btn-reset-filters:hover {
  background: #990525;
}

.empty-state .state-icon {
  color: #94a3b8;
}

.empty-state h3 {
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #64748b;
  margin-bottom: 1.25rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .filtros-header {
    flex-direction: column;
    align-items: stretch;
  }
  .periodo-chips {
    justify-content: flex-start;
  }
  .filtros-grid {
    grid-template-columns: 1fr;
  }
  .charts-grid {
    grid-template-columns: 1fr;
  }
  .analytics-bottom-grid {
    grid-template-columns: 1fr;
  }
  .btn-investigar {
    margin-left: 0;
  }
}
</style>
