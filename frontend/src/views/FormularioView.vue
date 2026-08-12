<template>
  <div class="page-container">
    <div class="header-n">
      <div class="header-titles">
        <h1><i class="mdi mdi-clipboard-check-outline"></i> Checklist</h1>
        <p>Modelo: <strong>{{ nomeModelo }}</strong></p>
      </div>
    </div>

    <form @submit.prevent="enviarFormulario" class="form-checklist">
      <div class="card progresso">
        <strong>{{ progresso.respondidas }} de {{ progresso.total }} itens respondidos</strong>
        <progress :value="progresso.respondidas" :max="progresso.total || 1"></progress>
        <span v-if="progresso.pendentes.length">Pendentes: {{ progresso.pendentes.join(', ') }}</span>
      </div>
      <details v-for="(perguntas, categoria) in categorias" :key="categoria" class="sessaoOpcao"
        :class="getCategoryStatusClass(categoria)">
        <summary class="cabecalhoSessao">
          <div class="titulo-categoria-wrapper">
            <h2>{{ categoria }}</h2>
            <img v-if="perguntas[0]?.ctq" src="../assets/ctq.png" alt="Processo Crítico" class="icone-ctq-categoria" />
          </div>
          <span class="icone-acordeao"><i class="mdi mdi-plus"></i></span>
        </summary>
        
        <div class="conteudoSessao">
          <div v-for="pergunta in perguntas" :key="pergunta.variavel" class="grupoPergunta">
            <div class="pergunta-e-opcoes-wrapper">
              <label class="textoPergunta">{{ pergunta.texto }}</label>
              <div class="grupoOpcao">
                <label class="radio-label">
                  <input type="radio" :name="pergunta.variavel" value="Conforme" v-model="respostas[pergunta.variavel]"> 
                  <span>Conforme</span>
                </label>
                <label class="radio-label">
                  <input type="radio" :name="pergunta.variavel" value="Não Conforme" v-model="respostas[pergunta.variavel]"> 
                  <span>Não Conforme</span>
                </label>
                <label class="radio-label">
                  <input type="radio" :name="pergunta.variavel" value="N/A" v-model="respostas[pergunta.variavel]">
                  <span>N/A</span>
                </label>
              </div>
            </div>

            <div v-if="respostas[pergunta.variavel] === 'Não Conforme'" class="captura-foto-container">
              <div class="foto-actions">
                <button type="button" class="btn-foto" @click="solicitarFoto(pergunta.variavel)">
                  <i class="mdi mdi-camera"></i> Tirar/Anexar Foto
                </button>
                <input
                  :ref="(element) => registrarInputFoto(pergunta.variavel, element)"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  class="input-foto"
                  @change="processarArquivoFoto(pergunta.variavel, $event)"
                >

                <div v-if="fotosNaoConformes[pergunta.variavel]" class="foto-preview">
                  <img v-if="!errosFotos[pergunta.variavel]" :src="fotosNaoConformes[pergunta.variavel]" alt="Prévia da evidência" @error="marcarErroFoto(pergunta.variavel)">
                  <span v-else class="foto-status-pendente obrigatorio">Não foi possível exibir a foto. Anexe outra imagem.</span>
                  <span class="foto-status-ok"><i class="mdi mdi-check-circle"></i> Foto Adicionada</span>
                </div>
                <div v-else class="foto-status-pendente" :class="{ 'obrigatorio': requirePhotoOnNonConforme }">
                  {{ requirePhotoOnNonConforme ? '⚠️ Foto obrigatória' : 'Foto opcional' }}
                </div>
              </div>
              <p v-if="errosFotos[pergunta.variavel]" class="foto-erro" role="alert">{{ errosFotos[pergunta.variavel] }}</p>

              <div class="observacao-container">
                <label :for="'obs-' + pergunta.variavel" class="label-observacao">
                  Observação da não conformidade
                  <span v-if="requireObservacaoOnNonConforme" class="obrigatorio">*</span>
                </label>
                <textarea :id="'obs-' + pergunta.variavel" v-model="observacoesNaoConformes[pergunta.variavel]"
                  placeholder="Descreva o problema ou a ação necessária..." rows="3"
                  class="input-base textarea-obs"></textarea>
              </div>
            </div>
          </div>
        </div>
      </details>

      <div class="card card-assinatura">
        <h3 class="section-title"><i class="mdi mdi-pen"></i> Assinatura do Responsável</h3>
        <div class="signature-wrapper">
          <SignaturePad ref="signatureRef" width="100%" height="300px"
            :options="{ penColor: 'black', backgroundColor: '#f8fafc' }" @endStroke="atualizarAssinatura" />
        </div>
        <div class="signature-actions">
          <button @click="clear" type="button" class="btn-limpar">
            <i class="mdi mdi-eraser"></i> Limpar Assinatura
          </button>
        </div>
      </div>

      <div class="form-actions-main">
        <button type="submit" class="btn-enviar" :disabled="enviando">
          <i class="mdi" :class="enviando ? 'mdi-loading mdi-spin' : 'mdi-send'"></i>
          {{ enviando ? 'Enviando Checklist...' : 'Finalizar e Enviar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api'; 
import SignaturePad from 'vue3-signature';
import localforage from 'localforage';
import { obterPerfilLocal } from '../services/session';
import { createDraftPersistence } from '../services/draftPersistence';

localforage.config({
  name: 'AppLideranca',
  storeName: 'rascunhos_checklist'
});

const route = useRoute();
const router = useRouter();
const modelo = route.params.modelo;

const celulaSelecionada = ref(route.query.celula || localStorage.getItem('celula_auditada_atual') || null);
const setorSelecionado = ref(route.query.setor || null);

const usuarioObj = obterPerfilLocal() || { id: null, id_celula_fk: null, id_setor_fk: null };

const categorias = ref({});
const respostas = ref({});
const nomeModelo = ref('');
const idModelo = ref(null); 
const assinatura = ref(null);
const signatureRef = ref(null);
const enviando = ref(false); 
const inicioChecklistTimestamp = ref(null);
const fotosNaoConformes = ref({}); 
const errosFotos = ref({});
const observacoesNaoConformes = ref({}); 
const requirePhotoOnNonConforme = ref(true); 
const requireObservacaoOnNonConforme = ref(true); 

const rascunhoKey = `checklist_rascunho_${usuarioObj.id || 'desconhecido'}_${modelo}_${setorSelecionado.value || usuarioObj.id_setor_fk || 'sem-setor'}_${celulaSelecionada.value || usuarioObj.id_celula_fk || 'sem-celula'}`;
const inputsFoto = new Map();
const MAX_FOTO_BYTES = 2 * 1024 * 1024;
const persistenciaRascunho = createDraftPersistence(localforage, rascunhoKey);
let rascunhoCarregado = false;

const obterMetadataRascunho = () => ({
  respostas: respostas.value,
  observacoesNaoConformes: observacoesNaoConformes.value,
  inicioChecklistTimestamp: inicioChecklistTimestamp.value
});

watch([respostas, observacoesNaoConformes, inicioChecklistTimestamp], () => {
  if (rascunhoCarregado) persistenciaRascunho.schedule(obterMetadataRascunho());
}, { deep: true });

watch(respostas, () => {
  if (!rascunhoCarregado) return;
  for (const variavel of Object.keys(fotosNaoConformes.value)) {
    if (respostas.value[variavel] !== 'Não Conforme') {
      const { [variavel]: _, ...fotosRestantes } = fotosNaoConformes.value;
      fotosNaoConformes.value = fotosRestantes;
      void persistenciaRascunho.removePhoto(variavel, obterMetadataRascunho());
    }
  }
}, { deep: true });

onMounted(async () => {
  window.onFotoCapturada = onFotoCapturada;
  try {
    const rascunho = await persistenciaRascunho.load();
    if (rascunho) {
      respostas.value = rascunho.metadata.respostas || {};
      fotosNaoConformes.value = rascunho.fotos;
      observacoesNaoConformes.value = rascunho.metadata.observacoesNaoConformes || {};
      inicioChecklistTimestamp.value = rascunho.metadata.inicioChecklistTimestamp;
    } else {
      inicioChecklistTimestamp.value = new Date().toISOString();
    }
  } catch (e) {
    inicioChecklistTimestamp.value = new Date().toISOString();
  }
  rascunhoCarregado = true;
  document.addEventListener('visibilitychange', salvarRascunhoAoOcultar);
  window.addEventListener('pagehide', salvarRascunhoAoOcultar);
  
  try {
    const res = await api.get(`/checklists/perguntas/${modelo}`);
    categorias.value = res.data.respostasAgrupadas;
    
    const primeiraCategoria = Object.values(res.data.respostasAgrupadas)[0];
    if (primeiraCategoria?.length > 0) {
      nomeModelo.value = primeiraCategoria[0].modelo || primeiraCategoria[0].nome_modelo;
      idModelo.value = primeiraCategoria[0].id_modelo || primeiraCategoria[0].id_modelo_fk || null;
    }
  } catch (err) {
    console.error('Erro ao carregar perguntas:', err);
  }
});

onUnmounted(() => {
  delete window.onFotoCapturada;
  document.removeEventListener('visibilitychange', salvarRascunhoAoOcultar);
  window.removeEventListener('pagehide', salvarRascunhoAoOcultar);
  if (rascunhoCarregado) void persistenciaRascunho.flush(obterMetadataRascunho());
});

const salvarRascunhoAoOcultar = (event) => {
  if ((event?.type === 'pagehide' || document.visibilityState === 'hidden') && rascunhoCarregado) {
    void persistenciaRascunho.flush(obterMetadataRascunho());
  }
};

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

const progresso = computed(() => {
  const pendentes = [];
  let total = 0;
  let respondidas = 0;
  for (const categoria in categorias.value) {
    const perguntas = categorias.value[categoria];
    total += perguntas.length;
    const respondidasCategoria = perguntas.filter((p) => respostas.value[p.variavel]).length;
    respondidas += respondidasCategoria;
    if (respondidasCategoria < perguntas.length) pendentes.push(categoria);
  }
  return { total, respondidas, pendentes };
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

const solicitarFoto = (variavel) => {
  if (window.AndroidInterface?.capturarFoto) {
    window.AndroidInterface.capturarFoto(variavel);
  } else {
    inputsFoto.get(variavel)?.click();
  }
};

const registrarInputFoto = (variavel, element) => {
  if (element) inputsFoto.set(variavel, element);
  else inputsFoto.delete(variavel);
};

const marcarErroFoto = (variavel, mensagem = 'Não foi possível processar a imagem selecionada.') => {
  errosFotos.value = { ...errosFotos.value, [variavel]: mensagem };
};

const limparErroFoto = (variavel) => {
  const { [variavel]: _, ...outrosErros } = errosFotos.value;
  errosFotos.value = outrosErros;
};

const tamanhoBase64 = (dataUrl) => Math.ceil((dataUrl.split(',')[1] || '').length * 3 / 4);

const carregarImagem = (origem) => new Promise((resolve, reject) => {
  const imagem = new Image();
  imagem.onload = () => resolve(imagem);
  imagem.onerror = () => reject(new Error('Imagem inválida'));
  imagem.src = origem;
});

async function comprimirImagem(origem) {
  const imagem = await carregarImagem(origem);
  const escala = Math.min(1, 1600 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
  canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
  canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);

  for (const qualidade of [0.85, 0.7, 0.55, 0.4]) {
    const resultado = canvas.toDataURL('image/jpeg', qualidade);
    if (tamanhoBase64(resultado) <= MAX_FOTO_BYTES) return resultado;
  }
  throw new Error('A imagem é muito grande mesmo após compressão. Escolha outra foto.');
}

async function salvarFoto(variavel, origem) {
  try {
    const foto = await comprimirImagem(origem);
    fotosNaoConformes.value = { ...fotosNaoConformes.value, [variavel]: foto };
    void persistenciaRascunho.setPhoto(variavel, foto, obterMetadataRascunho());
    limparErroFoto(variavel);
  } catch (erro) {
    marcarErroFoto(variavel, erro.message);
  }
}

async function processarArquivoFoto(variavel, event) {
  const arquivo = event.target.files?.[0];
  event.target.value = '';
  if (!arquivo) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
    marcarErroFoto(variavel, 'Selecione uma imagem JPEG, PNG ou WebP.');
    return;
  }
  const origem = URL.createObjectURL(arquivo);
  try {
    await salvarFoto(variavel, origem);
  } finally {
    URL.revokeObjectURL(origem);
  }
}

const onFotoCapturada = async (variavel, fotoBase64) => {
  if (typeof fotoBase64 !== 'string' || !fotoBase64.trim()) {
    marcarErroFoto(variavel, 'O aplicativo não retornou uma foto válida.');
    return;
  }
  const origem = fotoBase64.startsWith('data:image/') ? fotoBase64 : `data:image/jpeg;base64,${fotoBase64}`;
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(origem)) {
    marcarErroFoto(variavel, 'O aplicativo retornou uma imagem em formato inválido.');
    return;
  }
  await salvarFoto(variavel, origem);
};

async function enviarFormulario() {
  if (enviando.value) return;
  atualizarAssinatura();
  
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
  const respostasFormatadas = [];
  
  for (const categoria in categorias.value) {
    for (const pergunta of categorias.value[categoria]) {
      const v = pergunta.variavel;
      respostasFormatadas.push({
        id_pergunta: pergunta.id,
        resposta: respostas.value[v], 
        foto: fotosNaoConformes.value[v] || null,
        observacao: observacoesNaoConformes.value[v] || null 
      });
    }
  }
  
  const idSetorFinal = Number(setorSelecionado.value) || usuarioObj.id_setor_fk;

  const payload = {
    id_modelo: idModelo.value || Number(modelo),
    id_setor: idSetorFinal,
    id_celula: Number(celulaSelecionada.value) || usuarioObj.id_celula_fk,
    assinatura: assinatura.value,
    respostas: respostasFormatadas,
    inicio_checklist: inicioChecklistTimestamp.value
  };
  
  try {
    const res = await api.post('/checklists/salvar', payload);
    alert('Checklist enviado com sucesso!');
    
    await persistenciaRascunho.clear();
    localStorage.removeItem('celula_auditada_atual');
    
    const idRota = res.data.id_formulario || res.data.id_relatorio;
    router.push(`/relatorio/${idRota}`); 
  } catch (err) {
    console.error('Erro ao enviar:', err);
    alert('Erro ao salvar o checklist no servidor.');
    enviando.value = false;
  }
}
</script>

<style scoped>
/* ==========================================
   LAYOUT E TIPOGRAFIA
   ========================================== */
.page-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  background-color: var(--bg-body);
}
.progresso { display: grid; gap: .5rem; margin-bottom: 1rem; }
.progresso progress { width: 100%; }

.header-n { margin-bottom: 2rem; border-bottom: 2px solid var(--border-color); padding-bottom: 1rem; }
.header-titles h1 { font-size: 1.8rem; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px; }
.header-titles p { color: var(--text-secondary); margin: 5px 0 0 0; font-size: 1.1rem; }

/* ==========================================
   ACORDEÃO (SESSÕES)
   ========================================== */
.sessaoOpcao {
  background-color: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 12px);
  margin-bottom: 1.5rem;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.3s ease;
}

.sessaoOpcao[open] { box-shadow: var(--shadow-md); }

.cabecalhoSessao {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  cursor: pointer;
  background-color: #ffffff;
  list-style: none; /* Remove seta padrão */
}
.cabecalhoSessao::-webkit-details-marker { display: none; }

/* 📌 NOVO: Estilos para o Wrapper do Título e Ícone CTQ */
.titulo-categoria-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icone-ctq-categoria {
  width: 30px;
  height: auto;
  object-fit: contain;
}

.cabecalhoSessao h2 { margin: 0; font-size: 1.2rem; color: var(--text-primary); font-weight: 700; }

.icone-acordeao { font-size: 1.5rem; color: var(--text-secondary); transition: transform 0.3s; }
.sessaoOpcao[open] .icone-acordeao { transform: rotate(45deg); }

/* Cores de Status para Sessões */
.sessaoOpcao.conforme { border-left: 6px solid var(--success); }
.sessaoOpcao.conforme .cabecalhoSessao { background-color: #f0fdf4; }

.sessaoOpcao.nao-conforme { border-left: 6px solid var(--danger); }
.sessaoOpcao.nao-conforme .cabecalhoSessao { background-color: #fef2f2; }

/* Destaque adicional se a categoria for CTQ */
.sessaoOpcao:has(.icone-ctq-categoria) { border-width: 2px; }

.conteudoSessao {
  padding: 0 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

/* ==========================================
   PERGUNTAS E RADIOS (FACILIDADE DE USO)
   ========================================== */
.grupoPergunta {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border-color);
}
.grupoPergunta:last-child { border-bottom: none; }

.textoPergunta {
  display: block;
  margin-bottom: 1.2rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.grupoOpcao {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

/* Estilo do Radio Button para facilitar toque */
.radio-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--text-primary);
  padding: 8px 0;
}

.radio-label input[type="radio"] {
  width: 24px;  /* Maior para tablet */
  height: 24px;
  accent-color: var(--primary);
  cursor: pointer;
}

/* ==========================================
   FOTO E OBSERVAÇÃO
   ========================================== */
.captura-foto-container {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
}

.btn-foto {
  background: white;
  border: 2px solid var(--border-color);
  padding: 0.8rem 1.2rem;
  border-radius: 6px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1rem;
}
.input-foto { display: none; }
.foto-erro { color: var(--danger); margin: .5rem 0 0; font-size: .9rem; }

.foto-preview img {
  max-width: 100%;
  max-height: 250px;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 2px solid white;
  box-shadow: var(--shadow-sm);
}

.foto-status-ok { color: var(--success); font-weight: 700; font-size: 0.9rem; }
.foto-status-pendente { color: var(--text-secondary); font-size: 0.9rem; font-style: italic; }
.foto-status-pendente.obrigatorio { color: var(--danger); font-weight: 700; font-style: normal; }

.observacao-container { margin-top: 1.5rem; }
.label-observacao { display: block; margin-bottom: 0.5rem; font-weight: 700; color: var(--text-primary); }
.obrigatorio { color: var(--danger); margin-left: 4px; }

.input-base {
  width: 100%;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
}

.textarea-obs { background-color: white; resize: vertical; min-height: 100px; }

/* ==========================================
   ASSINATURA
   ========================================== */
.card-assinatura {
  margin-top: 2rem;
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.section-title { margin: 0 0 1.5rem 0; font-size: 1.3rem; display: flex; align-items: center; gap: 10px; }

.signature-wrapper {
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.btn-limpar {
  background: #f1f5f9;
  border: 1px solid var(--border-color);
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

/* ==========================================
   AÇÕES FINAIS
   ========================================== */
.form-actions-main { margin-top: 3rem; text-align: center; }

.btn-enviar {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 1.2rem 3rem;
  font-size: 1.2rem;
  font-weight: 800;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all 0.3s;
  width: 100%;
  max-width: 400px;
}

.btn-enviar:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-lg); opacity: 0.9; }
.btn-enviar:disabled { background-color: #cbd5e1; cursor: not-allowed; }

/* ==========================================
   MOBILE/TABLET ADAPTATIONS
   ========================================== */
@media (min-width: 768px) {
  .pergunta-e-opcoes-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }
  .textoPergunta { margin-bottom: 0; flex: 1; }
  .grupoOpcao { flex-shrink: 0; }
}

@media (max-width: 767px) {
  .page-container { padding: 1rem; }
  .header-titles h1 { font-size: 1.4rem; }
  .header-titles p { font-size: 1rem; }
  .cabecalhoSessao, .conteudoSessao { padding-left: 1rem; padding-right: 1rem; }
  .cabecalhoSessao h2 { font-size: 1.05rem; }
  .captura-foto-container, .card-assinatura { padding: 1rem; }
  .grupoOpcao { gap: 1rem; }
  .radio-label { width: 100%; min-height: 44px; border-bottom: 1px solid #f1f5f9; }
  .btn-foto, .btn-limpar { min-height: 44px; }
  .btn-enviar { max-width: none; min-height: 52px; padding: 1rem; }
}
</style>
