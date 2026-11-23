-- Desactiva definitivamente la creación de pedidos desde la interfaz pública.
-- Conserva las tablas y registros históricos para consulta administrativa.
begin;

drop function if exists public.create_public_order(text, integer, text, integer);
drop function if exists public.crear_pedido_publico(text, integer, text, integer);

commit;
