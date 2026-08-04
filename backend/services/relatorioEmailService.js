const nodemailer = require('nodemailer');
const cron = require('node-cron');
const db = require('../db'); // Caminho para conexão com o banco
const ExcelJS = require('exceljs');

// ====================================================
// CONFIGURAÇÕES DE E-MAIL E SISTEMA
// ====================================================
const transporter = nodemailer.createTransport({
    host: '192.168.0.50',
    port: 6025,
    secure: false,
    tls: { rejectUnauthorized: false }
});

const URL_FRONTEND = process.env.EMAIL_LINK; // URL base para os links

// ====================================================
// FUNÇÃO 1: ENVIO INDIVIDUAL DO PDF (MANTIDA)
// ====================================================
async function enviarRelatorioPorEmail(pdfBuffer, destinatario, infoRelatorio) {
    const nomeArquivo = `Relatorio_${infoRelatorio.nomeModelo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;

    const mailOptions = {
        from: '"Sistema de Checklist" <automacao_checklist_lideranca@grupodass.com.br>',
        to: destinatario,
        subject: `Checklist Finalizado: ${infoRelatorio.nomeModelo} por ${infoRelatorio.nomeUsuario}`,
        html: `
            <p>Olá,</p>
            <p>Em anexo, segue o relatório do checklist <strong>${infoRelatorio.nomeModelo}</strong> preenchido por <strong>${infoRelatorio.nomeUsuario}</strong>.</p>
            <p>Atenciosamente,<br>Sistema de Automação.</p>
        `,
        attachments: [{ filename: nomeArquivo, content: pdfBuffer, contentType: 'application/pdf' }],
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email com PDF enviado com sucesso: ' + info.response);
        return true;
    } catch (error) {
        console.error('Erro ao enviar email com PDF:', error);
        return false;
    }
}

// ====================================================
// UTILITÁRIO: CALCULAR DATA DO RELATÓRIO
// ====================================================
const obterDataAlvo = () => {
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0 = Dom, 1 = Seg...
    const diasParaSubtrair = diaSemana === 1 ? 3 : 1; 
    hoje.setDate(hoje.getDate() - diasParaSubtrair);
    return hoje.toISOString().split('T')[0]; // Retorna YYYY-MM-DD
};

// ====================================================
// FUNÇÃO 2: RELATÓRIO GLOBAL (PUSH B.I.)
// ====================================================
async function enviarResumoDiarioGestores() {
    console.log('Iniciando geração do Relatório Global Diário...');
    const dataAlvo = obterDataAlvo();
    const dataFormatada = dataAlvo.split('-').reverse().join('/'); 

    // 📌 1. COMPILAÇÃO DE EMAILS FIXOS
    const EMAILS_FIXOS = [
        'bruno.pereira@grupodass.com.br',
        'rodrigo.bulegon@grupodass.com.br',
        'raianny.sousa@grupodass.com.br',
        'jose.valcifranio@grupodass.com.br',
        'andre.christmann@grupodass.com.br',
        'marcelo.caetano@grupodass.com.br',
        'antonio.castro@grupodass.com.br',
        'danilo.carneiro@grupodass.com.br',
        'larissa.martins@grupodass.com.br',
    ];

    try {
        // Busca também os administradores cadastrados diretamente no banco
        const adminsQuery = await db.query(`
            SELECT email FROM admin WHERE email IS NOT NULL AND email <> ''
            UNION
            SELECT email FROM usuarios WHERE nivelusuario = 0 AND email IS NOT NULL AND email <> ''
        `);
        const emailsBanco = adminsQuery.rows.map(r => r.email);

        // Mescla as listas e remove duplicatas
        const listaDestinatarios = [...new Set([...EMAILS_FIXOS, ...emailsBanco])];

        if (listaDestinatarios.length === 0) {
            return console.log('Nenhum destinatário configurado para o relatório global.');
        }

        // 📌 2. BUSCA DE LÍDERES + ÚLTIMA DATA E MODELO USADO (USANDO A NOVA VIEW)
        const funcionariosQuery = await db.query(`
            WITH UltimoRegistro AS (
                SELECT DISTINCT ON (UPPER(nome_usuario))
                    UPPER(nome_usuario) as nome_usuario_upper,
                    TO_CHAR(data_criacao, 'DD/MM/YYYY') as ultima_data,
                    nome_modelo as ultimo_modelo
                FROM metricas_atualizadas_tableau
                WHERE eh_ficticio = false AND nome_usuario IS NOT NULL
                ORDER BY UPPER(nome_usuario), data_criacao DESC
            ),
            ChecklistsHoje AS (
                -- Calcula a nota agrupando as perguntas do formulário
                SELECT 
                    UPPER(nome_usuario) as nome_usuario_upper,
                    intervalo,
                    eh_ficticio,
                    id_formulario,
                    ROUND(
                        SUM(CASE WHEN classificacao_pergunta = 'conforme' THEN 1 ELSE 0 END)::numeric / 
                        NULLIF(COUNT(*), 0) * 100, 0
                    ) as nota_do_checklist_inteiro
                FROM metricas_atualizadas_tableau
                WHERE data_criacao = $1
                GROUP BY id_formulario, UPPER(nome_usuario), intervalo, eh_ficticio
            )
            SELECT 
                u.id, 
                u.nome,
                u.email as email_gerente,
                MAX(CASE WHEN UPPER(v.intervalo) = 'ENTRADA' AND v.eh_ficticio = false THEN v.nota_do_checklist_inteiro ELSE NULL END) as nota_entrada,
                MAX(CASE WHEN UPPER(v.intervalo) = 'ENTRADA' AND v.eh_ficticio = false THEN v.id_formulario ELSE NULL END) as id_entrada,
                MAX(CASE WHEN UPPER(v.intervalo) = 'APÓS INTERVALO' AND v.eh_ficticio = false THEN v.nota_do_checklist_inteiro ELSE NULL END) as nota_intervalo,
                MAX(CASE WHEN UPPER(v.intervalo) = 'APÓS INTERVALO' AND v.eh_ficticio = false THEN v.id_formulario ELSE NULL END) as id_intervalo,
                ur.ultima_data,
                ur.ultimo_modelo
            FROM usuarios u
            LEFT JOIN ChecklistsHoje v ON UPPER(u.nome) = v.nome_usuario_upper
            LEFT JOIN UltimoRegistro ur ON UPPER(u.nome) = ur.nome_usuario_upper
            WHERE u.ativo IN (1, 2) AND u.nivelusuario IN (1, 2)
            GROUP BY u.id, u.nome, u.email, ur.ultima_data, ur.ultimo_modelo
            ORDER BY u.email, u.nome;
        `, [dataAlvo]);

        const funcionarios = funcionariosQuery.rows;
        if (funcionarios.length === 0) return console.log('Nenhum líder ativo para relatar no dia alvo.');

        // 📌 3. AGRUPAMENTO POR GERENTE
        const lideresPorGerente = {};
        funcionarios.forEach(f => {
            const gerente = f.email_gerente && f.email_gerente.trim() !== '' ? f.email_gerente : 'Sem Gerente Cadastrado';
            if (!lideresPorGerente[gerente]) {
                lideresPorGerente[gerente] = [];
            }
            lideresPorGerente[gerente].push(f);
        });

        // 📌 4. BUSCA AS MÉDIAS GERAIS DE MARCA/MODELO (USANDO A NOVA VIEW)
        const metricasGeraisQuery = await db.query(`
            WITH ScoresPorFormulario AS (
                SELECT 
                    id_formulario,
                    nome_marca,
                    nome_modelo,
                    ROUND(
                        SUM(CASE WHEN classificacao_pergunta = 'conforme' THEN 1 ELSE 0 END)::numeric / 
                        NULLIF(COUNT(*), 0) * 100, 0
                    ) as nota_do_checklist_inteiro
                FROM metricas_atualizadas_tableau
                WHERE data_criacao = $1 AND eh_ficticio = false
                GROUP BY id_formulario, nome_marca, nome_modelo
            )
            SELECT 
                nome_marca, 
                nome_modelo, 
                ROUND(AVG(nota_do_checklist_inteiro), 2) as media_nota,
                COUNT(DISTINCT id_formulario) as total_realizados
            FROM ScoresPorFormulario
            GROUP BY nome_marca, nome_modelo
            ORDER BY nome_marca, nome_modelo
        `, [dataAlvo]);
        
        const metricasGerais = metricasGeraisQuery.rows;

        // 📌 5. MONTAGEM DO HTML DO E-MAIL
        let htmlEmail = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 900px; margin: auto;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    📊 Relatório Global de Checklists - ${dataFormatada}
                </h2>
                <p style="font-size: 15px;">Olá, segue o consolidado das inspeções realizadas pelos líderes da fábrica no último turno.</p>
        `;

        // Monta a tabela para cada Gerente
        for (const [emailGerente, equipe] of Object.entries(lideresPorGerente)) {
            htmlEmail += `
                <div style="margin-top: 30px; background-color: #ecf0f1; padding: 10px; border-left: 5px solid #3498db; border-radius: 4px;">
                    <h4 style="margin: 0; color: #2980b9; font-size: 15px;">👥 Equipe do Gestor: <span style="color: #333;">${emailGerente}</span></h4>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; border: 1px solid #bdc3c7;">
                    <thead>
                        <tr style="background-color: #34495e; color: white; text-align: left;">
                            <th style="padding: 10px; border: 1px solid #bdc3c7; width: 25%;">Líder Responsável</th>
                            <th style="padding: 10px; border: 1px solid #bdc3c7; width: 35%;">Último Registro (Geral)</th>
                            <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: center; width: 20%;">Turno: Entrada</th>
                            <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: center; width: 20%;">Turno: Após Intervalo</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            equipe.forEach(f => {
                const linkEntrada = f.id_entrada ? `<a href="${URL_FRONTEND}/detalhe/${f.id_entrada}" style="font-size: 11px; color: #3498db; text-decoration: none; display: block; margin-top: 4px;">🔍 Ver Detalhe</a>` : '';
                const linkIntervalo = f.id_intervalo ? `<a href="${URL_FRONTEND}/detalhe/${f.id_intervalo}" style="font-size: 11px; color: #3498db; text-decoration: none; display: block; margin-top: 4px;">🔍 Ver Detalhe</a>` : '';

                const modeloAnterior = f.ultimo_modelo ? f.ultimo_modelo : 'Nenhum registro';
                const dataAnterior = f.ultima_data ? f.ultima_data : '--/--/----';
                const htmlUltimoRegistro = `
                    <span style="font-weight: bold; color: #2c3e50;">${modeloAnterior}</span><br>
                    <span style="font-size: 11px; color: #7f8c8d;">Data: ${dataAnterior}</span>
                `;

                let htmlEntrada = f.nota_entrada !== null 
                    ? `<strong style="color: ${f.nota_entrada == 100 ? '#27ae60' : '#e74c3c'}; font-size: 15px;">${f.nota_entrada}%</strong>${linkEntrada}`
                    : `<span style="color: #95a5a6; font-style: italic;">Não Realizado</span>`;

                let htmlIntervalo = f.nota_intervalo !== null 
                    ? `<strong style="color: ${f.nota_intervalo == 100 ? '#27ae60' : '#e74c3c'}; font-size: 15px;">${f.nota_intervalo}%</strong>${linkIntervalo}`
                    : `<span style="color: #95a5a6; font-style: italic;">Não Realizado</span>`;

                if (f.nota_entrada === null && f.nota_intervalo === null) {
                    htmlEntrada = `<div style="color: #c0392b; font-size: 12px; font-weight: bold; background: #fadbd8; padding: 4px; border-radius: 4px;">🚨 Omissão Diária</div>`;
                    htmlIntervalo = `<span style="color: #c0392b; font-weight: bold;">-</span>`;
                }

                htmlEmail += `
                    <tr style="border-bottom: 1px solid #ecf0f1;">
                        <td style="padding: 10px; border-right: 1px solid #ecf0f1;"><strong>${f.nome}</strong></td>
                        <td style="padding: 10px; border-right: 1px solid #ecf0f1; background-color: #fafbfc;">${htmlUltimoRegistro}</td>
                        <td style="padding: 10px; border-right: 1px solid #ecf0f1; text-align: center;">${htmlEntrada}</td>
                        <td style="padding: 10px; text-align: center;">${htmlIntervalo}</td>
                    </tr>
                `;
            });

            htmlEmail += `
                    </tbody>
                </table>
            `;
        }

        htmlEmail += `
                <h3 style="margin-top: 40px; color: #2c3e50; border-bottom: 1px solid #ecf0f1; padding-bottom: 8px;">📈 Média Geral por Marcas e Modelos</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #bdc3c7;">
                    <thead>
                        <tr style="background-color: #f8f9fa; color: #333; text-align: left;">
                            <th style="padding: 10px; border: 1px solid #bdc3c7;">Marca</th>
                            <th style="padding: 10px; border: 1px solid #bdc3c7;">Modelo</th>
                            <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">Nota Média</th>
                            <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">Total Realizado</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        metricasGerais.forEach(m => {
            let corNota = m.media_nota >= 90 ? '#27ae60' : (m.media_nota >= 70 ? '#f39c12' : '#e74c3c');
            htmlEmail += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ecf0f1;">${m.nome_marca || 'N/A'}</td>
                    <td style="padding: 10px; border: 1px solid #ecf0f1; font-weight: bold;">${m.nome_modelo}</td>
                    <td style="padding: 10px; border: 1px solid #ecf0f1; text-align: center; font-weight: bold; color: ${corNota}; font-size: 15px;">${m.media_nota}%</td>
                    <td style="padding: 10px; border: 1px solid #ecf0f1; text-align: center;">${m.total_realizados}</td>
                </tr>
            `;
        });

        htmlEmail += `
                    </tbody>
                </table>
                <div style="margin-top: 40px; padding-top: 10px; font-size: 11px; color: #95a5a6; text-align: center; border-top: 1px solid #ecf0f1;">
                    <p>Este é um e-mail automático do Motor de B.I. Dass.<br>Por favor, não responda a esta mensagem.</p>
                </div>
            </div>
        `;

        // 📌 6. DISPARO DO E-MAIL ÚNICO PARA TODOS (REPLY ALL)
        const destinatariosString = listaDestinatarios.join(', ');

        await transporter.sendMail({
            from: '"Inteligência Dass" <automacao_checklist_lideranca@grupodass.com.br>',
            to: destinatariosString,
            subject: `📊 Relatório Global de Checklists - ${dataFormatada}`,
            html: htmlEmail
        });

        console.log(`✅ Relatório global enviado com sucesso para a lista: ${destinatariosString}`);

    } catch (error) {
        console.error('❌ Erro na rotina de e-mails gerenciais:', error);
    }
}

// ====================================================
// FUNÇÃO 3: AGENDADOR CRON (Seg-Sex, 07h00)
// ====================================================
function iniciarAgendador() {
    cron.schedule('0 7 * * 1-5', () => {
        enviarResumoDiarioGestores();
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });
    console.log('⏰ CronJob Ativado: Relatório Global agendado para 07:00 (Seg-Sex).');
}

function obterSemanaAnterior() {
    const hoje = new Date();
    const diaSemana = hoje.getDay(); 
    
    const diasParaSegundaPassada = diaSemana === 0 ? 6 : diaSemana + 6;
    const segundaPassada = new Date(hoje);
    segundaPassada.setDate(hoje.getDate() - diasParaSegundaPassada);

    const domingoPassado = new Date(segundaPassada);
    domingoPassado.setDate(segundaPassada.getDate() + 6);

    const formatarData = (d) => d.toISOString().split('T')[0];

    return {
        inicio: formatarData(segundaPassada),
        fim: formatarData(domingoPassado),
        inicioStr: segundaPassada.toLocaleDateString('pt-BR'),
        fimStr: domingoPassado.toLocaleDateString('pt-BR')
    };
}

async function enviarResumoSemanalGestores() {
    console.log('Iniciando geração do Relatório Global Semanal com Excel...');
    const semana = obterSemanaAnterior();

    const EMAILS_FIXOS = [
        'bruno.pereira@grupodass.com.br',
        'rodrigo.bulegon@grupodass.com.br',
        'raianny.sousa@grupodass.com.br',
        'jose.valcifranio@grupodass.com.br',
        'andre.christmann@grupodass.com.br',
        'marcelo.caetano@grupodass.com.br',
        'antonio.castro@grupodass.com.br',
        'danilo.carneiro@grupodass.com.br',
        'larissa.martins@grupodass.com.br',
    ];

    try {
        // Busca também os administradores cadastrados diretamente no banco
        const adminsQuery = await db.query(`
            SELECT email FROM admin WHERE email IS NOT NULL AND email <> ''
            UNION
            SELECT email FROM usuarios WHERE nivelusuario = 0 AND email IS NOT NULL AND email <> ''
        `);
        const emailsBanco = adminsQuery.rows.map(r => r.email);

        // Mescla as listas e remove duplicatas
        const listaDestinatarios = [...new Set([...EMAILS_FIXOS, ...emailsBanco])];

        if (listaDestinatarios.length === 0) {
            return console.log('Nenhum destinatário configurado para o relatório global.');
        }

   
        const funcionariosQuery = await db.query(`
            WITH ChecklistsSemana AS (
                SELECT 
                    UPPER(nome_usuario) as nome_usuario_upper,
                    TO_CHAR(data_criacao, 'DD/MM/YYYY') as data_formatada,
                    data_criacao,
                    data_e_horario,
                    TO_CHAR(data_e_horario, 'HH24:MI') as hora_formatada,
                    intervalo,
                    eh_ficticio,
                    id_formulario,
                    nome_modelo,
                    ROUND(
                        SUM(CASE WHEN classificacao_pergunta = 'conforme' THEN 1 ELSE 0 END)::numeric / 
                        NULLIF(COUNT(*), 0) * 100, 0
                    ) as nota_do_checklist_inteiro
                FROM metricas_atualizadas_tableau
                WHERE data_criacao >= $1 AND data_criacao <= $2
                GROUP BY id_formulario, UPPER(nome_usuario), data_criacao, data_e_horario, intervalo, eh_ficticio, nome_modelo
            )
            SELECT 
                u.id, 
                u.nome,
                u.email as email_gerente,
                u.nivelusuario,
                cs.data_formatada,
                cs.data_criacao,
                cs.hora_formatada,
                cs.intervalo,
                cs.eh_ficticio,
                cs.id_formulario,
                cs.nome_modelo,
                cs.nota_do_checklist_inteiro
            FROM usuarios u
            JOIN ChecklistsSemana cs ON UPPER(u.nome) = cs.nome_usuario_upper
            WHERE u.ativo IN (1, 2) AND u.nivelusuario IN (1, 2)
            ORDER BY u.email, u.nome, cs.data_criacao ASC, cs.data_e_horario ASC;
        `, [semana.inicio, semana.fim]);

        const funcionarios = funcionariosQuery.rows;
        if (funcionarios.length === 0) return console.log('Nenhum dado encontrado para a semana especificada.');

        // 📌 AGRUPAMENTO E TRATAMENTO DE FICTÍCIOS
        const lideresPorGerente = {};
        
        funcionarios.forEach(f => {
            if (f.nivelusuario === 2 && f.eh_ficticio) return;

            const gerente = f.email_gerente && f.email_gerente.trim() !== '' ? f.email_gerente : 'Sem Gerente Cadastrado';
            const lider = f.nome;
            const data = f.data_formatada;

            if (!lideresPorGerente[gerente]) lideresPorGerente[gerente] = {};
            if (!lideresPorGerente[gerente][lider]) {
                lideresPorGerente[gerente][lider] = { nivel: f.nivelusuario, dias: {} };
            }
            if (!lideresPorGerente[gerente][lider].dias[data]) {
                lideresPorGerente[gerente][lider].dias[data] = { reais: [], ficticios: [] };
            }

            if (f.eh_ficticio) {
                lideresPorGerente[gerente][lider].dias[data].ficticios.push(f);
            } else {
                lideresPorGerente[gerente][lider].dias[data].reais.push(f);
            }
        });

        for (const gerente in lideresPorGerente) {
            for (const lider in lideresPorGerente[gerente]) {
                const dadosUser = lideresPorGerente[gerente][lider];

                if (dadosUser.nivel === 1) { 
                    for (const data in dadosUser.dias) {
                        const dia = dadosUser.dias[data];
                        let modeloAncora = dia.reais.length > 0 ? dia.reais[0].nome_modelo : 'Nenhum Checklist Realizado';

                        dia.ficticios.forEach(f => {
                            f.nome_modelo = modeloAncora;
                            dia.reais.push(f); 
                        });

                        const agrupadoPorModelo = {};
                        dia.reais.forEach(f => {
                            const mod = f.nome_modelo || 'N/A';
                            if (!agrupadoPorModelo[mod]) {
                                agrupadoPorModelo[mod] = { 'Entrada': [], 'Após Intervalo': [], 'Fora de Horário': [] };
                            }
                            const intv = f.intervalo === 'Entrada' ? 'Entrada' : 
                                         f.intervalo === 'Após Intervalo' ? 'Após Intervalo' : 'Fora de Horário';
                            agrupadoPorModelo[mod][intv].push(f);
                        });

                        dadosUser.dias[data].modelosAgrupados = agrupadoPorModelo;
                    }
                } else { 
                    for (const data in dadosUser.dias) {
                        dadosUser.dias[data].listaFinal = dadosUser.dias[data].reais;
                    }
                }
            }
        }

        // =========================================================
        // 📊 CONSTRUÇÃO DO EXCEL (EXCELJS)
        // =========================================================
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Inteligência Dass';
        workbook.created = new Date();

        // --- ABA 1: LÍDERES ---
        const wsLideres = workbook.addWorksheet('Relatório - Líderes');
        wsLideres.columns = [
            { header: 'Gerente / Gestor', key: 'gerente', width: 35 },
            { header: 'Líder Responsável', key: 'lider', width: 25 },
            { header: 'Data', key: 'data', width: 15 },
            { header: 'Modelo Avaliado', key: 'modelo', width: 30 },
            { header: 'Entrada', key: 'entrada', width: 20 },
            { header: 'Após Intervalo', key: 'intervalo', width: 20 },
            { header: 'Fora de Horário', key: 'fora', width: 20 }
        ];

        wsLideres.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        wsLideres.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        wsLideres.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // --- ABA 2: INSPETORES ---
        const wsInspetores = workbook.addWorksheet('Relatório - Inspetores');
        wsInspetores.columns = [
            { header: 'Gerente / Gestor', key: 'gerente', width: 35 },
            { header: 'Inspetor Responsável', key: 'inspetor', width: 25 },
            { header: 'Data', key: 'data', width: 15 },
            { header: 'Modelo Avaliado', key: 'modelo', width: 30 },
            { header: 'Horário', key: 'horario', width: 15 },
            { header: 'Nota', key: 'nota', width: 15 }
        ];

        wsInspetores.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        wsInspetores.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A085' } };
        wsInspetores.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Helper para mapear os dados nas células do Excel
        const getTextForExcel = (forms) => {
            if (!forms || forms.length === 0) return '-';
            // Para o excel, vamos apenas listar a nota e a hora, se empilhados separar por vírgula
            return forms.map(f => f.eh_ficticio ? 'Faltante' : `${f.nota_do_checklist_inteiro}% (${f.hora_formatada})`).join(' | ');
        };

        // Popular dados nas Abas
        for (const [emailGerente, lideres] of Object.entries(lideresPorGerente)) {
            for (const [nomeUsuario, dadosUser] of Object.entries(lideres)) {
                
                if (dadosUser.nivel === 1) { // Líderes
                    for (const [dataForm, diaObj] of Object.entries(dadosUser.dias)) {
                        for (const [nomeModelo, intervalos] of Object.entries(diaObj.modelosAgrupados || {})) {
                            const row = wsLideres.addRow({
                                gerente: emailGerente,
                                lider: nomeUsuario,
                                data: dataForm,
                                modelo: nomeModelo,
                                entrada: getTextForExcel(intervalos['Entrada']),
                                intervalo: getTextForExcel(intervalos['Após Intervalo']),
                                fora: getTextForExcel(intervalos['Fora de Horário'])
                            });

                            // Pinta as células de "Faltante" de vermelho para destaque gerencial
                            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                                cell.alignment = { vertical: 'middle', horizontal: colNumber > 4 ? 'center' : 'left' };
                                if (cell.value && cell.value.toString().includes('Faltante')) {
                                    cell.font = { color: { argb: 'FFC0392B' }, bold: true };
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBDE' } };
                                }
                            });
                        }
                    }
                } else { // Inspetores
                    for (const [dataForm, diaObj] of Object.entries(dadosUser.dias)) {
                        const registros = diaObj.listaFinal || [];
                        registros.forEach(form => {
                            const row = wsInspetores.addRow({
                                gerente: emailGerente,
                                inspetor: nomeUsuario,
                                data: dataForm,
                                modelo: form.nome_modelo,
                                horario: form.hora_formatada,
                                nota: `${form.nota_do_checklist_inteiro}%`
                            });

                            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                                cell.alignment = { vertical: 'middle', horizontal: colNumber > 4 ? 'center' : 'left' };
                            });
                        });
                    }
                }
            }
        }

        // Gera o buffer da planilha na memória RAM (sem salvar no HD)
        const excelBuffer = await workbook.xlsx.writeBuffer();

        // =========================================================
        // CORPO HTML BÁSICO (Para não deixar o e-mail vazio)
        // =========================================================
        const htmlEmail = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ecf0f1; border-radius: 8px; padding: 20px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    📊 Relatório Global Semanal de Checklists
                </h2>
                <p style="font-size: 15px;">Período avaliado: <strong>${semana.inicioStr} a ${semana.fimStr}</strong></p>
                <p style="font-size: 15px; color: #555;">Olá, a auditoria e as medições de toda a equipe foram compiladas com sucesso.</p>
                
                <div style="background-color: #f8f9fa; border-left: 5px solid #27ae60; padding: 15px; margin-top: 20px; border-radius: 4px;">
                    <strong style="color: #27ae60; font-size: 16px;">📥 Planilha Gerencial Disponível</strong>
                    <p style="margin: 8px 0 0 0; font-size: 14px;">Para facilitar a filtragem, agrupamento e análise dinâmica de todas as atividades, enviamos em anexo a planilha consolidada.</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Líderes</strong> e <strong>Inspetores</strong> já se encontram devidamente separados em abas individuais no documento.</p>
                </div>

                <div style="margin-top: 40px; padding-top: 10px; font-size: 11px; color: #95a5a6; text-align: center; border-top: 1px solid #ecf0f1;">
                    <p>Este é um e-mail automático do Motor de B.I. Dass.<br>Por favor, não responda a esta mensagem.</p>
                </div>
            </div>
        `;

        // 📌 DISPARO DO E-MAIL (Com Anexo)
        const destinatariosString = listaDestinatarios.join(', ');

        await transporter.sendMail({
            from: '"Inteligência Dass" <automacao_checklist_lideranca@grupodass.com.br>',
            to: destinatariosString,
            subject: `📊 Relatório Global Semanal de Checklists (${semana.inicioStr} a ${semana.fimStr})`,
            html: htmlEmail,
            attachments: [
                {
                    // Formata um nome descritivo bonito: Relatorio_Semanal_18-05-2026_a_24-05-2026.xlsx
                    filename: `Relatorio_Semanal_${semana.inicioStr.replace(/\//g, '-')}_a_${semana.fimStr.replace(/\//g, '-')}.xlsx`,
                    content: excelBuffer,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            ]
        });

        console.log(`✅ Relatório semanal Excel enviado com sucesso para: ${destinatariosString}`);

    } catch (error) {
        console.error('❌ Erro na rotina de e-mails gerenciais semanais:', error);
    }
}

module.exports = { 
    enviarRelatorioPorEmail, 
    enviarResumoDiarioGestores, 
    iniciarAgendador,
    enviarResumoSemanalGestores,
    obterSemanaAnterior
};

