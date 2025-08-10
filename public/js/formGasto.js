// Reemplaza el contenido de tu archivo: /public/js/formGasto.js

document.addEventListener('DOMContentLoaded', function() {
    const btnAgregar = document.getElementById('agregar-detalle');
    const container = document.getElementById('detalle-gastos-container');
    const plantilla = document.getElementById('plantilla-detalle');
    const totalGeneralDisplay = document.getElementById('total-general');

    if (!btnAgregar || !container || !plantilla) return;

    // --- FUNCIONES AUXILIARES ---
    const formatearMoneda = (valor) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
        }).format(valor || 0);
    };

    const actualizarTotalGeneral = () => {
        let total = 0;
        container.querySelectorAll('.detalle-subtotal').forEach(subtotalEl => {
            total += parseFloat(subtotalEl.dataset.valor) || 0;
        });
        if (totalGeneralDisplay) {
            totalGeneralDisplay.textContent = formatearMoneda(total);
        }
    };

    const calcularSubtotal = (fila) => {
        const cantidadInput = fila.querySelector('input[name="cantidad[]"]');
        const precioInput = fila.querySelector('.precio-oculto');
        const subtotalDisplay = fila.querySelector('.detalle-subtotal');

        if (!cantidadInput || !precioInput || !subtotalDisplay) return;

        const cantidad = parseFloat(cantidadInput.value) || 0;
        const precio = parseFloat(precioInput.value) || 0;
        const subtotal = cantidad * precio;

        subtotalDisplay.dataset.valor = subtotal;
        subtotalDisplay.textContent = formatearMoneda(subtotal);
        actualizarTotalGeneral();
    };

    // --- LÓGICA DE TOMSELECT ---
    const inicializarTomSelect = (elemento) => {
        return new TomSelect(elemento, {
            valueField: 'id',
            labelField: 'nombre_articulo',
            searchField: 'nombre_articulo',
            load: (query, callback) => {
                if (!query.length) return callback();
                const url = `/api/articulos/buscar?termino=${encodeURIComponent(query)}`;
                fetch(url)
                    .then(response => response.json())
                    .then(json => callback(json))
                    .catch(() => callback());
            },
            onChange: (value) => {
                const fila = elemento.closest('.detalle-item');
                const selectedData = elemento.tomselect.options[value];
                if (selectedData && fila) {
                    const precioVisible = fila.querySelector('.precio-visible');
                    const precioOculto = fila.querySelector('.precio-oculto');
                    const precioCompra = parseFloat(selectedData.precio_compra) || 0;
                    
                    precioVisible.value = precioCompra.toLocaleString('es-CO');
                    precioOculto.value = precioCompra;
                    
                    calcularSubtotal(fila);
                }
            },
            render: {
                option: (data, escape) => `<div class="p-2 hover:bg-gray-100"><div class="font-semibold">${escape(data.nombre_articulo)}</div><div class="text-xs text-gray-500">Stock: ${escape(data.stock_actual)}</div></div>`,
                item: (data, escape) => `<div class="py-1 px-2">${escape(data.nombre_articulo)}</div>`
            }
        });
    };

    // --- LÓGICA PARA AÑADIR/ELIMINAR FILAS Y EVENTOS ---
    const anadirFila = () => {
        // --- ¡CORRECCIÓN DEFINITIVA APLICADA AQUÍ! ---
        // Se usa 'plantilla.content.cloneNode(true)' para clonar el contenido de la etiqueta <template>
        const nuevaFila = plantilla.content.cloneNode(true);
        container.appendChild(nuevaFila);
        
        // Se busca el elemento dentro del nuevo fragmento antes de que se añada al DOM principal
        const nuevoBuscador = container.lastElementChild.querySelector('.articulo-buscador');
        if(nuevoBuscador) {
            inicializarTomSelect(nuevoBuscador);
        }
    };

    btnAgregar.addEventListener('click', anadirFila);

    container.addEventListener('click', (e) => {
        if (e.target.closest('.eliminar-detalle')) {
            if (container.querySelectorAll('.detalle-item').length > 1) {
                e.target.closest('.detalle-item').remove();
                actualizarTotalGeneral();
            } else {
                Swal.fire('Acción no permitida', 'Debe haber al menos una fila.', 'warning');
            }
        }
    });

    container.addEventListener('input', (e) => {
        const fila = e.target.closest('.detalle-item');
        if (!fila) return;

        if (e.target.classList.contains('precio-visible')) {
            const valorLimpio = e.target.value.replace(/[^0-9]/g, '');
            const precioOculto = fila.querySelector('.precio-oculto');
            precioOculto.value = valorLimpio || '0';
            e.target.value = (parseInt(valorLimpio, 10) || 0).toLocaleString('es-CO');
        }
        
        calcularSubtotal(fila);
    });

    // Añadir la primera fila al cargar la página
    anadirFila();
});