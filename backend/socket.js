let io;

module.exports = {
    // Função para inicializar o socket.io
    init: (httpServer) => {
        io = require('socket.io')(httpServer, {
            cors: {
                origin: "http://localhost:5173", // URL do seu front-end Vue
                methods: ["GET", "POST"]
            }
        });
        return io;
    },
    // Função para obter a instância já criada do socket.io
    getIo: () => {
        if (!io) {
            throw new Error("Socket.io não foi inicializado!");
        }
        return io;
    }
};