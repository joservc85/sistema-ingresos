import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Rol = db.define('roles', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    timestamps: false // No necesitamos las columnas createdAt/updatedAt para esta tabla
});

export default Rol;