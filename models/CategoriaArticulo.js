import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const CategoriaArticulo = db.define('categoria_articulos', {
    nombre_categoria: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    }
},{
    timestamps: true,
    tableName: 'categoria_articulos',
})

export default CategoriaArticulo;
