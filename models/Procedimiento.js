import { DataTypes } from "sequelize";
import db from '../config/db.js'

const Procedimiento = db.define('procedimientos', {
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        set(value) {
            this.setDataValue('nombre', value.toUpperCase());
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    precioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'precios',
            key: 'id'
        }
    }
});

export default Procedimiento