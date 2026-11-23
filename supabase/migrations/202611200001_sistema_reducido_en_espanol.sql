-- Api Teresita: esquema final reducido y completamente nombrado en español.
-- Conserva productos, ventas, configuración pública y auditoría.

begin;

-- La autenticación permanece en auth.users; ya no necesita una tabla pública duplicada.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.manejar_nuevo_usuario();

-- Los pedidos públicos dejaron de formar parte del sistema.
drop function if exists public.create_public_order(text, integer, text, integer);
drop function if exists public.crear_pedido_publico(text, integer, text, integer);

create or replace function public._renombrar_tabla(anterior text, nuevo text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if to_regclass('public.' || anterior) is not null
     and to_regclass('public.' || nuevo) is null then
    execute format('alter table public.%I rename to %I', anterior, nuevo);
  end if;
end;
$$;

select public._renombrar_tabla('products', 'productos');
select public._renombrar_tabla('sales', 'ventas');
select public._renombrar_tabla('business_settings', 'configuracion_negocio');
select public._renombrar_tabla('audit_logs', 'registros_auditoria');

-- Se eliminan los módulos que no forman parte del alcance final.
drop table if exists
  public.order_items,
  public.detalles_pedido,
  public.orders,
  public.pedidos,
  public.inventory_movements,
  public.movimientos_inventario,
  public.inventory_items,
  public.insumos,
  public.purchase_items,
  public.detalles_compra,
  public.purchases,
  public.compras,
  public.suppliers,
  public.proveedores,
  public.recipe_items,
  public.ingredientes_receta,
  public.recipes,
  public.recetas,
  public.production_batches,
  public.lotes_produccion,
  public.contact_messages,
  public.mensajes_contacto,
  public.profiles,
  public.perfiles
cascade;

create or replace function public._renombrar_columna(tabla text, anterior text, nuevo text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = tabla and column_name = anterior
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = tabla and column_name = nuevo
  ) then
    execute format('alter table public.%I rename column %I to %I', tabla, anterior, nuevo);
  end if;
end;
$$;

-- Productos.
select public._renombrar_columna('productos', 'name', 'nombre');
select public._renombrar_columna('productos', 'category', 'categoria');
select public._renombrar_columna('productos', 'description', 'descripcion');
select public._renombrar_columna('productos', 'short_description', 'descripcion_corta');
select public._renombrar_columna('productos', 'price', 'precio');
select public._renombrar_columna('productos', 'available', 'disponible');
select public._renombrar_columna('productos', 'active', 'activo');
select public._renombrar_columna('productos', 'tone', 'tono');
select public._renombrar_columna('productos', 'display_order', 'orden_visualizacion');
select public._renombrar_columna('productos', 'created_at', 'creado_en');
select public._renombrar_columna('productos', 'updated_at', 'actualizado_en');

-- Ventas.
select public._renombrar_columna('ventas', 'sale_number', 'numero_venta');
select public._renombrar_columna('ventas', 'customer_name', 'nombre_cliente');
select public._renombrar_columna('ventas', 'payment_method', 'metodo_pago');
select public._renombrar_columna('ventas', 'sold_at', 'fecha_venta');
select public._renombrar_columna('ventas', 'notes', 'notas');
select public._renombrar_columna('ventas', 'created_at', 'creado_en');
alter table public.ventas add column if not exists detalle text not null default '';

-- Configuración pública.
select public._renombrar_columna('configuracion_negocio', 'business_name', 'nombre_negocio');
select public._renombrar_columna('configuracion_negocio', 'address', 'direccion');
select public._renombrar_columna('configuracion_negocio', 'phone', 'telefono');
select public._renombrar_columna('configuracion_negocio', 'opening_hours', 'horario_atencion');
select public._renombrar_columna('configuracion_negocio', 'map_url', 'url_mapa');
select public._renombrar_columna('configuracion_negocio', 'updated_at', 'actualizado_en');

-- Auditoría.
select public._renombrar_columna('registros_auditoria', 'actor_id', 'usuario_id');
select public._renombrar_columna('registros_auditoria', 'action', 'accion');
select public._renombrar_columna('registros_auditoria', 'entity', 'entidad');
select public._renombrar_columna('registros_auditoria', 'entity_id', 'id_entidad');
select public._renombrar_columna('registros_auditoria', 'details', 'detalles');
select public._renombrar_columna('registros_auditoria', 'created_at', 'creado_en');

drop function public._renombrar_columna(text, text, text);
drop function public._renombrar_tabla(text, text);

-- El acceso a datos se realiza exclusivamente desde rutas del servidor con sesión validada.
do $$
declare politica record;
begin
  for politica in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('productos', 'ventas', 'configuracion_negocio', 'registros_auditoria')
  loop
    execute format('drop policy if exists %I on %I.%I', politica.policyname, politica.schemaname, politica.tablename);
  end loop;
end;
$$;

revoke all on table public.productos, public.ventas, public.configuracion_negocio, public.registros_auditoria from anon, authenticated;
alter table public.productos enable row level security;
alter table public.ventas enable row level security;
alter table public.configuracion_negocio enable row level security;
alter table public.registros_auditoria enable row level security;

drop function if exists public.is_admin();
drop function if exists public.es_administrador();

drop trigger if exists set_products_updated_at on public.productos;
drop trigger if exists establecer_productos_actualizado_en on public.productos;
drop trigger if exists set_business_settings_updated_at on public.configuracion_negocio;
drop trigger if exists establecer_configuracion_actualizado_en on public.configuracion_negocio;
drop function if exists public.set_updated_at();
drop function if exists public.establecer_actualizado_en();

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

create trigger establecer_productos_actualizado_en
before update on public.productos
for each row execute function public.establecer_actualizado_en();

create trigger establecer_configuracion_actualizado_en
before update on public.configuracion_negocio
for each row execute function public.establecer_actualizado_en();

notify pgrst, 'reload schema';

commit;
