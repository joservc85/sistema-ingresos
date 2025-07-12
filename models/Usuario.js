import {DataTypes} from 'sequelize'
import bcrypt from 'bcrypt'
import db from '../config/db.js'

const Usuario = db.define('usuarios',{
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    token: DataTypes.STRING,
    // confirmado: DataTypes.BOOLEAN
    ///// Nueva logica de usuario/////
    confirmado: {
        type: DataTypes.BOOLEAN,
        defaultValue: true 
    },
},{
   hooks: {
        beforeCreate: async function (usuario) {
            const salt = await bcrypt.genSalt(10)
            usuario.password = await bcrypt.hash(usuario.password, salt);
        }
   } ,
   scopes: {
        eliminarPassword: {
            attributes: {
                exclude: ['password','token','confirmado','createdAt', 'updatedAt']
            }
        }
   }
})

// Metodos Personalizados
Usuario.prototype.verificarPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
}

export default Usuario

