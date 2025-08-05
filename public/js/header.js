document.addEventListener('DOMContentLoaded', () => {
    // Lógica para el menú de hamburguesa
    const hamburgerButton = document.getElementById('hamburger-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (hamburgerButton && mobileMenu) {
        hamburgerButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Lógica para los menús desplegables
    const dropdownToggles = document.querySelectorAll('[data-dropdown-toggle]');
    
    dropdownToggles.forEach(toggle => {
        const button = toggle.querySelector('button');
        const menu = toggle.querySelector('div.absolute'); // Selector más específico

        if (button && menu) {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // Evita que el clic se propague al 'window'
                // Cerrar otros menús antes de abrir el actual
                closeAllDropdowns(menu);
                menu.classList.toggle('hidden');
            });
        }
    });

    // Función para cerrar todos los menús desplegables
    const closeAllDropdowns = (exceptMenu = null) => {
        document.querySelectorAll('[data-dropdown-toggle] > div.absolute').forEach(menu => {
            if (menu !== exceptMenu) {
                menu.classList.add('hidden');
            }
        });
    };

    // Cerrar los menús si se hace clic en cualquier otra parte de la página
    window.addEventListener('click', () => {
        closeAllDropdowns();
    });
});