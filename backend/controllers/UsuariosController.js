const db = require('../db');
const bcrypt = require('bcrypt');

exports.listarUsuarios = async (req, res) => {
    try {
        const sql = `
            SELECT 
                u.id, 
                u.nome, 
                u.email, 
                u.ativo, 
                u.funcao, 
                u.nivelusuario, 
                u."codBar" as cracha,
                u.id_unidade_fk, 
                u.id_setor_fk, 
                u.id_celula_fk, 
                u.id_turno_fk,
                un.nome as nome_unidade,
                s.nome as nome_setor, 
                cp.nome as nome_celula, 
                t.nome as nome_turno,
                'usuario' AS origem 
            FROM usuarios u
            LEFT JOIN unidades un ON u.id_unidade_fk = un.id
            LEFT JOIN setores s ON u.id_setor_fk = s.id
            LEFT JOIN celulas_producao cp ON u.id_celula_fk = cp.id
            LEFT JOIN turnos t ON u.id_turno_fk = t.id
            UNION ALL
            SELECT 
                id, 
                nome, 
                email, 
                1 as ativo, 
                'Admin' as funcao, 
                nivelusuario, 
                "codBar", 
                NULL, -- id_unidade_fk
                NULL, -- id_setor_fk
                NULL, -- id_celula_fk
                NULL, -- id_turno_fk
                NULL, -- nome_unidade
                NULL, -- nome_setor
                NULL, -- nome_celula
                NULL, -- nome_turno
                'admin' 
            FROM admin
            ORDER BY nome ASC
        `;
        const result = await db.query(sql);
        res.status(200).json({ sucesso: true, dados: result.rows });
    } catch (error) {
        console.error("Erro ao listar usuários:", error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar usuários.' });
    }
};

exports.criarUsuario = async (req, res) => {
    const { nome, senha, email, id_celula_fk, id_setor_fk, id_turno_fk, id_unidade_fk, cracha, nivelusuario, funcao } = req.body;

    try {
        const hashSenha = await bcrypt.hash(senha, 10);
        
        // Apenas nível -1 é Admin. Se for 0 (Desativado) ou > 0, vai para a tabela de usuários
        if (Number(nivelusuario) === -1) {
            const sql = `INSERT INTO admin (nome, email, senha, "codBar", nivelusuario) VALUES ($1, $2, $3, $4, $5)`;
            await db.query(sql, [nome, email, hashSenha, cracha || null, nivelusuario]);
        } else {
            const ativo = Number(nivelusuario) === 0 ? 0 : 1; // Garante que o status acompanhe o nível
            
            const sql = `
                INSERT INTO usuarios 
                (nome, senha, email, id_turno_fk, id_celula_fk, id_setor_fk, id_unidade_fk, "codBar", ativo, nivelusuario, funcao) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `;
            
            // O uso de '|| null' previne o erro de sintaxe do PostgreSQL ao receber strings vazias do Frontend
            const params = [
                nome, hashSenha, email, 
                id_turno_fk || null, id_celula_fk || null, id_setor_fk || null, id_unidade_fk || null, 
                cracha || null, ativo, nivelusuario, funcao
            ];
            
            await db.query(sql, params);
        }
        
        res.status(201).json({ sucesso: true, mensagem: 'Usuário criado com sucesso!' });
    } catch (error) {
        console.error("Erro no criarUsuario:", error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar usuário. Verifique se o email ou crachá já existem.' });
    }
};

// ==========================================
// 2. EDITAR USUÁRIO
// ==========================================
exports.editarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nome, email, id_celula_fk, id_setor_fk, id_turno_fk, id_unidade_fk, nivelusuario, funcao, ativo, senha, origem } = req.body;

    try {
        const hashSenha = senha ? await bcrypt.hash(senha, 10) : null;
        
        if (origem === 'admin') {
            let sql = `UPDATE admin SET nome=$1, email=$2, nivelusuario=$3`;
            let params = [nome, email, nivelusuario];

            if (hashSenha) {
                sql += `, senha=$4 WHERE id=$5`;
                params.push(hashSenha, id);
            } else {
                sql += ` WHERE id=$4`;
                params.push(id);
            }
            
            await db.query(sql, params);
            
        } else {
            // Lógica mais segura para montagem dinâmica de SQL com array
            let sql = `
                UPDATE usuarios SET 
                nome=$1, email=$2, id_turno_fk=$3, id_celula_fk=$4, id_setor_fk=$5, id_unidade_fk=$6, ativo=$7, nivelusuario=$8, funcao=$9
            `;
            let params = [
                nome, email, 
                id_turno_fk || null, id_celula_fk || null, id_setor_fk || null, id_unidade_fk || null, 
                ativo, nivelusuario, funcao
            ];

            if (hashSenha) {
                sql += `, senha=$10 WHERE id=$11`;
                params.push(hashSenha, id);
            } else {
                sql += ` WHERE id=$10`;
                params.push(id);
            }
            
            await db.query(sql, params);
        }
        res.status(200).json({ sucesso: true, mensagem: 'Atualizado com sucesso!' });
    } catch (error) {
        console.error("Erro no editarUsuario:", error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao editar usuário.' });
    }
};

// ==========================================
// FUNÇÕES DE EXCLUSÃO E STATUS
// ==========================================

// 4. Deletar um usuário (Hard Delete)
exports.deletarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        // Tenta deletar da tabela usuarios primeiro
        let result = await db.query('DELETE FROM usuarios WHERE id = $1', [id]);

        // Se não achou na tabela usuarios, tenta na tabela admin
        if (result.rowCount === 0) {
            result = await db.query('DELETE FROM admin WHERE id = $1', [id]);
        }

        if (result.rowCount === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Usuário ou Admin não encontrado.' });
        }

        res.status(200).json({ sucesso: true, mensagem: 'Usuário deletado com sucesso!' });

    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        if (error.code === '23503') {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Não é possível deletar este usuário pois ele possui formulários vinculados. Experimente inativá-lo.' 
            });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao deletar.' });
    }
};

// 5. Inativar um usuário (Soft Delete)
exports.inativarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const sql = 'UPDATE usuarios SET ativo = 0, nivelusuario = 0 WHERE id = $1 RETURNING id, nome';
        const result = await db.query(sql, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Usuário não encontrado ou é um Admin (Admins não podem ser inativados, apenas deletados).' 
            });
        }

        res.status(200).json({ 
            sucesso: true, 
            mensagem: `O usuário ${result.rows[0].nome} foi inativado com sucesso.` 
        });

    } catch (error) {
        console.error('Erro ao inativar usuário:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao inativar.' });
    }
};

// 6. Reativar um usuário 
exports.reativarUsuario = async (req, res) => {
    const { id } = req.params;
    const { novoNivel } = req.body; 

    if (![1, 2].includes(novoNivel)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nível inválido. Escolha 1 (Líder) ou 2 (Inspetor).' });
    }

    try {
        // Correção: ativo sempre volta para 1 (true), nivelusuario recebe o parâmetro
        const sql = 'UPDATE usuarios SET ativo = 1, nivelusuario = $1 WHERE id = $2 RETURNING id, nome';
        const result = await db.query(sql, [novoNivel, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado na tabela de operação.' });
        }

        res.status(200).json({ 
            sucesso: true, 
            mensagem: `O usuário ${result.rows[0].nome} foi reativado com sucesso.` 
        });

    } catch (error) {
        console.error('Erro ao reativar usuário:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao reativar.' });
    }
};