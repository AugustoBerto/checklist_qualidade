<template>
  <div class="page-container dashboard-dinamico">
    
    <div v-if="isLoadingConfig" class="loading-state">
      <div class="spinner"></div> Carregando estrutura do Dashboard...
    </div>

    <div v-else-if="error" class="error-state">
      ❌ {{ error }}
    </div>

    <div v-else>
      <header class="dashboard-header">
        <div class="titles">
          <h1>📊 {{ dashboard.titulo }}</h1>
          <p class="desc" v-if="dashboard.descricao">{{ dashboard.descricao }}</p>
        </div>
        
        <div class="filtros-globais">
          
          <div v-for="(filtro, index) in dashboard.filtros" :key="'filtro-' + index" class="filtro-item">
            <select 
              v-model="filtrosSelecionados[filtro.coluna]" 
              class="input-filtro" 
              v-if="!filtro.loading"
            >
              <option value="">Todos ({{ filtro.nome }})</option>
              <option v-for="op in filtro.opcoes" :key="op" :value="op">{{ op }}</option>
            </select>
            <span v-else class="filtro-loading">Carregando {{ filtro.nome }}...</span>
          </div>
          
          <input type="date" v-model="filtrosSelecionados.dataInicio" class="input-filtro" title="Data Inicial">
          <input type="date" v-model="filtrosSelecionados.dataFim" class="input-filtro" title="Data Final">
          
          <button @click="atualizarDados" class="btn-atualizar" :disabled="isExtracting">
            <span v-if="!isExtracting">🔍 Aplicar Filtros</span>
            <span v-else>⏳ Processando...</span>
          </button>

        </div>
      </header>

      <nav class="tabs-menu" v-if="abasDisponiveis.length > 1">
        <button 
          v-for="aba in abasDisponiveis" 
          :key="aba" 
          :class="['tab-btn', { active: abaAtual === aba }]"
          @click="abaAtual = aba"
        >
          {{ aba }}
        </button>
      </nav>

      <main class="widgets-grid">
        <div 
          v-for="widget in widgetsDaAbaAtual" 
          :key="widget.id" 
          :class="['widget-card', `col-span-${widget.tamanho_coluna || 4}`]"
        >
          <div class="widget-header">
            <h3>{{ widget.titulo }}</h3>
          </div>

          <div class="widget-body">
            <div v-if="widget.loading" class="widget-loader">
              <div class="spinner-small"></div> Extraindo e calculando...
            </div>
            <div v-else-if="widget.error" class="widget-error">❌ {{ widget.errorMsg || 'Erro ao carregar dados.' }}</div>
            <div v-else-if="!widget.rawData || widget.rawData.length === 0" class="widget-empty">Nenhum dado retornado para estes filtros.</div>
            
            <div v-else class="widget-content">
              
              <div v-if="widget.tipo_grafico === 'kpi'" class="kpi-display">
                <span class="kpi-value" :style="{ color: widget.configuracao.cor || '#2c3e50' }">{{ widget.kpiValue }}</span>
                <span class="kpi-label">
                  {{ widget.configuracao.operacao === 'percentual' ? 'Taxa (Percentual)' : widget.configuracao.operacao.replace('_', ' ') }}
                </span>
                <span v-if="widget.configuracao.operacao === 'percentual'" class="kpi-subtext">
                  ({{ widget.kpiDetails.a }} / {{ widget.kpiDetails.b }})
                </span>
              </div>

              <div v-else-if="widget.tipo_grafico === 'lista'" class="lista-display">
                <ul class="lista-customizada">
                  <li v-for="(item, idx) in widget.listaValores" :key="idx">{{ item }}</li>
                </ul>
              </div>

              <div v-else-if="widget.tipo_grafico === 'tabela'" class="tabela-display">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th v-for="col in widget.configuracao.colunas_tabela" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(linha, idx) in widget.tabelaValores" :key="idx">
                      <td v-for="col in widget.configuracao.colunas_tabela" :key="col">{{ formatarLabel(linha[col]) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-else-if="widget.tipo_grafico === 'heatmap'" class="heatmap-display">
                <table class="heatmap-table">
                  <tbody>
                    <tr v-for="(row, idx) in widget.heatmapData" :key="idx">
                      <td class="hm-dim1" v-if="row.dim1">{{ row.dim1 }}</td>
                      <td class="hm-dim2">{{ row.dim2 }}</td>
                      <td class="hm-value" :style="{ backgroundColor: getHeatmapColor(row.value, widget.heatmapMax) }">
                        {{ formatarValor(row.value, widget.configuracao.formato) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-else :id="`echart-${widget.id}`" class="echart-container"></div>

            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onUnmounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api'; 
import * as echarts from 'echarts';

const route = useRoute();
const idDashboard = route.params.id;

const isLoadingConfig = ref(true);
const isExtracting = ref(false);
const error = ref(null);
const dashboard = ref({ titulo: '', descricao: '', filtros: [] });
const widgets = ref([]);
const chartInstances = {};

const filtrosSelecionados = reactive({ dataInicio: '', dataFim: '' });

const abaAtual = ref('');

// --- PROPRIEDADES COMPUTADAS ---
const abasDisponiveis = computed(() => {
  const abas = widgets.value.map(w => w.configuracao.aba || 'Visão Geral');
  return [...new Set(abas)];
});

const widgetsDaAbaAtual = computed(() => {
  return widgets.value.filter(w => (w.configuracao.aba || 'Visão Geral') === abaAtual.value);
});

// --- VIGILANTES (WATCHERS) ---
watch(abaAtual, async () => {
  await nextTick();
  widgetsDaAbaAtual.value.forEach(widget => {
    if (widget.rawData && widget.rawData.length > 0 && !widget.loading && !widget.error) {
      processarERenderizarWidget(widget);
    }
  });
});

// --- CICLO DE VIDA ---
onMounted(async () => {
  try {
    const res = await api.get(`/dashboard-builder/carregar/${idDashboard}`);
    
    if (res.data.sucesso) {
      const dbData = res.data.dashboard;
      dashboard.value.titulo = dbData.titulo;
      dashboard.value.descricao = dbData.descricao;
      
      let filtrosSalvos = [];
      try { 
        filtrosSalvos = typeof dbData.filtros_globais === 'string' 
          ? JSON.parse(dbData.filtros_globais) 
          : dbData.filtros_globais; 
      } catch(e) { console.error("Erro ao fazer parse dos filtros", e); }
      
      dashboard.value.filtros = (filtrosSalvos || []).map(f => {
        filtrosSelecionados[f.coluna] = ''; 
        return { ...f, opcoes: [], loading: true };
      });

      widgets.value = res.data.widgets.map(w => ({
        ...w, 
        loading: false, 
        error: false, 
        errorMsg: '', 
        rawData: [], 
        kpiValue: 0, 
        kpiDetails: {a:0, b:0}, 
        listaValores: [], 
        tabelaValores: [], 
        heatmapData: [], 
        heatmapMax: 0
      }));
      
      if (abasDisponiveis.value.length > 0) abaAtual.value = abasDisponiveis.value[0];
      
      await carregarOpcoesDosFiltros();
      atualizarDados();
    }
  } catch (err) {
    error.value = "Dashboard não encontrado ou erro de conexão com o servidor.";
  } finally {
    isLoadingConfig.value = false;
  }

  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  Object.values(chartInstances).forEach(chart => chart.dispose());
});

const handleResize = () => Object.values(chartInstances).forEach(chart => chart.resize());

// --- MÉTODOS DE DADOS ---
const carregarOpcoesDosFiltros = async () => {
  const promessas = dashboard.value.filtros.map(async (f) => {
    try {
      const res = await api.post('/dashboard-builder/extrair', { 
        fonte_dados: f.fonte_dados, 
        filtros: {} 
      });
      if (res.data.sucesso && res.data.dados) {
        const opcoesBrutas = res.data.dados.map(linha => linha[f.coluna]).filter(val => val !== null && val !== undefined && val !== '');
        f.opcoes = [...new Set(opcoesBrutas)].sort();
      }
    } catch (e) {
      console.error(`Erro no filtro ${f.nome}`);
    } finally {
      f.loading = false;
    }
  });
  await Promise.all(promessas);
};

const atualizarDados = async () => {
  isExtracting.value = true;
  const promessas = widgets.value.map(async (widget) => {
    widget.loading = true; 
    widget.error = false;
    try {
      const res = await api.post('/dashboard-builder/extrair', { 
        fonte_dados: widget.fonte_dados, 
        filtros: filtrosSelecionados 
      });
      widget.loading = false;
      await nextTick(); 
      if (res.data.sucesso) {
        widget.rawData = res.data.dados;
        if ((widget.configuracao.aba || 'Visão Geral') === abaAtual.value) {
          await processarERenderizarWidget(widget); 
        }
      } else {
        widget.error = true;
        widget.errorMsg = res.data.mensagem || 'Erro na extração.';
      }
    } catch (err) { 
      widget.loading = false;
      widget.error = true; 
      widget.errorMsg = 'Erro de comunicação.';
    }
  });
  await Promise.all(promessas);
  isExtracting.value = false;
};

// --- FORMATADORES E MOTOR MATEMÁTICO (ESPELHO DO BUILDER) ---
const formatarLabel = (valor) => {
  if (valor === null || valor === undefined || valor === '') return 'Não Informado';
  if (typeof valor === 'string' && valor.includes('T')) {
    const regexIso = /^(\d{4})-(\d{2})-(\d{2})T.*/;
    if (regexIso.test(valor)) return valor.replace(regexIso, '$3/$2/$1');
  }
  return String(valor);
};

const calcularOperacao = (stats, operacao) => {
  if (operacao === 'soma') return stats.a;
  if (operacao === 'contagem') return stats.count;
  if (operacao === 'contagem_distinta') return stats.distinct.size;
  if (operacao === 'media') return stats.count ? stats.a / stats.count : 0;
  if (operacao === 'subtracao') return stats.a - stats.b;
  if (operacao === 'percentual') return stats.b ? ((stats.a / stats.b) * 100) : 0;
  return 0;
};

const agruparDados = (dadosPuros, config) => {
  const { eixo_y, eixo_y_secundario, eixo_x, eixo_x_b, operacao, serie, tipo_grafico, ordem_series } = config;
  const mapa = {};
  const seriesUnicas = new Set();

  dadosPuros.forEach(linha => {
    let cat = formatarLabel(linha[eixo_y]);
    let cat2 = eixo_y_secundario ? formatarLabel(linha[eixo_y_secundario]) : null;
    const chaveAgrupamento = cat2 && cat2 !== 'Não Informado' ? `${cat}|__|${cat2}` : cat;
    
    const nomeSerie = serie ? formatarLabel(linha[serie]) : 'Total';
    if (serie && (!linha[serie] || linha[serie] === '')) return; 

    seriesUnicas.add(nomeSerie);

    if (!mapa[chaveAgrupamento]) mapa[chaveAgrupamento] = {};
    if (!mapa[chaveAgrupamento][nomeSerie]) mapa[chaveAgrupamento][nomeSerie] = { a: 0, b: 0, count: 0, distinct: new Set() };

    const valA = Number(linha[eixo_x]) || 0;
    const valB = Number(linha[eixo_x_b]) || 0;

    mapa[chaveAgrupamento][nomeSerie].a += valA;
    mapa[chaveAgrupamento][nomeSerie].b += valB; 
    mapa[chaveAgrupamento][nomeSerie].count += 1;
    if (linha[eixo_x] !== null && linha[eixo_x] !== undefined) mapa[chaveAgrupamento][nomeSerie].distinct.add(linha[eixo_x]);
  });

  if (tipo_grafico === 'heatmap') {
    const flatData = [];
    let maxVal = 0;
    Object.entries(mapa).forEach(([chaveObj, seriesMap]) => {
      const partes = chaveObj.split('|__|');
      const valFinal = calcularOperacao(Object.values(seriesMap)[0], operacao);
      if (valFinal > maxVal) maxVal = valFinal;
      flatData.push({ dim1: partes[0], dim2: partes[1] || partes[0], value: valFinal });
    });
    return { heatmapData: flatData.sort((a,b) => b.value - a.value).slice(0, 15), maxVal };
  }

  const categoriasRaw = Object.keys(mapa);
  let seriesArray = Array.from(seriesUnicas);
  
  if (ordem_series && ordem_series.trim() !== '') {
    const orderMap = ordem_series.split(',').map(s => s.trim().toLowerCase());
    seriesArray.sort((a, b) => {
      const idxA = orderMap.indexOf(a.toLowerCase());
      const idxB = orderMap.indexOf(b.toLowerCase());
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1; 
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  } else {
    seriesArray.sort();
  }
  
  categoriasRaw.sort((catA, catB) => {
    let aNum = 0, aDen = 0, bNum = 0, bDen = 0;
    seriesArray.forEach(s => {
      aNum += mapa[catA][s]?.a || 0; aDen += mapa[catA][s]?.b || 0;
      bNum += mapa[catB][s]?.a || 0; bDen += mapa[catB][s]?.b || 0;
    });
    let valA = operacao === 'percentual' ? (aDen ? (aNum/aDen)*100 : 0) : aNum;
    let valB = operacao === 'percentual' ? (bDen ? (bNum/bDen)*100 : 0) : bNum;
    return valA - valB;
  });

  const baseBlue = config.cor || '#8fbce6';
  const corSec = config.cor_secundaria || '#bdc3c7';
  const corTer = config.cor_terciaria || '#95a5a6';
  const paletaCores = [baseBlue, corSec, corTer, '#f39c12', '#e74c3c', '#2ecc71', '#9b59b6'];

  const echartSeries = seriesArray.map((nomeSerie, index) => {
    const data = categoriasRaw.map(cat => {
      const stats = mapa[cat][nomeSerie];
      if (!stats) return { value: 0, a: 0, b: 0 };
      return { value: Number(calcularOperacao(stats, operacao).toFixed(1)), a: stats.a, b: stats.b };
    });

    let type = (tipo_grafico === 'linha') ? 'line' : (tipo_grafico === 'pizza' ? 'pie' : 'bar');
    let labelPosition = (type === 'bar') ? (config.tipo_grafico === 'barras_horizontais' ? 'insideRight' : 'insideTop') : (type === 'pie' ? 'inside' : 'top');
    let labelColor = (type === 'line') ? '#333' : '#ffffff';
    let shadowWidth = (type === 'line') ? 0 : 2;

    return {
      name: nomeSerie, type: type, smooth: type === 'line', data: data, barWidth: '60%',
      itemStyle: seriesArray.length > 1 && config.tipo_grafico !== 'barras_horizontais' ? { color: paletaCores[index % paletaCores.length] } : { color: baseBlue },
      label: { 
        show: true, position: labelPosition, color: labelColor, fontWeight: 'bold', fontSize: 13,
        textBorderColor: 'rgba(0,0,0,0.4)', textBorderWidth: shadowWidth, distance: 10,
        formatter: config.formato === 'percentual' ? '{c}%' : '{c}'
      }
    };
  });

  return { categorias: categoriasRaw, series: echartSeries, seriesNames: seriesArray, paletaCores };
};

const formatarValor = (valor, formato) => {
  if (formato === 'percentual') return Number(valor).toFixed(1) + '%';
  return Number(valor).toLocaleString('pt-BR');
};

const getHeatmapColor = (valor, maximo) => {
  if (!maximo || valor === 0) return 'rgba(217, 83, 79, 0.1)';
  const intensidade = Math.max(0.15, Math.min(valor / maximo, 1));
  return `rgba(217, 83, 79, ${intensidade})`;
};

const extrairValoresUnicos = (dados, eixo) => {
  return [...new Set(dados.map(l => formatarLabel(l[eixo])))].filter(v => v !== 'Não Informado').sort();
};

// --- RENDERIZAÇÃO FINAL (ESPELHO DO BUILDER) ---
const processarERenderizarWidget = async (widget) => {
  try {
    const config = widget.configuracao;
    
    if (widget.tipo_grafico === 'kpi') {
      const statsObj = { a:0, b:0, count: widget.rawData.length, distinct: new Set() };
      widget.rawData.forEach(l => {
        statsObj.a += Number(l[config.eixo_x]) || 0;
        statsObj.b += Number(l[config.eixo_x_b]) || 0;
        if(l[config.eixo_x]) statsObj.distinct.add(l[config.eixo_x]);
      });
      const val = calcularOperacao(statsObj, config.operacao);
      widget.kpiValue = formatarValor(val, config.formato);
      widget.kpiDetails = { a: statsObj.a, b: statsObj.b }; 
      return;
    }

    if (widget.tipo_grafico === 'lista') {
      widget.listaValores = extrairValoresUnicos(widget.rawData, config.eixo_y);
      return;
    }

    if (widget.tipo_grafico === 'tabela') {
      widget.tabelaValores = widget.rawData.slice(0, 2000); 
      return;
    }

    const agrupado = agruparDados(widget.rawData, config);

    if (widget.tipo_grafico === 'heatmap') {
      widget.heatmapData = agrupado.heatmapData;
      widget.heatmapMax = agrupado.maxVal;
      return;
    }

    await nextTick();
    const domId = `echart-${widget.id}`;
    const chartDom = document.getElementById(domId);
    if (!chartDom) return; 

    if (chartInstances[domId]) chartInstances[domId].dispose();
    const myChart = echarts.init(chartDom);
    chartInstances[domId] = myChart;

    let tooltipFormatter = null;
    if (config.operacao === 'percentual') {
      tooltipFormatter = (params) => {
        let p = Array.isArray(params) ? params[0] : params;
        return `<b>${p.name}</b><br/>${p.marker} ${p.seriesName}: <b>${p.value}%</b> <br/><span style="font-size:11px;color:#777">(${p.data.a} / ${p.data.b})</span>`;
      };
    }

    let option = { 
      color: agrupado.paletaCores,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: tooltipFormatter } 
    };

    // 📌 LÓGICA DE DATAZOOM (ROLAGEM) DO BUILDER
    const numCategorias = agrupado.categorias.length;
    const buildDataZoom = (tipo) => {
      if (tipo === 'barras_horizontais') {
        const show = numCategorias > 8; 
        return [{ type: 'slider', yAxisIndex: 'all', right: '1%', width: 10, start: show ? 100 - Math.floor((8/numCategorias)*100) : 0, end: 100, show }, { type: 'inside', yAxisIndex: 'all', zoomOnMouseWheel: false, moveOnMouseWheel: true }];
      } else if (['barras_verticais', 'linha'].includes(tipo)) {
        const show = numCategorias > 10; 
        return [{ type: 'slider', xAxisIndex: 'all', bottom: '1%', height: 10, start: 0, end: show ? Math.floor((10/numCategorias)*100) : 100, show }, { type: 'inside', xAxisIndex: 'all', zoomOnMouseWheel: false, moveOnMouseWheel: true }];
      }
      return [];
    };
    option.dataZoom = buildDataZoom(widget.tipo_grafico);

    // 📌 LÓGICA DE GRIDS MÚLTIPLOS DO BUILDER
    if (widget.tipo_grafico === 'barras_horizontais') {
      if (config.serie && agrupado.seriesNames.length > 1) {
        const grids = []; const xAxes = []; const yAxes = []; const titles = []; const seriesData = [];
        const numSeries = agrupado.seriesNames.length;
        const leftMargin = 30; const gap = 2; const gridWidth = (100 - leftMargin - 5 - (gap * (numSeries - 1))) / numSeries;

        agrupado.seriesNames.forEach((serieName, i) => {
          const currentLeft = leftMargin + i * (gridWidth + gap);
          titles.push({ text: serieName, left: `${currentLeft + (gridWidth / 2)}%`, top: '0%', textAlign: 'center', textStyle: { fontSize: 13, color: '#333' } });
          grids.push({ left: `${currentLeft}%`, width: `${gridWidth}%`, bottom: '10%', top: '15%', containLabel: false });
          xAxes.push({ gridIndex: i, type: 'value', max: config.operacao === 'percentual' ? 100 : null, splitLine: { show: false }, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false } });
          yAxes.push({ gridIndex: i, type: 'category', data: agrupado.categorias, axisLabel: { show: i === 0, width: 140, overflow: 'truncate', color: '#333', fontWeight: 'bold', fontSize: 13 }, axisTick: { show: false }, axisLine: { show: i === 0, lineStyle: { color: '#bdc3c7' } } });
          seriesData.push({ ...agrupado.series[i], xAxisIndex: i, yAxisIndex: i });
        });
        option.title = titles; option.grid = grids; option.xAxis = xAxes; option.yAxis = yAxes; option.series = seriesData;
      } else {
        option.grid = { left: '3%', right: '8%', bottom: '10%', top: '5%', containLabel: true };
        option.xAxis = { type: 'value', max: config.operacao === 'percentual' ? 100 : null, axisLabel: { formatter: config.formato === 'percentual' ? '{value}%' : '{value}'} };
        option.yAxis = { type: 'category', data: agrupado.categorias, axisLabel: { fontSize: 13, fontWeight: 'bold', color: '#333' } };
        option.series = agrupado.series;
      }
    } 
    else if (widget.tipo_grafico === 'barras_verticais' || widget.tipo_grafico === 'linha') {
      option.grid = { left: '5%', right: '5%', bottom: '15%', top: '15%', containLabel: true };
      option.legend = { data: agrupado.seriesNames, show: agrupado.seriesNames.length > 1, top: 0, textStyle: { fontSize: 13 } };
      option.xAxis = { type: 'category', data: agrupado.categorias, axisLabel: { fontSize: 12, fontWeight: 'bold', color: '#333', interval: 0, rotate: 45 } };
      option.yAxis = { type: 'value', max: config.operacao === 'percentual' ? 100 : null, axisLabel: { formatter: config.formato === 'percentual' ? '{value}%' : '{value}', fontSize: 12 } };
      option.series = agrupado.series;
    }
    else if (widget.tipo_grafico === 'pizza') {
      option.tooltip.formatter = tooltipFormatter ? undefined : '{b}: {c} ({d}%)';
      option.legend = { bottom: '0%', textStyle: { fontSize: 13 } };
      option.series = [{ type: 'pie', radius: ['40%', '70%'], data: agrupado.categorias.map((cat, i) => ({ name: cat, value: agrupado.series[0].data[i].value, a: agrupado.series[0].data[i].a, b: agrupado.series[0].data[i].b })) }];
    }
    
    myChart.setOption(option);
  } catch (err) {
    console.error("Erro render:", err);
    widget.error = true;
    widget.errorMsg = "Erro visual.";
  }
};
</script>

<style scoped>
.dashboard-dinamico { background-color: #f5f6f8; min-height: 100vh; padding: 1rem; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

/* LOADING E ERRO */
.loading-state, .error-state { display: flex; justify-content: center; align-items: center; height: 50vh; font-size: 1.2rem; color: #7f8c8d; }
.error-state { color: #e74c3c; font-weight: bold; }
.spinner { border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #3498db; animation: spin 1s linear infinite; margin-right: 1rem; }
.spinner-small { border: 3px solid rgba(0,0,0,0.1); width: 16px; height: 16px; border-radius: 50%; border-left-color: #3498db; animation: spin 1s linear infinite; margin-right: 0.5rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* CABEÇALHO */
.dashboard-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 1.5rem; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.titles h1 { margin: 0; font-size: 1.5rem; color: #2c3e50; }
.desc { margin: 0.5rem 0 0 0; color: #7f8c8d; font-size: 0.9rem; }

/* FILTROS DINÂMICOS */
.filtros-globais { display: flex; gap: 0.8rem; flex-wrap: wrap; margin-top: 1rem; }
.filtro-item { display: flex; align-items: center; }
.filtro-loading { color: #95a5a6; font-size: 0.85rem; font-style: italic; padding: 0.5rem; }
.input-filtro { padding: 0.5rem 0.8rem; border: 1px solid #bdc3c7; border-radius: 6px; font-family: inherit; font-size: 0.9rem; background: #fff; }
.btn-atualizar { background: #2980b9; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.95rem; transition: background 0.3s; }
.btn-atualizar:hover:not(:disabled) { background: #3498db; }
.btn-atualizar:disabled { background: #95a5a6; cursor: not-allowed; }

/* TABS MENU */
.tabs-menu { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid #e0e6ed; padding-bottom: 0.5rem; overflow-x: auto; }
.tab-btn { background: none; border: none; padding: 0.6rem 1.2rem; font-size: 1.05rem; font-weight: 600; color: #7f8c8d; cursor: pointer; border-radius: 6px 6px 0 0; transition: all 0.2s; white-space: nowrap; }
.tab-btn:hover { background: #fdfdfe; color: #34495e; }
.tab-btn.active { color: #2c3e50; background: white; border: 1px solid #e0e6ed; border-bottom: none; box-shadow: 0 -2px 5px rgba(0,0,0,0.02); position: relative; top: 1px; }

/* GRID 12 COLUNAS */
.widgets-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.5rem; }
.col-span-2 { grid-column: span 2; }
.col-span-3 { grid-column: span 3; }
.col-span-4 { grid-column: span 4; }
.col-span-6 { grid-column: span 6; }
.col-span-12 { grid-column: span 12; }

/* WIDGET CARD */
.widget-card { background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e0e6ed; }
.widget-header { padding: 1rem 1.2rem; border-bottom: 1px solid #f0f0f0; background: #fafbfc; }
.widget-header h3 { margin: 0; font-size: 1.05rem; color: #34495e; font-weight: 600; text-align: center; }
.widget-body { padding: 1rem; flex-grow: 1; display: flex; justify-content: center; align-items: center; min-height: 150px; }
.widget-content { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
.widget-loader { display: flex; align-items: center; color: #3498db; font-size: 0.9rem; font-weight: 500; font-style: italic; }
.widget-error { color: #e74c3c; font-size: 0.9rem; font-weight: bold; }
.widget-empty { color: #95a5a6; font-size: 0.9rem; font-style: italic; text-align: center; }

/* KPI DISPLAY */
.kpi-display { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1.5rem 0; width: 100%; }
.kpi-value { font-size: 3.2rem; font-weight: 800; line-height: 1; margin-bottom: 0.2rem; }
.kpi-label { color: #7f8c8d; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
.kpi-subtext { color: #bdc3c7; font-size: 0.75rem; margin-top: 0.2rem; }

/* LISTA SIMPLES */
.lista-display { width: 100%; max-height: 350px; overflow-y: auto; align-self: flex-start; }
.lista-customizada { list-style: none; padding: 0; margin: 0; width: 100%; }
.lista-customizada li { padding: 0.6rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; color: #333; }
.lista-customizada li:nth-child(even) { background-color: #fafbfc; }

/* TABELA DE DADOS (LISTA COMPOSTA) */
.tabela-display { width: 100%; max-height: 350px; overflow: auto; align-self: flex-start; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left; }
.data-table th { background: #34495e; color: white; padding: 0.8rem; position: sticky; top: 0; z-index: 1; white-space: nowrap; }
.data-table td { padding: 0.8rem; border-bottom: 1px solid #ecf0f1; white-space: nowrap; color: #333; }
.data-table tbody tr:nth-child(even) { background-color: #fcfcfc; }
.data-table tbody tr:hover { background-color: #f1f2f6; }

/* HEATMAP */
.heatmap-display { width: 100%; max-height: 350px; overflow-y: auto; align-self: flex-start; }
.heatmap-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.heatmap-table td { padding: 0.6rem; border-bottom: 1px solid #ecf0f1; border-right: 1px solid #ecf0f1; }
.hm-dim1 { font-weight: bold; width: 25%; background: #fdfdfe; }
.hm-dim2 { width: 55%; background: #fdfdfe; }
.hm-value { width: 20%; text-align: center; font-weight: bold; color: white; text-shadow: 0px 1px 2px rgba(0,0,0,0.5); }

/* ECHARTS CONTAINER */
.echart-container { width: 100%; height: 350px; }

/* RESPONSIVIDADE */
@media (max-width: 1200px) {
  .col-span-2 { grid-column: span 3; } 
  .col-span-3 { grid-column: span 4; } 
}
@media (max-width: 992px) {
  .col-span-2, .col-span-3, .col-span-4 { grid-column: span 6; } 
}
@media (max-width: 768px) {
  .col-span-2, .col-span-3, .col-span-4, .col-span-6 { grid-column: span 12; } 
  .dashboard-header { flex-direction: column; align-items: flex-start; }
  .kpi-value { font-size: 2.5rem; }
}
</style>