/**
 * Analisa um conjunto de respostas agrupadas por categoria e retorna a contagem de status.
 * Precedência: Não Conforme > Não Preenchido > N/A > Conforme
 * @param {object} dadosAgrupados - Objeto com categorias como chaves e arrays de respostas como valores.
 * @returns {object} - Objeto com a contagem de cada estado: { total_C, total_NC, total_NP, total_NA }
 */

function calcularPontuacao(dadosAgrupados) {
    let total_C = 0, total_NC = 0, total_NP = 0, total_NA = 0;

    for (const categoria in dadosAgrupados) {
        let estado_categoria = 'Conforme'; // Estado padrão da categoria

        // O array pode ser de objetos {resposta: '...'} ou de strings '...'
        const respostas = dadosAgrupados[categoria];

        for (const item of respostas) {
            // Normaliza a resposta, seja ela uma string ou um objeto
            const resposta = (typeof item === 'string' ? item : item.resposta || '').trim().toLowerCase();

            if (resposta === 'não conforme') {
                estado_categoria = 'Não Conforme';
                break; // 'Não Conforme' tem a maior prioridade e para a verificação da categoria.
            }
            if (resposta === 'não preenchido') {
                estado_categoria = 'Não Preenchido';
            }
            if (resposta === 'n/a' && estado_categoria === 'Conforme') {
                estado_categoria = 'N/A'; // 'N/A' só sobrescreve 'Conforme'.
            }
        }
        
        switch (estado_categoria) {
            case 'Conforme': total_C++; break;
            case 'Não Conforme': total_NC++; break;
            case 'Não Preenchido': total_NP++; break;
            case 'N/A': total_NA++; break;
        }
    }

    return { total_C, total_NC, total_NP, total_NA };
}
function normalizarResposta(resposta) {
    if (!resposta) return '';
    return resposta.trim().toLowerCase();
}
module.exports = { calcularPontuacao, normalizarResposta };
