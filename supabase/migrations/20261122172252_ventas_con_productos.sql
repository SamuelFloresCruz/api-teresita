-- Ventas manuales con múltiples productos y total calculado en PostgreSQL.

begin;

update public.ventas
set metodo_pago = 'Efectivo'
where metodo_pago not in ('Efectivo', 'QR');

alter table public.ventas drop constraint if exists sales_payment_method_check;
alter table public.ventas drop constraint if exists ventas_metodo_pago_check;
alter table public.ventas drop constraint if exists ventas_metodo_pago_valido;
alter table public.ventas
  add constraint ventas_metodo_pago_valido
  check (metodo_pago in ('Efectivo', 'QR'));

alter table public.ventas drop column if exists nombre_cliente;
alter table public.ventas drop column if exists detalle;

create table if not exists public.detalles_venta (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  producto_id text references public.productos(id) on delete set null,
  nombre_producto text not null,
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  cantidad integer not null check (cantidad between 1 and 999),
  subtotal numeric(12,2) generated always as (precio_unitario * cantidad) stored,
  creado_en timestamptz not null default now(),
  unique (venta_id, producto_id)
);

create index if not exists detalles_venta_venta_id_idx
  on public.detalles_venta (venta_id);

create index if not exists detalles_venta_producto_id_idx
  on public.detalles_venta (producto_id);

alter table public.detalles_venta enable row level security;
revoke all on table public.detalles_venta from anon, authenticated;
grant select, insert, update, delete on table public.detalles_venta to service_role;
grant select on table public.productos to service_role;
grant select, insert, update, delete on table public.ventas to service_role;

create or replace function public.guardar_venta(
  p_venta_id uuid,
  p_metodo_pago text,
  p_fecha_venta timestamptz,
  p_notas text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_venta_id uuid;
  v_total numeric(12,2);
  v_cantidad_productos integer;
begin
  if p_metodo_pago not in ('Efectivo', 'QR') then
    raise exception 'Método de pago no válido' using errcode = '22023';
  end if;

  if p_notas is not null and char_length(p_notas) > 1000 then
    raise exception 'Las notas son demasiado extensas' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'La venta debe incluir productos' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'La venta debe incluir entre 1 y 50 productos' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(producto_id text, cantidad integer)
    where item.producto_id is null
       or item.cantidad is null
       or item.cantidad < 1
       or item.cantidad > 999
  ) then
    raise exception 'Hay productos o cantidades no válidos' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(producto_id text, cantidad integer)
    group by item.producto_id
    having count(*) > 1
  ) then
    raise exception 'No se puede repetir un producto' using errcode = '22023';
  end if;

  select count(*)
  into v_cantidad_productos
  from public.productos as producto
  join jsonb_to_recordset(p_items) as item(producto_id text, cantidad integer)
    on item.producto_id = producto.id;

  if v_cantidad_productos <> jsonb_array_length(p_items) then
    raise exception 'Uno o más productos no existen' using errcode = '22023';
  end if;

  select sum(round(producto.precio * item.cantidad, 2))
  into v_total
  from public.productos as producto
  join jsonb_to_recordset(p_items) as item(producto_id text, cantidad integer)
    on item.producto_id = producto.id;

  if p_venta_id is null then
    insert into public.ventas (metodo_pago, total, fecha_venta, notas)
    values (p_metodo_pago, v_total, coalesce(p_fecha_venta, now()), coalesce(p_notas, ''))
    returning id into v_venta_id;
  else
    update public.ventas
    set metodo_pago = p_metodo_pago,
        total = v_total,
        fecha_venta = coalesce(p_fecha_venta, now()),
        notas = coalesce(p_notas, '')
    where id = p_venta_id
    returning id into v_venta_id;

    if v_venta_id is null then
      raise exception 'La venta no existe' using errcode = 'P0002';
    end if;

    delete from public.detalles_venta where venta_id = v_venta_id;
  end if;

  insert into public.detalles_venta (
    venta_id,
    producto_id,
    nombre_producto,
    precio_unitario,
    cantidad
  )
  select
    v_venta_id,
    producto.id,
    producto.nombre,
    producto.precio,
    item.cantidad
  from public.productos as producto
  join jsonb_to_recordset(p_items) as item(producto_id text, cantidad integer)
    on item.producto_id = producto.id;

  return v_venta_id;
end;
$$;

revoke all on function public.guardar_venta(uuid, text, timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.guardar_venta(uuid, text, timestamptz, text, jsonb) to service_role;

notify pgrst, 'reload schema';

commit;
