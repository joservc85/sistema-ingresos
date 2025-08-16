import { DataTypes } from 'sequelize'
import db from '../config/db.js'

// Es una mejor práctica usar el nombre del modelo en singular y especificar el nombre de la tabla.
const Articulo = db.define('Articulo', {
    nombre_articulo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: {
                msg: 'El nombre del artículo no puede ir vacío'
            }
        },
        set(value) {
            this.setDataValue('nombre_articulo', value.toUpperCase());
        }
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
            this.setDataValue('descripcion', value.toUpperCase());
        }
    },
    // El campo 'unidad_medida' de tipo texto se elimina.
    
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    stock_minimo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
            isInt: {
                msg: 'El stock mínimo debe ser un número entero'
            },
            min: {
                args: [0],
                msg: 'El stock mínimo no puede ser negativo'
            }
        }
    },
    stock_actual: {
        type: DataTypes.DECIMAL(10, 3), // Ajustado a 3 decimales para mayor precisión
        allowNull: false,
        defaultValue: 0,
        validate: {
            isDecimal: {
                msg: 'El stock actual debe ser un número decimal'
            },
            min: {
                args: [0],
                msg: 'El stock actual no puede ser negativo'
            }
        }
    },
    categoriaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categoria_articulos',
            key: 'id'
        },
        validate: {
            notEmpty: {
                msg: 'La categoría del artículo es obligatoria'
            }
        }
    },
    unidad_medida_Id: {
        type: DataTypes.INTEGER,
        allowNull: false, // Hacemos que sea obligatoria
        references: {
            model: 'unidades_medida',
            key: 'id'
        },
        validate: {
            notEmpty: {
                msg: 'La unidad de medida es obligatoria'
            }
        }
    }
}, {
    tableName: 'Articulos', // Especifica el nombre exacto de la tabla en MySQL
    timestamps: true
});

export default Articulo;