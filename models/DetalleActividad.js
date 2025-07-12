import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const DetalleActividad = db.define('detalle_actividad', {
    // ... aquí van las columnas (id, cantidad, etc.)
    id: {
        type: DataTypes.INTEGER.UNSIGNED, // Coincide con tu SQL
        primaryKey: true,
        autoIncrement: true
    },
    cantidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    tableName: 'detalle_actividad' // <-- AÑADE ESTA LÍNEA
});

export default DetalleActividad;