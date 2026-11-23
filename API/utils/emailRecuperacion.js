const ORIGEN_RENDER = "https://sistema-citas-medicas-88xk.onrender.com";

// El enlace va en el fragmento (#), no en la URL enviada al servidor.
async function enviarRecuperacion({ email, token }) {
    const url = new URL(process.env.APP_PUBLIC_URL || ORIGEN_RENDER);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
        throw new Error("APP_PUBLIC_URL debe usar HTTPS.");
    }
    if (url.username || url.password || url.search || url.hash) {
        throw new Error("APP_PUBLIC_URL debe ser el origen público sin parámetros.");
    }
    const enlace = new URL("/restablecercontrasena.html", url.origin);
    enlace.hash = `token=${encodeURIComponent(token)}`;
    const respuesta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: process.env.RESET_EMAIL_FROM,
            to: [email],
            subject: "Recuperación de contraseña - Sistema de Citas Médicas",
            text: `Recibimos una solicitud para cambiar tu contraseña. Abre el enlace: ${enlace.toString()}\n\nCaduca en 20 minutos. Si no solicitaste este cambio, ignora este correo.`
        }),
        signal: AbortSignal.timeout(10000)
    });
    if (!respuesta.ok) {
        throw new Error(`Servicio de correo rechazó el envío (HTTP ${respuesta.status}).`);
    }
}

module.exports = { enviarRecuperacion };
