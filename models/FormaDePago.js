import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const FormaDePago = db.define('formas_de_pago', {
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    }
}, { timestamps: false });

export default FormaDePago;
