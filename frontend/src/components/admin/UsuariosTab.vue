<template>
  <div class="tab-module">
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
        placeholder="Buscar por nome, matrícula ou função..."
        :has-active-filters="temFiltrosAtivos"
        @clear="limparFiltros"
      >
        <template #filters>
          <div class="filtro-item">
            <select v-model="filtroPapel" class="filter-select" title="Filtrar por Papel">
              <option value="">Papel: Todos</option>
              <option v-for="p in opcoesPapel" :key="p.value" :value="p.value">
                Papel: {{ p.label }}
              </option>
            </select>
          </div>

          <div class="filtro-item">
            <select v-model="filtroSetor" class="filter-select" title="Filtrar por Setor">
              <option value="">Setor: Todos</option>
              <option v-for="s in setores" :key="s.id" :value="s.id">
                Setor: {{ s.nome }}
              </option>
            </select>
          </div>

          <div class="filtro-item">
            <select v-model="filtroStatus" class="filter-select" title="Filtrar por Status">
              <option value="todos">Status: Todos</option>
              <option value="ativos">Status: Apenas Ativos</option>
              <option value="inativos">Status: Apenas Inativos</option>
            </select>
          </div>
        </template>
      </TableToolbar>

      <DataTable
        :items="perfisFiltrados"
        :is-loading="carregando"
        loading-message="Carregando perfis de usuários..."
        empty-title="Nenhum perfil encontrado"
        :empty-message="temFiltrosAtivos ? 'Nenhum perfil de usuário corresponde aos filtros selecionados.' : 'Cadastre o primeiro colaborador para atribuir permissões.'"
        empty-icon="mdi mdi-account-search-outline"
      >
        <template #header>
          <tr>
            <th>Nome / Colaborador</th>
            <th class="col-matricula hide-mobile">Matrícula</th>
            <th class="hide-mobile">Papel</th>
            <th>Status</th>
            <th class="col-chevron"></th>
          </tr>
        </template>

        <template #body>
          <tr
            v-for="perfil in perfisFiltrados"
            :key="perfil.id"
            class="clickable-row"
            @click="editar(perfil)"
            title="Toque para editar este perfil operacional"
          >
            <td>
              <div class="user-name-cell">
                <i class="mdi mdi-account-circle text-muted"></i>
                <div class="user-info-text">
                  <strong>{{ perfil.nome }}</strong>
                  <span class="user-sub-meta show-mobile-only">
                    Matrícula: {{ perfil.matricula }} · {{ perfil.papel }}
                  </span>
                </div>
              </div>
            </td>
            <td class="col-matricula hide-mobile"><code>{{ perfil.matricula }}</code></td>
            <td class="hide-mobile">
              <span class="badge" :class="perfil.papel === 'ADMIN' ? 'badge-admin' : 'badge-user'">
                {{ perfil.papel }}
              </span>
            </td>
            <td>
              <span class="badge" :class="perfil.ativo ? 'badge-ativo' : 'badge-inativo'">
                {{ perfil.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="col-chevron">
              <i class="mdi mdi-chevron-right"></i>
            </td>
          </tr>
        </template>
      </DataTable>
    </div>

    <!-- Formulário -->
    <div v-else class="card form-card">
      <div class="form-header-row">
        <h3>{{ form.id ? 'Editar Perfil Operacional' : 'Novo Perfil Operacional' }}</h3>
      </div>

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
import { onMounted, reactive, ref, computed, watch } from 'vue'
import VueSelect from 'vue3-select-component'
import api from '../../services/api'
import TableToolbar from '../TableToolbar.vue'
import DataTable from '../DataTable.vue'

const props = defineProps({
  modo: {
    type: String,
    default: 'lista'
  }
})

const emit = defineEmits(['update:modo'])

const modo = ref(props.modo || 'lista'), perfis = ref([]), unidades = ref([]), setores = ref([]), celulas = ref([]), turnos = ref([])

watch(() => props.modo, (novoModo) => {
  if (novoModo && novoModo !== modo.value) {
    modo.value = novoModo
    if (novoModo === 'lista') {
      carregar()
    }
  }
})

watch(modo, (novoModo) => {
  if (novoModo !== props.modo) {
    emit('update:modo', novoModo)
  }
})
const erro = ref(''), sucesso = ref(''), salvando = ref(false), carregando = ref(true)
const termoBusca = ref('')
const filtroPapel = ref('')
const filtroStatus = ref('todos')
const filtroSetor = ref('')

const temFiltrosAtivos = computed(() => {
  return Boolean(
    termoBusca.value.trim() ||
    filtroPapel.value !== '' ||
    filtroStatus.value !== 'todos' ||
    filtroSetor.value !== ''
  )
})

const limparFiltros = () => {
  termoBusca.value = ''
  filtroPapel.value = ''
  filtroStatus.value = 'todos'
  filtroSetor.value = ''
}

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
  return perfis.value.filter(p => {
    // 1. Filtro textual
    if (termoBusca.value.trim()) {
      const t = termoBusca.value.toLowerCase().trim()
      const match = (p.nome && p.nome.toLowerCase().includes(t)) ||
        (p.matricula && String(p.matricula).toLowerCase().includes(t)) ||
        (p.papel && p.papel.toLowerCase().includes(t)) ||
        (p.funcao && p.funcao.toLowerCase().includes(t)) ||
        (p.nome_setor && p.nome_setor.toLowerCase().includes(t))
      if (!match) return false
    }
    // 2. Filtro de papel
    if (filtroPapel.value && p.papel !== filtroPapel.value) {
      return false
    }
    // 3. Filtro de status
    if (filtroStatus.value === 'ativos' && !p.ativo) return false
    if (filtroStatus.value === 'inativos' && p.ativo) return false
    // 4. Filtro de setor
    if (filtroSetor.value && String(p.id_setor_fk) !== String(filtroSetor.value)) {
      return false
    }
    return true
  })
})

const dados = (r) => r.data?.dados || []

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
    api.get('/cadastros/unidades').catch(() => ({ data: { dados: [] } })),
    api.get('/cadastros/setores').catch(() => ({ data: { dados: [] } })),
    api.get('/cadastros/celulas').catch(() => ({ data: { dados: [] } })),
    api.get('/cadastros/turnos').catch(() => ({ data: { dados: [] } }))
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

defineExpose({
  modo,
  novo,
  voltarParaLista: () => { modo.value = 'lista'; }
})
</script>

<style scoped>
.tab-module {
  width: 100%;
}

.card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  padding: 1.75rem;
  box-shadow: var(--shadow-sm);
}

.tab-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  flex-wrap: wrap;
  gap: 1rem;
}

.tab-header-info h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.tab-header-info p {
  margin: 0.25rem 0 0 0;
  font-size: 0.88rem;
  color: var(--text-secondary, #64748b);
}

.form-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  gap: 1rem;
}

.form-header-row h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-sub-meta {
  font-size: 0.78rem;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
}

.show-mobile-only {
  display: none;
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

.col-matricula code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.col-acoes {
  text-align: right;
  width: 120px;
}

.btn-editar {
  background: #fff1f2;
  color: var(--primary, #b1072c);
  border: 1px solid #fecdd3;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  min-height: 38px;
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

@media (max-width: 768px) {
  .card { padding: 1rem; }
  .tab-header-row { flex-direction: column; align-items: stretch; }
  .tab-header-row button { width: 100%; justify-content: center; }
  .form-header-row { flex-direction: column; align-items: stretch; }
  .form-header-row button { width: 100%; justify-content: center; }
  .form-grid { grid-template-columns: 1fr; }
  .form-actions-row { flex-direction: column-reverse; }
  .form-actions-row button { width: 100%; justify-content: center; }
}
</style>
