import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Factura = db.define('facturas', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    numero_factura: {
        type: DataTypes.STRING, // Ej: "F-001", "F-002"
        allowNull: false,
        unique: true
    },
    fecha_emision: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }

});

export default Factura;