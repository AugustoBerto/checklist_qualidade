<template>
  <div class="page-container">
    <div class="header-n">
      <div class="header-titles">
        <h1><i class="mdi mdi-cogs"></i> Configurações Globais</h1>
        <p>Gerencie as estruturas fundamentais para os checklists e relatórios.</p>
      </div>
      <button @click="abrirModal()" class="btn-primary">
        <i class="mdi mdi-plus"></i> Novo Registro
      </button>
    </div>

    <div class="tabs-container">
      <button 
        v-for="aba in abas" 
        :key="aba.id" 
        @click="mudarAba(aba.id)"
        class="tab-btn" 
        :class="{ active: abaAtiva === aba.id }"
      >
        <i :class="aba.icone"></i> {{ aba.titulo }}
      </button>
    </div>

    <div class="card">
      <div v-if="isLoading" class="status-message loading-state"><div class="spinner"></div></div>
      
      <div v-else-if="dadosAtuais.length === 0" class="status-message empty-state">
        <i class="mdi mdi-database-remove-outline"></i>
        <p>Nenhum registro encontrado para <strong>{{ nomeAbaAtiva }}</strong>.</p>
      </div>

      <div v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-id">ID</th>
            <th>Nome / Descrição</th>
            
            <th v-if="abaAtiva === 'celulas'">Setor Vinculado</th>
            <th v-if="abaAtiva === 'celulas'">Marca Vinculada</th>

            <th v-if="abaAtiva === 'turnos'">Horário Entrada</th>
            <th v-if="abaAtiva === 'turnos'">Horário Após Intervalo</th>
            
            <th class="col-acoes">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in dadosAtuais" :key="item.id || item.id_setor || item.id_unidade || item.id_celula">
            <td>{{ item.id || item.id_setor || item.id_unidade || item.id_marca || item.id_celula || item.id_turno }}</td>
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

            <td class="col-acoes actions-cell">
              <button @click="abrirModal(item)" class="btn-icon edit" title="Editar">
                <i class="mdi mdi-pencil"></i>
              </button>
              <button @click="excluirItem(item.id || item.id_setor || item.id_unidade || item.id_marca || item.id_celula || item.id_turno)" class="btn-icon delete" title="Excluir">
                <i class="mdi mdi-delete"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="fecharModal">
      <div class="modal-content slide-in">
        <div class="modal-header">
          <h2>{{ form.id ? 'Editar' : 'Novo' }} Registro - {{ nomeAbaAtiva }}</h2>
          <button @click="fecharModal" class="btn-close-modal"><i class="mdi mdi-close"></i></button>
        </div>
        
        <form @submit.prevent="salvarItem" class="modal-body">
          <div class="form-group">
            <label>Nome / Descrição</label>
            <input type="text" v-model="form.nome" required class="input-base" :placeholder="'Ex: ' + placeholderExemplo" />
          </div>

          <div v-if="abaAtiva === 'celulas'" class="dependencies-grid">
            <div class="form-group">
              <label>Setor Vinculado</label>
              <select v-model="form.id_setor_fk" required class="input-base select-base">
                <option value="" disabled>Selecione um Setor...</option>
                <option v-for="setor in dados.setores" :key="setor.id" :value="setor.id">
                  {{ setor.nome }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Marca Vinculada (Opcional)</label>
              <select v-model="form.id_marca_fk" class="input-base select-base">
                <option value="">Geral / Sem Marca Específica</option>
                <option v-for="marca in dados.marcas" :key="marca.id" :value="marca.id">
                  {{ marca.nome }}
                </option>
              </select>
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

          <div class="modal-actions">
            <button type="button" @click="fecharModal" class="btn-outline">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="salvando">
              <i class="mdi" :class="salvando ? 'mdi-loading mdi-spin' : 'mdi-content-save'"></i>
              {{ salvando ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import api from '../services/api';

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
  // Células
  id_setor_fk: '',
  id_marca_fk: '',
  // Turnos
  entrada_inicio: '',
  entrada_fim: '',
  intervalo_inicio: '',
  intervalo_fim: ''
});

const dadosAtuais = computed(() => dados[abaAtiva.value]);
const abaInfo = computed(() => abas.find(a => a.id === abaAtiva.value));
const nomeAbaAtiva = computed(() => abaInfo.value.titulo);
const placeholderExemplo = computed(() => abaInfo.value.ex);
const endpointAtivo = computed(() => abaInfo.value.endpoint);

// Helper para extrair array de dados de forma segura
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
    alert(`Erro ao carregar a lista de ${nomeAbaAtiva.value}.`);
  } finally {
    isLoading.value = false;
  }
};

// 📌 Carrega Setores e Marcas antes de abrir o modal de Células
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

const fecharModal = () => showModal.value = false;

const salvarItem = async () => {
  salvando.value = true;
  
  const payload = { nome: form.nome };
  
  if (abaAtiva.value === 'celulas') {
    payload.id_setor_fk = form.id_setor_fk;
    payload.id_marca_fk = form.id_marca_fk || null;
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
    } else {
      await api.post(endpointAtivo.value, payload);
    }
    fecharModal();
    buscarDados(true); 
  } catch (err) {
    console.error('Erro ao salvar:', err);
    alert('Erro ao salvar o registro. Verifique os dados inseridos.');
  } finally {
    salvando.value = false;
  }
};

const excluirItem = async (id) => {
  if (!confirm(`Excluir este(a) ${nomeAbaAtiva.value.slice(0, -1)}? Esta ação pode afetar registros vinculados.`)) return;
  
  try {
    await api.delete(`${endpointAtivo.value}/${id}`);
    buscarDados(true);
  } catch (err) {
    console.error('Erro ao excluir:', err);
    alert('Erro ao excluir. O registro pode estar em uso.');
  }
};

const formatarHora = (horaString) => {
  if (!horaString) return '--:--';
  return horaString.substring(0, 5); 
};

onMounted(() => buscarDados(true));
</script>

<style scoped>
/* ==========================================
   LAYOUT GERAL E HEADER
   ========================================== */
.page-container { max-width: 1200px; margin: 0 auto; padding: 2rem; font-family: 'Inter', system-ui, sans-serif; }
.header-n { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-titles h1 { margin: 0; font-size: 1.8rem; color: #1e293b; display: flex; align-items: center; gap: 10px; }
.header-titles p { margin: 5px 0 0 0; color: #64748b; }

/* ==========================================
   NAVEGAÇÃO POR ABAS
   ========================================== */
.tabs-container { display: flex; gap: 10px; margin-bottom: 1.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; overflow-x: auto; }
.tab-btn { background: transparent; border: none; padding: 0.8rem 1.5rem; font-size: 1rem; font-weight: 600; color: #64748b; cursor: pointer; border-radius: 8px; transition: all 0.2s; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.tab-btn:hover { background: #f1f5f9; color: #1e293b; }
.tab-btn.active { background: #2563eb; color: white; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }

/* ==========================================
   TABELAS E CARDS
   ========================================== */
.card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.col-id { width: 80px; }
.col-acoes { width: 120px; text-align: right; }
.data-table th, .data-table td { padding: 1.2rem 1.5rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
.data-table th { background: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px; }

/* Badges e Textos Auxiliares */
.time-col { color: #475569; font-weight: 500; }
.text-muted { color: #94a3b8; }
.badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
.badge-setor { background: #e0e7ff; color: #1d4ed8; }
.badge-marca { background: #fef3c7; color: #b45309; }

.actions-cell { display: flex; justify-content: flex-end; gap: 8px; }
.btn-icon { background: transparent; border: none; font-size: 1.2rem; padding: 6px; border-radius: 6px; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; justify-content: center; }
.btn-icon.edit { color: #2563eb; background: #eff6ff; }
.btn-icon.edit:hover { background: #dbeafe; }
.btn-icon.delete { color: #ef4444; background: #fef2f2; }
.btn-icon.delete:hover { background: #fee2e2; }

/* ==========================================
   MODAL E FORMULÁRIOS
   ========================================== */
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; }
.modal-content { background: white; border-radius: 12px; width: 100%; max-width: 550px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
.modal-header h2 { margin: 0; font-size: 1.3rem; color: #1e293b; }
.btn-close-modal { background: transparent; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }
.btn-close-modal:hover { color: #ef4444; }

.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #475569; font-size: 0.9rem; }
.form-group label i { color: #94a3b8; margin-right: 4px; }
.input-base { width: 100%; padding: 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
.input-base:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
.select-base { background-color: #fff; cursor: pointer; }

/* Grids Internos (Turnos e Dependências) */
.time-grid-container { background: #f8fafc; padding: 1.2rem; border-radius: 8px; border: 1px dashed #cbd5e1; }
.time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.time-row.separator { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
.time-row .form-group { margin-bottom: 0; }

.dependencies-grid { background: #f8fafc; padding: 1.2rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 2rem; }
.btn-primary { background: #2563eb; color: white; padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s; }
.btn-outline:hover { background: #f1f5f9; }

.status-message { text-align: center; padding: 3rem; color: #64748b; }
.status-message i { font-size: 3rem; margin-bottom: 1rem; display: block; color: #94a3b8; }
.spinner { border: 4px solid #f1f5f9; width: 40px; height: 40px; border-radius: 50%; border-left-color: #2563eb; animation: spin 1s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.slide-in { animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 767px) {
  .page-container { padding: 1rem; }
  .header-n { align-items: stretch; flex-direction: column; gap: 1rem; }
  .header-titles h1 { font-size: 1.4rem; }
  .header-n > .btn-primary { justify-content: center; }
  .table-container { overflow-x: auto; }
  .data-table { min-width: 620px; }
  .data-table th, .data-table td { padding: 0.85rem 1rem; }
  .btn-icon { min-width: 44px; min-height: 44px; }
  .modal-overlay { align-items: flex-end; padding: 0; }
  .modal-content { max-height: calc(100dvh - 1rem); overflow-y: auto; border-radius: 12px 12px 0 0; }
  .modal-header, .modal-body { padding: 1rem; }
  .modal-header h2 { font-size: 1.1rem; }
  .time-row { grid-template-columns: 1fr; }
  .modal-actions { flex-direction: column-reverse; }
  .modal-actions .btn-primary, .modal-actions .btn-outline { justify-content: center; width: 100%; }
}
</style>
