document.addEventListener("DOMContentLoaded", function() {
  const form = document.getElementById("productForm");
  const offlineAlert = document.createElement("div");
  offlineAlert.id = "offline-alert";
  offlineAlert.innerHTML = "⚠️ Estás sin conexión. Algunos botones están deshabilitados.";
  offlineAlert.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: #ffcc00;
    color: #333;
    text-align: center;
    padding: 8px;
    font-weight: bold;
    display: none;
  `;
  document.body.appendChild(offlineAlert);

  function updateConnectionStatus() {
    if (!navigator.onLine) {
      offlineAlert.style.display = "block";

      // Deshabilita botones sensibles
      document.querySelectorAll("button[type='submit'], .edit-btn, .delete-btn").forEach(btn => {
        btn.disabled = true;
        btn.classList.add("offline-disabled");
      });
    } else {
      offlineAlert.style.display = "none";

      // Reactiva botones
      document.querySelectorAll("button, .edit-btn, .delete-btn").forEach(btn => {
        btn.disabled = false;
        btn.classList.remove("offline-disabled");
      });

      // Si hay productos pendientes, los enviamos
      syncPendingProducts();
    }
  }

  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  updateConnectionStatus(); // inicial
});
