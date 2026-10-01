// ── EMAILJS ───────────────────────────────────
emailjs.init({ publicKey: 'mpY9WS_ZJIivi9ejt' });

const SERVICE_ID  = 'service_8mdxf9o';
const TEMPLATE_ID = 'template_23pwquf';

// ── RATE LIMITING ─────────────────────────────
const RL_KEY         = 'osakidetza_contact_rl';
const MAX_POR_HORA   = 3;    // máximo 3 mensajes por hora
const COOLDOWN_SEGS  = 120;  // 2 minutos entre envíos

let cooldownTimer = null;

function getRateData() {
    try { return JSON.parse(localStorage.getItem(RL_KEY) || '{"envios":[],"ultimoEnvio":0}'); }
    catch(_) { return { envios: [], ultimoEnvio: 0 }; }
}

function saveRateData(data) {
    localStorage.setItem(RL_KEY, JSON.stringify(data));
}

function checkRateLimit() {
    const data = getRateData();
    const ahora = Date.now();

    // Limpiar envíos de hace más de 1 hora
    data.envios = data.envios.filter(t => ahora - t < 3600000);

    // Comprobar cooldown (2 min entre envíos)
    const segsDesdeUltimo = (ahora - data.ultimoEnvio) / 1000;
    if (data.ultimoEnvio > 0 && segsDesdeUltimo < COOLDOWN_SEGS) {
        const restantes = Math.ceil(COOLDOWN_SEGS - segsDesdeUltimo);
        return { bloqueado: true, razon: `Espera ${restantes} segundo${restantes !== 1 ? 's' : ''} antes de enviar otro mensaje.`, tipo: 'cooldown', restantes };
    }

    // Comprobar máximo por hora
    if (data.envios.length >= MAX_POR_HORA) {
        const primerEnvio = data.envios[0];
        const minRestantes = Math.ceil((3600000 - (ahora - primerEnvio)) / 60000);
        return { bloqueado: true, razon: `Has alcanzado el límite de ${MAX_POR_HORA} mensajes por hora. Puedes volver a enviar en ${minRestantes} minuto${minRestantes !== 1 ? 's' : ''}.`, tipo: 'limite' };
    }

    return { bloqueado: false };
}

function registrarEnvio() {
    const data = getRateData();
    const ahora = Date.now();
    data.envios = data.envios.filter(t => ahora - t < 3600000);
    data.envios.push(ahora);
    data.ultimoEnvio = ahora;
    saveRateData(data);
}

function iniciarCooldown() {
    let restantes = COOLDOWN_SEGS;
    const wrap = document.getElementById('cooldownWrap');
    const bar  = document.getElementById('cooldownBar');
    const btn  = document.getElementById('btnEnviar');

    wrap.classList.add('show');
    bar.style.width = '100%';
    btn.disabled = true;

    cooldownTimer = setInterval(() => {
        restantes--;
        bar.style.width = (restantes / COOLDOWN_SEGS * 100) + '%';
        if (restantes <= 0) {
            clearInterval(cooldownTimer);
            wrap.classList.remove('show');
            bar.style.width = '100%';
            btn.disabled = false;
            document.getElementById('rateLimitMsg').classList.remove('show');
        }
    }, 1000);
}

// ── FORMULARIO ────────────────────────────────
function enviarFormulario() {
    // Anti-bot: si el campo honeypot está relleno, ignorar silenciosamente
    if (document.getElementById('website').value) return;

    const nombre  = document.getElementById('nombre').value.trim();
    const email   = document.getElementById('email').value.trim();
    const asunto  = document.getElementById('asunto').value;
    const mensaje = document.getElementById('mensaje').value.trim();

    // Limpiar errores previos
    limpiarErrores();

    // Comprobar rate limit
    const rl = checkRateLimit();
    if (rl.bloqueado) {
        const msg = document.getElementById('rateLimitMsg');
        msg.textContent = rl.razon;
        msg.classList.add('show');
        return;
    }

    // Validar campos
    let valido = true;

    if (!email || !validarEmail(email)) {
        document.getElementById('email').classList.add('error');
        document.getElementById('emailError').classList.add('show');
        valido = false;
    }

    if (!asunto) {
        document.getElementById('asuntoError').classList.add('show');
        valido = false;
    }

    if (!mensaje) {
        document.getElementById('mensaje').classList.add('error');
        document.getElementById('mensajeError').classList.add('show');
        valido = false;
    }

    if (!valido) return;

    // Enviar
    setLoading(true);

    const templateParams = {
        from_name:  nombre || 'Sin nombre',
        from_email: email,
        subject:    asunto,
        message:    mensaje
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
        .then(() => {
            setLoading(false);
            registrarEnvio();
            iniciarCooldown();
            mostrarFeedback(true);
            limpiarFormulario();
        })
        .catch((err) => {
            setLoading(false);
            mostrarFeedback(false);
            console.error('EmailJS error:', err);
        });
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function limpiarErrores() {
    document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach(e => e.classList.remove('error'));
    document.getElementById('formFeedback').classList.remove('show','success','error');
    document.getElementById('rateLimitMsg').classList.remove('show');
}

function limpiarFormulario() {
    document.getElementById('nombre').value  = '';
    document.getElementById('email').value   = '';
    document.getElementById('asunto').value  = '';
    document.getElementById('mensaje').value = '';
}

function setLoading(loading) {
    const btn     = document.getElementById('btnEnviar');
    const spinner = document.getElementById('spinner');
    const text    = document.getElementById('btnText');
    btn.disabled            = loading;
    spinner.classList.toggle('show', loading);
    text.textContent        = loading ? 'Enviando...' : 'Enviar mensaje';
}

function mostrarFeedback(exito) {
    const fb = document.getElementById('formFeedback');
    fb.className = 'form-feedback show ' + (exito ? 'success' : 'error');
    document.getElementById('feedbackIcon').textContent  = exito ? '✅' : '❌';
    document.getElementById('feedbackTitle').textContent = exito
        ? '¡Mensaje enviado!'
        : 'Error al enviar';
    document.getElementById('feedbackDesc').textContent  = exito
        ? 'Hemos recibido tu mensaje. Te responderemos en menos de 48 horas en el email que nos has indicado.'
        : 'No se pudo enviar el mensaje. Inténtalo de nuevo o escríbenos directamente a plataformatests@gmail.com';
}

document.getElementById('btnEnviar').addEventListener('click', enviarFormulario);

// Comprobar al cargar si hay cooldown activo
(function checkCooldownOnLoad() {
    const rl = checkRateLimit();
    if (rl.bloqueado && rl.tipo === 'cooldown') {
        const msg = document.getElementById('rateLimitMsg');
        msg.textContent = rl.razon;
        msg.classList.add('show');
        document.getElementById('btnEnviar').disabled = true;
        iniciarCooldown();
    }
})();
