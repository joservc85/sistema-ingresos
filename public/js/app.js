// public/js/app.js

// ===================================================
// PARTE 1: TU FUNCIÓN DE FORMATO (YA LA TIENES)
// ===================================================
function formatNumberInput(event) {
    const visibleInput = event.target;
    const hiddenInputId = visibleInput.dataset.targetHiddenId;
    if (!hiddenInputId) {
        console.error('Error: El input visible no tiene el atributo data-target-hidden-id.');
        return;
    }
    
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!hiddenInput) {
        console.error(`Error: No se encontró el input oculto con el ID: ${hiddenInputId}`);
        return;
    }

    let numericValue = visibleInput.value.replace(/[^0-9]/g, '');
    hiddenInput.value = numericValue;

    if (numericValue) {
        const number = parseInt(numericValue, 10);
        visibleInput.value = new Intl.NumberFormat('es-CO').format(number);
    } else {
        visibleInput.value = '';
    }
}

// ===================================================
// PARTE 2: LA LÓGICA DE EVENTOS PARA EL RESETEO (LA QUE DEBES AÑADIR)
// ===================================================
document.addEventListener('DOMContentLoaded', function() {

    const selectPrecio = document.querySelector('#precioExistente');
    const inputVisiblePrecio = document.querySelector('#precioNuevo_display');
    const inputOcultoPrecio = document.querySelector('#precioNuevo');

    if (!selectPrecio || !inputVisiblePrecio || !inputOcultoPrecio) {
        return;
    }

    selectPrecio.addEventListener('change', function() {
        if (this.value !== '') {
            inputVisiblePrecio.value = '';
            inputOcultoPrecio.value = '';
        }
    });

    inputVisiblePrecio.addEventListener('input', function() {
        if (this.value !== '') {
            selectPrecio.value = '';
        }
    });

});