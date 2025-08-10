function formatNumberInput(event) {
    const visibleInput = event.target;
    // El ID del input oculto se deduce del ID del visible (ej: 'precio_compra_display' -> 'precio_compra')
    const hiddenInputId = visibleInput.id.replace('_display', '');
    const hiddenInput = document.getElementById(hiddenInputId);

    if (!hiddenInput) {
        console.error(`No se encontró el campo oculto #${hiddenInputId}`);
        return;
    }

    // 1. Limpiar el valor de cualquier cosa que no sea un número
    const valorLimpio = visibleInput.value.replace(/[^0-9]/g, '');

    // 2. Asignar el valor limpio al campo oculto
    hiddenInput.value = valorLimpio || '0';

    // 3. Formatear el campo visible con puntos de mil
    const numero = parseInt(valorLimpio, 10);
    if (!isNaN(numero)) {
        visibleInput.value = numero.toLocaleString('es-CO');
    } else {
        visibleInput.value = '';
    }
}