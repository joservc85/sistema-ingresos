// Crea un nuevo archivo en: /models/ArticuloRopa.js

import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const ArticuloRopa = db.define('articulos_ropa', {
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        set(value) {
            this.setDataValue('nombre', value.toUpperCase());
        }
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
            this.setDataValue('descripcion', value.toUpperCase());
        }
    },
    marca: {
        type: DataTypes.STRING(100),
        allowNull: true,
        set(value) {
            this.setDataValue('marca', value.toUpperCase());
        }
    },
    color: {
        type: DataTypes.STRING(50),
        allowNull: true,
        set(value) {
            this.setDataValue('color', value.toUpperCase());
        }
    },
    talla: {
        type: DataTypes.STRING(50), // Puede guardar "S", "M", "L", "38", "S, M, L", etc.
        allowNull: true,
        set(value) {
            this.setDataValue('type', value.toUpperCase());
        }
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
        allowNull: true,
        set(value) {
            this.setDataValue('observacion', value.toUpperCase());
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

export default ArticuloRopa;