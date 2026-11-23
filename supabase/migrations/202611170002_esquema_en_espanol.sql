-- Renombra el esquema de Api Teresita al español sin eliminar ni copiar datos.
-- Ejecutar una sola vez, después de 202611170001_initial_schema.sql.
begin;

alter sequence public.order_number_seq rename to secuencia_numero_pedido;

alter table public.profiles rename to perfiles;
alter table public.products rename to productos;
alter table public.orders rename to pedidos;
alter table public.order_items rename to detalles_pedido;
alter table public.inventory_items rename to insumos;
alter table public.inventory_movements rename to movimientos_inventario;
alter table public.suppliers rename to proveedores;
alter table public.purchases rename to compras;
alter table public.purchase_items rename to detalles_compra;
alter table public.sales rename to ventas;
alter table public.recipes rename to recetas;
alter table public.recipe_items rename to ingredientes_receta;
alter table public.production_batches rename to lotes_produccion;
alter table public.business_settings rename to configuracion_negocio;
alter table public.audit_logs rename to registros_auditoria;
alter table public.contact_messages rename to mensajes_contacto;

alter table public.perfiles rename column full_name to nombre_completo;
alter table public.perfiles rename column role to rol;
alter table public.perfiles rename column active to activo;
alter table public.perfiles rename column created_at to creado_en;
alter table public.perfiles rename column updated_at to actualizado_en;

alter table public.productos rename column name to nombre;
alter table public.productos rename column category to categoria;
alter table public.productos rename column description to descripcion;
alter table public.productos rename column short_description to descripcion_corta;
alter table public.productos rename column price to precio;
alter table public.productos rename column available to disponible;
alter table public.productos rename column active to activo;
alter table public.productos rename column tone to tono;
alter table public.productos rename column display_order to orden_visualizacion;
alter table public.productos rename column created_at to creado_en;
alter table public.productos rename column updated_at to actualizado_en;

alter table public.pedidos rename column order_number to numero_pedido;
alter table public.pedidos rename column customer_name to nombre_cliente;
alter table public.pedidos rename column table_number to numero_mesa;
alter table public.pedidos rename column status to estado;
alter table public.pedidos rename column notes to notas;
alter table public.pedidos rename column created_at to creado_en;
alter table public.pedidos rename column updated_at to actualizado_en;

alter table public.detalles_pedido rename column order_id to pedido_id;
alter table public.detalles_pedido rename column product_id to producto_id;
alter table public.detalles_pedido rename column product_name to nombre_producto;
alter table public.detalles_pedido rename column unit_price to precio_unitario;
alter table public.detalles_pedido rename column quantity to cantidad;
alter table public.detalles_pedido rename column created_at to creado_en;

alter table public.insumos rename column name to nombre;
alter table public.insumos rename column category to categoria;
alter table public.insumos rename column unit to unidad;
alter table public.insumos rename column current_stock to existencias_actuales;
alter table public.insumos rename column minimum_stock to existencias_minimas;
alter table public.insumos rename column cost_per_unit to costo_unitario;
alter table public.insumos rename column active to activo;
alter table public.insumos rename column created_at to creado_en;
alter table public.insumos rename column updated_at to actualizado_en;

alter table public.movimientos_inventario rename column inventory_item_id to insumo_id;
alter table public.movimientos_inventario rename column movement_type to tipo_movimiento;
alter table public.movimientos_inventario rename column quantity to cantidad;
alter table public.movimientos_inventario rename column reference to referencia;
alter table public.movimientos_inventario rename column notes to notas;
alter table public.movimientos_inventario rename column created_by to creado_por;
alter table public.movimientos_inventario rename column created_at to creado_en;

alter table public.proveedores rename column name to nombre;
alter table public.proveedores rename column contact_name to nombre_contacto;
alter table public.proveedores rename column phone to telefono;
alter table public.proveedores rename column products to productos;
alter table public.proveedores rename column active to activo;
alter table public.proveedores rename column created_at to creado_en;
alter table public.proveedores rename column updated_at to actualizado_en;

alter table public.compras rename column purchase_number to numero_compra;
alter table public.compras rename column supplier_id to proveedor_id;
alter table public.compras rename column status to estado;
alter table public.compras rename column purchased_at to fecha_compra;
alter table public.compras rename column notes to notas;
alter table public.compras rename column created_at to creado_en;
alter table public.compras rename column updated_at to actualizado_en;

alter table public.detalles_compra rename column purchase_id to compra_id;
alter table public.detalles_compra rename column inventory_item_id to insumo_id;
alter table public.detalles_compra rename column description to descripcion;
alter table public.detalles_compra rename column quantity to cantidad;
alter table public.detalles_compra rename column unit_cost to costo_unitario;

alter table public.ventas rename column sale_number to numero_venta;
alter table public.ventas rename column customer_name to nombre_cliente;
alter table public.ventas rename column payment_method to metodo_pago;
alter table public.ventas rename column sold_at to fecha_venta;
alter table public.ventas rename column notes to notas;
alter table public.ventas rename column created_at to creado_en;

alter table public.recetas rename column product_id to producto_id;
alter table public.recetas rename column yield_quantity to cantidad_rendimiento;
alter table public.recetas rename column estimated_cost to costo_estimado;
alter table public.recetas rename column notes to notas;
alter table public.recetas rename column active to activo;
alter table public.recetas rename column created_at to creado_en;
alter table public.recetas rename column updated_at to actualizado_en;

alter table public.ingredientes_receta rename column recipe_id to receta_id;
alter table public.ingredientes_receta rename column inventory_item_id to insumo_id;
alter table public.ingredientes_receta rename column quantity to cantidad;

alter table public.lotes_produccion rename column product_id to producto_id;
alter table public.lotes_produccion rename column planned_quantity to cantidad_planificada;
alter table public.lotes_produccion rename column produced_quantity to cantidad_producida;
alter table public.lotes_produccion rename column status to estado;
alter table public.lotes_produccion rename column production_date to fecha_produccion;
alter table public.lotes_produccion rename column responsible_name to nombre_responsable;
alter table public.lotes_produccion rename column notes to notas;
alter table public.lotes_produccion rename column created_at to creado_en;
alter table public.lotes_produccion rename column updated_at to actualizado_en;

alter table public.configuracion_negocio rename column business_name to nombre_negocio;
alter table public.configuracion_negocio rename column address to direccion;
alter table public.configuracion_negocio rename column phone to telefono;
alter table public.configuracion_negocio rename column opening_hours to horario_atencion;
alter table public.configuracion_negocio rename column map_url to url_mapa;
alter table public.configuracion_negocio rename column updated_at to actualizado_en;

alter table public.registros_auditoria rename column actor_id to usuario_id;
alter table public.registros_auditoria rename column action to accion;
alter table public.registros_auditoria rename column entity to entidad;
alter table public.registros_auditoria rename column entity_id to id_entidad;
alter table public.registros_auditoria rename column details to detalles;
alter table public.registros_auditoria rename column created_at to creado_en;

alter table public.mensajes_contacto rename column name to nombre;
alter table public.mensajes_contacto rename column subject to asunto;
alter table public.mensajes_contacto rename column message to mensaje;
alter table public.mensajes_contacto rename column status to estado;
alter table public.mensajes_contacto rename column created_at to creado_en;

-- Los disparadores anteriores conservan su nombre inglés después del renombrado.
drop trigger if exists set_profiles_updated_at on public.perfiles;
drop trigger if exists set_products_updated_at on public.productos;
drop trigger if exists set_orders_updated_at on public.pedidos;
drop trigger if exists set_inventory_items_updated_at on public.insumos;
drop trigger if exists set_suppliers_updated_at on public.proveedores;
drop trigger if exists set_purchases_updated_at on public.compras;
drop trigger if exists set_recipes_updated_at on public.recetas;
drop trigger if exists set_production_batches_updated_at on public.lotes_produccion;
drop trigger if exists set_business_settings_updated_at on public.configuracion_negocio;

drop function if exists public.set_updated_at();
create function public.establecer_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

do $$
declare nombre_tabla text;
begin
  foreach nombre_tabla in array array[
    'perfiles', 'productos', 'pedidos', 'insumos', 'proveedores',
    'compras', 'recetas', 'lotes_produccion', 'configuracion_negocio'
  ] loop
    execute format(
      'create trigger establecer_%I_actualizado_en before update on public.%I for each row execute function public.establecer_actualizado_en()',
      nombre_tabla,
      nombre_tabla
    );
  end loop;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
create function public.gestionar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_completo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin' else 'staff' end
  )
  on conflict (id) do update set
    nombre_completo = excluded.nombre_completo,
    rol = excluded.rol,
    actualizado_en = now();
  return new;
end;
$$;

create trigger al_crear_usuario_auth
after insert or update of raw_app_meta_data, raw_user_meta_data on auth.users
for each row execute function public.gestionar_nuevo_usuario();

alter function public.is_admin() rename to es_administrador;

drop function if exists public.create_public_order(text, integer, text, integer);
create function public.crear_pedido_publico(
  p_nombre_cliente text,
  p_numero_mesa integer,
  p_producto_id text,
  p_cantidad integer
)
returns table (pedido_id uuid, numero_pedido text, total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  producto_seleccionado public.productos%rowtype;
  pedido_nuevo public.pedidos%rowtype;
  nombre_limpio text := btrim(p_nombre_cliente);
begin
  if char_length(nombre_limpio) < 2 or char_length(nombre_limpio) > 100 then
    raise exception 'El nombre no es válido.' using errcode = '22023';
  end if;
  if p_numero_mesa is null or p_numero_mesa < 1 or p_numero_mesa > 999 then
    raise exception 'El número de mesa no es válido.' using errcode = '22023';
  end if;
  if p_cantidad is null or p_cantidad < 1 or p_cantidad > 50 then
    raise exception 'La cantidad no es válida.' using errcode = '22023';
  end if;

  select * into producto_seleccionado
  from public.productos
  where id = p_producto_id and activo = true
  for share;

  if not found then
    raise exception 'El producto no existe.' using errcode = 'P0002';
  end if;
  if not producto_seleccionado.disponible then
    raise exception 'El producto no está disponible.' using errcode = 'P0001';
  end if;

  insert into public.pedidos (nombre_cliente, numero_mesa, total)
  values (nombre_limpio, p_numero_mesa, producto_seleccionado.precio * p_cantidad)
  returning * into pedido_nuevo;

  insert into public.detalles_pedido
    (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad)
  values
    (pedido_nuevo.id, producto_seleccionado.id, producto_seleccionado.nombre, producto_seleccionado.precio, p_cantidad);

  return query select pedido_nuevo.id, pedido_nuevo.numero_pedido, pedido_nuevo.total;
end;
$$;

revoke all on function public.crear_pedido_publico(text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.crear_pedido_publico(text, integer, text, integer) to service_role;

-- Actualiza las políticas para que su definición también use el nombre español.
do $$
declare nombre_tabla text;
begin
  foreach nombre_tabla in array array[
    'perfiles', 'productos', 'pedidos', 'detalles_pedido', 'insumos',
    'movimientos_inventario', 'proveedores', 'compras', 'detalles_compra', 'ventas',
    'recetas', 'ingredientes_receta', 'lotes_produccion', 'configuracion_negocio',
    'registros_auditoria', 'mensajes_contacto'
  ] loop
    execute format('drop policy if exists "Admins manage %s" on public.%I', nombre_tabla, nombre_tabla);
    execute format('drop policy if exists "Administradores gestionan %s" on public.%I', nombre_tabla, nombre_tabla);
    execute format(
      'create policy "Administradores gestionan %s" on public.%I for all to authenticated using ((select public.es_administrador())) with check ((select public.es_administrador()))',
      nombre_tabla,
      nombre_tabla
    );
  end loop;
end;
$$;

commit;
