// Crea un nuevo archivo en: /public/js/modalVentaRopa.js

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-venta-ropa');
    const cerrarModalBtn = document.getElementById('modal-venta-cerrar');
    const cerrarFooterBtn = document.getElementById('btn-venta-cerrar-footer');
    const modalCuerpo = document.getElementById('modal-venta-cuerpo');
    const contenedorPrincipal = document.querySelector('body');

    if (!modal) return;

    const abrirModal = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'items-center', 'justify-center');
    };
    const cerrarModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'items-center', 'justify-center');
    };

    contenedorPrincipal.addEventListener('click', async (e) => {
        const botonVer = e.target.closest('.ver-venta-btn');
        if (!botonVer) return;

        const ventaId = botonVer.dataset.ventaId;
        if (!ventaId) return;

        try {
            modalCuerpo.innerHTML = '<p class="text-center text-gray-500">Cargando detalles...</p>';
            abrirModal();

            const response = await fetch(`/ventas/ropa/ver/${ventaId}`);
            if (!response.ok) {
                throw new Error('No se pudo cargar el detalle de la venta.');
            }
            const venta = await response.json();

            modalCuerpo.innerHTML = '';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'space-y-2 mb-4 text-sm border-b pb-4';
            // --- CORRECCIÓN: Usar 'venta.cliente' y 'venta.usuario' (con minúsculas) ---
            infoDiv.innerHTML = `
                <p><strong class="font-semibold text-gray-700 w-28 inline-block">Fecha:</strong> ${new Date(venta.fecha_venta).toLocaleDateString('es-VE')}</p>
                <p><strong class="font-semibold text-gray-700 w-28 inline-block">Cliente:</strong> ${venta.cliente ? `${venta.cliente.nombre} ${venta.cliente.apellidos}` : 'Consumidor Final'}</p>
                <p><strong class="font-semibold text-gray-700 w-28 inline-block">Registrado por:</strong> ${venta.usuario.nombre}</p>
            `;
            modalCuerpo.appendChild(infoDiv);

            if (venta.detalles && venta.detalles.length > 0) {
                const tabla = document.createElement('table');
                tabla.className = 'w-full text-sm text-left mt-4';
                tabla.innerHTML = `
                    <thead class="bg-gray-100 text-gray-600 uppercase">
                        <tr>
                            <th class="px-4 py-2">Artículo</th>
                            <th class="px-4 py-2 text-center">Cantidad</th>
                            <th class="px-4 py-2 text-right">Precio Unit.</th>
                            <th class="px-4 py-2 text-right">Subtotal</th>
                        </tr>
                    </thead>
                `;
                const tbody = document.createElement('tbody');
                venta.detalles.forEach(detalle => {
                    const tr = document.createElement('tr');
                    tr.className = 'border-b';
                    // --- CORRECCIÓN: Usar 'detalle.articuloRopa' (con 'a' minúscula) ---
                    tr.innerHTML = `
                        <td class="px-4 py-2">${detalle.articulos_ropa.nombre} (${detalle.articulos_ropa.talla || 'N/A'})</td>
                        <td class="px-4 py-2 text-center">${detalle.cantidad}</td>
                        <td class="px-4 py-2 text-right">$ ${parseFloat(detalle.precio_unitario).toLocaleString('es-CO')}</td>
    <td class="px-4 py-2 text-right font-semibold">$ ${parseFloat(detalle.subtotal).toLocaleString('es-CO')}</td>
                    `;
                    tbody.appendChild(tr);
                });
                
                // Fila de Total
                const tfoot = document.createElement('tfoot');
                tfoot.innerHTML = `
                    <tr class="font-bold bg-gray-100">
                        <td colspan="3" class="px-4 py-2 text-right">TOTAL VENTA:</td>
                        <td class="px-4 py-2 text-right">$${parseFloat(venta.total_venta).toFixed(2)}</td>
                    </tr>
                `;
                tabla.appendChild(tbody);
                tabla.appendChild(tfoot);
                modalCuerpo.appendChild(tabla);
            }

        } catch (error) {
            console.error(error);
            cerrarModal();
            Swal.fire('Error', 'No se pudo cargar el detalle de la venta.', 'error');
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