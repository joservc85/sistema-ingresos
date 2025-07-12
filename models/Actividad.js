import { DataTypes } from "sequelize";
import db from '../config/db.js'

const Actividad = db.define('actividades', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    vales: {
        type: DataTypes.FLOAT,
        allowNull: true,       // Acepta null
        defaultValue: null     // Opcional, puedes omitirlo si quieres
    },
    descripcion: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null
    }
});

export default Actividad;