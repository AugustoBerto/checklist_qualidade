<template>
  <div class="page-container">
    <PageHeader
      title="Consultar Histórico"
      subtitle="Acompanhe e visualize os checklists de qualidade finalizados."
      icon="mdi mdi-text-box-search-outline"
    />
    
    <div class="card">
      <!-- Painel de Busca e Filtros Estruturado -->
      <div class="consultar-filtros-card">
        <!-- Linha Superior: Busca Ampla + Botão Limpar Filtros -->
        <div class="toolbar-search-row">
          <div class="search-box">
            <label class="filter-field-label">Busca Global</label>
            <div class="search-input-wrapper">
              <i class="mdi mdi-magnify search-icon"></i>
              <input
                type="text"
                v-model="filtros.busca"
                @input="onInputBusca"
                placeholder="Buscar por modelo, responsável, setor ou célula..."
                class="input-search"
              >
              <button
                v-if="filtros.busca"
                type="button"
                class="clear-input-btn"
                @click="limparBusca"
                title="Limpar busca"
              >
                <i class="mdi mdi-close"></i>
              </button>
            </div>
          </div>

          <button
            v-if="temFiltrosAtivos"
            type="button"
            class="btn-limpar-filtros"
            @click="limparFiltros"
            title="Limpar todos os filtros"
          >
            <i class="mdi mdi-filter-off-outline"></i>
            <span>Limpar Filtros</span>
          </button>
        </div>

        <!-- Linha Inferior: Grid de Filtros Avançados -->
        <div class="toolbar-filters-grid">
          <!-- Filtro por Setor -->
          <div class="filter-field">
            <label class="filter-field-label">Setor</label>
            <select v-model="filtros.setorId" class="filter-select" title="Filtrar por Setor">
              <option value="">Todos os Setores</option>
              <option v-for="s in setoresOptions" :key="s.id" :value="s.id">
                {{ s.nome }}
              </option>
            </select>
          </div>

          <!-- Filtro por Modelo -->
          <div class="filter-field">
            <label class="filter-field-label">Modelo</label>
            <select v-model="filtros.modeloId" class="filter-select" title="Filtrar por Modelo">
              <option value="">Todos os Modelos</option>
              <option v-for="m in modelosOptions" :key="m.id" :value="m.id">
                {{ m.nome }}
              </option>
            </select>
          </div>

          <!-- Filtro por Célula / Linha -->
          <div class="filter-field">
            <label class="filter-field-label">Célula / Linha</label>
            <select v-model="filtros.celulaId" class="filter-select" title="Filtrar por Célula / Linha">
              <option value="">Todas as Células</option>
              <option v-for="c in celulasFiltradas" :key="c.id" :value="c.id">
                {{ c.nome }}
              </option>
            </select>
          </div>

          <!-- Filtro de Período (Datas) -->
          <div class="filter-field filter-field-periodo">
            <label class="filter-field-label">Período de Envio</label>
            <div class="date-range-box">
              <input type="date" v-model="filtros.dataInicio" class="input-date" title="Data Inicial">
              <span class="date-separator">até</span>
              <input type="date" v-model="filtros.dataFim" class="input-date" title="Data Final">
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela Reutilizável com Feedback e Paginação Integrados -->
      <DataTable
        :items="checklists"
        :is-loading="isLoading"
        :error="error"
        :show-pagination="true"
        :page="paginacao.page"
        :total-pages="paginacao.totalPages"
        :total="paginacao.total"
        loading-message="Carregando histórico de relatórios..."
        empty-title="Nenhum checklist encontrado"
        empty-message="Não foram encontrados relatórios para os filtros informados."
        empty-icon="mdi mdi-text-box-search-outline"
        @retry="buscarChecklists(1)"
        @change-page="buscarChecklists"
      >
        <template #header>
          <tr>
            <th>Modelo</th>
            <th class="hide-mobile">Setor</th>
            <th class="hide-mobile">Linha / Célula</th>
            <th class="hide-mobile">Responsável</th>
            <th>Data e Hora</th>
            <th class="col-chevron"></th>
          </tr>
        </template>

        <template #body>
          <tr
            v-for="checklist in checklists"
            :key="checklist.id"
            class="clickable-row"
            @click="abrirDetalhe(checklist.id)"
            title="Toque para visualizar os detalhes"
          >
            <td>
              <div class="model-cell">
                <i class="mdi mdi-clipboard-text-outline model-icon"></i>
                <div class="model-info">
                  <strong class="model-name">{{ checklist.nome_modelo }}</strong>
                  <span class="model-sub-mobile show-mobile-only">
                    {{ checklist.nome_setor || 'Geral' }} · {{ formatarNomeCurto(checklist.nome_usuario) }}
                  </span>
                </div>
              </div>
            </td>

            <td class="hide-mobile">
              <span class="badge-setor">{{ checklist.nome_setor || 'Geral' }}</span>
            </td>

            <td class="hide-mobile">
              <span v-if="checklist.nome_celula" class="cell-tag">
                <i class="mdi mdi-factory"></i>
                <span>{{ checklist.nome_celula }}</span>
              </span>
              <span v-else class="text-muted">--</span>
            </td>
            
            <td class="hide-mobile">
              <div class="user-cell" :title="checklist.nome_usuario">
                <i class="mdi mdi-account-circle-outline text-muted"></i>
                <span class="user-name">{{ formatarNomeCurto(checklist.nome_usuario) }}</span>
              </div>
            </td>

            <td>
              <div class="date-cell">
                <i class="mdi mdi-calendar-clock-outline text-muted"></i>
                <span>{{ formatarDataHora(checklist.data_envio) }}</span>
              </div>
            </td>

            <td class="col-chevron">
              <i class="mdi mdi-chevron-right"></i>
            </td>
          </tr>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import PageHeader from '../components/PageHeader.vue';
import DataTable from '../components/DataTable.vue';
import { formatarDataHora, formatarNomeCurto } from '../services/formatters';

const router = useRouter();
const checklists = ref([]);
const setoresOptions = ref([]);
const modelosOptions = ref([]);
const celulasOptions = ref([]);

let timerBusca = null;

const abrirDetalhe = (id) => {
  router.push(`/detalhe/${id}`);
};

const isLoading = ref(true);
const error = ref(null);
const filtros = ref({
  busca: '',
  setorId: '',
  modeloId: '',
  celulaId: '',
  dataInicio: '',
  dataFim: ''
});
const paginacao = ref({ page: 1, totalPages: 1, total: 0, pageSize: 25 });

const celulasFiltradas = computed(() => {
  if (!filtros.value.setorId) return celulasOptions.value;
  return celulasOptions.value.filter(c => !c.id_setor_fk || String(c.id_setor_fk) === String(filtros.value.setorId));
});

watch(() => filtros.value.setorId, (novoSetor) => {
  if (novoSetor && filtros.value.celulaId) {
    const celulaPertenceAoSetor = celulasFiltradas.value.some(c => String(c.id) === String(filtros.value.celulaId));
    if (!celulaPertenceAoSetor) {
      filtros.value.celulaId = '';
    }
  }
});

const temFiltrosAtivos = computed(() => {
  return Boolean(
    filtros.value.busca ||
    filtros.value.setorId ||
    filtros.value.modeloId ||
    filtros.value.celulaId ||
    filtros.value.dataInicio ||
    filtros.value.dataFim
  );
});

const onInputBusca = () => {
  clearTimeout(timerBusca);
  timerBusca = setTimeout(() => {
    buscarChecklists(1);
  }, 350);
};

const limparBusca = () => {
  filtros.value.busca = '';
  buscarChecklists(1);
};

const limparFiltros = () => {
  filtros.value = {
    busca: '',
    setorId: '',
    modeloId: '',
    celulaId: '',
    dataInicio: '',
    dataFim: ''
  };
  buscarChecklists(1);
};

const extrairArray = (resData) => {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.dados)) return resData.dados;
  if (resData && resData.dados && Array.isArray(resData.dados.dados)) return resData.dados.dados;
  return [];
};

const carregarOpcoesFiltros = async () => {
  try {
    const [resSetores, resModelos, resCelulas] = await Promise.all([
      api.get('/cadastros/setores'),
      api.get('/cadastros/modelos'),
      api.get('/cadastros/celulas')
    ]);
    setoresOptions.value = extrairArray(resSetores.data);
    modelosOptions.value = extrairArray(resModelos.data);
    celulasOptions.value = extrairArray(resCelulas.data);
  } catch (err) {
    console.error('Erro ao carregar opções de filtros:', err);
  }
};

const buscarChecklists = async (page = 1) => {
  isLoading.value = true;
  error.value = null;

  try {
    const params = {
      page,
      pageSize: 25
    };
    if (filtros.value.busca) params.busca = filtros.value.busca;
    if (filtros.value.setorId) params.setorId = filtros.value.setorId;
    if (filtros.value.modeloId) params.modeloId = filtros.value.modeloId;
    if (filtros.value.celulaId) params.celulaId = filtros.value.celulaId;
    if (filtros.value.dataInicio) params.dataInicio = filtros.value.dataInicio;
    if (filtros.value.dataFim) params.dataFim = filtros.value.dataFim;

    const res = await api.get('/submissoes', { params });
    
    if (res.data.sucesso) {
      checklists.value = res.data.dados;
      paginacao.value = res.data.paginacao;
    } else {
      error.value = res.data.mensagem;
    }
  } catch (err) {
    error.value = "Falha ao conectar com o servidor. Tente novamente.";
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

// 📌 Filtragem dinâmica imediata para qualquer alteração de filtro
watch(
  [
    () => filtros.value.setorId,
    () => filtros.value.modeloId,
    () => filtros.value.celulaId,
    () => filtros.value.dataInicio,
    () => filtros.value.dataFim
  ],
  () => {
    buscarChecklists(1);
  }
);

onMounted(() => {
  carregarOpcoesFiltros();
  buscarChecklists(1);
});
</script>

<style scoped>
.page-container {
  max-width: 1250px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.card {
  background: var(--bg-card, #ffffff);
  padding: 1.75rem;
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color, #e2e8f0);
}

/* ==========================================
   PAINEL DE BUSCA E FILTROS ESTRUTURADO
   ========================================== */
.consultar-filtros-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.toolbar-search-row {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  width: 100%;
}

.search-box {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 1.2rem;
  pointer-events: none;
}

.input-search {
  width: 100%;
  padding: 0.65rem 2.2rem 0.65rem 2.4rem;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: var(--radius-md, 8px);
  font-size: 0.95rem;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  box-sizing: border-box;
  min-height: 42px;
  transition: all 0.2s ease;
}

.input-search:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.12);
}

.clear-input-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.2s;
}

.clear-input-btn:hover {
  color: var(--primary, #b1072c);
}

.btn-limpar-filtros {
  background: #f8fafc;
  border: 1.5px solid var(--border-color, #cbd5e1);
  color: #475569;
  border-radius: var(--radius-md, 8px);
  padding: 0.6rem 1rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 42px;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-limpar-filtros:hover {
  background: #fee2e2;
  color: var(--danger, #ef4444);
  border-color: #fca5a5;
}

.toolbar-filters-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr)) minmax(280px, auto);
  gap: 0.85rem;
  align-items: end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.filter-field-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.filter-select {
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: var(--radius-md, 8px);
  font-size: 0.88rem;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  min-height: 40px;
  cursor: pointer;
  box-sizing: border-box;
  font-family: inherit;
  transition: all 0.15s ease;
}

.filter-select:hover {
  background-color: #ffffff;
  border-color: #94a3b8;
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.12);
}

.date-range-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.input-date {
  padding: 0.55rem 0.7rem;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  min-height: 40px;
  box-sizing: border-box;
  font-family: inherit;
  flex: 1;
  min-width: 125px;
}

.input-date:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.12);
}

.date-separator {
  color: var(--text-secondary, #64748b);
  font-size: 0.82rem;
  font-weight: 500;
}

/* ==========================================
   TABELA E CÉLULAS
   ========================================== */
.model-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-icon {
  font-size: 1.15rem;
  color: var(--primary, #b1072c);
}

.model-name {
  color: var(--text-primary, #0f172a);
  font-weight: 700;
}

.badge-setor {
  background: #fff1f2;
  color: var(--primary, #b1072c);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.cell-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.88rem;
  color: #475569;
  font-weight: 500;
}

.user-cell, .date-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-name {
  font-weight: 500;
  color: var(--text-primary, #0f172a);
}

.text-muted {
  color: #94a3b8;
  font-size: 1.15rem;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-sub-mobile {
  font-size: 0.78rem;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
}

.show-mobile-only {
  display: none;
}

/* ==========================================
   RESPONSIVIDADE (TABLET & MOBILE)
   ========================================== */
@media (max-width: 1080px) {
  .toolbar-filters-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .show-mobile-only {
    display: inline-block;
  }
  .page-container { padding: 1rem 0.5rem; }
  .card { padding: 1rem; border-radius: 12px; }
  
  .toolbar-search-row {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-limpar-filtros {
    width: 100%;
    justify-content: center;
  }
  
  .toolbar-filters-grid {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }
  .date-range-box {
    width: 100%;
  }
  .input-date {
    width: 100%;
  }
}
</style>
