-- Acelera los filtros temporales del Dashboard administrativo.
create index if not exists ventas_fecha_venta_idx
  on public.ventas (fecha_venta);
