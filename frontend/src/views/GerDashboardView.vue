<template>
  <div class="dashboard-root">
    
    <header class="dashboard-header">
      <div class="header-title">
        <h1>📊 Dashboard Liderança</h1>
        <span class="last-update">Atualizado em: {{ dataAtual }}</span>
      </div>
      
      <div class="filters-container">
        <select v-model="filtros.funcao" class="filter-input">
          <option value="">Todas as Funções</option>
          <option value="Lider">Líder</option>
          <option value="Supervisor">Supervisor</option>
        </select>

        <select v-model="filtros.marca" class="filter-input">
          <option value="">Todas as Marcas</option>
          <option value="ADIDAS">ADIDAS</option>
          <option value="OUTRAS">OUTRAS</option>
        </select>

        <select v-model="filtros.ano" class="filter-input">
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>

        <input type="date" v-model="filtros.dataInicio" class="filter-input" title="Data Inicial">
        <input type="date" v-model="filtros.dataFim" class="filter-input" title="Data Final">

        <button @click="carregarDados" class="btn-filtrar" :disabled="isLoading">
          {{ isLoading ? '⏳' : '🔍 Filtrar' }}
        </button>
      </div>
    </header>

    <nav class="tabs-menu">
      <button :class="{ active: abaAtual === 'acuracidade' }" @click="abaAtual = 'acuracidade'">1. Visão de Acuracidade</button>
      <button :class="{ active: abaAtual === 'detalhes' }" @click="abaAtual = 'detalhes'">2. Detalhes de Checklists</button>
      <button :class="{ active: abaAtual === 'lideres' }" @click="abaAtual = 'lideres'">3. Gestão de Líderes</button>
    </nav>

    <div v-if="isLoading" class="loading-overlay">Carregando dados...</div>
    <div v-if="error" class="error-banner">{{ error }}</div>

    <main v-if="!isLoading && dados && abaAtual === 'acuracidade'" class="tab-content">
      
      <section class="kpi-grid">
        <div class="kpi-card"><span>Acuracidade Geral</span><strong>{{ dados.kpis.acuracidadeGeral }}%</strong></div>
        <div class="kpi-card"><span>Qtd Check List</span><strong>{{ dados.kpis.qtdChecklist }}</strong></div>
        <div class="kpi-card"><span>Itens - Totais</span><strong>{{ dados.kpis.itensTotais }}</strong></div>
        <div class="kpi-card"><span>Itens - Conforme</span><strong>{{ dados.kpis.itensConforme }}</strong></div>
        <div class="kpi-card error-kpi"><span>Itens - Não Conforme</span><strong>{{ dados.kpis.itensNaoConforme }}</strong></div>
        <div class="kpi-card"><span>Operação - Total</span><strong>{{ dados.kpis.opTotal }}</strong></div>
        <div class="kpi-card"><span>Operação - Conforme</span><strong>{{ dados.kpis.opConforme }}</strong></div>
        <div class="kpi-card error-kpi"><span>Operação - Não Conforme</span><strong>{{ dados.kpis.opNaoConforme }}</strong></div>
      </section>

      <section class="horizontal-charts-grid">
        <div class="chart-box">
          <h3>Acuracidade de Líderes Dia Anterior</h3>
          <div id="chartLideres" class="echart-container"></div>
        </div>
        <div class="chart-box">
          <h3>Acuracidade de Setores</h3>
          <div id="chartSetores" class="echart-container"></div>
        </div>
        <div class="chart-box">
          <h3>Acuracidade Modelos</h3>
          <div id="chartModelos" class="echart-container"></div>
        </div>
      </section>

      <section class="bottom-grid">
        <div class="chart-box heatmap-box">
          <h3>Top 03 por Pergunta - Não Conforme</h3>
          <table class="heatmap-table">
            <tr v-for="(item, index) in dados.topPerguntas" :key="index">
              <td class="brand-cell">{{ item.marca }}</td>
              <td class="question-cell">{{ item.pergunta }}</td>
              <td class="value-cell" :style="{ backgroundColor: getHeatmapColor(item.valor, 150) }">{{ item.valor }}</td>
            </tr>
          </table>
        </div>

        <div class="chart-box heatmap-box">
          <h3>Top 03 Operação - Não Conforme</h3>
          <table class="heatmap-table">
            <tr v-for="(item, index) in dados.topOperacoes" :key="index">
              <td class="brand-cell">{{ item.marca }}</td>
              <td class="question-cell">{{ item.operacao }}</td>
              <td class="value-cell" :style="{ backgroundColor: getHeatmapColor(item.valor, 150) }">{{ item.valor }}</td>
            </tr>
          </table>
        </div>

        <div class="chart-box">
          <h3>Acuracidade Mês Corrente</h3>
          <div id="chartTendencia" class="echart-container"></div>
        </div>
      </section>

    </main>

    <main v-if="!isLoading && abaAtual === 'detalhes'" class="tab-content">
      <div class="chart-box">
        <h3>Detalhamento dos Checklists</h3>
        <p>Aqui você pode implementar uma Tabela (Grid) com paginação usando os filtros selecionados no topo.</p>
      </div>
    </main>

    <main v-if="!isLoading && abaAtual === 'lideres'" class="tab-content">
      <div class="chart-box">
        <h3>Painel de Acompanhamento de Líderes</h3>
        <p>Aqui você mostrará quem fez e quem não fez o checklist, última interação, etc.</p>
      </div>
    </main>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch, getCurrentInstance } from 'vue';
import axios from 'axios';
import * as echarts from 'echarts';

const { proxy } = getCurrentInstance();
const apiUrl = proxy.$apiUrl;

// ESTADOS
const isLoading = ref(true);
const error = ref(null);
const abaAtual = ref('acuracidade');
const dados = ref(null);
const dataAtual = new Date().toLocaleString('pt-BR');

// FILTROS
const filtros = reactive({
  funcao: 'Lider',
  marca: 'ADIDAS',
  ano: '2026',
  dataInicio: '',
  dataFim: ''
});

// INSTÂNCIAS DOS GRÁFICOS (para poder redimensionar/destruir depois)
let echartLideres, echartSetores, echartModelos, echartTendencia;

// FUNÇÃO DE BUSCA NO BACKEND
const carregarDados = async () => {
  isLoading.value = true;
  error.value = null;
  const token = localStorage.getItem('token');
  
  try {
    // Você vai enviar os filtros via Query Params ou Body
    /* Exemplo real:
    const res = await axios.post(`${apiUrl}/api/dashboard/acuracidade`, filtros, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    dados.value = res.data.dados;
    */

    // MOCK: Dados simulados para você ver o layout funcionando antes do backend estar pronto
    await new Promise(r => setTimeout(r, 500)); // Simula delay de rede
    dados.value = {
      kpis: {
        acuracidadeGeral: 80.8, qtdChecklist: 8, itensTotais: 358, itensConforme: 334,
        itensNaoConforme: 24, opTotal: 358, opConforme: 101, opNaoConforme: 24
      },
      topPerguntas: [
        { marca: 'Adizero', pergunta: 'O operador está colando a sola seguindo o risco?', valor: 103 },
        { marca: 'Adizero', pergunta: 'Há fios de linha?', valor: 96 },
        { marca: 'Superstar II', pergunta: 'A planta está sendo feita corretamente?', valor: 27 }
      ],
      topOperacoes: [
        { marca: 'Adizero', operacao: 'Overlock', valor: 143 },
        { marca: 'Adizero', operacao: 'Colagem', valor: 104 },
        { marca: 'Superstar II', operacao: 'Fazer a planta (bico)', valor: 33 }
      ]
    };

    if (abaAtual.value === 'acuracidade') {
      await nextTick();
      renderizarGraficos();
    }
  } catch (err) {
    error.value = "Falha ao carregar dados do dashboard.";
  } finally {
    isLoading.value = false;
  }
};

// VIGIA A TROCA DE ABAS PARA RENDERIZAR OS GRÁFICOS
watch(abaAtual, async (novaAba) => {
  if (novaAba === 'acuracidade' && dados.value) {
    await nextTick();
    renderizarGraficos();
  }
});

// CALCULA COR DA TABELA DE CALOR (Tom de Vermelho)
const getHeatmapColor = (valor, maximo) => {
  const intensidade = Math.min(valor / maximo, 1);
  return `rgba(217, 83, 79, ${intensidade})`; // Vermelho Tableau
};

// RENDERIZAÇÃO DOS ECHARTS
const renderizarGraficos = () => {
  // Configuração padrão de barras horizontais do ECharts
  const configBarrasHorizontais = (categorias, valores) => ({
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: { type: 'value', max: 100, splitLine: { show: false }, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: categorias, axisTick: { show: false }, axisLine: { show: false } },
    series: [{
      type: 'bar',
      data: valores,
      itemStyle: { color: '#8fbce6' }, // Azul estilo Tableau
      label: { show: true, position: 'right', formatter: '{c}%', color: '#333' }
    }]
  });

  // 1. Gráfico Líderes
  const domLideres = document.getElementById('chartLideres');
  if (domLideres) {
    echartLideres = echarts.init(domLideres);
    echartLideres.setOption(configBarrasHorizontais(
      ['Silvio', 'Sheila', 'Railton', 'Paulo', 'Luiz', 'Henrique'],
      [0, 0, 100, 87.5, 92.9, 0]
    ));
  }

  // 2. Gráfico Setores
  const domSetores = document.getElementById('chartSetores');
  if (domSetores) {
    echartSetores = echarts.init(domSetores);
    echartSetores.setOption(configBarrasHorizontais(
      ['Montagem 2614', 'Montagem 2514', 'Montagem 2414', 'Montagem 2314'],
      [86.7, 93.3, 84.6, 95.5]
    ));
  }

  // 3. Gráfico Modelos
  const domModelos = document.getElementById('chartModelos');
  if (domModelos) {
    echartModelos = echarts.init(domModelos);
    echartModelos.setOption(configBarrasHorizontais(
      ['Superstar II', 'STREETALK', 'ADIZERO', 'Grand Court'],
      [87.5, 87.5, 87.5, 86.7]
    ));
  }

  // 4. Gráfico Linha de Tendência
  const domTendencia = document.getElementById('chartTendencia');
  if (domTendencia) {
    echartTendencia = echarts.init(domTendencia);
    echartTendencia.setOption({
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: ['18/Fev', '19/Fev', '20/Fev', '23/Fev', '24/Fev', '25/Fev', '26/Fev'] },
      yAxis: { type: 'value', min: 50, max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        data: [71.1, 65.1, 78.2, 80.5, 83.8, 83.2, 80.8],
        type: 'line',
        smooth: true,
        itemStyle: { color: '#3498db' },
        lineStyle: { width: 3 },
        label: { show: true, position: 'top', formatter: '{c}%' },
        areaStyle: { color: 'rgba(52, 152, 219, 0.1)' }
      }]
    });
  }

  // Responsividade dos gráficos
  window.addEventListener('resize', () => {
    echartLideres?.resize();
    echartSetores?.resize();
    echartModelos?.resize();
    echartTendencia?.resize();
  });
};

onMounted(() => {
  carregarDados();
});
</script>

<style scoped>
/* CORES E VARIÁVEIS BASEADAS NO TABLEAU */
.dashboard-root {
  background-color: #f5f6f8;
  min-height: 100vh;
  padding: 1rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
}

/* HEADER & FILTROS */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}
.header-title h1 { margin: 0; font-size: 1.5rem; color: #2c3e50; }
.last-update { font-size: 0.8rem; color: #7f8c8d; }

.filters-container {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.filter-input {
  padding: 0.4rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  background: white;
  font-size: 0.9rem;
}
.btn-filtrar {
  background: #2980b9;
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.btn-filtrar:hover { background: #3498db; }

/* NAVEGAÇÃO POR ABAS */
.tabs-menu {
  display: flex;
  gap: 1rem;
  border-bottom: 2px solid #bdc3c7;
  margin-bottom: 1.5rem;
}
.tabs-menu button {
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: #7f8c8d;
  cursor: pointer;
  position: relative;
  top: 2px;
}
.tabs-menu button.active {
  color: #2c3e50;
  border-bottom: 3px solid #e74c3c; /* Destaque da aba */
}

/* CARDS E CONTAINERS */
.tab-content { display: flex; flex-direction: column; gap: 1rem; }
.chart-box {
  background: white;
  border: 1px solid #e0e6ed;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.chart-box h3 { margin-top: 0; font-size: 0.9rem; text-align: center; color: #555; margin-bottom: 0.5rem; }
.echart-container { width: 100%; height: 250px; }

/* LINHA 1: KPIS */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.5rem;
}
.kpi-card {
  background: white;
  border: 1px solid #e0e6ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.kpi-card span { font-size: 0.75rem; color: #7f8c8d; font-weight: 600; text-align: center; }
.kpi-card strong { font-size: 1.6rem; color: #2c3e50; margin-top: 0.3rem; }
.error-kpi strong { color: #c0392b; }

/* LINHA 2: GRÁFICOS HORIZONTAIS */
.horizontal-charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

/* LINHA 3: TOP N E TENDÊNCIA */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.5fr; /* O gráfico de linha ganha mais espaço */
  gap: 1rem;
}

/* TABELAS DE CALOR (HEATMAP) */
.heatmap-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.heatmap-table td { padding: 0.5rem; border-bottom: 1px solid #ecf0f1; }
.brand-cell { font-weight: bold; width: 20%; }
.question-cell { width: 60%; }
.value-cell { width: 20%; text-align: center; font-weight: bold; color: white; }

/* RESPONSIVIDADE */
@media (max-width: 1024px) {
  .bottom-grid { grid-template-columns: 1fr; } /* Empilha tudo em telas menores */
}
</style>