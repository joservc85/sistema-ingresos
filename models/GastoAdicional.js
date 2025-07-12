import { DataTypes } from 'sequelize'
import db from '../config/db.js'
import Proveedor from './Proveedor.js'
import Usuario from './Usuario.js'

const GastoAdicional = db.define('gastos_adicionales', {
    numero_factura: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Una factura debería ser única
        validate: {
            notEmpty: {
                msg: 'El número de factura no puede ir vacío'
            }
        }
    },
    proveedorId: { 
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Proveedor,
            key: 'id'
        },
        validate: {
            notEmpty: {
                msg: 'El proveedor es obligatorio'
            }
        }
    },
    descripcion: {
        type: DataTypes.TEXT, 
        allowNull: true 
    },
    valor_total: {
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false,
        validate: {
            isDecimal: {
                msg: 'El valor total debe ser un número decimal'
            },
            min: {
                args: [0],
                msg: 'El valor total no puede ser negativo'
            }
        }
    },
    fecha_gasto: { 
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW 
    },
    activo: { 
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false, // Lo hacemos obligatorio
        references: {
            model: Usuario, // Referencia al modelo de Usuario
            key: 'id'
        }
    }
}, {
    timestamps: true,
    tableName: 'gastos_adicionales',
}
);

export default GastoAdicional;