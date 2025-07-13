import roles from "./roles.js";
import usuarios from "./usuarios.js";
import procedimientos from "./procedimientos.js";
import precios from "./precios.js";
import clientes from "./clientes.js";
import personals from "./personal.js";
import articulos from "./articulos.js";
import categorias from "./categorias.js";
import unidades_de_medida from "./unidades_de_medida.js";

import db from '../config/db.js';

import { Rol, Usuario, Procedimiento, Precio, Cliente, Personal, Articulo, CategoriaArticulo, UnidadDeMedida } from '../models/index.js';


const importarDatos = async () => {
    try {
        // Autenticar y Sincronizar
        await db.authenticate();
        console.log('Conexión a la base de datos exitosa.');
        await db.sync();
        console.log('Tablas sincronizadas.');

        // --- PASO 1: Insertar datos base (tablas sin dependencias) ---
        await Promise.all([
            Rol.bulkCreate(roles),
            CategoriaArticulo.bulkCreate(categorias),
            UnidadDeMedida.bulkCreate(unidades_de_medida),
            Precio.bulkCreate(precios),
            Cliente.bulkCreate(clientes),
            Personal.bulkCreate(personals)
        ]);
        console.log('Paso 1: Roles, Categorías, Precios, Clientes, Proveedores y Personal importados.');

        // --- PASO 2: Insertar datos que dependen del Paso 1 ---
        await Promise.all([
            // Usuarios depende de Roles. La contraseña se hashea automáticamente por el hook del modelo.
            Usuario.bulkCreate(usuarios, { individualHooks: true }),
            // Articulos depende de Categorías y Unidades
            Articulo.bulkCreate(articulos)
        ]);
        console.log('Paso 2: Usuarios y Artículos importados.');

        // --- PASO 3: Insertar datos que dependen de los pasos anteriores ---
        // Procedimientos depende de Precios
        await Procedimiento.bulkCreate(procedimientos);
        console.log('Paso 3: Procedimientos importados.');

        console.log('¡Datos Importados Correctamente!');
        process.exit(0);

    } catch (error) {
        console.error('Error al importar datos:', error);
        process.exit(1);
    }
}

const eliminarDatos = async () => {
       try {
        // 1. Desactivamos la revisión de claves foráneas
        await db.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        console.log('Revisión de claves foráneas desactivada temporalmente.');

        // 2. El sync({ force: true }) ahora funcionará sin problemas de orden
        await db.sync({ force: true });
        console.log('Base de datos completamente limpiada y recreada.');

        // 3. Reactivamos la revisión de claves foráneas. Es crucial hacerlo siempre.
        await db.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
        console.log('Revisión de claves foráneas reactivada.');

        console.log('Datos eliminados correctamente');
        process.exit(0);

    } catch (error) {
        console.error('Error al eliminar datos:', error);
        // Asegurarse de reactivar las claves incluso si hay un error
        await db.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
        process.exit(1);
    }
}

if (process.argv[2] === "-i") {
    importarDatos();
}

if (process.argv[2] === "-e") {
    eliminarDatos();
}