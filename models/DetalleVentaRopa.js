import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const DetalleVentaRopa = db.define('detalle_venta_ropa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    precio_unitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
    // ventaRopaId y articuloRopaId se añadirán por las relaciones
});

export default DetalleVentaRopa;