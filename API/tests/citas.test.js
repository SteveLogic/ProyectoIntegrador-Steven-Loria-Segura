
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const Cita = require("../models/Cita");
const { crearSesion } = require("../middleware/sesiones");
const citaRoutes = require("../routes/citaRoutes");

// Identificadores ficticios para las pruebas.
const IDs = {
    pacienteA: "111111111111111111111111",
    pacienteB: "222222222222222222222222",
    doctorA: "333333333333333333333333",
    doctorB: "444444444444444444444444",
    administrador: "555555555555555555555555",
    citaA: "666666666666666666666666",
    citaB: "777777777777777777777777"
};

const usuarios = {
    pacienteA: { id: IDs.pacienteA, rol: "paciente" },
    doctorA: { id: IDs.doctorA, rol: "doctor" },
    administrador: {
        id: IDs.administrador,
        rol: "administrador"
    }
};

// Citas ficticias. Ambas están canceladas para evitar
// que las pruebas produzcan modificaciones accidentales.
const citasSimuladas = [
    {
        _id: IDs.citaA,
        paciente: IDs.pacienteA,
        doctor: IDs.doctorA,
        estado: "cancelada"
    },
    {
        _id: IDs.citaB,
        paciente: IDs.pacienteB,
        doctor: IDs.doctorB,
        estado: "cancelada"
    }
];

// Simular el resultado de populate() de Mongoose.
function poblarCita(cita) {
    if (!cita) return null;

    return {
        ...cita,
        paciente: { _id: cita.paciente, nombre: "Paciente Demo" },
        doctor: { _id: cita.doctor, nombre: "Doctor Demo" }
    };
}

// Simular consultas de Mongoose sin acceder a MongoDB.
function consultaSimulada(resultado) {
    let usarPopulate = false;

    return {
        populate() {
            usarPopulate = true;
            return this;
        },

        then(resolve, reject) {
            let datos = resultado;

            if (usarPopulate) {
                datos = Array.isArray(resultado)
                    ? resultado.map(poblarCita)
                    : poblarCita(resultado);
            }

            return Promise.resolve(datos).then(resolve, reject);
        }
    };
}

const metodosOriginales = {
    find: Cita.find,
    findById: Cita.findById,
    create: Cita.create,
    findByIdAndUpdate: Cita.findByIdAndUpdate
};

let servidor;
let baseURL;

before(async () => {
    // Sustituir temporalmente las consultas a MongoDB.
    Cita.find = (filtro = {}) => {
        const citas = citasSimuladas.filter(cita =>
            Object.entries(filtro).every(
                ([campo, valor]) =>
                    String(cita[campo]) === String(valor)
            )
        );

        return consultaSimulada(citas);
    };

    Cita.findById = id => {
        const cita = citasSimuladas.find(
            item => item._id === String(id)
        );

        return consultaSimulada(cita || null);
    };

    // Impedir cualquier escritura real durante las pruebas.
    Cita.create = async () => {
        throw new Error("Escritura deshabilitada en pruebas");
    };

    Cita.findByIdAndUpdate = async () => {
        throw new Error("Actualización deshabilitada en pruebas");
    };

    const app = express();
    app.use(express.json());
    app.use("/api/citas", citaRoutes);

    // Puerto temporal independiente del servidor principal.
    await new Promise(resolve => {
        servidor = app.listen(0, "127.0.0.1", resolve);
    });

    baseURL = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
    // Restaurar los métodos originales de Mongoose.
    Object.assign(Cita, metodosOriginales);

    if (servidor) {
        await new Promise(resolve => servidor.close(resolve));
    }
});

async function solicitar(ruta, usuario, metodo = "GET", cuerpo) {
    const headers = {};

    if (usuario) {
        const token = crearSesion({
            _id: usuario.id,
            rol: usuario.rol
        });

        headers.Authorization = `Bearer ${token}`;
    }

    if (cuerpo !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    return fetch(`${baseURL}${ruta}`, {
        method: metodo,
        headers,
        ...(cuerpo !== undefined
            ? { body: JSON.stringify(cuerpo) }
            : {})
    });
}

const rutaCitas = "/api/citas";

// Prueba 1: todas las rutas requieren autenticación.
test("Rechaza operaciones de citas sin sesión", async () => {
    const operaciones = [
        [rutaCitas, "GET"],
        [`${rutaCitas}/${IDs.citaA}`, "GET"],
        [rutaCitas, "POST", {}],
        [`${rutaCitas}/${IDs.citaA}`, "PUT", {}],
        [`${rutaCitas}/${IDs.citaA}`, "DELETE"]
    ];

    for (const [ruta, metodo, cuerpo] of operaciones) {
        const respuesta = await solicitar(
            ruta, null, metodo, cuerpo
        );

        assert.equal(respuesta.status, 401);
    }
});

// Prueba 2: paciente consulta solo sus citas.
test("Paciente solo recibe sus propias citas", async () => {
    const respuesta = await solicitar(
        rutaCitas, usuarios.pacienteA
    );

    assert.equal(respuesta.status, 200);

    const citas = await respuesta.json();

    assert.equal(citas.length, 1);
    assert.equal(citas[0].paciente._id, IDs.pacienteA);
});

// Prueba 3: doctor consulta solo las citas asignadas.
test("Doctor solo recibe sus citas asignadas", async () => {
    const respuesta = await solicitar(
        rutaCitas, usuarios.doctorA
    );

    assert.equal(respuesta.status, 200);

    const citas = await respuesta.json();

    assert.equal(citas.length, 1);
    assert.equal(citas[0].doctor._id, IDs.doctorA);
});

// Prueba 4: administrador consulta todas las citas.
test("Administrador puede consultar todas las citas", async () => {
    const respuesta = await solicitar(
        rutaCitas, usuarios.administrador
    );

    assert.equal(respuesta.status, 200);

    const citas = await respuesta.json();

    assert.equal(citas.length, 2);
});

// Prueba 5: paciente no consulta citas ajenas.
test("Paciente no consulta una cita ajena", async () => {
    const respuesta = await solicitar(
        `${rutaCitas}/${IDs.citaB}`,
        usuarios.pacienteA
    );

    assert.equal(respuesta.status, 403);
});

// Prueba 6: paciente sí consulta una cita propia.
test("Paciente puede consultar una cita propia", async () => {
    const respuesta = await solicitar(
        `${rutaCitas}/${IDs.citaA}`,
        usuarios.pacienteA
    );

    assert.equal(respuesta.status, 200);
});

// Prueba 7: doctor no consulta citas de otro doctor.
test("Doctor no consulta una cita ajena", async () => {
    const respuesta = await solicitar(
        `${rutaCitas}/${IDs.citaB}`,
        usuarios.doctorA
    );

    assert.equal(respuesta.status, 403);
});

// Prueba 8: paciente no crea citas para otra persona.
test("Paciente no reserva para otro paciente", async () => {
    const respuesta = await solicitar(
        rutaCitas,
        usuarios.pacienteA,
        "POST",
        {
            paciente: IDs.pacienteB,
            doctor: IDs.doctorA,
            especialidad: IDs.citaA,
            fecha: "2099-01-15",
            hora: "09:00"
        }
    );

    assert.equal(respuesta.status, 403);
});

// Prueba 9: doctor no puede crear citas.
test("Doctor no puede crear citas", async () => {
    const respuesta = await solicitar(
        rutaCitas,
        usuarios.doctorA,
        "POST",
        {
            paciente: IDs.pacienteA,
            doctor: IDs.doctorA,
            especialidad: IDs.citaA,
            fecha: "2099-01-15",
            hora: "09:00"
        }
    );

    assert.equal(respuesta.status, 403);
});

// Prueba 10: paciente no reprograma citas ajenas.
test("Paciente no reprograma una cita ajena", async () => {
    const respuesta = await solicitar(
        `${rutaCitas}/${IDs.citaB}`,
        usuarios.pacienteA,
        "PUT",
        {
            fecha: "2099-01-15",
            hora: "09:00"
        }
    );

    assert.equal(respuesta.status, 403);
});

// Prueba 11: paciente no cancela citas ajenas.
test("Paciente no cancela una cita ajena", async () => {
    const respuesta = await solicitar(
        `${rutaCitas}/${IDs.citaB}`,
        usuarios.pacienteA,
        "DELETE"
    );

    assert.equal(respuesta.status, 403);
});

// Prueba 12: doctor no reprograma ni cancela.
test("Doctor no puede modificar ni cancelar citas", async () => {
    const reprogramar = await solicitar(
        `${rutaCitas}/${IDs.citaA}`,
        usuarios.doctorA,
        "PUT",
        {
            fecha: "2099-01-15",
            hora: "09:00"
        }
    );

    const cancelar = await solicitar(
        `${rutaCitas}/${IDs.citaA}`,
        usuarios.doctorA,
        "DELETE"
    );

    assert.equal(reprogramar.status, 403);
    assert.equal(cancelar.status, 403);
});

// Prueba 13: las validaciones siguen funcionando.
test("Administrador no modifica citas canceladas", async () => {
    const reprogramar = await solicitar(
        `${rutaCitas}/${IDs.citaA}`,
        usuarios.administrador,
        "PUT",
        {
            fecha: "2099-01-15",
            hora: "09:00"
        }
    );

    const cancelar = await solicitar(
        `${rutaCitas}/${IDs.citaA}`,
        usuarios.administrador,
        "DELETE"
    );

    assert.equal(reprogramar.status, 409);
    assert.equal(cancelar.status, 409);
});
