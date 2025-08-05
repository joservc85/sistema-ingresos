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
    },
    estado: {
        type: DataTypes.ENUM('Realizada', 'Anulada'),
        allowNull: false,
        defaultValue: 'Realizada'
    },
    formaDePagoId: {
        type: DataTypes.INTEGER,
        allowNull: true // Puede ser nulo si es un vale sin pago
    },
    bancoId: {
        type: DataTypes.INTEGER,
        allowNull: true // Solo aplica si la forma de pago es Transferencia
    },
    referencia_pago: {
        type: DataTypes.STRING,
        allowNull: true // Solo aplica para transferencias u otros pagos electrónicos
    }
});

export default Actividad;