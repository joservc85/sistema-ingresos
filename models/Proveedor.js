import { DataTypes } from 'sequelize'
import db from '../config/db.js'

const Proveedor = db.define('proveedores', {
  tipo_documento: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('tipo_documento', value.toUpperCase());
    }
  },
  numero_documento: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('numero_documento', value.toUpperCase());
    }
  },
  razon_social: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('razon_social', value.toUpperCase());
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: {
        msg: 'Debe ser un correo válido'
      }
    }
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
})

export default Proveedor