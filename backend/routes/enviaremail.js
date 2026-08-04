const express = require('express');
const router = express.Router();
const autorizar = require('../middlewares/auth');
const pool = require('../db');
const { gerarPdfDoRelatorio } = require('../services/pdfService');
const { enviarRelatorioPorEmail } = require('../services/emailService');

// POST /api/relatorios/:id/enviar-email
router.post('/:id', autorizar(['usuario', 'admin']), async (req, res) => {
    const { id } = req.params;
    const token = req.headers['authorization']?.split(' ')[1];

    // URL completa da sua página de relatório no front-end
    const urlRelatorio = `http://10.111.0.101:5170/detalhe/${id}`;
    const sqlBuscaDados = `
            SELECT 
                u.email,
                fr.nome_usuario,
                fr.nome_modelo
            FROM usuarios u
            JOIN formulario fr ON u.nome = fr.nome_usuario
            WHERE fr.id_formulario = $1
            LIMIT 1;
        `;

        const resultado = await pool.query(sqlBuscaDados, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Não foi possível encontrar dados do usuário ou do modelo para este relatório.' });
        }

        const dadosDoBanco = resultado.rows[0];
        
        // 2. USA OS DADOS DO BANCO EM VEZ DE DADOS FIXOS OU DO req.body
        const destinatario = dadosDoBanco.email;
    const infoRelatorio = {
        nomeModelo: req.body.nomeModelo || 'N/A',
        nomeUsuario: req.body.nomeUsuario || 'N/A'
    };

    try {
        // Gera o PDF em segundo plano
        gerarPdfDoRelatorio(urlRelatorio, token)
            .then(pdfBuffer => {
                // Quando o PDF estiver pronto, envia o email
                enviarRelatorioPorEmail(pdfBuffer, destinatario, infoRelatorio);
            })
            .catch(err => {
                console.error("Falha no processo de geração de PDF e envio de email:", err);
            });
            
        // Responde IMEDIATAMENTE ao front-end para não deixá-lo esperando
        res.status(202).json({ 
            sucesso: true, 
            mensagem: 'O relatório está sendo processado e será enviado por email em breve.' 
        });

    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao iniciar o envio do email.' });
    }
});

module.exports = router;
