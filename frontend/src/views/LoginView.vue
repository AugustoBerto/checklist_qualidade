<template>
  <div class="page-container">
    <div class="titulo-flex">
      <h1>Login do Sistema</h1>
    </div>

    <div class="card">
      <div v-if="erroLogin" class="alert error">
        <i class="mdi mdi-alert-circle-outline"></i>
        <span>{{ erroLogin }}</span>
      </div>

      <form @submit.prevent="fazerLogin">
        <div class="form-group">
          <label for="usuario">Usuário:</label>
          <input type="text" id="usuario" v-model="form.usuario" required placeholder="Digite seu usuário"
            autocomplete="username" />
        </div>

        <div class="form-group">
          <label for="senha">Senha:</label>
          <div class="password-container">
            <input :type="mostrarSenha ? 'text' : 'password'" id="senha" v-model="form.senha" required
              placeholder="Digite sua senha" autocomplete="current-password" class="password-input" />
            <button type="button" class="toggle-password" @click="mostrarSenha = !mostrarSenha" :title="mostrarSenha ? 'Ocultar senha' : 'Exibir senha'">
              <i class="mdi" :class="mostrarSenha ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"></i>
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="login-button btn-primary" :disabled="carregando">
            <i class="mdi" :class="carregando ? 'mdi-loading mdi-spin' : 'mdi-login'"></i>
            <span>{{ carregando ? 'Entrando...' : 'Entrar no Sistema' }}</span>
          </button>
        </div>
      </form>

      <div class="login-footer">
        <p>Não tem uma conta? Entre em contato com o administrador.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { autenticarComSenha } from '../services/session'

const router = useRouter();

const form = reactive({
  usuario: '',
  senha: ''
});

const mostrarSenha = ref(false);
const carregando = ref(false);
const erroLogin = ref('');

const fazerLogin = async () => {
  erroLogin.value = '';
  carregando.value = true;
  try {
    await autenticarComSenha(form.usuario, form.senha);
    router.push('/selecao');
  } catch (err) {
    if (err.response && err.response.data) {
      erroLogin.value = err.response.data.mensagem || err.response.data.message || 'Usuário ou senha incorretos.';
    } else {
      erroLogin.value = 'Erro ao conectar com o servidor.';
    }
  } finally {
    carregando.value = false;
  }
};
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 75vh;
  background-color: var(--bg-body);
}

.titulo-flex {
  text-align: center;
  margin-bottom: 2rem;
}

.titulo-flex h1 {
  font-size: 2.2rem;
  color: var(--text-primary);
  font-weight: 800;
  letter-spacing: -0.5px;
}

.card {
  background: #ffffff !important;
  width: 100%;
  max-width: 450px;
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
}

.alert {
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
}

.alert.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecdd3;
}

/* CAMPOS DE TEXTO */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-group input {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  color: var(--text-primary);
  background-color: #f8fafc !important;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.form-group input:-webkit-autofill,
.form-group input:-webkit-autofill:hover,
.form-group input:-webkit-autofill:focus,
.form-group input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
  -webkit-text-fill-color: var(--text-primary) !important;
}

/* SENHA E OLHINHO */
.password-container {
  position: relative;
  width: 100%;
}

.password-input {
  padding-right: 50px !important;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  opacity: 0.6;
  transition: opacity 0.2s;
  padding: 5px;
  color: var(--text-primary);
}

.toggle-password:hover {
  opacity: 1;
}

/* BOTÕES DE AÇÃO */
.form-actions {
  margin-top: 1.5rem;
}

.login-button {
  width: 100%;
  padding: 1.2rem;
  font-size: 1.1rem;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.btn-primary {
  background: var(--primary);
  color: #ffffff;
  box-shadow: var(--shadow-md);
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

@media (max-width: 767px) {
  .page-container { min-height: auto; padding: 2rem 0; }
  .titulo-flex { margin-bottom: 1.5rem; }
  .titulo-flex h1 { font-size: 1.65rem; }
  .card { padding: 1.25rem; border-radius: 12px; }
  .form-group { margin-bottom: 1rem; }
  .toggle-password { min-width: 44px; min-height: 44px; }
  .login-button { min-height: 52px; padding: 1rem; }
}

.login-footer {
  margin-top: 2rem;
  text-align: center;
}

.login-footer p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}
</style>
