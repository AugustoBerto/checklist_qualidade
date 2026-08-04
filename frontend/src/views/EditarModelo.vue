<template>
  <div class="page-container">
    <div class="card">
      <h1 class="titulo">Editar Modelo de Checklist</h1>

      <div class="form-group seletor-modelo">
        <label for="modeloSelecionado"><strong>Selecione o Modelo para Editar:</strong></label>
        <VueSelect v-model="modeloSelecionado" :options="opcoesModelos" placeholder="Busque ou selecione um modelo"
          @option:selected="buscarDetalhesModelo" />
      </div>

      <hr class="divisor" v-if="modeloSelecionado">

      <form v-if="modeloSelecionado" @submit.prevent="atualizarChecklist">

        <div class="form-group-row">
          <div class="form-group w-50">
            <label for="nomeMarca">Marca do Modelo:</label>
            <VueSelect v-model="nomeMarca" :options="marcas" placeholder="Selecione a marca" />
          </div>
          <div class="form-group w-50">
            <label for="nomeModelo">Nome do Modelo:</label>
            <input type="text" id="nomeModelo" v-model="nomeModelo" placeholder="Ex: Adizero V2" class="input-base"
              required>
          </div>
        </div>

        <div class="form-group checkbox-group">
          <input type="checkbox" id="ativo" v-model="ativo">
          <label for="ativo"><strong>Modelo Ativo</strong> (Desmarque para inativar e ocultar dos usuários)</label>
        </div>

        <hr class="divisor">

        <h2>Categorias e Perguntas</h2>

        <div class="form-group" style="display: flex; gap: 0.5rem; margin-bottom: 2rem;">
          <input type="text" v-model.trim="novaCategoria" @keypress.enter.prevent="adicionarCategoria"
            class="input-base" placeholder="Digite o nome da nova categoria">
          <button type="button" class="btn-secundario" @click="adicionarCategoria">
            <i class="mdi mdi-plus"></i> Adicionar Categoria
          </button>
        </div>

        <div class="categorias-container">
          <p v-if="categoriasUI.length === 0" class="item-vazio">Nenhuma categoria adicionada.</p>

          <div v-for="(cat, catIndex) in categoriasUI" :key="catIndex" class="categoria-card">

            <div class="categoria-header">
              <input type="text" v-model="cat.nome" class="input-editavel titulo-cat" placeholder="Nome da Categoria">
              <button type="button" class="btn-excluir-categoria" @click="removerCategoria(catIndex)">
                <i class="mdi mdi-delete-outline"></i> Remover Categoria
              </button>
            </div>

            <ul class="perguntas-lista">
              <li v-for="(pergunta, pIndex) in cat.perguntas" :key="pIndex" class="pergunta-item">
                <i class="mdi mdi-circle-small bullet"></i>
                <input type="text" v-model="pergunta.texto" class="input-editavel texto-pergunta"
                  placeholder="Texto da pergunta">
                <button type="button" class="btn-excluir-item" title="Remover Pergunta"
                  @click="removerPergunta(catIndex, pIndex)">
                  <i class="mdi mdi-close"></i>
                </button>
              </li>
            </ul>

            <div class="add-pergunta-box">
              <textarea v-model="cat.novaPergunta" class="input-base" rows="2"
                placeholder="Digite a nova pergunta... (DICA: Você pode colar várias perguntas de uma vez copiadas do Excel)"
                @keypress.enter.exact.prevent="adicionarPergunta(catIndex)"></textarea>
              <button type="button" class="btn-add-pergunta" @click="adicionarPergunta(catIndex)">Adicionar
                Pergunta(s)</button>
            </div>
          </div>
        </div>

        <div v-if="erro" class="error-message">
          <i class="mdi mdi-alert-circle"></i> {{ erro }}
        </div>
        <div v-if="sucesso" class="success-message">
          <i class="mdi mdi-check-circle"></i> {{ sucesso }}
        </div>

        <button type="submit" class="btn-principal" :disabled="isLoading">
          <span v-if="isLoading">
            <i class="mdi mdi-loading mdi-spin"></i> Atualizando Modelo...
          </span>
          <span v-else>
            <i class="mdi mdi-content-save"></i> Atualizar Checklist Completo
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import VueSelect from 'vue3-select-component';
import api from '../services/api'; // 📌 Instância configurada com Interceptors

const router = useRouter();

// Variáveis do seletor inicial
const opcoesModelos = ref([]);
const modeloSelecionado = ref(null);

// Variáveis do formulário
const nomeModelo = ref('');
const nomeMarca = ref(null);
const ativo = ref(true);
const marcas = ref([]);

// Estrutura de UI para Categorias e Perguntas
const categoriasUI = ref([]);
const novaCategoria = ref('');

const isLoading = ref(false);
const erro = ref('');
const sucesso = ref('');

// --- MANIPULAÇÃO DA UI ---
const adicionarCategoria = () => {
  if (novaCategoria.value) {
    categoriasUI.value.push({
      nome: novaCategoria.value,
      perguntas: [],
      novaPergunta: ''
    });
    novaCategoria.value = '';
  }
};

const removerCategoria = (catIndex) => {
  categoriasUI.value.splice(catIndex, 1);
};

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

const removerPergunta = (catIndex, pIndex) => {
  categoriasUI.value[catIndex].perguntas.splice(pIndex, 1);
};

// --- API: CARREGAR DETALHES AO SELECIONAR MODELO ---
watch(modeloSelecionado, async (novoValor) => {
  if (!novoValor) {
    nomeModelo.value = '';
    nomeMarca.value = null;
    ativo.value = true;
    categoriasUI.value = [];
    return;
  }

  const idDoModelo = typeof novoValor === 'object' ? novoValor.value : novoValor;

  try {
    // 📌 Rota atualizada: GET /api/cadastros/modelos/:id
    const res = await api.get(`/cadastros/modelos/${idDoModelo}`);

    if (res.data?.sucesso) {
      const dadosModelo = res.data.modelo;
      nomeModelo.value = dadosModelo.nomeModelo;

      // Status ativo (Tratamento booleano)
      ativo.value = ![false, 'false', 0, '0'].includes(dadosModelo.ativo);

      // Preenchimento da Marca (Vinculação por ID)
      const marcaIdRetornado = dadosModelo.nomeMarca;

      if (marcaIdRetornado) {
        const marcaEncontrada = marcas.value.find(m => String(m.value) === String(marcaIdRetornado));
        nomeMarca.value = marcaEncontrada ? marcaEncontrada.value : marcaIdRetornado;
      }

      // Conversão das Categorias (Banco [JSON] -> UI [Array])
      const categoriasDoBanco = dadosModelo.categorias || {};
      categoriasUI.value = Object.keys(categoriasDoBanco).map(nomeCat => ({
        nome: nomeCat,
        novaPergunta: '',
        perguntas: categoriasDoBanco[nomeCat].map(textoP => ({ texto: textoP }))
      }));

      erro.value = '';
    }
  } catch (err) {
    erro.value = 'Erro ao carregar detalhes do modelo para edição.';
    console.error(err);
  }
});

// --- API: SALVAR ATUALIZAÇÃO ---
const atualizarChecklist = async () => {
  erro.value = '';
  sucesso.value = '';

  if (!nomeModelo.value.trim()) { erro.value = 'Nome do modelo é obrigatório.'; return; }
  if (!nomeMarca.value) { erro.value = 'A marca é obrigatória.'; return; }
  if (categoriasUI.value.length === 0) { erro.value = 'Adicione categorias.'; return; }

  // Conversão UI -> Banco (JSON)
  const payloadCategorias = {};
  categoriasUI.value.forEach(cat => {
    const nomeLimpo = cat.nome.trim();
    if (nomeLimpo && cat.perguntas.length > 0) {
      payloadCategorias[nomeLimpo] = cat.perguntas.map(p => p.texto.trim()).filter(t => t !== '');
    }
  });

  isLoading.value = true;
  const idDoModelo = typeof modeloSelecionado.value === 'object' ? modeloSelecionado.value.value : modeloSelecionado.value;

  try {
    const payload = {
      nomeModelo: nomeModelo.value,
      nomeMarca: nomeMarca.value, // CORREÇÃO: Alterado de 'idMarca' para 'nomeMarca'      
      ativo: ativo.value,
      categorias: payloadCategorias
    };

    // 📌 Rota atualizada: PUT /api/cadastros/modelos/:id
    await api.put(`/cadastros/modelos/${idDoModelo}`, payload);

    sucesso.value = 'Modelo de checklist atualizado com sucesso!';
    setTimeout(() => router.push('/selecao'), 1500);

  } catch (err) {
    erro.value = err.response?.data?.mensagem || 'Erro ao atualizar modelo.';
  } finally {
    isLoading.value = false;
  }
};

// --- INICIALIZAÇÃO ---
const carregarDadosIniciais = async () => {
  try {
    // 1. Carrega Marcas para o Select
    const resMarcas = await api.get('/cadastros/marcas');
    marcas.value = resMarcas.data.map(item => ({ label: item.nome, value: item.id }));

    // 2. Carrega lista de Modelos para o Seletor de Edição
    // 📌 Rota: GET /api/dados/modelos (Pega todos para o admin escolher)
    const resModelos = await api.get('/dados/modelos');
    opcoesModelos.value = resModelos.data.map(item => ({
      label: item.nome,
      value: item.id
    }));
  } catch (error) {
    console.error('Erro na carga inicial de dados:', error);
  }
};

onMounted(carregarDadosIniciais);
</script>
<style scoped>
/* --- ESTILOS EXCLUSIVOS DA PÁGINA DE EDIÇÃO --- */
.seletor-modelo {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px dashed #3498db;
}

.checkbox-group {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8fbff;
  padding: 1rem;
  border-radius: 6px;
  border: 1px dashed #3498db;
}

.checkbox-group input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin: 0;
  accent-color: #3498db;
}

.checkbox-group label {
  margin: 0;
  cursor: pointer;
  color: #34495e !important;
}

/* --- ESTILOS COMPARTILHADOS (PADRÃO DASS) --- */
.page-container {
  padding: 2rem;
  background-color: #f4f7f6 !important;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333 !important;
}

.card {
  max-width: 900px;
  margin: auto;
  background: #ffffff !important;
  padding: 2.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  color: #333 !important;
}

.titulo {
  color: #2c3e50 !important;
  font-weight: 600;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
}

.form-group-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.w-50 {
  flex: 1;
}

label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: #34495e !important;
}

.input-base {
  width: 100%;
  padding: 0.7rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
  background-color: #fff !important;
  color: #333 !important;
}

.input-base:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.input-base::placeholder {
  color: #999 !important;
}

.divisor {
  border: 0;
  height: 1px;
  background: #e0e0e0;
  margin: 2rem 0;
}

.btn-secundario {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.7rem 1.2rem;
  background-color: #34495e;
  color: white !important;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  white-space: nowrap;
}

.btn-secundario:hover {
  background-color: #2c3e50;
}

.categorias-container {
  margin-top: 1rem;
}

.categoria-card {
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: #fdfdfd !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}

.categoria-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 0.8rem;
  margin-bottom: 1rem;
}

/* --- BOTÕES DE REMOVER (BLINDADOS) --- */
.btn-excluir-categoria {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background-color: #ffffff !important;
  color: #e53e3e !important;
  border: 1px solid #fc8181 !important;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: bold;
  transition: all 0.2s ease-in-out;
}

.btn-excluir-categoria:hover {
  background-color: #fff5f5 !important;
  border-color: #e53e3e !important;
  color: #c53030 !important;
}

.btn-excluir-item {
  background-color: transparent !important;
  border: none !important;
  color: #a0aec0 !important;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0 0.5rem;
  opacity: 0.6;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.pergunta-item:hover .btn-excluir-item {
  opacity: 1;
}

.btn-excluir-item:hover {
  color: #e53e3e !important;
  transform: scale(1.1);
}

.perguntas-lista {
  list-style: none;
  padding-left: 0;
  margin-bottom: 1.5rem;
}

.pergunta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: background 0.2s;
}

.pergunta-item:hover {
  background-color: #f1f2f6 !important;
  border-color: #dfe4ea;
}

.bullet {
  color: #bdc3c7 !important;
  font-size: 1.5rem;
}

.input-editavel {
  border: 1px dashed transparent;
  background: transparent !important;
  padding: 0.4rem;
  font-family: inherit;
  color: #333 !important;
  transition: all 0.2s;
  border-radius: 4px;
}

.input-editavel:hover {
  border-color: #bdc3c7;
  background: #fff !important;
}

.input-editavel:focus {
  outline: none;
  border: 1px solid #3498db;
  background: #fff !important;
  box-shadow: 0 0 5px rgba(52, 152, 219, 0.2);
}

.input-editavel::placeholder {
  color: #888 !important;
}

.titulo-cat {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c3e50 !important;
  flex: 1;
  margin-right: 1rem;
}

.texto-pergunta {
  flex: 1;
  font-size: 0.95rem;
}

.add-pergunta-box {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  background: #f8f9fa !important;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e0e6ed;
}

.btn-add-pergunta {
  padding: 0.7rem;
  background-color: #2980b9;
  color: white !important;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  height: fit-content;
  white-space: nowrap;
}

.btn-add-pergunta:hover {
  background-color: #2471a3;
}

.btn-principal {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1.2rem;
  background-color: #27ae60;
  color: white !important;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: bold;
  margin-top: 1.5rem;
  transition: background 0.3s;
}

.btn-principal:hover:not(:disabled) {
  background-color: #2ecc71;
}

.btn-principal:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.error-message {
  background: #fee !important;
  border-left: 4px solid #e74c3c;
  padding: 1rem;
  color: #c0392b !important;
  margin: 1rem 0;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.success-message {
  background: #e8f8f5 !important;
  border-left: 4px solid #27ae60;
  padding: 1rem;
  color: #27ae60 !important;
  margin: 1rem 0;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>