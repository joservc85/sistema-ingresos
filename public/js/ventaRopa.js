// Crea un nuevo archivo en: /public/js/ventaRopa.js

document.addEventListener('DOMContentLoaded', function() {
    const btnAgregar = document.getElementById('agregar-detalle');
    const container = document.getElementById('detalle-venta-container');
    const plantilla = document.getElementById('plantilla-detalle');

    if (!btnAgregar || !container || !plantilla) {
        return; // No hacer nada si los elementos no existen
    }

    // Función para añadir la primera fila al cargar la página
    const anadirPrimeraFila = () => {
        if (container.children.length === 0) {
            const nuevaFila = plantilla.firstElementChild.cloneNode(true);
            container.appendChild(nuevaFila);
        }
    };

    // Añadir una nueva fila al hacer clic
    btnAgregar.addEventListener('click', () => {
        const nuevaFila = plantilla.firstElementChild.cloneNode(true);
        // Limpiar los valores de la nueva fila clonada
        nuevaFila.querySelector('select').selectedIndex = 0;
        nuevaFila.querySelector('input[type="number"]').value = '1';
        container.appendChild(nuevaFila);
    });

    // Delegación de eventos para eliminar filas
    container.addEventListener('click', (e) => {
        if (e.target.closest('.eliminar-detalle')) {
            // Evitar eliminar la última fila
            if (container.querySelectorAll('.detalle-item').length > 1) {
                e.target.closest('.detalle-item').remove();
            } else {
                Swal.fire('Acción no permitida', 'Debe haber al menos una fila de artículo.', 'warning');
            }
        }
    });

    // Cargar la primera fila al iniciar
    anadirPrimeraFila();
});