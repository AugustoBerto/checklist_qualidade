<template>
  <article class="checklist-document" :class="{ 'is-print-layout': modoImpressao }" :aria-label="`Documento da checklist ${documento.id ? `#${documento.id}` : ''}`">
    <div class="document-cover">
      <header class="document-header">
      <div class="document-brand">
        <img v-if="logoSrc" :src="logoSrc" alt="DASS" class="document-logo">
        <div>
          <p class="document-kicker">Registro de inspeção</p>
          <h1>Checklist de Auditoria</h1>
          <p v-if="documento.id" class="document-number">Documento nº {{ documento.id }}</p>
        </div>
      </div>
      </header>

      <section class="document-context" aria-label="Identificação da inspeção">
        <h2 class="section-title">Identificação da inspeção</h2>
        <dl class="context-grid">
          <div v-for="campo in camposContexto" :key="campo.label" class="context-field">
            <dt>{{ campo.label }}</dt>
            <dd>{{ campo.valor || 'Não informado' }}</dd>
          </div>
        </dl>
      </section>

      <section class="document-result" aria-label="Resultado final">
        <div>
          <h2 class="section-title">Resultado final</h2>
          <p class="result-caption">Índice de conformidade da inspeção</p>
        </div>
        <strong class="result-score">{{ scoreText }}</strong>
      </section>

      <section v-if="!modoImpressao && evidenceMessage" class="evidence-record" aria-label="Registro de evidências">
        <strong>Evidências fotográficas</strong>
        <span>{{ evidenceMessage }}</span>
      </section>

      <footer v-if="modoImpressao" class="document-footer cover-footer">
        <div class="signature-area">
          <img v-if="documento.assinatura" :src="documento.assinatura" alt="Assinatura digital do responsável" class="signature-image">
          <div class="signature-line"></div>
          <span>Assinatura digital do responsável</span>
        </div>
        <p>Documento gerado eletronicamente pelo Sistema de Checklist DASS.</p>
      </footer>
    </div>

    <section class="answers-section" aria-label="Respostas da inspeção">
      <h2 class="section-title">Respostas da inspeção</h2>
      <div v-for="(perguntas, categoria) in documento.categorias" :key="categoria" class="category-block">
        <h3 class="category-title">{{ categoria }}</h3>
        <div class="answer-list">
          <div v-for="(item, index) in perguntas" :key="item.id || `${categoria}-${index}`" class="answer-item">
            <div class="answer-copy">
              <span class="answer-index">{{ index + 1 }}</span>
              <p class="question-text">{{ item.pergunta || 'Item não identificado' }}</p>
            </div>
            <span class="answer-value" :class="answerClass(item.resposta)">{{ item.resposta || 'Não preenchido' }}</span>
            <p v-if="item.resposta === 'Não Conforme' && item.observacao" class="answer-observation"><strong>Observação:</strong> {{ item.observacao }}</p>
            <p v-if="!modoImpressao && item.resposta === 'Não Conforme' && numeroEvidencia(item)" class="answer-evidence"><strong>Evidência:</strong> {{ numeroEvidencia(item) }}</p>
          </div>
        </div>
        <div v-if="obterAssinaturaCategoria(categoria)" class="category-signature-wrapper">
          <div class="signature-area category-signature-area">
            <img :src="obterAssinaturaCategoria(categoria)" :alt="`Assinatura do responsável: ${categoria}`" class="signature-image">
            <div class="signature-line"></div>
            <span>Assinatura do responsável: <strong>{{ categoria }}</strong></span>
          </div>
        </div>
      </div>
      <p v-if="!temCategorias" class="empty-document">Nenhuma resposta registrada.</p>
    </section>

    <footer v-if="!modoImpressao" class="document-footer">
      <div class="signature-area">
        <img v-if="documento.assinatura" :src="documento.assinatura" alt="Assinatura digital do responsável" class="signature-image">
        <div class="signature-line"></div>
        <span>Assinatura digital do responsável</span>
      </div>
      <p>Documento gerado eletronicamente pelo Sistema de Checklist DASS.</p>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { formatarDataHora } from '../../services/formatters'

const props = defineProps({
  documento: { type: Object, required: true },
  evidencias: { type: Object, default: () => ({ total: 0, disponiveis: 0 }) },
  logoSrc: { type: String, default: '' },
  modoImpressao: { type: Boolean, default: false },
})

const valorData = (valor) => valor ? formatarDataHora(valor) : ''

const camposContexto = computed(() => [
  { label: 'Modelo', valor: props.documento.nomeModelo },
  { label: 'Marca', valor: props.documento.marca },
  { label: 'Setor', valor: props.documento.nomeSetor },
  { label: 'Unidade / Local', valor: props.documento.unidade || props.documento.local },
  { label: 'Linha / Célula', valor: props.documento.nomeCelula },
  { label: 'Responsável', valor: props.documento.nomeUsuario },
  { label: 'Matrícula', valor: props.documento.matricula },
  { label: 'Função', valor: props.documento.funcaoUsuario },
  { label: 'Início da execução', valor: valorData(props.documento.inicioChecklist) },
  { label: 'Data e hora de conclusão', valor: valorData(props.documento.dataEnvio || props.documento.concluidoEm) },
])

const categorias = computed(() => props.documento.categorias || {})
const temCategorias = computed(() => Object.keys(categorias.value).length > 0)
const score = computed(() => Number.isFinite(Number(props.documento.pontuacao)) ? Number(props.documento.pontuacao) : null)
const scoreText = computed(() => score.value == null ? 'Não calculado' : `${score.value}%`)
const evidenceMessage = computed(() => {
  const total = Math.max(0, Number(props.evidencias?.total) || 0)
  const disponiveis = Math.max(0, Number(props.evidencias?.disponiveis) || 0)
  if (!total) return ''
  if (!disponiveis) return `${total} ${total === 1 ? 'anexo foi registrado' : 'anexos foram registrados'} durante a inspeção. Os arquivos não estão mais disponíveis devido à política de retenção de evidências.`
  if (disponiveis === total) return `${total} ${total === 1 ? 'anexo disponível' : 'anexos disponíveis'} para consulta na galeria de evidências.`
  return `${total} anexos foram registrados durante a inspeção; ${disponiveis} permanecem disponíveis para consulta na galeria de evidências.`
})

const answerClass = (resposta) => ({
  'answer-conforme': resposta === 'Conforme',
  'answer-nao-conforme': resposta === 'Não Conforme',
  'answer-na': resposta === 'N/A',
})

const numeroEvidencia = (item) => {
  const id = item?.evidencia?.id
  if (id == null) return null
  const indice = (props.evidencias?.itens || []).findIndex((evidencia) => String(evidencia.id) === String(id))
  return indice >= 0 ? indice + 1 : null
}

const obterAssinaturaCategoria = (categoria) => {
  const assinaturas = props.documento?.assinaturasCategorias || props.documento?.assinaturas_categorias || {}
  const item = assinaturas[categoria]
  if (!item) return null
  if (typeof item === 'string') return item
  if (typeof item === 'object' && item.imagem) return item.imagem
  return null
}
</script>

<style scoped>
.category-signature-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 0.85rem 0.5rem 0.5rem;
  break-inside: avoid;
  page-break-inside: avoid;
}
.category-signature-area {
  width: min(240px, 100%);
}

.checklist-document {
  color: #172033;
  background: #fff;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.document-cover { display: contents; }
.document-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; padding-bottom: 1.25rem; border-bottom: 2px solid #172033; }
.document-brand { display: flex; align-items: center; gap: 1rem; min-width: 0; }
.document-logo { width: auto; max-width: 120px; max-height: 52px; object-fit: contain; }
.document-kicker { margin: 0 0 .2rem; color: #5b6577; font-size: .7rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 0; font-size: 1.65rem; line-height: 1.15; letter-spacing: -.02em; }
.document-number { margin: .35rem 0 0; color: #5b6577; font-size: .8rem; }
.section-title { margin: 0; color: #172033; font-size: 1rem; font-weight: 800; }
.document-context { padding: 1.25rem 0 1rem; border-bottom: 1px solid #d7dce5; }
.context-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .9rem 1.25rem; margin: 1rem 0 0; }
.context-field { min-width: 0; }
.context-field dt { color: #5b6577; font-size: .66rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.context-field dd { margin: .15rem 0 0; color: #172033; font-size: .9rem; font-weight: 650; }
.document-result { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #d7dce5; }
.result-caption { margin: .15rem 0 0; color: #5b6577; font-size: .8rem; }
.result-score { color: #172033; font-size: 1.7rem; letter-spacing: -.03em; }
.evidence-record { display: flex; gap: .5rem; align-items: baseline; padding: .75rem .9rem; margin: 1rem 0; border-left: 3px solid #64748b; background: #f8fafc; color: #3f4b5e; font-size: .82rem; }
.evidence-record strong { color: #172033; white-space: nowrap; }
.answers-section { padding-top: 1.15rem; }
.category-block { margin-top: 1rem; }
.category-title { margin: 0; padding: .45rem .65rem; border-bottom: 2px solid #172033; color: #172033; font-size: .9rem; break-after: avoid; page-break-after: avoid; }
.answer-list { border-bottom: 1px solid #d7dce5; }
.answer-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .45rem 1rem; padding: .65rem .35rem; border-bottom: 1px solid #e6e9ef; break-inside: avoid; page-break-inside: avoid; }
.answer-item:last-child { border-bottom: 0; }
.answer-copy { display: flex; gap: .55rem; min-width: 0; }
.answer-index { flex: 0 0 auto; color: #6b7485; font-size: .74rem; font-weight: 800; }
.question-text { margin: 0; color: #263248; font-size: .87rem; }
.answer-value { align-self: start; min-width: 88px; padding-top: .05rem; color: #475569; font-size: .72rem; font-weight: 850; text-align: right; text-transform: uppercase; }
.answer-conforme { color: #087443; }
.answer-nao-conforme { color: #b42318; }
.answer-na { color: #64748b; }
.answer-observation { grid-column: 1 / -1; margin: .15rem 0 0 1.25rem; padding-left: .6rem; border-left: 2px solid #d97706; color: #5b4210; font-size: .8rem; white-space: pre-wrap; }
.answer-evidence { grid-column: 1 / -1; margin: 0 0 0 1.25rem; color: #475569; font-size: .78rem; }
.empty-document { color: #5b6577; font-size: .85rem; }
.document-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid #b8bfcb; }
.signature-area { width: min(280px, 45%); text-align: center; }
.signature-image { display: block; max-width: 100%; height: 58px; margin: 0 auto .3rem; object-fit: contain; }
.signature-line { height: 1px; background: #172033; }
.signature-area span { display: block; margin-top: .3rem; color: #5b6577; font-size: .7rem; font-weight: 700; }
.document-footer > p { max-width: 310px; margin: 0; color: #6b7485; font-size: .68rem; text-align: right; }

.is-print-layout .document-cover { display: flex; min-height: 265mm; flex-direction: column; break-after: page; page-break-after: always; }
.is-print-layout .cover-footer { margin-top: auto; }
.is-print-layout .answers-section { padding-top: 0; }

@media (max-width: 720px) {
  .document-header { flex-direction: column; gap: 1rem; }
  .context-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .answer-item { grid-template-columns: 1fr; }
  .answer-value { text-align: left; }
  .document-footer { align-items: center; flex-direction: column; }
  .signature-area { width: min(280px, 100%); }
  .document-footer > p { text-align: center; }
}
</style>
