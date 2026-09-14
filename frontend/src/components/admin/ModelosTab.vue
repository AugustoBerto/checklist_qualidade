<template>
  <div class="tab-module">
    <div v-if="erroGlobal" class="alert error"><i class="mdi mdi-alert-circle"></i> {{ erroGlobal }}</div>
    <div v-if="sucessoGlobal" class="alert success"><i class="mdi mdi-check-circle"></i> {{ sucessoGlobal }}</div>

    <!-- Lista de Modelos -->
    <div v-if="modoAtual === 'lista'" class="card card-admin">
      <TableToolbar
        v-model="filtroTexto"
        placeholder="Buscar por nome ou ID do modelo..."
        :has-active-filters="temFiltrosAtivos"
        @clear="limparFiltros"
      >
        <template #filters>
          <div class="filtro-item">
            <select v-model="filtroSetor" class="select-filtro" title="Filtrar por Setor">
              <option value="">Setor: Todos</option>
              <option v-for="s in setoresOptions" :key="s.value" :value="s.value">
                Setor: {{ s.label }}
              </option>
            </select>
          </div>

          <div class="filtro-item">
            <select v-model="filtroMarca" class="select-filtro" title="Filtrar por Marca">
              <option value="">Marca: Todas</option>
              <option v-for="m in marcasOptions" :key="m.value" :value="m.value">
                Marca: {{ m.label }}
              </option>
            </select>
          </div>

          <div class="filtro-item">
            <select v-model="filtroStatus" class="select-filtro" title="Filtrar por Status">
              <option value="todos">Status: Todos</option>
              <option value="ativos">Status: Apenas Ativos</option>
              <option value="inativos">Status: Apenas Inativos</option>
            </select>
          </div>
        </template>
      </TableToolbar>

      <DataTable
        :items="modelosFiltrados"
        :is-loading="isLoadingTabela"
        loading-message="Carregando modelos de checklist..."
        empty-title="Nenhum modelo encontrado"
        :empty-message="temFiltrosAtivos ? 'Nenhum modelo de checklist corresponde aos filtros selecionados.' : 'Clique em \'Novo Modelo\' para cadastrar o primeiro checklist.'"
        empty-icon="mdi mdi-clipboard-text-off-outline"
      >
        <template #header>
          <tr>
            <th class="col-id hide-mobile">ID</th>
            <th>Nome do Modelo</th>
            <th class="hide-mobile">Setor</th>
            <th class="hide-mobile">Marca</th>
            <th>Status</th>
            <th class="col-chevron"></th>
          </tr>
        </template>

        <template #body>
          <tr
            v-for="modelo in modelosFiltrados"
            :key="modelo.id"
            class="clickable-row"
            @click="abrirEdicao(modelo)"
            title="Toque para editar este modelo de checklist"
          >
            <td class="col-id hide-mobile">#{{ modelo.id }}</td>
            <td>
              <div class="model-name-cell">
                <strong>{{ modelo.nome }}</strong>
                <span class="model-sub-meta show-mobile-only">
                  {{ obterNomeSetor(modelo.id_setor_fk) }} · {{ obterNomeMarca(modelo.marca || modelo.nomeMarca) }}
                </span>
              </div>
            </td>
            <td class="hide-mobile">
              <span class="badge-setor"><i class="mdi mdi-office-building"></i> {{ obterNomeSetor(modelo.id_setor_fk) }}</span>
            </td>
            <td class="hide-mobile">{{ obterNomeMarca(modelo.marca || modelo.nomeMarca) }}</td>
            <td>
              <span class="badge" :class="modelo.ativo ? 'badge-ativo' : 'badge-inativo'">
                {{ modelo.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="col-chevron">
              <i class="mdi mdi-chevron-right"></i>
            </td>
          </tr>
        </template>
      </DataTable>
    </div>

    <!-- Formulário de Criação / Edição -->
    <div v-else class="card form-card">
      <div class="form-header-row">
        <div class="form-header-left">
          <h3>{{ form.id ? 'Editar Modelo de Checklist' : 'Criar Novo Modelo de Checklist' }}</h3>
        </div>
      </div>
      
      <form @submit.prevent="salvarChecklist">
        
        <div v-if="!form.id" class="referencia-box">
          <p class="titulo-referencia"><i class="mdi mdi-content-copy"></i> Usar um Modelo Existente como Base (Opcional):</p>
          <div class="form-group-row">
            <div class="form-group w-50">
              <label>Marca de Referência:</label>
              <VueSelect 
                v-model="marcaReferencia" 
                :options="marcasOptions" 
                placeholder="Filtre pela marca primeiro..." 
              />
            </div>
            <div class="form-group w-50">
              <label>Modelo Base (Referência):</label>
              <VueSelect 
                v-model="modeloReferencia" 
                :options="opcoesModelosReferencia" 
                placeholder="Selecione o modelo para clonar..." 
                :disabled="!marcaReferencia"
              />
            </div>
          </div>
          <p class="dica">Selecione um modelo acima para carregar as suas perguntas. Poderá editá-las livremente abaixo antes de guardar.</p>
        </div>

        <div class="form-group-row">
          <div class="form-group w-33">
            <label for="idSetor">Setor Responsável: <span class="obrigatorio">*</span></label>
            <VueSelect 
              v-model="form.idSetor" 
              :options="setoresOptions" 
              placeholder="Selecione o setor" 
            />
          </div>
          <div class="form-group w-33">
            <label for="nomeMarca">Marca do Modelo: <span class="obrigatorio">*</span></label>
            <VueSelect 
              v-model="form.nomeMarca" 
              :options="marcasOptions" 
              placeholder="Selecione a marca" 
            />
          </div>
          <div class="form-group w-33">
            <label for="nomeModelo">Nome do Modelo: <span class="obrigatorio">*</span></label>
            <input type="text" id="nomeModelo" v-model="form.nomeModelo" placeholder="Ex: Auditoria de Costura V2" class="input-base" required>
          </div>
        </div>

        <div class="form-group checkbox-group">
          <input type="checkbox" id="ativo" v-model="form.ativo">
          <label for="ativo"><strong>Modelo Ativo</strong> (Desmarque para inativar e ocultar do tablet dos utilizadores)</label>
        </div>

        <hr class="divisor">
        
        <h2 class="titulo-sessao">Categorias e Perguntas</h2>
        
        <!-- Painel de Adição / Importação de Categorias -->
        <div class="painel-adicionar-categorias">
          <div class="box-importar-catalogo">
            <label><i class="mdi mdi-book-open-page-variant-outline"></i> Importar Categorias Pré-configuradas</label>
            <div class="import-controls">
              <div class="select-wrapper-import">
                <VueSelect
                  v-model="categoriasPadraoSelecionadas"
                  :options="opcoesCategoriasPadrao"
                  placeholder="Selecione uma ou mais categorias do catálogo..."
                  :is-multi="true"
                  :close-on-select="false"
                  :is-clearable="true"
                />
              </div>
              <button
                type="button"
                class="btn-secundario btn-importar"
                :disabled="totalCategoriasSelecionadas === 0"
                @click="importarCategoriaCatalogo"
              >
                <i class="mdi mdi-download"></i>
                <span>{{ textoBotaoImportar }}</span>
              </button>
            </div>
            <ol v-if="categoriasSelecionadasOrdenadas.length" class="categorias-selecionadas-ordem">
              <li v-for="categoria in categoriasSelecionadasOrdenadas" :key="categoria.id">
                {{ categoria.nome }}
              </li>
            </ol>
            <span class="dica-catalogo">Categorias do catálogo já incluem perguntas e parametrização pré-definidas. Você pode selecionar várias para importar de uma vez.</span>
          </div>

          <div class="divisor-ou">
            <span>OU CRIAR UMA NOVA</span>
          </div>

          <div class="box-add-categoria">
            <div class="input-nova-cat-wrapper">
              <input
                type="text"
                v-model.trim="novaCategoria"
                @keypress.enter.prevent="adicionarCategoria"
                class="input-base"
                placeholder="Digite o nome da nova categoria..."
              />
            </div>
            <button type="button" class="btn-secundario" @click="adicionarCategoria">
              <i class="mdi mdi-plus"></i> Adicionar Categoria
            </button>
          </div>
        </div>

        <div class="categorias-container">
          <p v-if="categoriasUI.length === 0" class="item-vazio">Nenhuma categoria adicionada.</p>

          <div v-if="categoriasUI.length > 0" class="categorias-toolbar">
            <span class="categorias-contador-total">
              <i class="mdi mdi-format-list-numbered"></i>
              <strong>{{ categoriasUI.length }}</strong> {{ categoriasUI.length === 1 ? 'categoria' : 'categorias' }} ·
              <strong>{{ totalPerguntasModelo }}</strong> {{ totalPerguntasModelo === 1 ? 'pergunta' : 'perguntas' }}
            </span>
            <div class="categorias-acoes-lote" v-if="categoriasUI.length > 1">
              <button
                type="button"
                class="btn-acao-lote"
                @click="alternarTodasCategorias(true)"
                title="Expandir todas as categorias"
              >
                <i class="mdi mdi-unfold-more-horizontal"></i>
                <span>Expandir Todas</span>
              </button>
              <button
                type="button"
                class="btn-acao-lote"
                @click="alternarTodasCategorias(false)"
                title="Recolher todas as categorias"
              >
                <i class="mdi mdi-unfold-less-horizontal"></i>
                <span>Recolher Todas</span>
              </button>
            </div>
          </div>

          <div
            v-for="(cat, catIndex) in categoriasUI"
            :key="catIndex"
            class="categoria-card"
            :class="{ 'is-collapsed': cat.expandida === false }"
          >
            <div class="categoria-header">
              <div class="categoria-header-left">
                <button
                  type="button"
                  class="btn-toggle-collapse"
                  :title="cat.expandida === false ? 'Expandir perguntas' : 'Recolher perguntas'"
                  @click="cat.expandida = cat.expandida === false ? true : false"
                >
                  <i class="mdi" :class="cat.expandida === false ? 'mdi-chevron-right' : 'mdi-chevron-down'"></i>
                </button>
                <span class="categoria-ordem" :title="`Posição ${catIndex + 1} no checklist`">{{ catIndex + 1 }}</span>
                <input type="text" v-model="cat.nome" class="input-editavel titulo-cat" placeholder="Nome da Categoria">
                <span class="badge-perguntas-count" :title="`${(cat.perguntas || []).length} pergunta(s) cadastrada(s)`">
                  {{ (cat.perguntas || []).length }} {{ (cat.perguntas || []).length === 1 ? 'pergunta' : 'perguntas' }}
                </span>
              </div>

              <div class="categoria-header-actions">
                <button
                  type="button"
                  class="btn-toggle-ctq"
                  :class="{ 'is-ctq': cat.ctq }"
                  :title="cat.ctq ? 'Processo Crítico (CTQ) ativo. Clique para alterar para Normal.' : 'Processo Normal. Clique para marcar como Crítico.'"
                  @click="cat.ctq = !cat.ctq"
                >
                  <i class="mdi" :class="cat.ctq ? 'mdi-alert-decagram' : 'mdi-checkbox-blank-circle-outline'"></i>
                  <span>{{ cat.ctq ? 'CRÍTICO' : 'NORMAL' }}</span>
                </button>

                <button type="button" class="btn-excluir-categoria" @click="removerCategoria(catIndex)" title="Remover esta categoria">
                  <i class="mdi mdi-delete-outline"></i>
                  <span>Remover</span>
                </button>

                <button
                  type="button"
                  class="btn-toggle-texto"
                  :title="cat.expandida === false ? 'Expandir perguntas' : 'Recolher perguntas'"
                  @click="cat.expandida = cat.expandida === false ? true : false"
                >
                  <i class="mdi" :class="cat.expandida === false ? 'mdi-chevron-down' : 'mdi-chevron-up'"></i>
                  <span>{{ cat.expandida === false ? 'Expandir' : 'Recolher' }}</span>
                </button>
              </div>
            </div>
            
            <div v-show="cat.expandida !== false" class="categoria-corpo">
              <ul class="perguntas-lista">
                <li v-for="(pergunta, pIndex) in cat.perguntas" :key="pIndex" class="pergunta-item">
                  <i class="mdi mdi-circle-small bullet"></i>
                  <input type="text" v-model="pergunta.texto" class="input-editavel texto-pergunta" placeholder="Texto da pergunta">
                  <button type="button" class="btn-excluir-item" title="Remover Pergunta" @click="removerPergunta(catIndex, pIndex)">
                    <i class="mdi mdi-close"></i>
                  </button>
                </li>
              </ul>

              <div class="add-pergunta-box">
                <textarea 
                  v-model="cat.novaPergunta" 
                  class="input-base" 
                  rows="2"
                  placeholder="Digite a nova pergunta... (DICA: Pode colar várias perguntas de uma vez, copiadas do Excel)"
                  @keypress.enter.exact.prevent="adicionarPergunta(catIndex)"
                ></textarea>
                <button type="button" class="btn-add-pergunta" @click="adicionarPergunta(catIndex)">Adicionar Pergunta(s)</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="erroForm" class="error-message"><i class="mdi mdi-alert-circle"></i> {{ erroForm }}</div>
        <button
          v-if="conflitoVersao && form.id"
          type="button"
          class="btn-secundario"
          @click="recarregarModeloAtual"
        >
          <i class="mdi mdi-refresh"></i> Recarregar modelo e revisar
        </button>
        
        <button type="submit" class="btn-principal" :disabled="isLoadingForm">
          <span v-if="isLoadingForm"><i class="mdi mdi-loading mdi-spin"></i> A processar...</span>
          <span v-else><i class="mdi mdi-content-save"></i> {{ form.id ? 'Atualizar Checklist Completo' : 'Guardar Novo Checklist' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import VueSelect from 'vue3-select-component';
import api from '../../services/api';
import { toast } from '../../services/feedback';
import { extrairArrayDeDados } from '../../services/formatters';
import TableToolbar from '../TableToolbar.vue';
import DataTable from '../DataTable.vue';
const props = defineProps({
  modo: {
    type: String,
    default: 'lista'
  }
});

const emit = defineEmits(['update:modo', 'catalogo-atualizado']);

const modoAtual = ref(props.modo || 'lista'); 
const marcasOptions = ref([]);

watch(() => props.modo, (novoModo) => {
  if (novoModo && novoModo !== modoAtual.value) {
    modoAtual.value = novoModo;
    if (novoModo === 'lista') {
      carregarModelosTabela();
    }
  }
});

watch(modoAtual, (novoModo) => {
  if (novoModo !== props.modo) {
    emit('update:modo', novoModo);
  }
});
const setoresOptions = ref([]); 
const modelosLista = ref([]);
const erroGlobal = ref('');
const sucessoGlobal = ref('');
const isLoadingTabela = ref(false);

const filtroTexto = ref('');
const filtroSetor = ref('');
const filtroMarca = ref('');
const filtroStatus = ref('todos');

const temFiltrosAtivos = computed(() => {
  return Boolean(
    filtroTexto.value.trim() ||
    filtroSetor.value !== '' ||
    filtroMarca.value !== '' ||
    filtroStatus.value !== 'todos'
  );
});

const limparFiltros = () => {
  filtroTexto.value = '';
  filtroSetor.value = '';
  filtroMarca.value = '';
  filtroStatus.value = 'todos';
};

const modelosFiltrados = computed(() => {
  return modelosLista.value.filter(m => {
    // 1. Filtro textual (Nome ou ID)
    if (filtroTexto.value.trim()) {
      const t = filtroTexto.value.toLowerCase().trim();
      const nome = (m.nome || '').toLowerCase();
      const id = String(m.id);
      if (!nome.includes(t) && !id.includes(t)) {
        return false;
      }
    }

    // 2. Filtro por Setor
    if (filtroSetor.value !== '') {
      if (String(m.id_setor_fk) !== String(filtroSetor.value)) {
        return false;
      }
    }

    // 3. Filtro por Marca
    if (filtroMarca.value !== '') {
      const marcaModelo = String(m.marca || m.nomeMarca || '');
      if (marcaModelo !== String(filtroMarca.value)) {
        return false;
      }
    }

    // 4. Filtro por Status
    if (filtroStatus.value === 'ativos' && !m.ativo) {
      return false;
    }
    if (filtroStatus.value === 'inativos' && m.ativo) {
      return false;
    }

    return true;
  });
});

const form = reactive({
  id: null,
  versao: null,
  nomeModelo: '',
  nomeMarca: null,
  idSetor: null,
  ativo: true
});
const categoriasUI = ref([]);
const novaCategoria = ref('');
const erroForm = ref('');
const isLoadingForm = ref(false);
const conflitoVersao = ref(false);

const categoriasPadrao = ref([]);
const categoriasPadraoSelecionadas = ref([]);
const categoriaPadraoSelecionada = computed({
  get: () => (categoriasPadraoSelecionadas.value.length === 1 ? categoriasPadraoSelecionadas.value[0] : (categoriasPadraoSelecionadas.value[0] ?? null)),
  set: (val) => {
    if (val === null || val === undefined) {
      categoriasPadraoSelecionadas.value = [];
    } else if (Array.isArray(val)) {
      categoriasPadraoSelecionadas.value = val;
    } else {
      categoriasPadraoSelecionadas.value = [val];
    }
  }
});
const totalCategoriasSelecionadas = computed(() =>
  Array.isArray(categoriasPadraoSelecionadas.value)
    ? categoriasPadraoSelecionadas.value.length
    : (categoriasPadraoSelecionadas.value ? 1 : 0)
);
const textoBotaoImportar = computed(() => {
  const total = totalCategoriasSelecionadas.value;
  return total > 1 ? `Importar (${total})` : 'Importar';
});
const categoriasSelecionadasOrdenadas = computed(() => {
  const ids = Array.isArray(categoriasPadraoSelecionadas.value)
    ? categoriasPadraoSelecionadas.value
    : (categoriasPadraoSelecionadas.value ? [categoriasPadraoSelecionadas.value] : []);
  return ids
    .map(id => categoriasPadrao.value.find(categoria => String(categoria.id) === String(id)))
    .filter(Boolean);
});
const opcoesCategoriasPadrao = computed(() =>
  categoriasPadrao.value.map(c => ({
    label: `${c.nome} (${c.ctq ? 'CRÍTICO' : 'NORMAL'} · ${(c.perguntas || []).length} perguntas)`,
    value: c.id
  }))
);

const totalPerguntasModelo = computed(() =>
  categoriasUI.value.reduce((acc, cat) => acc + (cat.perguntas || []).length, 0)
);

const alternarTodasCategorias = (expandir) => {
  categoriasUI.value.forEach(cat => {
    cat.expandida = expandir;
  });
};

const marcaReferencia = ref(null);
const modeloReferencia = ref(null);
const opcoesModelosReferencia = ref([]);

// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================
const carregarDadosIniciais = async () => {
  try {
    const [resMarcas, resSetores, resCategorias] = await Promise.all([
      api.get('/cadastros/marcas'),
      api.get('/cadastros/setores'),
      api.get('/cadastros/categorias-padrao')
    ]);
    
    marcasOptions.value = extrairArrayDeDados(resMarcas.data).map(item => ({ label: item.nome, value: item.id }));
    setoresOptions.value = extrairArrayDeDados(resSetores.data).map(item => ({ label: item.nome, value: item.id }));
    categoriasPadrao.value = extrairArrayDeDados(resCategorias.data);
    
    await carregarModelosTabela();
  } catch (error) {
    erroGlobal.value = 'Erro ao carregar dados iniciais (marcas/setores/categorias).';
    console.error(error);
  }
};

const carregarModelosTabela = async () => {
  isLoadingTabela.value = true;
  try {
    const res = await api.get('/cadastros/modelos');
    modelosLista.value = extrairArrayDeDados(res.data);
  } catch (error) {
    erroGlobal.value = 'Erro ao listar modelos.';
  } finally {
    isLoadingTabela.value = false;
  }
};

onMounted(carregarDadosIniciais);

// ==========================================
// 2. CONTROLO DE ECRÃS E TRADUÇÃO DE IDS
// ==========================================
const obterNomeSetor = (idSetor) => {
  if (!idSetor) return 'Sem Setor';
  const setorEncontrado = setoresOptions.value.find(s => String(s.value) === String(idSetor));
  return setorEncontrado ? setorEncontrado.label : 'ID: ' + idSetor;
};

const obterNomeMarca = (nomeMarca) => {
  if (!nomeMarca) return 'Sem Marca';
  const marcaEncontrada = marcasOptions.value.find(m => String(m.value) === String(nomeMarca));
  return marcaEncontrada ? marcaEncontrada.label : nomeMarca;
};

const abrirCriacao = () => {
  Object.assign(form, { id: null, versao: null, nomeModelo: '', nomeMarca: null, idSetor: null, ativo: true });
  marcaReferencia.value = null;
  modeloReferencia.value = null;
  categoriasPadraoSelecionadas.value = [];
  categoriasUI.value = [];
  novaCategoria.value = '';
  erroForm.value = ''; erroGlobal.value = ''; sucessoGlobal.value = '';
  conflitoVersao.value = false;
  modoAtual.value = 'formulario';
};

const voltarParaLista = () => {
  modoAtual.value = 'lista';
  carregarModelosTabela();
};

const abrirEdicao = async (modelo) => {
  isLoadingTabela.value = true;
  erroGlobal.value = ''; sucessoGlobal.value = '';
  conflitoVersao.value = false;
  categoriasPadraoSelecionadas.value = [];
  
  try {
    const res = await api.get(`/cadastros/modelos/${modelo.id}`);
    
    if (res.data?.sucesso) {
      const dadosModelo = res.data.modelo;
      
      form.id = dadosModelo.id;
      form.versao = dadosModelo.versao ?? null;
      form.nomeModelo = dadosModelo.nomeModelo || dadosModelo.nome;
      form.idSetor = dadosModelo.id_setor || dadosModelo.id_setor_fk || null;
      
      const marcaId = dadosModelo.nomeMarca || dadosModelo.nomeMarca;
      if (marcaId) {
        const encontrada = marcasOptions.value.find(m => String(m.value) === String(marcaId) || String(m.label) === String(marcaId));
        form.nomeMarca = encontrada ? encontrada.value : marcaId;
      } else {
        form.nomeMarca = null;
      }

      form.ativo = ![false, 'false', 0, '0'].includes(dadosModelo.ativo);

      const catsBanco = dadosModelo.categorias || {};
      categoriasUI.value = Object.entries(catsBanco)
        .sort(([, a], [, b]) => (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER))
        .map(([nomeCat, dadosCat]) => ({
        nome: nomeCat,
        ctq: dadosCat.ctq || false,
        salvarNoCatalogo: false,
        expandida: true,
        novaPergunta: '',
        perguntas: dadosCat.perguntas.map(texto => ({ texto }))
      }));

      modoAtual.value = 'formulario';
    }
  } catch (err) {
    erroGlobal.value = 'Erro ao carregar detalhes do modelo para edição.';
  } finally {
    isLoadingTabela.value = false;
  }
};

// ==========================================
// 3. LÓGICA DE CLONAGEM (REFERÊNCIA)
// ==========================================
watch(marcaReferencia, (novoValor) => {
  modeloReferencia.value = null; 
  opcoesModelosReferencia.value = []; 
  
  if (novoValor) {
    const marcaSelecionada = marcasOptions.value.find(m => m.value === novoValor)?.label || novoValor;
    const filtrados = modelosLista.value.filter(m => String(m.marca) === String(marcaSelecionada) || String(m.marca) === String(novoValor));
    
    opcoesModelosReferencia.value = filtrados.map(item => ({ label: item.nome, value: item.id }));
  }
});

watch(modeloReferencia, async (novoValor) => {
  if (!novoValor) return; 
  try {
    const res = await api.get(`/cadastros/modelos/${novoValor}`);
    
    if (res.data?.sucesso) {
      const catsBanco = res.data.modelo.categorias || {};
      
      categoriasUI.value = Object.entries(catsBanco)
        .sort(([, a], [, b]) => (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER))
        .map(([nomeCat, dadosCat]) => ({
        nome: nomeCat, 
        ctq: dadosCat.ctq || false,
        salvarNoCatalogo: false,
        expandida: true,
        novaPergunta: '',
        perguntas: dadosCat.perguntas.map(texto => ({ texto }))
      }));

      if (marcaReferencia.value && !form.nomeMarca) form.nomeMarca = marcaReferencia.value;
      
      const obj = opcoesModelosReferencia.value.find(m => m.value === novoValor);
      if (obj && !form.nomeModelo) form.nomeModelo = `${obj.label} (Cópia)`;
    }
  } catch (error) {
    toast.error("Erro ao buscar as perguntas deste modelo de referência.");
  }
});

// ==========================================
// 4. CONSTRUTOR DE UI (Categorias/Perguntas)
// ==========================================
const importarCategoriaCatalogo = () => {
  const ids = Array.isArray(categoriasPadraoSelecionadas.value)
    ? [...categoriasPadraoSelecionadas.value]
    : (categoriasPadraoSelecionadas.value ? [categoriasPadraoSelecionadas.value] : []);

  if (ids.length === 0) return;

  const adicionadas = [];
  const jaExistentes = [];

  for (const id of ids) {
    const catEncontrada = categoriasPadrao.value.find(c => c.id === id);
    if (!catEncontrada) continue;

    const jaExiste = categoriasUI.value.some(
      c => c.nome.toLowerCase().trim() === catEncontrada.nome.toLowerCase().trim()
    );

    if (jaExiste) {
      jaExistentes.push(catEncontrada.nome);
      continue;
    }

    categoriasUI.value.push({
      nome: catEncontrada.nome,
      ctq: Boolean(catEncontrada.ctq),
      salvarNoCatalogo: false,
      expandida: true,
      novaPergunta: '',
      perguntas: Array.isArray(catEncontrada.perguntas) ? catEncontrada.perguntas.map(texto => ({ texto })) : []
    });
    adicionadas.push(catEncontrada);
  }

  if (adicionadas.length > 0) {
    const totalPerguntas = adicionadas.reduce((acc, c) => acc + (c.perguntas || []).length, 0);
    if (adicionadas.length === 1) {
      toast.success(`Categoria "${adicionadas[0].nome}" importada com sucesso (${totalPerguntas} perguntas).`);
    } else {
      toast.success(`${adicionadas.length} categorias importadas com sucesso (${totalPerguntas} perguntas).`);
    }
  }

  if (jaExistentes.length > 0) {
    if (jaExistentes.length === 1) {
      toast.warning(`A categoria "${jaExistentes[0]}" já foi adicionada a este checklist.`);
    } else {
      toast.warning(`As categorias "${jaExistentes.join('", "')}" já estavam no checklist e foram ignoradas.`);
    }
  }

  categoriasPadraoSelecionadas.value = [];
};
const importarCategoriasCatalogo = importarCategoriaCatalogo;

const adicionarCategoria = () => {
  const nomeLimpo = novaCategoria.value?.trim();
  if (!nomeLimpo) return;

  const jaExisteNoModelo = categoriasUI.value.some(c => c.nome.toLowerCase().trim() === nomeLimpo.toLowerCase());
  if (jaExisteNoModelo) {
    toast.warning(`A categoria "${nomeLimpo}" já foi adicionada a este checklist.`);
    return;
  }

  const catCatalogo = categoriasPadrao.value.find(c => c.nome.toLowerCase().trim() === nomeLimpo.toLowerCase());
  if (catCatalogo) {
    toast.info(`A categoria "${catCatalogo.nome}" já existe no catálogo com ${(catCatalogo.perguntas || []).length} pergunta(s). Ela foi carregada.`);
    categoriasUI.value.push({
      nome: catCatalogo.nome,
      ctq: Boolean(catCatalogo.ctq),
      salvarNoCatalogo: false,
      expandida: true,
      novaPergunta: '',
      perguntas: Array.isArray(catCatalogo.perguntas) ? catCatalogo.perguntas.map(texto => ({ texto })) : []
    });
    novaCategoria.value = '';
    return;
  }

  categoriasUI.value.push({
    nome: nomeLimpo,
    ctq: false,
    salvarNoCatalogo: true,
    expandida: true,
    novaPergunta: '',
    perguntas: []
  });
  toast.success(`Categoria "${nomeLimpo}" adicionada.`);
  novaCategoria.value = '';
};
const removerCategoria = (index) => categoriasUI.value.splice(index, 1);

const adicionarPergunta = (catIndex) => {
  const cat = categoriasUI.value[catIndex];
  if (!cat.novaPergunta.trim()) return;
  cat.expandida = true;
  const linhas = cat.novaPergunta.split('\n');
  linhas.forEach(linha => {
    const textoLimpo = linha.trim();
    if (textoLimpo) cat.perguntas.push({ texto: textoLimpo });
  });
  cat.novaPergunta = '';
};
const removerPergunta = (catIndex, pIndex) => categoriasUI.value[catIndex].perguntas.splice(pIndex, 1);

// ==========================================
// 5. GUARDAR NA BASE DE DADOS (CREATE / UPDATE)
// ==========================================
const salvarChecklist = async () => {
  if (conflitoVersao.value) {
    erroForm.value = 'Recarregue o modelo e revise suas alterações antes de tentar salvar novamente.';
    toast.warning(erroForm.value);
    return;
  }
  erroForm.value = '';

  if (!form.idSetor) { erroForm.value = 'O Setor Responsável é obrigatório.'; return; }
  if (!form.nomeModelo.trim()) { erroForm.value = 'Nome do modelo é obrigatório.'; return; }
  if (!form.nomeMarca) { erroForm.value = 'A marca é obrigatória.'; return; }
  if (categoriasUI.value.length === 0) { erroForm.value = 'Adicione pelo menos uma categoria.'; return; }

  const nomesCategorias = new Set();
  for (const cat of categoriasUI.value) {
    const nomeNormalizado = cat.nome.trim().toUpperCase();
    if (nomeNormalizado && nomesCategorias.has(nomeNormalizado)) {
      erroForm.value = `Existem categorias duplicadas com o nome "${cat.nome.trim()}".`;
      return;
    }
    nomesCategorias.add(nomeNormalizado);
  }

  const payloadCategorias = {};
  categoriasUI.value.forEach((cat, indice) => {
    const nomeLimpo = cat.nome.trim();
    const perguntas = cat.perguntas.map(p => p.texto.trim()).filter(Boolean);
    const perguntasPendentes = String(cat.novaPergunta || '')
      .split('\n')
      .map(texto => texto.trim())
      .filter(Boolean);
    perguntas.push(...perguntasPendentes);
    if (nomeLimpo && perguntas.length > 0) {
      payloadCategorias[nomeLimpo] = {
        ctq: !!cat.ctq,
        ordem: indice + 1,
        ...(cat.salvarNoCatalogo === true ? { salvarNoCatalogo: true } : {}),
        perguntas
      };
    }
  });

  if (Object.keys(payloadCategorias).length === 0) {
    erroForm.value = 'O modelo precisa de ter categorias com perguntas preenchidas.';
    return;
  }

  const payload = {
    nomeModelo: form.nomeModelo,
    nomeMarca: form.nomeMarca,
    id_setor: form.idSetor,
    ativo: form.ativo,
    categorias: payloadCategorias
  };
  if (form.id) payload.versao = form.versao;

  isLoadingForm.value = true;
  try {
    if (form.id) {
      await api.put(`/cadastros/modelos/${form.id}`, payload);
      sucessoGlobal.value = 'Modelo atualizado com sucesso!';
    } else {
      await api.post('/cadastros/modelos', payload);
      sucessoGlobal.value = 'Novo modelo criado com sucesso!';
    }
    emit('catalogo-atualizado');
    voltarParaLista();
    setTimeout(() => { sucessoGlobal.value = ''; }, 3000);
  } catch (err) {
    console.error('Erro ao guardar modelo:', err);
    if (err.response?.status === 409 && err.response?.data?.codigo === 'MODELO_ALTERADO_CONCORRENTEMENTE') {
      conflitoVersao.value = true;
      erroForm.value = 'Este modelo foi alterado por outra pessoa. Recarregue o modelo, revise suas alterações e tente novamente.';
      toast.warning(erroForm.value);
    } else {
      erroForm.value = err.response?.data?.mensagem || 'Erro ao guardar o modelo.';
    }
  } finally {
    isLoadingForm.value = false;
  }
};

const recarregarModeloAtual = () => {
  if (form.id) void abrirEdicao({ id: form.id });
};

defineExpose({
  modoAtual,
  abrirCriacao,
  voltarParaLista
});
</script>

<style scoped>
.tab-module {
  width: 100%;
}

.card-admin, .form-card {
  background: white;
  padding: 1.75rem;
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color, #e2e8f0);
}

.tab-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  flex-wrap: wrap;
  gap: 1rem;
}

.tab-header-info h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.tab-header-info p {
  margin: 0.25rem 0 0 0;
  font-size: 0.88rem;
  color: var(--text-secondary, #64748b);
}

.form-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  gap: 1rem;
  flex-wrap: wrap;
}

.form-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.form-header-left h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.form-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-status-header {
  border: none;
  padding: 0.65rem 1.15rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  min-height: 44px;
}

.model-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-sub-meta {
  font-size: 0.78rem;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
}

.show-mobile-only {
  display: none;
}

.alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: bold; display: flex; align-items: center; gap: 0.5rem;}
.error { background: #fdeaea; color: #e74c3c; border: 1px solid #fadbd8; }
.success { background: #eafaf1; color: #27ae60; border: 1px solid #d5f5e3; }

.select-filtro {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: 8px;
  background-color: #fff;
  color: #334155;
  font-size: 0.9rem;
  min-height: 42px;
  outline: none;
  cursor: pointer;
}

.select-filtro:focus {
  border-color: var(--primary, #b1072c);
}

.filtro-item {
  flex: 1;
  min-width: 160px;
}

.filtros-resumo {
  margin-bottom: 1.25rem;
  font-size: 0.88rem;
  color: var(--text-secondary, #64748b);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:deep(th.col-acoes),
:deep(td.col-acoes) {
  width: 215px;
  min-width: 215px;
}

.acoes-celula { display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;}

.badge { padding: 0.3rem 0.6rem; border-radius: 20px; font-size: 0.8rem; font-weight: bold; color: white; }
.badge-ativo { background: #27ae60; }
.badge-inativo { background: #e74c3c; }

.badge-setor { background: #fff1f2; color: #b1072c; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }

.btn-editar, .btn-status { border: none; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s ease; min-height: 38px; }
.btn-editar { background: #fff1f2; color: var(--primary, #b1072c); border: 1px solid #fecdd3; }
.btn-editar:hover { background: var(--primary, #b1072c); color: #ffffff; }
.btn-inativar { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
.btn-inativar:hover { background: #c2410c; color: #ffffff; }
.btn-reativar { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.btn-reativar:hover { background: #047857; color: #ffffff; }

.titulo-sessao { color: var(--text-primary, #0f172a); font-weight: 700; margin-bottom: 1.5rem; font-size: 1.25rem; margin-top: 2rem;}

.referencia-box { background: #f8fafc; border: 1.5px dashed #cbd5e1; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem; }
.titulo-referencia { font-weight: 700; color: var(--primary, #b1072c); margin-bottom: 1rem; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;}
.dica { font-size: 0.85rem; color: #64748b; margin-top: 0.5rem; font-style: italic; }

.form-group-row { display: flex; gap: 1.5rem; margin-bottom: 1rem;}
.w-50 { flex: 1; }
.w-33 { flex: 1; min-width: 0; }
label { display: block; font-weight: 600; margin-bottom: 0.4rem; color: #34495e; font-size: 0.9rem; }
.obrigatorio { color: #ef4444; }

.input-base { width: 100%; padding: 0.75rem 0.85rem; border: 1.5px solid var(--border-color, #cbd5e1); border-radius: 8px; box-sizing: border-box; font-family: inherit; transition: border-color 0.2s; background-color: #fff; color: #333; }
.input-base:focus { outline: none; border-color: var(--primary, #b1072c); box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.15); }

.checkbox-group { margin-top: 1.5rem; display: flex; align-items: center; gap: 0.5rem; background-color: #fff1f2; padding: 1rem; border-radius: 8px; border: 1px solid #fecdd3; }
.checkbox-group input { width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary, #b1072c); }
.checkbox-group label { margin: 0; cursor: pointer; }

.divisor { border: 0; height: 1px; background: #e2e8f0; margin: 2rem 0; }

.painel-adicionar-categorias {
  background: #f8fafc;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 2rem;
}

.box-importar-catalogo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.box-importar-catalogo label {
  font-weight: 700;
  color: var(--text-primary, #0f172a);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0;
  font-size: 0.95rem;
}

.import-controls {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.select-wrapper-import {
  flex: 1;
  min-width: 250px;
}

.btn-importar {
  min-height: 42px;
  white-space: nowrap;
}

.btn-importar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.categorias-selecionadas-ordem {
  margin: 0.15rem 0 0;
  padding-left: 2rem;
  color: #334155;
  font-size: 0.88rem;
}

.categorias-selecionadas-ordem li { padding: 0.15rem 0; }

.dica-catalogo {
  font-size: 0.82rem;
  color: #64748b;
  font-style: italic;
}

.divisor-ou {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.25rem 0;
}

.divisor-ou::before,
.divisor-ou::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e2e8f0;
}

.divisor-ou span {
  padding: 0 1rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.box-add-categoria {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.input-nova-cat-wrapper {
  flex: 1;
}

.btn-secundario { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.25rem; background-color: var(--primary, #b1072c); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; min-height: 42px; transition: all 0.2s;}
.btn-secundario:hover { background-color: var(--primary-hover, #8f0523); }

.categorias-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f1f5f9;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 1.25rem;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.categorias-contador-total {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  color: #475569;
}

.categorias-contador-total strong {
  color: var(--text-primary, #0f172a);
}

.categorias-acoes-lote {
  display: flex;
  gap: 0.5rem;
}

.btn-acao-lote {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-acao-lote:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #1e293b;
}

.categoria-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: #ffffff;
  box-shadow: var(--shadow-sm);
  transition: padding 0.2s ease, box-shadow 0.2s ease;
}

.categoria-card.is-collapsed {
  padding-bottom: 1rem;
}

.categoria-card.is-collapsed .categoria-header {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.categoria-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 0.85rem; margin-bottom: 1rem; flex-wrap: wrap; }
.categoria-header-left { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 240px; }
.categoria-ordem {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--primary, #b1072c);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 800;
}
.categoria-header-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

.btn-toggle-collapse {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.2s;
}

.btn-toggle-collapse:hover {
  color: var(--primary, #b1072c);
  background: #fff1f2;
}

.badge-perguntas-count {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 0.2rem 0.55rem;
  border-radius: 12px;
  white-space: nowrap;
}

.btn-toggle-texto {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #f8fafc;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  transition: 0.2s;
  min-height: 38px;
}

.btn-toggle-texto:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.btn-excluir-categoria { display: inline-flex; align-items: center; gap: 4px; background-color: #fef2f2; color: #dc2626; border: 1px solid #fecdd3; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: 0.2s; min-height: 38px;}
.btn-excluir-categoria:hover { background-color: #dc2626; color: #ffffff; }

.perguntas-lista { list-style: none; padding-left: 0; margin-bottom: 1.5rem;}
.pergunta-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 8px; border: 1px solid transparent; transition: background 0.2s; }
.pergunta-item:hover { background-color: #f8fafc; border-color: #e2e8f0; }
.bullet { color: #94a3b8; font-size: 1.5rem; }
.btn-excluir-item { background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 1.2rem; padding: 0.4rem; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; min-height: 36px; min-width: 36px; transition: 0.2s; }
.pergunta-item:hover .btn-excluir-item { color: #64748b; }
.btn-excluir-item:hover { color: #dc2626; background: #fef2f2; }

.input-editavel { border: 1px dashed transparent; background: transparent; padding: 0.45rem 0.6rem; font-family: inherit; color: #333; transition: all 0.2s; border-radius: 6px;}
.input-editavel:hover { border-color: #cbd5e1; background: #fff; }
.input-editavel:focus { outline: none; border: 1px solid var(--primary, #b1072c); background: #fff; box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.15);}
.titulo-cat { font-size: 1.15rem; font-weight: 700; color: #1e293b; flex: 1; }
.texto-pergunta { flex: 1; font-size: 0.95rem; }

.add-pergunta-box { display: flex; gap: 0.75rem; align-items: flex-start; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;}
.btn-add-pergunta { padding: 0.65rem 1.2rem; background-color: #ffffff; color: var(--primary, #b1072c); border: 1.5px solid #fecdd3; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; white-space: nowrap; min-height: 42px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;}
.btn-add-pergunta:hover { background-color: #fff1f2; border-color: var(--primary, #b1072c); }

.btn-primary {
  background: var(--primary, #b1072c);
  color: white;
  padding: 0.75rem 1.4rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: 0.2s;
  min-height: 44px;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #8f0523);
}

.btn-outline {
  background: white;
  border: 1.5px solid #cbd5e1;
  color: #475569;
  padding: 0.75rem 1.4rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-outline:hover { background: #f1f5f9; }

.btn-principal { display: inline-flex; justify-content: center; align-items: center; gap: 0.5rem; width: 100%; padding: 1rem 1.5rem; background-color: var(--primary, #b1072c); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1.1rem; font-weight: 700; margin-top: 1.5rem; min-height: 50px; transition: all 0.2s; box-shadow: var(--shadow-sm);}
.btn-principal:hover:not(:disabled) { background-color: var(--primary-hover, #8f0523); box-shadow: var(--shadow-md); transform: translateY(-1px); }
.btn-principal:disabled { background-color: #cbd5e1; cursor: not-allowed; }
.error-message { background: #fef2f2; border-left: 4px solid #ef4444; padding: 1rem; color: #b91c1c; margin: 1rem 0; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; border-radius: 0 8px 8px 0;}

@media (max-width: 768px) {
  .card-admin, .form-card { padding: 1rem; }
  .tab-header-row { flex-direction: column; align-items: stretch; }
  .tab-header-row button { width: 100%; justify-content: center; }
  .form-header-row { flex-direction: column; align-items: stretch; }
  .form-header-row button { width: 100%; justify-content: center; }
  .filtro-item { width: 100%; min-width: 100%; }
  .form-group-row, .box-add-categoria, .categoria-header, .add-pergunta-box { flex-direction: column; }
  .import-controls { flex-direction: column; align-items: stretch; }
  .btn-importar { width: 100%; justify-content: center; }
  .form-group-row { gap: 1rem; }
  .w-50, .w-33 { width: 100%; }
  .checkbox-group { align-items: flex-start; }
  .categoria-header-left { width: 100%; }
  .categoria-header-actions { width: 100%; justify-content: stretch; }
  .btn-toggle-ctq, .btn-excluir-categoria { flex: 1; justify-content: center; }
  .titulo-cat { width: 100%; }
  .btn-secundario, .btn-add-pergunta { justify-content: center; width: 100%; }
  .pergunta-item { align-items: flex-start; }
  .texto-pergunta { min-width: 0; width: 100%; }
  .btn-excluir-item { min-width: 44px; min-height: 44px; }
}
</style>
