const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
/**
 * Gera um PDF de uma URL ou de um HTML direto.
 * @param {string} conteudo - A URL da página ou a string HTML pura.
 * @param {string} token - O token JWT para autenticar a requisição (se for URL).
 * @param {boolean} isHtml - Define se o conteúdo passado é um HTML direto em vez de URL.
 */
async function gerarPdfDoRelatorio(conteudo, token = null, isHtml = false) {
    console.log(`Iniciando geração de PDF... (isHtml: ${isHtml})`);
    let browser = null; // Escopo global da função
    
    try {
        // 📌 CORREÇÃO: Removido o 'const' para que o browser possa ser fechado no finally
        browser = await puppeteer.launch({
            headless: 'new',
            protocolTimeout: 120000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();

        if (isHtml) {
            // Se for HTML, injeta o código direto na página em branco
            await page.setContent(conteudo, { waitUntil: 'networkidle0' });
        } else {
            // Se for URL, navega até ela (mantendo a sua lógica original de Token)
            if (token) {
                await page.setExtraHTTPHeaders({
                    'Authorization': `Bearer ${token}`
                });
            }
            await page.goto(conteudo, { waitUntil: 'networkidle0' });
        }

        // Gera o PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true, // 📌 Relatórios com muitas colunas ficam melhores na horizontal
            printBackground: true,
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
        });

        console.log('PDF gerado com sucesso.');
        return pdfBuffer;
    } catch (error) {
        console.error('Erro ao gerar PDF com Puppeteer:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close(); // Agora sim o Chrome será encerrado corretamente!
        }
    }
}

module.exports = { gerarPdfDoRelatorio };