// Crea un nuevo archivo en: /models/ArticuloRopa.js

import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const ArticuloRopa = db.define('articulos_ropa', {
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    marca: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    color: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    talla: {
        type: DataTypes.STRING(50), // Puede guardar "S", "M", "L", "38", "S, M, L", etc.
        allowNull: true
    },
    stock_actual: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    precio_compra: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    precio_venta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    observacion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

export default ArticuloRopa;