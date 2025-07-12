document.addEventListener('DOMContentLoaded', () => {

    const formatearMoneda = (valor) => {
        const numero = Number(valor);
        if (isNaN(numero)) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
        }).format(numero);
    };

    const modal = document.querySelector('#modal-gasto');
    const modalTitulo = document.querySelector('#modal-titulo');
    const modalCuerpo = document.querySelector('#modal-cuerpo');
    const btnCerrar = document.querySelector('#modal-cerrar');
    const btnImprimir = document.querySelector('#btn-imprimir');
    const modalContenidoImprimible = document.querySelector('.bg-white.rounded-lg');
    const btnCerrarFooter = document.querySelector('#btn-cerrar-footer');

    if (!modal || !modalContenidoImprimible || !btnImprimir || !btnCerrar || !modalTitulo || !modalCuerpo) {
        console.error("Error crítico: No se encontraron todos los elementos del modal. Revisa los IDs y clases en tu archivo Pug.");
        return;
    }

    const cerrarModal = () => { modal.classList.remove('flex'), modal.classList.add('hidden') };
    const abrirModal = () => { modal.classList.remove('hidden'), modal.classList.add('flex'); };
    btnCerrarFooter.addEventListener('click', cerrarModal);

    btnCerrar.addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'modal-gasto') cerrarModal();
    });
    btnImprimir.addEventListener('click', () => {
        window.print();
    });

    document.addEventListener('click', async (e) => {
        const botonVer = e.target.closest('.ver-gasto-btn');
        if (!botonVer) return;

        const gastoId = botonVer.dataset.gastoId;

        modalCuerpo.innerHTML = '<p class="text-center text-gray-500">Cargando detalles...</p>';
        abrirModal();

        try {
            const respuesta = await fetch(`/gastos/api/${gastoId}`);
            if (!respuesta.ok) {
                const errorInfo = await respuesta.json();
                throw new Error(errorInfo.message || 'No se pudo cargar la información del gasto.');
            }
            const gasto = await respuesta.json();
            mostrarDetallesEnModal(gasto);
        } catch (error) {
            console.error('Error al obtener los datos del gasto:', error);
            modalCuerpo.innerHTML = `<p class="text-center text-red-500 font-bold">${error.message}</p>`;
        }
    });

    function mostrarDetallesEnModal(gasto) {
        modalTitulo.textContent = `Detalle del Gasto: #${gasto.numero_factura || 'N/A'}`;
        const nombreProveedor = gasto.proveedore?.razon_social || '<span class="text-red-500">No Asignado</span>';
        let html = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><p class="font-semibold text-gray-500">Proveedor</p><p class="text-gray-800 text-base">${nombreProveedor}</p></div>
                    <div><p class="font-semibold text-gray-500">Fecha del Gasto</p><p class="text-gray-800 text-base">${new Date(gasto.fecha_gasto).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
                </div>
                ${gasto.descripcion ? `<div><p class="font-semibold text-gray-500">Descripción</p><p class="text-gray-800 bg-gray-50 p-2 rounded">${gasto.descripcion}</p></div>` : ''}
                <hr>
                <div>
                    <h4 class="text-lg font-bold mb-2 text-gray-700">Artículos</h4>
                    <ul class="space-y-2">`;
        if (gasto.gastos_adicionales_detalles && gasto.gastos_adicionales_detalles.length > 0) {
            gasto.gastos_adicionales_detalles.forEach(detalle => {
                const nombreArticulo = detalle.articulo?.nombre_articulo || 'Artículo no encontrado';
                html += `<li class="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><div><p class="font-semibold text-gray-800">${nombreArticulo}</p><p class="text-xs text-gray-500">${detalle.cantidad} x ${formatearMoneda(detalle.precio_unitario)}</p></div><p class="font-bold text-gray-900">${formatearMoneda(detalle.subtotal)}</p></li>`;
            });
        } else {
            html += `<li><p class="text-center text-gray-500">No se encontraron artículos.</p></li>`;
        }
        html += `</ul></div><hr><div class="flex justify-end items-center text-xl mt-4"><span class="text-gray-600 font-semibold mr-4">Total Gasto:</span><span class="text-green-600 font-bold">${formatearMoneda(gasto.valor_total)}</span></div></div>`;
        modalCuerpo.innerHTML = html;
    }
});