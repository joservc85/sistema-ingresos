import Actividad from './Actividad.js'
import Factura from './Factura.js';
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
import GastoAdministrativo from './GastoAdministrativo.js';
import DetalleGastoAdministrativo from './DetalleGastoAdministrativo.js';
import ArticuloRopa from './ArticuloRopa.js';
import VentaRopa from './VentaRopa.js';
import DetalleVentaRopa from './DetalleVentaRopa.js';
// --- ¡Cierre de Caja! ---
import FormaDePago from './FormaDePago.js';
import Banco from './Banco.js';
import CierreDeCaja from './CierreDeCaja.js';
import Auditoria from './Auditoria.js';
import PagoActividad from './PagoActividad.js';


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

// Una Actividad puede tener una Factura
Actividad.hasOne(Factura, { foreignKey: 'actividadId' });
Factura.belongsTo(Actividad, { foreignKey: 'actividadId' });

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

// Un Gasto Administrativo es registrado por un Usuario
GastoAdministrativo.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Usuario.hasMany(GastoAdministrativo, { foreignKey: 'usuarioId' });

// Un Gasto Administrativo tiene muchos detalles (artículos)
GastoAdministrativo.hasMany(DetalleGastoAdministrativo, {  as: 'detalles', foreignKey: 'gastoId' });
DetalleGastoAdministrativo.belongsTo(GastoAdministrativo, { foreignKey: 'gastoId' });

// Un Detalle de Gasto se refiere a un Artículo
DetalleGastoAdministrativo.belongsTo(Articulo, { foreignKey: 'articuloId', as: 'articulo' });
Articulo.hasMany(DetalleGastoAdministrativo, { foreignKey: 'articuloId' });

// Una Unidad de Medida puede tener muchos Artículos
UnidadDeMedida.hasMany(Articulo, { foreignKey: 'unidad_medida_Id' });
// Un Usuario pertenece a un Rol (Usuario N -> 1 Rol)
Usuario.belongsTo(Rol, { as: 'role', foreignKey: 'rolId', onDelete: 'CASCADE' });

// Una Venta de Ropa es registrada por un Usuario
VentaRopa.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Usuario.hasMany(VentaRopa, { foreignKey: 'usuarioId' });

// Una Venta de Ropa puede tener un Cliente (opcional)
VentaRopa.belongsTo(Cliente, { foreignKey: 'clienteId', allowNull: true });
Cliente.hasMany(VentaRopa, { foreignKey: 'clienteId' });

// Una Venta de Ropa tiene muchos detalles (artículos)
VentaRopa.hasMany(DetalleVentaRopa, { as: 'detalles', foreignKey: 'ventaRopaId' });
DetalleVentaRopa.belongsTo(VentaRopa, { foreignKey: 'ventaRopaId' });
// Un Detalle de Venta se refiere a un Artículo de Ropa
DetalleVentaRopa.belongsTo(ArticuloRopa, { foreignKey: 'articuloRopaId' });
ArticuloRopa.hasMany(DetalleVentaRopa, { foreignKey: 'articuloRopaId' });
// Una Venta de Ropa es registrada por un Usuario
VentaRopa.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Usuario.hasMany(VentaRopa, { foreignKey: 'usuarioId' });
// Una Venta de Ropa puede tener un Cliente (opcional)
VentaRopa.belongsTo(Cliente, { foreignKey: 'clienteId' });
Cliente.hasMany(VentaRopa, { foreignKey: 'clienteId' });

// --- NUEVAS RELACIONES PARA CIERRE DE CAJA ---
// Relaciones para Actividad
// Actividad.belongsTo(FormaDePago, { foreignKey: 'formaDePagoId' });
// Actividad.belongsTo(Banco, { foreignKey: 'bancoId' });
// Una Actividad ahora puede tener MUCHOS Pagos
Actividad.hasMany(PagoActividad, { foreignKey: 'actividadId' });
PagoActividad.belongsTo(Actividad, { foreignKey: 'actividadId' });

// Cada Pago pertenece a UNA Forma de Pago
PagoActividad.belongsTo(FormaDePago, { foreignKey: 'formaDePagoId' });
FormaDePago.hasMany(PagoActividad, { foreignKey: 'formaDePagoId' });

// Cada Pago PUEDE pertenecer a UN Banco (opcional)
PagoActividad.belongsTo(Banco, { foreignKey: 'bancoId' });
Banco.hasMany(PagoActividad, { foreignKey: 'bancoId' });

// Relaciones para CierreDeCaja
CierreDeCaja.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Usuario.hasMany(CierreDeCaja, { foreignKey: 'usuarioId' });


// Un Rol puede tener muchos Usuarios (Rol 1 -> N Usuarios)
Rol.hasMany(Usuario, { foreignKey: 'rolId' });

// Una Auditoría es registrada por un Usuario
Auditoria.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Usuario.hasMany(Auditoria, { foreignKey: 'usuarioId' });


export{
    Actividad,
    Factura,
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
    UnidadDeMedida,
    GastoAdministrativo,
    DetalleGastoAdministrativo,
    ArticuloRopa,
    VentaRopa,
    DetalleVentaRopa,
    FormaDePago,
    Banco,
    CierreDeCaja,
    Auditoria,
    PagoActividad
}

