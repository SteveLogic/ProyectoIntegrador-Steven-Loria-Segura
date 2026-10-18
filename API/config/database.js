
const mongoose = require("mongoose");

// Función para conectar la API con MongoDB
async function conectarDB() {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Conectado correctamente a MongoDB");
}

// Exportamos la función para utilizarla en server.js
module.exports = conectarDB;
