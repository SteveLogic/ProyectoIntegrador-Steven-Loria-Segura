
 // Solo lectura: no crea índices ni modifica documentos.
require("dotenv").config();
const { MongoClient } = require("mongoose").mongo;

async function verificar() {
    if (!process.env.MONGO_URI) {
        throw new Error("Falta MONGO_URI en el archivo .env");
    }

    const cliente = new MongoClient(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000
    });

    try {
        await cliente.connect();

        const bd = cliente.db();
        console.log("Base de datos:", bd.databaseName);

        const existe = await bd
            .listCollections({ name: "citas" })
            .hasNext();

        if (!existe) {
            console.log("No existe la colección 'citas'.");
            return;
        }

        const citas = bd.collection("citas");

        const duplicadas = await citas.aggregate([
            {
                $match: {
                    estado: {
                        $in: ["pendiente", "confirmada"]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        doctor: "$doctor",
                        fecha: "$fecha",
                        hora: "$hora"
                    },
                    cantidad: { $sum: 1 }
                }
            },
            {
                $match: {
                    cantidad: { $gt: 1 }
                }
            },
            {
                $sort: { cantidad: -1 }
            }
        ]).toArray();

        console.log(
            "Grupos de citas activas duplicadas:",
            duplicadas.length
        );

        for (const grupo of duplicadas.slice(0, 20)) {
            console.log({
                doctor: String(grupo._id.doctor),
                fecha: grupo._id.fecha,
                hora: grupo._id.hora,
                cantidad: grupo.cantidad
            });
        }

        const indices = await citas.listIndexes().toArray();

        console.log("Índices existentes:");

        for (const indice of indices) {
            console.log({
                nombre: indice.name,
                campos: indice.key,
                unico: Boolean(indice.unique),
                filtroParcial:
                    indice.partialFilterExpression ?? null
            });
        }

    } finally {
        await cliente.close();
    }
}

verificar().catch(error => {
    console.error("Error de verificación:", error.message);
    process.exitCode = 1;
});
