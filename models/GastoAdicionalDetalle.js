import { DataTypes } from 'sequelize'
import db from '../config/db.js'
import GastoAdicional from './GastoAdicional.js' // Importa el modelo GastoAdicional
import Articulo from './Articulo.js' // Importa el modelo Articulo

const GastoAdicionalDetalle = db.define('gastos_adicionales_detalle', {
    // Clave foránea al gasto principal
    gastoAdicionalId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: GastoAdicional,
            key: 'id'
        },
        validate: {
            notEmpty: {
                msg: 'El ID del gasto adicional es obligatorio'
            }
        }
    },
    // Clave foránea al artículo específico
    articuloId: { // Nombre de la clave foránea por convención de Sequelize
        type: DataTypes.INTEGER, // O INTEGER, dependiendo de cómo sean los IDs de Articulo
        allowNull: false,
        references: {
            model: Articulo,
            key: 'id'
        },
        validate: {
            notEmpty: {
                msg: 'El ID del artículo es obligatorio'
            }
        }
    },
    cantidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: {
                msg: 'La cantidad debe ser un número válido'
            },
            min: {
                args: [0.01], 
                msg: 'La cantidad debe ser un valor positivo'
            }
        }
    },
    precio_unitario: { // Precio al que se compró este artículo en este gasto específico
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: {
                msg: 'El precio unitario debe ser un número decimal'
            },
            min: {
                args: [0],
                msg: 'El precio unitario no puede ser negativo'
            }
        }
    },
    subtotal: { // Opcional, se puede calcular, pero útil para guardar el valor exacto de la línea
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: {
                msg: 'El subtotal debe ser un número decimal'
            },
            min: {
                args: [0],
                msg: 'El subtotal no puede ser negativo'
            }
        }
    }
}, {
    timestamps: true // Añade createdAt y updatedAt
});

export default GastoAdicionalDetalle;