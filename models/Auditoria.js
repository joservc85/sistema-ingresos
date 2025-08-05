// Crea un nuevo archivo en: /models/Auditoria.js

import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Auditoria = db.define('auditoria', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    accion: {
        type: DataTypes.STRING(50), // Ej: 'ELIMINAR', 'MODIFICAR', 'ANULAR'
        allowNull: false
    },
    tabla_afectada: {
        type: DataTypes.STRING(100), // Ej: 'actividades', 'clientes', 'cierres_de_caja'
        allowNull: false
    },
    registro_id: {
        type: DataTypes.STRING, // Se usa STRING para ser compatible con IDs numéricos y UUIDs
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT, // Un resumen de qué se hizo
        allowNull: false
    },
    // Es crucial saber QUIÉN hizo el cambio
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

export default Auditoria;