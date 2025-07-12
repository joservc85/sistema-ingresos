// public/js/usuario.js

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA PARA MOSTRAR ALERTAS DE ÉXITO ---
    // Lee los parámetros de la URL actual
    const params = new URLSearchParams(window.location.search);

    // Revisa si el parámetro 'guardado' existe en la URL
    if (params.has('guardado')) {
        Swal.fire({
            icon: 'success',
            title: '¡Usuario Registrado!',
            text: 'El usuario fue registrado correctamente.',
            confirmButtonColor: '#a21caf' // Color fucsia
        });
    }

    // Revisa si el parámetro 'actualizado' existe
    if (params.has('actualizado')) {
        Swal.fire({
            icon: 'success',
            title: '¡Usuario Actualizado!',
            text: 'Los datos del usuario fueron actualizados correctamente.',
            confirmButtonColor: '#a21caf'
        });
    }

    // Revisa si el parámetro 'eliminado' existe
    if (params.has('eliminado')) {
        Swal.fire({
            icon: 'success',
            title: '¡Usuario Eliminado!',
            text: 'El usuario ha sido eliminado correctamente.',
            confirmButtonColor: '#a21caf'
        });
    }

    // Limpia la URL después de mostrar la alerta para que no vuelva a aparecer si se recarga la página
    // Usamos el mismo método que tenías, lo cual es perfecto.
    if (params.has('guardado') || params.has('actualizado') || params.has('eliminado')) {
        const url = new URL(window.location);
        url.searchParams.delete('guardado');
        url.searchParams.delete('actualizado');
        url.searchParams.delete('eliminado');
        window.history.replaceState({}, document.title, url.pathname);
    }


    // --- LÓGICA PARA LA CONFIRMACIÓN DE ELIMINACIÓN ---
    // Seleccionamos todos los formularios que tengan la clase 'form-eliminar'
    const formulariosEliminar = document.querySelectorAll('form[action*="/eliminar"]');

    formulariosEliminar.forEach(form => {
        form.addEventListener('submit', function (e) {
            // Prevenimos el envío automático del formulario
            e.preventDefault(); 

            Swal.fire({
                title: '¿Estás seguro?',
                text: "Esta acción no se puede deshacer",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33', // Rojo para el botón de confirmar
                cancelButtonColor: '#3085d6', // Azul para el botón de cancelar
                confirmButtonText: 'Sí, ¡eliminar!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                // Si el usuario confirma, entonces sí enviamos el formulario
                if (result.isConfirmed) {
                    form.submit();
                }
            });
        });
    });

});