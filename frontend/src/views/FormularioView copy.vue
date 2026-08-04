<template>
  <div>
    <h1>Checklist - {{ nomeModelo }}</h1>
    <form @submit.prevent="enviarFormulario">
      <details v-for="(perguntas, categoria) in categorias" :key="categoria" class="sessaoOpcao"
        :class="getCategoryStatusClass(categoria)">
        <summary class="cabecalhoSessao">
          <h2>{{ categoria }}</h2>
          <span class="icone-acordeao">+</span>
        </summary>
        <div class="conteudoSessao">
          <div v-for="pergunta in perguntas" :key="pergunta.variavel" class="grupoPergunta">
            <div class="pergunta-e-opcoes-wrapper">
              <label class="textoPergunta">{{ pergunta.texto }}</label>
              <div class="grupoOpcao">
                <label><input type="radio" :name="pergunta.variavel" value="Conforme"
                    v-model="respostas[pergunta.variavel]"> Conforme</label>
                <label><input type="radio" :name="pergunta.variavel" value="Não Conforme"
                    v-model="respostas[pergunta.variavel]"> Não Conforme</label>
                <label><input type="radio" :name="pergunta.variavel" value="N/A" v-model="respostas[pergunta.variavel]">
                  Não se aplica</label>
              </div>
            </div>
            <div v-if="respostas[pergunta.variavel] === 'Não Conforme'" class="captura-foto-container">
              <button type="button" class="botao-foto" @click="solicitarFoto(pergunta.variavel)">
                📷 Tirar/Anexar Foto
              </button>

              <div v-if="fotosNaoConformes[pergunta.variavel]" class="foto-preview">
                <img :src="fotosNaoConformes[pergunta.variavel]" alt="Preview da Não Conformidade">
                <span class="foto-adicionada-label">Foto Adicionada ✔️</span>
              </div>

              <div v-else class="foto-pendente-label" :class="{ 'obrigatorio': requirePhotoOnNonConforme }">
                {{ requirePhotoOnNonConforme ? 'Foto obrigatória' : 'Foto opcional' }}
              </div>
              <div class="observacao-container">
                <label :for="'obs-' + pergunta.variavel" class="label-observacao">
                  Ação Corretiva / Observação
                  <span v-if="requireObservacaoOnNonConforme" class="observacao-obrigatoria">*</span>
                </label>
                <textarea :id="'obs-' + pergunta.variavel" v-model="observacoesNaoConformes[pergunta.variavel]"
                  placeholder="Descreva a não conformidade ou a ação corretiva a ser tomada..." rows="3"
                  class="textarea-observacao"></textarea>
              </div>
            </div>
          </div>
        </div>
      </details>
      <div>
        <label for="signatureRef">Assine abaixo:</label>
        <SignaturePad ref="signatureRef" width="100%" height="400px"
          :options="{ penColor: 'black', backgroundColor: 'white' }" @endStroke="atualizarAssinatura"
          style="border: 1px solid #ccc;" />

        <div class="mt-2">
          <button @click="clear" type="button">Limpar</button>
        </div>
      </div>

      <button type="submit" :disabled="enviando">
        {{ enviando ? 'Enviando...' : 'Enviar' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api'; // 📌 Usando nossa instância configurada
import SignaturePad from 'vue3-signature';
import localforage from 'localforage';

localforage.config({
  name: 'AppLideranca',
  storeName: 'rascunhos_checklist'
});

const route = useRoute();
const router = useRouter();
const modelo = route.params.modelo;

// Estados do Formulário
const categorias = ref({});
const respostas = ref({});
const nomeModelo = ref('');
const assinatura = ref(null);
const signatureRef = ref(null);
const enviando = ref(false); 
const inicioChecklistTimestamp = ref(null);
const fotosNaoConformes = ref({}); 
const observacoesNaoConformes = ref({}); 

const requirePhotoOnNonConforme = ref(true); 
const requireObservacaoOnNonConforme = ref(true); 

// Chave do rascunho baseada no usuário logado e modelo
const usuarioSalvo = localStorage.getItem('usuario') || 'desconhecido';
const rascunhoKey = `checklist_rascunho_${usuarioSalvo}_${modelo}`;

// --- LÓGICA DE RASCUNHO (IndexedDB) ---
watch([respostas, fotosNaoConformes, observacoesNaoConformes, inicioChecklistTimestamp], async () => {
  try {
    const rascunho = JSON.parse(JSON.stringify({
      respostas: respostas.value,
      fotosNaoConformes: fotosNaoConformes.value,
      observacoesNaoConformes: observacoesNaoConformes.value,
      inicioChecklistTimestamp: inicioChecklistTimestamp.value
    }));
    await localforage.setItem(rascunhoKey, rascunho);
  } catch (e) {
    console.error('Erro ao salvar rascunho:', e);
  }
}, { deep: true });

onMounted(async () => {
  window.onFotoCapturada = onFotoCapturada;

  // Recuperar Rascunho
  try {
    const rascunho = await localforage.getItem(rascunhoKey);
    if (rascunho) {
      respostas.value = rascunho.respostas || {};
      fotosNaoConformes.value = rascunho.fotosNaoConformes || {};
      observacoesNaoConformes.value = rascunho.observacoesNaoConformes || {};
      inicioChecklistTimestamp.value = rascunho.inicioChecklistTimestamp;
    } else {
      inicioChecklistTimestamp.value = new Date().toISOString();
    }
  } catch (e) {
    inicioChecklistTimestamp.value = new Date().toISOString();
  }

  // Buscar Perguntas do Backend
  try {
    // 📌 Rota atualizada: /api/checklists/perguntas/:id
    const res = await api.get(`/checklists/perguntas/${modelo}`);
    categorias.value = res.data.respostasAgrupadas;
    
    const primeiraCategoria = Object.values(res.data.respostasAgrupadas)[0];
    if (primeiraCategoria?.length > 0) {
      nomeModelo.value = primeiraCategoria[0].modelo;
    }
  } catch (err) {
    console.error('Erro ao carregar perguntas:', err);
  }
});

onUnmounted(() => {
  delete window.onFotoCapturada;
});

// --- AUXILIARES DE INTERFACE ---
const categoryStatus = computed(() => {
  const status = {};
  for (const categoria in categorias.value) {
    const perguntas = categorias.value[categoria];
    const respondidas = perguntas.filter(p => respostas.value[p.variavel]).length;
    if (perguntas.length > 0 && respondidas === perguntas.length) {
      status[categoria] = perguntas.some(p => respostas.value[p.variavel] === 'Não Conforme') 
        ? 'nao-conforme' : 'conforme';
    } else {
      status[categoria] = 'pendente';
    }
  }
  return status;
});

const getCategoryStatusClass = (cat) => categoryStatus.value[cat] || 'pendente';

const clear = () => {
  signatureRef.value.clear();
  assinatura.value = null;
};

const atualizarAssinatura = () => {
  if (signatureRef.value && !signatureRef.value.isEmpty()) {
    assinatura.value = signatureRef.value.save();
  }
};

// --- CAPTURA DE FOTO ---
const solicitarFoto = (variavel) => {
  if (window.AndroidInterface?.capturarFoto) {
    window.AndroidInterface.capturarFoto(variavel);
  } else {
    // Mock para teste em PC
    onFotoCapturada(variavel, 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w');
  }
};

const onFotoCapturada = (variavel, fotoBase64) => {
  if (fotoBase64) {
    fotosNaoConformes.value[variavel] = fotoBase64.startsWith('data:image') 
      ? fotoBase64 : `data:image/jpeg;base64,${fotoBase64}`;
  }
};

// --- ENVIO FINAL ---
async function enviarFormulario() {
  if (enviando.value) return;
  
  atualizarAssinatura();

  // Validação: Todas as perguntas preenchidas
  for (const cat in categorias.value) {
    for (const p of categorias.value[cat]) {
      if (!respostas.value[p.variavel]) {
        alert(`Por favor, responda a pergunta: "${p.texto}"`);
        return;
      }
    }
  }

  if (!assinatura.value) {
    alert('A assinatura é obrigatória.');
    return;
  }

  // Validação: Fotos e Observações em Não Conformidades
  for (const varName in respostas.value) {
    if (respostas.value[varName] === 'Não Conforme') {
      if (requirePhotoOnNonConforme.value && !fotosNaoConformes.value[varName]) {
        alert('Foto obrigatória para itens Não Conformes.');
        return;
      }
      if (requireObservacaoOnNonConforme.value && !observacoesNaoConformes.value[varName]?.trim()) {
        alert('Observação obrigatória para itens Não Conformes.');
        return;
      }
    }
  }

  enviando.value = true;

  // Montagem do Payload para o novo Backend
  const respostasFormatadas = [];
  for (const categoria in categorias.value) {
    for (const pergunta of categorias.value[categoria]) {
      const v = pergunta.variavel;
      respostasFormatadas.push({
        modelo: nomeModelo.value,
        categoria: categoria,
        pergunta: pergunta.texto,
        identificacao: v,
        resposta: respostas.value[v], 
        foto: fotosNaoConformes.value[v] || null,
        observacao: observacoesNaoConformes.value[v] || null 
      });
    }
  }

  const payload = {
    assinatura: assinatura.value,
    respostas: respostasFormatadas,
    id_submissao: null,
    inicio_checklist: inicioChecklistTimestamp.value
  };

  try {
    // 📌 Rota atualizada: POST /api/checklists/salvar
    const res = await api.post('/checklists/salvar', payload);

    alert('Checklist enviado com sucesso!');
    await localforage.removeItem(rascunhoKey);
    
    // Redireciona para o relatório usando o ID retornado pelo banco
    router.push(`/relatorio/${res.data.id_formulario}`);
  } catch (err) {
    console.error('Erro ao enviar:', err);
    alert('Erro ao salvar o checklist no servidor.');
    enviando.value = false;
  }
}
</script>

<style scoped>
/* Estilos Gerais */
h1 {
  color: #333;
  margin-bottom: 1.5rem;
}

form {
  margin-top: 2rem;
}

/* Estilização do Acordeão (Sessão de Categoria) */
.sessaoOpcao {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.sessaoOpcao[open] {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.sessaoOpcao[open] .icone-acordeao {
  transform: rotate(45deg);
}

.cabecalhoSessao {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  background-color: #f9f9f9;
  transition: background-color 0.4s ease;
}

/* --- NOVAS CLASSES DE COR --- */
.sessaoOpcao.conforme>.cabecalhoSessao {
  background-color: #e6ffed;
  border-left: 5px solid #28a745;
}

.sessaoOpcao.nao-conforme>.cabecalhoSessao {
  background-color: #ffeded;
  border-left: 5px solid #dc3545;
}

/* -------------------------- */


.cabecalhoSessao::-webkit-details-marker {
  display: none;
}

.cabecalhoSessao:focus {
  outline: none;
  box-shadow: 0 0 0 2px #a7a7a7;
}

.cabecalhoSessao:hover {
  background-color: #f0f0f0;
}

/* Garante que o hover não substitua a cor de status */
.sessaoOpcao.conforme>.cabecalhoSessao:hover {
  background-color: #d1f7dd;
}

.sessaoOpcao.nao-conforme>.cabecalhoSessao:hover {
  background-color: #fce2e2;
}


.cabecalhoSessao h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.icone-acordeao {
  font-size: 2rem;
  font-weight: 300;
  color: #555;
  transition: transform 0.3s ease;
}

.conteudoSessao {
  padding: 0 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.grupoPergunta {
  display: flex;
  flex-direction: column;
  /* Sempre em coluna para que o wrapper e a foto fiquem um abaixo do outro */
  padding: 1.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.grupoPergunta:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* NOVO ESTILO PARA O WRAPPER */
.pergunta-e-opcoes-wrapper {
  display: flex;
  flex-direction: column;
  /* Por padrão, texto e opções em coluna */
  width: 100%;
  /* Ocupa toda a largura disponível */
  margin-bottom: 1rem;
  /* Espaço entre wrapper e o container da foto */
}

/* FIM NOVO ESTILO PARA O WRAPPER */


.textoPergunta {
  margin-bottom: 1rem;
  font-size: 1rem;
  font-weight: 500;
  color: #555;
}

.grupoOpcao {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.grupoOpcao label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 1rem;
}

.grupoOpcao input[type="radio"] {
  margin-right: 0.5rem;
  accent-color: #007bff;
  width: 1.2em;
  height: 1.2em;
}

button[type="submit"] {
  display: block;
  width: 100%;
  padding: 1rem;
  margin-top: 2rem;
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
  background-color: #007bff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button[type="submit"]:hover {
  background-color: #0056b3;
}

/* --- NOVOS ESTILOS PARA O BLOCO DE FOTO --- */
.captura-foto-container {
  border-top: 1px dashed #ccc;
  margin-top: 1rem;
  /* Adicionado margem superior para separar do wrapper */
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  /* Garante que ocupe a largura total */
}

.botao-foto {
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  color: #333;
  width: fit-content;
}

.botao-foto:hover {
  background-color: #e0e0e0;
}

.foto-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.foto-preview img {
  max-width: 100%;
  height: auto;
  max-height: 200px;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.foto-adicionada-label {
  color: #28a745;
  font-weight: bold;
  font-size: 0.9rem;
}

.foto-pendente-label {
  color: #6c757d;
  font-size: 0.9rem;
  font-style: italic;
}

.foto-pendente-label.obrigatorio {
  color: #dc3545;
  font-weight: bold;
  font-style: normal;
}

/* Estilo para o botão "Limpar" da assinatura */
form button[type="button"] {
  background: #f0f0f0;
  color: #333;
  border: 1px solid #ccc;
  padding: 0.6em 1.2em;
  width: auto;
  margin-top: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

form button[type="button"]:hover {
  background: #e0e0e0;
  transform: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.mt-2 {
  margin-top: 0.5rem;
}


.observacao-container {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed #ccc;
  /* Linha separadora, igual ao container da foto */
  width: 100%;
}

.label-observacao {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
  font-size: 0.95rem;
  /* Um pouco menor que a pergunta principal */
}

.observacao-obrigatoria {
  color: #dc3545;
  /* Vermelho de erro/obrigatório */
  font-weight: bold;
  margin-left: 2px;
}

.textarea-observacao {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  /* Garante que use a mesma fonte do app */
  line-height: 1.5;
  resize: vertical;
  /* Permite que o usuário redimensione verticalmente */
  box-sizing: border-box;
  /* Garante que o padding não quebre o layout */
  min-height: 80px;
}

.textarea-observacao:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}


@media (min-width: 768px) {

  /* No media query, apenas o wrapper interno se torna flex-row */
  .pergunta-e-opcoes-wrapper {
    flex-direction: row;
    /* Faz a label e as opções ficarem lado a lado */
    justify-content: space-between;
    align-items: center;
  }

  .textoPergunta {
    margin-bottom: 0;
    /* Remove a margem vertical se estiver lado a lado */
    flex: 1;
    /* Permite que o texto ocupe o espaço restante */
    margin-right: 1rem;
    /* Espaço entre o texto e as opções */
  }

  .grupoOpcao {
    flex-shrink: 0;
    /* Impede que as opções encolham demais */
  }

  button[type="submit"] {
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>