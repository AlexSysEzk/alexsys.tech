const menuToggle = document.getElementById('mobile-menu');
const navList = document.getElementById('nav-list');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('is-active');
    navList.classList.toggle('active');
});

// Lógica Modo Oscuro
const toggleBtn = document.getElementById('theme-toggle');
const htmlTag = document.documentElement;

toggleBtn.addEventListener('click', () => {
    if (htmlTag.getAttribute('data-theme') === 'light') {
        htmlTag.setAttribute('data-theme', 'dark');
        toggleBtn.textContent = 'Modo Claro';
    } else {
        htmlTag.setAttribute('data-theme', 'light');
        toggleBtn.textContent = 'Modo Oscuro';
    }
});

// El enlace "Categorías" solo abre el desplegable (hover), no navega
document.querySelectorAll('.dropbtn').forEach(a => {
    a.addEventListener('click', e => e.preventDefault());
});
