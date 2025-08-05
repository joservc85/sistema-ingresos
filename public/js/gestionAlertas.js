document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA PARA MOSTRAR ALERTAS DE ÉXITO O ERROR DESDE LA URL ---
    const params = new URLSearchParams(window.location.search);

    // Revisa si el parámetro 'mensaje' existe (para mensajes de éxito)
    if (params.has('mensaje')) {
        Swal.fire({
            icon: 'success',
            title: '¡Acción Exitosa!',
            text: params.get('mensaje'), // Muestra el texto que viene del controlador
            confirmButtonColor: '#34D399' // Un color verde esmeralda
        });
    }

    // Revisa si el parámetro 'error' existe (para mensajes de error)
    if (params.has('error')) {
        Swal.fire({
            icon: 'error',
            title: '¡Ocurrió un Error!',
            text: params.get('error'), // Muestra el texto del error
            confirmButtonColor: '#EF4444' // Un color rojo
        });
    }

    // Limpia la URL después de mostrar la alerta para que no se repita al recargar
    if (params.has('mensaje') || params.has('error')) {
        const url = new URL(window.location);
        url.searchParams.delete('mensaje');
        url.searchParams.delete('error');
        window.history.replaceState({}, document.title, url.pathname);
    }


    // --- LÓGICA GENÉRICA PARA LA CONFIRMACIÓN DE ELIMINACIÓN ---
    const formulariosEliminar = document.querySelectorAll('.form-eliminar');

    formulariosEliminar.forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault(); // Prevenir el envío inmediato

            Swal.fire({
                title: '¿Estás seguro?',
                text: "Esta acción no se puede revertir.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, ¡eliminar!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Si el usuario confirma, ahora sí se envía el formulario
                    this.submit();
                }
            });
        });
    });
});