<template>
  <div class="page-container">
    <PageHeader
      :title="marcaSelecionada ? 'Selecione o Modelo de Auditoria' : 'Selecione a Marca'"
      :subtitle="marcaSelecionada ? 'Configure o setor, modelo e linha/célula de produção.' : 'Escolha a marca para iniciar o preenchimento da auditoria.'"
      :icon="marcaSelecionada ? 'mdi mdi-format-list-bulleted-type' : 'mdi mdi-domain'"
    >
      <template v-if="marcaSelecionada && podeTrocarMarca" #actions>
        <button type="button" class="btn-trocar" @click="resetarSelecao">
          <i class="mdi mdi-swap-horizontal"></i> Trocar Marca
        </button>
      </template>
    </PageHeader>

    <!-- Seleção de Marcas -->
    <div v-if="!marcaSelecionada" class="brand-grid-container">
      <FeedbackState
        v-if="isLoadingMarcas"
        type="loading"
        message="Carregando marcas e configurações..."
      />

      <FeedbackState
        v-else-if="erroCarregamento"
        type="error"
        title="Não foi possível carregar as opções"
        :message="erroCarregamento"
        :show-retry="true"
        @retry="carregarDadosIniciais"
      />

      <div v-else class="brand-grid">
        <div v-for="marca in marcas" :key="marca.id" class="brand-card" @click="selecionarMarca(marca)">
          <div class="brand-logo-wrapper">
            <img v-if="urlLogo(marca) && !errosImagens[marca.id]" :src="urlLogo(marca)" :alt="marca.nome"
              class="img-responsive" @error="marcarErroImagem(marca.id)">

            <span v-else class="brand-initial">
              {{ marca.nome ? marca.nome.charAt(0) : '?' }}
            </span>
          </div>

          <span class="brand-name">{{ marca.nome || 'Sem Nome' }}</span>
        </div>
      </div>
    </div>

    <!-- Formulário de Seleção de Modelo/Célula -->
    <div v-else class="form-container slide-in">
      <div class="card-formulario">
        <div class="header-marca">
          <div class="mini-brand-info">
            <img v-if="urlLogo(marcaSelecionada) && !errosImagens[marcaSelecionada.id]"
              :src="urlLogo(marcaSelecionada)" class="mini-logo"
              @error="marcarErroImagem(marcaSelecionada.id)">
            <span v-else class="mini-initial">
              {{ marcaSelecionada?.nome ? marcaSelecionada.nome.charAt(0) : '?' }}
            </span>
            <span>Marca selecionada: <strong>{{ marcaSelecionada.nome }}</strong></span>
          </div>
        </div>

        <form @submit.prevent="irParaFormulario" class="selection-form">
          <div class="form-group mb-3">
            <label for="setor">Setor da Inspeção:</label>
            <div class="select-wrapper">
              <VueSelect v-model="form.setor_selecionado" :options="opcoesSetores"
                placeholder="Selecione o setor..." />
            </div>
          </div>

          <div class="form-group mt-3">
            <label for="modelo">Modelos disponíveis:</label>
            <div class="select-wrapper">
              <VueSelect v-model="form.modelo" :options="opcoesModelos" placeholder="Selecione o modelo..." :disabled="!form.setor_selecionado" />
            </div>
          </div>

          <div class="form-group mt-4">
            <label for="celula">Célula da Inspeção:</label>
            <div class="select-wrapper">
              <VueSelect v-model="form.celula_selecionada" :options="opcoesCelulas" placeholder="Selecione a linha/célula..." :disabled="!form.setor_selecionado" />
            </div>
          </div>

          <div class="form-actions mt-5">
            <button type="submit" class="continuar-button" :disabled="isBotaoDesabilitado">
              <span>Continuar</span>
              <i class="mdi mdi-arrow-right"></i>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import VueSelect from 'vue3-select-component'
import { ref, onBeforeUnmount, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import PageHeader from '../components/PageHeader.vue'
import FeedbackState from '../components/FeedbackState.vue'
import { urlLogoMarca } from '../services/formatters'
import { toast } from '../services/feedback'

const router = useRouter()

const marcas = ref([])
const opcoesSetores = ref([])
const opcoesModelos = ref([])
const opcoesCelulas = ref([])
const listaCelulasGlobal = ref([])
const marcaSelecionada = ref(null)
const errosImagens = ref({})
const isLoadingMarcas = ref(true)
const erroCarregamento = ref('')

const form = ref({ setor_selecionado: '', modelo: '', celula_selecionada: '' })

const podeTrocarMarca = computed(() => marcas.value.length > 1)

const isBotaoDesabilitado = computed(() => {
  if (!form.value.setor_selecionado) return true;
  if (!form.value.modelo) return true;
  if (!form.value.celula_selecionada) return true;
  return false;
})

async function carregarDadosIniciais() {
  try {
    isLoadingMarcas.value = true;
    erroCarregamento.value = '';
    
    const [resMarcas, resCelulas, resSetores] = await Promise.all([
      api.get('/cadastros/marcas'),
      api.get('/cadastros/celulas'),
      api.get('/cadastros/setores').catch(() => ({ data: { dados: [] } }))
    ]);

    marcas.value = resMarcas.data.dados;
    listaCelulasGlobal.value = resCelulas.data.dados;
    opcoesSetores.value = resSetores.data.dados.map(s => ({ label: s.nome, value: s.id }));

  } catch (error) {
    console.error('Erro na carga inicial:', error);
    erroCarregamento.value = 'Não foi possível carregar as opções. Verifique a conexão e tente novamente.';
  } finally {
    isLoadingMarcas.value = false;
  }
}

onMounted(carregarDadosIniciais)

watch(() => form.value.setor_selecionado, async (novoSetorId) => {
    form.value.celula_selecionada = '';
    form.value.modelo = '';
    
    if (novoSetorId) {
      filtrarCelulasPorSetor(novoSetorId);
      if (marcaSelecionada.value) {
        await carregarModelos(marcaSelecionada.value, novoSetorId);
      }
    } else {
      carregarModelosController?.abort();
      carregarModelosController = null;
      opcoesCelulas.value = [];
      opcoesModelos.value = [];
    }
})

function filtrarCelulasPorSetor(idSetor) {
  if (!idSetor) {
    opcoesCelulas.value = [];
    return;
  }

  const idMarca = marcaSelecionada.value?.id;
  const filtradas = listaCelulasGlobal.value.filter(c =>
    String(c.id_setor_fk) === String(idSetor) &&
    (c.id_marca_fk == null || String(c.id_marca_fk) === String(idMarca))
  );
  opcoesCelulas.value = filtradas.map(c => ({ label: c.nome, value: c.id }));
}

let carregarModelosController = null;

async function carregarModelos(marca, setorId) {
  carregarModelosController?.abort();
  const controller = new AbortController();
  carregarModelosController = controller;
  try {
    const queryParams = { marca_id: marca.id };

    if (setorId) {
        queryParams.setor_id = setorId;
    }

    const response = await api.get('/dados/modelos', { params: queryParams, signal: controller.signal });
    if (controller.signal.aborted || carregarModelosController !== controller) return;
    opcoesModelos.value = response.data.dados.map(item => ({ label: item.nome, value: item.id }));

  } catch (error) {
    if (!controller.signal.aborted && error?.code !== 'ERR_CANCELED') {
      console.error("Erro ao carregar modelos:", error);
      toast.error('Erro ao carregar os modelos disponíveis para esta marca e setor.');
    }
  }
}

async function selecionarMarca(marca) {
  marcaSelecionada.value = marca;
  form.value.celula_selecionada = '';
  filtrarCelulasPorSetor(form.value.setor_selecionado);
  await carregarModelos(marca, form.value.setor_selecionado);
}

function irParaFormulario() {
  if (isBotaoDesabilitado.value) return;

  const query = {
    cb: new Date().getTime() 
  };
  
  query.celula = form.value.celula_selecionada;
  query.setor = form.value.setor_selecionado;
  
  if (query.celula) localStorage.setItem('celula_auditada_atual', query.celula);

  router.push({ path: `/formulario/${form.value.modelo}`, query: query });
}

function urlLogo(marca) {
  return urlLogoMarca(marca);
}

function marcarErroImagem(id) { 
  errosImagens.value[id] = true; 
}

function resetarSelecao() { 
  carregarModelosController?.abort();
  carregarModelosController = null;
  marcaSelecionada.value = null; 
  opcoesModelos.value = []; 
  form.value.modelo = ''; 
  form.value.celula_selecionada = ''; 
}

onBeforeUnmount(() => carregarModelosController?.abort())
</script>

<style scoped>
.mb-3 { margin-bottom: 1rem; }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }
.mt-5 { margin-top: 2rem; }

.page-container {
  padding: 30px 20px;
  max-width: 1100px;
  margin: 0 auto;
  min-height: 80vh;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.titulo-flex {
  text-align: center;
  margin-bottom: 3rem;
}

.titulo-flex h1 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #1e293b;
  font-size: 2.2rem;
}

.subtitle {
  color: #64748b;
  margin-top: 0.5rem;
  font-size: 1.1rem;
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 25px;
}

.brand-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 25px 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  aspect-ratio: 1/1;
}

.brand-card:hover {
  border-color: var(--primary, #b1072c);
  transform: translateY(-5px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.brand-logo-wrapper {
  width: 80px;
  height: 80px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-responsive {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.brand-initial {
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #b1072c 0%, #8f0523 100%);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.brand-name {
  font-weight: 600;
  color: #1e293b;
  text-align: center;
}

.card-formulario {
  width: 100%;
  max-width: 500px;
  background: #fff;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  margin: 0 auto;
}

.header-marca {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.mini-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.mini-initial {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary, #b1072c);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.mini-brand-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn-trocar {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  color: #475569;
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  transition: all 0.2s ease;
}

.btn-trocar:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #1e293b;
}

.continuar-button {
  width: 100%;
  padding: 1rem 1.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  background: var(--primary, #b1072c);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--shadow-sm);
}

.continuar-button:hover:not(:disabled) {
  background: var(--primary-hover, #8f0523);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.continuar-button:disabled {
  background: #cbd5e1;
  opacity: 0.6;
  cursor: not-allowed;
}

.slide-in {
  animation: slideInUp 0.3s ease-out forwards;
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Spinner e Estado de Carregamento */
.loading-state {
  text-align: center;
  padding: 4rem 0;
  color: #64748b;
  font-weight: 600;
}

.spinner {
  border: 4px solid rgba(177, 7, 44, 0.15);
  border-left-color: #b1072c;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
@media (max-width: 767px) {
  .page-container { padding: 1.25rem 0; }
  .titulo-flex { margin-bottom: 2rem; }
  .titulo-flex h1 { font-size: 1.6rem; }
  .subtitle { font-size: 1rem; }
  .brand-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
  .brand-card { padding: 1rem 0.5rem; border-radius: 12px; }
  .brand-logo-wrapper { width: 60px; height: 60px; margin-bottom: 0.5rem; }
  .brand-name { font-size: 0.9rem; overflow-wrap: anywhere; }
  .card-formulario { padding: 1.25rem; border-radius: 12px; }
  .header-marca { align-items: flex-start; gap: 0.75rem; }
  .btn-trocar { min-height: 44px; }
  .continuar-button { min-height: 52px; }
}
</style>
