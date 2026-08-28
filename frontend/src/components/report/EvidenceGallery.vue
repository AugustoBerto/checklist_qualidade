<template>
  <section class="evidence-gallery" aria-labelledby="gallery-title">
    <div class="gallery-heading">
      <div>
        <p class="gallery-kicker">Arquivos complementares</p>
        <h2 id="gallery-title">Evidências fotográficas</h2>
        <p class="gallery-summary">{{ summaryText }}</p>
      </div>
      <button v-if="disponiveis.length > 1" type="button" class="gallery-print-all" @click="imprimirTodas">
        <i class="mdi mdi-printer-outline"></i> Imprimir disponíveis
      </button>
    </div>

    <div v-if="disponiveis.length" class="gallery-grid">
      <article v-for="(item, index) in disponiveis" :key="item.id || `${item.idPergunta}-${index}`" class="evidence-card">
        <button type="button" class="evidence-open" :aria-label="`Visualizar evidência ${index + 1}`" @click="abrir(index)">
          <img :src="urlDaEvidencia(item)" :alt="item.pergunta ? `Evidência: ${item.pergunta}` : `Evidência ${index + 1}`" class="evidence-thumbnail" loading="lazy">
        </button>
        <div class="evidence-card-footer">
          <span class="evidence-caption">{{ item.pergunta || `Evidência ${index + 1}` }}</span>
          <button type="button" class="evidence-download" title="Baixar evidência" :aria-label="`Baixar evidência ${index + 1}`" @click="baixar(item)">
            <i class="mdi mdi-download"></i>
          </button>
        </div>
      </article>
    </div>

    <p v-else-if="total" class="gallery-expired">Os arquivos das evidências não estão mais disponíveis devido à política de retenção. O registro histórico da inspeção foi preservado.</p>
    <p v-else class="gallery-empty">Nenhuma evidência fotográfica foi anexada a esta checklist.</p>

    <div v-if="aberta" class="gallery-modal" role="dialog" aria-modal="true" aria-labelledby="evidence-modal-title" @click.self="fechar">
      <div class="gallery-modal-panel">
        <div class="gallery-modal-toolbar">
          <h2 id="evidence-modal-title">Evidência {{ indiceAtual + 1 }} de {{ disponiveis.length }}</h2>
          <button type="button" class="modal-close" aria-label="Fechar visualizador" @click="fechar">&times;</button>
        </div>
        <div class="gallery-image-frame">
          <button v-if="disponiveis.length > 1" type="button" class="modal-nav modal-prev" aria-label="Evidência anterior" @click="anterior">‹</button>
          <img :src="urlDaEvidencia(evidenciaAtual)" :alt="evidenciaAtual?.pergunta || 'Evidência fotográfica'" class="gallery-image">
          <button v-if="disponiveis.length > 1" type="button" class="modal-nav modal-next" aria-label="Próxima evidência" @click="proxima">›</button>
        </div>
        <div class="gallery-modal-actions">
          <button type="button" class="gallery-action" @click="baixar(evidenciaAtual)"><i class="mdi mdi-download"></i> Baixar</button>
          <button type="button" class="gallery-action" @click="imprimirAtual"><i class="mdi mdi-printer-outline"></i> Imprimir</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  evidencias: { type: Object, default: () => ({ total: 0, disponiveis: 0, itens: [] }) },
})

const aberta = ref(false)
const indiceAtual = ref(0)
const disponiveis = computed(() => (Array.isArray(props.evidencias?.itens) ? props.evidencias.itens : []).filter((item) => urlDaEvidencia(item)))
const total = computed(() => Math.max(Number(props.evidencias?.total) || 0, disponiveis.value.length))
const disponiveisDeclaradas = computed(() => Math.max(Number(props.evidencias?.disponiveis) || 0, disponiveis.value.length))
const evidenciaAtual = computed(() => disponiveis.value[indiceAtual.value] || null)
const summaryText = computed(() => {
  if (!total.value) return 'Nenhum arquivo associado.'
  if (!disponiveisDeclaradas.value) return `${total.value} ${total.value === 1 ? 'arquivo registrado' : 'arquivos registrados'}; indisponíveis após a retenção.`
  return `${disponiveisDeclaradas.value} de ${total.value} ${total.value === 1 ? 'arquivo disponível' : 'arquivos disponíveis'}.`
})

function urlDaEvidencia(item) {
  return item?.conteudoUrl || item?.url || ''
}

function abrir(index) {
  indiceAtual.value = index
  aberta.value = true
  document.body.classList.add('evidence-gallery-open')
}

function fechar() {
  aberta.value = false
  document.body.classList.remove('evidence-gallery-open')
}

function anterior() {
  if (!disponiveis.value.length) return
  indiceAtual.value = (indiceAtual.value - 1 + disponiveis.value.length) % disponiveis.value.length
}

function proxima() {
  if (!disponiveis.value.length) return
  indiceAtual.value = (indiceAtual.value + 1) % disponiveis.value.length
}

function onKeydown(event) {
  if (!aberta.value) return
  if (event.key === 'Escape') fechar()
  if (event.key === 'ArrowLeft') anterior()
  if (event.key === 'ArrowRight') proxima()
}

function baixar(item) {
  const url = urlDaEvidencia(item)
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.download = item?.nome || `evidencia-${item?.id || 'checklist'}.${extensao(item?.mime)}`
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function extensao(mime) {
  return String(mime || '').split('/')[1] || 'jpg'
}

function imprimirAtual() {
  if (evidenciaAtual.value) imprimir([evidenciaAtual.value])
}

function imprimirTodas() {
  imprimir(disponiveis.value)
}

function imprimir(itens) {
  const janela = window.open('', '_blank')
  if (!janela) return
  janela.opener = null
  janela.document.title = 'Evidências fotográficas'
  const style = janela.document.createElement('style')
  style.textContent = '@page{margin:12mm}body{margin:0;display:grid;gap:12mm;place-items:center}img{display:block;max-width:100%;max-height:90vh;object-fit:contain;break-inside:avoid}'
  janela.document.head.appendChild(style)
  let pendentes = itens.length
  let impresso = false
  const imprimirQuandoPronto = () => {
    if (impresso || pendentes > 0) return
    impresso = true
    janela.focus()
    janela.print()
  }
  itens.forEach((item) => {
    const imagem = janela.document.createElement('img')
    const concluirImagem = () => {
      pendentes -= 1
      imprimirQuandoPronto()
    }
    imagem.addEventListener('load', concluirImagem, { once: true })
    imagem.addEventListener('error', concluirImagem, { once: true })
    imagem.src = urlDaEvidencia(item)
    imagem.alt = item?.pergunta || 'Evidência fotográfica'
    janela.document.body.appendChild(imagem)
  })
  window.setTimeout(() => {
    pendentes = 0
    imprimirQuandoPronto()
  }, 2000)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.classList.remove('evidence-gallery-open')
})
</script>

<style scoped>
.evidence-gallery { margin-top: 1.5rem; padding: 1.25rem; border: 1px solid #d7dce5; border-radius: 8px; background: #fff; }
.gallery-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.gallery-kicker { margin: 0 0 .2rem; color: #64748b; font-size: .68rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
h2 { margin: 0; color: #172033; font-size: 1.05rem; }
.gallery-summary { margin: .3rem 0 0; color: #64748b; font-size: .8rem; }
.gallery-print-all, .gallery-action { display: inline-flex; align-items: center; gap: .4rem; min-height: 40px; padding: .55rem .8rem; border: 1px solid #c7ceda; border-radius: 5px; background: #fff; color: #334155; font-size: .8rem; font-weight: 700; cursor: pointer; }
.gallery-print-all:hover, .gallery-action:hover { border-color: #b1072c; color: #b1072c; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .85rem; margin-top: 1rem; }
.evidence-card { overflow: hidden; border: 1px solid #d7dce5; border-radius: 6px; background: #f8fafc; }
.evidence-open { display: block; width: 100%; padding: 0; border: 0; background: #eef2f6; cursor: zoom-in; }
.evidence-thumbnail { display: block; width: 100%; height: 130px; object-fit: contain; }
.evidence-card-footer { display: flex; align-items: center; justify-content: space-between; gap: .4rem; padding: .45rem .55rem; }
.evidence-caption { min-width: 0; overflow: hidden; color: #334155; font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
.evidence-download { flex: 0 0 auto; width: 30px; height: 30px; border: 0; border-radius: 4px; background: transparent; color: #64748b; cursor: pointer; }
.evidence-download:hover { background: #e2e8f0; color: #b1072c; }
.gallery-expired, .gallery-empty { margin: 1rem 0 0; color: #64748b; font-size: .82rem; }
.gallery-expired { padding: .8rem; border-left: 3px solid #64748b; background: #f8fafc; }
.gallery-modal { position: fixed; z-index: 2000; inset: 0; display: grid; place-items: center; overflow: auto; padding: 1rem; background: rgba(15, 23, 42, .9); }
.gallery-modal-panel { width: min(100%, 1050px); max-height: calc(100vh - 2rem); overflow: hidden; border-radius: 8px; background: #0f172a; box-shadow: 0 24px 70px rgba(0,0,0,.4); }
.gallery-modal-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .65rem .85rem; color: #fff; }
.gallery-modal-toolbar h2 { color: #fff; font-size: .9rem; }
.modal-close { width: 40px; height: 40px; border: 0; border-radius: 4px; background: transparent; color: #fff; font-size: 2rem; line-height: 1; cursor: pointer; }
.modal-close:hover { background: rgba(255,255,255,.15); }
.gallery-image-frame { position: relative; display: grid; min-height: min(68vh, 720px); max-height: calc(100vh - 10rem); place-items: center; padding: .5rem 3.5rem; background: #020617; }
.gallery-image { display: block; max-width: 100%; max-height: min(68vh, 720px); object-fit: contain; }
.modal-nav { position: absolute; top: 50%; z-index: 1; width: 42px; height: 58px; transform: translateY(-50%); border: 0; border-radius: 5px; background: rgba(255,255,255,.16); color: #fff; font-size: 2.5rem; line-height: 1; cursor: pointer; }
.modal-nav:hover { background: rgba(255,255,255,.3); }
.modal-prev { left: .65rem; }
.modal-next { right: .65rem; }
.gallery-modal-actions { display: flex; justify-content: center; gap: .65rem; padding: .7rem; }
.gallery-action { border-color: rgba(255,255,255,.25); background: transparent; color: #fff; }
.gallery-action:hover { border-color: #fff; color: #fff; }

:global(body.evidence-gallery-open) { overflow: hidden; }
@media (max-width: 600px) {
  .evidence-gallery { padding: 1rem; }
  .gallery-heading { flex-direction: column; }
  .gallery-print-all { width: 100%; justify-content: center; }
  .gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gallery-image-frame { min-height: 55vh; padding-inline: 2.75rem; }
  .gallery-image { max-height: 55vh; }
}
</style>
