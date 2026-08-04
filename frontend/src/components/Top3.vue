<template>
  <div class="card">
    <h3>Top 5 Modelos com Não Conformidades</h3>
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { io } from 'socket.io-client';

const chartRef = ref(null);
let myChart = null;

// Conecta ao servidor WebSocket
const socket = io('http://localhost:3000'); // URL do seu back-end

const inicializarGrafico = () => {
  if (chartRef.value) {
    myChart = echarts.init(chartRef.value);
  }
};

const atualizarGrafico = (dadosRanking) => {
  if (!myChart) return;

  // ECharts espera que os dados sejam invertidos para um ranking horizontal
  const categorias = dadosRanking.map(item => item.nome_modelo).reverse();
  const valores = dadosRanking.map(item => item.total_nao_conforme).reverse();

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', boundaryGap: [0, 0.01] },
    yAxis: {
      type: 'category',
      data: categorias
    },
    series: [{
      name: 'Não Conformidades',
      type: 'bar',
      data: valores,
      itemStyle: {
        borderRadius: [0, 5, 5, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#F56C6C' },
          { offset: 1, color: '#fcd9d9' }
        ])
      }
    }]
  };
  myChart.setOption(option);
};

onMounted(() => {
  inicializarGrafico();

  // "Escuta" o evento enviado pelo servidor
  socket.on('atualizar-ranking', (dados) => {
    console.log('Novos dados de ranking recebidos:', dados);
    atualizarGrafico(dados);
  });

  // Pede os dados iniciais ao se conectar (opcional mas recomendado)
  // Para isso, você precisaria adicionar no back-end um evento para responder a este pedido.
  // socket.emit('obter-ranking-inicial'); 
});

onUnmounted(() => {
  // Desconecta o socket para evitar memory leaks
  socket.disconnect();
  if (myChart) {
    myChart.dispose();
  }
});
</script>

<style scoped>
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-weight: 500;
  color: #34495e;
}
.chart {
  width: 100%;
  height: 300px;
}
</style>