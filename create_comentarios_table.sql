-- ===========================================
-- SCRIPT PARA CREAR TABLA DE COMENTARIOS
-- ===========================================

-- Crear tabla de comentarios
CREATE TABLE IF NOT EXISTS comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    contenido TEXT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Claves foráneas  
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Índices para mejorar rendimiento
    INDEX idx_producto_id (producto_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_fecha_creacion (fecha_creacion)
);

-- Insertar algunos comentarios de ejemplo (opcional)
INSERT INTO comentarios (producto_id, usuario_id, contenido) VALUES
(1, 2, 'Excelente producto, muy fresco y de buena calidad. Lo recomiendo completamente.'),
(1, 3, 'Las manzanas llegaron en perfecto estado, muy dulces y jugosas.'),
(2, 2, 'Las verduras están muy frescas, perfectas para ensaladas.'),
(3, 4, 'Producto de excelente calidad, el vendedor muy atento.'),
(1, 5, 'Muy bueno el servicio, entrega rápida y productos frescos.');

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla comentarios creada exitosamente' as mensaje;
