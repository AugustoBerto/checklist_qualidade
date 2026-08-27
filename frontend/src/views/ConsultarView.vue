<template>
  <div class="page-container">
    <PageHeader
      title="Consultar Histórico"
      subtitle="Acompanhe e visualize os checklists de qualidade finalizados."
      icon="mdi mdi-text-box-search-outline"
    />
    
    <div class="card">
      <!-- Barra de Ferramentas e Filtros Reutilizável -->
      <TableToolbar
        v-model="filtros.usuario"
        placeholder="Buscar por responsável / inspetor..."
        :has-active-filters="temFiltrosAtivos"
        @clear="limparFiltros"
        @search="buscarChecklists(1)"
      >
        <template #filters>
          <div class="date-filters">
            <input type="date" v-model="filtros.dataInicio" class="input-date" title="Data Inicial">
            <span class="date-separator">até</span>
            <input type="date" v-model="filtros.dataFim" class="input-date" title="Data Final">
          </div>
        </template>
      </TableToolbar>

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
            <th>Setor</th>
            <th>Linha / Célula</th>
            <th>Responsável</th>
            <th>Data e Hora</th>
            <th class="col-acoes">Ações</th>
          </tr>
        </template>

        <template #body>
          <tr v-for="checklist in checklists" :key="checklist.id">
            <td>
              <div class="model-cell">
                <i class="mdi mdi-clipboard-text-outline model-icon"></i>
                <strong class="model-name">{{ checklist.nome_modelo }}</strong>
              </div>
            </td>

            <td>
              <span class="badge-setor">{{ checklist.nome_setor || 'Geral' }}</span>
            </td>

            <td>
              <span v-if="checklist.nome_celula" class="cell-tag">
                <i class="mdi mdi-factory"></i>
                <span>{{ checklist.nome_celula }}</span>
              </span>
              <span v-else class="text-muted">--</span>
            </td>
            
            <td>
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

            <td class="col-acoes">
              <router-link :to="`/detalhe/${checklist.id}`" class="btn-view" title="Visualizar detalhes do relatório">
                <i class="mdi mdi-eye-outline"></i>
                <span>Visualizar</span>
              </router-link>
            </td>
          </tr>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api from '../services/api';
import PageHeader from '../components/PageHeader.vue';
import TableToolbar from '../components/TableToolbar.vue';
import DataTable from '../components/DataTable.vue';
import { formatarDataHora, formatarNomeCurto } from '../services/formatters';

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
  buscarChecklists(1);
};

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

.date-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-date {
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: var(--radius-md, 8px);
  font-size: 0.9rem;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  min-height: 42px;
  box-sizing: border-box;
}

.date-separator {
  color: var(--text-secondary, #64748b);
  font-size: 0.88rem;
}

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
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  transition: all 0.2s ease;
  border: 1px solid #fecdd3;
  min-height: 38px;
}

.btn-view:hover {
  background-color: var(--primary, #b1072c);
  color: #ffffff;
  border-color: var(--primary, #b1072c);
}

@media (max-width: 768px) {
  .page-container { padding: 1rem 0.5rem; }
  .card { padding: 1rem; border-radius: 12px; }
  .date-filters {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .input-date {
    flex: 1;
    min-width: 0;
    min-height: 42px;
  }
}
</style>
