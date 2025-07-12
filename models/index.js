import Actividad from './Actividad.js'
import DetalleActividad from './DetalleActividad.js';
import Personal from './Personal.js'
import Cliente from './Cliente.js'
import Procedimiento from './Procedimiento.js'
import Precio from './Precio.js'
import Usuario from './Usuario.js'
import Rol from './Rol.js'
import Proveedor from './Proveedor.js'
// --- ¡Nuevas importaciones! ---
import GastoAdicional from './GastoAdicional.js'
import Articulo from './Articulo.js'
import CategoriaArticulo from './CategoriaArticulo.js';
import UnidadDeMedida from './UnidadDeMedida.js';
import GastoAdicionalDetalle from './GastoAdicionalDetalle.js'

// Relaciones de 1:1 correctas para Sequelize (aunque son de uno a muchos)

// Una Actividad pertenece a un Cliente
Actividad.belongsTo(Cliente, { foreignKey: 'clienteId' })
Cliente.hasMany(Actividad, { foreignKey: 'clienteId' })

// Una Actividad pertenece a un Personal
Actividad.belongsTo(Personal, { foreignKey: 'personalId' })
Personal.hasMany(Actividad, { foreignKey: 'personalId' })

// Una Actividad pertenece a un Procedimiento
Actividad.belongsTo(Procedimiento, { foreignKey: 'procedimientoId' })
Procedimiento.hasMany(Actividad, { foreignKey: 'procedimientoId' })

// Una Actividad pertenece a un Precio
Actividad.belongsTo(Precio, { foreignKey: 'precioId' })
Precio.hasMany(Actividad, { foreignKey: 'precioId' })

// Una Actividad pertenece a un Usuario
Actividad.belongsTo(Usuario, { foreignKey: 'usuarioId' })
Usuario.hasMany(Actividad, { foreignKey: 'usuarioId' })

// Un Procedimiento tiene un Precio
Procedimiento.belongsTo(Precio, { foreignKey: 'precioId' });
Precio.hasMany(Procedimiento, { foreignKey: 'precioId' });

// Una Actividad tiene muchos Detalles
Actividad.hasMany(DetalleActividad, { foreignKey: 'actividadId' });
DetalleActividad.belongsTo(Actividad, { foreignKey: 'actividadId' });

// Un Artículo puede estar en muchos Detalles
Articulo.hasMany(DetalleActividad, { foreignKey: 'articuloId' });
DetalleActividad.belongsTo(Articulo, { foreignKey: 'articuloId' });

// --- ¡Nuevas relaciones para Gastos Adicionales y Artículos! ---

// Un GastoAdicional pertenece a un Proveedor
// Un proveedor puede tener muchos gastos adicionales
GastoAdicional.belongsTo(Proveedor, { foreignKey: 'proveedorId' });
Proveedor.hasMany(GastoAdicional, { foreignKey: 'proveedorId' });

// Un GastoAdicional puede tener muchos detalles (líneas de artículos)
GastoAdicional.hasMany(GastoAdicionalDetalle, { foreignKey: 'gastoAdicionalId' });
// Cada detalle pertenece a un gasto específico
GastoAdicionalDetalle.belongsTo(GastoAdicional, { foreignKey: 'gastoAdicionalId' });

// Un GastoAdicionalDetalle se refiere a un Artículo específico
// Un artículo puede aparecer en muchos detalles de gastos
GastoAdicionalDetalle.belongsTo(Articulo, { foreignKey: 'articuloId',  as: 'articulo' });
Articulo.hasMany(GastoAdicionalDetalle, { foreignKey: 'articuloId' });

GastoAdicional.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuarioId' });
Usuario.hasMany(GastoAdicional, { as: 'gastos', foreignKey: 'usuarioId' });

CategoriaArticulo.hasMany(Articulo, { foreignKey: {name: 'categoriaId', allowNull: false }});
Articulo.belongsTo(CategoriaArticulo, { foreignKey: 'categoriaId',as: 'categoria' });

// Un Artículo pertenece a una Unidad de Medida
Articulo.belongsTo(UnidadDeMedida, {  foreignKey: 'unidad_medida_Id',  as: 'unidad'});

// Una Unidad de Medida puede tener muchos Artículos
UnidadDeMedida.hasMany(Articulo, { foreignKey: 'unidad_medida_Id' });

// Un Usuario pertenece a un Rol (Usuario N -> 1 Rol)
Usuario.belongsTo(Rol, { foreignKey: 'rolId', onDelete: 'CASCADE' });

// Un Rol puede tener muchos Usuarios (Rol 1 -> N Usuarios)
Rol.hasMany(Usuario, { foreignKey: 'rolId' });


export{
    Actividad,
    DetalleActividad,
    Personal,
    Cliente,
    Procedimiento,
    Precio,
    Usuario,
    Rol,
    Proveedor, 
    GastoAdicional, 
    Articulo,       
    GastoAdicionalDetalle,
    CategoriaArticulo,
    UnidadDeMedida
}

