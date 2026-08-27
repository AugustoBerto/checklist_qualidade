<template>
  <div class="page-container">
    <PageHeader
      title="Configurações Globais"
      subtitle="Gerencie as estruturas fundamentais para os checklists e relatórios."
      icon="mdi mdi-cogs"
    >
      <template #actions>
        <button @click="abrirModal()" class="btn-primary">
          <i class="mdi mdi-plus"></i>
          <span>Novo Registro</span>
        </button>
      </template>
    </PageHeader>

    <div class="tabs-container">
      <button 
        v-for="aba in abas" 
        :key="aba.id" 
        @click="mudarAba(aba.id)"
        class="tab-btn" 
        :class="{ active: abaAtiva === aba.id }"
      >
        <i :class="aba.icone"></i>
        <span>{{ aba.titulo }}</span>
      </button>
    </div>

    <div class="card">
      <TableToolbar
        v-model="termoBusca"
        :placeholder="`Buscar em ${nomeAbaAtiva.toLowerCase()}...`"
        :has-active-filters="Boolean(termoBusca)"
        @clear="termoBusca = ''"
      />

      <DataTable
        :items="dadosFiltrados"
        :is-loading="isLoading"
        :loading-message="`Carregando ${nomeAbaAtiva.toLowerCase()}...`"
        empty-title="Nenhum registro encontrado"
        :empty-message="termoBusca ? `Não encontramos registros em ${nomeAbaAtiva.toLowerCase()} para '${termoBusca}'.` : `Não existem registros cadastrados para ${nomeAbaAtiva}.`"
        empty-icon="mdi mdi-database-off-outline"
      >
        <template #header>
          <tr>
            <th class="col-id">ID</th>
            <th>Nome / Descrição</th>
            
            <th v-if="abaAtiva === 'celulas'">Setor Vinculado</th>
            <th v-if="abaAtiva === 'celulas'">Marca Vinculada</th>

            <th v-if="abaAtiva === 'turnos'">Horário Entrada</th>
            <th v-if="abaAtiva === 'turnos'">Horário Após Intervalo</th>
            
            <th class="col-acoes">Ações</th>
          </tr>
        </template>

        <template #body>
          <tr v-for="item in dadosFiltrados" :key="item.id || item.id_setor || item.id_unidade || item.id_celula">
            <td class="col-id">#{{ item.id || item.id_setor || item.id_unidade || item.id_marca || item.id_celula || item.id_turno }}</td>
            <td><strong>{{ item.nome || item.descricao }}</strong></td>
            
            <td v-if="abaAtiva === 'celulas'">
              <span class="badge badge-setor"><i class="mdi mdi-office-building"></i> {{ item.nome_setor || 'N/A' }}</span>
            </td>
            <td v-if="abaAtiva === 'celulas'">
              <span class="badge badge-marca"><i class="mdi mdi-tag"></i> {{ item.nome_marca || 'N/A' }}</span>
            </td>

            <td v-if="abaAtiva === 'turnos'" class="time-col">
              <i class="mdi mdi-login text-muted"></i> {{ formatarHora(item.entrada_inicio) }} às {{ formatarHora(item.entrada_fim) }}
            </td>
            <td v-if="abaAtiva === 'turnos'" class="time-col">
              <i class="mdi mdi-coffee text-muted"></i> {{ formatarHora(item.intervalo_inicio) }} às {{ formatarHora(item.intervalo_fim) }}
            </td>

            <td class="col-acoes">
              <div class="actions-cell">
                <button @click="abrirModal(item)" class="btn-icon edit" title="Editar" aria-label="Editar">
                  <i class="mdi mdi-pencil"></i>
                </button>
                <button @click="excluirItem(item.id || item.id_setor || item.id_unidade || item.id_marca || item.id_celula || item.id_turno)" class="btn-icon delete" title="Excluir" aria-label="Excluir">
                  <i class="mdi mdi-delete"></i>
                </button>
              </div>
            </td>
          </tr>
        </template>
      </DataTable>
    </div>

    <!-- Modal de Criação / Edição -->
    <BaseModal
      v-model="showModal"
      :title="`${form.id ? 'Editar' : 'Novo'} Registro - ${nomeAbaAtiva}`"
      :icon="abaInfo?.icone || 'mdi mdi-cogs'"
      max-width="560px"
    >
      <form @submit.prevent="salvarItem" id="formConfig">
        <div class="form-group">
          <label>Nome / Descrição</label>
          <input type="text" v-model="form.nome" required class="input-base" :placeholder="'Ex: ' + placeholderExemplo" />
        </div>

        <div v-if="abaAtiva === 'celulas'" class="dependencies-grid">
          <div class="form-group">
            <label>Setor Vinculado <span class="obrigatorio">*</span></label>
            <VueSelect
              v-model="form.id_setor_fk"
              :options="opcoesSetores"
              placeholder="Selecione um Setor..."
              :is-clearable="false"
            />
          </div>
          <div class="form-group">
            <label>Marca Vinculada (Opcional)</label>
            <VueSelect
              v-model="form.id_marca_fk"
              :options="opcoesMarcas"
              placeholder="Geral / Sem Marca Específica"
              :is-clearable="true"
            />
          </div>
        </div>

        <div v-if="abaAtiva === 'turnos'" class="time-grid-container">
          <div class="time-row">
            <div class="form-group">
              <label><i class="mdi mdi-clock-start"></i> Entrada (Início)</label>
              <input type="time" v-model="form.entrada_inicio" required class="input-base" />
            </div>
            <div class="form-group">
              <label><i class="mdi mdi-clock-end"></i> Entrada (Fim)</label>
              <input type="time" v-model="form.entrada_fim" required class="input-base" />
            </div>
          </div>

          <div class="time-row separator">
            <div class="form-group">
              <label><i class="mdi mdi-coffee"></i> Intervalo (Início)</label>
              <input type="time" v-model="form.intervalo_inicio" required class="input-base" />
            </div>
            <div class="form-group">
              <label><i class="mdi mdi-coffee-off"></i> Intervalo (Fim)</label>
              <input type="time" v-model="form.intervalo_fim" required class="input-base" />
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <button type="button" @click="fecharModal" class="btn-outline">Cancelar</button>
        <button type="submit" form="formConfig" class="btn-primary" :disabled="salvando">
          <i class="mdi" :class="salvando ? 'mdi-loading mdi-spin' : 'mdi-content-save'"></i>
          <span>{{ salvando ? 'Salvando...' : 'Salvar' }}</span>
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import VueSelect from 'vue3-select-component';
import api from '../services/api';
import PageHeader from '../components/PageHeader.vue';
import FeedbackState from '../components/FeedbackState.vue';
import BaseModal from '../components/BaseModal.vue';
import TableToolbar from '../components/TableToolbar.vue';
import DataTable from '../components/DataTable.vue';
import { formatarHora } from '../services/formatters';
import { toast, dialog } from '../services/feedback';

const abas = [
  { id: 'unidades', titulo: 'Unidades', icone: 'mdi mdi-domain', endpoint: '/cadastros/unidades', ex: 'Matriz Itapipoca' },
  { id: 'setores', titulo: 'Setores', icone: 'mdi mdi-office-building', endpoint: '/cadastros/setores', ex: 'Corte / Costura' },
  { id: 'celulas', titulo: 'Células', icone: 'mdi mdi-factory', endpoint: '/cadastros/celulas', ex: 'Célula 01' },
  { id: 'marcas', titulo: 'Marcas', icone: 'mdi mdi-tag-multiple', endpoint: '/cadastros/marcas', ex: 'Umbro / Fila' },
  { id: 'turnos', titulo: 'Turnos', icone: 'mdi mdi-clock-outline', endpoint: '/cadastros/turnos', ex: '1º Turno' }
];

const abaAtiva = ref('unidades');
const isLoading = ref(true);
const salvando = ref(false);
const showModal = ref(false);
const termoBusca = ref('');

const dados = reactive({
  unidades: [],
  setores: [],
  celulas: [],
  marcas: [],
  turnos: []
});

const form = reactive({
  id: null,
  nome: '',
  id_setor_fk: '',
  id_marca_fk: '',
  entrada_inicio: '',
  entrada_fim: '',
  intervalo_inicio: '',
  intervalo_fim: ''
});

const opcoesSetores = computed(() => (dados.setores || []).map(s => ({ label: s.nome, value: s.id })));
const opcoesMarcas = computed(() => (dados.marcas || []).map(m => ({ label: m.nome, value: m.id })));

const dadosAtuais = computed(() => {
  const lista = dados[abaAtiva.value] || [];
  return lista.filter(item => item.ativo !== 0 && item.ativo !== false);
});

const dadosFiltrados = computed(() => {
  const lista = dadosAtuais.value;
  if (!termoBusca.value.trim()) return lista;
  const t = termoBusca.value.toLowerCase().trim();
  return lista.filter(item => {
    const nome = (item.nome || item.descricao || '').toLowerCase();
    const setor = (item.nome_setor || '').toLowerCase();
    const marca = (item.nome_marca || '').toLowerCase();
    const id = String(item.id || item.id_setor || item.id_unidade || item.id_marca || item.id_celula || item.id_turno);
    return nome.includes(t) || setor.includes(t) || marca.includes(t) || id.includes(t);
  });
});

const abaInfo = computed(() => abas.find(a => a.id === abaAtiva.value));
const nomeAbaAtiva = computed(() => abaInfo.value?.titulo || '');
const placeholderExemplo = computed(() => abaInfo.value?.ex || '');
const endpointAtivo = computed(() => abaInfo.value?.endpoint || '');

const extrairArrayDeDados = (respostaData) => {
  if (Array.isArray(respostaData)) return respostaData;
  if (respostaData.dados && Array.isArray(respostaData.dados)) return respostaData.dados;
  if (respostaData.rows && Array.isArray(respostaData.rows)) return respostaData.rows;
  const possivelArray = Object.values(respostaData).find(val => Array.isArray(val));
  return possivelArray || [];
};

const buscarDados = async (forcarRefresh = false) => {
  if (!forcarRefresh && dados[abaAtiva.value].length > 0) return;

  isLoading.value = true;
  try {
    const res = await api.get(endpointAtivo.value);
    dados[abaAtiva.value] = extrairArrayDeDados(res.data);
  } catch (err) {
    console.error(`Erro ao carregar ${abaAtiva.value}:`, err);
  } finally {
    isLoading.value = false;
  }
};

const carregarDependenciasCelulas = async () => {
  try {
    if (dados.setores.length === 0) {
      const res = await api.get('/cadastros/setores');
      dados.setores = extrairArrayDeDados(res.data);
    }
    if (dados.marcas.length === 0) {
      const res = await api.get('/cadastros/marcas');
      dados.marcas = extrairArrayDeDados(res.data);
    }
  } catch (err) {
    console.error('Erro ao carregar dependências para células:', err);
  }
};

const mudarAba = (idAba) => {
  abaAtiva.value = idAba;
  termoBusca.value = '';
  buscarDados(); 
};

const abrirModal = async (item = null) => {
  if (abaAtiva.value === 'celulas') {
    await carregarDependenciasCelulas();
  }

  if (item) {
    form.id = item.id || item.id_setor || item.id_unidade || item.id_marca || item.id_celula || item.id_turno;
    form.nome = item.nome || item.descricao;
    
    if (abaAtiva.value === 'celulas') {
      form.id_setor_fk = item.id_setor_fk || '';
      form.id_marca_fk = item.id_marca_fk || '';
    }
    
    if (abaAtiva.value === 'turnos') {
      form.entrada_inicio = item.entrada_inicio;
      form.entrada_fim = item.entrada_fim;
      form.intervalo_inicio = item.intervalo_inicio;
      form.intervalo_fim = item.intervalo_fim;
    }
  } else {
    form.id = null;
    form.nome = '';
    form.id_setor_fk = '';
    form.id_marca_fk = '';
    form.entrada_inicio = '';
    form.entrada_fim = '';
    form.intervalo_inicio = '';
    form.intervalo_fim = '';
  }
  showModal.value = true;
};

const fecharModal = () => {
  showModal.value = false;
};

const salvarItem = async () => {
  salvando.value = true;
  
  const payload = { nome: form.nome };
  
  if (abaAtiva.value === 'celulas') {
    if (!form.id_setor_fk) {
      toast.warning('Por favor, selecione um setor vinculado.');
      salvando.value = false;
      return;
    }
    payload.id_setor_fk = Number(form.id_setor_fk);
    payload.id_marca_fk = form.id_marca_fk ? Number(form.id_marca_fk) : null;
  }
  
  if (abaAtiva.value === 'turnos') {
    payload.entrada_inicio = form.entrada_inicio;
    payload.entrada_fim = form.entrada_fim;
    payload.intervalo_inicio = form.intervalo_inicio;
    payload.intervalo_fim = form.intervalo_fim;
  }

  try {
    if (form.id) {
      await api.put(`${endpointAtivo.value}/${form.id}`, payload);
      toast.success(`${nomeAbaAtiva.value.slice(0, -1)} atualizado(a) com sucesso!`);
    } else {
      await api.post(endpointAtivo.value, payload);
      toast.success(`${nomeAbaAtiva.value.slice(0, -1)} cadastrado(a) com sucesso!`);
    }
    fecharModal();
    buscarDados(true); 
  } catch (err) {
    console.error('Erro ao salvar:', err);
    toast.error('Erro ao salvar o registro. Verifique os dados inseridos.');
  } finally {
    salvando.value = false;
  }
};

const excluirItem = async (id) => {
  const entidade = nomeAbaAtiva.value.slice(0, -1);
  const confirmou = await dialog.confirm({
    title: `Excluir ${entidade}`,
    message: `Deseja realmente excluir este(a) ${entidade}? Esta ação pode afetar registros vinculados.`,
    confirmText: 'Excluir',
    variant: 'danger'
  });
  if (!confirmou) return;
  
  try {
    await api.delete(`${endpointAtivo.value}/${id}`);
    toast.success(`${entidade} excluído(a) com sucesso!`);
    buscarDados(true);
  } catch (err) {
    console.error('Erro ao excluir:', err);
    toast.error('Erro ao excluir. O registro pode estar em uso em outros cadastros.');
  }
};

onMounted(() => buscarDados(true));
</script>

<style scoped>
.page-container {
  max-width: 1250px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

/* ==========================================
   NAVEGAÇÃO POR ABAS
   ========================================== */
.tabs-container {
  display: flex;
  gap: 8px;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color, #e2e8f0);
  padding-bottom: 8px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0.75rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  border-radius: var(--radius-md, 10px);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  min-height: 44px;
}

.tab-btn:hover {
  background: #f1f5f9;
  color: var(--text-primary, #0f172a);
}

.tab-btn.active {
  background: var(--primary, #b1072c);
  color: white;
  box-shadow: 0 4px 6px rgba(177, 7, 44, 0.2);
}

/* ==========================================
   TABELAS E CARDS
   ========================================== */
.card {
  background: var(--bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color, #e2e8f0);
  overflow: hidden;
  padding: 1.5rem;
}

.toolbar-search {
  margin-bottom: 1.25rem;
}

.search-box {
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
}

.input-search {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.4rem;
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
}

.clear-input-btn:hover { color: #475569; }

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0.9rem 1rem;
  border-bottom: 1.5px solid #e2e8f0;
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: var(--text-primary, #0f172a);
  font-size: 0.95rem;
}

.data-table tbody tr:hover td {
  background-color: #f8fafc;
}

.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #94a3b8; }

.badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.badge-setor { background: #fff1f2; color: var(--primary, #b1072c); }
.badge-marca { background: #fef3c7; color: #b45309; }

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-icon {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  min-height: 42px;
}

.btn-icon.edit { color: var(--primary, #b1072c); background: #fff1f2; }
.btn-icon.edit:hover { background: #ffe4e6; }
.btn-icon.delete { color: var(--danger, #ef4444); background: #fef2f2; }
.btn-icon.delete:hover { background: #fee2e2; }

.btn-novo-empty {
  margin-top: 1rem;
  background: var(--primary, #b1072c);
  color: white;
  border: none;
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* ==========================================
   FORMULÁRIOS
   ========================================== */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 600;
  color: #475569;
  font-size: 0.9rem;
}

.form-group label i { color: #94a3b8; margin-right: 4px; }

.input-base {
  width: 100%;
  padding: 0.8rem;
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.input-base:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.15);
}

.select-base { background-color: #fff; cursor: pointer; }

.time-grid-container {
  background: #f8fafc;
  padding: 1.2rem;
  border-radius: 8px;
  border: 1.5px dashed #cbd5e1;
}

.time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.time-row.separator { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color, #e2e8f0); }
.time-row .form-group { margin-bottom: 0; }

.dependencies-grid {
  background: #f8fafc;
  padding: 1.2rem;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
  margin-bottom: 1.25rem;
}

.btn-primary {
  background: var(--primary, #b1072c);
  color: white;
  padding: 0.75rem 1.4rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: 0.2s;
  min-height: 44px;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #8f0523);
}

.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-outline {
  background: white;
  border: 1.5px solid #cbd5e1;
  color: #475569;
  padding: 0.75rem 1.4rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s;
  min-height: 44px;
}

.btn-outline:hover { background: #f1f5f9; }

@media (max-width: 767px) {
  .page-container { padding: 1rem 0.5rem; }
  .data-table { min-width: 580px; }
  .time-row { grid-template-columns: 1fr; }
}
</style>
