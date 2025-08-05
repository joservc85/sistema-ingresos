import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const VentaRopa = db.define('ventas_ropa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fecha_venta: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    total_venta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    // clienteId y usuarioId se añadirán por las relaciones
});

export default VentaRopa;