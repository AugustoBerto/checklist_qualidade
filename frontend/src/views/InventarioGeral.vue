<template>
  <v-container fluid class="inventory-container pa-6">

    <div v-if="!isLoggedIn" class="text-center w-100 pa-10">
      <v-alert type="error" variant="tonal" class="mb-5">
        ACESSO NEGADO. Você foi redirecionado para a página de login.
      </v-alert>
      <v-progress-circular indeterminate color="red"></v-progress-circular>
      <p class="text-medium-emphasis mt-3">Verificando autenticação...</p>
    </div>

    <div v-else>
      <v-row class="header-inventory align-center mb-4">
        <v-col cols="12" md="8">
          <h1 class="text-h4 font-weight-bold text-grey-darken-3">Inventário Geral</h1>
          <p class="text-subtitle-1 text-medium-emphasis">Gerenciamento completo do ciclo de vida das matrizes.</p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn color="primary" size="large" elevation="2" prepend-icon="mdi-plus-box" @click="goToNewRequest">
            Nova Requisição
          </v-btn>
        </v-col>
      </v-row>

      <v-row dense class="mb-6">
        <v-col cols="12" sm="6" md="4" lg="2">
          <v-card class="pa-4 text-center h-100 kpi-card" elevation="2" border>
            <div class="text-h5 font-weight-black text-grey-darken-3">{{ kpis.totalCadastrado }}</div>
            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Total Geral</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="4" lg="2">
          <v-card class="pa-4 text-center h-100 kpi-card" elevation="2" border
            style="border-bottom: 4px solid #4CAF50 !important;">
            <div class="text-h5 font-weight-black text-green-darken-2">{{ kpis.totalValidas }}</div>
            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Ativas (Ciclo)</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="4" lg="2">
          <v-card class="pa-4 text-center h-100 kpi-card" elevation="2" border>
            <div class="text-h5 font-weight-black text-teal-darken-2">{{ kpis.emEstoque }}</div>
            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Em Estoque</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="4" lg="2">
          <v-card class="pa-4 text-center h-100 kpi-card" elevation="2" border>
            <div class="text-h5 font-weight-black text-blue-darken-2">{{ kpis.emProducao }}</div>
            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Em Produção</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="4" lg="2">
          <v-card class="pa-4 text-center h-100 kpi-card" elevation="2" border
            style="border-bottom: 4px solid #673AB7 !important;">
            <div class="text-h5 font-weight-black text-deep-purple-darken-2">{{ kpis.totalReposicao }}</div>
            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Reposições</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="4" lg="2">
          <v-card class="pa-4 text-center h-100 kpi-card" elevation="2" border
            style="border-bottom: 4px solid #F44336 !important;">
            <div class="text-h5 font-weight-black text-red-darken-2">{{ kpis.totalDescartadas }}</div>
            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Descartadas</div>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="3">
          <v-card class="pa-4 h-100 rounded-lg" elevation="3">
            <div class="d-flex justify-space-between align-center mb-4">
              <h3 class="text-subtitle-1 font-weight-bold d-flex align-center">
                <v-icon icon="mdi-filter-variant" class="mr-2"></v-icon> Filtros Avançados
              </h3>
              <v-btn v-if="hasActiveFilters" variant="text" density="compact" color="error" size="small"
                @click="clearFilters">
                Limpar
              </v-btn>
            </div>

            <div class="filter-group mb-4">
              <v-select v-model="filters.status" :items="statusOptions" item-title="label" item-value="value"
                label="Status" variant="outlined" density="compact" hide-details="auto"
                prepend-inner-icon="mdi-list-status" @update:model-value="applyFilters" color="primary">
              </v-select>
            </div>

            <div class="filter-group mb-4">
              <v-autocomplete v-model="filters.brand" :items="availableBrands" label="Marca" variant="outlined"
                density="compact" hide-details="auto" prepend-inner-icon="mdi-tag-text-outline" clearable
                placeholder="Todas as marcas" @update:model-value="applyFilters" color="primary"
                :loading="loadingFilters">
              </v-autocomplete>
            </div>

            <div class="filter-group mb-4">
              <v-autocomplete v-model="filters.model" :items="availableModels" label="Modelo" variant="outlined"
                density="compact" hide-details="auto" prepend-inner-icon="mdi-shoe-sneaker" clearable
                placeholder="Todos os modelos" @update:model-value="applyFilters" color="primary"
                :loading="loadingFilters" :disabled="!availableModels.length">
              </v-autocomplete>
            </div>

            <v-divider class="mb-4"></v-divider>

            <div class="filter-group">
              <label class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-2 d-block">Itens por
                página</label>
              <v-select v-model="filters.limit" :items="[10, 20, 50, 100, -1]" label="Quantidade" density="compact"
                variant="outlined" @update:model-value="applyFilters" hide-details
                prepend-inner-icon="mdi-format-list-numbered">
              </v-select>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="9">
          <v-card elevation="3" class="rounded-lg">
            <div class="d-flex align-center pa-4 bg-grey-lighten-4 border-b">
              <v-text-field v-model="searchTerm" label="Buscar SKU, Modelo ou Marca..." variant="outlined"
                density="compact" hide-details prepend-inner-icon="mdi-magnify" class="mr-4" style="max-width: 400px;"
                @input="debouncedSearch" clearable @click:clear="clearFilters">
              </v-text-field>

              <v-spacer></v-spacer>

              <v-chip v-if="selectedScreens.length > 0" color="primary" label class="mr-2">
                {{ selectedScreens.length }} SKUs selecionados
              </v-chip>

              <v-btn v-if="selectedScreens.length > 0" @click="reprintSelectedLabels" color="blue-grey-darken-3"
                variant="elevated" prepend-icon="mdi-printer" size="small" :loading="loadingBatchPrint">
                Imprimir Lote
              </v-btn>
            </div>

            <v-data-table v-model="selectedScreens" :headers="tableHeaders" :items="screens" :loading="isLoading"
              :items-per-page="filters.limit" v-model:page="pagination.currentPage" show-select hover
              class="elevation-0">
              <template v-slot:item.sku="{ item }">
                <div class="d-flex align-center cursor-pointer" @click="viewSkuDetails(item)">
                  <v-avatar size="32" color="blue-lighten-5" class="mr-3">
                    <v-icon icon="mdi-barcode" color="blue-darken-2" size="small"></v-icon>
                  </v-avatar>
                  <span class="sku-text">{{ item.sku }}</span>
                </div>
              </template>

              <template v-slot:item.matriz="{ item }">
                <div class="text-body-2 font-weight-medium">{{ item.model || 'N/D' }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.brand || 'N/D' }} • {{ item.part_name || 'N/D' }}
                </div>
              </template>

              <template v-slot:item.quantidade="{ item }">
                <v-chip size="small" color="primary" variant="flat" class="font-weight-bold" v-if="item.quantidade > 0">
                  {{ item.quantidade }} un
                </v-chip>
                <span v-else class="text-grey-lighten-1">-</span>
              </template>

              <template v-slot:item.qtdDescartada="{ item }">
                <v-chip size="small" color="red-lighten-4" text-color="red-darken-4" variant="flat"
                  class="font-weight-bold" v-if="item.qtdDescartada > 0">
                  {{ item.qtdDescartada }} un
                </v-chip>
                <span v-else class="text-grey-lighten-1">-</span>
              </template>

              <template v-slot:no-data>
                <div class="pa-8 text-center text-grey">
                  <v-icon icon="mdi-database-off" size="large" class="mb-2"></v-icon>
                  <p>Nenhum item encontrado com os filtros atuais.</p>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <v-dialog v-model="showSkuModal" max-width="950" scrollable>
      <v-card class="rounded-lg">
        <v-card-title class="d-flex justify-space-between align-center bg-grey-lighten-4 py-3">
          <div class="d-flex align-center">
            <v-icon icon="mdi-barcode" class="mr-2 text-grey-darken-2"></v-icon>
            <span class="text-h6 font-weight-bold text-grey-darken-3">Gerenciamento do SKU: {{ skuModalData.sku
              }}</span>
          </div>
          <v-btn icon="mdi-close" variant="text" density="compact" @click="showSkuModal = false"></v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-6" style="max-height: 70vh;">
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-darken-1">Preview de Impressão (Amostra)</div>

              <div class="zpl-preview-container">
                <div class="zpl-paper">
                  <img v-if="skuModalData.previewUrl" :src="skuModalData.previewUrl" alt="Etiqueta" class="zpl-image" />
                  <div v-else class="d-flex align-center justify-center h-100">
                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  </div>
                </div>
              </div>

              <div class="d-flex justify-center mt-3">
                <v-btn variant="text" size="small" color="blue-grey" prepend-icon="mdi-download" @click="downloadZpl">
                  Baixar arquivo .ZPL (Lote do SKU)
                </v-btn>
              </div>
            </v-col>

            <v-col cols="12" md="6" class="border-s">
              <div class="d-flex justify-space-between align-center mb-3">
                <div class="text-subtitle-2 font-weight-bold text-grey-darken-1">Endereços Físicos Vinculados</div>
                <v-chip color="primary" size="small" class="font-weight-bold">Estoque: {{ skuModalData.quantidade }}
                  un</v-chip>
              </div>

              <v-list density="compact" class="bg-grey-lighten-4 rounded pa-2"
                style="max-height: 350px; overflow-y: auto;">
                <v-list-item v-for="(item, index) in skuModalData.itensIndividuais" :key="index"
                  class="bg-white rounded mb-2 elevation-1 px-3 py-2">
                  <div class="d-flex justify-space-between align-center w-100">
                    <div>
                      <div class="d-flex align-center mb-1">
                        <v-icon icon="mdi-map-marker" size="small" color="blue-grey" class="mr-1"></v-icon>
                        <span class="text-body-2 font-weight-bold">{{ item.location || 'Sem endereço' }}</span>
                      </div>
                      <v-chip size="x-small" :color="getStatusColor(item.status)" label class="mt-1">
                        {{ formatStatus(item.status) }}
                      </v-chip>
                    </div>

                    <div class="d-flex">
                      <v-btn icon="mdi-printer" size="small" variant="text" color="blue-grey" title="Imprimir etiqueta"
                        @click="printSingleLabel(item)"></v-btn>
                      <v-btn icon="mdi-pencil" size="small" variant="text" color="grey-darken-2" title="Editar Local"
                        @click="openEditLocationModal(item)"></v-btn>
                      <v-btn v-if="item.status === 'ARMAZENADO'" icon="mdi-delete-outline" size="small" variant="text"
                        color="error" title="Descartar / Substituir"
                        @click="initSecurityCheck('delete_requisition', item)"></v-btn>
                    </div>
                  </div>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4 bg-grey-lighten-5">
          <v-row no-gutters align="center">
            <v-col cols="12" sm="7" class="pr-sm-4 mb-2 mb-sm-0">
              <v-select v-model="selectedPrinterId" :items="printers" item-title="name" item-value="id"
                label="Selecione a Impressora" variant="outlined" density="compact" prepend-inner-icon="mdi-printer"
                bg-color="white" hide-details :loading="loadingPrinters" placeholder="Buscando impressoras...">
              </v-select>
            </v-col>
            <v-col cols="12" sm="5" class="d-flex justify-end">
              <v-btn color="green-darken-3" variant="elevated" height="40" block :loading="loadingPrint"
                :disabled="!selectedPrinterId" @click="printDirectly">
                <v-icon start>mdi-layers-triple</v-icon> Imprimir Todas do SKU
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showModalEditLocation" max-width="400" persistent>
      <v-card class="pa-4 text-center">
        <v-card-title class="d-flex justify-space-between align-center">
          <h3 class="text-h6">Scanner de Localização</h3>
          <v-btn icon="mdi-close" variant="text" @click="closeEditLocationModal"></v-btn>
        </v-card-title>
        <v-card-text>
          <div class="scan-icon-container">
            <div class="pulse-ring"></div>
            <v-icon size="60" color="primary">mdi-qrcode-scan</v-icon>
          </div>
          <h4 class="text-h6 mb-2 text-primary font-weight-bold">{{ selectedScreenToEdit?.sku }}</h4>
          <p class="text-caption text-medium-emphasis mb-4">Bipe o código do novo local de estoque.</p>
          <input ref="locationScannerInput" v-model="scannerInput" type="text" class="scanner-input-ghost"
            autocomplete="off" @keyup.enter="processLocationScan" @blur="keepFocusScanner">
          <v-alert v-if="scanStatus.message" :type="scanStatus.type === 'success' ? 'success' : 'error'"
            density="compact" variant="tonal">{{ scanStatus.message }}</v-alert>
          <v-alert v-else type="info" density="compact" variant="tonal">Aguardando leitura...</v-alert>
        </v-card-text>
        <v-card-actions class="pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="closeEditLocationModal">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDeleteOptionsModal" max-width="500">
      <v-card>
        <v-card-title class="bg-red text-white">Opções de Descarte</v-card-title>
        <v-card-text class="pt-4">
          <div class="d-flex align-start mb-4">
            <v-icon icon="mdi-alert-octagon" color="red" size="large" class="mr-3 mt-1"></v-icon>
            <div>
              <p class="text-subtitle-1 font-weight-bold">Você está descartando a tela:</p>
              <p class="text-h6 text-grey-darken-3">{{ screenToActOn?.sku }} (Local: {{ screenToActOn?.location || 'S/E'
                }})
              </p>
            </div>
          </div>
          <v-divider class="mb-4"></v-divider>
          <v-checkbox v-model="deleteOptions.generateRequisition" label="Gerar requisição de SUBSTITUIÇÃO automática"
            color="red-darken-3" hide-details density="compact"></v-checkbox>
          <p class="text-caption text-medium-emphasis ml-8 mt-1">
            Se marcado, uma nova solicitação será enviada para a Matrizaria com as mesmas características desta tela.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="showDeleteOptionsModal = false">Cancelar</v-btn>
          <v-btn color="red" variant="elevated" @click="proceedToBadgeCheck">Continuar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ModalConfirmacaoCracha v-model="showBadgeDialog" :required-permission-id="USER_PERM_ID_ADMIN_EXCLUDE"
      :instructions="badgeInstructions" @confirm="handleBadgeConfirmation" />

    <v-snackbar v-model="toast.show" :color="toast.type" location="top right" timeout="3000">{{ toast.message
      }}</v-snackbar>

  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import QRCode from 'qrcode';
import { useAuthStore } from '../stores/auth';
import ModalConfirmacaoCracha from '../components/ModalConfirmacaoCracha.vue';

const apiUrl = import.meta.env.VITE_API_URL;
const router = useRouter();
const authStore = useAuthStore();

const USER_PERM_ID_ADMIN_EXCLUDE = 701;

// --- ESTADOS ---
const screens = ref([]);
const allStockData = ref([]);
const brandsOptions = ref([]);

const isLoading = ref(false);
const loadingFilters = ref(false);

const filters = reactive({ status: 'ALL', limit: 20, brand: null, model: null });
const pagination = reactive({ totalItems: 0, totalPages: 1, currentPage: 1 });

const selectedScreens = ref([]);
const toast = reactive({ show: false, message: '', type: 'success' });
const searchTerm = ref('');

// Modais e Impressão
const showSkuModal = ref(false);
const skuModalData = ref({});
const zplGerado = ref('');
const loadingPrint = ref(false);
const loadingBatchPrint = ref(false);
const printers = ref([]);
const selectedPrinterId = ref(null);
const loadingPrinters = ref(false);

const showModalEditLocation = ref(false);
const selectedScreenToEdit = ref(null);
const scannerInput = ref('');
const scanStatus = reactive({ type: 'info', message: '' });
const locationScannerInput = ref(null);

const showDeleteOptionsModal = ref(false);
const deleteOptions = reactive({ generateRequisition: true });
const showBadgeDialog = ref(false);
const actionToExecute = ref(null);
const screenToActOn = ref(null);
const badgeInstructions = ref('');

const kpis = reactive({ totalCadastrado: 0, totalValidas: 0, emEstoque: 0, emProducao: 0, aguardandoCiclo: 0, totalDescartadas: 0, totalReposicao: 0 });

const availableStatuses = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_ENDERECO', 'ARMAZENADO', 'EM_PRODUCAO', 'EM_MANUTENCAO', 'RECUPERACAO', 'DESCATADA', 'CANCELADO'];
let searchTimeout = null;

// --- COMPUTED ---
const isLoggedIn = computed(() => !!authStore.token);

const tableHeaders = computed(() => [
  { title: 'SKU', key: 'sku', sortable: true, width: '20%' },
  { title: 'Matriz (Modelo / Peça)', key: 'matriz', sortable: false },
  { title: 'Ativas', key: 'quantidade', sortable: true, align: 'center' },
  { title: 'Descartadas', key: 'qtdDescartada', sortable: true, align: 'center' },
]);

const statusOptions = computed(() => {
  const options = availableStatuses.map(s => ({ label: formatStatus(s), value: s }));
  return [{ label: 'Todos', value: 'ALL' }, ...options];
});

const availableBrands = computed(() => brandsOptions.value.map(b => b.name).sort());

const availableModels = computed(() => {
  let source = allStockData.value;
  if (filters.brand) {
    source = source.filter(item => item.brand === filters.brand);
  }
  const models = source.map(item => item.model).filter(Boolean);
  return [...new Set(models)].sort();
});

const hasActiveFilters = computed(() => filters.status !== 'ALL' || filters.brand || filters.model);

// --- MÉTODOS ---
onMounted(() => {
  if (isLoggedIn.value) {
    loadInitialData();
  }
});

const showToast = (m, t) => {
  toast.message = m;
  toast.type = t;
  toast.show = true;
};

const formatStatus = (s) => s ? s.replace(/_/g, ' ') : '';
const formatGrade = (s) => Array.isArray(s) ? s.join('-') : s;

const getStatusColor = (s) => {
  switch (s) {
    case 'AGUARDANDO_APROVACAO': return 'amber-darken-2';
    case 'ARMAZENADO': return 'green-darken-1';
    case 'EM_PRODUCAO': return 'blue-darken-2';
    case 'DESCATADA': return 'red-darken-3';
    default: return 'grey';
  }
};

const loadInitialData = async () => {
  isLoading.value = true;
  await Promise.all([
    fetchBrandsList(),
    fetchFullStockList(),
    fetchKpis(),
    fetchPrinters(),
    fetchScreens() // <-- ADICIONE ESTA LINHA AQUI
  ]);
  isLoading.value = false;
};

const fetchBrandsList = async () => {
  try {
    const res = await axios.get(`${apiUrl}/api/brands`);
    brandsOptions.value = res.data;
  } catch (e) { console.error("Erro marcas:", e); }
};

const fetchFullStockList = async () => {
  loadingFilters.value = true;
  try {
    const res = await axios.get(`${apiUrl}/api/stock`, { params: { limit: 9999 } });
    allStockData.value = res.data.data.map(s => ({
      model: s.model,
      brand: s.brand_name || s.brand || 'N/D'
    }));
  } catch (e) { console.error("Erro lista full:", e); }
  finally { loadingFilters.value = false; }
};

const applyFilters = () => {
  pagination.currentPage = 1;
  fetchScreens();
};

const clearFilters = () => {
  filters.status = 'ALL';
  filters.brand = null;
  filters.model = null;
  searchTerm.value = '';
  applyFilters();
};

// BUSCA E AGRUPAMENTO
const fetchScreens = async () => {
  if (!isLoggedIn.value) return;
  isLoading.value = true;

  let apiLimit = 9999;
  const params = { limit: apiLimit, page: 1 };

  if (filters.status && filters.status !== 'ALL') params.status = filters.status;
  if (filters.brand) params.brand = filters.brand;
  if (filters.model) params.model = filters.model;

  try {
    const response = await axios.get(`${apiUrl}/api/stock`, { params });
    let dadosBrutos = response.data.data;

    if (searchTerm.value) {
      const term = searchTerm.value.toLowerCase();
      dadosBrutos = dadosBrutos.filter(s =>
        (s.sku && s.sku.toLowerCase().includes(term)) ||
        (s.brand && s.brand.toLowerCase().includes(term)) ||
        (s.model && s.model.toLowerCase().includes(term))
      );
    }

    const groupedMap = new Map();
    dadosBrutos.forEach(item => {
      if (!groupedMap.has(item.sku)) {
        groupedMap.set(item.sku, {
          ...item,
          id: item.sku,
          quantidade: 0,          // Quantidade Ativa
          qtdDescartada: 0,       // Quantidade Descartada
          itensIndividuais: [],   // Apenas Ativos para o Modal
          itensDescartados: []    // Histórico de descartes
        });
      }

      const group = groupedMap.get(item.sku);

      if (item.status === 'DESCATADA') { // Note: Verifique se o termo é 'DESCATADA' ou 'DESCARTADA' conforme seu banco
        group.qtdDescartada += 1;
        group.itensDescartados.push(item);
      } else {
        group.quantidade += 1;
        group.itensIndividuais.push(item);
      }
    });

    screens.value = Array.from(groupedMap.values());
    pagination.totalItems = screens.value.length;

  } catch (err) {
    console.error('Erro ao buscar inventário:', err);
    showToast('Erro ao carregar dados.', 'error');
  } finally {
    isLoading.value = false;
  }
};

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { applyFilters(); }, 500);
};

const goToNewRequest = () => { router.push('/gestao_serigrafia/telas/nova'); };

// GERAÇÃO DE ZPL
const generateQRCodeDataUrl = async (text) => {
  try {
    return await QRCode.toDataURL(text, { errorCorrectionLevel: 'H', type: 'image/png', width: 100, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
  } catch (err) { return null; }
};

const drawZplPreview = async (qrCodeDataUrl, item) => {
  const width = 640;
  const height = 240;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';

  const modelo = (item.model || 'N/D').toUpperCase();
  const peca = (item.part_name || 'N/D').toUpperCase();
  const cor = (item.color_ink || 'N/D').toUpperCase();
  let nylon = (item.variation || '').toString().toUpperCase();
  nylon = nylon.replace(/^NY-/, '');
  const grade = formatGrade(item.sizes);
  const data = new Date().toLocaleDateString('pt-BR');

  ctx.font = 'bold 24px Arial'; ctx.fillText(`MOD: ${modelo}`, 20, 40);
  ctx.font = '20px Arial';
  ctx.fillRect(20, 75, 410, 3);
  ctx.fillText(`PECA: ${peca}`, 20, 95);
  ctx.fillText(`TELA: ${cor}`, 20, 130);
  ctx.fillText(`NY: ${nylon}`, 320, 130);
  ctx.fillText(`NUM: ${grade}`, 20, 165);
  ctx.fillText(`DATA: ${data}`, 20, 200);

  if (qrCodeDataUrl) {
    const qrImg = new Image();
    qrImg.src = qrCodeDataUrl;
    await new Promise(r => { qrImg.onload = r; qrImg.onerror = r; });
    ctx.drawImage(qrImg, 460, 30, 150, 150);
  }
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, width, height);
  return canvas.toDataURL('image/png');
};

const gerarZplEtiqueta = (item) => {
  const sku = (item.sku || 'SEM SKU').toUpperCase();
  const modelo = (item.model || '').toUpperCase();
  const peca = (item.part_name || '').toUpperCase();
  const cor = (item.color_ink || '').toUpperCase();
  let nylon = (item.variation || '').toString().toUpperCase();
  nylon = nylon.replace(/^NY-/, '');
  const grade = formatGrade(item.sizes);
  const data = new Date().toLocaleDateString('pt-BR');

  return `^XA\n^PW640\n^LL240\n^MD5\n^PR4\n^FO0,0^GB640,240,4^FS\n^FO20,30^A0N,37,37^FDMOD:^FS\n^FO110,30^A0N,37,37^FD${modelo}^FS\n^FO20,75^GB410,3,3^FS\n^FO20,95^A0N,30,30^FDPECA:^FS\n^FO110,95^A0N,30,30^FD${peca}^FS\n^FO20,130^A0N,30,30^FDTELA:^FS\n^FO110,130^A0N,30,30^FD${cor}^FS\n^FO270,130^A0N,30,30^FDNY:^FS\n^FO310,130^A0N,30,30^FD${nylon}^FS\n^FO20,165^A0N,30,30^FDNUM:^FS\n^FO110,165^A0N,30,30^FD${grade}^FS\n^FO20,200^A0N,30,30^FDDATA:^FS\n^FO110,200^A0N,30,30^FD${data}^FS\n^FO460,30^BQN,2,5,L,7^FDQA,${sku}^FS\n^XZ`;
};

// IMPRESSÃO E AÇÕES DO MODAL SKU
const viewSkuDetails = (grupo) => {
  skuModalData.value = { ...grupo };
  showSkuModal.value = true;

  generateQRCodeDataUrl(grupo.sku).then(u => {
    skuModalData.value.qrCodeDataUrl = u;
    drawZplPreview(u, skuModalData.value).then(p => skuModalData.value.previewUrl = p);
  });

  // Prepara o ZPL para todas as unidades desse SKU
  let loteDoGrupo = '';
  grupo.itensIndividuais.forEach(itemFisico => {
    loteDoGrupo += gerarZplEtiqueta(itemFisico) + '\n';
  });
  zplGerado.value = loteDoGrupo;
};

const downloadZpl = () => {
  if (!zplGerado.value) return;
  const blob = new Blob([zplGerado.value], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ETIQUETA_LOTE_${skuModalData.value.sku}.zpl`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const fetchPrinters = async () => {
  try {
    const r = await axios.get(`${apiUrl}/api/printers`);
    printers.value = r.data.filter(p => p.is_active);
    if (printers.value.length) selectedPrinterId.value = printers.value[0].id;
  } catch (e) { }
};

const printSingleLabel = async (itemFisico) => {
  if (!selectedPrinterId.value) {
    showToast('Selecione uma impressora no rodapé do modal primeiro.', 'error');
    return;
  }
  loadingPrint.value = true;
  try {
    const zplUnico = gerarZplEtiqueta(itemFisico);
    await axios.post(`${apiUrl}/api/printers/send-zpl`, {
      printerId: selectedPrinterId.value,
      zplData: zplUnico
    });
    showToast(`Etiqueta (Local: ${itemFisico.location || 'S/E'}) enviada!`, 'success');
  } catch (e) {
    showToast('Erro ao imprimir etiqueta individual', 'error');
  } finally {
    loadingPrint.value = false;
  }
};

const printDirectly = async () => {
  if (!zplGerado.value || !selectedPrinterId.value) return;
  loadingPrint.value = true;
  try {
    await axios.post(`${apiUrl}/api/printers/send-zpl`, {
      printerId: selectedPrinterId.value,
      zplData: zplGerado.value
    });
    showToast(`Lote do SKU ${skuModalData.value.sku} enviado!`, 'success');
  } catch (e) {
    showToast('Erro na impressão', 'error');
  } finally {
    loadingPrint.value = false;
  }
};

const reprintSelectedLabels = async () => {
  if (!selectedScreens.value.length) return;
  if (!selectedPrinterId.value) {
    showToast('Nenhuma impressora disponível para impressão.', 'error');
    return;
  }

  loadingBatchPrint.value = true;
  let totalImpressas = 0;

  try {
    let zplEmLote = '';

    selectedScreens.value.forEach(selecaoSku => {
      const grupo = typeof selecaoSku === 'object'
        ? selecaoSku
        : screens.value.find(s => s.sku === selecaoSku);

      if (grupo && grupo.itensIndividuais) {
        grupo.itensIndividuais.forEach(itemFisico => {
          zplEmLote += gerarZplEtiqueta(itemFisico) + '\n';
          totalImpressas++;
        });
      }
    });

    if (!zplEmLote.trim()) throw new Error('ZPL vazio');

    await axios.post(`${apiUrl}/api/printers/send-zpl`, {
      printerId: selectedPrinterId.value,
      zplData: zplEmLote
    });

    showToast(`${totalImpressas} etiquetas enviadas com sucesso!`, 'success');
    selectedScreens.value = [];
  } catch (error) {
    console.error('Erro na impressão em lote:', error);
    showToast('Erro ao enviar impressão em lote.', 'error');
  } finally {
    loadingBatchPrint.value = false;
  }
};

const fetchKpis = async () => {
  try {
    const r = await axios.get(`${apiUrl}/api/stock`, { params: { limit: 9999 } });
    const all = r.data.data;
    let tV = 0, eE = 0, eP = 0, aC = 0, tD = 0, tR = 0;
    const aS = ['ARMAZENADO', 'AGUARDANDO_ENDERECO', 'EM_PRODUCAO', 'RECUPERACAO', 'EM_MANUTENCAO'];
    const gS = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_ENDERECO', 'RECUPERACAO', 'EM_MANUTENCAO'];
    all.forEach(i => {
      const s = i.status;
      if (aS.includes(s)) tV++;
      if (s === 'ARMAZENADO') eE++;
      else if (s === 'EM_PRODUCAO') eP++;
      else if (gS.includes(s)) aC++;
      else if (s === 'DESCATADA') tD++;
      tR += (parseInt(i.replacements) || 0);
    });
    kpis.totalCadastrado = all.length;
    kpis.totalValidas = tV;
    kpis.emEstoque = eE;
    kpis.emProducao = eP;
    kpis.aguardandoCiclo = aC;
    kpis.totalDescartadas = tD;
    kpis.totalReposicao = tR;
  } catch (e) { }
};

// GESTÃO DE LOCALIZAÇÃO E EXCLUSÃO
const openEditLocationModal = (itemFisico) => {
  selectedScreenToEdit.value = itemFisico;
  showModalEditLocation.value = true;
  initSecurityCheck('edit_location', itemFisico);
};

const closeEditLocationModal = () => { showModalEditLocation.value = false; };

const keepFocusScanner = () => {
  if (showModalEditLocation.value) {
    setTimeout(() => {
      if (locationScannerInput.value) locationScannerInput.value.focus();
    }, 50);
  }
};

const processLocationScan = async () => {
  const loc = scannerInput.value.trim();
  if (!loc) return;
  try {
    const r = await axios.put(`${apiUrl}/api/stock/location/${screenToActOn.value.id}`, { newLocation: loc });

    // Atualiza o local na lista do modal e recarrega os dados por baixo dos panos
    screenToActOn.value.location = r.data.screen.location;
    fetchScreens();

    showToast('Local atualizado com sucesso!', 'success');
    closeEditLocationModal();
  } catch (e) {
    scanStatus.type = 'error';
    scanStatus.message = 'Erro ao salvar';
  }
};

const initSecurityCheck = (t, itemFisico) => {
  actionToExecute.value = t;
  screenToActOn.value = itemFisico;
  if (t === 'delete_requisition') showDeleteOptionsModal.value = true;
  else showBadgeDialog.value = true;
};

const proceedToBadgeCheck = () => {
  showDeleteOptionsModal.value = false;
  showBadgeDialog.value = true;
};

const handleBadgeConfirmation = (uid) => {
  if (actionToExecute.value === 'delete_requisition') executeDeleteAndRequisition(uid);
  else if (actionToExecute.value === 'edit_location') {
    showModalEditLocation.value = true;
    nextTick(() => keepFocusScanner());
  }
};

const executeDeleteAndRequisition = async (uid) => {
  try {
    const payload = {
      userId: uid,
      generateRequisition: deleteOptions.generateRequisition,
      origin: 'INVENTARIO'
    };

    await axios.delete(`${apiUrl}/api/stock/${screenToActOn.value.id}`, { data: payload });
    showToast('Excluída com sucesso', 'success');

    // Fecha o modal se estiver aberto e recarrega a tabela e KPIs
    showSkuModal.value = false;
    setTimeout(() => {
      fetchScreens();
      fetchKpis();
    }, 300);

  } catch (e) {
    showToast('Erro ao excluir', 'error');
  }
};
</script>

<style scoped>
.pa-6 {
  padding: 24px !important;
}

.inventory-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 16px;
}

.sku-text {
  font-weight: 700;
  font-size: 1rem;
  color: #1976D2;
  cursor: pointer;
}

.kpi-card {
  border-radius: 8px !important;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.scanner-input-ghost {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.scan-icon-container {
  margin: 20px auto;
  position: relative;
  display: inline-block;
}

.zpl-preview-container {
  background-color: #cfd8dc;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  border: 1px solid #b0bec5;
}

.zpl-paper {
  background-color: white;
  padding: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  max-width: 100%;
}

.zpl-image {
  display: block;
  max-width: 100%;
  height: auto;
  border: 1px solid #eee;
}

.border-s {
  border-left: 1px solid #e0e0e0;
}

@media (max-width: 960px) {
  .border-s {
    border-left: none;
    border-top: 1px solid #e0e0e0;
    margin-top: 20px;
    padding-top: 20px;
  }
}
</style>