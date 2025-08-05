// Crea un nuevo archivo en: /public/js/modalCierre.js

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-cierre');
    const cerrarModalBtn = document.getElementById('modal-cierre-cerrar');
    const cerrarFooterBtn = document.getElementById('btn-cierre-cerrar-footer');
    const modalTitulo = document.getElementById('modal-cierre-titulo');
    const modalCuerpo = document.getElementById('modal-cierre-cuerpo');
    const contenedorPrincipal = document.querySelector('body');

    if (!modal) return;

    const abrirModal = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'items-center', 'justify-center');
    };
    const cerrarModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'items-center', 'justify-center');
    };

    contenedorPrincipal.addEventListener('click', async (e) => {
        const botonVer = e.target.closest('.ver-cierre-btn');
        if (!botonVer) return;

        const cierreId = botonVer.dataset.cierreId;
        if (!cierreId) return;

        try {
            modalCuerpo.innerHTML = '<p class="text-center text-gray-500">Cargando...</p>';
            abrirModal();

            const response = await fetch(`/cierre-caja/ver/${cierreId}`);
            if (!response.ok) throw new Error('No se pudo cargar el detalle.');
            
            const cierre = await response.json();
            
            // Actualizar título y cuerpo del modal
            const fechaFormateada = new Date(cierre.fecha_cierre + 'T12:00:00').toLocaleDateString('es-VE');
            modalTitulo.textContent = `Detalle del Cierre - ${fechaFormateada}`;
            
            const desgloseHTML = cierre.desglose_efectivo ? Object.entries(cierre.desglose_efectivo)
                .map(([billete, cantidad]) => `<li>${cantidad} x Billetes de $${parseInt(billete).toLocaleString('es-CO')}</li>`).join('') : '<li>No registrado</li>';

            modalCuerpo.innerHTML = `
                <div class="space-y-3 text-lg">
                    <div class="flex justify-between"><span class="text-gray-600">Total Efectivo (Sistema):</span><span class="font-semibold">$${parseFloat(cierre.total_efectivo_sistema).toLocaleString('es-CO')}</span></div>
                    <div class="flex justify-between"><span class="text-gray-600">Total Efectivo (Contado):</span><span class="font-semibold text-blue-600">$${parseFloat(cierre.total_efectivo_contado).toLocaleString('es-CO')}</span></div>
                    <div class="flex justify-between"><span class="text-gray-600">Descuadre:</span><span class="font-bold ${cierre.descuadre < 0 ? 'text-red-600' : 'text-green-600'}">$${parseFloat(cierre.descuadre).toLocaleString('es-CO')}</span></div>
                    <div class="border-t pt-3 mt-3 space-y-3">
                        <div class="flex justify-between"><span class="text-gray-600">Total Datafono:</span><span class="font-semibold">$${parseFloat(cierre.total_datafono).toLocaleString('es-CO')}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">Total Transferencia:</span><span class="font-semibold">$${parseFloat(cierre.total_transferencia).toLocaleString('es-CO')}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">Total Vales:</span><span class="font-semibold text-red-600">-$${parseFloat(cierre.total_vales).toLocaleString('es-CO')}</span></div>
                    </div>
                    ${cierre.observaciones ? `<div class="mt-4 pt-4 border-t"><h4 class="font-bold">Observaciones:</h4><p class="text-base text-gray-600 bg-gray-50 p-2 rounded">${cierre.observaciones}</p></div>` : ''}
                    <div class="mt-4 pt-4 border-t"><h4 class="font-bold">Desglose de Efectivo:</h4><ul class="list-disc list-inside text-base text-gray-600">${desgloseHTML}</ul></div>
                </div>
            `;

        } catch (error) {
            console.error(error);
            cerrarModal();
            Swal.fire('Error', 'No se pudo cargar el detalle del cierre.', 'error');
        }
    });

    cerrarModalBtn.addEventListener('click', cerrarModal);
    cerrarFooterBtn.addEventListener('click', cerrarModal);
});