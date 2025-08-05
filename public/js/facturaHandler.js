// En tu archivo /public/js/facturaHandler.js

document.addEventListener('DOMContentLoaded', () => {

    const contenedorActividades = document.querySelector('body');
    if (!contenedorActividades) return;

    contenedorActividades.addEventListener('click', async (e) => {
        const botonFactura = e.target.closest('.generar-factura-btn');

        if (botonFactura) {
            e.preventDefault();
            
            const actividadId = botonFactura.dataset.actividadId;
            // --- CORRECCIÓN: Obtenemos el formato del botón presionado ---
            const formato = botonFactura.dataset.formato; 
            
            if (!actividadId || !formato) {
                console.error('El botón no tiene el ID de la actividad o el formato.');
                return;
            }

            try {
                const response = await fetch(`/facturas/verificar/${actividadId}`);
                const data = await response.json();

                if (data.existe) {
                    Swal.fire({
                        title: 'Factura Existente',
                        text: "Ya se ha generado una factura para esta actividad. ¿Desea reimprimirla?",
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Sí, ¡Reimprimir!',
                        cancelButtonText: 'Cancelar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // --- CORRECCIÓN: Se añade el formato a la URL ---
                            window.open(`/facturas/reimprimir/${formato}/${actividadId}`, '_blank');
                        }
                    });
                } else {
                    // --- CORRECCIÓN: Se añade el formato a la URL ---
                    window.open(`/facturas/generar/${formato}/${actividadId}`, '_blank');
                }

            } catch (error) {
                console.error('Error al verificar factura:', error);
                Swal.fire('Error', 'No se pudo verificar el estado de la factura.', 'error');
            }
        }
    });
});