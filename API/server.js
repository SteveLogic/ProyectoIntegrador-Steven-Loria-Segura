const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const usuarioRoutes = require("./routes/usuarioRoutes");
const authRoutes = require("./routes/authRoutes");
require("dotenv").config();



const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/auth", authRoutes);

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Conectado correctamente a MongoDB");
    })
    .catch((error) => {
        console.error("Error al conectar con MongoDB:", error);
    });

app.get("/api/prueba", (req, res) => {
    res.json({
        mensaje: "API del Sistema de Citas Médicas funcionando"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});