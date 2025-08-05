// public/js/crearActividad.js

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // REFERENCIAS A ELEMENTOS DEL DOM
    // =========================================================================
    const procedimientoPrecioSelect = document.getElementById('procedimientoPrecio');
    const procedimientoHiddenInput = document.getElementById('procedimientoHidden');
    const precioHiddenInput = document.getElementById('precioHidden');
    const soloValesCheckbox = document.getElementById('soloVales');
    const valesInput = document.getElementById('vales');
    const vales_display = document.getElementById('vales_display');
    const descripcionInput = document.getElementById('descripcion');
    const cliente = document.getElementById('cliente');
    const btnAgregarMaterial = document.getElementById('btnAgregarMaterial');
    const materialesContainer = document.getElementById('materialesContainer');
    const seccionMateriales = document.getElementById('seccionMateriales');
    // --- ¡NUEVAS REFERENCIAS AÑADIDAS! ---
    const formaDePagoSelect = document.getElementById('formaDePagoId');
    const bancoSelect = document.getElementById('bancoId');
    const campoReferencia = document.getElementById('campo-referencia');

    // =========================================================================
    // DECLARACIÓN DE FUNCIONES
    // =========================================================================

    // Función para actualizar campos ocultos de procedimiento y precio.
    // Se declara aquí para que esté disponible en todo el script.
    const actualizarCamposOcultos = () => {
        if (!procedimientoPrecioSelect) return; // Evita errores si el elemento no existe

        const selectedValue = procedimientoPrecioSelect.value;
        if (selectedValue) {
            const [procedimientoId, precioId] = selectedValue.split('-');
            procedimientoHiddenInput.value = procedimientoId;
            precioHiddenInput.value = precioId;
        } else {
            procedimientoHiddenInput.value = '';
            precioHiddenInput.value = '';
        }
    };


    // =========================================================================
    // EJECUCIÓN DE LÓGICA Y EVENT LISTENERS
    // =========================================================================

    // --- Lógica para el select de Procedimiento y Precio ---
    if (procedimientoPrecioSelect) {
        procedimientoPrecioSelect.addEventListener('change', actualizarCamposOcultos);
        actualizarCamposOcultos(); // Llamada inicial
    }

    // --- Lógica para el checkbox "Solo registrar Vales" ---
    if (soloValesCheckbox) {
        const toggleValeFields = () => {
            const isChecked = soloValesCheckbox.checked;

            // Habilitar/deshabilitar campos de Vales
            if (vales_display) vales_display.disabled = !isChecked;
            if (descripcionInput) descripcionInput.disabled = !isChecked;

            // Habilitar/deshabilitar campos de Actividad
            if (procedimientoPrecioSelect) procedimientoPrecioSelect.disabled = isChecked;
            if (cliente) cliente.disabled = isChecked;

            // Ocultar/mostrar sección de Materiales
            if (seccionMateriales) {
                seccionMateriales.style.display = isChecked ? 'none' : 'block';
            }

            // Si está marcado (solo vales), limpiar campos de actividad y poner foco
            if (isChecked) {
                if (procedimientoPrecioSelect) procedimientoPrecioSelect.value = '';
                if (cliente) cliente.value = '';
                actualizarCamposOcultos(); // Limpia campos ocultos
                if (vales_display) vales_display.focus();
            } else {
                // Si no está marcado, limpiar campos de vales
                if (vales_display) vales_display.value = '';
                if (valesInput) valesInput.value = '';
                if (descripcionInput) descripcionInput.value = '';
            }
        };

        soloValesCheckbox.addEventListener('change', toggleValeFields);
        toggleValeFields(); // Llamada inicial para establecer el estado correcto al cargar
    }

    // --- ¡NUEVA LÓGICA AÑADIDA PARA FORMA DE PAGO! ---
    if (formaDePagoSelect && bancoSelect && campoReferencia) {
        formaDePagoSelect.addEventListener('change', () => {
            const selectedOption = formaDePagoSelect.options[formaDePagoSelect.selectedIndex];
            const nombreFormaDePago = selectedOption.dataset.nombre;

            // Lógica para habilitar/deshabilitar el banco
            if (nombreFormaDePago === 'Transferencia') {
                bancoSelect.disabled = false;
                bancoSelect.classList.remove('disabled:bg-gray-100');
            } else {
                bancoSelect.disabled = true;
                bancoSelect.value = '';
                bancoSelect.classList.add('disabled:bg-gray-100');
            }

            // --- ¡NUEVA LÓGICA AÑADIDA! ---
            // Lógica para mostrar/ocultar el campo de referencia
            if (nombreFormaDePago === 'Transferencia' || nombreFormaDePago === 'Datafono') {
                campoReferencia.classList.remove('hidden');
                campoReferencia.classList.add('flex', 'flex-col', 'gap-1');
            } else {
                campoReferencia.classList.add('hidden');
                campoReferencia.classList.remove('flex', 'flex-col', 'gap-1');
            }
        });
    }

    // --- Lógica para agregar/eliminar Materiales Utilizados ---
    if (btnAgregarMaterial && materialesContainer) {

        // Agregar una nueva fila de material
        btnAgregarMaterial.addEventListener('click', () => {
            const primeraFila = materialesContainer.querySelector('.material-item');
            if (!primeraFila) return;

            const nuevaFila = primeraFila.cloneNode(true);

            // Limpiar los valores de la nueva fila
            nuevaFila.querySelector('select').selectedIndex = 0;
            nuevaFila.querySelector('input[type="number"]').value = '';

            materialesContainer.appendChild(nuevaFila);
        });

        // Eliminar una fila de material (usando delegación de eventos)
        materialesContainer.addEventListener('click', (e) => {
            const botonEliminar = e.target.closest('.eliminar-material');

            if (botonEliminar) {
                e.preventDefault();
                if (materialesContainer.querySelectorAll('.material-item').length > 1) {
                    botonEliminar.closest('.material-item').remove();
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Oops...",
                        text: "¡No se puede eliminar la única fila de material!"
                    });
                }
            }
        });
    }
});