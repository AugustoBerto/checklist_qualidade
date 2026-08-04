const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');

// Configura o "transportador" de email usando SMTP
// Substitua com suas credenciais ou as de um serviço de email
const transporter = nodemailer.createTransport({
    host: '192.168.0.50',
    port: 6025,
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Envia um email com o PDF do relatório em anexo.
 * @param {Buffer} pdfBuffer - O conteúdo do PDF.
 * @param {string} destinatario - O email do destinatário.
 * @param {object} infoRelatorio - Contém dados como nome do usuário e modelo.
 */
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
        attachments: [
            {
                filename: nomeArquivo,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email enviado com sucesso: ' + info.response);
        return true;
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        return false;
    }
}

module.exports = { enviarRelatorioPorEmail };
