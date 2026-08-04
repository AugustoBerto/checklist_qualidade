<template>
    <div class="analise-wrapper">
        <div class="cabecalho-analise">
            <div class="cabecalho-centro">
                <div v-if="props.usuario" class="usuario-detalhes">
                    <span><strong>Colaborador:</strong> {{ props.usuario.nome }}</span>
                    <span><strong>Turno:</strong> {{ props.usuario.turno || 'N/A' }}</span>
                    <span><strong>Setor:</strong> {{ props.usuario.setor || 'N/A' }}</span>
                    <span v-if="modeloChecklistAtual"><strong>Modelo:</strong> {{ modeloChecklistAtual }}</span>
                </div>
            </div>
        </div>

        <div v-if="semDadosDeGrafico" class="no-data-message-inline">Nenhum checklist encontrado para este colaborador
            hoje.</div>
        <div v-else class="charts-wrapper">
            <div class="chart-container-inline">
                <div ref="chartEntradaRef" class="chart"></div>
            </div>
            <div class="chart-container-inline">
                <div ref="chartVoltaRef" class="chart"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, getCurrentInstance } from 'vue';
import axios from 'axios';
import * as echarts from 'echarts';

const { proxy } = getCurrentInstance();
const apiUrl = proxy.$apiUrl;
const API_ANALISE_BASE = `${apiUrl}/api/analise`;

// Define as 'props' que este componente recebe do pai
const props = defineProps({
    usuario: {
        type: Object,
        required: true
    }
});

// Estado interno do componente, agora mais enxuto
const modeloChecklistAtual = ref('');
const semDadosDeGrafico = ref(false);

const chartEntradaRef = ref(null);
const chartVoltaRef = ref(null);
let chartEntradaInstance = null;
let chartVoltaInstance = null;

// Função especialista em buscar e desenhar os gráficos
const fetchAndDrawCharts = async (userId) => {
    if (!chartEntradaInstance || !chartVoltaInstance) return;

    chartEntradaInstance.showLoading();
    chartVoltaInstance.showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_ANALISE_BASE}/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const analise = res.data;

        modeloChecklistAtual.value = analise.modelo_realizado || '';

        const dadosEntrada = analise.entrada?.dadosGraficoPontuacao || [];
        const dadosVolta = analise.volta_intervalo?.dadosGraficoPontuacao || [];

        semDadosDeGrafico.value = dadosEntrada.length === 0 && dadosVolta.length === 0;

        const getChartOptions = (data, title) => ({
            title: { text: title, left: 'center', top: 5, textStyle: { color: '#a0aec0', fontSize: 16 } },
            animation: true,
            animationDurationUpdate: 750,
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            series: [{
                type: 'pie',
                radius: ['45%', '70%'],
                center: ['50%', '55%'],
                label: { show: true, position: 'inside', formatter: '{d}%', color: '#fff', fontSize: 14, fontWeight: 'bold' },
                itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
                data: data.length > 0 ? data : [{ value: 1, name: 'Sem Dados', itemStyle: { color: '#4a5568' } }]
            }]
        });

        chartEntradaInstance.setOption(getChartOptions(dadosEntrada, 'Entrada'));
        chartVoltaInstance.setOption(getChartOptions(dadosVolta, 'Volta do Intervalo'));

        await nextTick();
        chartEntradaInstance.resize();
        chartVoltaInstance.resize();

    } catch (err) {
        console.error(`Falha ao buscar análise para o usuário ${userId}:`, err);
        semDadosDeGrafico.value = true;
    } finally {
        chartEntradaInstance.hideLoading();
        chartVoltaInstance.hideLoading();
    }
};

// Observador que reage à mudança de usuário
watch(() => props.usuario, (newUsuario) => {
    if (newUsuario && newUsuario.id) {
        fetchAndDrawCharts(newUsuario.id);
    }
}, {
    immediate: true // Executa imediatamente quando o componente é criado
});

// Ciclo de vida: cria e destrói os gráficos
onMounted(() => {
    if (chartEntradaRef.value) chartEntradaInstance = echarts.init(chartEntradaRef.value);
    if (chartVoltaRef.value) chartVoltaInstance = echarts.init(chartVoltaRef.value);

    const resizeHandler = () => {
        chartEntradaInstance?.resize();
        chartVoltaInstance?.resize();
    };
    window.addEventListener('resize', resizeHandler);

    // Limpa o listener quando o componente é destruído
    onUnmounted(() => {
        window.removeEventListener('resize', resizeHandler);
    });
});

onUnmounted(() => {
    chartEntradaInstance?.dispose();
    chartVoltaInstance?.dispose();
});
</script>

<style scoped>
/* Estilos específicos para este componente */
.analise-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.cabecalho-analise {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    background-color: #2c3649;
    flex-shrink: 0;
}

.usuario-detalhes {
    display: flex;
    gap: 20px;
    font-size: 1.2rem;
    color: #edf2f7;
    flex-wrap: wrap;
    justify-content: center;
}

.usuario-detalhes strong {
    color: #a0aec0;
}

.charts-wrapper {
    display: flex;
    flex-grow: 1;
    gap: 2rem;
    min-height: 0;
}

.chart-container-inline {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 0;
}

.chart {
    width: 100%;
    height: 100%;
    min-height: 250px;
}

.no-data-message-inline {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a0aec0;
    font-style: italic;
    font-size: 1.5rem;
}
</style>