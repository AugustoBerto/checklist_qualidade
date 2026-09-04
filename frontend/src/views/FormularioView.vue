<template>
  <div class="page-container">
    <PageHeader
      title="Checklist de Auditoria"
      :subtitle="'Modelo: ' + (nomeModelo || 'Carregando...')"
      icon="mdi mdi-clipboard-check-outline"
    />

    <FeedbackState
      v-if="estadoCarregamento === 'loading'"
      type="loading"
      message="Carregando perguntas do checklist..."
    />
    <FeedbackState
      v-else-if="estadoCarregamento === 'error'"
      type="error"
      title="Não foi possível carregar o checklist"
      :message="erroCarregamento"
      :show-retry="true"
      @retry="carregarPerguntas"
    />

    <form v-else @submit.prevent="enviarFormulario" class="form-checklist">
      <div class="card progresso">
        <div class="progresso-info">
          <strong>{{ progresso.respondidas }} de {{ progresso.total }} itens respondidos</strong>
          <span class="progresso-percent">{{ Math.round((progresso.respondidas / (progresso.total || 1)) * 100) }}%</span>
        </div>
        <progress :value="progresso.respondidas" :max="progresso.total || 1"></progress>
        <span v-if="tentouFinalizar && progresso.pendentes.length" class="progresso-pendentes" role="alert">
          <i class="mdi mdi-alert-circle-outline"></i> Pendentes: {{ progresso.pendentes.join(', ') }}
        </span>
      </div>

      <div v-if="Object.keys(categorias).length > 1" class="formulario-toolbar-categorias">
        <span class="toolbar-contador">
          <i class="mdi mdi-format-list-checks"></i>
          <strong>{{ Object.keys(categorias).length }}</strong> categorias no checklist
        </span>
        <div class="toolbar-acoes-lote">
          <button type="button" class="btn-toolbar-lote" @click="alternarTodasCategorias(true)">
            <i class="mdi mdi-unfold-more-horizontal"></i> Expandir Todas
          </button>
          <button type="button" class="btn-toolbar-lote" @click="alternarTodasCategorias(false)">
            <i class="mdi mdi-unfold-less-horizontal"></i> Recolher Todas
          </button>
        </div>
      </div>

      <details
        v-for="(perguntas, categoria) in categorias"
        :key="categoria"
        class="sessaoOpcao"
        :class="getCategoryStatusClass(categoria)"
        :open="categoriasAbertas[categoria] !== false"
        @toggle="onToggleCategoria(categoria, $event)"
      >
        <summary class="cabecalhoSessao">
          <div class="titulo-categoria-wrapper">
            <h2>{{ categoria }}</h2>
            <span v-if="perguntas[0]?.ctq" class="badge-ctq-pill" title="Processo Crítico para a Qualidade (CTQ)">
              <i class="mdi mdi-alert-decagram"></i>
              <span>CRÍTICO (CTQ)</span>
            </span>
          </div>
          <div class="categoria-header-right">
            <span
              class="badge-categoria-progresso"
              :class="{ 'completo': estatisticasCategorias[categoria]?.completo }"
              :title="`${estatisticasCategorias[categoria]?.respondidas || 0} de ${estatisticasCategorias[categoria]?.total || 0} perguntas respondidas`"
            >
              {{ estatisticasCategorias[categoria]?.respondidas || 0 }}/{{ estatisticasCategorias[categoria]?.total || 0 }}
            </span>
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
                  {{ requirePhotoOnNonConforme ? '⚠️ Foto obrigatória' : '📷 Foto opcional (anexar se necessário)' }}
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

          <div v-if="categoriaTemNaoConformidade(categoria)" class="card-assinatura-categoria">
            <div class="assinatura-cat-header">
              <h4 class="assinatura-cat-title">
                <i class="mdi mdi-draw-pen"></i>
                Assinatura do Responsável da Categoria: <strong>{{ categoria }}</strong>
              </h4>
              <span class="badge-nc-obrigatoria">
                <i class="mdi mdi-alert-circle-outline"></i> Obrigatória por Não Conformidade
              </span>
            </div>
            <p class="assinatura-cat-dica">
              Esta categoria possui apontamentos não conformes. Colete a assinatura do responsável da área.
            </p>
            <div class="signature-wrapper">
              <SignaturePad
                :ref="(element) => registrarRefAssinaturaCategoria(categoria, element)"
                width="100%"
                height="180px"
                :options="{ penColor: 'black', backgroundColor: '#f8fafc' }"
                @endStroke="() => atualizarAssinaturaCategoria(categoria)"
              />
            </div>
            <div class="signature-actions">
              <button type="button" class="btn-limpar" @click="limparAssinaturaCategoria(categoria)">
                <i class="mdi mdi-eraser"></i> Limpar Assinatura ({{ categoria }})
              </button>
            </div>
          </div>
        </div>
      </details>

      <div class="card card-assinatura">
        <h3 class="section-title"><i class="mdi mdi-pen"></i> Assinatura Geral do Auditor</h3>
        <div class="signature-wrapper">
          <SignaturePad ref="signatureRef" width="100%" height="220px"
            :options="{ penColor: 'black', backgroundColor: '#f8fafc' }" @endStroke="atualizarAssinatura" />
        </div>
        <div class="signature-actions">
          <button @click="clear" type="button" class="btn-limpar">
            <i class="mdi mdi-eraser"></i> Limpar Assinatura Geral
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
import FeedbackState from '../components/FeedbackState.vue';
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
const versaoModelo = ref(null);
const estadoCarregamento = ref('loading');
const erroCarregamento = ref('');
const assinatura = ref(null);
const signatureRef = ref(null);
const enviando = ref(false); 
const tentouFinalizar = ref(false);
const inicioChecklistTimestamp = ref(null);
const fotosNaoConformes = ref({}); 
const errosFotos = ref({});
const observacoesNaoConformes = ref({}); 
const requirePhotoOnNonConforme = ref(false); 
const requireObservacaoOnNonConforme = ref(true); 
const assinaturasCategorias = ref({});
const refsAssinaturasCategorias = new Map();

const registrarRefAssinaturaCategoria = (nomeCategoria, element) => {
  if (element) {
    refsAssinaturasCategorias.set(nomeCategoria, element);
  } else {
    refsAssinaturasCategorias.delete(nomeCategoria);
  }
};

const categoriaTemNaoConformidade = (nomeCategoria) => {
  const perguntasDaCategoria = categorias.value[nomeCategoria] || [];
  return perguntasDaCategoria.some(p => respostas.value[p.variavel] === 'Não Conforme');
};

const categoriasNaoConformes = computed(() => {
  const lista = [];
  for (const nomeCat of Object.keys(categorias.value)) {
    if (categoriaTemNaoConformidade(nomeCat)) {
      lista.push(nomeCat);
    }
  }
  return lista;
});

const atualizarAssinaturaCategoria = (nomeCategoria) => {
  const pad = refsAssinaturasCategorias.get(nomeCategoria);
  if (pad && typeof pad.save === 'function') {
    if (typeof pad.isEmpty === 'function' && pad.isEmpty()) {
      delete assinaturasCategorias.value[nomeCategoria];
      return;
    }
    const data = pad.save();
    if (data) {
      assinaturasCategorias.value[nomeCategoria] = data;
    }
  }
};

const limparAssinaturaCategoria = (nomeCategoria) => {
  const pad = refsAssinaturasCategorias.get(nomeCategoria);
  if (pad && typeof pad.clear === 'function') {
    pad.clear();
  }
  delete assinaturasCategorias.value[nomeCategoria];
};

const rascunhoKey = `checklist_rascunho_${usuarioObj.id || 'desconhecido'}_${modelo}_${setorSelecionado.value || usuarioObj.id_setor_fk || 'sem-setor'}_${celulaSelecionada.value || usuarioObj.id_celula_fk || 'sem-celula'}`;
const inputsFoto = new Map();
const MAX_FOTO_BYTES = 2 * 1024 * 1024;
const persistenciaRascunho = createDraftPersistence(localforage, rascunhoKey);
let rascunhoCarregado = false;
let componenteDesmontado = false;
let carregamentoController = null;
const enviadoComSucesso = ref(false);

const obterMetadataRascunho = () => ({
  modeloId: idModelo.value,
  modeloVersao: versaoModelo.value,
  respostas: respostas.value,
  observacoesNaoConformes: observacoesNaoConformes.value,
  inicioChecklistTimestamp: inicioChecklistTimestamp.value
});

watch([respostas, observacoesNaoConformes, inicioChecklistTimestamp], () => {
  if (rascunhoCarregado && !enviadoComSucesso.value) persistenciaRascunho.schedule(obterMetadataRascunho());
}, { deep: true });

watch(respostas, () => {
  if (!rascunhoCarregado || enviadoComSucesso.value) return;
  for (const variavel of Object.keys(fotosNaoConformes.value)) {
    if (respostas.value[variavel] !== 'Não Conforme') {
      const { [variavel]: _, ...fotosRestantes } = fotosNaoConformes.value;
      fotosNaoConformes.value = fotosRestantes;
      void persistenciaRascunho.removePhoto(variavel, obterMetadataRascunho());
    }
  }
  for (const variavel of Object.keys(observacoesNaoConformes.value)) {
    if (respostas.value[variavel] !== 'Não Conforme') {
      const { [variavel]: _, ...obsRestantes } = observacoesNaoConformes.value;
      observacoesNaoConformes.value = obsRestantes;
    }
  }
  for (const cat of Object.keys(assinaturasCategorias.value)) {
    if (!categoriaTemNaoConformidade(cat)) {
      limparAssinaturaCategoria(cat);
    }
  }
}, { deep: true });

const metadataModeloCompativel = (metadata) => {
  if (metadata?.modeloId == null || metadata?.modeloVersao == null
    || idModelo.value == null || versaoModelo.value == null) return false;
  return String(metadata.modeloId) === String(idModelo.value)
    && String(metadata.modeloVersao) === String(versaoModelo.value);
};

const carregarRascunho = async () => {
  try {
    const rascunho = await persistenciaRascunho.load();
    if (!rascunho) {
      inicioChecklistTimestamp.value = new Date().toISOString();
      return;
    }

    if (!metadataModeloCompativel(rascunho.metadata)) {
      await persistenciaRascunho.discard();
      inicioChecklistTimestamp.value = new Date().toISOString();
      toast.warning('O rascunho anterior foi descartado porque pertence a outro modelo ou versão.');
      return;
    }

    respostas.value = rascunho.metadata.respostas || {};
    fotosNaoConformes.value = rascunho.fotos;
    observacoesNaoConformes.value = rascunho.metadata.observacoesNaoConformes || {};
    inicioChecklistTimestamp.value = rascunho.metadata.inicioChecklistTimestamp || new Date().toISOString();
  } catch (error) {
    console.error('Erro ao carregar rascunho:', error);
    inicioChecklistTimestamp.value = new Date().toISOString();
  }
};

const carregarPerguntas = async () => {
  carregamentoController?.abort();
  const controller = new AbortController();
  carregamentoController = controller;
  estadoCarregamento.value = 'loading';
  erroCarregamento.value = '';
  rascunhoCarregado = false;
  categorias.value = {};

  try {
    const res = await api.get(`/checklists/perguntas/${modelo}`, { signal: controller.signal });
    if (componenteDesmontado || controller.signal.aborted) return;
    const agrupadas = res.data?.respostasAgrupadas;
    if (!agrupadas || typeof agrupadas !== 'object' || Object.keys(agrupadas).length === 0) {
      throw new Error('O modelo não possui perguntas disponíveis.');
    }

    const primeiraCategoria = Object.values(agrupadas)[0];
    const modeloResposta = res.data?.modelo || {};
    const primeiraPergunta = primeiraCategoria?.[0] || {};
    idModelo.value = modeloResposta.id ?? primeiraPergunta.id_modelo ?? primeiraPergunta.id_modelo_fk ?? Number(modelo);
    nomeModelo.value = modeloResposta.nome || primeiraPergunta.modelo || primeiraPergunta.nome_modelo || '';
    versaoModelo.value = modeloResposta.versao ?? primeiraPergunta.modelo_versao ?? primeiraPergunta.versao ?? null;
    categorias.value = agrupadas;
    tentouFinalizar.value = false;

    await carregarRascunho();
    if (componenteDesmontado || controller.signal.aborted) return;
    rascunhoCarregado = true;
    estadoCarregamento.value = 'ready';
  } catch (err) {
    if (componenteDesmontado || controller.signal.aborted || err?.code === 'ERR_CANCELED') return;
    console.error('Erro ao carregar perguntas:', err);
    estadoCarregamento.value = 'error';
    erroCarregamento.value = err.response?.data?.mensagem || err.message || 'Não foi possível carregar as perguntas do checklist.';
  } finally {
    if (carregamentoController === controller) carregamentoController = null;
  }
};

onMounted(() => {
  window.onFotoCapturada = onFotoCapturada;
  document.addEventListener('visibilitychange', salvarRascunhoAoOcultar);
  window.addEventListener('pagehide', salvarRascunhoAoOcultar);
  void carregarPerguntas();
});

onUnmounted(() => {
  componenteDesmontado = true;
  carregamentoController?.abort();
  delete window.onFotoCapturada;
  document.removeEventListener('visibilitychange', salvarRascunhoAoOcultar);
  window.removeEventListener('pagehide', salvarRascunhoAoOcultar);
  if (rascunhoCarregado && !enviadoComSucesso.value) void persistenciaRascunho.flush(obterMetadataRascunho());
});

const salvarRascunhoAoOcultar = (event) => {
  if ((event?.type === 'pagehide' || document.visibilityState === 'hidden') && rascunhoCarregado && !enviadoComSucesso.value) {
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

const estatisticasCategorias = computed(() => {
  const map = {};
  for (const categoria in categorias.value) {
    const perguntas = categorias.value[categoria];
    const respondidas = perguntas.filter(p => respostas.value[p.variavel]).length;
    map[categoria] = {
      total: perguntas.length,
      respondidas,
      completo: perguntas.length > 0 && respondidas === perguntas.length,
    };
  }
  return map;
});

const categoriasAbertas = ref({});

const alternarTodasCategorias = (abrir) => {
  for (const cat in categorias.value) {
    categoriasAbertas.value[cat] = abrir;
  }
};

const onToggleCategoria = (categoria, event) => {
  categoriasAbertas.value[categoria] = event?.target?.open ?? true;
};

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
  if (signatureRef.value && typeof signatureRef.value.clear === 'function') {
    signatureRef.value.clear();
  }
  assinatura.value = null;
};

const atualizarAssinatura = () => {
  if (signatureRef.value) {
    if (typeof signatureRef.value.isEmpty === 'function' && signatureRef.value.isEmpty()) {
      return;
    }
    if (typeof signatureRef.value.save === 'function') {
      assinatura.value = signatureRef.value.save();
    }
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
  tentouFinalizar.value = true;
  atualizarAssinatura();
  for (const cat of categoriasNaoConformes.value) {
    atualizarAssinaturaCategoria(cat);
  }
  
  for (const cat in categorias.value) {
    for (const p of categorias.value[cat]) {
      if (!respostas.value[p.variavel]) {
        categoriasAbertas.value[cat] = true;
        toast.warning(`Por favor, responda a pergunta: "${p.texto}"`);
        return;
      }
    }
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

  for (const cat of categoriasNaoConformes.value) {
    if (!assinaturasCategorias.value[cat]) {
      toast.warning(`A assinatura para a categoria "${cat}" é obrigatória devido às não conformidades.`);
      return;
    }
  }
  
  if (!assinatura.value) {
    toast.warning('A assinatura geral do auditor é obrigatória no rodapé.');
    return;
  }
  
  enviando.value = true;
  const respostasFormatadas = [];
  
  for (const categoria in categorias.value) {
    for (const pergunta of categorias.value[categoria]) {
      const v = pergunta.variavel;
      const statusResposta = respostas.value[v];
      const ehNaoConforme = statusResposta === 'Não Conforme';
      respostasFormatadas.push({
        id_pergunta: pergunta.id,
        resposta: statusResposta, 
        foto: ehNaoConforme ? (fotosNaoConformes.value[v] || null) : null,
        observacao: ehNaoConforme ? (observacoesNaoConformes.value[v] || null) : null 
      });
    }
  }
  
  const idSetorFinal = Number(setorSelecionado.value) || usuarioObj.id_setor_fk;

  const payload = {
    id_modelo: idModelo.value || Number(modelo),
    id_setor: idSetorFinal,
    id_celula: Number(celulaSelecionada.value) || usuarioObj.id_celula_fk,
    assinatura: assinatura.value,
    assinaturas_categorias: assinaturasCategorias.value,
    respostas: respostasFormatadas,
    inicio_checklist: inicioChecklistTimestamp.value
  };
  
  try {
    const res = await api.post('/checklists/salvar', payload);
    toast.success('Checklist finalizado e enviado com sucesso!');
    
    enviadoComSucesso.value = true;
    rascunhoCarregado = false;
    await persistenciaRascunho.clear();
    localStorage.removeItem('celula_auditada_atual');

    respostas.value = {};
    fotosNaoConformes.value = {};
    observacoesNaoConformes.value = {};
    assinaturasCategorias.value = {};
    tentouFinalizar.value = false;
    
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
  color: var(--primary, #b1072c);
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
  background-color: var(--primary, #b1072c);
  border-radius: 999px;
}

.progresso-pendentes {
  margin-top: 0.75rem;
  padding: 0.55rem 0.9rem;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #b45309;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: fadeInAlert 0.25s ease-in-out;
}

@keyframes fadeInAlert {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ==========================================
   TOOLBAR DE CATEGORIAS
   ========================================== */
.formulario-toolbar-categorias {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding: 0.75rem 1.15rem;
  background: #f8fafc;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.toolbar-contador {
  font-size: 0.88rem;
  color: var(--text-secondary, #64748b);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.toolbar-contador strong {
  color: var(--text-primary, #0f172a);
}

.toolbar-acoes-lote {
  display: flex;
  gap: 0.5rem;
}

.btn-toolbar-lote {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0.4rem 0.8rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary, #475569);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-toolbar-lote:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: var(--text-primary, #0f172a);
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
  flex-wrap: wrap;
}

.badge-ctq-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #fff1f2;
  color: var(--primary, #b1072c);
  border: 1px solid #fecdd3;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.badge-ctq-pill i {
  font-size: 0.95rem;
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

.badge-categoria-progresso {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.badge-categoria-progresso.completo {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
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
  border-color: var(--primary, #b1072c);
  color: var(--primary, #b1072c);
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

.card-assinatura-categoria {
  margin-top: 1.5rem;
  background: #fff8f8;
  padding: 1.25rem;
  border-radius: 12px;
  border: 1.5px dashed #fca5a5;
  box-shadow: 0 1px 3px rgba(220, 38, 38, 0.05);
}

.assinatura-cat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.assinatura-cat-title {
  margin: 0;
  font-size: 1.05rem;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-nc-obrigatoria {
  font-size: 0.78rem;
  font-weight: 700;
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.assinatura-cat-dica {
  font-size: 0.85rem;
  color: #7f1d1d;
  margin: 0 0 0.85rem 0;
}

/* ==========================================
   AÇÕES FINAIS
   ========================================== */
.form-actions-main {
  margin-top: 2.5rem;
  text-align: center;
}

.btn-enviar {
  background-color: var(--primary, #b1072c);
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
  background-color: var(--primary-hover, #8f0523);
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
  .captura-foto-container, .card-assinatura, .card-assinatura-categoria { padding: 1rem; }
  .touch-option-group { width: 100%; }
  .touch-option-btn { flex: 1; min-width: auto; }
  .btn-enviar { max-width: none; }
}
</style>
