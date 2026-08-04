<template>
  <div class="page-container">
    <div class="header-n">
      <div class="header-titles">
        <h1><i class="mdi mdi-account-group"></i> Gestão de Usuários</h1>
        <p>Gerencie acessos, níveis, alocações e dados da equipe.</p>
      </div>
      <div class="header-actions">
        <button v-if="modoAtual === 'lista'" class="btn-novo" @click="abrirCriacao">
          <i class="mdi mdi-account-plus"></i> Novo Usuário
        </button>
        <button v-else class="btn-voltar" @click="voltarParaLista">
          <i class="mdi mdi-arrow-left"></i> Voltar para Lista
        </button>
      </div>
    </div>

    <div v-if="erro" class="alert error">{{ erro }}</div>
    <div v-if="sucesso" class="alert success">{{ sucesso }}</div>

    <div v-if="modoAtual === 'lista'" class="card">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div> Carregando usuários...
      </div>
      
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Unidade</th>
            <th>Setor / Célula</th>
            <th>Nível de Acesso</th>
            <th>Turno</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in usuarios" :key="user.id" :class="{'linha-desativada': Number(user.nivelusuario) === 0}">
            <td><strong>{{ user.nome }}</strong></td>
            <td>{{ user.email }}</td>
            <td>{{ getNomeUnidade(user) }}</td>
            <td>
              <span class="text-muted">{{ user.nome_setor || 'N/A' }}</span><br>
              <small v-if="user.nome_celula && user.nome_celula !== 'N/A'">{{ user.nome_celula }}</small>
            </td>
            <td><span :class="'badge nivel-' + user.nivelusuario">{{ formatarNivel(user.nivelusuario) }}</span></td>
            <td>{{ user.nome_turno || 'N/A' }}</td>
            <td class="text-right actions-cell">
              <button 
                class="btn-editar" 
                @click="abrirEdicao(user)"
                :disabled="!isAdminLogged"
                :title="!isAdminLogged ? 'Apenas administradores podem editar' : 'Editar Usuário'"
              >
                <i class="mdi mdi-pencil"></i> Editar
              </button>
            </td>
          </tr>
          <tr v-if="usuarios.length === 0">
            <td colspan="7" class="text-center">Nenhum usuário encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="card form-card">
      <h2>{{ form.id ? 'Editar Usuário' : 'Cadastrar Novo Usuário' }}</h2>
      <p class="dica" v-if="!form.id">Aproxime o crachá do leitor para preencher o código automaticamente.</p>
      
      <form @submit.prevent="salvarUsuario">
        <div class="form-row">
          <div class="form-group w-50">
            <label>Nome Completo *</label>
            <input type="text" v-model="form.nome" required class="input-base">
          </div>
          <div class="form-group w-50">
            <label>E-mail *</label>
            <input type="email" v-model="form.email" required class="input-base">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group w-33">
            <label>Unidade *</label>
            <select v-model="form.id_unidade_fk" required class="input-base select-base">
              <option value="" disabled>Selecione a Unidade...</option>
              <option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nome }}</option>
            </select>
          </div>
          <div class="form-group w-33">
            <label>Setor *</label>
            <select v-model="form.id_setor_fk" required class="input-base select-base">
              <option value="" disabled>Selecione o Setor...</option>
              <option v-for="s in setores" :key="s.id" :value="s.id">{{ s.nome }}</option>
            </select>
          </div>
          <div class="form-group w-33">
            <label>Célula de Produção</label>
            <select v-model="form.id_celula_fk" class="input-base select-base">
              <option value="">Nenhuma / Geral</option>
              <option v-for="c in celulas" :key="c.id" :value="c.id">{{ c.nome }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group w-33">
            <label>Perfil / Status de Acesso *</label>
            <select v-model="form.nivelusuario" required class="input-base select-base">
              <option value="" disabled>Selecione...</option>
              <option value="-1">Administrador (ADMIN)</option>
              <option value="2">Inspetor (Nível 2)</option>
              <option value="1">Líder (Nível 1)</option>
              <option value="0">Desativado</option>
            </select>
          </div>
          <div class="form-group w-33">
            <label>Função</label>
            <input type="text" v-model="form.funcao" class="input-base input-disabled" disabled>
          </div>
          <div class="form-group w-33">
            <label>Turno *</label>
            <select v-model="form.id_turno_fk" required class="input-base select-base">
              <option value="" disabled>Selecione o Turno...</option>
              <option v-for="t in turnos" :key="t.id" :value="t.id">{{ t.nome }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group w-100">
            <label>Código do Crachá</label>
            <div class="input-group">
              <input 
                type="text" 
                v-model="form.cracha" 
                :disabled="!!form.id" 
                class="input-base" 
                :class="{'input-disabled': !!form.id, 'input-with-btn': !form.id}"
                placeholder="Aguardando leitura do scanner..."
              >
              <button v-if="!form.id" type="button" class="btn-scanner" @click="acionarScanner">
                <i class="mdi mdi-barcode-scan"></i>
              </button>
            </div>
          </div>
        </div>

        <hr class="divisor">
        <h3 class="section-title">Segurança</h3>
        <div class="form-row">
          <div class="form-group w-50">
            <label>Nova Senha <span v-if="!form.id">*</span></label>
            <input type="password" v-model="form.senha" :required="!form.id" minlength="6" class="input-base">
          </div>
          <div class="form-group w-50">
            <label>Confirmar Senha <span v-if="!form.id">*</span></label>
            <input type="password" v-model="form.confirmarSenha" :required="!form.id" minlength="6" class="input-base">
          </div>
        </div>

        <div class="form-actions-bottom">
          <button type="submit" class="btn-salvar" :disabled="isLoading">
            <i class="mdi" :class="isLoading ? 'mdi-loading mdi-spin' : 'mdi-content-save'"></i>
            {{ isLoading ? 'Processando...' : (form.id ? 'Atualizar Usuário' : 'Cadastrar Usuário') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import api from '../services/api';

const modoAtual = ref('lista'); 
const usuarios = ref([]);
const isLoading = ref(false);
const erro = ref('');
const sucesso = ref('');
const isAdminLogged = ref(false);

const unidades = ref([]);
const setores = ref([]);
const celulas = ref([]);
const turnos = ref([]);

const form = reactive({
  id: null,
  nome: '',
  email: '',
  nivelusuario: '',
  funcao: '',
  cracha: '',
  senha: '',
  confirmarSenha: '',
  id_unidade_fk: '',
  id_setor_fk: '',
  id_celula_fk: '',
  id_turno_fk: ''
});

// Extração de dados tratando a chave específica (ex: res.data.unidades)
const extrairDados = (res, chave) => {
  if (!res || !res.data) return [];
  if (res.data[chave]) return res.data[chave]; 
  if (res.data.dados) return res.data.dados;
  if (Array.isArray(res.data)) return res.data;
  return [];
};

// Carregamento paralelo e seguro
const carregarDependencias = async () => {
  try {
    const results = await Promise.allSettled([
      api.get('/cadastros/unidades'),
      api.get('/cadastros/setores'),
      api.get('/cadastros/celulas'),
      api.get('/cadastros/turnos')
    ]);
    
    if (results[0].status === 'fulfilled') unidades.value = extrairDados(results[0].value, 'unidades');
    if (results[1].status === 'fulfilled') setores.value = extrairDados(results[1].value, 'setores');
    if (results[2].status === 'fulfilled') celulas.value = extrairDados(results[2].value, 'celulas');
    if (results[3].status === 'fulfilled') turnos.value = extrairDados(results[3].value, 'dados'); 
  } catch (err) {
    console.error("Erro ao carregar dependências:", err);
  }
};

// 📌 Função que corrige o "N/A" na tabela
const getNomeUnidade = (user) => {
  if (user.nome_unidade && user.nome_unidade !== 'N/A') return user.nome_unidade;
  // Fallback: procura na lista de unidades carregada pelo ID
  const found = unidades.value.find(u => u.id === user.id_unidade_fk);
  return found ? found.nome : 'N/A';
};

// 📌 Validação de administrador (corrige o problema de não deixar editar)
const verificarPermissoes = () => {
  const userStr = localStorage.getItem('usuario');
  const isAdminFlag = localStorage.getItem('isAdmin') === 'true';
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      isAdminLogged.value = user.permissao === 'admin' || user.admin === true || isAdminFlag;
    } catch(e) {
      isAdminLogged.value = isAdminFlag;
    }
  } else {
    isAdminLogged.value = isAdminFlag;
  }
};

watch(() => form.nivelusuario, (val) => {
  const n = Number(val);
  if (n === -1) form.funcao = 'ADMIN';
  else if (n === 1) form.funcao = 'Líder';
  else if (n === 2) form.funcao = 'Inspetor';
  else form.funcao = 'Desativado';
});

const carregarUsuarios = async () => {
  isLoading.value = true;
  try {
    const res = await api.get('/usuarios');
    usuarios.value = extrairDados(res, 'usuarios');
  } catch (err) {
    erro.value = 'Erro ao carregar lista.';
  } finally {
    isLoading.value = false;
  }
};

const formatarNivel = (nivel) => {
  const n = Number(nivel);
  if (n === -1) return 'ADMIN';
  if (n === 1) return 'Líder';
  if (n === 2) return 'Inspetor';
  return 'Desativado';
};

const salvarUsuario = async () => {
  if (form.senha !== form.confirmarSenha) {
    erro.value = 'As senhas não coincidem.';
    return;
  }
  isLoading.value = true;
  try {
    const payload = { 
      ...form, 
      id_celula_fk: form.id_celula_fk || null,
      ativo: Number(form.nivelusuario) === 0 ? 0 : 1 
    };
    
    if (form.id) {
        if (!form.senha) delete payload.senha;
        await api.put(`/usuarios/${form.id}`, payload);
    } else {
        await api.post('/usuarios', payload);
    }
    sucesso.value = 'Operação realizada com sucesso!';
    setTimeout(voltarParaLista, 1500);
  } catch (err) {
    erro.value = err.response?.data?.mensagem || 'Erro ao salvar.';
  } finally {
    isLoading.value = false;
  }
};

const abrirCriacao = async () => {
  Object.assign(form, { id: null, nome: '', email: '', nivelusuario: '', id_unidade_fk: '', id_setor_fk: '', id_celula_fk: '', id_turno_fk: '', cracha: '', senha: '', confirmarSenha: '' });
  if (unidades.value.length === 0) await carregarDependencias();
  modoAtual.value = 'formulario';
};

const abrirEdicao = async (user) => {
  Object.assign(form, { 
    id: user.id, nome: user.nome, email: user.email, nivelusuario: user.nivelusuario,
    id_unidade_fk: user.id_unidade_fk || '', id_setor_fk: user.id_setor_fk || '',
    id_celula_fk: user.id_celula_fk || '', id_turno_fk: user.id_turno_fk || '',
    cracha: user.codBar || user.cracha, senha: '', confirmarSenha: ''
  });
  if (unidades.value.length === 0) await carregarDependencias();
  modoAtual.value = 'formulario';
};

const voltarParaLista = () => { 
    modoAtual.value = 'lista'; 
    erro.value = ''; 
    sucesso.value = ''; 
    carregarUsuarios(); 
};

const acionarScanner = () => window.AndroidInterface?.iniciarScanner() || alert("Scanner indisponível.");
window.onCodigoLido = (c) => { if (modoAtual.value === 'formulario' && !form.id) form.cracha = c; };

onMounted(async () => { 
    verificarPermissoes(); 
    await carregarDependencias(); // Garante unidades carregadas para o lookup da tabela
    carregarUsuarios(); 
});
onUnmounted(() => delete window.onCodigoLido);
</script>

<style scoped>
.page-container { max-width: 1200px; margin: 0 auto; padding: 2rem; font-family: 'Inter', sans-serif; }
.header-n { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-titles h1 { margin: 0; font-size: 1.8rem; color: #1e293b; }
.header-titles p { margin: 5px 0 0 0; color: #64748b; }
.btn-novo { background: #27ae60; color: white; padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
.btn-voltar { background: #64748b; color: white; padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; }
.alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: bold; }
.error { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
.success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { text-align: left; padding: 1rem; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.9rem; text-transform: uppercase; }
.data-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
.badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; color: white; }
.nivel--1 { background: #8e44ad; } .nivel-1 { background: #2980b9; } .nivel-2 { background: #f39c12; } .nivel-0 { background: #94a3b8; }
.text-right { text-align: right; }
.btn-editar { background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-editar:disabled { background: #cbd5e1; cursor: not-allowed; }
.form-row { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.w-50 { flex: 1; min-width: 300px; } .w-33 { flex: 1; min-width: 200px; } .w-100 { width: 100%; }
.form-group label { display: block; font-weight: 700; margin-bottom: 0.5rem; color: #475569; font-size: 0.9rem; }
.input-base { width: 100%; padding: 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
.input-disabled { background: #f1f5f9; cursor: not-allowed; color: #94a3b8; }
.input-group { display: flex; width: 100%; }
.btn-scanner { background: #1e293b; color: white; border: none; padding: 0 1.2rem; border-radius: 0 8px 8px 0; cursor: pointer; }
.input-with-btn { border-radius: 8px 0 0 8px; }
.divisor { border: 0; height: 1px; background: #e2e8f0; margin: 2rem 0; }
.section-title { color: #1e293b; margin-bottom: 1rem; }
.form-actions-bottom { display: flex; justify-content: flex-end; margin-top: 2rem; }
.btn-salvar { background: #1e293b; color: white; padding: 1rem 2.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem; }
.spinner { border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: inline-block; margin-right: 10px; vertical-align: middle; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>