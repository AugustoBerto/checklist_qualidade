<template>
  <div class="page-container">
    <div class="header-n">
      <div><h1>Perfis operacionais</h1><p>Vincule uma matrícula existente no dass_auth ao Checklist.</p></div>
      <button v-if="modo === 'lista'" class="btn-novo" @click="novo">Novo perfil</button>
      <button v-else class="btn-voltar" @click="modo = 'lista'">Voltar</button>
    </div>
    <p v-if="erro" class="alert error">{{ erro }}</p>
    <p v-if="sucesso" class="alert success">{{ sucesso }}</p>
    <div v-if="modo === 'lista'" class="card">
      <div class="table-container"><table class="data-table"><thead><tr><th>Nome</th><th>Matrícula</th><th>Papel</th><th>Status</th><th></th></tr></thead>
        <tbody><tr v-for="perfil in perfis" :key="perfil.id"><td>{{ perfil.nome }}</td><td>{{ perfil.matricula }}</td><td>{{ perfil.papel }}</td><td>{{ perfil.ativo ? 'Ativo' : 'Inativo' }}</td><td><button @click="editar(perfil)">Editar</button></td></tr></tbody>
      </table></div>
    </div>
    <form v-else class="card form" @submit.prevent="salvar">
      <label>Matrícula <input v-model.trim="form.matricula" required :disabled="Boolean(form.id)"></label>
      <label v-if="form.id">Nome <input :value="form.nome" disabled></label>
      <label>Papel <select v-model="form.papel" required><option value="" disabled>Selecione</option><option value="ADMIN">Administrador</option><option value="LIDER">Líder</option><option value="INSPETOR">Inspetor</option></select></label>
      <label v-if="form.id">Função <input :value="form.funcao" disabled></label>
      <label>Unidade <select v-model="form.id_unidade_fk"><option value="">Não definida</option><option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nome }}</option></select></label>
      <label>Setor <select v-model="form.id_setor_fk"><option value="">Não definido</option><option v-for="s in setores" :key="s.id" :value="s.id">{{ s.nome }}</option></select></label>
      <label>Célula <select v-model="form.id_celula_fk"><option value="">Não definida</option><option v-for="c in celulas" :key="c.id" :value="c.id">{{ c.nome }}</option></select></label>
      <label>Turno <select v-model="form.id_turno_fk"><option value="">Não definido</option><option v-for="t in turnos" :key="t.id" :value="t.id">{{ t.nome }}</option></select></label>
      <label v-if="form.id">Status <select v-model="form.ativo"><option :value="true">Ativo</option><option :value="false">Inativo</option></select></label>
      <button class="btn-salvar" :disabled="salvando">{{ salvando ? 'Salvando...' : 'Salvar perfil' }}</button>
    </form>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const modo = ref('lista'), perfis = ref([]), unidades = ref([]), setores = ref([]), celulas = ref([]), turnos = ref([])
const erro = ref(''), sucesso = ref(''), salvando = ref(false)
const vazio = () => ({ id: null, matricula: '', nome: '', papel: '', funcao: '', ativo: true, id_unidade_fk: '', id_setor_fk: '', id_celula_fk: '', id_turno_fk: '' })
const form = reactive(vazio())
const dados = (r) => r.data?.dados || r.data?.unidades || []
const carregar = async () => { try { perfis.value = dados(await api.get('/perfis')) } catch { erro.value = 'Não foi possível carregar os perfis.' } }
const dependencias = async () => {
  const [u, s, c, t] = await Promise.all([api.get('/cadastros/unidades'), api.get('/cadastros/setores'), api.get('/cadastros/celulas'), api.get('/cadastros/turnos')])
  unidades.value = dados(u); setores.value = dados(s); celulas.value = dados(c); turnos.value = dados(t)
}
const novo = () => { Object.assign(form, vazio()); erro.value = ''; modo.value = 'formulario' }
const editar = (perfil) => { Object.assign(form, vazio(), perfil); erro.value = ''; modo.value = 'formulario' }
const salvar = async () => {
  salvando.value = true; erro.value = ''; sucesso.value = ''
  try {
    const { nome, funcao, id, ...payload } = form
    if (form.id) await api.put(`/perfis/${form.id}`, payload); else await api.post('/perfis', payload)
    sucesso.value = 'Perfil salvo.'; modo.value = 'lista'; await carregar()
  } catch (e) { erro.value = e.response?.data?.mensagem || 'Não foi possível salvar o perfil.' } finally { salvando.value = false }
}
onMounted(async () => { await Promise.all([carregar(), dependencias()]) })
</script>

<style scoped>
.page-container { max-width: 1100px; margin: auto; padding: 2rem; }
.header-n { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; }.header-n h1 { margin:0; }.header-n p { color:#666; }
.card { background:#fff; border:1px solid #ddd; border-radius:8px; padding:1.5rem; }.data-table { width:100%; border-collapse:collapse; }.data-table th,.data-table td { padding:.75rem; border-bottom:1px solid #ddd; text-align:left; }
.form { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:1rem; }.form label { display:grid; gap:.35rem; }.form input,.form select { padding:.55rem; }.btn-salvar { grid-column:1/-1; }.alert { padding:.75rem; border-radius:4px; }.error { background:#fee2e2; }.success { background:#dcfce7; }
@media (max-width: 767px) {
  .page-container { padding: 1rem; }
  .header-n { align-items: stretch; flex-direction: column; gap: 1rem; }
  .header-n > button { width: 100%; }
  .card { padding: 1rem; }
  .table-container { overflow-x: auto; }
  .data-table { min-width: 560px; }
  .form { grid-template-columns: 1fr; }
  .btn-salvar { min-height: 44px; }
}
</style>
