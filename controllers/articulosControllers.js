// controllers/articulosController.js
import { Articulo, CategoriaArticulo, UnidadDeMedida } from '../models/index.js';
import { check, validationResult } from 'express-validator';
import { Op } from 'sequelize';

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
    // 1. Definimos las validaciones para todos los campos
    await check('nombre_articulo').notEmpty().withMessage('El nombre del artículo es obligatorio').run(req);
    await check('categoriaId').notEmpty().withMessage('Debes seleccionar una categoría').run(req);
    await check('unidad_medida_Id').notEmpty().withMessage('Debes seleccionar una unidad de medida').run(req); // <-- VALIDACIÓN AÑADIDA
    await check('stock_minimo')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero no negativo')
        .run(req);
    await check('stock_actual')
        .optional({ checkFalsy: true })
        .isDecimal({ decimal_digits: '1,3' }).withMessage('El stock actual debe ser un número válido') // <-- VALIDACIÓN CORREGIDA
        .custom(value => value >= 0).withMessage('El stock actual no puede ser negativo')
        .run(req);

    let resultado = validationResult(req);

    // 2. Si hay errores, volvemos a renderizar el formulario
    if (!resultado.isEmpty()) {
        // Consultamos los datos necesarios para el formulario una sola vez
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

    // 3. Desestructuramos los campos del req.body
    const { nombre_articulo, descripcion, unidad_medida_Id, categoriaId, stock_minimo, stock_actual } = req.body;

    try {
        // Verificamos si ya existe un artículo con el mismo nombre
        const existeArticulo = await Articulo.findOne({ where: { nombre_articulo } });

        if (existeArticulo) {
            // Si ya existe, renderizamos el formulario con el error
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
                errores: [{ msg: 'Ya existe un artículo o concepto con este nombre.' }],
                articulo: req.body
            });
        }

        // 4. Creamos el artículo en la base de datos
        await Articulo.create({
            nombre_articulo,
            descripcion,
            unidad_medida_Id,
            categoriaId,
            stock_minimo: stock_minimo || 0,
            stock_actual: stock_actual || 0,
            activo: true
        });

        // Redireccionamos a la lista
        res.redirect('/articulos/leer?guardado=true');

    } catch (error) {
        console.error('Error al crear el artículo:', error);
        res.status(500).send('Hubo un error al intentar guardar el artículo.');
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

    // 2. Si hay errores, renderizamos el formulario de nuevo con todos los datos necesarios
    if (!resultado.isEmpty()) {
        const [categorias, unidades, articulo] = await Promise.all([
            CategoriaArticulo.findAll({ order: [['nombre_categoria', 'ASC']] }),
            UnidadDeMedida.findAll({ order: [['nombre', 'ASC']] }),
            Articulo.findByPk(id) // Necesitamos los datos originales para el título de la página
        ]);

        return res.render('articulos/editar', {
            pagina: `Editar: ${articulo.nombre_articulo}`,
            csrfToken: req.csrfToken(),
            barra: true,
            piePagina: true,
            categorias,
            unidad_medida: unidades, // Pasamos las unidades a la vista con el nombre correcto
            errores: resultado.array(),
            articulo: { id, ...req.body } // Devolvemos los datos que el usuario ya había ingresado
        });
    }

    // 3. Desestructuramos los campos del req.body
    const { nombre_articulo, descripcion, unidad_medida_Id, categoriaId, stock_minimo, stock_actual, activo } = req.body;
    
    // Buscamos el artículo que vamos a actualizar
    const articulo = await Articulo.findByPk(id);
    if (!articulo) {
        return res.redirect('/articulos/leer');
    }

    try {
        // 4. Verificamos que el nombre no esté en uso por OTRO artículo
        const existeOtroArticulo = await Articulo.findOne({
            where: { nombre_articulo, id: { [Op.ne]: id } }
        });

        if (existeOtroArticulo) {
            const [categorias, unidades] = await Promise.all([
                CategoriaArticulo.findAll({ order: [['nombre_categoria', 'ASC']] }),
                UnidadDeMedida.findAll({ order: [['nombre', 'ASC']] })
            ]);
            return res.render('articulos/editar', {
                pagina: `Editar: ${articulo.nombre_articulo}`,
                csrfToken: req.csrfToken(),
                barra: true,
                piePagina: true,
                categorias,
                unidad_medida: unidades,
                errores: [{ msg: 'El nombre ya está en uso por otro artículo.' }],
                articulo: { id, ...req.body }
            });
        }

        // 5. Actualizamos los datos del artículo con los nuevos campos
        articulo.nombre_articulo = nombre_articulo;
        articulo.descripcion = descripcion;
        articulo.unidad_medida_Id = unidad_medida_Id; // <-- CAMPO CORREGIDO
        articulo.categoriaId = categoriaId;
        articulo.stock_minimo = stock_minimo || 0;
        articulo.stock_actual = stock_actual || 0;
        articulo.activo = activo === 'on';

        // Guardamos los cambios en la base de datos
        await articulo.save();
        res.redirect('/articulos/leer?actualizado=true');

    } catch (error) {
        console.error('Error al actualizar artículo:', error);
        res.status(500).send('Hubo un error al actualizar los datos.');
    }
};

// Elimina un artículo de la BD
const eliminarArticulo = async (req, res) => {

    if (req.usuario.role.nombre !== 'Admin') {
      return res.status(403).send('No tienes permiso para eliminar este vale');
    }

    const { id } = req.params;

    try {
        const articulo = await Articulo.findByPk(id);
        if (!articulo) {
            return res.redirect('/articulos/leer');
        }

        // Si el artículo está asociado a detalles de gastos, la eliminación fallará
        // si la clave foránea tiene la restricción por defecto.
        await articulo.destroy();
        res.redirect('/articulos/leer?eliminado=true');

    } catch (error) {
        console.error('Error al eliminar artículo:', error);
        // Manejo de error si el artículo no se puede borrar por estar en uso
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            // Idealmente, aquí se redirige con un mensaje de error para SweetAlert
            return res.redirect(`/articulos/leer?error_eliminar=true`);
        }
        res.status(500).send('Error al eliminar el artículo.');
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