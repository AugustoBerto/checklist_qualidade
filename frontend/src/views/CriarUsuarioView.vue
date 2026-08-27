<template>
  <div class="page-container">
    <PageHeader
      :title="modo === 'lista' ? 'Perfis Operacionais' : (form.id ? 'Editar Perfil Operacional' : 'Novo Perfil Operacional')"
      :subtitle="modo === 'lista' ? 'Vincule matrículas do sistema dass_auth ao Checklist de Auditoria.' : 'Preencha as informações de vínculo do colaborador.'"
      icon="mdi mdi-account-cog-outline"
    >
      <template #actions>
        <button v-if="modo === 'lista'" class="btn-primary" @click="novo">
          <i class="mdi mdi-account-plus"></i>
          <span>Novo Perfil</span>
        </button>
        <button v-else class="btn-outline" @click="modo = 'lista'">
          <i class="mdi mdi-arrow-left"></i>
          <span>Voltar para Lista</span>
        </button>
      </template>
    </PageHeader>

    <div v-if="erro" class="alert error">
      <i class="mdi mdi-alert-circle"></i>
      <span>{{ erro }}</span>
    </div>
    
    <div v-if="sucesso" class="alert success">
      <i class="mdi mdi-check-circle"></i>
      <span>{{ sucesso }}</span>
    </div>

    <!-- Lista de Usuários -->
    <div v-if="modo === 'lista'" class="card">
      <TableToolbar
        v-model="termoBusca"
        placeholder="Buscar por nome, matrícula ou papel..."
        :has-active-filters="Boolean(termoBusca)"
        @clear="termoBusca = ''"
      />

      <DataTable
        :items="perfisFiltrados"
        :is-loading="carregando"
        loading-message="Carregando perfis de usuários..."
        empty-title="Nenhum perfil encontrado"
        :empty-message="termoBusca ? `Não encontramos resultados para '${termoBusca}'.` : 'Cadastre o primeiro colaborador para atribuir permissões.'"
        empty-icon="mdi mdi-account-search-outline"
      >
        <template #header>
          <tr>
            <th>Nome / Colaborador</th>
            <th class="col-matricula">Matrícula</th>
            <th>Papel</th>
            <th>Status</th>
            <th class="col-acoes">Ações</th>
          </tr>
        </template>

        <template #body>
          <tr v-for="perfil in perfisFiltrados" :key="perfil.id">
            <td>
              <div class="user-name-cell">
                <i class="mdi mdi-account-circle text-muted"></i>
                <strong>{{ perfil.nome }}</strong>
              </div>
            </td>
            <td class="col-matricula"><code>{{ perfil.matricula }}</code></td>
            <td>
              <span class="badge" :class="perfil.papel === 'ADMIN' ? 'badge-admin' : 'badge-user'">
                {{ perfil.papel }}
              </span>
            </td>
            <td>
              <span class="badge" :class="perfil.ativo ? 'badge-ativo' : 'badge-inativo'">
                {{ perfil.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="col-acoes">
              <button class="btn-editar" @click="editar(perfil)" title="Editar perfil">
                <i class="mdi mdi-pencil"></i>
                <span>Editar</span>
              </button>
            </td>
          </tr>
        </template>
      </DataTable>
    </div>

    <!-- Formulário -->
    <div v-else class="card form-card">
      <form class="form-grid" @submit.prevent="salvar">
        <div class="form-group">
          <label>Matrícula (dass_auth) <span class="obrigatorio">*</span></label>
          <input v-model.trim="form.matricula" required :disabled="Boolean(form.id)" class="input-base" placeholder="Ex: 12345">
        </div>

        <div class="form-group" v-if="form.id">
          <label>Nome do Colaborador</label>
          <input :value="form.nome" disabled class="input-base input-disabled">
        </div>

        <div class="form-group">
          <label>Papel no Sistema <span class="obrigatorio">*</span></label>
          <VueSelect
            v-model="form.papel"
            :options="opcoesPapel"
            placeholder="Selecione o papel..."
            :is-clearable="false"
          />
        </div>

        <div class="form-group" v-if="form.id">
          <label>Função</label>
          <input :value="form.funcao" disabled class="input-base input-disabled">
        </div>

        <div class="form-group">
          <label>Unidade</label>
          <VueSelect
            v-model="form.id_unidade_fk"
            :options="opcoesUnidades"
            placeholder="Selecione a unidade..."
            :is-clearable="true"
          />
        </div>

        <div class="form-group">
          <label>Setor</label>
          <VueSelect
            v-model="form.id_setor_fk"
            :options="opcoesSetores"
            placeholder="Selecione o setor..."
            :is-clearable="true"
          />
        </div>

        <div class="form-group">
          <label>Célula / Linha</label>
          <VueSelect
            v-model="form.id_celula_fk"
            :options="opcoesCelulas"
            placeholder="Selecione a linha/célula..."
            :is-clearable="true"
          />
        </div>

        <div class="form-group">
          <label>Turno</label>
          <VueSelect
            v-model="form.id_turno_fk"
            :options="opcoesTurnos"
            placeholder="Selecione o turno..."
            :is-clearable="true"
          />
        </div>

        <div class="form-group" v-if="form.id">
          <label>Status</label>
          <VueSelect
            v-model="form.ativo"
            :options="opcoesStatus"
            placeholder="Selecione o status..."
            :is-clearable="false"
          />
        </div>

        <div class="form-actions-row">
          <button type="button" @click="modo = 'lista'" class="btn-outline">Cancelar</button>
          <button class="btn-primary" :disabled="salvando">
            <i class="mdi" :class="salvando ? 'mdi-loading mdi-spin' : 'mdi-content-save'"></i>
            <span>{{ salvando ? 'Salvando...' : 'Salvar Perfil' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import VueSelect from 'vue3-select-component'
import api from '../services/api'
import PageHeader from '../components/PageHeader.vue'
import FeedbackState from '../components/FeedbackState.vue'
import TableToolbar from '../components/TableToolbar.vue'
import DataTable from '../components/DataTable.vue'

const modo = ref('lista'), perfis = ref([]), unidades = ref([]), setores = ref([]), celulas = ref([]), turnos = ref([])
const erro = ref(''), sucesso = ref(''), salvando = ref(false), carregando = ref(true)
const termoBusca = ref('')
const vazio = () => ({ id: null, matricula: '', nome: '', papel: '', funcao: '', ativo: true, id_unidade_fk: '', id_setor_fk: '', id_celula_fk: '', id_turno_fk: '' })
const form = reactive(vazio())

const opcoesPapel = [
  { label: 'Administrador', value: 'ADMIN' },
  { label: 'Líder de Produção', value: 'LIDER' },
  { label: 'Inspetor de Qualidade', value: 'INSPETOR' }
]

const opcoesUnidades = computed(() => unidades.value.map(u => ({ label: u.nome, value: u.id })))
const opcoesSetores = computed(() => setores.value.map(s => ({ label: s.nome, value: s.id })))

const opcoesCelulas = computed(() => {
  const lista = form.id_setor_fk
    ? celulas.value.filter(c => !c.id_setor_fk || String(c.id_setor_fk) === String(form.id_setor_fk))
    : celulas.value
  return lista.map(c => ({ label: c.nome, value: c.id }))
})

const opcoesTurnos = computed(() => turnos.value.map(t => ({ label: t.nome, value: t.id })))

const opcoesStatus = [
  { label: 'Ativo', value: true },
  { label: 'Inativo', value: false }
]

const perfisFiltrados = computed(() => {
  if (!termoBusca.value.trim()) return perfis.value
  const t = termoBusca.value.toLowerCase().trim()
  return perfis.value.filter(p => 
    (p.nome && p.nome.toLowerCase().includes(t)) ||
    (p.matricula && String(p.matricula).toLowerCase().includes(t)) ||
    (p.papel && p.papel.toLowerCase().includes(t))
  )
})

const dados = (r) => r.data?.dados || r.data?.unidades || r.data?.setores || r.data?.celulas || r.data?.turnos || []

const carregar = async () => {
  carregando.value = true
  try {
    perfis.value = dados(await api.get('/perfis'))
  } catch {
    erro.value = 'Não foi possível carregar os perfis.'
  } finally {
    carregando.value = false
  }
}

const dependencias = async () => {
  const [u, s, c, t] = await Promise.all([
    api.get('/cadastros/unidades').catch(() => ({ data: [] })),
    api.get('/cadastros/setores').catch(() => ({ data: [] })),
    api.get('/cadastros/celulas').catch(() => ({ data: [] })),
    api.get('/cadastros/turnos').catch(() => ({ data: [] }))
  ])
  unidades.value = dados(u); setores.value = dados(s); celulas.value = dados(c); turnos.value = dados(t)
}

const novo = () => { Object.assign(form, vazio()); erro.value = ''; sucesso.value = ''; modo.value = 'formulario' }
const editar = (perfil) => {
  Object.assign(form, vazio(), perfil)
  form.ativo = perfil.ativo !== 0 && perfil.ativo !== false && perfil.ativo !== '0' && perfil.ativo !== 'false'
  form.id_unidade_fk = perfil.id_unidade_fk || ''
  form.id_setor_fk = perfil.id_setor_fk || ''
  form.id_celula_fk = perfil.id_celula_fk || ''
  form.id_turno_fk = perfil.id_turno_fk || ''
  erro.value = ''
  sucesso.value = ''
  modo.value = 'formulario'
}

const salvar = async () => {
  if (!form.matricula) {
    erro.value = 'A matrícula do colaborador é obrigatória.'
    return
  }
  if (!form.papel) {
    erro.value = 'O papel no sistema é obrigatório.'
    return
  }
  salvando.value = true; erro.value = ''; sucesso.value = ''
  try {
    const { nome, funcao, id, ...payload } = form
    payload.ativo = form.ativo === true || form.ativo === 1 || form.ativo === '1' || form.ativo === 'true'
    payload.id_unidade_fk = payload.id_unidade_fk ? Number(payload.id_unidade_fk) : null
    payload.id_setor_fk = payload.id_setor_fk ? Number(payload.id_setor_fk) : null
    payload.id_celula_fk = payload.id_celula_fk ? Number(payload.id_celula_fk) : null
    payload.id_turno_fk = payload.id_turno_fk ? Number(payload.id_turno_fk) : null
    if (form.id) await api.put(`/perfis/${form.id}`, payload); else await api.post('/perfis', payload)
    sucesso.value = 'Perfil salvo com sucesso.'; modo.value = 'lista'; await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Não foi possível salvar o perfil.'
  } finally {
    salvando.value = false
  }
}

onMounted(async () => { await Promise.all([carregar(), dependencias()]) })
</script>

<style scoped>
.page-container {
  max-width: 1250px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  padding: 1.75rem;
  box-shadow: var(--shadow-sm);
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

.data-table th, .data-table td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  vertical-align: middle;
}

.data-table th {
  background: #f8fafc;
  font-weight: 700;
  color: #475569;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tbody tr:hover {
  background-color: #f8fafc;
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-muted {
  color: #94a3b8;
  font-size: 1.2rem;
}

.badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  display: inline-flex;
}

.badge-admin { background: #fff1f2; color: #b1072c; font-weight: 700; border: 1px solid #fecdd3; }
.badge-user { background: #f1f5f9; color: #475569; }
.badge-ativo { background: #ecfdf5; color: #10b981; }
.badge-inativo { background: #fef2f2; color: #ef4444; }

.text-right { text-align: right; }

.btn-editar {
  background: #fff1f2;
  color: var(--primary, #b1072c);
  border: 1px solid #fecdd3;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  min-height: 40px;
}

.btn-editar:hover {
  background: var(--primary, #b1072c);
  color: white;
}

/* Formulário */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #475569;
}

.obrigatorio {
  color: var(--danger, #ef4444);
}

.input-base {
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

.input-disabled {
  background: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
}

.select-base {
  background-color: white;
  cursor: pointer;
}

.form-actions-row {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-outline:hover { background: #f1f5f9; }

.alert {
  padding: 0.85rem 1.25rem;
  border-radius: 8px;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.alert.error { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
.alert.success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }

@media (max-width: 767px) {
  .page-container { padding: 1rem 0.5rem; }
  .card { padding: 1rem; }
  .form-grid { grid-template-columns: 1fr; }
  .data-table { min-width: 580px; }
  .form-actions-row { flex-direction: column-reverse; }
  .form-actions-row button { width: 100%; justify-content: center; }
}
</style>
