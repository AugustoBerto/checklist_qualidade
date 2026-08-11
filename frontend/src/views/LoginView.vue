<template>
  <div class="page-container">
    <div class="titulo-flex">
      <h1>Login do Sistema</h1>
    </div>

    <div class="card">
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
            <button type="button" class="toggle-password" @click="mostrarSenha = !mostrarSenha">
              <span v-if="mostrarSenha">👁️</span>
              <span v-else>👁️‍🗨️</span>
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="login-button">
            Entrar no Sistema
          </button>
        </div>
      </form>

      <div class="form-group">
        <label for="codBar">Código de barras</label>
        <input id="codBar" v-model.trim="form.codBar" inputmode="numeric" placeholder="Digite ou cole o código">
      </div>
      <div class="form-actions">
        <button type="button" class="login-button" @click="fazerLoginCodBar">Entrar com código de barras</button>
        <button v-if="leitorDisponivel" type="button" class="login-button" @click="abrirLeitor">Abrir leitor</button>
      </div>

      <div class="login-footer">
        <p>Não tem uma conta? Entre em contato com o administrador.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { autenticarComCracha, autenticarComSenha } from '../services/session'

const router = useRouter();

const form = reactive({
  usuario: '',
  senha: '',
  codBar: ''
});

const mostrarSenha = ref(false);
const leitorDisponivel = ref(false)

const fazerLogin = async () => {
  try {
    await autenticarComSenha(form.usuario, form.senha);
    router.push('/selecao');
  } catch (err) {
    if (err.response && err.response.data) {
      alert(err.response.data.mensagem || err.response.data.message || 'Usuário ou senha incorretos.');
    } else {
      alert('Erro ao conectar com o servidor.');
    }
  }
};

// 📌 Login via Código de Barras
const fazerLoginCodBar = async () => {
  if (!form.codBar) {
    alert('Código de barras inválido.');
    return;
  }

  try {
    await autenticarComCracha(form.codBar);
    router.push('/selecao');
  } catch (err) {
    if (err.response && err.response.data) {
      alert(err.response.data.mensagem || err.response.data.message || 'Não foi possível autenticar o crachá.');
    }
  }
};

const onCodigoLido = (codigo) => {
  if (codigo) {
    form.codBar = codigo;
    fazerLoginCodBar();
  } else {
    alert('Código de barras inválido (deve ter 14 dígitos).');
  }
};

onMounted(() => {
  leitorDisponivel.value = Boolean(window.AndroidInterface?.iniciarScanner)
  window.onCodigoLido = onCodigoLido;
});

const abrirLeitor = () => window.AndroidInterface?.iniciarScanner()

onUnmounted(() => {
  delete window.onCodigoLido;
});
</script>


<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 75vh;
  background-color: var(--bg-body); /* Força o fundo claro */
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
  background: #ffffff !important; /* Força o branco absoluto no card */
  width: 100%;
  max-width: 450px;
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); /* Sombra elegante */
  border: 1px solid var(--border-color);
}

/* ==========================================
   CAMPOS DE TEXTO
   ========================================== */
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
  background-color: #f8fafc !important; /* Força fundo cinza muito claro */
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); /* Brilho azul */
}

/* Essencial para evitar o fundo preto injetado pelo Android/Chrome ao preencher automático */
.form-group input:-webkit-autofill,
.form-group input:-webkit-autofill:hover,
.form-group input:-webkit-autofill:focus,
.form-group input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
  -webkit-text-fill-color: var(--text-primary) !important;
}

/* ==========================================
   SENHA E OLHINHO
   ========================================== */
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

/* ==========================================
   BOTÕES DE AÇÃO
   ========================================== */
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

.btn-scanner {
  background: #f8fafc;
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  margin-top: 0.5rem;
}

.btn-scanner:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: var(--primary); /* Fica azul ao tocar */
}

/* ==========================================
   DIVISOR E RODAPÉ
   ========================================== */
.divisor {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 2rem 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
}

.divisor::before,
.divisor::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.divisor:not(:empty)::before {
  margin-right: 1em;
}

.divisor:not(:empty)::after {
  margin-left: 1em;
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
