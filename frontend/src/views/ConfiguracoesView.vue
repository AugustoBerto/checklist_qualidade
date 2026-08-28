<template>
  <div class="page-container">
    <PageHeader
      title="Painel Gerencial"
      subtitle="Gerencie as estruturas fundamentais, cadastros de base, usuários e modelos de checklist."
      icon="mdi mdi-cog-outline"
    >
      <template #actions>
        <button
          v-if="modoAbaAtual === 'lista'"
          @click="executarAcaoCriacaoAba"
          class="btn-primary"
          :title="`Adicionar ${rotuloBotaoNovo}`"
        >
          <i class="mdi mdi-plus"></i>
          <span>{{ rotuloBotaoNovo }}</span>
        </button>
        <button
          v-else
          @click="voltarAbaParaLista"
          class="btn-outline"
          title="Voltar para a listagem"
        >
          <i class="mdi mdi-arrow-left"></i>
          <span>Voltar para Lista</span>
        </button>
      </template>
    </PageHeader>

    <!-- Navegação por Abas (Desktop) -->
    <div class="tabs-container desktop-tabs">
      <button 
        v-for="aba in abas" 
        :key="aba.id" 
        @click="mudarAba(aba.id)" 
        class="tab-btn" 
        :class="{ active: abaAtiva === aba.id }"
      >
        <i :class="aba.icone"></i>
        <span>{{ aba.titulo }}</span>
      </button>
    </div>

    <!-- Seletor de Abas em Dropdown (Mobile) -->
    <div class="tabs-mobile-dropdown">
      <label class="tabs-mobile-label">
        <i class="mdi mdi-layers-outline"></i>
        <span>Seção Ativa:</span>
      </label>
      <div class="tabs-select-wrapper">
        <i :class="abaInfo?.icone || 'mdi mdi-cog-outline'" class="select-active-icon"></i>
        <select :value="abaAtiva" @change="mudarAba($event.target.value)" class="tabs-select-input">
          <option v-for="aba in abas" :key="aba.id" :value="aba.id">
            {{ aba.titulo }}
          </option>
        </select>
        <i class="mdi mdi-chevron-down select-chevron"></i>
      </div>
    </div>

    <!-- Módulo de Modelos de Checklist -->
    <ModelosTab
      v-if="abaAtiva === 'modelos'"
      ref="modelosTabRef"
      v-model:modo="modoModelos"
    />

    <!-- Módulo de Usuários & Perfis -->
    <UsuariosTab
      v-else-if="abaAtiva === 'usuarios'"
      ref="usuariosTabRef"
      v-model:modo="modoUsuarios"
    />

    <!-- Módulos de Cadastros de Base -->
    <div v-else class="card">
      <TableToolbar
        v-model="termoBusca"
        :placeholder="`Buscar em ${nomeAbaAtiva.toLowerCase()}...`"
        :has-active-filters="temFiltrosBaseAtivos"
        @clear="limparFiltrosBase"
      >
        <template v-if="abaAtiva === 'celulas'" #filters>
          <div class="filtro-item">
            <select v-model="filtroBaseSetor" class="filter-select" title="Filtrar por Setor">
              <option value="">Setor: Todos</option>
              <option v-for="s in dados.setores" :key="s.id" :value="s.id">
                Setor: {{ s.nome }}
              </option>
            </select>
          </div>
          <div class="filtro-item">
            <select v-model="filtroBaseMarca" class="filter-select" title="Filtrar por Marca">
              <option value="">Marca: Todas</option>
              <option v-for="m in dados.marcas" :key="m.id" :value="m.id">
                Marca: {{ m.nome }}
              </option>
            </select>
          </div>
        </template>

        <template v-else-if="abaAtiva === 'categorias'" #filters>
          <div class="filtro-item">
            <select v-model="filtroBaseTipo" class="filter-select" title="Filtrar por Processo">
              <option value="todos">Processo: Todos</option>
              <option value="ctq">Processo: Apenas CTQ</option>
              <option value="padrao">Processo: Apenas Padrão</option>
            </select>
          </div>
        </template>
      </TableToolbar>

      <DataTable
        :items="dadosFiltrados"
        :is-loading="isLoading"
        :loading-message="`Carregando ${nomeAbaAtiva.toLowerCase()}...`"
        empty-title="Nenhum registro encontrado"
        :empty-message="termoBusca ? `Não encontramos registros em ${nomeAbaAtiva.toLowerCase()} para '${termoBusca}'.` : `Não existem registros cadastrados para ${nomeAbaAtiva}.`"
        empty-icon="mdi mdi-database-off-outline"
      >
        <template #header>
          <tr>
            <th class="col-id hide-mobile">ID</th>
            <th>Nome / Descrição</th>
            <th v-if="abaAtiva === 'marcas'">Logo</th>
            
            <th v-if="abaAtiva === 'categorias'">Tipo / Processo</th>
            <th v-if="abaAtiva === 'categorias'" class="hide-mobile">Perguntas</th>

            <th v-if="abaAtiva === 'celulas'">Setor Vinculado</th>
            <th v-if="abaAtiva === 'celulas'" class="hide-mobile">Marca Vinculada</th>

            <th v-if="abaAtiva === 'turnos'">Horário Entrada</th>
            <th v-if="abaAtiva === 'turnos'" class="hide-mobile">Horário Após Intervalo</th>
            
            <th class="col-chevron"></th>
          </tr>
        </template>

        <template #body>
          <tr
            v-for="item in dadosFiltrados"
            :key="item.id || item.id_setor || item.id_unidade || item.id_celula || item.id_marca || item.id_turno"
            class="clickable-row"
            @click="abrirModal(item)"
            title="Toque para editar este registro"
          >
            <td class="col-id hide-mobile">#{{ item.id || item.id_setor || item.id_unidade || item.id_marca || item.id_celula || item.id_turno }}</td>
            <td>
              <div class="entity-name-cell">
                <strong>{{ item.nome || item.descricao }}</strong>
                <span v-if="abaAtiva === 'celulas' && item.nome_marca" class="entity-sub-meta show-mobile-only">
                  Marca: {{ item.nome_marca }}
                </span>
                <span v-if="abaAtiva === 'categorias'" class="entity-sub-meta show-mobile-only">
                  {{ (item.perguntas && Array.isArray(item.perguntas)) ? item.perguntas.length : 0 }} perguntas
                </span>
              </div>
            </td>
            <td v-if="abaAtiva === 'marcas'">
              <img v-if="urlLogoMarca(item)" :src="urlLogoMarca(item)" :alt="item.nome" class="marca-logo-mini" />
              <span v-else class="text-muted">Sem logo</span>
            </td>
            
            <td v-if="abaAtiva === 'categorias'">
              <span class="badge" :class="item.ctq ? 'badge-ctq-critico' : 'badge-ctq-normal'">
                <i class="mdi" :class="item.ctq ? 'mdi-alert-decagram' : 'mdi-checkbox-blank-circle-outline'"></i>
                {{ item.ctq ? 'CRÍTICO' : 'NORMAL' }}
              </span>
            </td>
            <td v-if="abaAtiva === 'categorias'" class="hide-mobile">
              <span class="badge badge-perguntas-count">
                <i class="mdi mdi-help-circle-outline"></i>
                {{ (item.perguntas && Array.isArray(item.perguntas)) ? item.perguntas.length : 0 }} perguntas
              </span>
            </td>

            <td v-if="abaAtiva === 'celulas'">
              <span class="badge badge-setor"><i class="mdi mdi-office-building"></i> {{ item.nome_setor || 'N/A' }}</span>
            </td>
            <td v-if="abaAtiva === 'celulas'" class="hide-mobile">
              <span class="badge badge-marca"><i class="mdi mdi-tag"></i> {{ item.nome_marca || 'N/A' }}</span>
            </td>

            <td v-if="abaAtiva === 'turnos'" class="time-col">
              <i class="mdi mdi-login text-muted"></i> {{ formatarHora(item.entrada_inicio) }} às {{ formatarHora(item.entrada_fim) }}
            </td>
            <td v-if="abaAtiva === 'turnos'" class="time-col hide-mobile">
              <i class="mdi mdi-coffee text-muted"></i> {{ formatarHora(item.intervalo_inicio) }} às {{ formatarHora(item.intervalo_fim) }}
            </td>

            <td class="col-chevron">
              <i class="mdi mdi-chevron-right"></i>
            </td>
          </tr>
        </template>
      </DataTable>
    </div>

    <!-- Modal de Criação / Edição -->
    <BaseModal
      v-model="showModal"
      :title="`${form.id ? 'Editar' : 'Novo'} Registro - ${nomeAbaAtiva}`"
      :icon="abaInfo?.icone || 'mdi mdi-cogs'"
      max-width="580px"
    >
      <form @submit.prevent="salvarItem" id="formConfig">
        <div class="form-group">
          <label>Nome / Descrição <span class="obrigatorio">*</span></label>
          <input type="text" v-model="form.nome" required class="input-base" :placeholder="'Ex: ' + placeholderExemplo" />
        </div>

        <div v-if="abaAtiva === 'marcas'" class="form-group">
          <label>Logo da marca</label>
          <div class="logo-upload">
            <img v-if="form.logoPreview" :src="form.logoPreview" alt="Pré-visualização da logo" class="logo-preview" />
            <div v-else class="logo-placeholder"><i class="mdi mdi-image-outline"></i><span>Sem logo</span></div>
            <div class="logo-actions">
              <label class="btn-outline logo-file-label">
                <i class="mdi mdi-upload"></i> Selecionar imagem
                <input type="file" accept="image/png,image/jpeg,image/webp" @change="selecionarLogo" />
              </label>
              <button v-if="form.logoPreview" type="button" class="btn-outline" @click="removerLogo">Remover</button>
              <small>PNG, JPEG ou WebP, até 512 KB.</small>
            </div>
          </div>
        </div>

        <div v-if="abaAtiva === 'categorias'" class="categoria-config-container">
          <div class="form-group mb-3">
            <label>Tipo de Processo</label>
            <button
              type="button"
              class="btn-toggle-ctq"
              :class="{ 'is-ctq': form.ctq }"
              :title="form.ctq ? 'Processo Crítico (CTQ) ativo. Clique para alterar para Normal.' : 'Processo Normal. Clique para marcar como Crítico.'"
              @click="form.ctq = !form.ctq"
            >
              <i class="mdi" :class="form.ctq ? 'mdi-alert-decagram' : 'mdi-checkbox-blank-circle-outline'"></i>
              <span>{{ form.ctq ? 'CRÍTICO' : 'NORMAL' }}</span>
            </button>
          </div>

          <div class="form-group">
            <label>Perguntas Pré-configuradas</label>
            <div class="perguntas-manager-box">
              <div v-if="form.perguntas.length === 0" class="sem-perguntas-aviso">
                <i class="mdi mdi-information-outline"></i> Nenhuma pergunta cadastrada para esta categoria.
              </div>
              
              <ul v-else class="modal-perguntas-lista">
                <li v-for="(p, pIndex) in form.perguntas" :key="pIndex" class="modal-pergunta-item">
                  <span class="pergunta-num">{{ pIndex + 1 }}.</span>
                  <input type="text" v-model="form.perguntas[pIndex]" class="input-pergunta-modal" />
                  <button type="button" @click="removerPerguntaModal(pIndex)" class="btn-remover-pergunta" title="Remover pergunta">
                    <i class="mdi mdi-close"></i>
                  </button>
                </li>
              </ul>

              <div class="add-pergunta-modal-box">
                <textarea
                  v-model="form.novaPerguntaInput"
                  class="input-base"
                  rows="2"
                  placeholder="Digite nova(s) pergunta(s)... (pode colar várias do Excel)"
                  @keypress.enter.exact.prevent="adicionarPerguntaModal"
                ></textarea>
                <button type="button" class="btn-add-p-modal" @click="adicionarPerguntaModal">
                  <i class="mdi mdi-plus"></i> Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="abaAtiva === 'celulas'" class="form-group-row">
          <div class="form-group w-50">
            <label>Setor Vinculado <span class="obrigatorio">*</span></label>
            <VueSelect
              v-model="form.id_setor_fk"
              :options="opcoesSetores"
              placeholder="Selecione o setor..."
              :is-clearable="false"
            />
          </div>
          <div class="form-group w-50">
            <label>Marca Vinculada (Opcional)</label>
            <VueSelect
              v-model="form.id_marca_fk"
              :options="opcoesMarcas"
              placeholder="Selecione a marca..."
              :is-clearable="true"
            />
          </div>
        </div>

        <div v-if="abaAtiva === 'turnos'" class="time-grid-container">
          <div class="time-row">
            <div class="form-group">
              <label><i class="mdi mdi-clock-start"></i> Entrada (Início)</label>
              <input type="time" v-model="form.entrada_inicio" required class="input-base" />
            </div>
            <div class="form-group">
              <label><i class="mdi mdi-clock-end"></i> Entrada (Fim)</label>
              <input type="time" v-model="form.entrada_fim" required class="input-base" />
            </div>
          </div>

          <div class="time-row separator">
            <div class="form-group">
              <label><i class="mdi mdi-coffee"></i> Intervalo (Início)</label>
              <input type="time" v-model="form.intervalo_inicio" required class="input-base" />
            </div>
            <div class="form-group">
              <label><i class="mdi mdi-coffee-off"></i> Intervalo (Fim)</label>
              <input type="time" v-model="form.intervalo_fim" required class="input-base" />
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <div class="modal-footer-content">
          <button
            v-if="form.id"
            type="button"
            @click="excluirItem(form.id)"
            class="btn-danger-outline"
            :disabled="salvando"
            title="Excluir este registro"
          >
            <i class="mdi mdi-trash-can-outline"></i>
            <span>Excluir</span>
          </button>
          
          <div class="modal-footer-right">
            <button type="button" @click="fecharModal" class="btn-outline">Cancelar</button>
            <button type="submit" form="formConfig" class="btn-primary" :disabled="salvando">
              <i class="mdi" :class="salvando ? 'mdi-loading mdi-spin' : 'mdi-content-save'"></i>
              <span>{{ salvando ? 'Salvando...' : 'Salvar' }}</span>
            </button>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import VueSelect from 'vue3-select-component';
import api from '../services/api';
import PageHeader from '../components/PageHeader.vue';
import BaseModal from '../components/BaseModal.vue';
import TableToolbar from '../components/TableToolbar.vue';
import DataTable from '../components/DataTable.vue';
import ModelosTab from '../components/admin/ModelosTab.vue';
import UsuariosTab from '../components/admin/UsuariosTab.vue';
import { formatarHora, urlLogoMarca } from '../services/formatters';
import { toast, dialog } from '../services/feedback';

const route = useRoute();
const router = useRouter();

const abas = [
  { id: 'modelos', titulo: 'Modelos de Checklist', icone: 'mdi mdi-clipboard-text-outline', tipo: 'custom' },
  { id: 'categorias', titulo: 'Categorias', icone: 'mdi mdi-shape-outline', endpoint: '/cadastros/categorias-padrao', ex: 'Costura Lateral' },
  { id: 'marcas', titulo: 'Marcas', icone: 'mdi mdi-tag-multiple', endpoint: '/cadastros/marcas', ex: 'Umbro / Fila' },
  { id: 'unidades', titulo: 'Unidades', icone: 'mdi mdi-domain', endpoint: '/cadastros/unidades', ex: 'Matriz Itapipoca' },
  { id: 'setores', titulo: 'Setores', icone: 'mdi mdi-office-building', endpoint: '/cadastros/setores', ex: 'Corte / Costura' },
  { id: 'celulas', titulo: 'Células', icone: 'mdi mdi-factory', endpoint: '/cadastros/celulas', ex: 'Célula 01' },
  { id: 'turnos', titulo: 'Turnos', icone: 'mdi mdi-clock-outline', endpoint: '/cadastros/turnos', ex: '1º Turno' },
  { id: 'usuarios', titulo: 'Usuários & Perfis', icone: 'mdi mdi-account-cog-outline', tipo: 'custom' }
];

const abaAtiva = ref(route.query.aba && abas.some(a => a.id === route.query.aba) ? String(route.query.aba) : 'modelos');

watch(() => route.query.aba, (novaAba) => {
  if (novaAba && abas.some(a => a.id === novaAba) && novaAba !== abaAtiva.value) {
    cancelarBuscaDados();
    abaAtiva.value = String(novaAba);
    modoModelos.value = 'lista';
    modoUsuarios.value = 'lista';
    fecharModal();
    if (abaInfo.value?.tipo !== 'custom') {
      buscarDados();
    }
  }
});

const isLoading = ref(true);
const salvando = ref(false);
const showModal = ref(false);
const termoBusca = ref('');
const filtroBaseSetor = ref('');
const filtroBaseMarca = ref('');
const filtroBaseTipo = ref('todos');

const temFiltrosBaseAtivos = computed(() => {
  return Boolean(
    termoBusca.value.trim() ||
    (abaAtiva.value === 'celulas' && (filtroBaseSetor.value || filtroBaseMarca.value)) ||
    (abaAtiva.value === 'categorias' && filtroBaseTipo.value !== 'todos')
  );
});

const limparFiltrosBase = () => {
  termoBusca.value = '';
  filtroBaseSetor.value = '';
  filtroBaseMarca.value = '';
  filtroBaseTipo.value = 'todos';
};

const dados = reactive({
  unidades: [],
  setores: [],
  celulas: [],
  marcas: [],
  categorias: [],
  turnos: []
});

const form = reactive({
  id: null,
  nome: '',
  ativo: true,
  ctq: false,
  perguntas: [],
  novaPerguntaInput: '',
  id_setor_fk: '',
  id_marca_fk: '',
  entrada_inicio: '',
  entrada_fim: '',
  intervalo_inicio: '',
  intervalo_fim: '',
  logo: undefined,
  logoPreview: ''
});

const opcoesSetores = computed(() => (dados.setores || []).map(s => ({ label: s.nome, value: s.id })));
const opcoesMarcas = computed(() => (dados.marcas || []).map(m => ({ label: m.nome, value: m.id })));

const dadosAtuais = computed(() => {
  const lista = dados[abaAtiva.value] || [];
  return lista.filter(item => item.ativo !== 0 && item.ativo !== false);
});

const dadosFiltrados = computed(() => {
  let lista = dadosAtuais.value;

  // Filtros contextuais
  if (abaAtiva.value === 'celulas') {
    if (filtroBaseSetor.value) {
      lista = lista.filter(item => String(item.id_setor_fk) === String(filtroBaseSetor.value));
    }
    if (filtroBaseMarca.value) {
      lista = lista.filter(item => String(item.id_marca_fk) === String(filtroBaseMarca.value));
    }
  } else if (abaAtiva.value === 'categorias') {
    if (filtroBaseTipo.value === 'ctq') {
      lista = lista.filter(item => Boolean(item.ctq));
    } else if (filtroBaseTipo.value === 'padrao') {
      lista = lista.filter(item => !item.ctq);
    }
  }

  // Filtro textual
  if (!termoBusca.value.trim()) return lista;
  const t = termoBusca.value.toLowerCase().trim();
  return lista.filter(item => {
    const nome = (item.nome || item.descricao || '').toLowerCase();
    const setor = (item.nome_setor || '').toLowerCase();
    const marca = (item.nome_marca || '').toLowerCase();
    const id = String(item.id || item.id_setor || item.id_unidade || item.id_marca || item.id_celula || item.id_turno);
    return nome.includes(t) || setor.includes(t) || marca.includes(t) || id.includes(t);
  });
});

const abaInfo = computed(() => abas.find(a => a.id === abaAtiva.value));
const nomeAbaAtiva = computed(() => abaInfo.value?.titulo || '');
const placeholderExemplo = computed(() => abaInfo.value?.ex || '');
const endpointAtivo = computed(() => abaInfo.value?.endpoint || '');

const extrairArrayDeDados = (respostaData) => {
  if (Array.isArray(respostaData)) return respostaData;
  if (respostaData.dados && Array.isArray(respostaData.dados)) return respostaData.dados;
  if (respostaData.rows && Array.isArray(respostaData.rows)) return respostaData.rows;
  const possivelArray = Object.values(respostaData).find(val => Array.isArray(val));
  return possivelArray || [];
};

let buscarDadosController = null;

const cancelarBuscaDados = () => {
  buscarDadosController?.abort();
  buscarDadosController = null;
  isLoading.value = false;
};

const buscarDados = async (forcarRefresh = false) => {
  if (abaInfo.value?.tipo === 'custom') {
    cancelarBuscaDados();
    return;
  }
  const abaSolicitada = abaAtiva.value;
  const endpointSolicitado = endpointAtivo.value;
  if (!endpointSolicitado || (!forcarRefresh && dados[abaSolicitada]?.length > 0)) {
    cancelarBuscaDados();
    return;
  }

  cancelarBuscaDados();
  const controller = new AbortController();
  buscarDadosController = controller;

  isLoading.value = true;
  try {
    const res = await api.get(endpointSolicitado, { signal: controller.signal });
    if (controller.signal.aborted || buscarDadosController !== controller) return;
    dados[abaSolicitada] = extrairArrayDeDados(res.data);
  } catch (err) {
    if (!controller.signal.aborted && err?.code !== 'ERR_CANCELED') {
      console.error(`Erro ao carregar ${abaSolicitada}:`, err);
    }
  } finally {
    if (buscarDadosController === controller) isLoading.value = false;
  }
};

const carregarDependenciasCelulas = async () => {
  try {
    if (dados.setores.length === 0) {
      const res = await api.get('/cadastros/setores');
      dados.setores = extrairArrayDeDados(res.data);
    }
    if (dados.marcas.length === 0) {
      const res = await api.get('/cadastros/marcas');
      dados.marcas = extrairArrayDeDados(res.data);
    }
  } catch (err) {
    console.error('Erro ao carregar dependências para células:', err);
  }
};

const modelosTabRef = ref(null);
const usuariosTabRef = ref(null);
const modoModelos = ref('lista');
const modoUsuarios = ref('lista');

const modoAbaAtual = computed(() => {
  if (abaAtiva.value === 'modelos') return modoModelos.value;
  if (abaAtiva.value === 'usuarios') return modoUsuarios.value;
  return 'lista';
});

const rotuloBotaoNovo = computed(() => {
  switch (abaAtiva.value) {
    case 'modelos': return 'Novo Modelo';
    case 'usuarios': return 'Novo Perfil';
    case 'unidades': return 'Nova Unidade';
    case 'setores': return 'Novo Setor';
    case 'celulas': return 'Nova Célula';
    case 'marcas': return 'Nova Marca';
    case 'categorias': return 'Nova Categoria';
    case 'turnos': return 'Novo Turno';
    default: return 'Novo Registro';
  }
});

const executarAcaoCriacaoAba = () => {
  if (abaAtiva.value === 'modelos') {
    modelosTabRef.value?.abrirCriacao();
    modoModelos.value = 'formulario';
  } else if (abaAtiva.value === 'usuarios') {
    usuariosTabRef.value?.novo();
    modoUsuarios.value = 'formulario';
  } else {
    abrirModal();
  }
};

const voltarAbaParaLista = () => {
  if (abaAtiva.value === 'modelos') {
    modelosTabRef.value?.voltarParaLista();
    modoModelos.value = 'lista';
  } else if (abaAtiva.value === 'usuarios') {
    usuariosTabRef.value?.voltarParaLista();
    modoUsuarios.value = 'lista';
  }
};

const mudarAba = (idAba) => {
  if (idAba === abaAtiva.value) {
    if (idAba === 'modelos' && modoModelos.value !== 'lista') {
      modoModelos.value = 'lista';
      modelosTabRef.value?.voltarParaLista();
    } else if (idAba === 'usuarios' && modoUsuarios.value !== 'lista') {
      modoUsuarios.value = 'lista';
      usuariosTabRef.value?.voltarParaLista();
    }
    return;
  }

  cancelarBuscaDados();
  abaAtiva.value = idAba;
  modoModelos.value = 'lista';
  modoUsuarios.value = 'lista';
  fecharModal();
  limparFiltrosBase();
  router.replace({ query: { ...route.query, aba: idAba } });
  if (abaInfo.value?.tipo !== 'custom') {
    buscarDados();
  }
};

const adicionarPerguntaModal = () => {
  if (!form.novaPerguntaInput.trim()) return;
  const linhas = form.novaPerguntaInput.split('\n');
  linhas.forEach(linha => {
    const textoLimpo = linha.trim();
    if (textoLimpo) form.perguntas.push(textoLimpo);
  });
  form.novaPerguntaInput = '';
};

const removerPerguntaModal = (index) => {
  form.perguntas.splice(index, 1);
};

const abrirModal = async (item = null) => {
  if (abaAtiva.value === 'celulas') {
    await carregarDependenciasCelulas();
  }

  if (item) {
    form.id = item.id || item.id_setor || item.id_unidade || item.id_marca || item.id_celula || item.id_turno;
    form.nome = item.nome || item.descricao;
    form.ativo = item.ativo !== 0 && item.ativo !== false;
    form.logo = undefined;
    form.logoPreview = abaAtiva.value === 'marcas' ? (urlLogoMarca(item) || '') : '';
    
    if (abaAtiva.value === 'categorias') {
      form.ctq = Boolean(item.ctq);
      form.perguntas = Array.isArray(item.perguntas) ? [...item.perguntas] : [];
      form.novaPerguntaInput = '';
    }

    if (abaAtiva.value === 'celulas') {
      form.id_setor_fk = item.id_setor_fk || '';
      form.id_marca_fk = item.id_marca_fk || '';
    }
    
    if (abaAtiva.value === 'turnos') {
      form.entrada_inicio = item.entrada_inicio;
      form.entrada_fim = item.entrada_fim;
      form.intervalo_inicio = item.intervalo_inicio;
      form.intervalo_fim = item.intervalo_fim;
    }
  } else {
    form.id = null;
    form.nome = '';
    form.ativo = true;
    form.ctq = false;
    form.perguntas = [];
    form.novaPerguntaInput = '';
    form.id_setor_fk = '';
    form.id_marca_fk = '';
    form.entrada_inicio = '';
    form.entrada_fim = '';
    form.intervalo_inicio = '';
    form.intervalo_fim = '';
    form.logo = undefined;
    form.logoPreview = '';
  }
  showModal.value = true;
};

const fecharModal = () => {
  showModal.value = false;
};

const selecionarLogo = (event) => {
  const arquivo = event.target.files?.[0];
  event.target.value = '';
  if (!arquivo) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type) || arquivo.size > 512 * 1024) {
    toast.warning('Selecione uma imagem PNG, JPEG ou WebP de até 512 KB.');
    return;
  }
  const leitor = new FileReader();
  leitor.onload = () => {
    form.logo = leitor.result;
    form.logoPreview = leitor.result;
  };
  leitor.readAsDataURL(arquivo);
};

const removerLogo = () => {
  form.logo = null;
  form.logoPreview = '';
};

const salvarItem = async () => {
  salvando.value = true;
  
  const payload = { nome: form.nome };
  if (form.id && ['setores', 'unidades', 'celulas'].includes(abaAtiva.value)) payload.ativo = form.ativo;
  if (abaAtiva.value === 'marcas' && form.logo !== undefined) payload.logo = form.logo;

  if (abaAtiva.value === 'categorias') {
    payload.ctq = form.ctq;
    payload.perguntas = form.perguntas.map(p => String(p).trim()).filter(Boolean);
  }
  
  if (abaAtiva.value === 'celulas') {
    if (!form.id_setor_fk) {
      toast.warning('Por favor, selecione um setor vinculado.');
      salvando.value = false;
      return;
    }
    payload.id_setor_fk = Number(form.id_setor_fk);
    payload.id_marca_fk = form.id_marca_fk ? Number(form.id_marca_fk) : null;
  }
  
  if (abaAtiva.value === 'turnos') {
    payload.entrada_inicio = form.entrada_inicio;
    payload.entrada_fim = form.entrada_fim;
    payload.intervalo_inicio = form.intervalo_inicio;
    payload.intervalo_fim = form.intervalo_fim;
  }

  try {
    if (form.id) {
      await api.put(`${endpointAtivo.value}/${form.id}`, payload);
      toast.success(`${nomeAbaAtiva.value.slice(0, -1)} atualizado(a) com sucesso!`);
    } else {
      await api.post(endpointAtivo.value, payload);
      toast.success(`${nomeAbaAtiva.value.slice(0, -1)} cadastrado(a) com sucesso!`);
    }
    fecharModal();
    buscarDados(true); 
  } catch (err) {
    console.error('Erro ao salvar:', err);
    if (err.response?.status === 409) {
      toast.warning(err.response.data?.mensagem || 'Já existe uma categoria com este nome.');
    } else {
      toast.error('Erro ao salvar o registro. Verifique os dados inseridos.');
    }
  } finally {
    salvando.value = false;
  }
};

const excluirItem = async (id) => {
  const entidade = nomeAbaAtiva.value.slice(0, -1);
  const confirmou = await dialog.confirm({
    title: `Excluir ${entidade}`,
    message: `Deseja realmente excluir este(a) ${entidade}? Esta ação pode afetar registros vinculados.`,
    confirmText: 'Excluir',
    variant: 'danger'
  });
  if (!confirmou) return;
  
  try {
    await api.delete(`${endpointAtivo.value}/${id}`);
    toast.success(`${entidade} excluído(a) com sucesso!`);
    fecharModal();
    buscarDados(true);
  } catch (err) {
    console.error('Erro ao excluir:', err);
    toast.error('Erro ao excluir. O registro pode estar em uso em outros cadastros.');
  }
};

onMounted(() => {
  if (abaInfo.value?.tipo !== 'custom') {
    buscarDados(true);
  }
});

onBeforeUnmount(cancelarBuscaDados);
</script>

<style scoped>
.page-container {
  max-width: 1250px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

/* ==========================================
   NAVEGAÇÃO POR ABAS (DESKTOP)
   ========================================== */
.tabs-container.desktop-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color, #e2e8f0);
  padding-bottom: 8px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0.75rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  border-radius: var(--radius-md, 10px);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  min-height: 44px;
}

.tab-btn:hover {
  background: #f1f5f9;
  color: var(--text-primary, #0f172a);
}

.tab-btn.active {
  background: var(--primary, #b1072c);
  color: white;
  box-shadow: 0 4px 6px rgba(177, 7, 44, 0.2);
}

/* ==========================================
   SELETOR DE ABAS MOBILE (DROPDOWN)
   ========================================== */
.tabs-mobile-dropdown {
  display: none;
  margin-bottom: 1.25rem;
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: 0.85rem 1rem;
  box-shadow: var(--shadow-sm);
}

.tabs-mobile-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary, #64748b);
  margin-bottom: 0.5rem;
}

.tabs-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.select-active-icon {
  position: absolute;
  left: 12px;
  font-size: 1.25rem;
  color: var(--primary, #b1072c);
  pointer-events: none;
  z-index: 1;
}

.tabs-select-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.6rem;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: 8px;
  background-color: #f8fafc;
  color: var(--text-primary, #0f172a);
  font-size: 0.98rem;
  font-weight: 600;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  min-height: 46px;
  transition: all 0.2s ease;
}

.tabs-select-input:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.15);
}

.select-chevron {
  position: absolute;
  right: 12px;
  font-size: 1.35rem;
  color: #64748b;
  pointer-events: none;
}

/* ==========================================
   TABELAS E CARDS
   ========================================== */
.card {
  background: var(--bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color, #e2e8f0);
  overflow: hidden;
  padding: 1.5rem;
}

.toolbar-search {
  margin-bottom: 1.25rem;
}

.search-box {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 1.2rem;
}

.input-search {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.4rem;
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  font-size: 0.95rem;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  box-sizing: border-box;
  min-height: 44px;
}

.input-search:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.15);
}

.clear-input-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.clear-input-btn:hover { color: #475569; }

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0.9rem 1rem;
  border-bottom: 1.5px solid #e2e8f0;
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: var(--text-primary, #0f172a);
  font-size: 0.95rem;
}

.data-table tbody tr:hover td {
  background-color: #f8fafc;
}

.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #94a3b8; }

.badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.badge-setor { background: #fff1f2; color: var(--primary, #b1072c); }
.badge-marca { background: #fef3c7; color: #b45309; }
.marca-logo-mini { width: 64px; height: 36px; object-fit: contain; }
.logo-upload { display: flex; align-items: center; gap: 1rem; }
.logo-preview, .logo-placeholder { width: 120px; height: 72px; object-fit: contain; border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; background: #f8fafc; }
.logo-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; }
.logo-placeholder i { font-size: 1.5rem; }
.logo-actions { display: flex; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap; }
.logo-actions small { width: 100%; color: #64748b; }
.logo-file-label { cursor: pointer; }
.logo-file-label input { display: none; }
.badge-ctq-critico { background: #fff1f2; color: var(--primary, #b1072c); border: 1px solid #fecdd3; }
.badge-ctq-normal { background: #f8fafc; color: #64748b; border: 1px solid #cbd5e1; }
.badge-perguntas-count { background: #eff6ff; color: #1d4ed8; }

.btn-toggle-ctq { display: inline-flex; align-items: center; gap: 6px; padding: 0.45rem 0.85rem; border-radius: 8px; border: 1.5px solid #cbd5e1; background: #f8fafc; cursor: pointer; transition: all 0.2s ease; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.5px; color: #64748b; min-height: 38px; user-select: none; }
.btn-toggle-ctq i { font-size: 1.05rem; }
.btn-toggle-ctq:hover { border-color: #94a3b8; background-color: #f1f5f9; color: #334155; }
.btn-toggle-ctq.is-ctq { background: #fff1f2; border-color: #fecdd3; color: var(--primary, #b1072c); }
.btn-toggle-ctq.is-ctq:hover { background: #ffe4e6; border-color: var(--primary, #b1072c); }

.entity-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entity-sub-meta {
  font-size: 0.78rem;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
}

.modal-footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 0.75rem;
}

.modal-footer-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-danger-outline {
  background: white;
  border: 1.5px solid #fecdd3;
  color: #dc2626;
  padding: 0.75rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  transition: all 0.2s;
}

.btn-danger-outline:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #dc2626;
}

.perguntas-manager-box {
  background: #f8fafc;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  padding: 1rem;
}

.sem-perguntas-aviso {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 0.88rem;
  font-style: italic;
  margin-bottom: 0.75rem;
}

.modal-perguntas-lista {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.modal-pergunta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.pergunta-num {
  font-weight: 700;
  color: #94a3b8;
  font-size: 0.85rem;
  min-width: 20px;
}

.input-pergunta-modal {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
}

.input-pergunta-modal:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
}

.btn-remover-pergunta {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
  min-width: 32px;
  min-height: 32px;
}

.btn-remover-pergunta:hover {
  color: #dc2626;
  background: #fef2f2;
}

.add-pergunta-modal-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-add-p-modal {
  align-self: flex-start;
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
  background-color: var(--primary, #b1072c);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-add-p-modal:hover {
  background-color: var(--primary-hover, #8f0523);
}

/* ==========================================
   FORMULÁRIOS
   ========================================== */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 600;
  color: #475569;
  font-size: 0.9rem;
}

.form-group label i { color: #94a3b8; margin-right: 4px; }

.input-base {
  width: 100%;
  padding: 0.8rem;
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.input-base:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.15);
}

.select-base { background-color: #fff; cursor: pointer; }

.time-grid-container {
  background: #f8fafc;
  padding: 1.2rem;
  border-radius: 8px;
  border: 1.5px dashed #cbd5e1;
}

.time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.time-row.separator { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color, #e2e8f0); }
.time-row .form-group { margin-bottom: 0; }

.dependencies-grid {
  background: #f8fafc;
  padding: 1.2rem;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
  margin-bottom: 1.25rem;
}

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

.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

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
}

.btn-outline:hover { background: #f1f5f9; }

.btn-header-link {
  background: white;
  border: 1.5px solid #cbd5e1;
  color: #334155;
  padding: 0.75rem 1.15rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  min-height: 44px;
  text-decoration: none;
  box-sizing: border-box;
}

.btn-header-link:hover {
  background: #f8fafc;
  border-color: var(--primary, #b1072c);
  color: var(--primary, #b1072c);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .tabs-container.desktop-tabs {
    display: none;
  }
  .tabs-mobile-dropdown {
    display: block;
  }
  .page-container {
    padding: 1rem 0.5rem;
  }
  .card {
    padding: 1rem;
    border-radius: 12px;
  }
  .data-table {
    min-width: 560px;
  }
  .time-row {
    grid-template-columns: 1fr;
  }
  .perguntas-manager-box {
    padding: 0.85rem;
  }
}
</style>
