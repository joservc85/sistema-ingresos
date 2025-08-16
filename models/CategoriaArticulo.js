import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const CategoriaArticulo = db.define('categoria_articulos', {
    nombre_categoria: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        set(value) {
            this.setDataValue('nombre_categoria', value.toUpperCase());
        }
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
            // Solo convierte a mayúsculas si el valor no es nulo
            if (value) {
                this.setDataValue('descripcion', value.toUpperCase());
            }
        }
    }
},{
    timestamps: true,
    tableName: 'categoria_articulos',
})

export default CategoriaArticulo;
