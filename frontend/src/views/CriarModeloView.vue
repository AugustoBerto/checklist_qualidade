<template>
  <div class="page-container">
    <PageHeader
      :title="modoAtual === 'lista' ? 'Gestão de Modelos de Checklist' : (form.id ? 'Editar Modelo de Checklist' : 'Criar Novo Modelo de Checklist')"
      :subtitle="modoAtual === 'lista' ? 'Crie, clone, edite e gerencie os formulários de inspeção de qualidade.' : 'Configure as categorias e perguntas do checklist.'"
      icon="mdi mdi-clipboard-text-outline"
    >
      <template #actions>
        <button v-if="modoAtual === 'lista'" class="btn-primary" @click="abrirCriacao">
          <i class="mdi mdi-plus-box"></i>
          <span>Novo Modelo</span>
        </button>
        <button v-else class="btn-outline" @click="voltarParaLista">
          <i class="mdi mdi-arrow-left"></i>
          <span>Voltar para Lista</span>
        </button>
      </template>
    </PageHeader>

    <div v-if="erroGlobal" class="alert error"><i class="mdi mdi-alert-circle"></i> {{ erroGlobal }}</div>
    <div v-if="sucessoGlobal" class="alert success"><i class="mdi mdi-check-circle"></i> {{ sucessoGlobal }}</div>

    <div v-if="modoAtual === 'lista'" class="card-admin">
      <div v-if="!isLoadingTabela && modelosLista.length > 0" class="toolbar-filtros">
        <div class="search-box">
          <i class="mdi mdi-magnify search-icon"></i>
          <input
            type="text"
            v-model="filtroTexto"
            placeholder="Buscar por nome ou ID do modelo..."
            class="input-search"
          >
          <button
            v-if="filtroTexto"
            type="button"
            class="clear-input-btn"
            @click="filtroTexto = ''"
            title="Limpar busca"
          >
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="filtros-selecao">
          <div class="filtro-item">
            <select v-model="filtroSetor" class="select-filtro">
              <option value="">Todos os Setores</option>
              <option v-for="s in setoresOptions" :key="s.value" :value="s.value">
                {{ s.label }}
              </option>
            </select>
          </div>

          <div class="filtro-item">
            <select v-model="filtroMarca" class="select-filtro">
              <option value="">Todas as Marcas</option>
              <option v-for="m in marcasOptions" :key="m.value" :value="m.value">
                {{ m.label }}
              </option>
            </select>
          </div>

          <div class="filtro-item">
            <select v-model="filtroStatus" class="select-filtro">
              <option value="todos">Todos os Status</option>
              <option value="ativos">Apenas Ativos</option>
              <option value="inativos">Apenas Inativos</option>
            </select>
          </div>

          <button
            v-if="temFiltrosAtivos"
            type="button"
            class="btn-outline btn-limpar-filtros"
            @click="limparFiltros"
            title="Limpar todos os filtros"
          >
            <i class="mdi mdi-filter-off-outline"></i>
            <span>Limpar</span>
          </button>
        </div>
      </div>

      <div v-if="!isLoadingTabela && modelosLista.length > 0" class="filtros-resumo">
        <span>Exibindo <strong>{{ modelosFiltrados.length }}</strong> de <strong>{{ modelosLista.length }}</strong> modelos</span>
      </div>

      <FeedbackState
        v-if="isLoadingTabela"
        type="loading"
        message="Carregando modelos de checklist..."
      />

      <FeedbackState
        v-else-if="modelosLista.length === 0"
        type="empty"
        title="Nenhum modelo cadastrado"
        message="Clique em 'Novo Modelo' para cadastrar o primeiro checklist."
      >
        <template #action>
          <button @click="abrirCriacao" class="btn-primary">
            <i class="mdi mdi-plus"></i> Novo Modelo
          </button>
        </template>
      </FeedbackState>

      <FeedbackState
        v-else-if="modelosFiltrados.length === 0"
        type="empty"
        title="Nenhum modelo encontrado"
        message="Nenhum modelo de checklist corresponde aos filtros selecionados."
      >
        <template #action>
          <button @click="limparFiltros" class="btn-outline">
            <i class="mdi mdi-filter-off-outline"></i> Limpar filtros
          </button>
        </template>
      </FeedbackState>
      
      <div v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome do Modelo</th>
            <th>Setor</th> <th>Marca</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="modelo in modelosFiltrados" :key="modelo.id">
            <td>#{{ modelo.id }}</td>
            <td><strong>{{ modelo.nome }}</strong></td>
            
            <td>
              <span class="badge-setor"><i class="mdi mdi-office-building"></i> {{ obterNomeSetor(modelo.id_setor_fk) }}</span>
            </td>
            
            <td>{{ obterNomeMarca(modelo.marca || modelo.nomeMarca) }}</td>
            <td>
              <span :class="['badge', modelo.ativo ? 'badge-ativo' : 'badge-inativo']">
                {{ modelo.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="text-right acoes-celula">
              <button class="btn-editar" @click="abrirEdicao(modelo)">
                <i class="mdi mdi-pencil"></i> Editar
              </button>
              <button 
                class="btn-status" 
                :class="modelo.ativo ? 'btn-inativar' : 'btn-reativar'"
                @click="alternarStatus(modelo)"
              >
                <i class="mdi" :class="modelo.ativo ? 'mdi-cancel' : 'mdi-check-circle'"></i>
                {{ modelo.ativo ? 'Inativar' : 'Reativar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div v-else class="card form-card">
      <h2 class="titulo">{{ form.id ? 'Editar Modelo de Checklist' : 'Criar Novo Modelo de Checklist' }}</h2>
      
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
            <label for="idSetor">Setor Responsável:</label>
            <VueSelect 
              v-model="form.idSetor" 
              :options="setoresOptions" 
              placeholder="Selecione o setor" 
            />
          </div>
          <div class="form-group w-33">
            <label for="nomeMarca">Marca do Modelo:</label>
            <VueSelect 
              v-model="form.nomeMarca" 
              :options="marcasOptions" 
              placeholder="Selecione a marca" 
            />
          </div>
          <div class="form-group w-33">
            <label for="nomeModelo">Nome do Modelo:</label>
            <input type="text" id="nomeModelo" v-model="form.nomeModelo" placeholder="Ex: Auditoria de Costura V2" class="input-base" required>
          </div>
        </div>

        <div class="form-group checkbox-group">
          <input type="checkbox" id="ativo" v-model="form.ativo">
          <label for="ativo"><strong>Modelo Ativo</strong> (Desmarque para inativar e ocultar do tablet dos utilizadores)</label>
        </div>

        <hr class="divisor">
        
        <h2 class="titulo-sessao">Categorias e Perguntas</h2>
        
        <div class="form-group box-add-categoria">
          <input type="text" v-model.trim="novaCategoria" @keypress.enter.prevent="adicionarCategoria" class="input-base" placeholder="Digite o nome da nova categoria">
          <button type="button" class="btn-secundario" @click="adicionarCategoria">
            <i class="mdi mdi-plus"></i> Adicionar Categoria
          </button>
        </div>

        <div class="categorias-container">
          <p v-if="categoriasUI.length === 0" class="item-vazio">Nenhuma categoria adicionada.</p>
          
          <div v-for="(cat, catIndex) in categoriasUI" :key="catIndex" class="categoria-card">
            
            <div class="categoria-header">
              <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1;">
                <input type="text" v-model="cat.nome" class="input-editavel titulo-cat" placeholder="Nome da Categoria">
                
                <label class="ctq-toggle" :class="{ 'is-ctq': cat.ctq }" title="Marcar como Processo Crítico (CTQ)">
                  <input type="checkbox" v-model="cat.ctq" style="display: none;">
                  <i class="mdi" :class="cat.ctq ? 'mdi-star' : 'mdi-star-outline'"></i>
                  <span>{{ cat.ctq ? 'PROCESSO CTQ' : 'Normal' }}</span>
                </label>
              </div>

              <button type="button" class="btn-excluir-categoria" @click="removerCategoria(catIndex)">
                <i class="mdi mdi-delete-outline"></i> Remover Categoria
              </button>
            </div>
            
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

        <div v-if="erroForm" class="error-message"><i class="mdi mdi-alert-circle"></i> {{ erroForm }}</div>
        
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
import api from '../services/api';
import PageHeader from '../components/PageHeader.vue';
import FeedbackState from '../components/FeedbackState.vue';
import { toast, dialog } from '../services/feedback';

const modoAtual = ref('lista'); 
const marcasOptions = ref([]);
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
  nomeModelo: '',
  nomeMarca: null,
  idSetor: null,
  ativo: true
});
const categoriasUI = ref([]);
const novaCategoria = ref('');
const erroForm = ref('');
const isLoadingForm = ref(false);

const marcaReferencia = ref(null);
const modeloReferencia = ref(null);
const opcoesModelosReferencia = ref([]);

const extrairArrayDeDados = (respostaData) => {
  if (Array.isArray(respostaData)) return respostaData;
  if (respostaData.dados && Array.isArray(respostaData.dados)) return respostaData.dados;
  if (respostaData.modelos) return respostaData.modelos;
  if (respostaData.setores) return respostaData.setores;
  if (respostaData.marcas) return respostaData.marcas;
  return Object.values(respostaData).find(val => Array.isArray(val)) || [];
};

// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================
const carregarDadosIniciais = async () => {
  try {
    const [resMarcas, resSetores] = await Promise.all([
      api.get('/cadastros/marcas'),
      api.get('/cadastros/setores')
    ]);
    
    marcasOptions.value = extrairArrayDeDados(resMarcas.data).map(item => ({ label: item.nome, value: item.id }));
    setoresOptions.value = extrairArrayDeDados(resSetores.data).map(item => ({ label: item.nome, value: item.id }));
    
    await carregarModelosTabela();
  } catch (error) {
    erroGlobal.value = 'Erro ao carregar dados iniciais (marcas/setores).';
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
// 📌 FUNÇÃO PARA TRADUZIR O ID DO SETOR PARA O NOME NA TABELA
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
  Object.assign(form, { id: null, nomeModelo: '', nomeMarca: null, idSetor: null, ativo: true });
  marcaReferencia.value = null;
  modeloReferencia.value = null;
  categoriasUI.value = [];
  novaCategoria.value = '';
  erroForm.value = ''; erroGlobal.value = ''; sucessoGlobal.value = '';
  modoAtual.value = 'formulario';
};

const voltarParaLista = () => {
  modoAtual.value = 'lista';
  carregarModelosTabela();
};

const abrirEdicao = async (modelo) => {
  isLoadingTabela.value = true;
  erroGlobal.value = ''; sucessoGlobal.value = '';
  
  try {
    const res = await api.get(`/cadastros/modelos/${modelo.id}`);
    
    if (res.data?.sucesso) {
      const dadosModelo = res.data.modelo;
      
      form.id = dadosModelo.id;
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
      categoriasUI.value = Object.keys(catsBanco).map(nomeCat => ({
        nome: nomeCat,
        ctq: catsBanco[nomeCat].ctq || false,
        novaPergunta: '',
        perguntas: catsBanco[nomeCat].perguntas.map(texto => ({ texto }))
      }));

      modoAtual.value = 'formulario';
    }
  } catch (err) {
    erroGlobal.value = 'Erro ao carregar detalhes do modelo para edição.';
  } finally {
    isLoadingTabela.value = false;
  }
};

const alternarStatus = async (modelo) => {
  const acao = modelo.ativo ? 'inativar' : 'reativar';
  const confirmou = await dialog.confirm({
    title: `${modelo.ativo ? 'Inativar' : 'Reativar'} Modelo`,
    message: `Deseja realmente ${acao} o modelo "${modelo.nome}"?`,
    confirmText: modelo.ativo ? 'Inativar' : 'Reativar',
    variant: modelo.ativo ? 'danger' : 'primary'
  });
  if (!confirmou) return;

  try {
    const res = await api.get(`/cadastros/modelos/${modelo.id}`);
    if (res.data?.sucesso) {
      const payload = { ...res.data.modelo, ativo: !modelo.ativo };
      await api.put(`/cadastros/modelos/${modelo.id}`, payload);
      toast.success(`Modelo ${acao}do com sucesso.`);
      carregarModelosTabela();
    }
  } catch (err) {
    toast.error(`Erro ao ${acao} modelo.`);
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
        
        categoriasUI.value = Object.keys(catsBanco).map(nomeCat => ({
            nome: nomeCat, 
            ctq: catsBanco[nomeCat].ctq || false,
            novaPergunta: '',
            perguntas: catsBanco[nomeCat].perguntas.map(texto => ({ texto }))
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
const adicionarCategoria = () => {
  if (novaCategoria.value) {
    categoriasUI.value.push({ nome: novaCategoria.value, ctq: false, perguntas: [], novaPergunta: '' });
    novaCategoria.value = '';
  }
};
const removerCategoria = (index) => categoriasUI.value.splice(index, 1);

const adicionarPergunta = (catIndex) => {
  const cat = categoriasUI.value[catIndex];
  if (!cat.novaPergunta.trim()) return;
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
  erroForm.value = '';

  if (!form.idSetor) { erroForm.value = 'O Setor Responsável é obrigatório.'; return; }
  if (!form.nomeModelo.trim()) { erroForm.value = 'Nome do modelo é obrigatório.'; return; }
  if (!form.nomeMarca) { erroForm.value = 'A marca é obrigatória.'; return; }
  if (categoriasUI.value.length === 0) { erroForm.value = 'Adicione pelo menos uma categoria.'; return; }

  const payloadCategorias = {};
  categoriasUI.value.forEach(cat => {
    const nomeLimpo = cat.nome.trim();
    if (nomeLimpo && cat.perguntas.length > 0) {
      payloadCategorias[nomeLimpo] = {
        ctq: !!cat.ctq,
        perguntas: cat.perguntas.map(p => p.texto.trim()).filter(t => t !== '')
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

  isLoadingForm.value = true;
  try {
    if (form.id) {
      await api.put(`/cadastros/modelos/${form.id}`, payload);
      sucessoGlobal.value = 'Modelo atualizado com sucesso!';
    } else {
      await api.post('/cadastros/modelos', payload);
      sucessoGlobal.value = 'Novo modelo criado com sucesso!';
    }
    voltarParaLista();
    setTimeout(() => { sucessoGlobal.value = ''; }, 3000);
  } catch (err) {
    console.error('Erro ao guardar modelo:', err);
    erroForm.value = err.response?.data?.mensagem || 'Erro ao guardar o modelo.';
  } finally {
    isLoadingForm.value = false;
  }
};
</script>

<style scoped>
.page-container { padding: 2rem; background-color: #f4f7f6; min-height: 100vh; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
.header-n { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-titles h1 { margin: 0; color: #2c3e50; font-size: 1.8rem; display: flex; align-items: center; gap: 10px; }
.header-titles p { margin: 0.5rem 0 0 0; color: #7f8c8d; }

.btn-novo, .btn-voltar { padding: 0.6rem 1.2rem; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: white; display: flex; gap: 0.5rem; align-items: center; transition: 0.2s;}
.btn-novo { background: #27ae60; }
.btn-novo:hover { background: #219653; }
.btn-voltar { background: #7f8c8d; }
.btn-voltar:hover { background: #626c6d; }

.alert { padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-weight: bold; display: flex; align-items: center; gap: 0.5rem;}
.error { background: #fdeaea; color: #e74c3c; border: 1px solid #fadbd8; }
.success { background: #eafaf1; color: #27ae60; border: 1px solid #d5f5e3; }

.card-admin { background: white; padding: 2rem; border-radius: var(--radius-lg, 16px); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color, #e2e8f0); }

/* ==========================================
   TOOLBAR DE FILTROS DINÂMICOS
   ========================================== */
.toolbar-filtros {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
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
  border-color: var(--primary, #2563eb);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s;
}

.clear-input-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.filtros-selecao {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filtro-item {
  flex: 1;
  min-width: 160px;
}

.select-filtro {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  min-height: 42px;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s;
}

.select-filtro:focus {
  outline: none;
  border-color: var(--primary, #2563eb);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.btn-limpar-filtros {
  min-height: 42px;
  padding: 0.65rem 1rem;
}

.filtros-resumo {
  margin-bottom: 1.25rem;
  font-size: 0.88rem;
  color: var(--text-secondary, #64748b);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th { background: #f8f9fa; padding: 1rem; color: #34495e; border-bottom: 2px solid #ecf0f1; }
.data-table td { padding: 1rem; border-bottom: 1px solid #ecf0f1; color: #2c3e50; vertical-align: middle;}
.text-right { text-align: right; }
.text-center { text-align: center; }
.acoes-celula { display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;}

.badge { padding: 0.3rem 0.6rem; border-radius: 20px; font-size: 0.8rem; font-weight: bold; color: white; }
.badge-ativo { background: #27ae60; }
.badge-inativo { background: #e74c3c; }

/* 📌 Estilo para a badge de Setor na Tabela */
.badge-setor { background: #e0e7ff; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }

.btn-editar, .btn-status { border: none; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s ease; min-height: 38px; }
.btn-editar { background: #eff6ff; color: var(--primary, #2563eb); border: 1px solid #bfdbfe; }
.btn-editar:hover { background: var(--primary, #2563eb); color: #ffffff; }
.btn-inativar { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
.btn-inativar:hover { background: #c2410c; color: #ffffff; }
.btn-reativar { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.btn-reativar:hover { background: #047857; color: #ffffff; }

.form-card { max-width: 900px; margin: auto; background: #ffffff; padding: 2.5rem; border-radius: var(--radius-lg, 16px); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color, #e2e8f0); }
.titulo { color: var(--text-primary, #0f172a); font-weight: 700; margin-bottom: 1.5rem; font-size: 1.5rem; }
.titulo-sessao { color: var(--text-primary, #0f172a); font-weight: 700; margin-bottom: 1.5rem; font-size: 1.25rem; margin-top: 2rem;}

.referencia-box { background: #f8fafc; border: 1.5px dashed #cbd5e1; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem; }
.titulo-referencia { font-weight: 700; color: var(--primary, #2563eb); margin-bottom: 1rem; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;}
.dica { font-size: 0.85rem; color: #64748b; margin-top: 0.5rem; font-style: italic; }

.form-group-row { display: flex; gap: 1.5rem; margin-bottom: 1rem;}
.w-50 { flex: 1; }
.w-33 { flex: 1; min-width: 0; }
label { display: block; font-weight: 600; margin-bottom: 0.4rem; color: #34495e; }

.input-base { width: 100%; padding: 0.75rem 0.85rem; border: 1.5px solid var(--border-color, #cbd5e1); border-radius: 8px; box-sizing: border-box; font-family: inherit; transition: border-color 0.2s; background-color: #fff; color: #333; }
.input-base:focus { outline: none; border-color: var(--primary, #2563eb); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.checkbox-group { margin-top: 1.5rem; display: flex; align-items: center; gap: 0.5rem; background-color: #f8fbff; padding: 1rem; border-radius: 8px; border: 1px solid #bfdbfe; }
.checkbox-group input { width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary, #2563eb); }
.checkbox-group label { margin: 0; cursor: pointer; }

.divisor { border: 0; height: 1px; background: #e2e8f0; margin: 2rem 0; }
.box-add-categoria { display: flex; gap: 0.5rem; margin-bottom: 2rem; }
.btn-secundario { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.25rem; background-color: var(--primary, #2563eb); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; min-height: 42px; transition: all 0.2s;}
.btn-secundario:hover { background-color: var(--primary-hover, #1d4ed8); }

.categoria-card { border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 1.5rem; padding: 1.5rem; background: #ffffff; box-shadow: var(--shadow-sm);}
.categoria-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 0.8rem; margin-bottom: 1rem; }

.ctq-toggle { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 20px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; font-weight: bold; color: #64748b; user-select: none; white-space: nowrap;}
.ctq-toggle:hover { border-color: #94a3b8; }
.ctq-toggle.is-ctq { background: #fff1f2; border-color: #f43f5e; color: #e11d48; }

.btn-excluir-categoria { display: inline-flex; align-items: center; gap: 0.35rem; background-color: #fef2f2; color: #dc2626; border: 1px solid #fecdd3; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: 0.2s; min-height: 36px;}
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
.input-editavel:focus { outline: none; border: 1px solid var(--primary, #2563eb); background: #fff; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);}
.titulo-cat { font-size: 1.15rem; font-weight: 700; color: #1e293b; flex: 1; margin-right: 1rem;}
.texto-pergunta { flex: 1; font-size: 0.95rem; }

.add-pergunta-box { display: flex; gap: 0.75rem; align-items: flex-start; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;}
.btn-add-pergunta { padding: 0.65rem 1.2rem; background-color: #ffffff; color: var(--primary, #2563eb); border: 1.5px solid #bfdbfe; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; white-space: nowrap; min-height: 42px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;}
.btn-add-pergunta:hover { background-color: #eff6ff; border-color: var(--primary, #2563eb); }

.btn-principal { display: inline-flex; justify-content: center; align-items: center; gap: 0.5rem; width: 100%; padding: 1rem 1.5rem; background-color: var(--primary, #2563eb); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1.1rem; font-weight: 700; margin-top: 1.5rem; min-height: 50px; transition: all 0.2s; box-shadow: var(--shadow-sm);}
.btn-principal:hover:not(:disabled) { background-color: var(--primary-hover, #1d4ed8); box-shadow: var(--shadow-md); transform: translateY(-1px); }
.btn-principal:disabled { background-color: #cbd5e1; cursor: not-allowed; }
.error-message { background: #fef2f2; border-left: 4px solid #ef4444; padding: 1rem; color: #b91c1c; margin: 1rem 0; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; border-radius: 0 8px 8px 0;}

@media (max-width: 767px) {
  .page-container { padding: 1rem; }
  .header-n { align-items: stretch; flex-direction: column; gap: 1rem; }
  .header-titles h1 { font-size: 1.35rem; }
  .header-actions, .header-actions > button { width: 100%; }
  .header-actions > button { justify-content: center; }
  .card-admin, .form-card { padding: 1rem; }
  .table-container { overflow-x: auto; }
  .data-table { min-width: 700px; }
  .form-group-row, .box-add-categoria, .categoria-header, .add-pergunta-box { flex-direction: column; }
  .form-group-row { gap: 1rem; }
  .w-50, .w-33 { width: 100%; }
  .checkbox-group { align-items: flex-start; }
  .categoria-header > div[style] { width: 100%; flex-wrap: wrap; gap: 0.75rem !important; }
  .titulo-cat { width: 100%; margin-right: 0; }
  .btn-secundario, .btn-add-pergunta, .btn-excluir-categoria { justify-content: center; width: 100%; }
  .pergunta-item { align-items: flex-start; }
  .texto-pergunta { min-width: 0; width: 100%; }
  .btn-excluir-item { min-width: 44px; min-height: 44px; }
}
</style>
