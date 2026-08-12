<template>
  <div class="report-fullscreen-wrapper">
    <div v-if="isLoading" class="status-message">
      <div class="spinner"></div>
      <p>Gerando documento oficial...</p>
    </div>

    <div v-else-if="error" class="status-message error">
      <i class="mdi mdi-alert-circle-outline"></i>
      <h2>Erro ao gerar relatório</h2>
      <p>{{ error }}</p>
      <button @click="buscarDados" class="btn-primary">Tentar Novamente</button>
      <button @click="$router.back()" class="btn-outline">Voltar</button>
    </div>

    <div v-else-if="relatorio" class="report-sheet slide-in">
      <header class="report-header">
        <div class="header-left">
          <img src="../img/dass.png" alt="DASS Logo" class="logo">
          <div class="title-group">
            <h1>Relatório de Auditoria</h1>
            <span class="report-id">Checklist ID: #{{ $route.params.id }}</span>
          </div>
        </div>
        <div class="header-actions no-print">
          <button @click="imprimirPagina" class="btn-print">
            <i class="mdi mdi-printer"></i> Imprimir / PDF
          </button>
          <button @click="$router.back()" class="btn-close">
            <i class="mdi mdi-close"></i> Sair
          </button>
        </div>
      </header>

      <section class="metadata-doc">
        <div class="meta-row">
          <div class="meta-field">
            <span class="label">Modelo de Inspeção:</span>
            <span class="value">{{ relatorio.nomeModelo }}</span>
          </div>
          <div class="meta-field">
            <span class="label">Linha / Célula:</span>
            <span class="value">{{ relatorio.nomeCelula }}</span>
          </div>
          <div class="meta-field">
            <span class="label">Auditor Responsável:</span>
            <span class="value">{{ relatorio.nomeUsuario }}</span>
          </div>
        </div>
        <div class="meta-row">
          <div class="meta-field">
            <span class="label">Data de Emissão:</span>
            <span class="value">{{ formatarData(relatorio.dataEnvio) }}</span>
          </div>
          <div class="meta-field">
            <span class="label">Resultado Final:</span>
            <span class="value score-pill" :class="getScoreClass(relatorio.pontuacao)">
              {{ relatorio.pontuacao }}% de Conformidade
            </span>
          </div>
        </div>
      </section>

      <main class="report-body">
        <div v-for="(perguntas, categoria) in relatorio.categorias" :key="categoria" class="category-block">
          <h2 class="category-header">{{ categoria }}</h2>

          <div class="questions-list">
            <div v-for="(item, index) in perguntas" :key="index" class="question-row">
              <div class="question-main">
                <span class="question-text">{{ item.pergunta }}</span>
                <span class="answer-badge" :class="getRespostaClass(item.resposta)">
                  {{ item.resposta }}
                </span>
              </div>
              
              <div v-if="item.foto || item.observacao" class="evidence-box">
                <div v-if="item.observacao" class="obs-text">
                  <strong>Observação da não conformidade:</strong> {{ item.observacao }}
                </div>
                <div v-if="item.foto" class="photo-doc">
                  <img :src="item.foto" @click="openImageModal(item.foto)" class="clickable-img">
                  <span class="photo-caption no-print">Toque para ampliar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer class="report-footer-doc">
        <div class="signature-section">
          <div class="signature-block">
            <img v-if="relatorio.assinatura" :src="relatorio.assinatura" class="signature-img">
            <div class="signature-line"></div>
            <span>Assinatura Digital do Auditor</span>
          </div>
        </div>
        <div class="footer-note">
          Documento gerado eletronicamente via Sistema de Checklist Dass Itapipoca Automação.
        </div>
      </footer>
    </div>

    <div v-if="isModalVisible" class="image-modal-overlay" @click.self="closeImageModal">
      <div class="image-modal-content">
        <button class="modal-close-button" @click="closeImageModal">&times;</button>
        <img :src="expandedImageSrc" class="expanded-image">
        <button class="modal-print-button no-print" @click="printExpandedImage">🖨️ Imprimir Foto</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';

const route = useRoute();
const router = useRouter();
const isLoading = ref(true);
const error = ref(null);
const relatorio = ref(null);
const isModalVisible = ref(false);
const expandedImageSrc = ref('');

const formatarData = (dataString) => {
  if (!dataString) return '';
  return new Date(dataString).toLocaleString('pt-BR');
};

const getScoreClass = (score) => {
    if (score >= 90) return 'score-high';
    if (score >= 70) return 'score-med';
    return 'score-low';
};

const getRespostaClass = (resposta) => {
  switch (resposta) {
    case 'Conforme': return 'status-conforme';
    case 'Não Conforme': return 'status-nao-conforme';
    case 'N/A': return 'status-na';
    default: return '';
  }
};

const imprimirPagina = () => window.print();

const openImageModal = (imgSrc) => {
  expandedImageSrc.value = imgSrc;
  isModalVisible.value = true;
};

const closeImageModal = () => {
  isModalVisible.value = false;
  expandedImageSrc.value = '';
};

// 📌 Imprimir apenas a foto ampliada
const printExpandedImage = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Imprimir Foto de Evidência</title></head>
        <body style="margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh;">
          <img src="${expandedImageSrc.value}" style="max-width: 100%; max-height: 100%;" />
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
};

const buscarDados = async () => {
  isLoading.value = true;
  error.value = null;
  const relatorioId = route.params.id;
  try {
    const res = await api.get(`/submissoes/${relatorioId}`);
    if (res.data.sucesso) {
      relatorio.value = res.data.dados;
    } else {
      error.value = res.data.mensagem;
    }
  } catch (err) {
    error.value = 'Falha ao buscar os dados do relatório. Verifique sua conexão.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(buscarDados);
</script>

<style scoped>
/* 📌 SEU CSS ORIGINAL (Mantido Integralmente) */
.report-fullscreen-wrapper { min-height: 100%; background-color: #f1f5f9; padding: 2rem; box-sizing: border-box; }
.report-sheet { max-width: 900px; margin: 0 auto; background: white; padding: 3rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px; min-height: 100%; }
.report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; border-bottom: 2px solid #334155; padding-bottom: 1.5rem; }
.header-left { display: flex; gap: 1.5rem; align-items: center; }
.logo { height: 60px; }
.title-group h1 { margin: 0; font-size: 1.6rem; color: #1e293b; font-weight: 800; }
.report-id { color: #64748b; font-size: 0.9rem; font-weight: 600; }
.header-actions { display: flex; gap: 10px; }
.btn-print { background: #0f172a; color: white; border: none; padding: 0.8rem 1.2rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-close { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 0.8rem 1.2rem; border-radius: 6px; cursor: pointer; }
.metadata-doc { background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 2.5rem; }
.meta-row { display: flex; justify-content: space-between; margin-bottom: 1rem; }
.meta-row:last-child { margin-bottom: 0; }
.meta-field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.label { font-size: 0.8rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
.value { font-size: 1.1rem; color: #1e293b; font-weight: 600; }
.score-pill { padding: 4px 12px; border-radius: 50px; color: white; font-size: 0.9rem; display: inline-block; width: max-content; }
.score-high { background: #10b981; }
.score-med { background: #f59e0b; }
.score-low { background: #ef4444; }
.category-block { margin-bottom: 3rem; }
.category-header { font-size: 1.1rem; background: #334155; color: white; padding: 10px 15px; border-radius: 4px; margin-bottom: 1rem; }
.question-row { padding: 1.2rem 0; border-bottom: 1px solid #f1f5f9; }
.question-main { display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; }
.question-text { flex: 1; color: #334155; font-size: 1rem; line-height: 1.5; }
.answer-badge { font-weight: 800; text-transform: uppercase; font-size: 0.85rem; min-width: 100px; text-align: right; }
.status-conforme { color: #10b981; }
.status-nao-conforme { color: #ef4444; }
.status-na { color: #94a3b8; }
.evidence-box { margin-top: 1rem; background: #fffcf0; border-left: 4px solid #f59e0b; padding: 1rem; display: flex; gap: 2rem; border-radius: 0 8px 8px 0; align-items: center;}
.obs-text { flex: 1; font-size: 0.95rem; color: #92400e; }
.photo-doc { width: 200px; text-align: center; }
.photo-doc img { width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: zoom-in; }
.photo-caption { font-size: 0.7rem; color: #94a3b8; display: block; margin-top: 4px;}
.report-footer-doc { margin-top: 4rem; border-top: 1px solid #e2e8f0; padding-top: 2rem; text-align: center; }
.signature-section { display: flex; justify-content: center; margin-bottom: 2rem; }
.signature-block { width: 300px; display: flex; flex-direction: column; align-items: center; }
.signature-img { max-height: 80px; margin-bottom: 10px; }
.signature-line { height: 1px; background: #94a3b8; width: 100%; margin-bottom: 5px; }
.signature-block span { font-size: 0.8rem; font-weight: 700; color: #64748b; }
.footer-note { font-size: 0.75rem; color: #94a3b8; }
.image-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 2rem; flex-direction: column; gap: 15px;}
.image-modal-content { position: relative; background: transparent; padding: 0; max-width: 90%; text-align: center;}
.expanded-image { max-height: 80vh; max-width: 100%; border: 4px solid white; border-radius: 8px;}
.modal-close-button { position: absolute; top: -40px; right: -40px; color: white; background: none; border: none; font-size: 3rem; cursor: pointer; }
.modal-print-button { margin-top: 15px; background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 1rem;}
@media print {
  .report-fullscreen-wrapper { position: relative; padding: 0; background: white; width: 100%; height: auto; overflow: visible; }
  .report-sheet { box-shadow: none; padding: 0; width: 100%; }
  .no-print { display: none !important; }
  .evidence-box { border: 1px solid #e2e8f0; background: white; page-break-inside: avoid; }
}
@media (max-width: 767px) {
  .report-fullscreen-wrapper { padding: 0; }
  .report-sheet { border-radius: 0; padding: 1rem; }
  .report-header, .header-left, .meta-row, .question-main, .evidence-box { align-items: stretch; flex-direction: column; }
  .report-header { gap: 1rem; }
  .header-left { gap: 0.75rem; }
  .logo { height: 42px; width: max-content; }
  .title-group h1 { font-size: 1.3rem; }
  .header-actions { width: 100%; }
  .header-actions button { flex: 1; min-height: 44px; padding: 0.6rem; }
  .metadata-doc { padding: 1rem; margin-bottom: 1.5rem; }
  .meta-row { gap: 1rem; margin-bottom: 1rem; }
  .answer-badge { min-width: 0; text-align: left; }
  .evidence-box { gap: 1rem; }
  .photo-doc { width: 100%; }
  .photo-doc img { max-height: 260px; width: 100%; }
  .signature-block { max-width: 300px; width: 100%; }
  .image-modal-overlay { padding: 1rem; }
  .modal-close-button { top: -3rem; right: 0; min-height: 44px; min-width: 44px; }
}
.slide-in { animation: slideUp 0.4s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.spinner { border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #0f172a; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
