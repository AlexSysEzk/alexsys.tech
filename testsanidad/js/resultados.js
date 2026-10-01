// ── CONFIG ────────────────────────────────────
const KEY = 'osakidetza_resultados';
const NOMBRES = { 'celador': 'Celador/a', 'enfermeria': 'Enfermería' };

// ── ESTADO ────────────────────────────────────
let allResults   = [];
let filtered     = [];
let activeFilter = 'todas';
let sortCol      = 'fecha';
let sortDir      = 'desc';
let chartEvo     = null;
let chartBar     = null;

// ── INIT ──────────────────────────────────────
function init() {
    try { allResults = JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch(e) { allResults = []; }

    if (allResults.length === 0) {
        document.getElementById('emptyState').classList.add('show');
        return;
    }
    document.getElementById('mainContent').classList.add('show');
    buildFilters();
    applyFilter('todas');
}

// ── FILTROS ───────────────────────────────────
function buildFilters() {
    const bar = document.getElementById('filterBar');
    bar.innerHTML = '';
    bar.appendChild(makeFilterBtn('todas', 'Todos', true));
    [...new Set(allResults.map(r => r.categoria))].sort().forEach(c => {
        bar.appendChild(makeFilterBtn(c, NOMBRES[c] || c, false));
    });
}

function makeFilterBtn(val, label, active) {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (active ? ' active' : '');
    btn.id = 'filter-' + val;
    btn.textContent = label;
    btn.addEventListener('click', () => applyFilter(val));
    return btn;
}

function applyFilter(val) {
    activeFilter = val;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const ab = document.getElementById('filter-' + val);
    if (ab) ab.classList.add('active');
    filtered = val === 'todas' ? [...allResults] : allResults.filter(r => r.categoria === val);
    updateStats();
    updateCharts();
    updateTable();
}

// ── STATS ─────────────────────────────────────
function updateStats() {
    const notas = filtered.map(r => parseFloat(r.nota));
    document.getElementById('statTotal').textContent = filtered.length;
    document.getElementById('statMedia').textContent = notas.length ? (notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(1) : '—';
    document.getElementById('statMejor').textContent = notas.length ? Math.max(...notas).toFixed(1) : '—';
    document.getElementById('statPeor').textContent  = notas.length ? Math.min(...notas).toFixed(1) : '—';
}

// ── GRÁFICOS ──────────────────────────────────
function getC() {
    const dark = htmlTag.getAttribute('data-theme') === 'dark';
    return {
        grid:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        tick:   dark ? '#94a3b8' : '#64748b',
        accent: dark ? '#38bdf8' : '#005c8a'
    };
}

function updateCharts() {
    const c      = getC();
    const sorted = [...filtered].sort((a,b) => a.id - b.id);
    const labels = sorted.map(r => r.fecha + (r.hora ? ' ' + r.hora : ''));
    const data   = sorted.map(r => parseFloat(r.nota));

    if (chartEvo) chartEvo.destroy();
    chartEvo = new Chart(document.getElementById('chartEvolucion'), {
        type: 'line',
        data: { labels, datasets: [{ data, borderColor: c.accent, backgroundColor: c.accent + '18',
            borderWidth: 2, pointBackgroundColor: data.map(n => n >= 5 ? '#16a34a' : '#dc2626'),
            pointBorderColor: 'transparent', pointRadius: 5, tension: 0.3, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Nota: ${ctx.parsed.y}` } } },
            scales: {
                x: { ticks: { color: c.tick, font: { size: 9 }, maxRotation: 45 }, grid: { color: c.grid } },
                y: { min: 0, max: 10, ticks: { color: c.tick, font: { size: 10 } }, grid: { color: c.grid } }
            }
        }
    });

    const source  = activeFilter === 'todas' ? allResults : filtered;
    const cats    = [...new Set(source.map(r => r.categoria))].sort();
    const medias  = cats.map(cat => {
        const ns = source.filter(r => r.categoria === cat).map(r => parseFloat(r.nota));
        return +(ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1);
    });
    const colors  = medias.map(n => n >= 7 ? '#16a34a' : n >= 5 ? '#005c8a' : '#dc2626');

    if (chartBar) chartBar.destroy();
    chartBar = new Chart(document.getElementById('chartCategorias'), {
        type: 'bar',
        data: { labels: cats.map(cat => NOMBRES[cat] || cat),
            datasets: [{ data: medias, backgroundColor: colors.map(col => col + '30'),
                borderColor: colors, borderWidth: 2, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Media: ${ctx.parsed.y}` } } },
            scales: {
                x: { ticks: { color: c.tick, font: { size: 10 } }, grid: { color: c.grid } },
                y: { min: 0, max: 10, ticks: { color: c.tick, font: { size: 10 } }, grid: { color: c.grid } }
            }
        }
    });
}

// ── TABLA ─────────────────────────────────────
function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    getSorted(filtered).forEach(r => {
        const nota = parseFloat(r.nota);
        const cls  = nota >= 7 ? 'nota-high' : nota >= 5 ? 'nota-mid' : 'nota-low';
        const tr   = document.createElement('tr');
        // Los datos pueden venir de un JSON importado: se escriben como texto, nunca como HTML
        [
            ['td-mono',            `${r.fecha}${r.hora ? ' ' + r.hora : ''}`],
            ['td-cat',             NOMBRES[r.categoria] || r.categoria],
            ['td-mono',            r.total],
            ['td-ok',              r.correctas],
            ['td-ko',              r.incorrectas],
            ['td-nota ' + cls,     nota.toFixed(1)]
        ].forEach(([clase, texto]) => {
            const td = document.createElement('td');
            td.className   = clase;
            td.textContent = texto;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    document.querySelectorAll('th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
    const at = document.getElementById('th-' + sortCol);
    if (at) at.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
}

function getSorted(data) {
    return [...data].sort((a, b) => {
        let va = a[sortCol], vb = b[sortCol];
        if (['nota','total','correctas','incorrectas'].includes(sortCol)) { va = parseFloat(va); vb = parseFloat(vb); }
        else if (sortCol === 'fecha') { va = a.id; vb = b.id; }
        else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ?  1 : -1;
        return 0;
    });
}

function sortBy(col) {
    sortDir = sortCol === col ? (sortDir === 'asc' ? 'desc' : 'asc') : (col === 'fecha' ? 'desc' : 'asc');
    sortCol = col;
    updateTable();
}

// ── EXPORT / IMPORT ───────────────────────────
function exportJSON() {
    try {
        const data = JSON.parse(localStorage.getItem(KEY) || '[]');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'mis_resultados_osakidetza.json'; a.click();
        URL.revokeObjectURL(url);
    } catch(e) { alert('Error al exportar: ' + e.message); }
}

function importJSON(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error('Formato no válido');
            const existing    = JSON.parse(localStorage.getItem(KEY) || '[]');
            const existingIds = new Set(existing.map(r => r.id));
            const merged      = [...existing, ...imported.filter(r => !existingIds.has(r.id))];
            localStorage.setItem(KEY, JSON.stringify(merged));
            const fb = document.getElementById('backupFeedback');
            fb.textContent = `✓ ${merged.length - existing.length} resultados importados`;
            fb.classList.add('show');
            setTimeout(() => location.reload(), 1200);
        } catch(err) { alert('Error al importar: ' + err.message); }
    };
    reader.readAsText(file);
    input.value = '';
}

function clearAll() {
    if (!confirm('¿Seguro que quieres borrar todo el historial? Esta acción no se puede deshacer.')) return;
    localStorage.removeItem(KEY);
    location.reload();
}

// ── MODAL AYUDA ───────────────────────────────
function openHelp()  { document.getElementById('helpOverlay').classList.add('open'); }
function closeHelp() { document.getElementById('helpOverlay').classList.remove('open'); }
function closeHelpOutside(e) { if (e.target === document.getElementById('helpOverlay')) closeHelp(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeHelp(); });


// ── SECCIÓN ERRORES ──────────────────────────────────────
const CATEGORIAS = [
    { key: 'celador',    nombre: 'Celador/a' },
    { key: 'enfermeria', nombre: 'Enfermería' }
];

function initErrores() {
    const section = document.getElementById('erroresSection');

    // Solo mostrar categorías con errores guardados
    const catsConDatos = CATEGORIAS.filter(cat => {
        try {
            const pool = JSON.parse(localStorage.getItem('osakidetza_errores_' + cat.key) || '[]');
            return pool.length > 0;
        } catch(_) { return false; }
    });

    if (catsConDatos.length === 0) {
        section.innerHTML = '<div class="errores-empty">No hay errores guardados todavía.<br>Completa un examen en modo Examen para empezar a acumularlos.</div>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'errores-grid';

    catsConDatos.forEach(cat => {
        const key  = 'osakidetza_errores_' + cat.key;
        const pool = JSON.parse(localStorage.getItem(key) || '[]');

        const card = document.createElement('div');
        card.className = 'errores-card';
        card.innerHTML = `
            <div class="errores-card-title">${cat.nombre}</div>
            <div class="errores-card-count"><strong>${pool.length}</strong> preguntas guardadas</div>
            <div class="errores-card-actions">
                <button class="btn-err" data-accion="descargar">💾 Descargar</button>
                <button class="btn-err danger" data-accion="borrar">🗑 Borrar</button>
            </div>
        `;
        card.querySelector('[data-accion="descargar"]').addEventListener('click', () => descargarErroresCat(cat.key));
        card.querySelector('[data-accion="borrar"]').addEventListener('click', () => borrarErroresCat(cat.key, cat.nombre));
        grid.appendChild(card);
    });

    section.appendChild(grid);
}

function cargarErroresArchivo(input) {
    const file = input.files[0];
    if (!file) return;

    // Intentar detectar la categoría por el nombre del archivo
    const nombre = file.name.toLowerCase();
    let catKey = null;
    if (nombre.includes('celador'))    catKey = 'celador';
    if (nombre.includes('enfermeria')) catKey = 'enfermeria';

    if (!catKey) {
        // Preguntar al usuario
        const opciones = CATEGORIAS.map((c, i) => `${i+1}. ${c.nombre}`).join('\n');
        const resp = prompt(`¿A qué categoría pertenecen estos errores?\n${opciones}\nEscribe 1 o 2:`);
        const idx  = parseInt(resp) - 1;
        if (isNaN(idx) || idx < 0 || idx >= CATEGORIAS.length) {
            alert('Categoría no válida. Operación cancelada.');
            input.value = '';
            return;
        }
        catKey = CATEGORIAS[idx].key;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importados = JSON.parse(e.target.result);
            if (!Array.isArray(importados)) throw new Error('Formato no válido');

            const key = 'osakidetza_errores_' + catKey;
            let existing = [];
            try { existing = JSON.parse(localStorage.getItem(key) || '[]'); } catch(_) {}
            const existingQs = new Set(existing.map(e => e.q));
            const nuevos     = importados.filter(e => !existingQs.has(e.q));
            const merged     = [...existing, ...nuevos];
            localStorage.setItem(key, JSON.stringify(merged));

            const fb = document.getElementById('erroresFeedback');
            fb.textContent = `✓ ${nuevos.length} errores importados en ${CATEGORIAS.find(c=>c.key===catKey).nombre}`;
            fb.classList.add('show');
            setTimeout(() => location.reload(), 1200);
        } catch(err) {
            alert('El archivo no es válido: ' + err.message);
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function descargarErroresCat(categoria) {
    const key = 'osakidetza_errores_' + categoria;
    let pool  = [];
    try { pool = JSON.parse(localStorage.getItem(key) || '[]'); } catch(_) {}
    if (!pool.length) return;
    const blob = new Blob([JSON.stringify(pool, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `errores_${categoria}.json`; a.click();
    URL.revokeObjectURL(url);
}

function borrarErroresCat(categoria, nombre) {
    if (!confirm(`¿Seguro que quieres borrar todos los errores de ${nombre}? Esta acción no se puede deshacer.`)) return;
    localStorage.removeItem('osakidetza_errores_' + categoria);
    location.reload();
}

// ── EVENTOS ───────────────────────────────────
document.getElementById('fileInput').addEventListener('change', e => importJSON(e.target));
document.getElementById('btnExport').addEventListener('click', exportJSON);
document.getElementById('btnHelp').addEventListener('click', openHelp);
document.getElementById('btnClear').addEventListener('click', clearAll);
document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => sortBy(th.dataset.sort));
});
document.getElementById('errFileInput').addEventListener('change', e => cargarErroresArchivo(e.target));
document.getElementById('helpOverlay').addEventListener('click', closeHelpOutside);
document.getElementById('btnCloseHelp').addEventListener('click', closeHelp);
document.getElementById('btnOkHelp').addEventListener('click', closeHelp);

init();
initErrores();
