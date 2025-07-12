// controllers/inventarioController.js
import { Articulo, CategoriaArticulo, UnidadDeMedida } from '../models/index.js';
// Libreria para Exportar Excel
import ExcelJS from 'exceljs';
import { Op } from 'sequelize';

export const vistaInventario = async (req, res) => {
    const elementosPorPagina = 12;
    const paginaActual = Number(req.query.page) || 1;
    const offset = (paginaActual - 1) * elementosPorPagina;

    const { nombre, categoria } = req.query;
    const filtros = {};

    if (nombre) {
        filtros.nombre_articulo = { [Op.like]: `%${nombre}%` };
    }
    if (categoria) {
        filtros.categoriaId = categoria;
    }

    try {
        const [categorias, { count, rows: articulos }] = await Promise.all([
            CategoriaArticulo.findAll(),
            Articulo.findAndCountAll({
                limit: elementosPorPagina,
                offset,
                order: [['nombre_articulo', 'ASC']],
                where: filtros,
                include: [
                    {
                        model: CategoriaArticulo,
                        as: 'categoria',
                        attributes: ['nombre_categoria']
                    },
                    // <-- 2. Añadir la relación con UnidadDeMedida
                    {
                        model: UnidadDeMedida,
                        as: 'unidad',
                        attributes: ['nombre','abreviatura']
                    }
                ]
            })
        ]);

        const totalPaginas = Math.ceil(count / elementosPorPagina);

        res.render('inventario/listado', {
            pagina: 'Inventario Damaris SPA',
            barra: true,
            piePagina: true,
            articulos,
            categorias,
            csrfToken: req.csrfToken(),
            paginaActual,
            totalPaginas,
            offset,
            count,
            nombreFiltro: nombre || '',
            categoriaFiltro: categoria || ''
        });
    } catch (error) {
        console.error('Error al cargar el inventario:', error);
        res.status(500).send('Error al cargar el inventario.');
    }
};

export const exportarInventarioExcel = async (req, res) => {
    try {
        const { nombre, categoria } = req.query;
        const filtros = {};

        if (nombre) {
            filtros.nombre_articulo = { [Op.like]: `%${nombre}%` };
        }
        if (categoria) {
            filtros.categoriaId = categoria;
        }

        const articulos = await Articulo.findAll({
            where: filtros,
            include: [
                {
                    model: CategoriaArticulo,
                    as: 'categoria',
                    attributes: ['nombre_categoria']
                },
                // <-- 3. Añadir también aquí la relación con UnidadDeMedida
                {
                    model: UnidadDeMedida,
                    as: 'unidad',
                    attributes: ['nombre','abreviatura']
                }
            ],
            order: [['nombre_articulo', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre del Artículo', key: 'nombre', width: 30 },
            { header: 'Categoría', key: 'categoria', width: 25 },
            { header: 'Unidad', key: 'unidad', width: 15 },
            { header: 'Stock Actual', key: 'stock', width: 15 },
            { header: 'Stock Mínimo', key: 'minimo', width: 15 },
            { header: 'Estado', key: 'estado', width: 15 }
        ];

        articulos.forEach(articulo => {
            worksheet.addRow({
                id: articulo.id,
                nombre: articulo.nombre_articulo,
                categoria: articulo.categoria?.nombre_categoria || 'Sin categoría',
                // <-- 4. Usar la abreviatura de la relación
                unidad: articulo.unidad ? `${articulo.unidad.nombre} (${articulo.unidad.abreviatura})` : 'N/A',
                stock: articulo.stock_actual,
                minimo: articulo.stock_minimo,
                estado: articulo.activo ? 'Activo' : 'Inactivo'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Inventario-Damaris-SPA.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error al exportar inventario:', error);
        res.status(500).send('Hubo un error al exportar el inventario.');
    }
};