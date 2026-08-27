<template>
  <div class="page-container">
    <PageHeader
      title="Consultar Histórico"
      subtitle="Acompanhe e visualize os checklists de qualidade finalizados."
      icon="mdi mdi-text-box-search-outline"
    />
    
    <div class="card">
      <div class="toolbar">
        <div class="search-box">
          <i class="mdi mdi-magnify search-icon"></i>
          <input
            type="text"
            v-model="filtros.usuario"
            placeholder="Buscar por responsável / inspetor..."
            class="input-search"
          >
          <button
            v-if="filtros.usuario"
            type="button"
            class="clear-input-btn"
            @click="filtros.usuario = ''"
            title="Limpar texto"
          >
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="date-filters">
          <input type="date" v-model="filtros.dataInicio" class="input-date" title="Data Inicial">
          <span class="date-separator">até</span>
          <input type="date" v-model="filtros.dataFim" class="input-date" title="Data Final">
        </div>

        <button
          v-if="temFiltrosAtivos"
          type="button"
          class="btn-outline btn-limpar-filtros"
          @click="limparFiltros"
          title="Limpar todos os filtros"
        >
          <i class="mdi mdi-filter-off-outline"></i>
          <span>Limpar</span>
        </button>
      </div>

      <FeedbackState
        v-if="isLoading"
        type="loading"
        message="Carregando histórico de relatórios..."
      />
      
      <FeedbackState
        v-else-if="error"
        type="error"
        title="Erro ao carregar relatórios"
        :message="error"
        :show-retry="true"
        @retry="buscarChecklists(1)"
      />
      
      <FeedbackState
        v-else-if="checklists.length === 0"
        type="empty"
        title="Nenhum checklist encontrado"
        message="Não foram encontrados registros para o filtro informado."
      />

      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Modelo & Linha / Setor</th>
              <th>Inspetor / Responsável</th>
              <th>Data e Hora do Envio</th>
              <th class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="checklist in checklists" :key="checklist.id">
              <td>
                <strong>{{ checklist.nome_modelo }}</strong>
                <div class="celula-badge" v-if="checklist.nome_celula">
                  <i class="mdi mdi-factory"></i> {{ checklist.nome_celula }}
                  <span v-if="checklist.nome_setor"> - {{ checklist.nome_setor }}</span>
                </div>
              </td>
              
              <td>
                <div class="user-cell">
                  <i class="mdi mdi-account-circle-outline text-muted"></i>
                  <span>{{ checklist.nome_usuario }}</span>
                </div>
              </td>
              <td>
                <div class="date-cell">
                  <i class="mdi mdi-calendar-clock-outline text-muted"></i>
                  <span>{{ formatarDataHora(checklist.data_envio) }}</span>
                </div>
              </td>
              <td class="text-right">
                <router-link :to="`/detalhe/${checklist.id}`" class="btn-view">
                  <i class="mdi mdi-eye-outline"></i>
                  <span>Visualizar</span>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="paginacao.totalPages > 1" class="pagination-bar">
        <button class="btn-page" :disabled="paginacao.page === 1" @click="buscarChecklists(paginacao.page - 1)">
          <i class="mdi mdi-chevron-left"></i> Anterior
        </button>
        <span class="page-info">Página <strong>{{ paginacao.page }}</strong> de <strong>{{ paginacao.totalPages }}</strong></span>
        <button class="btn-page" :disabled="paginacao.page === paginacao.totalPages" @click="buscarChecklists(paginacao.page + 1)">
          Próxima <i class="mdi mdi-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api from '../services/api';
import PageHeader from '../components/PageHeader.vue';
import FeedbackState from '../components/FeedbackState.vue';
import { formatarDataHora } from '../services/formatters';

const checklists = ref([]);
const isLoading = ref(true);
const error = ref(null);
const filtros = ref({ usuario: '', dataInicio: '', dataFim: '' });
const paginacao = ref({ page: 1, totalPages: 1, total: 0, pageSize: 25 });

const temFiltrosAtivos = computed(() => {
  return Boolean(filtros.value.usuario || filtros.value.dataInicio || filtros.value.dataFim);
});

const limparFiltros = () => {
  filtros.value = { usuario: '', dataInicio: '', dataFim: '' };
};

let debounceTimer = null;

const buscarChecklists = async (page = 1) => {
  isLoading.value = true;
  error.value = null;

  try {
    const res = await api.get('/submissoes', { params: { ...filtros.value, page, pageSize: 25 } });
    
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

// 📌 Filtragem dinâmica com debounce para digitação de texto
watch(
  () => filtros.value.usuario,
  () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      buscarChecklists(1);
    }, 300);
  }
);

// 📌 Filtragem dinâmica imediata para seleção de datas
watch(
  [() => filtros.value.dataInicio, () => filtros.value.dataFim],
  () => {
    buscarChecklists(1);
  }
);

onMounted(buscarChecklists);
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

.toolbar {
  margin-bottom: 1.5rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 1.2rem;
}

.input-search {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.4rem;
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  font-size: 0.95rem;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  box-sizing: border-box;
  min-height: 44px;
}

.input-search:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.15);
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-date {
  padding: 0.7rem 0.85rem;
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  font-size: 0.9rem;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  min-height: 44px;
  box-sizing: border-box;
}

.date-separator {
  color: var(--text-secondary, #64748b);
  font-size: 0.88rem;
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
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s;
}

.clear-input-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.btn-limpar-filtros {
  min-height: 44px;
  padding: 0.7rem 1.1rem;
}

.table-container {
  overflow-x: auto;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 10px);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  background: #f8fafc;
  padding: 1rem;
  color: #475569;
  font-weight: 700;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-primary, #0f172a);
  vertical-align: middle;
  font-size: 0.95rem;
}

.data-table tbody tr:hover {
  background-color: #f8fafc;
}

.celula-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--primary, #b1072c);
  background: #fff1f2;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.user-cell, .date-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.text-muted {
  color: #94a3b8;
  font-size: 1.15rem;
}

.text-right {
  text-align: right;
}

.btn-view {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #fff1f2;
  color: var(--primary, #b1072c);
  text-decoration: none;
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  transition: all 0.2s;
  border: 1px solid #fecdd3;
  min-height: 40px;
}

.btn-view:hover {
  background-color: var(--primary, #b1072c);
  color: #ffffff;
  border-color: var(--primary, #b1072c);
}

.pagination-bar {
  margin-top: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.btn-page {
  background: #f8fafc;
  border: 1px solid var(--border-color, #cbd5e1);
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-page:hover:not(:disabled) {
  background: #eff6ff;
  color: var(--primary);
  border-color: #bfdbfe;
}

.btn-page:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .card { padding: 1rem; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .search-box { width: 100%; min-width: auto; }
  .date-filters { width: 100%; justify-content: space-between; }
  .input-date { flex: 1; }
  .btn-filtrar { width: 100%; justify-content: center; }
  .data-table { min-width: 600px; }
}
</style>
