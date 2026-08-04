<template>
   <v-container fluid class="fill-height align-start bg-grey-lighten-5 pa-4">
    
      <div v-if="!isLoggedIn" class="text-center w-100 pa-10">
           <v-alert type="error" variant="tonal" class="mb-5">
                 ACESSO NEGADO. Você foi redirecionado para a página de login.
           </v-alert>
           <v-progress-circular indeterminate color="red"></v-progress-circular>
           <p class="text-medium-emphasis mt-3">Verificando autenticação...</p>
      </div>

      <v-row v-else class="w-100">
         
         <v-col cols="12" md="5" lg="4">
            <v-card elevation="3" class="rounded-lg">
               
               <v-card-title class="bg-deep-orange-darken-1 text-white py-4 d-flex align-center">
                  <v-icon icon="mdi-factory" class="mr-3"></v-icon>
                  <div>
                     <div class="text-subtitle-1 font-weight-bold">Nova Solicitação Interna</div>
                     <div class="text-caption text-deep-orange-lighten-4">Matrizaria & Gravação</div>
                  </div>
               </v-card-title>
               
               <v-card-text class="pt-6">
                  <div class="d-flex align-center mb-4">
                     <v-avatar color="deep-orange-lighten-5" size="32" class="mr-3">
                        <span class="text-deep-orange-darken-2 font-weight-bold">1</span>
                     </v-avatar>
                     <span class="text-subtitle-2 text-uppercase font-weight-bold text-grey-darken-2">Origem do Pedido</span>
                  </div>

                  <v-row dense>
                     <v-col cols="8">
                        <v-autocomplete
                           v-model="batchInfo.cell_id"
                           :items="celulas"
                           item-title="name"
                           item-value="id"
                           label="Célula Solicitante *"
                           variant="outlined" density="compact"
                           prepend-inner-icon="mdi-map-marker-radius"
                           :rules="[regras.obrigatorio]"
                           :loading="loadingCelulas"
                        ></v-autocomplete>
                     </v-col>
                     <v-col cols="4">
                        <v-select
                           v-model="batchInfo.priority"
                           :items="['NORMAL', 'URGENTE', 'CRÍTICO']"
                           label="Prioridade"
                           variant="outlined" density="compact"
                           :color="getPriorityColor(batchInfo.priority)"
                           class="font-weight-bold"
                        ></v-select>
                     </v-col>
                  </v-row>

                  <v-divider class="my-6 border-opacity-25"></v-divider>

                  <div class="d-flex align-center mb-4">
                     <v-avatar color="blue-lighten-5" size="32" class="mr-3">
                        <span class="text-blue-darken-2 font-weight-bold">2</span>
                     </v-avatar>
                     <span class="text-subtitle-2 text-uppercase font-weight-bold text-grey-darken-2">Configuração Técnica</span>
                  </div>
                  
                  <v-form ref="formItem" v-model="validItem" @submit.prevent="adicionarItem">
                     <v-row dense>
                        <v-col cols="5">
                           <v-autocomplete
                              v-model="currentItem.brand_id"
                              :items="marcas"
                              item-title="name"
                              item-value="id"
                              label="Marca *"
                              variant="outlined" density="compact"
                              :rules="[regras.obrigatorio]"
                              :loading="loadingMarcas"
                           ></v-autocomplete>
                        </v-col>
                        <v-col cols="4">
                           <v-select
                              v-model="currentItem.frame_size"
                              :items="caxilhosDisponiveis"
                              label="Caxilho *"
                              variant="outlined" density="compact"
                              prepend-inner-icon="mdi-aspect-ratio"
                              :rules="[regras.obrigatorio]"
                           ></v-select>
                        </v-col>
                        <v-col cols="3">
                           <v-text-field
                              v-model.number="currentItem.quantity"
                              label="Qtd *"
                              type="number"
                              variant="outlined" density="compact"
                              prepend-inner-icon="mdi-counter"
                              :rules="[regras.minimoUm]"
                           ></v-text-field>
                        </v-col>
                     </v-row>

                     <v-text-field
                        v-model="currentItem.model"
                        label="Modelo do Calçado *"
                        variant="outlined" density="compact"
                        prepend-inner-icon="mdi-shoe-sneaker"
                        @input="toUpperCase('model')"
                        :rules="[regras.obrigatorio]"
                        class="mt-2"
                     ></v-text-field>

                     <v-row dense>
                        <v-col cols="6">
                           <v-text-field v-model="currentItem.part_name" label="Local / Parte *" variant="outlined" density="compact" @input="toUpperCase('part_name')" :rules="[regras.obrigatorio]"></v-text-field>
                        </v-col>
                        <v-col cols="6">
                           <v-text-field 
                              v-model="currentItem.color_ink" 
                              label="Nº Cor / Ref *" 
                              variant="outlined" 
                              density="compact" 
                              prefix="COR."
                              placeholder="Ex: 1 ou UNICA"
                              :rules="[regras.obrigatorio]"
                           ></v-text-field>
                        </v-col>
                     </v-row>

                     <v-row dense>
                        <v-col cols="6">
                           <v-text-field v-model="currentItem.variation" label="Variação / Cód *" variant="outlined" density="compact" @input="toUpperCase('variation')" :rules="[regras.obrigatorio]"></v-text-field>
                        </v-col>
                        <v-col cols="6">
                           <v-text-field v-model.number="currentItem.mesh_count" label="Fios (Nylon) *" type="number" variant="outlined" density="compact" suffix="F" :rules="[regras.obrigatorio]"></v-text-field>
                        </v-col>
                     </v-row>

                     <v-combobox
                        v-model="currentItem.sizes"
                        multiple chips closable-chips label="Grade / Numeração *"
                        variant="outlined" density="compact"
                        placeholder="Digite e dê Enter"
                        :rules="[regras.obrigatorio]"
                     ></v-combobox>

                     <div class="d-flex gap-2 mt-n2 mb-4 overflow-x-auto pb-1">
                        <v-chip size="x-small" label color="grey" @click="addSize('35')">35</v-chip>
                        <v-chip size="x-small" label color="grey" @click="addSize('36')">36</v-chip>
                        <v-chip size="x-small" label color="grey" @click="addSize('37')">37</v-chip>
                        <v-chip size="x-small" label color="grey" @click="addSize('38')">38</v-chip>
                        <v-chip size="x-small" label color="blue" @click="addSize('11X')">11X</v-chip>
                     </div>

                     <v-sheet border rounded class="pa-4 mb-4 bg-blue-grey-lighten-5" elevation="0">
                        <div class="d-flex align-center justify-space-between mb-2">
                           <span class="text-subtitle-2 font-weight-bold text-blue-grey-darken-3">Endereçamento Imediato</span>
                           <v-switch v-model="currentItem.address_now" color="primary" hide-details density="compact" inset></v-switch>
                        </div>

                        <v-expand-transition>
                           <div v-if="currentItem.address_now">
                              <v-row dense>
                                 <v-col cols="7">
                                    <v-combobox
                                       v-model="currentItem.shelf"
                                       :items="['PRAT-01', 'PRAT-02', 'PRAT-03']"
                                       label="Prateleira (Inicial) *"
                                       variant="outlined" density="compact"
                                       bg-color="white" hide-details
                                       @input="toUpperCase('shelf')"
                                    ></v-combobox>
                                 </v-col>
                                 <v-col cols="5">
                                    <v-select
                                       v-model="currentItem.hook_prefix"
                                       :items="[{title:'Gancho A', value:'A'}, {title:'Gancho B', value:'B'}]"
                                       label="Lado *"
                                       variant="outlined" density="compact"
                                       bg-color="white" hide-details
                                    ></v-select>
                                 </v-col>
                              </v-row>
                              <div class="text-caption text-grey-darken-1 mt-2">
                                 * O sistema preencherá os ganchos sequencialmente (Ex: A01, A02, A03) baseado na quantidade.
                              </div>
                           </div>
                        </v-expand-transition>
                     </v-sheet>

                     <v-btn block color="blue-darken-2" size="large" variant="elevated" prepend-icon="mdi-plus-circle" type="submit" :disabled="!validItem">
                        Adicionar Matriz(es) à Lista
                     </v-btn>
                  </v-form>
               </v-card-text>
            </v-card>
         </v-col>

         <v-col cols="12" md="7" lg="8">
            <v-card elevation="2" class="rounded-lg h-100 d-flex flex-column border">
               <v-card-title class="d-flex justify-space-between align-center py-4 bg-grey-lighten-4">
                  <span class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                     <v-icon icon="mdi-playlist-check" start color="green-darken-1"></v-icon>
                     Resumo da Solicitação
                  </span>
                  
                  <div class="d-flex align-center gap-2">
                     <v-btn
                        color="green-darken-2"
                        prepend-icon="mdi-file-excel"
                        size="small"
                        variant="elevated"
                        :loading="loadingImport"
                        @click="$refs.fileInput.click()"
                     >
                        Importar Planilha
                        <input
                           type="file"
                           ref="fileInput"
                           class="d-none"
                           accept=".xlsx, .xls"
                           @change="handleExcelImport"
                        />
                     </v-btn>

                     <v-chip color="green-darken-1" variant="elevated" class="font-weight-bold">
                        {{ totalTelasFisicas }} Telas Físicas
                     </v-chip>
                  </div>
               </v-card-title>
               
               <v-table density="default" class="flex-grow-1" hover fixed-header>
                  <thead>
                     <tr>
                        <th class="text-center bg-grey-lighten-5" width="60">#</th>
                        <th class="text-center bg-grey-lighten-5" width="80">Qtd</th>
                        <th class="text-left bg-grey-lighten-5">SKU / Identificação</th>
                        <th class="text-left bg-grey-lighten-5">Fluxo de Destino</th>
                        <th class="text-end bg-grey-lighten-5">Ações</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr v-for="(item, index) in listaItens" :key="index">
                        <td class="text-center text-caption text-grey">
                           {{ index + 1 }}
                        </td>
                        <td class="text-center">
                           <v-chip size="small" color="blue-grey-darken-3" class="font-weight-bold" variant="flat">
                              {{ item.quantity }}
                           </v-chip>
                        </td>
                        <td class="py-3">
                           <div class="font-weight-bold text-subtitle-2 text-primary">
                              {{ item.brand_name || getMarcaName(item.brand_id) }} {{ item.model }}
                           </div>
                           <div class="text-caption text-grey-darken-2">
                              {{ item.part_name }} • {{ formatColorDisplay(item.color_ink) }} • {{ item.variation }}
                           </div>
                           <div class="d-flex flex-wrap gap-1 mt-1">
                              <span v-for="size in item.sizes" :key="size" class="text-caption font-weight-bold bg-grey-lighten-3 px-2 py-0 rounded border">
                                 {{ size }}
                              </span>
                           </div>
                        </td>
                        <td>
                           <div v-if="item.location" class="d-flex flex-column">
                              <v-chip color="blue-darken-2" size="small" prepend-icon="mdi-map-marker-lock" label class="font-weight-bold">
                                 {{ item.location }} <span class="text-xs ml-1 opacity-70" v-if="item.quantity > 1">(+ seq)</span>
                              </v-chip>
                              <span class="text-caption text-blue-grey mt-1">
                                 <v-icon size="x-small" start>mdi-file-excel</v-icon>Endereço Fixo
                              </span>
                           </div>

                           <div v-else-if="item.address_now" class="d-flex flex-column">
                              <v-chip color="purple-darken-2" size="small" prepend-icon="mdi-auto-fix" label class="font-weight-bold">
                                 AUTO-ALOCAÇÃO
                              </v-chip>
                              <span class="text-caption text-purple-grey mt-1">
                                 <v-icon size="x-small" start>mdi-robot</v-icon>Sistema definirá local
                              </span>
                           </div>

                           <v-chip v-else size="small" variant="outlined" color="grey" prepend-icon="mdi-tray-full">
                              Aguardando Vistoria
                           </v-chip>
                        </td>
                        <td class="text-end">
                           <v-btn icon="mdi-delete" size="small" color="grey" variant="text" @click="removerItem(index)"></v-btn>
                        </td>
                     </tr>
                     <tr v-if="listaItens.length === 0">
                        <td colspan="5" class="text-center text-grey py-16">
                           <v-icon icon="mdi-basket-outline" size="64" color="grey-lighten-2" class="mb-3"></v-icon>
                           <div class="text-h6 text-grey-lighten-1">A lista está vazia</div>
                           <div class="text-caption">Configure a matriz ou importe uma planilha</div>
                        </td>
                     </tr>
                  </tbody>
               </v-table>

               <v-divider></v-divider>

               <v-card-actions class="pa-4 bg-grey-lighten-5 d-flex justify-end align-center">
                  <v-btn variant="text" color="error" class="mr-2" @click="limparTudo" :disabled="listaItens.length === 0">
                     Cancelar
                  </v-btn>
                  
                  <v-btn color="success" size="x-large" variant="elevated" prepend-icon="mdi-check-all" elevation="4"
                     :disabled="listaItens.length === 0" :loading="loadingSalvar" @click="openConfirmationModal" width="250"
                  >
                     Confirmar Pedido
                  </v-btn>
               </v-card-actions>
            </v-card>
         </v-col>
      </v-row>
      
      <ModalConfirmacaoCracha
         v-model="showBadgeDialog"
         :required-permission-id="USER_PERM_ID_CONFIRM"
         instructions="Bipe seu crachá para confirmar a geração das matrizes e endereços."
         @confirm="handleBadgeConfirmation"
      />

      <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" timeout="5000">
            <div class="d-flex align-center">
                  <v-icon :icon="snackbar.icon" start class="mr-2"></v-icon>
                  {{ snackbar.text }}
            </div>
      </v-snackbar>
   </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../services/api'; 
import { useAuthStore } from '../stores/auth'; 
import ModalConfirmacaoCracha from '../components/ModalConfirmacaoCracha.vue'; 
import * as XLSX from 'xlsx';

const authStore = useAuthStore();

// =========================================================================
// ESTADO DO COMPONENTE
// =========================================================================
const formItem = ref(null);
const validItem = ref(false);
const loadingSalvar = ref(false);
const loadingImport = ref(false);
const loadingMarcas = ref(false);
const loadingCelulas = ref(false);

const celulas = ref([]); 
const marcas = ref([]);   
const caxilhosDisponiveis = ['50x94', '60x80', '15x40', '70x100']; 

const snackbar = ref({ show: false, text: '', color: 'success', icon: 'mdi-check' });

const regras = { 
      obrigatorio: v => !!v || 'Campo obrigatório',
      minimoUm: v => v > 0 || 'Mín. 1'
};

const batchInfo = ref({ 
      cell_id: null, 
      priority: 'NORMAL' 
});

const listaItens = ref([]);

const currentItem = ref({
      brand_id: null,
      frame_size: '50x94',
      model: '',
      part_name: '',
      color_ink: '', 
      variation: 'NY',
      mesh_count: null,
      quantity: 1,
      sizes: [],
      address_now: false,
      shelf: 'PRAT-01',
      hook_prefix: 'A'
});

const showBadgeDialog = ref(false);
const USER_PERM_ID_CONFIRM = 600; 

// =========================================================================
// LÓGICA COMPUTADA
// =========================================================================
const isLoggedIn = computed(() => !!authStore.token);

const totalTelasFisicas = computed(() => {
    return listaItens.value.reduce((acc, item) => acc + parseInt(item.quantity || 0), 0);
});

const formatColorDisplay = (color) => {
   if (!color) return '';
   const val = color.toString().toUpperCase();
   if (val === 'UNICA' || val.startsWith('COR.')) return val;
   return isNaN(val) ? val : `COR.${val}`;
};

const getPriorityColor = (prio) => {
      if(prio === 'URGENTE') return 'deep-orange';
      if(prio === 'CRÍTICO') return 'red-darken-3';
      return 'blue-grey';
};

// =========================================================================
// MÉTODOS DE IMPORTAÇÃO (EXCEL)
// =========================================================================
const handleExcelImport = async (event) => {
   const file = event.target.files[0];
   if (!file) return;

   if (!batchInfo.value.cell_id) {
       mostrarMsg('Selecione a Célula Solicitante antes de importar.', 'error');
       event.target.value = null;
       return;
   }

   loadingImport.value = true;
   const reader = new FileReader();

   reader.onload = (e) => {
       try {
           const data = new Uint8Array(e.target.result);
           const workbook = XLSX.read(data, { type: 'array' });
           
           let itemsFromExcel = [];
           let hasMissingNumbers = false;

           workbook.SheetNames.forEach(sheetName => {
               const worksheet = workbook.Sheets[sheetName];
               const jsonData = XLSX.utils.sheet_to_json(worksheet);
               
               jsonData.forEach(row => {
                   const brandLabel = row.MARCA?.toString().replace(/_/g, ' ') || '';
                   const foundBrand = marcas.value.find(m => m.name.toUpperCase() === brandLabel.toUpperCase());
                   
                   const qtd = parseInt(row.QTD || row.QUANTIDADE || row.QUANT || row.Q || 1);
                   const temEnderecoFixo = row.PRATELEIRA && row.GANCHO;

                   const isGab = /GABARITO/i.test((row.COR || '') + ' ' + (row.PEÇA || ''));
                   const sizeStr = row.NUMERAÇÃO?.toString() || '';
                   const colorStr = row.COR?.toString() || row.TELA?.toString() || '';
                   
                   // Validação para emitir alerta se faltar número (ignorando gabaritos)
                   if (!isGab) {
                       const sizeMatch = sizeStr.match(/\d+/);
                       const colorMatch = colorStr.match(/\d+/);
                       if (!sizeMatch || !colorMatch) {
                           hasMissingNumbers = true;
                       }
                   }

                   itemsFromExcel.push({
                       generated_sku: row.SKU,
                       brand_id: foundBrand?.id || null,
                       brand_name: brandLabel, 
                       model: row.MODELO?.toString().toUpperCase(),
                       part_name: row.PEÇA?.toString().toUpperCase(),
                       color_ink: colorStr,
                       sizes: sizeStr ? sizeStr.split(',').map(s => s.trim()) : [],
                       frame_size: row.CAXILHO?.toString(),
                       variation: row.NYLON?.toString().toUpperCase(),
                       mesh_count: parseInt(row.MESH) || 0,
                       quantity: qtd,
                       shelf: temEnderecoFixo ? row.PRATELEIRA.toString().toUpperCase() : null,
                       hook_prefix: temEnderecoFixo ? row.GANCHO.toString().toUpperCase() : null,
                       location: temEnderecoFixo ? `${row.PRATELEIRA}-${row.GANCHO}` : null,
                       address_now: true, 
                       is_auto_allocation: !temEnderecoFixo 
                   });
               });
           });

           // --- LÓGICA DE ORDENAÇÃO CUSTOMIZADA ---
           // --- LÓGICA DE ORDENAÇÃO CUSTOMIZADA ---
           // --- LÓGICA DE ORDENAÇÃO CUSTOMIZADA ---
           itemsFromExcel.sort((a, b) => {
               // 1. Agrupa por Modelo primeiro
               const modelA = (a.model || '').toUpperCase();
               const modelB = (b.model || '').toUpperCase();
               if (modelA !== modelB) return modelA.localeCompare(modelB);

               // 2. Agrupa por Local/Parte (Isso garante que Lingueta fique com Lingueta e Traseiro com Traseiro)
               const partA = (a.part_name || '').toUpperCase();
               const partB = (b.part_name || '').toUpperCase();
               if (partA !== partB) return partA.localeCompare(partB);

               // 3. GABARITO tem prioridade absoluta DENTRO da mesma peça/local
               const isGabA = /GABARITO/i.test((a.color_ink || '') + ' ' + (a.part_name || ''));
               const isGabB = /GABARITO/i.test((b.color_ink || '') + ' ' + (b.part_name || ''));
               if (isGabA && !isGabB) return -1;
               if (!isGabA && isGabB) return 1;

               // Função auxiliar para extrair o primeiro número
               const extractFirstNumber = (str) => {
                   const match = str ? String(str).match(/\d+/) : null;
                   return match ? parseInt(match[0], 10) : null; 
               };

               // 4. Tamanhos Maiores para Menores (Ordem Decrescente)
               const sizeA = a.sizes.length > 0 ? extractFirstNumber(a.sizes[0]) : 0;
               const sizeB = b.sizes.length > 0 ? extractFirstNumber(b.sizes[0]) : 0;
               if (sizeA !== sizeB) {
                   return (sizeB || 0) - (sizeA || 0);
               }

               // 5. Cores Menores para Maiores (Ordem Crescente)
               const colorA = extractFirstNumber(a.color_ink) || 9999;
               const colorB = extractFirstNumber(b.color_ink) || 9999;
               return colorA - colorB;
           });
           // ----------------------------------------
           // ----------------------------------------

           listaItens.value = [...listaItens.value, ...itemsFromExcel];
           
           if (hasMissingNumbers) {
               mostrarMsg(`Importado. AVISO: Algumas linhas não possuem número claro no tamanho ou cor e foram enviadas para o final da lista.`, 'warning');
           } else {
               mostrarMsg(`${itemsFromExcel.length} linhas carregadas e organizadas (Total de ${totalTelasFisicas.value} telas).`);
           }

       } catch (err) {
           console.error(err);
           mostrarMsg('Erro ao ler arquivo Excel.', 'error');
       } finally {
           loadingImport.value = false;
           event.target.value = null;
       }
   };
   reader.readAsArrayBuffer(file);
};

// =========================================================================
// MÉTODOS DE FORMULÁRIO
// =========================================================================
const adicionarItem = async () => {
   const { valid } = await formItem.value.validate();
   if (!valid) return;
   
   if (currentItem.value.sizes.length === 0) {
          mostrarMsg('Adicione pelo menos um tamanho à grade.', 'error');
          return;
   }

   const clone = JSON.parse(JSON.stringify(currentItem.value));
   
   if (clone.address_now && clone.shelf) {
       clone.location = `${clone.shelf}-${clone.hook_prefix}`;
   }
   
   listaItens.value.push(clone);

   currentItem.value.part_name = '';
   currentItem.value.color_ink = '';
   currentItem.value.sizes = [];
   currentItem.value.quantity = 1; 
   formItem.value.resetValidation();
};

const addSize = (val) => {
      if(!currentItem.value.sizes.includes(val)) currentItem.value.sizes.push(val);
};

const toUpperCase = (field) => {
      if(currentItem.value[field]) currentItem.value[field] = currentItem.value[field].toUpperCase();
};

const getMarcaName = (id) => {
   const m = marcas.value.find(m => m.id === id);
   return m ? m.name : 'MARCA';
};

const removerItem = (index) => {
      listaItens.value.splice(index, 1);
};

const limparTudo = () => {
      listaItens.value = [];
      batchInfo.value.cell_id = null;
      batchInfo.value.priority = 'NORMAL';
};

// =========================================================================
// MÉTODOS DE FLUXO (API)
// =========================================================================
const openConfirmationModal = () => {
   if (!batchInfo.value.cell_id) {
         mostrarMsg('Selecione a Célula Solicitante no topo.', 'error');
         return;
   }
   showBadgeDialog.value = true;
};

const handleBadgeConfirmation = async (userId) => {
      await executeFinalizarLote(userId);
};

const executeFinalizarLote = async (auditorId) => {
   loadingSalvar.value = true;
   try {
       const payload = {
           batch_info: batchInfo.value,
           items: listaItens.value,
           userId: auditorId
       };
       
       await api.post('/screens/batch', payload);
       mostrarMsg(`Solicitação enviada com sucesso!`, 'success');
       setTimeout(() => { limparTudo(); }, 1500);
       
   } catch (error) {
       const msg = error.response?.data?.error || 'Erro ao enviar solicitação.';
       mostrarMsg(msg, 'error');
   } finally {
       loadingSalvar.value = false;
   }
};

const carregarDadosIniciais = async () => {
   if (!isLoggedIn.value) return; 
   loadingMarcas.value = loadingCelulas.value = true;
   try {
      const [resMarcas, resCelulas] = await Promise.all([
         api.get('/brands'),
         api.get('/production-cells')
      ]);
      marcas.value = resMarcas.data;
      celulas.value = resCelulas.data;
   } catch (error) {
      mostrarMsg('Erro ao carregar dados do servidor.', 'error');
   } finally {
      loadingMarcas.value = loadingCelulas.value = false;
   }
};

const mostrarMsg = (text, type = 'success') => {
      let color = 'green-darken-2';
      let icon = 'mdi-check-circle';

      if (type === 'error') {
          color = 'red-darken-2';
          icon = 'mdi-alert-circle';
      } else if (type === 'warning') {
          color = 'orange-darken-3';
          icon = 'mdi-alert';
      }

      snackbar.value = {
            show: true, 
            text,
            color,
            icon
      };
};

onMounted(() => carregarDadosIniciais());
</script>

<style scoped>
.gap-2 { gap: 8px; }
.gap-1 { gap: 4px; }
.v-table th {
   text-transform: uppercase;
   font-size: 0.75rem;
   letter-spacing: 0.5px;
}
</style>