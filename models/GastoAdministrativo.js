import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const GastoAdministrativo = db.define('gastos_administrativos', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false,
        set(value) {
            this.setDataValue('descripcion', value.toUpperCase());
        }
    },
    estado: {
        type: DataTypes.ENUM('Consolidado', 'Anulado'),
        allowNull: false,
        defaultValue: 'Consolidado'
    }
    // El usuario que lo registró se añadirá por la relación
});

export default GastoAdministrativo;