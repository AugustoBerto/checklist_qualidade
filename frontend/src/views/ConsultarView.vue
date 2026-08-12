<template>
  <div class="page-container">
    <div class="header-n">
      <div class="header-titles">
        <h1><i class="mdi mdi-text-box-search-outline"></i> Consultar Histórico</h1>
        <p>Acompanhe e visualize os checklists de qualidade finalizados.</p>
      </div>
    </div>
    
    <div class="card">
      <form class="toolbar" @submit.prevent="buscarChecklists(1)">
        <div class="search-box">
          <i class="mdi mdi-magnify search-icon"></i>
          <input type="text" v-model="filtros.usuario" placeholder="Responsável" class="input-search">
        </div>
        <input type="date" v-model="filtros.dataInicio"><input type="date" v-model="filtros.dataFim">
        <button type="submit" class="btn-view">Filtrar</button>
      </form>

      <div v-if="isLoading" class="status-message loading-state">
        <div class="spinner"></div> 
        <p>Carregando relatórios...</p>
      </div>
      
      <div v-else-if="error" class="status-message error">
        <i class="mdi mdi-alert-circle-outline"></i>
        <p>{{ error }}</p>
      </div>
      
      <div v-else-if="checklists.length === 0" class="status-message empty-state">
        <i class="mdi mdi-clipboard-text-off-outline"></i>
        <p>Nenhum checklist encontrado para esta busca.</p>
      </div>

      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Modelo & Linha - Setor</th>
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
                  - {{ checklist.nome_setor }}
                </div>
              </td>
              
              <td>
                <div class="user-cell">
                  <i class="mdi mdi-account-circle-outline text-muted"></i>
                  {{ checklist.nome_usuario }}
                </div>
              </td>
              <td>
                <div class="date-cell">
                  <i class="mdi mdi-calendar-clock-outline text-muted"></i>
                  {{ formatarData(checklist.data_envio) }}
                </div>
              </td>
              <td class="text-right">
                <router-link :to="`/detalhe/${checklist.id}`" class="btn-view">
                  <i class="mdi mdi-eye-outline"></i>
                  Visualizar
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="paginacao.totalPages > 1" class="toolbar">
        <button class="btn-view" :disabled="paginacao.page === 1" @click="buscarChecklists(paginacao.page - 1)">Anterior</button>
        <span>Página {{ paginacao.page }} de {{ paginacao.totalPages }}</span>
        <button class="btn-view" :disabled="paginacao.page === paginacao.totalPages" @click="buscarChecklists(paginacao.page + 1)">Próxima</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';

const checklists = ref([]);
const isLoading = ref(true);
const error = ref(null);
const filtros = ref({ usuario: '', dataInicio: '', dataFim: '' });
const paginacao = ref({ page: 1, totalPages: 1, total: 0, pageSize: 25 });

const formatarData = (dataString) => {
  if (!dataString) return '--/--/---- --:--';
  return new Date(dataString).toLocaleString('pt-BR', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  });
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

onMounted(buscarChecklists);
</script>

<style scoped>
/* Adicione apenas este estilo extra para o badge da célula, o resto da sua folha de estilo fica igual! */
.celula-badge {
  display: inline-block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}
/* ... restante do seu css atual ... */
.page-container { max-width: 1200px; margin: 0 auto; padding: 2rem; font-family: 'Segoe UI', system-ui, sans-serif; }
.header-n { margin-bottom: 2rem; }
.header-titles h1 { margin: 0; color: var(--text-primary, #1e293b); font-size: 2rem; display: flex; align-items: center; gap: 0.8rem; }
.header-titles p { margin: 0.5rem 0 0 0; color: var(--text-secondary, #64748b); font-size: 1.1rem; }
.card { background: var(--bg-card, #ffffff); padding: 2rem; border-radius: var(--radius-lg, 16px); box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05)); border: 1px solid var(--border-color, #e2e8f0); }
.toolbar { margin-bottom: 1.5rem; display: flex; justify-content: flex-end; }
.search-box { position: relative; width: 100%; max-width: 400px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.2rem; }
.input-search { width: 100%; padding: 0.8rem 1rem 0.8rem 2.5rem; border: 2px solid var(--border-color, #e2e8f0); border-radius: var(--radius-md, 8px); font-size: 1rem; color: var(--text-primary, #1e293b); background-color: #f8fafc; transition: all 0.2s; box-sizing: border-box; }
.input-search:focus { outline: none; border-color: var(--primary, #2563eb); background-color: #ffffff; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; }
.data-table th { background: #f8fafc; padding: 1.2rem 1rem; color: #475569; font-weight: 600; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color, #e2e8f0); }
.data-table td { padding: 1.2rem 1rem; border-bottom: 1px solid var(--border-color, #e2e8f0); color: var(--text-primary, #1e293b); vertical-align: middle; }
.data-table tbody tr { transition: background-color 0.2s; }
.data-table tbody tr:hover { background-color: #f1f5f9; }
.text-right { text-align: right; }
.text-muted { color: #94a3b8; margin-right: 6px; font-size: 1.2rem; }
.user-cell, .date-cell { display: flex; align-items: center; }
.btn-view { display: inline-flex; align-items: center; gap: 6px; background-color: #eff6ff; color: var(--primary, #2563eb); text-decoration: none; padding: 0.6rem 1.2rem; border-radius: var(--radius-md, 8px); font-size: 0.95rem; font-weight: 600; transition: all 0.2s; border: 1px solid #bfdbfe; }
.btn-view:hover { background-color: var(--primary, #2563eb); color: #ffffff; border-color: var(--primary, #2563eb); transform: translateY(-1px); box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }
.status-message { text-align: center; padding: 4rem 2rem; color: var(--text-secondary, #64748b); }
.status-message i { font-size: 4rem; margin-bottom: 1rem; display: block; }
.status-message p { font-size: 1.1rem; margin: 0; }
.error i, .error p { color: var(--danger, #ef4444); }
.spinner { border: 4px solid #e2e8f0; width: 40px; height: 40px; border-radius: 50%; border-left-color: var(--primary, #2563eb); animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .page-container { padding: 1rem; }
  .header-titles h1 { font-size: 1.5rem; }
  .card { padding: 1rem; }
  .toolbar { justify-content: center; }
  .search-box { max-width: 100%; }
  .data-table th, .data-table td { padding: 1rem 0.5rem; font-size: 0.9rem; }
  .data-table { min-width: 620px; }
  .btn-view { min-height: 44px; padding: 0.5rem 0.8rem; font-size: 0.85rem; }
  .btn-view i { display: none; }
}
</style>
