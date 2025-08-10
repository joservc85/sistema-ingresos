// Reemplaza el contenido de tu archivo: /public/js/pagoActividad.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG: Script pagoActividad.js cargado.');

    const procedimientoSelect = document.getElementById('procedimientoPrecio');
    const precioDisplay = document.getElementById('precio-procedimiento-display');
    const restanteDisplay = document.getElementById('monto-restante-display');
    const pagosContainer = document.getElementById('pagosContainer');
    const btnAgregarPago = document.getElementById('btnAgregarPago');
    const plantillaPago = document.getElementById('plantilla-pago');

    // Verificación de elementos
    if (!procedimientoSelect) console.error('DEBUG: No se encontró el elemento #procedimientoPrecio');
    if (!precioDisplay) console.error('DEBUG: No se encontró el elemento #precio-procedimiento-display');
    if (!pagosContainer) console.error('DEBUG: No se encontró el elemento #pagosContainer');
    if (!btnAgregarPago) console.error('DEBUG: No se encontró el elemento #btnAgregarPago');
    if (!plantillaPago) console.error('DEBUG: No se encontró el elemento #plantilla-pago');

    if (!procedimientoSelect || !pagosContainer || !btnAgregarPago || !plantillaPago || !precioDisplay) {
        console.error('DEBUG: Faltan elementos esenciales. El script no continuará.');
        return;
    }
    
    console.log('DEBUG: Todos los elementos fueron encontrados. Inicializando lógica.');

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

    procedimientoSelect.addEventListener('change', () => {
        console.log('DEBUG: ¡El evento "change" del procedimiento fue detectado!');
        
        const selectedOption = procedimientoSelect.options[procedimientoSelect.selectedIndex];
        console.log('DEBUG: Opción seleccionada:', selectedOption);

        const precioData = selectedOption.dataset.precio;
        console.log('DEBUG: Valor de data-precio:', precioData);

        precioProcedimiento = parseFloat(precioData) || 0;
        console.log('DEBUG: Precio del procedimiento establecido en:', precioProcedimiento);

        precioDisplay.textContent = formatearMoneda(precioProcedimiento);
        console.log('DEBUG: Texto del display de precio actualizado a:', precioDisplay.textContent);

        actualizarCalculos();
    });

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

    anadirFila();
});