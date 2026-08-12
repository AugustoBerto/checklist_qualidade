const test = require('node:test');
const assert = require('node:assert/strict');
const { _internals } = require('../controllers/ChecklistController');

const imagem = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString('base64')}`;
const perguntas = [{ id: 1 }, { id: 2 }];

test('aceita respostas completas e evidência Base64 válida', () => {
    assert.doesNotThrow(() => _internals.validarRespostas([
        { id_pergunta: 1, resposta: 'Conforme' },
        { id_pergunta: 2, resposta: 'Não Conforme', foto: imagem, observacao: 'Falha encontrada' },
    ], perguntas));
});

test('rejeita pergunta duplicada, enum inválido e não conformidade sem evidência', () => {
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Conforme' }, { id_pergunta: 1, resposta: 'N/A' }], perguntas));
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Outra' }, { id_pergunta: 2, resposta: 'N/A' }], perguntas));
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Conforme' }, { id_pergunta: 2, resposta: 'Não Conforme', observacao: 'Sem foto' }], perguntas));
});

test('rejeita imagem de formato ou conteúdo inválido', () => {
    assert.throws(() => _internals.base64ParaBuffer('data:image/gif;base64,AAAA', 1024, 'Foto'));
    assert.throws(() => _internals.base64ParaBuffer('data:image/png;base64,not-base64!', 1024, 'Foto'));
    assert.throws(() => _internals.base64ParaBuffer(`data:image/png;base64,${Buffer.from('texto').toString('base64')}`, 1024, 'Foto'));
});

test('retorna erro de limite para imagem acima do máximo', () => {
    const bytes = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(10)]);
    assert.throws(() => _internals.base64ParaBuffer(`data:image/png;base64,${bytes.toString('base64')}`, 8, 'Foto'), { message: /excede/ });
});
