import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const Personal = db.define('personals', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('nombre', value.toUpperCase());
    }
  },
  apellidos: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('apellidos', value.toUpperCase());
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
})

export default Personal
