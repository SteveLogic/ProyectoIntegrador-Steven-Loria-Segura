
require("dotenv").config();

const { MongoClient } = require("mongoose").mongo;

async function crearIndice() {
    if (!process.env.MONGO_URI) {
        throw new Error("Falta MONGO_URI en .env");
    }

    const cliente = new MongoClient(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000
    });

    try {
        await cliente.connect();

        const bd = cliente.db();
        const citas = bd.collection("citas");

        console.log("Base de datos:", bd.databaseName);

        // Comprobar nuevamente que no hay duplicados.
        const duplicados = await citas.aggregate([
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
            { $limit: 1 }
        ]).toArray();

        if (duplicados.length > 0) {
            console.log(
                "Se encontraron citas duplicadas. No se creará el índice."
            );
            return;
        }

        const campos = {
            doctor: 1,
            fecha: 1,
            hora: 1
        };

        const filtro = {
            estado: {
                $in: ["pendiente", "confirmada"]
            }
        };

        // Evitar conflictos con índices existentes.
        const existentes = await citas.listIndexes().toArray();

        const encontrado = existentes.find(indice =>
            JSON.stringify(indice.key) === JSON.stringify(campos)
        );

        if (encontrado) {
            const filtroCorrecto =
                JSON.stringify(encontrado.partialFilterExpression) ===
                JSON.stringify(filtro);

            if (!encontrado.unique || !filtroCorrecto) {
                throw new Error(
                    "Existe un índice con esos campos, pero con otra configuración."
                );
            }

            console.log("El índice único ya existe correctamente.");
            return;
        }

        // Crear el índice único parcial.
        const nombre = await citas.createIndex(campos, {
            unique: true,
            partialFilterExpression: filtro
        });

        console.log("Índice creado:", nombre);

        // Confirmar que MongoDB lo registró.
        const indices = await citas.listIndexes().toArray();
        const nuevo = indices.find(i => i.name === nombre);

        console.log("Índice único:", Boolean(nuevo?.unique));
        console.log(
            "Filtro parcial:",
            JSON.stringify(nuevo?.partialFilterExpression)
        );

    } finally {
        await cliente.close();
    }
}

crearIndice().catch(error => {
    console.error("Error:", error.message);
    process.exitCode = 1;
});
