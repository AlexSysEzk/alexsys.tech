// ── CONFIGURACIÓN ─────────────────────────────────
const MAX_PREGUNTAS = {
    'celador-comun':      300,
    'celador-especifico': 200,
    'celador-mixto':      500
};

const BLOCK_SIZE = 20;
const CATEGORIA  = 'celador';

// ── ESTADO ────────────────────────────────────────
let currentBloque = '';
let currentModo   = '';
let currentTipo   = '';   // 'aleatorio' | 'bloque'
let currentBlock  = null; // número de bloque seleccionado (1-based)

// ── MODAL NORMAL ──────────────────────────────────
function openModal(bloque, nombre) {
    currentBloque = bloque;
    currentModo   = '';
    currentTipo   = '';
    currentBlock  = null;

    document.getElementById('modalLabel').textContent = 'CELADOR/A — BLOQUE';
    document.getElementById('modalTitle').textContent = nombre;

    // Reset UI
    document.getElementById('nInputSection').classList.remove('show');
    document.getElementById('btnStart').classList.remove('show');
    document.getElementById('nErrorMsg').classList.remove('show');
    document.getElementById('bloqueSelector').classList.remove('show');
    document.querySelectorAll('.mode-option').forEach(b => {
        b.classList.remove('selected');
        b.style.opacity = '1';
    });
    document.querySelectorAll('.tipo-option').forEach(b => {
        b.classList.remove('selected');
        b.style.opacity = '1';
    });

    // Show tipo selector only for Común
    const tipoOpts = document.getElementById('tipoOptions');
    const modalModes = document.getElementById('modalModes');
    if (bloque === 'celador-comun') {
        tipoOpts.style.display = 'flex';
        modalModes.style.display = 'none';
    } else {
        tipoOpts.style.display = 'none';
        modalModes.style.display = 'flex';
    }

    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOutside(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
}

// ── SELECTOR TIPO (solo Común) ────────────────────
function selectTipo(e, tipo) {
    currentTipo  = tipo;
    currentModo  = '';
    currentBlock = null;

    document.querySelectorAll('.tipo-option').forEach(b => {
        b.classList.remove('selected');
        b.style.opacity = '0.5';
    });
    e.currentTarget.classList.add('selected');
    e.currentTarget.style.opacity = '1';

    const bloqueSelector = document.getElementById('bloqueSelector');
    const modalModes     = document.getElementById('modalModes');
    const nInputSection  = document.getElementById('nInputSection');
    const btnStart       = document.getElementById('btnStart');

    if (tipo === 'aleatorio') {
        bloqueSelector.classList.remove('show');
        modalModes.style.display = 'flex';
        // Reset modes
        document.querySelectorAll('.mode-option').forEach(b => {
            b.classList.remove('selected');
            b.style.opacity = '1';
        });
        nInputSection.classList.remove('show');
        btnStart.classList.remove('show');
    } else {
        // Bloque — show block grid, hide mode selector until block chosen
        buildBloqueGrid();
        bloqueSelector.classList.add('show');
        modalModes.style.display = 'none';
        nInputSection.classList.remove('show');
        btnStart.classList.remove('show');
    }
}

// ── GRID DE BLOQUES ───────────────────────────────
function buildBloqueGrid() {
    const max    = MAX_PREGUNTAS['celador-comun'];
    const total  = Math.ceil(max / BLOCK_SIZE);
    const grid   = document.getElementById('bloqueGrid');
    grid.innerHTML = '';

    for (let i = 1; i <= total; i++) {
        const from = (i - 1) * BLOCK_SIZE + 1;
        const to   = Math.min(i * BLOCK_SIZE, max);
        const btn  = document.createElement('button');
        btn.className   = 'bloque-btn';
        btn.textContent = `${from}-${to}`;
        btn.addEventListener('click', () => selectBloque(i, btn));
        grid.appendChild(btn);
    }
}

function selectBloque(num, btn) {
    currentBlock = num;
    document.querySelectorAll('.bloque-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    // Show mode selector
    const modalModes = document.getElementById('modalModes');
    modalModes.style.display = 'flex';
    document.querySelectorAll('.mode-option').forEach(b => {
        b.classList.remove('selected');
        b.style.opacity = '1';
    });
    document.getElementById('nInputSection').classList.remove('show');
    document.getElementById('btnStart').classList.remove('show');
}

// ── SELECTOR MODO ─────────────────────────────────
function selectModo(e, modo) {
    currentModo = modo;

    // For block mode: n is fixed to block size, no input needed
    if (currentTipo === 'bloque' && currentBlock !== null) {
        document.getElementById('nInputSection').classList.remove('show');
        document.getElementById('btnStart').classList.add('show');
        document.getElementById('btnStart').disabled = false;
    } else {
        const max = MAX_PREGUNTAS[currentBloque] || 100;
        const input = document.getElementById('nInput');
        input.value = Math.min(100, max);
        input.max   = max;
        input.classList.remove('error');

        document.getElementById('nMaxLabel').textContent = `(máx. ${max})`;
        document.getElementById('nMaxInfo').textContent  = `de ${max}`;
        document.getElementById('nErrorMax').textContent = max;
        document.getElementById('nErrorMsg').classList.remove('show');
        document.getElementById('nInputSection').classList.add('show');
        document.getElementById('btnStart').classList.add('show');
        document.getElementById('btnStart').disabled = false;
    }

    document.querySelectorAll('.mode-option').forEach(b => {
        b.classList.remove('selected');
        b.style.opacity = '0.5';
    });
    e.currentTarget.classList.add('selected');
    e.currentTarget.style.opacity = '1';
}

function validateN() {
    const input = document.getElementById('nInput');
    const max   = parseInt(input.max) || 100;
    const val   = parseInt(input.value);
    const valid = !isNaN(val) && val >= 1 && val <= max;
    input.classList.toggle('error', !valid);
    document.getElementById('nErrorMsg').classList.toggle('show', !valid);
    document.getElementById('btnStart').disabled = !valid;
}

function stepN(delta) {
    const input = document.getElementById('nInput');
    const max   = parseInt(input.max) || 100;
    let val = parseInt(input.value) || 1;
    val = Math.min(max, Math.max(1, val + delta));
    input.value = val;
    validateN();
}

function startTest() {
    if (!currentModo) return;

    if (currentTipo === 'bloque' && currentBlock !== null) {
        // Block mode: pass block number and fixed size to test.html
        const from = (currentBlock - 1) * BLOCK_SIZE;
        const to   = Math.min(currentBlock * BLOCK_SIZE, MAX_PREGUNTAS['celador-comun']);
        const n    = to - from;
        window.location.href = `test.html?categoria=${CATEGORIA}&bloque=${currentBloque}&modo=${currentModo}&n=${n}&desde=${from}&hasta=${to}`;
    } else {
        const input = document.getElementById('nInput');
        const max   = MAX_PREGUNTAS[currentBloque] || 100;
        const n     = parseInt(input.value);
        if (isNaN(n) || n < 1 || n > max) { validateN(); return; }
        window.location.href = `test.html?categoria=${CATEGORIA}&bloque=${currentBloque}&modo=${currentModo}&n=${n}`;
    }
}

// ── MODAL ERRORES ──────────────────────────────────
function openModalErrores() {
    document.getElementById('modalErrores').classList.add('open');
}

function closeModalErrores() {
    document.getElementById('modalErrores').classList.remove('open');
    document.getElementById('errorFileInput').value = '';
}

function closeErroresOutside(e) {
    if (e.target === document.getElementById('modalErrores')) closeModalErrores();
}

function startErrores(origen, input) {
    const KEY_ERRORES = 'osakidetza_errores_' + CATEGORIA;

    if (origen === 'local') {
        closeModalErrores();
        window.location.href = `test.html?categoria=${CATEGORIA}&bloque=errores&modo=practica&origen=local`;

    } else if (origen === 'archivo' && input && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importados = JSON.parse(e.target.result);
                if (!Array.isArray(importados)) throw new Error('Formato no válido');

                // Fusionar con localStorage: añadir solo preguntas nuevas (sin duplicados por texto)
                let existing = [];
                try { existing = JSON.parse(localStorage.getItem(KEY_ERRORES) || '[]'); } catch(_) {}
                const existingQs = new Set(existing.map(e => e.q));
                const nuevos     = importados.filter(e => !existingQs.has(e.q));
                const merged     = [...existing, ...nuevos];
                localStorage.setItem(KEY_ERRORES, JSON.stringify(merged));

                closeModalErrores();
                // Arrancar con origen=local porque ya está todo en localStorage
                window.location.href = `test.html?categoria=${CATEGORIA}&bloque=errores&modo=practica&origen=local`;
            } catch(err) {
                alert('El archivo no es válido. Asegúrate de subir el archivo de errores correcto.');
            }
        };
        reader.readAsText(input.files[0]);
    }
}

// Cerrar modales con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeModalErrores(); }
});

// ── EVENTOS ───────────────────────────────────────
document.querySelectorAll('.card[data-bloque]').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.bloque, card.dataset.nombre));
});
document.getElementById('cardErrores').addEventListener('click', openModalErrores);

document.getElementById('modalOverlay').addEventListener('click', closeModalOutside);
document.querySelectorAll('.tipo-option').forEach(btn => {
    btn.addEventListener('click', e => selectTipo(e, btn.dataset.tipo));
});
document.querySelectorAll('.mode-option').forEach(btn => {
    btn.addEventListener('click', e => selectModo(e, btn.dataset.modo));
});
document.getElementById('nInput').addEventListener('input', validateN);
document.querySelectorAll('.n-step-btn').forEach(btn => {
    btn.addEventListener('click', () => stepN(parseInt(btn.dataset.step)));
});
document.getElementById('btnCancelar').addEventListener('click', closeModal);
document.getElementById('btnStart').addEventListener('click', startTest);

document.getElementById('modalErrores').addEventListener('click', closeErroresOutside);
document.getElementById('btnErroresLocal').addEventListener('click', () => startErrores('local'));
document.getElementById('errorFileInput').addEventListener('change', e => startErrores('archivo', e.target));
document.getElementById('btnCancelarErrores').addEventListener('click', closeModalErrores);
