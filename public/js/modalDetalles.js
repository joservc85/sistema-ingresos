document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalDetalles');
    const cerrarModalBtn = document.getElementById('cerrarModal');
    const modalContenido = document.getElementById('modalContenido');
    const contenedorPrincipal = document.querySelector('body');

    // Si no hay modal en esta página, no hacer nada.
    if (!modal) return;

    // --- Función para ABRIR la modal ---
    const abrirModal = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'items-center', 'justify-center');
    };

    // --- Función para CERRAR la modal ---
    const cerrarModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'items-center', 'justify-center');
    };

    // --- Evento para ABRIR la modal y llenar su contenido ---
    contenedorPrincipal.addEventListener('click', (e) => {
        const boton = e.target.closest('.ver-detalles-btn');

        if (boton) {
            // 1. Obtener y procesar los datos del botón
            const detalles = JSON.parse(boton.dataset.detalles);
            
            // 2. Limpiar el contenido anterior de la modal
            modalContenido.innerHTML = '';

            // 3. Crear y añadir la nueva lista de materiales
            if (detalles && detalles.length > 0) {
                const lista = document.createElement('ul');
                lista.className = 'list-disc list-inside space-y-2 text-gray-700 marker:text-fuchsia-500';
                
                detalles.forEach(detalle => {
                    const item = document.createElement('li');
                    item.textContent = `${detalle.cantidad} x ${detalle.Articulo.nombre_articulo}`;
                    lista.appendChild(item);
                });
                modalContenido.appendChild(lista);

            } else {
                modalContenido.innerHTML = '<p class="text-gray-500">No se utilizaron materiales en esta actividad.</p>';
            }

            // 4. Llamar a la función para mostrar la modal ya con el contenido listo
            abrirModal();
        }
    });

    // --- Eventos para CERRAR la modal ---
    cerrarModalBtn.addEventListener('click', cerrarModal);
    
    // Cerrar si se hace clic en el fondo oscuro
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModal();
        }
    });
});