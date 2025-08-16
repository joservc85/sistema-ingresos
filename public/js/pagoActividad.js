document.addEventListener('DOMContentLoaded', () => {
    const procedimientoSelect = document.getElementById('procedimientoPrecio');
    const precioDisplay = document.getElementById('precio-procedimiento-display');
    const restanteDisplay = document.getElementById('monto-restante-display');
    const pagosContainer = document.getElementById('pagosContainer');
    const btnAgregarPago = document.getElementById('btnAgregarPago');
    const plantillaPago = document.getElementById('plantilla-pago');

    if (!procedimientoSelect || !pagosContainer || !btnAgregarPago || !plantillaPago) return;

    let precioProcedimiento = 0;

    const formatearMoneda = (valor) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
        }).format(valor || 0);
    };

    const actualizarCalculos = () => {
        let totalPagado = 0;
        pagosContainer.querySelectorAll('.monto-pago').forEach(input => {
            const valorNumerico = parseFloat(input.value.replace(/[^0-9]/g, '')) || 0;
            totalPagado += valorNumerico;
        });

        const restante = precioProcedimiento - totalPagado;
        restanteDisplay.textContent = formatearMoneda(restante);

        if (restante < 0) {
            restanteDisplay.classList.remove('text-red-600');
            restanteDisplay.classList.add('text-yellow-500');
        } else {
            restanteDisplay.classList.remove('text-yellow-500');
            restanteDisplay.classList.add('text-red-600');
        }
    };

    // --- FUNCIÓN MEJORADA PARA ACTUALIZAR EL PRECIO ---
    const actualizarPrecioProcedimiento = () => {
        const selectedOption = procedimientoSelect.options[procedimientoSelect.selectedIndex];
        if (selectedOption && selectedOption.dataset.precio) {
            precioProcedimiento = parseFloat(selectedOption.dataset.precio) || 0;
        } else {
            precioProcedimiento = 0;
        }
        precioDisplay.textContent = formatearMoneda(precioProcedimiento);
        actualizarCalculos();
    };

    procedimientoSelect.addEventListener('change', actualizarPrecioProcedimiento);

    const anadirFila = () => {
        const nuevaFila = plantillaPago.content.cloneNode(true);
        pagosContainer.appendChild(nuevaFila);
    };

    btnAgregarPago.addEventListener('click', anadirFila);

    pagosContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('forma-pago-select')) {
            const fila = e.target.closest('.pago-item');
            const selectedOption = e.target.options[e.target.selectedIndex];
            const nombreForma = selectedOption.dataset.nombre;
            
            const campoBanco = fila.querySelector('.campo-banco');
            const campoReferencia = fila.querySelector('.campo-referencia');

            campoBanco.classList.toggle('hidden', nombreForma !== 'Transferencia');
            campoReferencia.classList.toggle('hidden', nombreForma !== 'Transferencia' && nombreForma !== 'Datafono');
        }
    });

    pagosContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('monto-pago')) {
            const valorLimpio = e.target.value.replace(/[^0-9]/g, '');
            const numero = parseInt(valorLimpio, 10) || 0;
            e.target.value = numero.toLocaleString('es-CO');
            actualizarCalculos();
        }
    });

    pagosContainer.addEventListener('click', (e) => {
        if (e.target.closest('.eliminar-pago')) {
            if (pagosContainer.children.length > 1) {
                e.target.closest('.pago-item').remove();
                actualizarCalculos();
            } else {
                Swal.fire('Acción no permitida', 'Debe haber al menos una forma de pago.', 'warning');
            }
        }
    });

    // --- INICIALIZACIÓN ---
    // Añadir la primera fila de pago al cargar la página
    if (pagosContainer.children.length === 0) {
        anadirFila();
    }
    // Ejecutar la función de actualización de precio al cargar, por si hay un valor preseleccionado
    actualizarPrecioProcedimiento();
});