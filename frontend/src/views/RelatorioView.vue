<template>
  <div class="page-container">
    <FeedbackState
      v-if="isLoading"
      type="loading"
      message="Gerando insights e indicadores do relatório..."
    />

    <FeedbackState
      v-else-if="error"
      type="error"
      title="Ocorreu um erro ao carregar o relatório"
      :message="error"
      :show-retry="true"
      @retry="buscarDados"
    />

    <div v-else-if="relatorio" class="relatorio-content slide-in">
      <PageHeader
        title="Resumo da Auditoria"
        :subtitle="`Modelo: ${relatorio.info.nome_modelo} | Responsável: ${relatorio.info.nome_usuario}`"
        icon="mdi mdi-file-check-outline"
      >
        <template #actions>
          <router-link :to="`/detalhe/${$route.params.id}`" class="btn-primary">
            <i class="mdi mdi-text-box-search-outline"></i>
            <span>Ver Documento Completo</span>
          </router-link>
          <router-link to="/selecao" class="btn-outline">
            <i class="mdi mdi-plus"></i>
            <span>Nova Auditoria</span>
          </router-link>
        </template>
      </PageHeader>

      <section class="metadata-grid">
        <div class="meta-card">
          <span class="meta-label">Modelo / Processo</span>
          <span class="meta-value">{{ relatorio.info.nome_modelo }}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Linha / Célula</span>
          <span class="meta-value">{{ relatorio.info.nome_celula || 'Não informada' }}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Setor</span>
          <span class="meta-value">{{ relatorio.info.nome_setor || 'Não informado' }}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Responsável</span>
          <span class="meta-value">{{ relatorio.info.nome_usuario }}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Data e Hora</span>
          <span class="meta-value">{{ formatarDataHora(relatorio.info.data_envio) }}</span>
        </div>
      </section>

      <main class="main-visual-content">
        <div class="chart-card">
          <h3 class="card-title">Distribuição de Conformidade</h3>
          <div class="chart-container">
            <div id="graficoRelatorio" style="width: 100%; height: 380px;"></div>
          </div>
        </div>

        <div class="score-column">
          <div class="scorecard" :class="pontuacao.classe">
            <span class="score-label">Índice de Qualidade</span>
            <span class="score-value">{{ pontuacao.texto }}</span>
            <div class="score-bar-bg">
              <div class="score-bar-fg" :style="{ width: pontuacao.texto }"></div>
            </div>
            <p class="score-details">{{ pontuacao.detalhes }}</p>
            <div class="status-indicator">
              <i class="mdi" :class="pontuacao.score >= 70 ? 'mdi-check-decagram' : 'mdi-alert-decagram'"></i>
              <span>{{ pontuacao.score >= 90 ? 'Excelente' : (pontuacao.score >= 70 ? 'Dentro do Padrão' : 'Abaixo do Esperado') }}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import PageHeader from '../components/PageHeader.vue';
import FeedbackState from '../components/FeedbackState.vue';
import { formatarDataHora } from '../services/formatters';

// 📌 Tree-shaking do ECharts para otimização de performance e redução de bundle
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, DatasetComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([PieChart, TooltipComponent, LegendComponent, DatasetComponent, CanvasRenderer]);

const route = useRoute();
const isLoading = ref(true);
const error = ref(null);
const relatorio = ref(null);
let chartInstance = null;
const redimensionarGrafico = () => chartInstance?.resize();

const pontuacao = computed(() => {
  if (!relatorio.value || !relatorio.value.dadosGrafico) {
    return { texto: 'N/A', score: 0, classe: '', detalhes: '' };
  }
  const dados = relatorio.value.dadosGrafico.slice(1);
  let totalConforme = 0;
  let totalCategorias = 0;
  
  dados.forEach(item => {
    const [status, total] = item;
    if (status === 'Conforme' || status === 'N/A') totalConforme += total;
    totalCategorias += total;
  });
  
  if (totalCategorias === 0) return { texto: 'N/A', score: 0, classe: '', detalhes: 'Nenhuma categoria avaliada.' };

  const score = Math.round((totalConforme / totalCategorias) * 100);
  let classe = score >= 90 ? 'otimo' : (score >= 70 ? 'bom' : 'ruim');
  
  return {
    texto: `${score}%`,
    score: score,
    classe: classe,
    detalhes: `${totalConforme} de ${totalCategorias} conformes.`
  };
});

const buscarDados = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const relatorioId = route.params.id;
    const resRelatorio = await api.get(`/relatorios/${relatorioId}`);

    if (resRelatorio.data.sucesso) {
      relatorio.value = resRelatorio.data;
    } else {
      error.value = resRelatorio.data.mensagem;
    }
  } catch (err) {
    error.value = 'Falha ao carregar os dados do relatório.';
    console.error(err);
  } finally {
    isLoading.value = false;
  }

  await nextTick();
  if (relatorio.value && relatorio.value.sucesso) {
    inicializarGrafico(relatorio.value.dadosGrafico);
  }
};

const inicializarGrafico = (datasetSource) => {
  const chartDom = document.getElementById('graficoRelatorio');
  if (!chartDom) return;

  chartInstance?.dispose();
  chartInstance = echarts.init(chartDom);
  const legendas = datasetSource.slice(1).map(item => item[0]);

  const option = {
    legend: { data: legendas, top: 'bottom' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    dataset: { source: datasetSource },
    series: [{
      name: 'Status por Categoria',
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      label: { show: false },
      itemStyle: {
        color: (params) => params.value[2],
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 3
      },
      encode: { itemName: 'status', value: 'total' }
    }]
  };
  
  chartInstance.setOption(option);
  window.removeEventListener('resize', redimensionarGrafico);
  window.addEventListener('resize', redimensionarGrafico);
};

onMounted(buscarDados);
onUnmounted(() => {
  window.removeEventListener('resize', redimensionarGrafico);
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.btn-primary {
  background: var(--primary, #b1072c);
  color: white;
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  min-height: 42px;
}

.btn-primary:hover {
  background: var(--primary-hover, #8f0523);
}

.btn-outline {
  background: white;
  border: 1.5px solid #cbd5e1;
  color: #475569;
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  min-height: 42px;
}

.btn-outline:hover {
  background: #f1f5f9;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.meta-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.meta-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.meta-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* ==========================================
   VISUALIZAÇÃO (GRÁFICO + SCORE)
   ========================================== */
.main-visual-content {
  display: flex;
  gap: 2rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}

.chart-card {
  flex: 2;
  min-width: 350px;
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.card-title {
  margin-top: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
  border-left: 4px solid var(--primary);
  padding-left: 10px;
}

.chart-container {
  height: 400px;
}

.score-column {
  flex: 1;
  min-width: 300px;
  max-height: 424px;
}

.scorecard {
  background: white;
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  text-align: center;
  border-top: 8px solid;
  box-shadow: var(--shadow-md);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.scorecard.otimo {
  border-color: var(--success);
}

.scorecard.bom {
  border-color: #f59e0b;
}

.scorecard.ruim {
  border-color: var(--danger);
}

.score-label {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 1.1rem;
}

.score-value {
  font-size: 5rem;
  font-weight: 900;
  color: var(--text-primary);
  line-height: 1;
  margin: 1rem 0;
}

.score-bar-bg {
  height: 12px;
  background: #f1f5f9;
  border-radius: 10px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.score-bar-fg {
  height: 100%;
  transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scorecard.otimo .score-bar-fg {
  background: var(--success);
}

.scorecard.bom .score-bar-fg {
  background: #f59e0b;
}
.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.meta-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.meta-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.meta-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* ==========================================
   VISUALIZAÇÃO (GRÁFICO + SCORE)
   ========================================== */
.main-visual-content {
  display: flex;
  gap: 2rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}

.chart-card {
  flex: 2;
  min-width: 350px;
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.card-title {
  margin-top: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
  border-left: 4px solid var(--primary);
  padding-left: 10px;
}

.chart-container {
  height: 400px;
}

.score-column {
  flex: 1;
  min-width: 300px;
  max-height: 424px;
}

.scorecard {
  background: white;
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  text-align: center;
  border-top: 8px solid;
  box-shadow: var(--shadow-md);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.scorecard.otimo {
  border-color: var(--success);
}

.scorecard.bom {
  border-color: #f59e0b;
}

.scorecard.ruim {
  border-color: var(--danger);
}

.score-label {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 1.1rem;
}

.score-value {
  font-size: 5rem;
  font-weight: 900;
  color: var(--text-primary);
  line-height: 1;
  margin: 1rem 0;
}

.score-bar-bg {
  height: 12px;
  background: #f1f5f9;
  border-radius: 10px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.score-bar-fg {
  height: 100%;
  transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scorecard.otimo .score-bar-fg {
  background: var(--success);
}

.scorecard.bom .score-bar-fg {
  background: #f59e0b;
}

.scorecard.ruim .score-bar-fg {
  background: var(--danger);
}

.status-indicator {
  margin-top: 1.5rem;
  font-weight: 800;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.scorecard.otimo .status-indicator {
  color: var(--success);
}

.scorecard.bom .status-indicator {
  color: #d97706;
}

.scorecard.ruim .status-indicator {
  color: var(--danger);
}

/* ==========================================
   TOP NÃO CONFORMIDADES (MODERNO)
   ========================================== */
.top-nao-conforme-section {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  margin-bottom: 3rem;
}

.section-header {
  margin-bottom: 2rem;
}

.section-header h2 {
  color: #b91c1c;
  margin: 0;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-header p {
  color: var(--text-secondary);
  margin: 5px 0 0 0;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.top-item-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem;
  background: #fff5f5;
  border-radius: 12px;
  border-left: 5px solid #ef4444;
  min-width: 0;
  box-sizing: border-box;
}

.rank-number {
  width: 40px;
  font-size: 1.5rem;
  font-weight: 900;
  color: #ef4444;
  opacity: 0.5;
  flex-shrink: 0;
}

.item-body {
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: break-word;
}

.item-tag {
  font-size: 0.75rem;
  font-weight: 800;
  color: #b91c1c;
  text-transform: uppercase;
  background: #fee2e2;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.item-desc {
  margin: 5px 0 0 0;
  font-weight: 600;
  color: var(--text-primary);
  overflow-wrap: break-word;
  word-break: break-word;
}

.item-stats {
  text-align: center;
  min-width: 80px;
  flex-shrink: 0;
}

.count-val {
  display: block;
  font-size: 1.8rem;
  font-weight: 900;
  color: #ef4444;
  line-height: 1;
}

.count-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #b91c1c;
  text-transform: uppercase;
}

/* ==========================================
   FOOTER
   ========================================== */
.report-footer {
  text-align: center;
  margin-top: 2rem;
}

.btn-outline {
  background: white;
  border: 2px solid var(--border-color);
  padding: 0.8rem 2rem;
  border-radius: 8px;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: #eff6ff;
}

/* ==========================================
   ANIMATIONS
   ========================================== */
.slide-in {
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border-left-color: var(--primary);
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .page-container { padding: 1rem; }
  .header-main-info { align-items: stretch; }
  .header-main-info h1 { font-size: 1.5rem; }
  .email-badge { justify-content: center; width: 100%; }
  .score-value {
    font-size: 3.5rem;
  }

  .main-visual-content {
    flex-direction: column;
  }

  .metadata-grid {
    grid-template-columns: 1fr;
  }

  .chart-card, .score-column { min-width: 0; width: 100%; }
  .chart-card { padding: 1rem; }
  .scorecard, .top-nao-conforme-section { padding: 1rem; }
  .chart-container { height: 300px; }
  .top-item-card { align-items: flex-start; gap: 0.75rem; }
  .item-stats { min-width: 0; }
}
</style>
