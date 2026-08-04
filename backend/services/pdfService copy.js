const puppeteer = require('puppeteer');

/**
 * Gera um PDF de uma URL.
 * @param {string} url - A URL da página do relatório no front-end.
 * @param {string} token - O token JWT para autenticar a requisição.
 */
async function gerarPdfDoRelatorio(url, token) {
    console.log(`Iniciando geração de PDF para a URL: ${url}`);
    let browser = null;
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            // REMOVA A LINHA ABAIXO, POIS O PUPPETEER USARÁ O CHROME QUE ELE MESMO BAIXAR
            // executablePath: '/usr/bin/chromium-browser', 
            protocolTimeout: 120000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        const page = await browser.newPage();

        // IMPORTANTE: Envia o token de autenticação para acessar a página protegida
        if (token) {
            await page.setExtraHTTPHeaders({
                'Authorization': `Bearer ${token}`
            });
        }

        // Navega para a página e espera a rede ficar ociosa
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Gera o PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
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
            await browser.close();
        }
    }
}

module.exports = { gerarPdfDoRelatorio };