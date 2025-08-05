// Crea un nuevo archivo en: /public/js/cierreCaja.js

document.addEventListener('DOMContentLoaded', () => {
    const camposConteo = document.querySelectorAll('.conteo-efectivo');
    const totalEfectivoDisplay = document.getElementById('total_efectivo_display');
    const totalEfectivoContadoHidden = document.getElementById('total_efectivo_contado');
    const totalEfectivoSistemaHidden = document.getElementById('total_efectivo_sistema');
    const descuadreDisplay = document.getElementById('descuadre_display');
    const descuadreHidden = document.getElementById('descuadre_hidden');
    const desgloseHidden = document.getElementById('desglose_efectivo_hidden');

    if (!camposConteo.length) return;

    const calcularTotales = () => {
        let totalContado = 0;
        const desglose = {};

        camposConteo.forEach(input => {
            const cantidad = parseInt(input.value, 10) || 0;
            const valor = parseFloat(input.dataset.valor);
            
            if (cantidad > 0) {
                totalContado += cantidad * valor;
                desglose[`${valor}`] = cantidad;
            }
        });

        const totalSistema = parseFloat(totalEfectivoSistemaHidden.value) || 0;
        const descuadre = totalContado - totalSistema;

        // Actualizar la vista
        totalEfectivoDisplay.textContent = `$${totalContado.toLocaleString('es-CO')}`;
        descuadreDisplay.textContent = `$${descuadre.toLocaleString('es-CO')}`;
        
        if (descuadre < 0) {
            descuadreDisplay.classList.remove('text-green-600');
            descuadreDisplay.classList.add('text-red-600');
        } else {
            descuadreDisplay.classList.remove('text-red-600');
            descuadreDisplay.classList.add('text-green-600');
        }

        // Actualizar los inputs ocultos para el envío del formulario
        totalEfectivoContadoHidden.value = totalContado;
        descuadreHidden.value = descuadre;
        desgloseHidden.value = JSON.stringify(desglose);
    };

    camposConteo.forEach(input => {
        input.addEventListener('input', calcularTotales);
    });

    // Calcular totales al cargar la página por si hay valores previos
    calcularTotales();
});