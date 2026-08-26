<template>
  <div class="page-container">
    <PageHeader
      title="Checklist de Auditoria"
      :subtitle="'Modelo: ' + (nomeModelo || 'Carregando...')"
      icon="mdi mdi-clipboard-check-outline"
    />

    <form @submit.prevent="enviarFormulario" class="form-checklist">
      <div class="card progresso">
        <div class="progresso-info">
          <strong>{{ progresso.respondidas }} de {{ progresso.total }} itens respondidos</strong>
          <span class="progresso-percent">{{ Math.round((progresso.respondidas / (progresso.total || 1)) * 100) }}%</span>
        </div>
        <progress :value="progresso.respondidas" :max="progresso.total || 1"></progress>
        <span v-if="progresso.pendentes.length" class="progresso-pendentes">
          <i class="mdi mdi-alert-circle-outline"></i> Pendentes: {{ progresso.pendentes.join(', ') }}
        </span>
      </div>

      <details v-for="(perguntas, categoria) in categorias" :key="categoria" class="sessaoOpcao"
        :class="getCategoryStatusClass(categoria)" open>
        <summary class="cabecalhoSessao">
          <div class="titulo-categoria-wrapper">
            <h2>{{ categoria }}</h2>
            <img v-if="perguntas[0]?.ctq" src="../assets/ctq.png" alt="Processo Crítico" class="icone-ctq-categoria" />
          </div>
          <div class="categoria-header-right">
            <span class="icone-acordeao"><i class="mdi mdi-plus"></i></span>
          </div>
        </summary>
        
        <div class="conteudoSessao">
          <div v-for="pergunta in perguntas" :key="pergunta.variavel" class="grupoPergunta">
            <div class="pergunta-e-opcoes-wrapper">
              <label class="textoPergunta">{{ pergunta.texto }}</label>
              
              <div class="touch-option-group" role="radiogroup" :aria-label="pergunta.texto">
                <button
                  type="button"
                  class="touch-option-btn btn-conforme"
                  :class="{ active: respostas[pergunta.variavel] === 'Conforme' }"
                  @click="respostas[pergunta.variavel] = 'Conforme'"
                >
                  <i class="mdi mdi-check-circle"></i>
                  <span>Conforme</span>
                </button>

                <button
                  type="button"
                  class="touch-option-btn btn-nao-conforme"
                  :class="{ active: respostas[pergunta.variavel] === 'Não Conforme' }"
                  @click="respostas[pergunta.variavel] = 'Não Conforme'"
                >
                  <i class="mdi mdi-close-circle"></i>
                  <span>Não Conforme</span>
                </button>

                <button
                  type="button"
                  class="touch-option-btn btn-na"
                  :class="{ active: respostas[pergunta.variavel] === 'N/A' }"
                  @click="respostas[pergunta.variavel] = 'N/A'"
                >
                  <i class="mdi mdi-minus-circle"></i>
                  <span>N/A</span>
                </button>
              </div>
            </div>

            <div v-if="respostas[pergunta.variavel] === 'Não Conforme'" class="captura-foto-container">
              <div class="foto-actions">
                <button type="button" class="btn-foto" @click="solicitarFoto(pergunta.variavel)">
                  <i class="mdi mdi-camera"></i> Tirar / Anexar Foto
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
          <SignaturePad ref="signatureRef" width="100%" height="220px"
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
import PageHeader from '../components/PageHeader.vue';
import { obterPerfilLocal } from '../services/session';
import { createDraftPersistence } from '../services/draftPersistence';
import { toast } from '../services/feedback';

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
        toast.warning(`Por favor, responda a pergunta: "${p.texto}"`);
        return;
      }
    }
  }
  
  if (!assinatura.value) {
    toast.warning('A assinatura do auditor é obrigatória no rodapé.');
    return;
  }
  
  for (const varName in respostas.value) {
    if (respostas.value[varName] === 'Não Conforme') {
      if (requirePhotoOnNonConforme.value && !fotosNaoConformes.value[varName]) {
        toast.warning('Foto de evidência obrigatória para itens Não Conformes.');
        return;
      }
      if (requireObservacaoOnNonConforme.value && !observacoesNaoConformes.value[varName]?.trim()) {
        toast.warning('Observação obrigatória para itens Não Conformes.');
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
    toast.success('Checklist finalizado e enviado com sucesso!');
    
    await persistenciaRascunho.clear();
    localStorage.removeItem('celula_auditada_atual');
    
    const idRota = res.data.id_formulario || res.data.id_relatorio;
    router.push(`/relatorio/${idRota}`); 
  } catch (err) {
    console.error('Erro ao enviar:', err);
    toast.error(err.response?.data?.mensagem || 'Erro ao salvar o checklist no servidor.');
    enviando.value = false;
  }
}
</script>

<style scoped>
/* ==========================================
   LAYOUT E TIPOGRAFIA
   ========================================== */
.page-container {
  max-width: 1050px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.progresso {
  background: #ffffff;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.progresso-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  color: var(--text-primary, #0f172a);
}

.progresso-percent {
  font-weight: 800;
  color: var(--primary, #2563eb);
}

.progresso progress {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
}

.progresso progress::-webkit-progress-bar {
  background-color: #e2e8f0;
  border-radius: 999px;
}

.progresso progress::-webkit-progress-value {
  background-color: var(--primary, #2563eb);
  border-radius: 999px;
}

.progresso-pendentes {
  font-size: 0.85rem;
  color: #d97706;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ==========================================
   ACORDEÃO (SESSÕES)
   ========================================== */
.sessaoOpcao {
  background-color: #ffffff;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  margin-bottom: 1.25rem;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.sessaoOpcao[open] {
  box-shadow: var(--shadow-md);
}

.cabecalhoSessao {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.15rem 1.5rem;
  cursor: pointer;
  background-color: #ffffff;
  list-style: none;
  user-select: none;
}

.cabecalhoSessao::-webkit-details-marker { display: none; }

.titulo-categoria-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icone-ctq-categoria {
  width: 28px;
  height: auto;
  object-fit: contain;
}

.cabecalhoSessao h2 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--text-primary, #0f172a);
  font-weight: 700;
}

.categoria-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icone-acordeao {
  font-size: 1.4rem;
  color: var(--text-secondary, #64748b);
  transition: transform 0.25s;
  display: flex;
  align-items: center;
}

.sessaoOpcao[open] .icone-acordeao {
  transform: rotate(45deg);
}

/* Cores de Status para Sessões */
.sessaoOpcao.conforme {
  border-left: 6px solid var(--success, #10b981);
}
.sessaoOpcao.conforme .cabecalhoSessao {
  background-color: #f0fdf4;
}

.sessaoOpcao.nao-conforme {
  border-left: 6px solid var(--danger, #ef4444);
}
.sessaoOpcao.nao-conforme .cabecalhoSessao {
  background-color: #fef2f2;
}

.conteudoSessao {
  padding: 0 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

/* ==========================================
   PERGUNTAS E BOTÕES TOUCH AMIGÁVEIS
   ========================================== */
.grupoPergunta {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.grupoPergunta:last-child {
  border-bottom: none;
}

.pergunta-e-opcoes-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.textoPergunta {
  display: block;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  line-height: 1.45;
}

.touch-option-group {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.touch-option-btn {
  flex: 1;
  min-width: 120px;
  min-height: 48px;
  padding: 0.65rem 1rem;
  border-radius: var(--radius-md, 10px);
  border: 2px solid var(--border-color, #e2e8f0);
  background: #ffffff;
  color: var(--text-secondary, #64748b);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  transition: all 0.15s ease;
  user-select: none;
  box-sizing: border-box;
}

.touch-option-btn i {
  font-size: 1.2rem;
}

.touch-option-btn:active {
  transform: scale(0.97);
}

/* CONFORME (VERDE) */
.touch-option-btn.btn-conforme:hover {
  border-color: #86efac;
  background: #f0fdf4;
  color: #16a34a;
}
.touch-option-btn.btn-conforme.active {
  background: #f0fdf4;
  border-color: #10b981;
  color: #15803d;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
}

/* NÃO CONFORME (VERMELHO) */
.touch-option-btn.btn-nao-conforme:hover {
  border-color: #fca5a5;
  background: #fef2f2;
  color: #dc2626;
}
.touch-option-btn.btn-nao-conforme.active {
  background: #fef2f2;
  border-color: #ef4444;
  color: #b91c1c;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2);
}

/* N/A (NEUTRO) */
.touch-option-btn.btn-na:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: var(--text-primary);
}
.touch-option-btn.btn-na.active {
  background: #f1f5f9;
  border-color: #64748b;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(100, 116, 139, 0.15);
}

/* ==========================================
   FOTO E OBSERVAÇÃO
   ========================================== */
.captura-foto-container {
  margin-top: 1.25rem;
  padding: 1.25rem;
  background-color: #f8fafc;
  border-radius: var(--radius-md, 10px);
  border: 1.5px dashed #cbd5e1;
}

.btn-foto {
  background: #ffffff;
  border: 1.5px solid var(--border-color, #cbd5e1);
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.75rem;
  min-height: 44px;
  transition: all 0.2s;
}

.btn-foto:hover {
  border-color: var(--primary, #2563eb);
  color: var(--primary, #2563eb);
}

.input-foto { display: none; }
.foto-erro { color: var(--danger, #ef4444); margin: 0.5rem 0 0; font-size: 0.88rem; }

.foto-preview img {
  max-width: 100%;
  max-height: 240px;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 2px solid white;
  box-shadow: var(--shadow-sm);
}

.foto-status-ok { color: var(--success, #10b981); font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 4px; }
.foto-status-pendente { color: var(--text-secondary, #64748b); font-size: 0.88rem; font-style: italic; }
.foto-status-pendente.obrigatorio { color: var(--danger, #ef4444); font-weight: 700; font-style: normal; }

.observacao-container { margin-top: 1.25rem; }
.label-observacao { display: block; margin-bottom: 0.4rem; font-weight: 700; color: var(--text-primary, #0f172a); font-size: 0.95rem; }
.obrigatorio { color: var(--danger, #ef4444); margin-left: 4px; }

.input-base {
  width: 100%;
  padding: 0.85rem;
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  box-sizing: border-box;
}

.textarea-obs { background-color: #ffffff; resize: vertical; min-height: 90px; }

/* ==========================================
   ASSINATURA
   ========================================== */
.card-assinatura {
  margin-top: 1.75rem;
  background: #ffffff;
  padding: 1.5rem;
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: var(--shadow-sm);
}

.section-title {
  margin: 0 0 1.25rem 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary, #0f172a);
}

.signature-wrapper {
  border: 2px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.signature-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-limpar {
  background: #f1f5f9;
  border: 1px solid var(--border-color, #cbd5e1);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-limpar:hover {
  background: #e2e8f0;
  color: var(--text-primary, #0f172a);
}

/* ==========================================
   AÇÕES FINAIS
   ========================================== */
.form-actions-main {
  margin-top: 2.5rem;
  text-align: center;
}

.btn-enviar {
  background-color: var(--primary, #2563eb);
  color: white;
  border: none;
  padding: 1.1rem 2.5rem;
  font-size: 1.15rem;
  font-weight: 800;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all 0.25s;
  width: 100%;
  max-width: 420px;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-enviar:hover:not(:disabled) {
  background-color: var(--primary-hover, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-enviar:disabled {
  background-color: #cbd5e1;
  cursor: not-allowed;
}

/* TABLET LANDSCAPE (≥ 768px) */
@media (min-width: 768px) {
  .pergunta-e-opcoes-wrapper {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
  }
  .textoPergunta {
    flex: 1;
  }
  .touch-option-group {
    flex-shrink: 0;
    flex-wrap: nowrap;
  }
}

/* TABLET PORTRAIT / MOBILE (< 768px) */
@media (max-width: 767px) {
  .page-container { padding: 1rem 0.5rem; }
  .cabecalhoSessao, .conteudoSessao { padding-left: 1rem; padding-right: 1rem; }
  .cabecalhoSessao h2 { font-size: 1.05rem; }
  .captura-foto-container, .card-assinatura { padding: 1rem; }
  .touch-option-group { width: 100%; }
  .touch-option-btn { flex: 1; min-width: auto; }
  .btn-enviar { max-width: none; }
}
</style>
