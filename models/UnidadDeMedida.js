// models/UnidadDeMedida.js
import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const UnidadDeMedida = db.define('UnidadDeMedida', { // 1. Nombre del Modelo (en singular)
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    abreviatura: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'unidades_medida' // 2. Nombre EXACTO de la tabla en MySQL
});

export default UnidadDeMedida;