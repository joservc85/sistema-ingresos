import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Banco = db.define('bancos', {
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        set(value) {
            // Convierte el valor a mayúsculas antes de almacenarlo.
            this.setDataValue('nombre', value.toUpperCase());
        }
    },
}, { timestamps: false });

export default Banco;