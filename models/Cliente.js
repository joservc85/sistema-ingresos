// En /models/Cliente.js

import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Cliente = db.define('clientes', {
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
    cedula: {
        type: DataTypes.STRING(20), // Suficiente para C.C., C.E., NIT, etc.
        allowNull: false, 
        unique: {
            msg: 'Esta cédula ya está registrada.'
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true, // Lo hacemos opcional
        validate: {
            isEmail: {
                msg: 'Agrega un Correo Válido'
            }
        }
    },
    telefono: {
        type: DataTypes.STRING,
        allowNull: false
    },    
    // --- ¡NUEVO CAMPO AÑADIDO! ---
    instagram: {
        type: DataTypes.STRING(100),
        allowNull: true // Lo hacemos opcional
    },

    // --- Campo para diferenciar el tipo de cliente (recomendado) ---
    tipo: {
        type: DataTypes.ENUM('Spa', 'Ropa', 'Ambos'),
        allowNull: false,
        defaultValue: 'Spa'
    },

    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

export default Cliente;
