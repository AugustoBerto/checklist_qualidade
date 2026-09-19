<template>
  <div class="login-wrapper">
    <div class="login-card">
      <!-- Header do Card -->
      <div class="login-card-header">
        <div class="header-icon-badge">
          <i class="mdi mdi-shield-account-outline"></i>
        </div>
        <h1 class="login-title">Acesso ao Sistema</h1>
        <p class="login-subtitle">Informe suas credenciais para continuar</p>
      </div>

      <!-- Alerta de Erro -->
      <transition name="fade">
        <div v-if="erroLogin" class="alert-box error" role="alert">
          <i class="mdi mdi-alert-circle-outline alert-icon"></i>
          <span class="alert-text">{{ erroLogin }}</span>
        </div>
      </transition>

      <!-- Formulário de Login -->
      <form @submit.prevent="fazerLogin" class="login-form">
        <!-- Campo Usuário -->
        <div class="form-group">
          <label for="usuario" class="form-label">Usuário</label>
          <div class="input-wrapper">
            <i class="mdi mdi-account-outline field-icon"></i>
            <input
              type="text"
              id="usuario"
              v-model="form.usuario"
              required
              placeholder="Ex: jose.falcao"
              autocomplete="username"
              class="form-control"
              :disabled="carregando"
            />
          </div>
        </div>

        <!-- Campo Senha -->
        <div class="form-group">
          <div class="label-row">
            <label for="senha" class="form-label">Senha</label>
          </div>
          <div class="input-wrapper">
            <i class="mdi mdi-lock-outline field-icon"></i>
            <input
              :type="mostrarSenha ? 'text' : 'password'"
              id="senha"
              v-model="form.senha"
              required
              placeholder="********"
              autocomplete="current-password"
              class="form-control password-input"
              :disabled="carregando"
            />
            <button
              type="button"
              class="toggle-password-btn"
              @click="mostrarSenha = !mostrarSenha"
              :title="mostrarSenha ? 'Ocultar senha' : 'Exibir senha'"
              :aria-label="mostrarSenha ? 'Ocultar senha' : 'Exibir senha'"
              tabindex="-1"
            >
              <i class="mdi" :class="mostrarSenha ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"></i>
            </button>
          </div>
        </div>

        <!-- Ações / Botão Entrar -->
        <div class="form-actions">
          <button
            type="submit"
            class="submit-btn"
            :disabled="carregando"
          >
            <i class="mdi" :class="carregando ? 'mdi-loading mdi-spin' : 'mdi-login-variant'"></i>
            <span>{{ carregando ? 'Autenticando...' : 'Entrar no Sistema' }}</span>
          </button>
        </div>
      </form>

      <!-- Rodapé do Card -->
      <div class="login-card-footer">
        <p class="footer-help">
          Não tem uma conta ou esqueceu a senha?
          <span class="help-highlight">Contate o administrador do sistema.</span>
        </p>
        <div class="security-indicator">
          <i class="mdi mdi-shield-check-outline"></i>
          <span>Autenticação segura (Unix SEST)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { autenticarComSenha, consumirFalhaRestauracao } from '../services/session'

const router = useRouter()

const form = reactive({
  usuario: '',
  senha: ''
})

const mostrarSenha = ref(false)
const carregando = ref(false)
const erroLogin = ref(consumirFalhaRestauracao() || '')

const fazerLogin = async () => {
  erroLogin.value = ''
  carregando.value = true
  try {
    await autenticarComSenha(form.usuario, form.senha)
    router.push('/selecao')
  } catch (err) {
    if (err.response && err.response.data) {
      erroLogin.value = err.response.data.mensagem || err.response.data.message || 'Usuário ou senha incorretos.'
    } else {
      erroLogin.value = 'Erro ao conectar com o servidor.'
    }
  } finally {
    carregando.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.25rem;
  background: radial-gradient(circle at 50% 20%, rgba(177, 7, 44, 0.04) 0%, rgba(248, 250, 252, 0) 60%), var(--bg-body, #f8fafc);
}

.login-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 35px -10px rgba(15, 23, 42, 0.07), 0 1px 3px 0 rgba(15, 23, 42, 0.04);
  padding: 2.75rem 2.25rem;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* Faixa decorativa no topo */
.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary, #b1072c), #e11d48, #f43f5e);
}

.login-card-header {
  text-align: center;
  margin-bottom: 2rem;
}

.header-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: var(--primary-light, #fff1f2);
  border: 1px solid var(--primary-border, #fecdd3);
  border-radius: 14px;
  color: var(--primary, #b1072c);
  font-size: 1.6rem;
  margin-bottom: 1.25rem;
}

.login-title {
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--text-primary, #0f172a);
  margin: 0 0 0.4rem 0;
  letter-spacing: -0.02em;
}

.login-subtitle {
  font-size: 0.92rem;
  color: var(--text-secondary, #64748b);
  margin: 0;
  line-height: 1.45;
}

/* Alerta de erro */
.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  margin-bottom: 1.35rem;
  font-size: 0.88rem;
  line-height: 1.4;
}

.alert-box.error {
  background-color: #fff1f2;
  border: 1px solid #fecdd3;
  color: #be123c;
}

.alert-icon {
  font-size: 1.2rem;
  line-height: 1;
  flex-shrink: 0;
}

.alert-text {
  font-weight: 600;
}

/* Campos de Formulário */
.form-group {
  margin-bottom: 1.35rem;
}

.form-label {
  display: block;
  font-size: 0.88rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.45rem;
  letter-spacing: -0.01em;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 14px;
  color: #94a3b8;
  font-size: 1.2rem;
  pointer-events: none;
  transition: color 0.2s ease;
}

.form-control {
  width: 100%;
  height: 48px;
  padding: 0 1rem 0 2.75rem;
  font-size: 0.95rem;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.form-control::placeholder {
  color: #94a3b8;
  opacity: 0.8;
}

.form-control:hover:not(:disabled) {
  border-color: #94a3b8;
  background-color: #ffffff;
}

.form-control:focus {
  outline: none;
  background-color: #ffffff;
  border-color: var(--primary, #b1072c);
  box-shadow: 0 0 0 4px rgba(177, 7, 44, 0.12);
}

.input-wrapper:focus-within .field-icon {
  color: var(--primary, #b1072c);
}

.form-control:-webkit-autofill,
.form-control:-webkit-autofill:hover,
.form-control:-webkit-autofill:focus,
.form-control:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
  -webkit-text-fill-color: var(--text-primary, #0f172a) !important;
}

/* Campo Senha */
.password-input {
  padding-right: 2.75rem !important;
}

.toggle-password-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #94a3b8;
  border-radius: 8px;
  font-size: 1.15rem;
  transition: all 0.15s ease;
}

.toggle-password-btn:hover {
  color: #334155;
  background-color: #f1f5f9;
}

/* Botão de Envio */
.form-actions {
  margin-top: 1.75rem;
}

.submit-btn {
  width: 100%;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, var(--primary, #b1072c) 0%, #900422 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(177, 7, 44, 0.25);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #c71940 0%, var(--primary, #b1072c) 100%);
  box-shadow: 0 6px 16px rgba(177, 7, 44, 0.35);
  transform: translateY(-1px);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(177, 7, 44, 0.2);
}

.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Rodapé */
.login-card-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f1f5f9;
  text-align: center;
}

.footer-help {
  font-size: 0.84rem;
  color: #64748b;
  margin: 0 0 1rem 0;
  line-height: 1.45;
}

.help-highlight {
  display: block;
  color: #475569;
  font-weight: 600;
  margin-top: 0.2rem;
}

.security-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 500;
  color: #94a3b8;
  background: #f8fafc;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
}

.security-indicator i {
  font-size: 0.95rem;
  color: #10b981;
}

/* Transição de fade para o alerta */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 480px) {
  .login-wrapper {
    padding: 1.25rem 1rem;
    min-height: calc(100vh - 80px);
  }
  .login-card {
    padding: 2rem 1.5rem;
    border-radius: 16px;
  }
  .login-title {
    font-size: 1.4rem;
  }
}
</style>
