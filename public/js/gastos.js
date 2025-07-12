document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA PARA MOSTRAR ALERTAS DE ÉXITO ---
    const params = new URLSearchParams(window.location.search);

    // Revisa si el parámetro 'guardado' existe en la URL
    if (params.has('guardado')) {
        Swal.fire({
            icon: 'success',
            title: '¡Gastos Guardado!',
            text: 'Los Gastos se guardo correctamente.',
            confirmButtonColor: '#14b8a6' // Color Teal
        });
    }

    // Revisa si el parámetro 'actualizado' existe
    if (params.has('actualizado')) {
        Swal.fire({
            icon: 'success',
            title: '¡Gastos Actualizado!',
            text: 'El Gasto se actualizado correctamente.',
            confirmButtonColor: '#14b8a6' // Color Teal
        });
    }

    // Revisa si el parámetro 'eliminado' existe
    if (params.has('eliminado')) {
        Swal.fire({
            icon: 'success',
            title: '¡Gastos Eliminado!',
            text: 'El Gasto ha sido eliminado correctamente.',
            confirmButtonColor: '#14b8a6' // Color Teal
        });
    }

    // Limpia la URL después de mostrar la alerta para que no se repita al recargar
    if (params.has('guardado') || params.has('actualizado') || params.has('eliminado')) {
        const url = new URL(window.location);
        url.searchParams.delete('guardado');
        url.searchParams.delete('actualizado');
        url.searchParams.delete('eliminado');
        window.history.replaceState({}, document.title, url.pathname);
    }


    // --- LÓGICA PARA LA CONFIRMACIÓN DE ELIMINACIÓN ---
    const formulariosEliminar = document.querySelectorAll('.form-eliminar');

    formulariosEliminar.forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            Swal.fire({
                title: '¿Estás seguro?',
                text: "Esta acción no se puede deshacer.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, ¡eliminar!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.submit(); // 'this' se refiere al formulario que disparó el evento
                }
            });
        });
    });

    if (params.has('errorEliminado')) {
        Swal.fire({
            icon: 'error',
            title: '¡Operación Cancelada!',
            text: 'No se puede eliminar. El stock del artículo "MERCANCIA" resultaría negativo',
            confirmButtonColor: '#d33'
        });
    }

});