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
            <svg class="donut-chart" viewBox="0 0 120 120" role="img" aria-label="Distribuição de conformidade">
              <circle class="donut-track" cx="60" cy="60" r="42" pathLength="100" />
              <circle
                v-for="segmento in segmentosGrafico"
                :key="segmento.nome"
                class="donut-segment"
                cx="60"
                cy="60"
                r="42"
                pathLength="100"
                :stroke="segmento.cor"
                :stroke-dasharray="`${segmento.percentual} ${100 - segmento.percentual}`"
                :stroke-dashoffset="-segmento.inicio"
              >
                <title>{{ segmento.nome }}: {{ segmento.total }} ({{ segmento.percentual.toFixed(1) }}%)</title>
              </circle>
            </svg>
            <div class="chart-legend">
              <span v-for="segmento in segmentosGrafico" :key="segmento.nome" class="legend-item">
                <i :style="{ backgroundColor: segmento.cor }"></i>
                {{ segmento.nome }}: {{ segmento.total }}
              </span>
            </div>
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
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import PageHeader from '../components/PageHeader.vue';
import FeedbackState from '../components/FeedbackState.vue';
import { formatarDataHora } from '../services/formatters';

const route = useRoute();
const isLoading = ref(true);
const error = ref(null);
const relatorio = ref(null);

const segmentosGrafico = computed(() => {
  const dados = relatorio.value?.dadosGrafico?.slice(1) || [];
  const totalGeral = dados.reduce((soma, item) => soma + Number(item[1] || 0), 0);
  let inicio = 0;
  return dados.map(([nome, total, cor]) => {
    const percentual = totalGeral ? (Number(total) / totalGeral) * 100 : 0;
    const segmento = { nome, total: Number(total), cor: cor || '#94a3b8', percentual, inicio };
    inicio += percentual;
    return segmento;
  });
});

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

};

onMounted(buscarDados);
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.donut-chart {
  width: min(100%, 300px);
  min-height: 0;
  transform: rotate(-90deg);
}

.donut-track,
.donut-segment {
  fill: none;
  stroke-width: 20;
}

.donut-track { stroke: #f1f5f9; }
.donut-segment { transition: opacity 0.2s; }
.donut-segment:hover { opacity: 0.8; }

.chart-legend {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.legend-item i {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
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
  .scorecard { padding: 1rem; }
  .chart-container { height: 300px; }
}
</style>
