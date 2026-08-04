<template>
    <div class="dashboard">
        <h1>Dashboard de Agendamentos</h1>

        <!-- Filtros -->
        <div class="filters">
            <div class="filter">
                <label>Setor</label>
                <VueSelect v-model="filtroSetor" :options="setores" label="nome" value-prop="id"
                    placeholder="Todos os setores" />
            </div>

            <div class="filter">
                <label>Período</label>
                <input type="month" v-model="filtroPeriodo" />
            </div>
        </div>

        <!-- Cards de KPI -->
        <div class="cards">
            <div class="card">
                <h3>Logo empresa</h3>
                <p>Imagem DASS</p>
            </div>
            <div class="card">
                <h3>Aferição geral checklist</h3>
                <h4>% conformidades</h4>
                <p>{{ totalPendentes }}</p>
            </div>
            <div class="card">
                <h3>Checklist Realizados</h3>
                <h4>un realizados</h4>
                <p>{{ totalRealizados }}</p>
            </div>
            <div class="card">
                <h3>Aderência Geral</h3>
                <h4>% realizadas/meta</h4>
                <p>{{ totalRealizados }}</p>
            </div>
        </div>

        <!-- Gráfico de barras -->
        <div class="grid-chart">
            <div class="chart">
                <ApexChart type="bar" :series="series" :options="chartOptions" height="350" />
            </div>
            <div class="chart">
                <ApexChart type="bar" :series="series" :options="chartOptions" height="350" />
            </div>
            <div class="chart">
                <ApexChart type="bar" :series="series" :options="chartOptions" height="350" />
            </div>
            <div class="chart">
                <ApexChart type="bar" :series="series" :options="chartOptions" height="350" />
            </div>
            <div class="chart">
                <ApexChart type="bar" :series="series" :options="chartOptions" height="350" />
            </div>
            <div class="chart">
                <ApexChart type="bar" :series="series" :options="chartOptions" height="350" />
            </div>
        </div>

    </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import VueSelect from 'vue3-select-component';
import ApexChart from 'vue3-apexcharts';


export default {
    components: { VueSelect, ApexChart },
    setup() {
        const setores = ref([]);
        const agendamentos = ref([]);

        const filtroSetor = ref(null);
        const filtroPeriodo = ref(null); // ex: "2025-08"

        // Carregar dados do backend
        onMounted(async () => {
            try {
                const resSetores = await axios.get("http://localhost:3000/setores");
                setores.value = resSetores.data;

                const resAgendamentos = await axios.get("http://localhost:3000/agendamentos");
                agendamentos.value = resAgendamentos.data;
            } catch (err) {
                console.error(err);
            }
        });

        // Dados filtrados
        const dadosFiltrados = computed(() => {
            return agendamentos.value.filter(a => {
                const matchSetor = !filtroSetor.value || a.id_setor === filtroSetor.value;
                const matchPeriodo = !filtroPeriodo.value || a.data_hora.startsWith(filtroPeriodo.value);
                return matchSetor && matchPeriodo;
            });
        });

        // KPI
        const totalAgendamentos = computed(() => dadosFiltrados.value.length);
        const totalPendentes = computed(() => dadosFiltrados.value.filter(a => a.status === 'pendente').length);
        const totalRealizados = computed(() => dadosFiltrados.value.filter(a => a.status === 'realizado').length);

        // Gráfico
        const series = computed(() => [{
            name: "Agendamentos",
            data: dadosFiltrados.value.map(a => a.id) // exemplo: contar por ID
        }]);

        const chartOptions = {
            chart: { id: "agendamentos-bar" },
            xaxis: {
                categories: dadosFiltrados.value.map(a => a.data_hora.slice(0, 10))
            },
            title: { text: "Agendamentos por dia" }
        };

        return {
            setores, filtroSetor, filtroPeriodo,
            totalAgendamentos, totalPendentes, totalRealizados,
            series, chartOptions
        };
    }
}
</script>

<style>
.dashboard {
    width: 100%;
    min-height: 100vh;
    margin: 2rem auto;
}

.filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
}

.filter {
    flex: 1;
}

.cards {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
}

.card {
    flex: 1;
    background: #fff;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
}

.grid-chart {
    display: grid;
    grid-template-columns: 1fr 1fr;
}

.chart {
    background: #fff;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
