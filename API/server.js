
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const conectarDB = require("./config/database");

const usuarioRoutes = require("./routes/usuarioRoutes");
const authRoutes = require("./routes/authRoutes");
const especialidadRoutes = require("./routes/especialidadRoutes");
const citaRoutes = require("./routes/citaRoutes");
const doctorRoutes = require("./routes/doctorRoutes");


const app = express();

// Configuración de Express
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/especialidades", especialidadRoutes);
app.use("/api/citas", citaRoutes);
app.use("/api/doctores", doctorRoutes);
// Ruta para comprobar que la API funciona
app.get("/api/prueba", (req, res) => {
    res.json({
        mensaje: "API del Sistema de Citas Médicas funcionando"
    });
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Iniciar el servidor después de conectar MongoDB
async function iniciarServidor() {
    try {
        await conectarDB();

        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en el puerto ${PORT}`);
        });

    } catch (error) {
        console.error("Error al conectar con MongoDB:", error);
        process.exit(1);
    }
}

iniciarServidor();
