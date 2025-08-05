import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Banco = db.define('bancos', {
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    }
}, { timestamps: false });

export default Banco;