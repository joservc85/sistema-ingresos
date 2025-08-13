document.addEventListener('DOMContentLoaded', () => {
    // Verificar si Chart.js está cargado
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no está cargado. Asegúrate de incluirlo en tu layout.');
        return;
    }

    const ctx = document.getElementById('ventasChart');
    if (ctx && window.chartData) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: window.chartData.labels,
                datasets: [{
                    label: 'Ventas del Día',
                    data: window.chartData.data,
                    backgroundColor: 'rgba(168, 85, 247, 0.6)', // Color fucsia con transparencia
                    borderColor: 'rgba(139, 92, 246, 1)', // Color violeta
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            // Formatear los números del eje Y como moneda
                            callback: function(value) {
                                return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Ocultar la leyenda para un look más limpio
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
});