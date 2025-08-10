import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const PagoActividad = db.define('pagos_actividad', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    referencia_pago: {
        type: DataTypes.STRING,
        allowNull: true // Solo para Datafono o Transferencia
    }
    // Las claves foráneas (actividadId, formaDePagoId, bancoId) se añadirán por las relaciones.
});

export default PagoActividad;