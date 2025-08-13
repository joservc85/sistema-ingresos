// controllers/articulosController.js
import { Articulo, CategoriaArticulo, UnidadDeMedida, Auditoria } from '../models/index.js';
import { check, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import db from '../config/db.js';

// Muestra la lista de todos los artículos con paginación
const leerArticulos = async (req, res) => {
    // --- 1. Se leen los parámetros de la URL para paginación y filtros ---
    const { page = 1, busqueda = '', categoriaId = '' } = req.query;
    const elementosPorPagina = 12;
    const offset = (page - 1) * elementosPorPagina;

    try {
        // --- 2. Construcción de la Cláusula `where` para la búsqueda ---
        const whereClause = {};
        if (busqueda) {
            whereClause.nombre_articulo = { [Op.like]: `%${busqueda}%` };
        }
        if (categoriaId) {
            whereClause.categoriaId = categoriaId;
        }

        // --- 3. Consultas a la Base de Datos ---
        // Se usa Promise.all para traer las categorías para el filtro y los artículos paginados
        const [categorias, { count, rows: articulos }] = await Promise.all([
            CategoriaArticulo.findAll({ order: [['nombre_categoria', 'ASC']] }),
            Articulo.findAndCountAll({
                where: whereClause, // Se aplica el filtro
                limit: elementosPorPagina,
                offset,
                order: [['nombre_articulo', 'ASC']],
                include: [
                    { model: CategoriaArticulo, as: 'categoria', attributes: ['nombre_categoria'] },
                    { model: UnidadDeMedida, as: 'unidad', attributes: ['abreviatura'] }
                ]
            })
        ]);

        // 4. Cálculo de Paginación
        const totalPaginas = Math.ceil(count / elementosPorPagina);

        // 5. Renderizado de la Vista
        res.render('articulos/leer', {
            pagina: 'Gestión de Artículos y Conceptos',
            barra: true,
            piePagina: true,
            articulos,
            csrfToken: req.csrfToken(),
            paginaActual: Number(page),
            totalPaginas,
            count,
            categorias, // Se pasa la lista de categorías para el filtro
            query: req.query // Se pasan los parámetros para rellenar el formulario de búsqueda
        });

    } catch (error) {
        console.error('Error al leer los artículos:', error);
        res.status(500).send('Hubo un error al cargar los artículos.');
    }
};

// Muestra el formulario para crear un nuevo artículo
const formularioCrearArticulo = async (req, res) => {

    //console.log('--- INTENTANDO CARGAR EL FORMULARIO PARA CREAR ARTÍCULO ---');

    try {
        const categorias = await CategoriaArticulo.findAll({
            order: [['nombre_categoria', 'ASC']]
        });

        const unidad_medida = await UnidadDeMedida.findAll({
            order: [['nombre', 'ASC']]
        });

        //console.log('Categorías encontradas:', categorias); 

        res.render('articulos/crear', { // La vista que debemos crear a continuación
            pagina: 'Crear Nuevo Artículo / Concepto',
            csrfToken: req.csrfToken(),
            categorias,
            unidad_medida,
            barra: true,
            piePagina: true,
            articulo: {} // Objeto vacío para el formulario
        });
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        res.status(500).send('Error al cargar formulario');
    }
};

// Registrar Articulo
const crearArticulo = async (req, res) => {
    // 1. Definimos las validaciones
    await check('nombre_articulo').notEmpty().withMessage('El nombre del artículo es obligatorio').run(req);
    await check('categoriaId').notEmpty().withMessage('Debes seleccionar una categoría').run(req);
    await check('unidad_medida_Id').notEmpty().withMessage('Debes seleccionar una unidad de medida').run(req);
    await check('stock_minimo').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero no negativo').run(req);
    await check('stock_actual').optional({ checkFalsy: true }).isDecimal({ decimal_digits: '1,3' }).withMessage('El stock actual debe ser un número válido').custom(value => value >= 0).withMessage('El stock actual no puede ser negativo').run(req);

    let resultado = validationResult(req);

    // 2. Si hay errores de validación, volvemos a renderizar el formulario
    if (!resultado.isEmpty()) {
        const [categorias, unidades] = await Promise.all([
            CategoriaArticulo.findAll({ order: [['nombre_categoria', 'ASC']] }),
            UnidadDeMedida.findAll({ order: [['nombre', 'ASC']] })
        ]);

        return res.render('articulos/crear', {
            pagina: 'Crear Nuevo Artículo / Concepto',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            categorias,
            unidad_medida: unidades,
            errores: resultado.array(),
            articulo: req.body
        });
    }

    // 3. Desestructuramos los campos y obtenemos el usuario logueado
    const { nombre_articulo, descripcion, unidad_medida_Id, categoriaId, stock_minimo, stock_actual } = req.body;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    const t = await db.transaction();
    try {
        // Verificamos si ya existe un artículo con el mismo nombre dentro de la transacción
        const existeArticulo = await Articulo.findOne({ where: { nombre_articulo }, transaction: t });

        if (existeArticulo) {
            // Si existe, lanzamos un error para que lo capture el bloque catch
            throw new Error('Ya existe un artículo o concepto con este nombre.');
        }

        // 4. Creamos el artículo en la base de datos
        const nuevoArticulo = await Articulo.create({
            nombre_articulo,
            descripcion,
            unidad_medida_Id,
            categoriaId,
            stock_minimo: stock_minimo || 0,
            stock_actual: stock_actual || 0,
            activo: true
        }, { transaction: t });

        // --- ¡REGISTRO DE AUDITORÍA AÑADIDO! ---
        await Auditoria.create({
            accion: 'CREAR',
            tabla_afectada: 'Articulos',
            registro_id: nuevoArticulo.id,
            descripcion: `El usuario ${nombreUsuario} creó el artículo: ${nombre_articulo}.`,
            usuarioId
        }, { transaction: t });

        await t.commit();
        res.redirect('/articulos/leer?mensaje=Artículo Creado Correctamente');

    } catch (error) {
        // --- BLOQUE CATCH CORREGIDO ---
        await t.rollback();
        console.error('Error al crear el artículo:', error);

        // Volvemos a cargar los datos necesarios para el formulario
        const [categorias, unidades] = await Promise.all([
            CategoriaArticulo.findAll({ order: [['nombre_categoria', 'ASC']] }),
            UnidadDeMedida.findAll({ order: [['nombre', 'ASC']] })
        ]);

        // Y renderizamos la vista con el mensaje de error específico
        res.render('articulos/crear', {
            pagina: 'Crear Nuevo Artículo / Concepto',
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            categorias,
            unidad_medida: unidades,
            errores: [{ msg: error.message || 'Hubo un error al guardar el artículo.' }],
            articulo: req.body
        });
    }
};

// Mostrar Formulario para Editar
const formularioEditarArticulo = async (req, res) => {

    if (req.usuario.role.nombre !== 'Admin') {
        return res.status(403).send('No tienes permiso para eliminar este vale');
    }

    const { id } = req.params;

    // Ejecuta ambas consultas al mismo tiempo
    const [articulo, categorias, unidades] = await Promise.all([
        Articulo.findByPk(id),
        CategoriaArticulo.findAll({ order: [['nombre_categoria', 'ASC']] }),
        UnidadDeMedida.findAll({ order: [['nombre', 'ASC']] })
    ]);

    if (!articulo) {
        return res.redirect('/articulos/leer');
    }

    res.render('articulos/editar', {
        pagina: `Editar: ${articulo.nombre_articulo}`,
        csrfToken: req.csrfToken(),
        barra: true,
        piePagina: true,
        articulo,
        categorias,
        unidad_medida: unidades,
    });
};

// Procesa los cambios del formulario de edición
const actualizarArticulo = async (req, res) => {
    // 1. Definimos las validaciones, incluyendo la nueva unidad de medida
    await check('nombre_articulo').notEmpty().withMessage('El nombre del artículo es obligatorio').run(req);
    await check('categoriaId').notEmpty().withMessage('Debes seleccionar una categoría').run(req);
    await check('unidad_medida_Id').notEmpty().withMessage('Debes seleccionar una unidad de medida').run(req);
    await check('stock_minimo')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero no negativo')
        .run(req);
    await check('stock_actual')
        .optional({ checkFalsy: true })
        .isDecimal({ decimal_digits: '1,3' }).withMessage('El stock actual debe ser un número válido')
        .custom(value => value >= 0).withMessage('El stock actual no puede ser negativo')
        .run(req);

    let resultado = validationResult(req);
    const { id } = req.params;

    // 2. Si hay errores de validación, renderizamos el formulario de nuevo
    if (!resultado.isEmpty()) {
        const [categorias, unidades, articulo] = await Promise.all([
            CategoriaArticulo.findAll({ order: [['nombre_categoria', 'ASC']] }),
            UnidadDeMedida.findAll({ order: [['nombre', 'ASC']] }),
            Articulo.findByPk(id)
        ]);

        return res.render('articulos/editar', {
            pagina: `Editar: ${articulo.nombre_articulo}`,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            categorias,
            unidad_medida: unidades,
            errores: resultado.array(),
            articulo: { id, ...req.body }
        });
    }

    // 3. Desestructuramos los campos y obtenemos el usuario logueado
    const { nombre_articulo, descripcion, unidad_medida_Id, categoriaId, stock_minimo, stock_actual, activo } = req.body;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    const t = await db.transaction();
    try {
        const articulo = await Articulo.findByPk(id, { transaction: t });
        if (!articulo) {
            throw new Error('Artículo no encontrado.');
        }

        // 4. Verificamos que el nombre no esté en uso por OTRO artículo
        const existeOtroArticulo = await Articulo.findOne({
            where: { nombre_articulo, id: { [Op.ne]: id } },
            transaction: t
        });

        if (existeOtroArticulo) {
            throw new Error('El nombre ya está en uso por otro artículo.');
        }

        // --- ¡REGISTRO DE AUDITORÍA AÑADIDO! ---
        await Auditoria.create({
            accion: 'MODIFICAR',
            tabla_afectada: 'Articulos',
            registro_id: id,
            descripcion: `El usuario ${nombreUsuario} actualizó el artículo: ${articulo.nombre_articulo}.`,
            usuarioId
        }, { transaction: t });

        // 5. Actualizamos los datos del artículo
        articulo.nombre_articulo = nombre_articulo;
        articulo.descripcion = descripcion;
        articulo.unidad_medida_Id = unidad_medida_Id;
        articulo.categoriaId = categoriaId;
        articulo.stock_minimo = stock_minimo || 0;
        articulo.stock_actual = stock_actual || 0;
        articulo.activo = activo === 'on';

        await articulo.save({ transaction: t });

        await t.commit();
        res.redirect('/articulos/leer?mensaje=Artículo actualizado correctamente');

    } catch (error) {
        await t.rollback();
        console.error('Error al actualizar artículo:', error);

        // --- ¡BLOQUE CATCH MEJORADO! ---
        // Volvemos a cargar los datos necesarios para el formulario
        const [categorias, unidades] = await Promise.all([
            CategoriaArticulo.findAll({ order: [['nombre_categoria', 'ASC']] }),
            UnidadDeMedida.findAll({ order: [['nombre', 'ASC']] })
        ]);

        // Y renderizamos la vista de edición con el mensaje de error específico
        return res.render('articulos/editar', {
            pagina: `Editar Artículo`,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            categorias,
            unidad_medida: unidades,
            errores: [{ msg: error.message }], // Pasamos el error específico
            articulo: { id, ...req.body } // Devolvemos los datos que el usuario ya había ingresado
        });
    }
};

// Elimina un artículo de la BD
const eliminarArticulo = async (req, res) => {
    const { id } = req.params;
    const { id: usuarioId, nombre: nombreUsuario } = req.usuario;

    if (req.usuario.role.nombre !== 'Admin' && req.usuario.role.nombre !== 'Supervisor') {
        return res.redirect(`/articulos/leer?error=No tienes permiso para eliminar.`);
    }

    const t = await db.transaction();
    try {
        const articulo = await Articulo.findByPk(id, { transaction: t });
        if (!articulo) {
            throw new Error('Artículo no encontrado.');
        }

        // --- ¡REGISTRO DE AUDITORÍA AÑADIDO! ---
        await Auditoria.create({
            accion: 'ELIMINAR',
            tabla_afectada: 'Articulos',
            registro_id: id,
            descripcion: `El usuario ${nombreUsuario} eliminó el artículo: ${articulo.nombre_articulo}.`,
            usuarioId
        }, { transaction: t });

        await articulo.destroy({ transaction: t });

        await t.commit();
        return res.redirect('/articulos/leer?mensaje=Artículo eliminado correctamente.');

    } catch (error) {
        await t.rollback();
        console.error('Error al eliminar artículo:', error);
        return res.redirect(`/articulos/leer?error=${encodeURIComponent(error.message)}`);
    }
};

export {
    leerArticulos,
    formularioCrearArticulo,
    crearArticulo,
    formularioEditarArticulo,
    actualizarArticulo,
    eliminarArticulo
};