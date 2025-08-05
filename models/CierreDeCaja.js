import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const CierreDeCaja = db.define('cierres_de_caja', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fecha_cierre: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        unique: true
    },
    estado: {
        type: DataTypes.ENUM('Consolidado', 'Anulado'),
        allowNull: false,
        defaultValue: 'Consolidado'
    },
    total_efectivo_sistema: { // Lo que el sistema CALCULÓ
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    total_efectivo_contado: { // Lo que el usuario CONTÓ
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    desglose_efectivo: { // Aquí guardaremos el conteo de billetes y monedas
        type: DataTypes.JSON,
        allowNull: true
    },
    descuadre: { // La diferencia entre el sistema y lo contado
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    total_datafono: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    total_transferencia: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    total_vales: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    total_ventas_dia: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    }
    // usuarioId se mantiene por la relación
});

export default CierreDeCaja;