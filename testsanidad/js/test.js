// ── TEMA ──────────────────────────────────────────────────────────
const htmlTag = document.documentElement;
if (localStorage.getItem('theme') === 'dark') htmlTag.setAttribute('data-theme', 'dark');

// ── PARÁMETROS ────────────────────────────────────────────────────
const p        = new URLSearchParams(location.search);
const CATEGORIA = p.get('categoria') || 'celador';
const BLOQUE    = p.get('bloque')    || '';
const MODO      = p.get('modo')      || 'practica';
const N_PARAM   = parseInt(p.get('n')) || 100;
const ORIGEN    = p.get('origen')    || 'local';
const DESDE     = p.get('desde') !== null ? parseInt(p.get('desde')) : null;
const HASTA     = p.get('hasta') !== null ? parseInt(p.get('hasta')) : null;

// ── CONSTANTES ────────────────────────────────────────────────────
const KEY_RESULTADOS = 'osakidetza_resultados';
const KEY_ERRORES    = 'osakidetza_errores_' + CATEGORIA;
const DATA_PATH      = './data/';

const NOM_CAT = { celador: 'Celador/a', enfermeria: 'Enfermería' };
const NOM_BLQ = {
    'celador-comun':         'Temario Común',
    'celador-especifico':    'Temario Específico',
    'celador-mixto':         'Simulacro Mixto',
    'enfermeria-comun':      'Temario Común',
    'enfermeria-especifico': 'Temario Específico',
    'enfermeria-mixto':      'Simulacro Mixto',
    'errores':               'Mis Errores'
};

// ── CHIPS ─────────────────────────────────────────────────────────
document.getElementById('chipCat').textContent    = NOM_CAT[CATEGORIA] || CATEGORIA;
const bloqueLabel = (DESDE !== null && HASTA !== null)
    ? (NOM_BLQ[BLOQUE] || BLOQUE) + ' — Preg. ' + (DESDE + 1) + '-' + HASTA
    : (NOM_BLQ[BLOQUE] || BLOQUE);
document.getElementById('chipBloque').textContent = bloqueLabel;
const chipModo = document.getElementById('chipModo');
chipModo.textContent = MODO === 'practica' ? 'Práctica' : 'Examen';
chipModo.classList.add(MODO === 'practica' ? 'practica' : 'examen');

// ── ESTADO ────────────────────────────────────────────────────────
let preguntas  = [];
let respuestas = {};   // { idx: 'A'|'B'|'C'|'D' }
let curIdx     = 0;
let finished   = false;
let timer      = null;
let secs       = 0;
let errores    = [];   // preguntas falladas: [{q,opts,ans}]

// ── UTILIDADES ────────────────────────────────────────────────────
function setScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showError(title, desc) {
    setScreen('screenError');
    document.getElementById('errTitle').textContent = title;
    document.getElementById('errDesc').textContent  = desc;
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pick(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }

function fmtTime(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return [h, m, ss].map(x => String(x).padStart(2, '0')).join(':');
}

function backUrl() { return CATEGORIA + '.html'; }

// ── CARGA ─────────────────────────────────────────────────────────
function loadScript(src) {
    return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src + '?v=' + Date.now();
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
    });
}

async function cargar() {
    try {
        if (BLOQUE === 'errores') {
            await cargarErrores();
        } else if (BLOQUE.endsWith('-mixto')) {
            await cargarMixto();
        } else {
            await cargarSimple(BLOQUE);
        }
        iniciar();
    } catch(e) {
        showError('No se pudieron cargar las preguntas', e.message || 'Comprueba que el archivo existe.');
    }
}

async function cargarSimple(bloque) {
    await loadScript(DATA_PATH + bloque + '.js');
    if (!window.preguntas?.length) throw new Error('Archivo de preguntas vacío o no encontrado.');
    if (DESDE !== null && HASTA !== null) {
        // Modo bloque: rango fijo en orden, sin aleatorizar
        preguntas = window.preguntas.slice(DESDE, HASTA);
    } else {
        preguntas = pick(window.preguntas, N_PARAM);
    }
    window.preguntas = null;
}

async function cargarMixto() {
    let pComun = [], pEsp = [], sinComun = false;

    try {
        await loadScript(DATA_PATH + CATEGORIA + '-comun.js');
        if (window.preguntas?.length) { pComun = window.preguntas; window.preguntas = null; }
    } catch(_) { sinComun = true; }

    await loadScript(DATA_PATH + CATEGORIA + '-especifico.js');
    if (window.preguntas?.length) { pEsp = window.preguntas; window.preguntas = null; }

    if (!pEsp.length) throw new Error('No se encontraron preguntas del temario específico.');

    if (sinComun || !pComun.length) {
        document.getElementById('avisoBanner').classList.add('show');
        preguntas = pick(pEsp, N_PARAM);
    } else {
        const mitad = Math.floor(N_PARAM / 2);
        preguntas   = shuffle([...pick(pComun, mitad), ...pick(pEsp, N_PARAM - mitad)]);
    }
}

async function cargarErrores() {
    let pool = [];
    if (ORIGEN === 'archivo') {
        const raw = sessionStorage.getItem('errores_archivo');
        if (!raw) throw new Error('No se encontró el archivo. Vuelve atrás e inténtalo de nuevo.');
        pool = JSON.parse(raw);
        sessionStorage.removeItem('errores_archivo');
    } else {
        const raw = localStorage.getItem(KEY_ERRORES);
        if (!raw) throw new Error('No hay errores guardados en este dispositivo para ' + (NOM_CAT[CATEGORIA] || CATEGORIA) + '.');
        pool = JSON.parse(raw);
    }
    if (!pool.length) throw new Error('La lista de errores está vacía.');
    preguntas = pick(pool, N_PARAM);
}

// ── INICIAR ───────────────────────────────────────────────────────
function iniciar() {
    if (!preguntas.length) { showError('Sin preguntas', 'No hay preguntas disponibles.'); return; }
    setScreen('screenTest');

    if (MODO === 'examen') {
        document.getElementById('sidebar').classList.add('show');
        buildGrid();
        const cron = document.getElementById('cronometro');
        cron.classList.add('show');
        timer = setInterval(() => {
            secs++;
            cron.textContent = fmtTime(secs);
            // Aviso últimos 5 min si >20 preguntas
            if (preguntas.length > 20 && secs === preguntas.length * 60 - 300) {
                cron.classList.add('warning');
            }
        }, 1000);
    }

    render(0);
}

// ── RENDER PREGUNTA ───────────────────────────────────────────────
function render(idx) {
    curIdx = idx;
    const q    = preguntas[idx];
    const keys = ['A','B','C','D'];

    document.getElementById('qCounter').textContent = `Pregunta ${idx + 1} de ${preguntas.length}`;
    document.getElementById('qText').textContent    = q.q;
    document.getElementById('progressFill').style.width = ((idx + 1) / preguntas.length * 100) + '%';

    // Opciones
    const list = document.getElementById('optsList');
    list.innerHTML = '';
    q.opts.forEach((opt, i) => {
        const li  = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.id = 'opt-' + i;
        const key = document.createElement('span');
        key.className   = 'opt-key';
        key.textContent = keys[i];
        const txt = document.createElement('span');
        txt.textContent = opt;
        btn.append(key, txt);
        btn.onclick = () => seleccionar(i);
        li.appendChild(btn);
        list.appendChild(li);
    });

    // Limpiar feedback
    const fb = document.getElementById('feedback');
    fb.className = 'feedback';
    fb.textContent = '';

    // Restaurar respuesta previa
    if (respuestas[idx] !== undefined) aplicar(idx, respuestas[idx], false);

    // Nav
    document.getElementById('btnPrev').disabled = idx === 0;
    actualizarBtnNext();
    actualizarGrid();
}

function seleccionar(optIdx) {
    if (finished) return;
    if (MODO === 'practica' && respuestas[curIdx] !== undefined) return;
    const key = ['A','B','C','D'][optIdx];
    respuestas[curIdx] = key;
    aplicar(curIdx, key, true);
    actualizarBtnNext();
    actualizarGrid();
}

function aplicar(idx, key, animate) {
    const q    = preguntas[idx];
    const keys = ['A','B','C','D'];
    const ki   = keys.indexOf(key);
    const ci   = keys.indexOf(q.ans);

    document.querySelectorAll('.opt-btn').forEach(b =>
        b.classList.remove('selected','correct','incorrect','show-correct'));

    if (MODO === 'practica') {
        document.querySelectorAll('.opt-btn').forEach(b => b.disabled = true);
        const bSel  = document.getElementById('opt-' + ki);
        const bCorr = document.getElementById('opt-' + ci);
        if (key === q.ans) {
            bSel.classList.add('correct');
        } else {
            bSel.classList.add('incorrect');
            if (bCorr) bCorr.classList.add('show-correct');
        }
        const fb = document.getElementById('feedback');
        if (key === q.ans) {
            fb.className = 'feedback show ok';
            fb.textContent = '✓ Correcto';
        } else {
            fb.className = 'feedback show ko';
            fb.textContent = `✗ Incorrecto. La respuesta correcta es ${q.ans}: ${q.opts[ci]}`;
        }
    } else {
        const bSel = document.getElementById('opt-' + ki);
        if (bSel) bSel.classList.add('selected');
    }
}

// ── NAVEGACIÓN ────────────────────────────────────────────────────
function goTo(idx) {
    if (idx < 0 || idx >= preguntas.length) return;
    render(idx);
}

function nextOrFinish() {
    if (curIdx < preguntas.length - 1) {
        goTo(curIdx + 1);
    } else {
        if (MODO === 'examen') {
            const sinResp = preguntas.filter((_, i) => respuestas[i] === undefined).length;
            if (sinResp > 0 && !confirm(`Tienes ${sinResp} pregunta${sinResp > 1 ? 's' : ''} sin responder. ¿Finalizar de todas formas?`)) return;
        }
        finalizar();
    }
}

function actualizarBtnNext() {
    const btn  = document.getElementById('btnNext');
    const last = curIdx === preguntas.length - 1;
    btn.textContent = last ? 'Finalizar ✓' : 'Siguiente →';
    btn.className   = 'btn-nav ' + (last ? 'finish' : 'primary');
}

// ── GRID SIDEBAR ──────────────────────────────────────────────────
function buildGrid() {
    const g = document.getElementById('qGrid');
    g.innerHTML = '';
    preguntas.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'q-dot'; d.id = 'qd-' + i;
        d.textContent = i + 1;
        d.onclick = () => goTo(i);
        g.appendChild(d);
    });
}

function actualizarGrid() {
    preguntas.forEach((_, i) => {
        const d = document.getElementById('qd-' + i);
        if (!d) return;
        d.className = 'q-dot';
        if (i === curIdx) d.classList.add('current');
        else if (respuestas[i] !== undefined) d.classList.add('answered');
    });
}

// ── FINALIZAR ─────────────────────────────────────────────────────
function finalizar() {
    finished = true;
    if (timer) clearInterval(timer);

    const keys = ['A','B','C','D'];
    let correctas = 0, incorrectas = 0;
    errores = [];

    preguntas.forEach((q, i) => {
        const resp = respuestas[i];
        if (resp === q.ans) {
            correctas++;
        } else {
            incorrectas++;
            if (resp !== undefined) errores.push({ q: q.q, opts: q.opts, ans: q.ans });
        }
    });

    const total = preguntas.length;
    const nota  = (correctas / total * 10).toFixed(2);

    // Guardar errores en localStorage (modo examen, todos los bloques)
    if (MODO === 'examen' && errores.length > 0) guardarErrores();

    // Guardar resultado (solo mixto + examen)
    if (MODO === 'examen' && BLOQUE === CATEGORIA + '-mixto') guardarResultado(correctas, incorrectas, total, nota);

    mostrarResultados(correctas, incorrectas, total, nota);
}

function guardarErrores() {
    let existing = [];
    try { existing = JSON.parse(localStorage.getItem(KEY_ERRORES) || '[]'); } catch(_) {}
    const existingQs = new Set(existing.map(e => e.q));
    const nuevos     = errores.filter(e => !existingQs.has(e.q));
    localStorage.setItem(KEY_ERRORES, JSON.stringify([...existing, ...nuevos]));
}

function guardarResultado(correctas, incorrectas, total, nota) {
    const now = new Date();
    const res = {
        id:          Date.now(),
        fecha:       now.toLocaleDateString('es-ES'),
        hora:        now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        categoria:   CATEGORIA,
        bloque:      BLOQUE,
        modo:        MODO,
        total,
        correctas,
        incorrectas,
        nota,
        duracion:    secs
    };
    let existing = [];
    try { existing = JSON.parse(localStorage.getItem(KEY_RESULTADOS) || '[]'); } catch(_) {}
    existing.push(res);
    localStorage.setItem(KEY_RESULTADOS, JSON.stringify(existing));
}

function mostrarResultados(correctas, incorrectas, total, nota) {
    setScreen('screenResults');

    const notaF = parseFloat(nota).toFixed(1);
    const color = parseFloat(nota) >= 7 ? '#16a34a' : parseFloat(nota) >= 5 ? 'var(--brand-blue)' : '#dc2626';

    document.getElementById('notaNum').textContent  = notaF;
    document.getElementById('notaNum').style.color  = color;
    document.getElementById('rTotal').textContent   = total;
    document.getElementById('rCorr').textContent    = correctas;
    document.getElementById('rIncorr').textContent  = incorrectas;

    // Anillo
    const ring = document.getElementById('ringFill');
    ring.style.stroke = color;
    setTimeout(() => {
        ring.style.strokeDashoffset = 263.9 - (correctas / total) * 263.9;
    }, 100);

    // Botones extra
    if (MODO === 'examen' && errores.length > 0)
        document.getElementById('btnDescErr').style.display = 'flex';
    if (MODO === 'examen' && BLOQUE === CATEGORIA + '-mixto')
        document.getElementById('btnVerRes').style.display = 'flex';

    // Revisión
    const keys = ['A','B','C','D'];
    const list = document.getElementById('reviewList');
    list.innerHTML = '';
    preguntas.forEach((q, i) => {
        const resp = respuestas[i];
        const ok   = resp === q.ans;
        const ci   = keys.indexOf(q.ans);
        const ri   = resp ? keys.indexOf(resp) : -1;
        const div  = document.createElement('div');
        div.className = 'review-item ' + (ok ? 'ok' : 'ko');
        const span = (cls, text) => {
            const el = document.createElement('span');
            el.className   = cls;
            el.textContent = text;
            return el;
        };
        const num = document.createElement('div');
        num.className   = 'rev-num';
        num.textContent = `Pregunta ${i + 1}`;
        const rq = document.createElement('div');
        rq.className   = 'rev-q';
        rq.textContent = q.q;
        const ans = document.createElement('div');
        ans.className = 'rev-ans';
        ans.append(span('rev-lbl', 'Correcta:'), span('rev-ok', `${q.ans}: ${q.opts[ci]}`));
        if (!ok && resp) ans.append(span('rev-lbl', 'Tu respuesta:'), span('rev-ko', `${resp}: ${q.opts[ri]}`));
        if (!resp) ans.append(span('rev-none', 'Sin responder'));
        div.append(num, rq, ans);
        list.appendChild(div);
    });
}

// ── DESCARGAR ERRORES ─────────────────────────────────────────────
function descargarErrores() {
    // Exportar TODOS los errores acumulados en localStorage, no solo los del examen actual
    let todosErrores = [];
    try { todosErrores = JSON.parse(localStorage.getItem(KEY_ERRORES) || '[]'); } catch(_) {}
    if (!todosErrores.length) return;
    const blob = new Blob([JSON.stringify(todosErrores, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `errores_${CATEGORIA}.json`; // nombre fijo para sobreescribir siempre el mismo
    a.click();
    URL.revokeObjectURL(url);
}

// ── ABANDONAR ─────────────────────────────────────────────────────
function confirmAbort() {
    if (finished) { location.href = backUrl(); return; }
    if (confirm('¿Seguro que quieres abandonar? El progreso se perderá.')) {
        if (timer) clearInterval(timer);
        location.href = backUrl();
    }
}

// ── CONTROL POR TECLADO ───────────────────────────────────────────
document.addEventListener('keydown', function(event) {
    // Solo permitir usar flechas si estamos en la pantalla del test y no ha terminado
    if (finished || !document.getElementById('screenTest').classList.contains('active')) return;

    if (event.key === 'ArrowRight') {
        // Flecha derecha: Siguiente o finalizar
        nextOrFinish();
    } else if (event.key === 'ArrowLeft') {
        // Flecha izquierda: Anterior (solo si no estamos en la primera pregunta)
        if (curIdx > 0) {
            goTo(curIdx - 1);
        }
    }
});

// ── BOTONES ───────────────────────────────────────────────────────
document.getElementById('btnAbandonar').addEventListener('click', confirmAbort);
document.getElementById('btnErrBack').addEventListener('click', () => history.back());
document.getElementById('btnPrev').addEventListener('click', () => goTo(curIdx - 1));
document.getElementById('btnNext').addEventListener('click', nextOrFinish);
document.getElementById('btnVolver').addEventListener('click', () => { location.href = backUrl(); });
document.getElementById('btnRepetir').addEventListener('click', () => location.reload());
document.getElementById('btnDescErr').addEventListener('click', descargarErrores);
document.getElementById('btnVerRes').addEventListener('click', () => { location.href = 'resultados.html'; });

// ── ARRANQUE ──────────────────────────────────────────────────────
cargar();
