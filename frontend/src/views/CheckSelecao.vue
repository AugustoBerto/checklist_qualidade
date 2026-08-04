<template>
  <div class="page-container">
    <div class="titulo-flex">
      <h1>
        <i class="mdi" :class="marcaSelecionada ? 'mdi-format-list-bulleted-type' : 'mdi-domain'"></i>
        {{ marcaSelecionada ? 'Selecione o Modelo' : 'Selecione a Marca' }}
      </h1>
      <p class="subtitle" v-if="!marcaSelecionada">Escolha a marca para iniciar o preenchimento da auditoria.</p>
    </div>

    <div v-if="!marcaSelecionada" class="brand-grid-container">
      <div v-if="isLoadingMarcas" class="loading-state">
        <div class="spinner"></div> 
        <p>Carregando as configurações...</p>
      </div>
      <div v-else class="brand-grid">
        <div v-for="marca in marcas" :key="marca.id" class="brand-card" @click="selecionarMarca(marca)">
          <div class="brand-logo-wrapper">
            <img v-show="!errosImagens[marca.id]" :src="`/logos/${tratarNomeImagem(marca.nome)}.png`" :alt="marca.nome"
              class="img-responsive" @error="marcarErroImagem(marca.id)">

            <span v-show="errosImagens[marca.id]" class="brand-initial">
              {{ marca.nome ? marca.nome.charAt(0) : '?' }}
            </span>
          </div>

          <span class="brand-name">{{ marca.nome || 'Sem Nome' }}</span>
        </div>
      </div>
    </div>

    <div v-else class="form-container slide-in">
      <div class="card-formulario">
        <div class="header-marca">
          <div class="mini-brand-info">
            <img v-if="!errosImagens[marcaSelecionada.id]"
              :src="`/logos/${tratarNomeImagem(marcaSelecionada.nome)}.png`" class="mini-logo"
              @error="marcarErroImagem(marcaSelecionada.id)">
            <span v-else class="mini-initial">
              {{ marcaSelecionada?.nome ? marcaSelecionada.nome.charAt(0) : '?' }}
            </span>

            <span><strong>{{ marcaSelecionada.nome }}</strong></span>
          </div>
          <button v-if="podeTrocarMarca" type="button" class="btn-trocar" @click="resetarSelecao">
            <i class="mdi mdi-swap-horizontal"></i> Trocar Marca
          </button>
        </div>

        <form @submit.prevent="irParaFormulario">
          
          <div class="form-group mb-3" v-if="isInspetor">
            <label for="setor">Setor da Inspeção:</label>
            <div class="select-wrapper">
              <VueSelect v-model="form.setor_selecionado" :options="opcoesSetores"
                placeholder="Selecione o setor..." />
            </div>
          </div>

          <div class="form-group mt-3">
            <label for="modelo">Modelos disponíveis:</label>
            <div class="select-wrapper">
              <VueSelect v-model="form.modelo" :options="opcoesModelos" placeholder="Selecione o modelo..." :disabled="!form.setor_selecionado && isInspetor" />
            </div>
          </div>

          <div class="form-group mt-4" v-if="isInspetor">
            <label for="celula">Célula da Inspeção:</label>
            <div class="select-wrapper">
              <VueSelect v-model="form.celula_selecionada" :options="opcoesCelulas"
                placeholder="Selecione a linha/célula..." :disabled="!form.setor_selecionado" />
            </div>
          </div>

          <div class="form-actions mt-5">
            <button type="submit" class="continuar-button" :disabled="isBotaoDesabilitado">
              Continuar <i class="mdi mdi-arrow-right"></i>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import VueSelect from 'vue3-select-component'
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

// Estados
const marcas = ref([])
const opcoesSetores = ref([])
const opcoesModelos = ref([])
const opcoesCelulas = ref([])
const listaCelulasGlobal = ref([]) // Guarda todas as células para filtrar no front
const marcaSelecionada = ref(null)
const errosImagens = ref({})
const isLoadingMarcas = ref(true)

// Formulário atualizado com o campo setor
const form = ref({ setor_selecionado: '', modelo: '', celula_selecionada: '' })

// Usuário e Permissões
const usuarioString = localStorage.getItem('usuario') || '{}'
const usuario = ref(JSON.parse(usuarioString))

const isAdmin = computed(() => usuario.value.permissao === 'admin' || usuario.value.admin === true || Number(usuario.value.nivelusuario) === -1)
const isLider = computed(() => Number(usuario.value.nivelusuario) === 1)
const isInspetor = computed(() => Number(usuario.value.nivelusuario) === 2)

const podeTrocarMarca = computed(() => isAdmin.value || isInspetor.value || marcas.value.length > 1)

const isBotaoDesabilitado = computed(() => {
  if (isInspetor.value && !form.value.setor_selecionado) return true;
  if (!form.value.modelo) return true;
  if (isInspetor.value && !form.value.celula_selecionada) return true;
  return false;
})

onMounted(async () => {
  try {
    isLoadingMarcas.value = true;
    
    // Adicionado chamada para Setores (Presumindo endpoint padrão da sua API)
    const [resMarcas, resCelulas, resSetores] = await Promise.all([
      api.get('/cadastros/marcas'),
      api.get('/cadastros/celulas'),
      api.get('/cadastros/setores').catch(() => ({ data: [] })) // Fallback se endpoint falhar
    ]);

    // Extração segura
    let listaMarcas = resMarcas.data?.sucesso ? (resMarcas.data.dados || resMarcas.data.marcas || []) : (resMarcas.data || []);
    listaCelulasGlobal.value = resCelulas.data?.celulas || resCelulas.data?.dados || resCelulas.data || [];
    
    const listaSetores = resSetores.data?.setores || resSetores.data?.dados || resSetores.data || [];
    opcoesSetores.value = listaSetores.map(s => ({ label: s.nome, value: s.id }));

    // 1. LÓGICA DO INSPETOR: Configurar setor inicial
    if (isInspetor.value && usuario.value.id_setor_fk) {
       form.value.setor_selecionado = usuario.value.id_setor_fk; // Autopreencher com o setor dele
       filtrarCelulasPorSetor(usuario.value.id_setor_fk);
    } else if (!isAdmin.value) {
       // Se não for admin nem inspetor, filtra as células pelo setor dele fixo
       filtrarCelulasPorSetor(usuario.value.id_setor_fk);
    } else {
       // Admin vê todas
       opcoesCelulas.value = listaCelulasGlobal.value.map(c => ({ label: c.nome, value: c.id }));
    }

    // 2. FILTRO RESTRITO PARA O LÍDER
    if (isLider.value && usuario.value.id_celula_fk) {
        const minhaCelula = listaCelulasGlobal.value.find(c => String(c.id) === String(usuario.value.id_celula_fk));
        if (minhaCelula && minhaCelula.id_marca_fk) {
            const marcasRestritas = listaMarcas.filter(m => String(m.id) === String(minhaCelula.id_marca_fk));
            if (marcasRestritas.length > 0) {
                marcas.value = marcasRestritas;
                if (marcasRestritas.length === 1) selecionarMarca(marcasRestritas[0]);
                return; 
            }
        }
    }

    marcas.value = listaMarcas;

  } catch (error) {
    console.error('Erro na carga inicial:', error);
  } finally {
    isLoadingMarcas.value = false;
  }
})

// === NOVO: Observar mudança de Setor (Inspetor) ===
watch(() => form.value.setor_selecionado, async (novoSetorId) => {
  if (isInspetor.value) {
    form.value.celula_selecionada = ''; // Limpa a célula anterior
    form.value.modelo = ''; // Limpa o modelo anterior
    
    if (novoSetorId) {
      filtrarCelulasPorSetor(novoSetorId);
      // Se a marca já estiver selecionada, recarrega os modelos pro novo setor
      if (marcaSelecionada.value) {
        await carregarModelos(marcaSelecionada.value, novoSetorId);
      }
    } else {
      opcoesCelulas.value = [];
      opcoesModelos.value = [];
    }
  }
})

function filtrarCelulasPorSetor(idSetor) {
  if (!idSetor) return;
  const filtradas = listaCelulasGlobal.value.filter(c => String(c.id_setor_fk) === String(idSetor));
  opcoesCelulas.value = filtradas.map(c => ({ label: c.nome, value: c.id }));
}

async function carregarModelos(marca, setorId) {
  try {
    const queryParams = { marca_id: marca.id };

    // Filtra pelo setor selecionado (seja Inspetor trocando ou setor fixo)
    if (setorId && !isAdmin.value) {
        queryParams.setor_id = setorId;
    }

    const response = await api.get('/dados/modelos', { params: queryParams });
    const listaModelos = response.data?.dados || response.data?.modelos || response.data || [];
    opcoesModelos.value = listaModelos.map(item => ({ label: item.nome, value: item.id }));

  } catch (error) {
    console.error("Erro ao carregar modelos:", error);
    alert('Erro ao carregar modelos.');
  }
}

async function selecionarMarca(marca) {
  marcaSelecionada.value = marca;
  
  let setorParaBusca = null;
  if (isInspetor.value) {
    setorParaBusca = form.value.setor_selecionado;
  } else if (usuario.value.id_setor_fk && !isAdmin.value) {
    setorParaBusca = usuario.value.id_setor_fk;
  }

  await carregarModelos(marca, setorParaBusca);
}

function irParaFormulario() {
  if (isBotaoDesabilitado.value) return;

  const query = {
    // 📌 CACHE BUSTING: Impede que WebViews do Android travem o layout ou cacheiem dados velhos
    cb: new Date().getTime() 
  };
  
  if (isInspetor.value) {
    query.celula = form.value.celula_selecionada;
    query.setor = form.value.setor_selecionado; // Passa o setor na URL também
  } else if (isLider.value) {
    query.celula = usuario.value.id_celula_fk;
  }
  
  if (query.celula) localStorage.setItem('celula_auditada_atual', query.celula);

  router.push({ path: `/formulario/${form.value.modelo}`, query: query });
}

// Funções Auxiliares
function tratarNomeImagem(nome) {
  if (!nome) return 'sem-nome';
  return nome.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function marcarErroImagem(id) { 
  errosImagens.value[id] = true; 
}

function resetarSelecao() { 
  marcaSelecionada.value = null; 
  opcoesModelos.value = []; 
  form.value.modelo = ''; 
  // Não reseto o setor para não irritar o inspetor tendo que escolher de novo
  form.value.celula_selecionada = ''; 
}
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
  border-color: #2563eb;
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
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
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
  background: #2563eb;
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
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #64748b;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.continuar-button {
  width: 100%;
  padding: 1.2rem;
  font-size: 1.15rem;
  font-weight: 700;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.3s;
}

.continuar-button:disabled {
  background: #cbd5e1;
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
  border: 4px solid rgba(37, 99, 235, 0.1);
  border-left-color: #2563eb;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>