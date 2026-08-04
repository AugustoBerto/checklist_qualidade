<template>
  <div class="page-container builder-container">
    <div class="header-n">
      <div class="header-titles">
        <h1><i class="mdi mdi-view-dashboard-edit"></i> Motor de B.I. - Gerenciador de Dashboards</h1>
        <p>Crie ou edite visões analíticas avançadas conectadas ao banco.</p>
      </div>
      <div class="header-actions">
        <button class="btn-novo" v-if="dashboardSelecionadoId" @click="iniciarNovoDashboard">
          <i class="mdi mdi-plus-box-outline"></i> Criar Novo
        </button>
        <button class="btn-salvar" @click="salvarDashboard" :disabled="salvando">
          <i class="mdi mdi-content-save"></i> 
          {{ salvando ? 'Salvando...' : (dashboardSelecionadoId ? 'Atualizar Dashboard' : 'Salvar Novo Dashboard') }}
        </button>
      </div>
    </div>

    <div class="gerenciamento-area card">
      <h2><i class="mdi mdi-folder-table"></i> Painéis Existentes</h2>
      <div class="form-group-row" style="align-items: flex-end;">
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <label>Selecione para Editar:</label>
          <select v-model="dashboardSelecionadoId" @change="carregarDashboardParaEdicao" class="input-base" style="font-weight: bold; color: #2980b9;">
            <option value="">-- CRIAR UM NOVO DASHBOARD --</option>
            <option v-for="dash in listaDashboards" :key="dash.id" :value="dash.id">
              ID: {{ dash.id }} | {{ dash.titulo }}
            </option>
          </select>
        </div>
        <button v-if="dashboardSelecionadoId" @click="excluirDashboard" class="btn-excluir-dash">
          <i class="mdi mdi-delete-forever"></i> Excluir Painel Inteiro
        </button>
      </div>
    </div>

    <div class="geral-config card" style="margin-top: 1.5rem;">
      <h2><i class="mdi mdi-cog"></i> 1. Configurações do Painel</h2>
      <div class="form-group-row">
        <div class="form-group w-50">
          <label>Título do Dashboard</label>
          <input type="text" v-model="dashboard.titulo" placeholder="Ex: Painel de Liderança" class="input-base">
        </div>
        <div class="form-group w-50">
          <label>Descrição Opcional</label>
          <input type="text" v-model="dashboard.descricao" placeholder="Ex: Indicadores diários..." class="input-base">
        </div>
      </div>
    </div>

    <hr class="divisor">

    <div class="filtros-area card">
      <div class="widgets-header">
        <h2><i class="mdi mdi-filter-variant"></i> 2. Filtros Globais (Dropdowns Dinâmicos)</h2>
        <span class="badge">{{ dashboard.filtros.length }} filtro(s)</span>
      </div>
      <p class="dica" style="margin-bottom: 1rem;">Crie filtros que serão exibidos no topo do painel. Eles buscarão as opções únicas da coluna selecionada.</p>

      <div v-for="(filtro, index) in dashboard.filtros" :key="'filtro-'+index" class="config-section" style="display: flex; gap: 1rem; align-items: flex-end;">
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <label>Nome na Tela <span class="dica">Ex: Selecionar Turno</span></label>
          <input type="text" v-model="filtro.nome" placeholder="Rótulo do Filtro" class="input-base">
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <label>Fonte (Onde buscar as opções)</label>
          <select v-model="filtro.fonte_dados" @change="carregarColunasFiltro(filtro)" class="input-base">
            <option value="">Selecione a View...</option>
            <option v-for="fonte in listaFontes" :key="fonte" :value="fonte">{{ fonte }}</option>
          </select>
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0;" v-if="filtro.colunasDisponiveis && filtro.colunasDisponiveis.length > 0">
          <label>Coluna Alvo <span class="dica">Ex: turno</span></label>
          <select v-model="filtro.coluna" class="input-base">
            <option value="">Selecione a Coluna...</option>
            <option v-for="col in filtro.colunasDisponiveis" :key="col.column_name" :value="col.column_name">
              {{ col.column_name }} ({{ col.data_type }})
            </option>
          </select>
        </div>
        <button @click="removerFiltro(index)" class="btn-remover" style="height: 42px;">
          <i class="mdi mdi-close"></i> Remover
        </button>
      </div>

      <button class="btn-preview" style="background: #ecf0f1; color: #2c3e50; border: 1px solid #bdc3c7;" @click="adicionarFiltro">
        <i class="mdi mdi-plus-circle"></i> Adicionar Novo Filtro
      </button>
    </div>

    <hr class="divisor">

    <div class="widgets-area">
      <div class="widgets-header">
        <h2><i class="mdi mdi-chart-box-outline"></i> 3. Gráficos e Indicadores (Widgets)</h2>
        <span class="badge">{{ dashboard.widgets.length }} gráfico(s)</span>
      </div>
      
      <div v-for="(widget, index) in dashboard.widgets" :key="index" class="widget-card">
        <div class="widget-card-header">
          <h3>Gráfico {{ index + 1 }} - {{ widget.titulo || 'Novo Gráfico' }}</h3>
          <button @click="removerWidget(index)" class="btn-remover">
            <i class="mdi mdi-delete"></i> Excluir Gráfico
          </button>
        </div>

        <div class="widget-card-body">
          <div class="widget-form">
            <div class="config-section">
              <h4 class="section-title"><i class="mdi mdi-information-outline"></i> Informações Básicas</h4>
              <div class="form-group-row">
                <div class="form-group w-50">
                  <label>Título do Gráfico/KPI</label>
                  <input type="text" v-model="widget.titulo" placeholder="Ex: Tabela de Detalhes" class="input-base">
                </div>
                <div class="form-group w-50">
                  <label>Aba (Página do Gráfico)</label>
                  <input type="text" v-model="widget.configuracao.aba" list="lista-abas" placeholder="Nome da Aba" class="input-base">
                  <datalist id="lista-abas">
                    <option v-for="aba in abasExistentes" :key="aba" :value="aba"></option>
                  </datalist>
                </div>
              </div>
              <div class="form-group-row">
                <div class="form-group w-50">
                  <label>Tipo Visual</label>
                  <select v-model="widget.tipo_grafico" class="input-base">
                    <option value="kpi">1. Card KPI</option>
                    <option value="barras_horizontais">2. Barras Horizontais</option>
                    <option value="barras_verticais">3. Barras Verticais</option>
                    <option value="linha">4. Linha de Tendência</option>
                    <option value="pizza">5. Gráfico de Pizza</option>
                    <option value="heatmap">6. Tabela de Calor</option>
                    <option value="lista">7. Lista Simples (1 Coluna)</option>
                    <option value="tabela">8. Tabela de Dados (Lista Composta)</option>
                  </select>
                </div>
                <div class="form-group w-50">
                  <label>Largura na Tela</label>
                  <select v-model="widget.tamanho_coluna" class="input-base">
                    <option :value="2">1/6 da Tela (6 por linha)</option>
                    <option :value="3">1/4 da Tela (4 por linha)</option>
                    <option :value="4">1/3 da Tela (3 por linha)</option>
                    <option :value="6">Metade da Tela (2 por linha)</option>
                    <option :value="12">Largura Total (1 por linha)</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Fonte de Dados</label>
                <select v-model="widget.fonte_dados" @change="carregarColunas(widget, index)" class="input-base">
                  <option value="">-- Selecione uma View --</option>
                  <option v-for="fonte in listaFontes" :key="fonte" :value="fonte">{{ fonte }}</option>
                </select>
              </div>
            </div>

            <template v-if="widget.colunasDisponiveis && widget.colunasDisponiveis.length > 0">
              
              <div class="config-section" v-if="widget.tipo_grafico === 'tabela'">
                <h4 class="section-title"><i class="mdi mdi-table-cog"></i> Colunas da Tabela</h4>
                <div class="form-group config-highlight">
                  <label>Selecione e Renomeie as Colunas</label>
                  <div class="checkbox-group" style="max-height: 250px; overflow-y: auto; background: #fff; padding: 0.5rem; border: 1px solid #bdc3c7; border-radius: 4px;">
                    
                    <div v-for="col in widget.colunasDisponiveis" :key="col.column_name" class="coluna-item">
                      <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: normal; font-size: 0.9rem; flex: 1;">
                        <input type="checkbox" :value="col.column_name" v-model="widget.configuracao.colunas_tabela">
                        {{ col.column_name }}
                      </label>
                      
                      <input 
                        v-if="widget.configuracao.colunas_tabela.includes(col.column_name)"
                        type="text" 
                        v-model="widget.configuracao.labels_colunas[col.column_name]"
                        class="input-base input-small" 
                        placeholder="Apelido da Coluna..."
                      >
                    </div>

                  </div>
                  <p class="dica" style="margin-top:0.5rem;">Marque as colunas que deseja exibir e, opcionalmente, digite um nome amigável para o cabeçalho.</p>
                </div>
              </div>

              <div class="config-section" v-if="!['kpi', 'tabela'].includes(widget.tipo_grafico)">
                <h4 class="section-title"><i class="mdi mdi-axis-arrow"></i> Dimensões</h4>
                <div class="form-group config-highlight">
                  <label>Eixo Principal (Linhas/Categorias)</label>
                  <select v-model="widget.configuracao.eixo_y" class="input-base">
                    <option value="">Nenhum...</option>
                    <option v-for="col in widget.colunasDisponiveis" :key="col.column_name" :value="col.column_name">{{ col.column_name }}</option>
                  </select>
                </div>
                <div class="form-group config-highlight" v-if="widget.tipo_grafico === 'heatmap'">
                  <label>Eixo Secundário (Colunas)</label>
                  <select v-model="widget.configuracao.eixo_y_secundario" class="input-base">
                    <option value="">Nenhum...</option>
                    <option v-for="col in widget.colunasDisponiveis" :key="col.column_name" :value="col.column_name">{{ col.column_name }}</option>
                  </select>
                </div>
                <div class="form-group config-highlight" v-if="['barras_horizontais', 'barras_verticais', 'linha'].includes(widget.tipo_grafico)">
                  <label>Quebrar por Série/Legenda <span class="dica">Ex: intervalo</span></label>
                  <select v-model="widget.configuracao.serie" class="input-base">
                    <option value="">Sem quebra</option>
                    <option v-for="col in widget.colunasDisponiveis" :key="col.column_name" :value="col.column_name">{{ col.column_name }}</option>
                  </select>
                </div>
                <div class="form-group" v-if="widget.configuracao.serie">
                  <label>Ordem das Colunas da Série (Opcional)</label>
                  <input type="text" v-model="widget.configuracao.ordem_series" placeholder="Separado por vírgula..." class="input-base">
                </div>
              </div>

              <div class="config-section" v-if="!['lista', 'tabela'].includes(widget.tipo_grafico)">
                <h4 class="section-title"><i class="mdi mdi-calculator"></i> Métricas</h4>
                <div class="form-group config-highlight">
                  <label>Operação Matemática</label>
                  <select v-model="widget.configuracao.operacao" class="input-base">
                    <option value="soma">Soma</option>
                    <option value="contagem">Contagem de Registros</option>
                    <option value="contagem_distinta">Contagem Distinta</option>
                    <option value="media">Média Simples</option>
                    <option value="subtracao">Subtração ( A - B )</option>
                    <option value="percentual">Percentual ( A / B )</option>
                  </select>
                </div>
                <div class="form-group config-highlight" v-if="widget.configuracao.operacao !== 'contagem'">
                  <label>Coluna de Valor A</label>
                  <select v-model="widget.configuracao.eixo_x" class="input-base">
                    <option value="">Selecione...</option>
                    <option v-for="col in widget.colunasDisponiveis" :key="col.column_name" :value="col.column_name">{{ col.column_name }}</option>
                  </select>
                </div>
                <div class="form-group config-highlight" v-if="['percentual', 'subtracao'].includes(widget.configuracao.operacao)">
                  <label>Coluna de Valor B (Denominador)</label>
                  <select v-model="widget.configuracao.eixo_x_b" class="input-base">
                    <option value="">Selecione...</option>
                    <option v-for="col in widget.colunasDisponiveis" :key="col.column_name" :value="col.column_name">{{ col.column_name }}</option>
                  </select>
                </div>

                <div class="form-group" style="margin-top: 1rem;">
                  <label>Formato de Exibição</label>
                  <select v-model="widget.configuracao.formato" class="input-base">
                    <option value="numero">Número Normal</option>
                    <option value="percentual">Percentual (%)</option>
                  </select>
                </div>

                <div class="form-group-row" style="margin-top: 1rem;" v-if="!['heatmap', 'lista'].includes(widget.tipo_grafico)">
                  <div class="form-group" style="flex: 1;">
                    <label>Cor Principal</label>
                    <input type="color" v-model="widget.configuracao.cor" class="color-picker">
                  </div>
                  <div class="form-group" style="flex: 1;" v-if="widget.configuracao.serie || widget.tipo_grafico === 'pizza'">
                    <label>Cor Sec.</label>
                    <input type="color" v-model="widget.configuracao.cor_secundaria" class="color-picker">
                  </div>
                  <div class="form-group" style="flex: 1;" v-if="widget.configuracao.serie || widget.tipo_grafico === 'pizza'">
                    <label>Cor Ter.</label>
                    <input type="color" v-model="widget.configuracao.cor_terciaria" class="color-picker">
                  </div>
                </div>

              </div>
              <button class="btn-preview" @click="gerarPreview(widget, index)">
                <i class="mdi mdi-eye" v-if="!widget.previewLoading"></i>
                <i class="mdi mdi-loading mdi-spin" v-else></i>
                {{ !widget.previewLoading ? 'Atualizar Preview' : 'Processando...' }}
              </button>
            </template>
            <div v-else-if="widget.fonte_dados" class="loading-colunas">Carregando esquema do banco...</div>
          </div>

          <div class="widget-preview-area">
            <div class="preview-header"><span><i class="mdi mdi-monitor-eye"></i> Visão Prévia</span></div>
            <div class="preview-content">
              <div v-if="widget.previewLoading" class="preview-status"><div class="spinner"></div> Processando dados...</div>
              <div v-else-if="widget.previewError" class="preview-status error"><i class="mdi mdi-alert-circle"></i> {{ widget.previewErrorMsg }}</div>
              
              <div v-else-if="widget.rawData && widget.rawData.length > 0" class="preview-render">
                
                <div v-if="widget.tipo_grafico === 'kpi'" class="kpi-display">
                  <span class="kpi-value" :style="{ color: widget.configuracao.cor || '#2c3e50' }">{{ widget.kpiValue }}</span>
                  <span class="kpi-label">{{ widget.titulo || 'Métrica' }}</span>
                </div>
                
                <div v-else-if="widget.tipo_grafico === 'lista'" class="lista-display">
                  <ul class="lista-customizada"><li v-for="(item, idx) in widget.listaValores" :key="idx">{{ item }}</li></ul>
                </div>

                <div v-else-if="widget.tipo_grafico === 'tabela'" class="tabela-display">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th v-for="col in widget.configuracao.colunas_tabela" :key="col">
                          {{ widget.configuracao.labels_colunas[col] || col }}
                        </th>
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
                  <table class="heatmap-table"><tbody><tr v-for="(row, idx) in widget.heatmapData" :key="idx">
                    <td class="hm-dim1" v-if="row.dim1">{{ row.dim1 }}</td><td class="hm-dim2">{{ row.dim2 }}</td>
                    <td class="hm-value" :style="{ backgroundColor: getHeatmapColor(row.value, widget.heatmapMax) }">{{ formatarValor(row.value, widget.configuracao.formato) }}</td>
                  </tr></tbody></table>
                </div>
                
                <div v-else :id="`preview-echart-${index}`" class="echart-container"></div>
              </div>
              <div v-else class="preview-status empty">Selecione Fonte e Eixos e clique em "Atualizar Preview".</div>
            </div>
          </div>
        </div>
      </div>

      <button class="btn-add-widget" @click="adicionarWidget"><i class="mdi mdi-plus-circle-outline"></i> Adicionar Novo Gráfico</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api'; // 📌 Importando nossa instância configurada
import * as echarts from 'echarts';

const router = useRouter();

const salvando = ref(false);
const listaFontes = ref([]);
const listaDashboards = ref([]);
const dashboardSelecionadoId = ref(''); 
const chartInstances = {};

const dashboard = reactive({ 
  titulo: '', 
  descricao: '', 
  filtros: [], 
  widgets: [] 
});

const abasExistentes = computed(() => {
  const abas = dashboard.widgets.map(w => w.configuracao.aba).filter(Boolean);
  return [...new Set(abas)];
});

// --- CICLO DE VIDA ---
onMounted(async () => {
  carregarFontes();
  carregarListaDashboards();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  Object.values(chartInstances).forEach(chart => chart.dispose());
});

const handleResize = () => Object.values(chartInstances).forEach(chart => chart.resize());

// --- CHAMADAS DE API ---
const carregarFontes = async () => {
  try {
    const res = await api.get('/dashboard-builder/fontes');
    if (res.data.sucesso) listaFontes.value = res.data.fontes;
  } catch (error) {
    console.error('Erro ao carregar fontes');
  }
};

const carregarListaDashboards = async () => {
  try {
    const res = await api.get('/dashboard-builder/listar');
    if (res.data.sucesso) listaDashboards.value = res.data.dashboards;
  } catch (error) {
    console.error('Erro ao listar dashboards');
  }
};

const iniciarNovoDashboard = () => {
  dashboardSelecionadoId.value = '';
  dashboard.titulo = '';
  dashboard.descricao = '';
  dashboard.filtros = [];
  dashboard.widgets = [];
};

const carregarDashboardParaEdicao = async () => {
  if (!dashboardSelecionadoId.value) {
    iniciarNovoDashboard();
    return;
  }
  try {
    const res = await api.get(`/dashboard-builder/carregar/${dashboardSelecionadoId.value}`);
    if (res.data.sucesso) {
      const dbData = res.data.dashboard;
      dashboard.titulo = dbData.titulo; 
      dashboard.descricao = dbData.descricao;
      
      let filtrosSalvos = [];
      try { 
        filtrosSalvos = typeof dbData.filtros_globais === 'string' 
          ? JSON.parse(dbData.filtros_globais) 
          : dbData.filtros_globais; 
      } catch(e){
        console.error("Erro ao converter filtros", e);
      }
      
      dashboard.filtros = filtrosSalvos || [];

      dashboard.widgets = res.data.widgets.map(w => {
        if (!w.configuracao.colunas_tabela) w.configuracao.colunas_tabela = [];
        if (!w.configuracao.labels_colunas) w.configuracao.labels_colunas = {};
        
        return {
          ...w, 
          colunasDisponiveis: [], 
          previewLoading: false, 
          previewError: false, 
          previewErrorMsg: '', 
          rawData: [], 
          kpiValue: 0, 
          listaValores: [], 
          tabelaValores: [], 
          heatmapData: [], 
          heatmapMax: 0
        };
      });

      dashboard.filtros.forEach(f => { if(f.fonte_dados) carregarColunasFiltro(f, true); });
      dashboard.widgets.forEach((w, i) => { if(w.fonte_dados) carregarColunas(w, i, true); });
    }
  } catch (err) {
    console.error("Erro ao carregar dashboard", err);
  }
};

const excluirDashboard = async () => {
  if (!dashboardSelecionadoId.value) return;
  if (!confirm('Deseja excluir permanentemente este Dashboard e todos os seus gráficos?')) return;
  try {
    const res = await api.delete(`/dashboard-builder/excluir/${dashboardSelecionadoId.value}`);
    if (res.data.sucesso) {
      iniciarNovoDashboard();
      carregarListaDashboards();
    }
  } catch (error) {
    console.error("Erro ao excluir", error);
  }
};

// --- MANIPULAÇÃO DE ELEMENTOS ---
const adicionarFiltro = () => dashboard.filtros.push({ nome: '', fonte_dados: '', coluna: '', colunasDisponiveis: [] });
const removerFiltro = (index) => dashboard.filtros.splice(index, 1);

const carregarColunasFiltro = async (filtro, mantemColuna = false) => {
  if (!filtro.fonte_dados) return filtro.colunasDisponiveis = [];
  try {
    const res = await api.get(`/dashboard-builder/colunas/${filtro.fonte_dados}`);
    if (res.data.sucesso) {
      filtro.colunasDisponiveis = res.data.colunas;
      if (!mantemColuna) filtro.coluna = ''; 
    }
  } catch (error) {
    console.error("Erro ao carregar colunas do filtro");
  }
};

const adicionarWidget = () => {
  dashboard.widgets.push({
    titulo: '', tipo_grafico: 'barras_horizontais', tamanho_coluna: 4, fonte_dados: '', 
    configuracao: { 
      aba: 'Visão Geral', eixo_y: '', eixo_y_secundario: '', serie: '', ordem_series: '', 
      operacao: 'soma', eixo_x: '', eixo_x_b: '', formato: 'numero', 
      cor: '#8fbce6', cor_secundaria: '#bdc3c7', cor_terciaria: '#95a5a6',
      colunas_tabela: [], labels_colunas: {}
    },
    colunasDisponiveis: [], previewLoading: false, previewError: false, previewErrorMsg: '', 
    rawData: [], kpiValue: 0, listaValores: [], tabelaValores: [], heatmapData: [], heatmapMax: 0
  });
};

const removerWidget = (index) => {
  const domId = `preview-echart-${index}`;
  if(chartInstances[domId]) {
    chartInstances[domId].dispose();
    delete chartInstances[domId];
  }
  dashboard.widgets.splice(index, 1);
};

const carregarColunas = async (widget, index, mantemEixos = false) => {
  if (!widget.fonte_dados) return widget.colunasDisponiveis = [];
  try {
    const res = await api.get(`/dashboard-builder/colunas/${widget.fonte_dados}`);
    if (res.data.sucesso) {
      widget.colunasDisponiveis = res.data.colunas;
      if(!mantemEixos) {
        widget.configuracao.eixo_x = ''; 
        widget.configuracao.eixo_y = '';
        widget.configuracao.eixo_y_secundario = ''; 
        widget.configuracao.serie = ''; 
        widget.configuracao.eixo_x_b = '';
        widget.configuracao.colunas_tabela = [];
        widget.configuracao.labels_colunas = {};
      }
    }
  } catch (error) {
    console.error("Erro ao carregar colunas do widget");
  }
};

// --- LÓGICA DE PROCESSAMENTO DE DADOS ---
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

const extrairValoresUnicos = (dadosPuros, eixoCategoria) => {
  const valores = dadosPuros.map(linha => formatarLabel(linha[eixoCategoria])).filter(v => v !== 'Não Informado');
  return [...new Set(valores)].sort();
};

// --- PREVIEW E RENDERIZAÇÃO ---
const gerarPreview = async (widget, index) => {
  if (!widget.fonte_dados) return alert("Selecione a View primeiro.");
  widget.previewError = false; 
  widget.previewErrorMsg = ''; 
  widget.previewLoading = true;

  try {
    const res = await api.post('/dashboard-builder/extrair', { fonte_dados: widget.fonte_dados, filtros: {} });
    if (res.data.sucesso && res.data.dados.length > 0) {
      widget.rawData = res.data.dados;
      widget.previewLoading = false; 
      await nextTick(); 
      await processarERenderizarPreview(widget, index);
    } else {
      widget.previewLoading = false; 
      widget.previewError = true; 
      widget.previewErrorMsg = "Nenhum dado retornado da View.";
    }
  } catch (err) {
    widget.previewLoading = false; 
    widget.previewError = true; 
    widget.previewErrorMsg = "Erro na requisição ao backend.";
  }
};

const processarERenderizarPreview = async (widget, index) => {
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
      return;
    }

    if (widget.tipo_grafico === 'lista') {
      widget.listaValores = extrairValoresUnicos(widget.rawData, config.eixo_y);
      return;
    }

    if (widget.tipo_grafico === 'tabela') {
      widget.tabelaValores = widget.rawData.slice(0, 500); 
      return;
    }

    const agrupado = agruparDados(widget.rawData, config);

    if (widget.tipo_grafico === 'heatmap') {
      widget.heatmapData = agrupado.heatmapData; 
      widget.heatmapMax = agrupado.maxVal; 
      return;
    }

    const domId = `preview-echart-${index}`;
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
    widget.previewError = true; 
    widget.previewErrorMsg = `Erro na renderização. Cheque os Eixos.`;
  }
};

const salvarDashboard = async () => {
  salvando.value = true;
  try {
    const payload = {
      titulo: dashboard.titulo, 
      descricao: dashboard.descricao,
      filtros: dashboard.filtros.map(f => { const { colunasDisponiveis, ...clean } = f; return clean; }),
      widgets: dashboard.widgets.map(w => { const { colunasDisponiveis, previewLoading, previewError, previewErrorMsg, rawData, kpiValue, listaValores, tabelaValores, heatmapData, heatmapMax, ...clean } = w; return clean; })
    };

    let res;
    if (dashboardSelecionadoId.value) {
      res = await api.put(`/dashboard-builder/editar/${dashboardSelecionadoId.value}`, payload);
    } else {
      res = await api.post('/dashboard-builder/salvar', payload);
    }

    if (res.data.sucesso) {
      alert(dashboardSelecionadoId.value ? 'Dashboard Atualizado!' : 'Painel Criado!');
      router.push(`/dashboard-dinamico/${dashboardSelecionadoId.value || res.data.id}`);
    }
  } catch (error) {
    alert('Erro ao salvar no banco.');
  } finally { 
    salvando.value = false; 
  }
};
</script>

<style scoped>
/* ESTILOS COMUNS */
.builder-container { max-width: 1400px; margin: 0 auto; padding: 2rem 1rem; font-family: 'Segoe UI', sans-serif; }
.header-n { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.header-titles h1 { margin: 0; color: #2c3e50; font-size: 1.8rem; display: flex; align-items: center; gap: 0.5rem; }
.header-titles p { margin: 0.5rem 0 0 0; color: #7f8c8d; }
.header-actions { display: flex; gap: 1rem; }
.btn-novo { display: flex; align-items: center; gap: 0.4rem; background: #34495e; color: white; padding: 0.8rem 1.5rem; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.3s; }
.btn-novo:hover { background: #2c3e50; }
.btn-salvar { display: flex; align-items: center; gap: 0.4rem; background: #27ae60; color: white; padding: 0.8rem 1.5rem; border: none; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: background 0.3s; }
.btn-salvar:hover:not(:disabled) { background: #2ecc71; }
.btn-salvar:disabled { background: #95a5a6; cursor: not-allowed; }
.btn-excluir-dash { display: flex; align-items: center; gap: 0.4rem; background: #c0392b; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.3s; }
.btn-excluir-dash:hover { background: #a93226; }

.card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.card h2 { margin-top: 0; color: #34495e; font-size: 1.2rem; border-bottom: 2px solid #ecf0f1; padding-bottom: 0.5rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;}

.config-section { background: #fafbfc; border: 1px solid #e0e6ed; border-radius: 6px; padding: 1rem; margin-bottom: 1.5rem; }
.section-title { margin-top: 0; margin-bottom: 1rem; font-size: 0.95rem; color: #2980b9; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 0.4rem; }
.form-group-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.w-50 { flex: 1; min-width: 250px; }
.form-group { display: flex; flex-direction: column; margin-bottom: 1.2rem; }
.form-group label { font-size: 0.85rem; font-weight: bold; color: #34495e; margin-bottom: 0.4rem; }
.dica { font-weight: normal; color: #95a5a6; font-size: 0.75rem; margin-left: 0.5rem; font-style: italic; }
.input-base { padding: 0.6rem; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 0.95rem; background-color: #fff; transition: border-color 0.2s; }
.input-base:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,0.1); }
.input-small { padding: 0.3rem 0.5rem; font-size: 0.85rem; max-width: 200px;}
.coluna-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid #f0f0f0;}

.divisor { border: 0; height: 1px; background: #e0e6ed; margin: 2.5rem 0; }
.widgets-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.widgets-header h2 { margin: 0; color: #2c3e50; }
.badge { background: #3498db; color: white; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
.widget-card { background: white; border: 1px solid #e0e6ed; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.widget-card-header { padding: 1rem 1.5rem; background: #f8f9fa; border-bottom: 1px solid #e0e6ed; display: flex; justify-content: space-between; align-items: center; }
.widget-card-header h3 { margin: 0; color: #2c3e50; font-size: 1.1rem; }
.widget-card-body { display: grid; grid-template-columns: 1fr 1fr; }
.widget-form { padding: 1.5rem; border-right: 1px solid #e0e6ed; }
.widget-preview-area { padding: 1.5rem; background: #fdfdfe; display: flex; flex-direction: column; }
.preview-header { font-weight: bold; color: #bdc3c7; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center; }
.preview-content { flex-grow: 1; display: flex; justify-content: center; align-items: center; border: 2px dashed #e0e6ed; border-radius: 8px; background: white; padding: 1rem; min-height: 350px;}
.preview-status { color: #7f8c8d; font-size: 0.95rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.preview-status.error { color: #e74c3c; font-weight: bold; }
.preview-status.empty { color: #bdc3c7; font-style: italic; }
.preview-render { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; }
.spinner { border: 3px solid rgba(0,0,0,0.1); width: 20px; height: 20px; border-radius: 50%; border-left-color: #3498db; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.btn-remover { display: flex; align-items: center; gap: 0.4rem; background: white; color: #e74c3c; border: 1px solid #e74c3c; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; transition: background 0.2s; }
.btn-remover:hover { background: #fee; }
.btn-preview { display: flex; justify-content: center; align-items: center; gap: 0.5rem; background: #34495e; color: white; border: none; padding: 0.8rem; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 1rem; width: 100%; transition: background 0.3s; }
.btn-preview:hover { background: #2c3e50; }
.btn-add-widget { display: flex; justify-content: center; align-items: center; gap: 0.5rem; width: 100%; padding: 1.2rem; background: #f8f9fa; border: 2px dashed #bdc3c7; color: #7f8c8d; font-size: 1.1rem; font-weight: bold; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
.btn-add-widget:hover { background: #edf2f7; border-color: #3498db; color: #3498db; }
.color-picker { width: 100%; height: 42px; padding: 0; border: 1px solid #bdc3c7; border-radius: 4px; cursor: pointer; }

/* VISUAIS DO PREVIEW */
.kpi-display { display: flex; flex-direction: column; align-items: center; text-align: center; }
.kpi-value { font-size: 4rem; font-weight: 800; line-height: 1; margin-bottom: 0.5rem; }
.kpi-label { color: #7f8c8d; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
.echart-container { width: 100%; height: 350px; }

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

@media (max-width: 1024px) {
  .widget-card-body { grid-template-columns: 1fr; }
  .widget-form { border-right: none; border-bottom: 1px solid #e0e6ed; }
}
</style>