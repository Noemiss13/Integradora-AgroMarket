// JavaScript simplificado para el panel de comprador
// Solo funcionalidad básica de UI - Las tarjetas son solo enlaces

document.addEventListener("DOMContentLoaded", () => {
    console.log("Panel de comprador cargado - Solo enlaces de productos");
    
    // Funcionalidad básica de filtros
    const filterButtons = document.querySelectorAll('.filter-btn');
    const filtersContainer = document.querySelector('.filters-container');
    
    // Toggle de filtros
    filterButtons.forEach(btn => {
        if (btn.textContent === 'Filtrar') {
            btn.addEventListener('click', function() {
                if (filtersContainer) {
                    filtersContainer.style.display = filtersContainer.style.display === 'none' ? 'block' : 'none';
                }
            });
        }
    });
    
    // Botones de ordenamiento
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(btn => {
        if (btn.textContent === 'Ordenar') {
            btn.addEventListener('click', function() {
                alert('Función de ordenamiento próximamente');
            });
        }
    });
    
    // Las tarjetas de productos son solo enlaces - no hay funcionalidad adicional
    console.log("Las tarjetas de productos son enlaces simples - sin funcionalidad de carrito");
});
