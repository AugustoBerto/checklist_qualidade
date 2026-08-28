<template>
  <div class="report-detail-page">
    <div v-if="isLoading" class="report-state">
      <FeedbackState type="loading" message="Carregando documento da checklist..." />
    </div>

    <div v-else-if="error" class="report-state">
      <FeedbackState type="error" title="Não foi possível carregar o documento" :message="error" :show-retry="true" @retry="buscarDados" />
      <button type="button" class="back-button" @click="voltar"><i class="mdi mdi-arrow-left"></i> Voltar ao histórico</button>
    </div>

    <template v-else-if="documento">
      <section class="screen-panel" aria-label="Ações do documento">
        <div>
          <p class="screen-kicker">Consulta de checklist concluída</p>
          <h1>Documento da inspeção</h1>
          <p class="screen-subtitle">Registro permanente da execução nº {{ documento.id || route.params.id }}.</p>
        </div>
        <div class="screen-actions">
          <button type="button" class="action-primary" @click="imprimirPagina"><i class="mdi mdi-printer-outline"></i> Imprimir / PDF</button>
          <button type="button" class="action-secondary" @click="voltar"><i class="mdi mdi-arrow-left"></i> Voltar</button>
        </div>
      </section>

      <ChecklistDocument class="screen-document" :documento="documento" :evidencias="evidencias" :logo-src="logoSrc" />
      <EvidenceGallery class="screen-gallery" :evidencias="evidencias" />

      <!-- A árvore impressa não contém ações nem galeria. Ela fica separada da consulta para que o papel nunca seja um print da aplicação. -->
      <ChecklistDocument class="print-document" :documento="documento" :evidencias="evidencias" :logo-src="logoSrc" modo-impressao />
    </template>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import FeedbackState from '../components/FeedbackState.vue'
import ChecklistDocument from '../components/report/ChecklistDocument.vue'
import EvidenceGallery from '../components/report/EvidenceGallery.vue'

const route = useRoute()
const router = useRouter()
const logoSrc = new URL('../img/dass.png', import.meta.url).href
const isLoading = ref(true)
const error = ref('')
const documento = ref(null)
const evidencias = ref({ total: 0, disponiveis: 0, itens: [] })
let requisicao = null
let desmontado = false
let urlsEvidencias = []

function normalizarDocumento(resposta) {
  const dados = resposta?.dados || resposta?.documento || resposta || {}
  const contexto = dados.contexto || dados.identificacao || {}
  const categorias = dados.categorias || dados.respostasAgrupadas || {}
  const categoriasNormalizadas = Object.fromEntries(Object.entries(categorias).map(([categoria, itens]) => [
    categoria,
    (Array.isArray(itens) ? itens : []).map((item) => ({
      id: item.id ?? item.idPergunta ?? item.id_pergunta,
      pergunta: item.pergunta ?? item.texto ?? item.question,
      resposta: item.resposta ?? item.answer,
      observacao: item.observacao ?? item.observacaoNaoConforme ?? item.observation,
      evidencia: item.evidencia || null,
    })),
  ]))

  return {
    id: dados.id ?? route.params.id,
    nomeModelo: dados.nomeModelo ?? dados.nome_modelo ?? contexto.nomeModelo ?? contexto.modelo,
    marca: dados.marca ?? dados.nomeMarca ?? dados.nome_marca ?? contexto.marca,
    nomeSetor: dados.nomeSetor ?? dados.nome_setor ?? contexto.nomeSetor ?? contexto.setor,
    unidade: dados.unidade ?? dados.nomeUnidade ?? dados.nome_unidade ?? contexto.unidade,
    local: dados.local ?? contexto.local,
    nomeCelula: dados.nomeCelula ?? dados.nome_celula ?? contexto.nomeCelula ?? contexto.celula,
    nomeUsuario: dados.nomeUsuario ?? dados.nome_usuario ?? contexto.nomeUsuario ?? contexto.usuario,
    matricula: dados.matricula ?? dados.matriculaUsuario ?? contexto.matricula,
    funcaoUsuario: dados.funcaoUsuario ?? dados.funcao_usuario ?? contexto.funcaoUsuario ?? contexto.funcao,
    dataEnvio: dados.dataEnvio ?? dados.data_envio ?? contexto.dataEnvio,
    concluidoEm: dados.concluidoEm ?? dados.concluido_em,
    inicioChecklist: dados.inicioChecklist ?? dados.inicio_checklist ?? dados.dataInicio,
    status: dados.status,
    pontuacao: dados.pontuacao ?? dados.percentualConformidade ?? dados.percentual_conformidade,
    assinatura: dados.assinatura || null,
    categorias: categoriasNormalizadas,
  }
}

function normalizarEvidencias(resposta) {
  const dados = resposta?.dados || resposta?.documento || resposta || {}
  const origem = dados.evidencias || {}
  const itens = (Array.isArray(origem.itens) ? origem.itens : []).map((item) => ({
    id: item.id,
    idPergunta: item.idPergunta ?? item.id_pergunta,
    pergunta: item.pergunta ?? item.texto,
    mime: item.mime ?? item.tipo,
    nome: item.nome ?? item.nomeArquivo ?? item.nome_arquivo,
    disponivel: item.disponivel === true,
    conteudoUrl: item.conteudoUrl || item.url || '',
    url: item.url || item.conteudoUrl || '',
  }))
  const total = Math.max(Number(origem.total) || 0, itens.length)
  const disponiveis = Math.max(Number(origem.disponiveis) || 0, itens.filter((item) => item.disponivel || item.conteudoUrl).length)
  return { total, disponiveis: Math.min(disponiveis, total), itens }
}

function liberarUrlsEvidencias() {
  urlsEvidencias.forEach((url) => URL.revokeObjectURL(url))
  urlsEvidencias = []
}

async function carregarConteudoEvidencias(relatorioId, estado, signal) {
  const itens = await Promise.all(estado.itens.map(async (item) => {
    if (!item.disponivel || item.conteudoUrl) return item
    try {
      const resposta = await api.get(`/submissoes/${relatorioId}/evidencias/${item.id}`, {
        responseType: 'blob',
        signal,
      })
      if (signal.aborted) return item
      const url = URL.createObjectURL(resposta.data)
      urlsEvidencias.push(url)
      return { ...item, conteudoUrl: url, url }
    } catch (err) {
      if (signal.aborted || err?.code === 'ERR_CANCELED') return item
      return { ...item, disponivel: false }
    }
  }))
  return { ...estado, disponiveis: itens.filter((item) => item.conteudoUrl).length, itens }
}

const voltar = () => {
  if (window.history.length > 1) router.back()
  else router.push('/consultar')
}

const imprimirPagina = () => window.print()

const buscarDados = async () => {
  requisicao?.abort()
  const controller = new AbortController()
  requisicao = controller
  isLoading.value = true
  error.value = ''
  try {
    const res = await api.get(`/submissoes/${route.params.id}`, { signal: controller.signal })
    if (desmontado || controller.signal.aborted) return
    if (!res.data?.sucesso) throw new Error(res.data?.mensagem || 'Documento não encontrado.')
    documento.value = normalizarDocumento(res.data)
    liberarUrlsEvidencias()
    const evidenciasCarregadas = await carregarConteudoEvidencias(route.params.id, normalizarEvidencias(res.data), controller.signal)
    if (desmontado || controller.signal.aborted || requisicao !== controller) return
    evidencias.value = evidenciasCarregadas
  } catch (err) {
    if (desmontado || controller.signal.aborted || err?.code === 'ERR_CANCELED') return
    error.value = err.response?.data?.mensagem || err.message || 'Falha ao buscar o documento da checklist.'
  } finally {
    if (requisicao === controller) {
      requisicao = null
      if (!desmontado) isLoading.value = false
    }
  }
}

onMounted(buscarDados)
onUnmounted(() => {
  desmontado = true
  requisicao?.abort()
  liberarUrlsEvidencias()
})
</script>

<style scoped>
.report-detail-page { max-width: 1040px; margin: 0 auto; padding: .5rem 0 2.5rem; color: #172033; }
.report-state { min-height: 50vh; display: grid; place-items: center; }
.screen-panel { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem; padding: .75rem 0 1.25rem; }
.screen-kicker { margin: 0 0 .25rem; color: #64748b; font-size: .7rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.screen-panel h1 { margin: 0; font-size: 1.55rem; letter-spacing: -.02em; }
.screen-subtitle { margin: .35rem 0 0; color: #64748b; font-size: .85rem; }
.screen-actions { display: flex; gap: .6rem; flex-shrink: 0; }
.action-primary, .action-secondary, .back-button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 40px; padding: .55rem .85rem; border-radius: 5px; font-size: .82rem; font-weight: 750; cursor: pointer; }
.action-primary { border: 1px solid #b1072c; background: #b1072c; color: #fff; }
.action-primary:hover { background: #8f0523; }
.action-secondary, .back-button { border: 1px solid #c7ceda; background: #fff; color: #334155; }
.action-secondary:hover, .back-button:hover { border-color: #b1072c; color: #b1072c; }
.screen-document { padding: 2rem 2.25rem; border: 1px solid #d7dce5; border-radius: 8px; box-shadow: 0 7px 24px rgba(15, 23, 42, .06); }
.screen-gallery { margin-top: 1.25rem; }
.print-document { display: none; }

@page { size: A4; margin: 14mm 14mm 16mm; }
@media print {
  :global(html), :global(body), :global(#app) { min-width: 0 !important; background: #fff !important; }
  :global(.header), :global(.sidebar-backdrop), :global(.sidebar-drawer), :global(.toast-container), :global(.confirm-dialog) { display: none !important; }
  :global(.main-content) { width: auto !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; }
  .report-detail-page { max-width: none; margin: 0; padding: 0; }
  .screen-panel, .screen-document, .screen-gallery, .report-state { display: none !important; }
  .print-document { display: block !important; }
  .print-document :deep(.checklist-document) { width: 100%; }
  .print-document :deep(.document-header) { break-after: avoid; page-break-after: avoid; }
  .print-document :deep(.document-context), .print-document :deep(.document-result), .print-document :deep(.evidence-record) { break-inside: avoid; page-break-inside: avoid; }
}

@media (max-width: 720px) {
  .report-detail-page { padding: 0 0 .75rem; }
  .screen-panel { align-items: stretch; flex-direction: column; gap: 1rem; }
  .screen-actions { width: 100%; }
  .screen-actions button { flex: 1; }
  .screen-document { padding: 1.1rem; border-radius: 0; }
}
</style>
