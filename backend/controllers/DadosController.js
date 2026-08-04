const db = require('../db');
const { gerarPdfDoRelatorio } = require('../services/pdfService.js');
const html_to_pdf = require('html-pdf-node');



// Lista todas as marcas (para popular dropdowns)
exports.listarMarcas = async (req, res) => {
    try {
        const result = await db.query('SELECT id, nome FROM marcas ORDER BY nome ASC');
        res.status(200).json({ sucesso: true, marcas: result.rows });
    } catch (error) {
        console.error('Erro ao buscar marcas:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar marcas.' });
    }
};

// 📌 NOVO: Lista os turnos disponíveis (Para o dropdown de cadastro de Usuários)
exports.listarTurnos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, nome, entrada_inicio, entrada_fim, intervalo_inicio, intervalo_fim 
            FROM turnos 
            ORDER BY id ASC
        `);
        res.status(200).json({ sucesso: true, turnos: result.rows });
    } catch (error) {
        console.error('Erro ao buscar turnos:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar turnos.' });
    }
};

// 📌 ATUALIZADO: Lista apenas modelos ATIVOS (filtrados por marca e/ou setor)
exports.listarModelosAtivos = async (req, res) => {
    try {
        const { marca_id, setor_id } = req.query;

        // Inicia a query pegando apenas os ativos
        let query = 'SELECT id, nome, marca, id_setor_fk FROM modelo WHERE ativo = true';
        let values = [];
        let paramIndex = 1;

        if (marca_id) {
            query += ` AND marca = $${paramIndex}`;
            values.push(marca_id);
            paramIndex++;
        }

        if (setor_id) {
            query += ` AND id_setor_fk = $${paramIndex}`;
            values.push(setor_id);
            paramIndex++;
        }

        query += ' ORDER BY nome ASC';

        const result = await db.query(query, values);
        res.status(200).json({ sucesso: true, modelos: result.rows });
        
    } catch (error) {
        console.error('Erro ao buscar modelos ativos:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar modelos.' });
    }
};

exports.gerarPdfLideranca2026 = async (req, res) => {
    try {
        // 1. Busca os dados da View atualizada
        const result = await db.query('SELECT * FROM vw_extracao_excel_lideres_2026');
        const dados = result.rows;

        // 2. Constrói as linhas da tabela dinamicamente
        let linhasHtml = '';
        dados.forEach(row => {
            const notaRealClass = row.media_notas_apenas_realizados >= 90 ? 'high' : 'med';
            const notaPenalClass = row.media_notas_geral_com_faltas >= 90 ? 'high' : (row.media_notas_geral_com_faltas >= 75 ? 'med' : 'low');
            const assiduidadeClass = row.percentual_assiduidade >= 90 ? 'high' : (row.percentual_assiduidade >= 75 ? 'med' : 'low');

            linhasHtml += `
            <tr>
                <td>
                    <span class="leader-name">${row.lider_responsavel}</span><br>
                    <span class="tag-setor">${row.setor || 'N/A'} - ${row.celula || 'N/A'}</span>
                </td>
                <td><strong>${row.marca_celula || 'N/A'}</strong></td>
                <td style="text-align: center;">${row.data_inicio_2026 || '--/--/----'}</td>
                <td style="text-align: center;"><strong>${row.meta_esperada_checklists}</strong></td>
                <td style="text-align: center;">${row.total_checklists_realizados} / <span style="color: #ef4444;">${row.total_checklists_omitidos}</span></td>
                <td style="text-align: center;"><span class="score-pill ${notaRealClass}">${row.media_notas_apenas_realizados}%</span></td>
                <td style="text-align: center;"><span class="score-pill ${notaPenalClass}">${row.media_notas_geral_com_faltas}%</span></td>
                <td style="text-align: center;"><span class="score-pill ${assiduidadeClass}">${row.percentual_assiduidade}%</span></td>
                <td style="text-align: right; color: #64748b;">${row.ultima_interacao || 'Sem Reg.'}</td>
            </tr>`;
        });

        // 3. Template HTML / CSS Estilizado com Glossário
        const conteudoHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #334155; margin: 0; padding: 0; line-height: 1.2; }
                .header-banner { background-color: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 15px; }
                .header-banner h1 { margin: 0; font-size: 22px; letter-spacing: -0.5px; }
                .report-meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                th { background-color: #f8fafc; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 9px; padding: 10px 8px; border-bottom: 2px solid #e2e8f0; text-align: left; }
                td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; vertical-align: middle; }
                
                .leader-name { font-weight: bold; color: #0f172a; font-size: 11px; }
                .tag-setor { font-size: 9px; color: #64748b; }
                .score-pill { padding: 3px 7px; border-radius: 10px; font-weight: bold; font-size: 9px; display: inline-block; }
                .high { background-color: #dcfce7; color: #166534; }
                .med { background-color: #fef9c3; color: #854d0e; }
                .low { background-color: #fee2e2; color: #991b1b; }

                /* 📌 Estilo da Seção de Observações (Cálculos) */
                .observacoes-container { margin-top: 30px; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; page-break-inside: avoid; }
                .observacoes-container h3 { margin: 0 0 10px 0; font-size: 12px; color: #1e293b; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
                .calc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .calc-item { font-size: 9px; color: #475569; }
                .calc-item strong { color: #1e293b; display: block; margin-bottom: 2px; }

                .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8px; color: #94a3b8; padding-top: 5px; border-top: 1px solid #f1f5f9; }
            </style>
        </head>
        <body>
            <div class="header-banner">
                <h1>Relatório de Performance de Liderança 2026</h1>
                <p>Análise de Qualidade, Engajamento e Assiduidade Operacional</p>
            </div>

            <div class="report-meta">
                <span>Gerado em: ${new Date().toLocaleString('pt-BR')}</span>
                <span>Filtro Aplicado: Ano de Exercício 2026</span>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Líder / Célula</th>
                        <th>Marca</th>
                        <th style="text-align: center;">Início 2026</th>
                        <th style="text-align: center;">Meta</th>
                        <th style="text-align: center;">Real / Omit</th>
                        <th style="text-align: center;">Média Real</th>
                        <th style="text-align: center;">Nota Penalizada</th>
                        <th style="text-align: center;">Assiduidade</th>
                        <th style="text-align: right;">Último Envio</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasHtml}
                </tbody>
            </table>

            <div class="observacoes-container">
                <h3>📖 Glossário e Metodologia de Cálculo</h3>
                <div class="calc-grid">
                    <div class="calc-item">
                        <strong>1. Nota por Categoria:</strong>
                        Aplica-se tolerância zero. Se uma categoria possuir 1 ou mais itens "Não Conforme", a nota da categoria é 0. Apenas categorias 100% conformes (ou N/A) pontuam 1.
                    </div>
                    <div class="calc-item">
                        <strong>2. Meta Esperada:</strong>
                        Calculada com base em 2 checklists por dia útil (Segunda a Sexta), desde a data de início do líder em 2026 até a data atual.
                    </div>
                    <div class="calc-item">
                        <strong>3. Média Real vs. Penalizada:</strong>
                        A Média Real considera apenas os envios feitos. A Nota Penalizada atribui peso 0 para cada checklist omitido (não realizado), impactando diretamente o score de performance.
                    </div>
                    <div class="calc-item">
                        <strong>4. Assiduidade:</strong>
                        Representa o percentual de cumprimento da meta diária. Considera-se apenas 1 registro válido por turno (Entrada / Após Intervalo) para evitar duplicidades.
                    </div>
                </div>
            </div>

            <div class="footer">
                Documento Oficial de Auditoria Interna - Sistema de Checklist Dass Itapipoca.
            </div>
        </body>
        </html>
        `;

        const pdfBuffer = await gerarPdfDoRelatorio(conteudoHtml, null, true);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Relatorio_Executivo_Lideres_2026.pdf"');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Erro ao gerar PDF da Liderança:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao gerar PDF.' });
    }
};