// Funciones globales, accesibles desde el HTML y otros scripts

// Formatea el input visual de precio unitario y recalcula subtotal
function actualizarValor(event) {
    const visibleInput = event.target;
    // Encuentra el div padre que contiene ambos inputs
    const contenedor = visibleInput.parentElement;
    // Dentro de ese div, busca el input oculto por su clase
    const hiddenInput = contenedor.querySelector('.precio-oculto');

    if (!hiddenInput) {
        console.error("No se encontró el campo oculto asociado.");
        return;
    }

    // El resto de la lógica es idéntica:
    // 1. Limpia el valor
    const valorLimpio = visibleInput.value.replace(/[^0-9]/g, '');

    // 2. Asigna el valor limpio al campo oculto
    hiddenInput.value = valorLimpio || '0';

    // 3. Formatea el campo visible
    const numero = parseInt(valorLimpio, 10);
    if (!isNaN(numero)) {
        visibleInput.value = new Intl.NumberFormat('es-CO').format(numero);
    } else {
        visibleInput.value = '';
    }
    
    // 4. Llama a la función de cálculo
    const fila = visibleInput.closest('.detalle-item');
    if (fila) {
        calcularSubtotal(fila);
    }
}

// Calcula el subtotal de una fila y actualiza el total general
function calcularSubtotal(fila) {
    console.log("--- Iniciando calcularSubtotal ---");
    console.log("Fila encontrada:", fila);

    // Buscamos los elementos dentro de la fila
    const cantidadInput = fila.querySelector('input[name="cantidad[]"]');
    const precioInput = fila.querySelector('input[type="hidden"][name="precio_unitario[]"]');
    const subtotalDisplay = fila.querySelector('.detalle-subtotal');

    console.log("Input de cantidad:", cantidadInput);
    console.log("Input de precio (oculto):", precioInput);
    console.log("Elemento para subtotal:", subtotalDisplay);

    if (!cantidadInput || !precioInput || !subtotalDisplay) {
        console.error("¡ERROR! No se encontró uno de los elementos necesarios (cantidad, precio o subtotal) en esta fila.");
        return;
    }

    const cantidad = parseFloat(cantidadInput.value) || 0;
    const precio = parseFloat(precioInput.value) || 0;
    const subtotal = cantidad * precio;

    console.log(`Calculando: Cantidad=${cantidad}, Precio=${precio}, Subtotal=${subtotal}`);

    // Actualizamos la vista
    subtotalDisplay.dataset.valor = subtotal;
    subtotalDisplay.textContent = formatearMoneda(subtotal);

    actualizarTotalGeneral();
    console.log("--- Fin calcularSubtotal ---");
}

// Actualiza el total general sumando todos los subtotales
function actualizarTotalGeneral() {
    let total = 0;
    const detalleContainer = document.getElementById('detalle-gastos-container');
    const totalGeneralDisplay = document.getElementById('total-general');
    if (!detalleContainer || !totalGeneralDisplay) return;

    const todosLosSubtotales = detalleContainer.querySelectorAll('.detalle-subtotal');

    todosLosSubtotales.forEach(subtotalEl => {
        const valorNumerico = parseFloat(subtotalEl.dataset.valor) || 0;
        total += valorNumerico;
    });

    totalGeneralDisplay.textContent = formatearMoneda(total);
}

// Función para formatear números a moneda COP
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}

document.addEventListener('DOMContentLoaded', function () {
    const agregarDetalleBtn = document.getElementById('agregar-detalle');
    const detalleContainer = document.getElementById('detalle-gastos-container');

    if (!detalleContainer) {
        console.error('No se encontró el contenedor de detalle de gastos.');
        return;
    }

    // Inicializa TomSelect para un input específico
    function inicializarTomSelect(inputElement) {
        const tomSelect = new TomSelect(inputElement, {
            maxItems: 1,
            valueField: 'id',
            labelField: 'nombre_articulo',
            searchField: ['nombre_articulo', 'descripcion'],
            create: false,
            load: (query, callback) => {
                if (!query.length) return callback();
                fetch(`/api/articulos/buscar?termino=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(json => callback(json))
                    .catch(() => callback());
            },
            onChange: (value) => {
                const selectedData = tomSelect.options[value];
                const fila = inputElement.closest('.detalle-item');
                if (selectedData && fila) {
                    const precioInput = fila.querySelector('input[name="precio_unitario[]"]');
                    const idInput = fila.querySelector('input[name="articuloId[]"]');

                    // Asignar valor y actualizar atributo data-raw-value
                    precioInput.value = new Intl.NumberFormat('es-CO', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(selectedData.precio_referencia || 0);
                    precioInput.setAttribute('data-raw-value', selectedData.precio_referencia || 0);

                    idInput.value = selectedData.id;

                    calcularSubtotal(fila);
                }
            },
            render: {
                option: (data, escape) => `
                    <div class="p-2 hover:bg-gray-100">
                        <div class="font-bold text-sm">${escape(data.nombre_articulo)}</div>
                        <div class="text-xs text-gray-500">${escape(data.descripcion) || 'Sin descripción'}</div>
                    </div>`,
                item: (data, escape) => `<div class="text-sm">${escape(data.nombre_articulo)}</div>`
            }
        });
        return tomSelect;
    }

    // Evento input delegado para recalcular subtotal al modificar cantidad o precio
    detalleContainer.addEventListener('input', (e) => {
        const fila = e.target.closest('.detalle-item');
        if (!fila) return;

        if (e.target.name === 'cantidad[]') {
            calcularSubtotal(fila);
        }

        if (e.target.name === 'precio_unitario[]') {
            // Actualizar data-raw-value con valor sin formato
            const valorLimpio = e.target.value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
            const numero = parseFloat(valorLimpio) || 0;
            e.target.setAttribute('data-raw-value', numero);

            // Formatear valor visible sin disparar nuevo input event (puede variar según tu implementación)
            e.target.value = new Intl.NumberFormat('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(numero);

            calcularSubtotal(fila);
        }
    });

    // Evento click delegado para eliminar filas
    detalleContainer.addEventListener('click', (e) => {
        const btnEliminar = e.target.closest('.eliminar-detalle');
        if (btnEliminar) {
            e.preventDefault();
            btnEliminar.closest('.detalle-item').remove();
            actualizarTotalGeneral();
        }
    });

    // Agregar nueva fila al hacer clic en el botón
    if (agregarDetalleBtn) {
        agregarDetalleBtn.addEventListener('click', () => {
            const plantilla = document.getElementById('plantilla-detalle');
            if (!plantilla) {
                console.error('No se encontró la plantilla de detalle.');
                return;
            }
            const nuevaFila = plantilla.firstElementChild.cloneNode(true);
            detalleContainer.appendChild(nuevaFila);

            // Inicializar TomSelect para el nuevo input de artículo
            const nuevoInputBusqueda = nuevaFila.querySelector('input[name="articulo_nombre"]');
            if (nuevoInputBusqueda) {
                inicializarTomSelect(nuevoInputBusqueda);
            }
        });
    }

    // Si ya hay filas cargadas (modo editar), inicializar TomSelect y calcular subtotales
    const filasExistentes = detalleContainer.querySelectorAll('.detalle-item');
    if (filasExistentes.length > 0) {
        filasExistentes.forEach(fila => {
            const inputBusqueda = fila.querySelector('input[name="articulo_nombre"]');
            const idArticulo = fila.querySelector('input[name="articuloId[]"]').value;

            if (inputBusqueda && idArticulo) {
                const nombreArticulo = inputBusqueda.value;
                const tomSelectInstance = inicializarTomSelect(inputBusqueda);

                tomSelectInstance.addOption({ id: idArticulo, nombre_articulo: nombreArticulo, descripcion: '' });
                tomSelectInstance.setValue(idArticulo, true);
            }
            calcularSubtotal(fila);
        });
    } else {
        // Modo crear: agrega una fila vacía automáticamente
        if (agregarDetalleBtn) {
            agregarDetalleBtn.click();
        }
    }
});