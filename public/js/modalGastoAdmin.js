// En /public/js/modalGastoAdmin.js

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-gasto-admin');
    const cerrarModalBtn = document.getElementById('modal-admin-cerrar');
    const cerrarFooterBtn = document.getElementById('btn-admin-cerrar-footer');
    const modalCuerpo = document.getElementById('modal-admin-cuerpo');
    const contenedorPrincipal = document.querySelector('body');

    if (!modal) return;

    // --- CORRECCIÓN: Funciones para abrir y cerrar que controlan las clases de centrado ---
    const abrirModal = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'items-center', 'justify-center');
    };
    const cerrarModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'items-center', 'justify-center');
    };

    contenedorPrincipal.addEventListener('click', async (e) => {
        const botonVer = e.target.closest('.ver-gasto-admin-btn');
        if (!botonVer) return;

        const gastoId = botonVer.dataset.gastoAdminId;
        if (!gastoId) return;

        try {
            modalCuerpo.innerHTML = '<p class="text-center text-gray-500">Cargando detalles...</p>';
            abrirModal(); // Se llama a la nueva función

            const response = await fetch(`/gastos-administrativos/ver/${gastoId}`);
            if (!response.ok) {
                throw new Error('No se pudo cargar el detalle del gasto.');
            }
            const gasto = await response.json();

            // Llenar el cuerpo del modal con los datos
            modalCuerpo.innerHTML = '';
            const infoDiv = document.createElement('div');
            infoDiv.className = 'space-y-2 mb-4 text-sm border-b pb-4';
            infoDiv.innerHTML = `
                <p><strong class="font-semibold text-gray-700 w-28 inline-block">Fecha:</strong> ${new Date(gasto.createdAt).toLocaleDateString('es-VE')}</p>
                <p><strong class="font-semibold text-gray-700 w-28 inline-block">Registrado por:</strong> ${gasto.usuario.nombre}</p>
                <p><strong class="font-semibold text-gray-700 w-28 inline-block align-top">Descripción:</strong> <span class="inline-block w-2/3">${gasto.descripcion}</span></p>
            `;
            modalCuerpo.appendChild(infoDiv);

            if (gasto.detalles && gasto.detalles.length > 0) {
                const tabla = document.createElement('table');
                tabla.className = 'w-full text-sm text-left mt-4';
                tabla.innerHTML = `
                    <thead class="bg-gray-100 text-gray-600 uppercase">
                        <tr>
                            <th class="px-4 py-2">Artículo</th>
                            <th class="px-4 py-2 text-right">Cantidad Consumida</th>
                        </tr>
                    </thead>
                `;
                const tbody = document.createElement('tbody');
                gasto.detalles.forEach(detalle => {
                    const tr = document.createElement('tr');
                    tr.className = 'border-b';
                    tr.innerHTML = `
                        <td class="px-4 py-2">${detalle.Articulo.nombre_articulo}</td>
                        <td class="px-4 py-2 text-right">${detalle.cantidad}</td>
                    `;
                    tbody.appendChild(tr);
                });
                tabla.appendChild(tbody);
                modalCuerpo.appendChild(tabla);
            } else {
                modalCuerpo.innerHTML += '<p class="text-gray-500 mt-4">No hay artículos detallados para este consumo.</p>';
            }

        } catch (error) {
            console.error(error);
            cerrarModal();
            Swal.fire('Error', 'No se pudo cargar el detalle del gasto.', 'error');
        }
    });

    cerrarModalBtn.addEventListener('click', cerrarModal);
    cerrarFooterBtn.addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModal();
        }
    });
});