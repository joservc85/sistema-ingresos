import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const DetalleGastoAdministrativo = db.define('detalle_gasto_administrativo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cantidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
    // Los IDs de gasto y artículo se añadirán por las relaciones
});

export default DetalleGastoAdministrativo;