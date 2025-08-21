import { DataTypes } from "sequelize";
import db from '../config/db.js'

const Precio = db.define('precios', {
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        },
        unique: {
            msg: 'Este monto ya existe para este procedimiento. Por favor, ingrese un valor diferente.'
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
});

export default Precio