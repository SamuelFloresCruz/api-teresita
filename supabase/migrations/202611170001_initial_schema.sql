-- Api Teresita: esquema inicial, seguridad, pedidos y catálogo.
create extension if not exists pgcrypto;

create sequence if not exists public.order_number_seq start 1;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  category text not null check (category in ('Bebidas', 'Postres', 'Acompañamientos')),
  description text not null default '',
  short_description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  available boolean not null default true,
  active boolean not null default true,
  visual text not null default 'api' check (visual in ('api', 'tojori', 'chocolate', 'arroz', 'pastel', 'bunuelo')),
  tone text not null default 'purple' check (tone in ('purple', 'gold', 'cocoa', 'cream', 'amber')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('PED-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  table_number integer not null check (table_number between 1 and 999),
  status text not null default 'pending' check (status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  total numeric(10,2) not null default 0 check (total >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 50),
  subtotal numeric(10,2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Materia prima',
  unit text not null default 'unidad',
  current_stock numeric(12,3) not null default 0,
  minimum_stock numeric(12,3) not null default 0,
  cost_per_unit numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('entry', 'exit', 'adjustment')),
  quantity numeric(12,3) not null check (quantity > 0),
  reference text not null default '',
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  products text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique default ('COM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  supplier_id uuid references public.suppliers(id) on delete set null,
  total numeric(12,2) not null default 0 check (total >= 0),
  status text not null default 'pending' check (status in ('pending', 'received', 'cancelled')),
  purchased_at date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  description text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_cost numeric(10,2) not null check (unit_cost >= 0),
  subtotal numeric(12,2) generated always as (quantity * unit_cost) stored
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique default ('VEN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_name text not null default 'Cliente de mesa',
  payment_method text not null default 'Efectivo' check (payment_method in ('Efectivo', 'QR', 'Tarjeta', 'Otro')),
  total numeric(12,2) not null default 0 check (total >= 0),
  sold_at timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  product_id text not null unique references public.products(id) on delete cascade,
  yield_quantity numeric(12,3) not null default 1 check (yield_quantity > 0),
  estimated_cost numeric(10,2) not null default 0 check (estimated_cost >= 0),
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  unique (recipe_id, inventory_item_id)
);

create table if not exists public.production_batches (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete restrict,
  planned_quantity integer not null default 0 check (planned_quantity >= 0),
  produced_quantity integer not null default 0 check (produced_quantity >= 0),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  production_date date not null default current_date,
  responsible_name text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Api Teresita',
  address text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  opening_hours text not null default '',
  map_url text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 5 and 200),
  subject text not null check (subject in ('consulta', 'productos', 'ubicacion', 'otro')),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'products', 'orders', 'inventory_items', 'suppliers',
    'purchases', 'recipes', 'production_batches', 'business_settings'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin' else 'staff' end
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of raw_app_meta_data, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.create_public_order(
  p_customer_name text,
  p_table_number integer,
  p_product_id text,
  p_quantity integer
)
returns table (order_id uuid, order_number text, total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_product public.products%rowtype;
  new_order public.orders%rowtype;
  clean_name text := btrim(p_customer_name);
begin
  if char_length(clean_name) < 2 or char_length(clean_name) > 100 then
    raise exception 'El nombre no es válido.' using errcode = '22023';
  end if;
  if p_table_number is null or p_table_number < 1 or p_table_number > 999 then
    raise exception 'El número de mesa no es válido.' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 50 then
    raise exception 'La cantidad no es válida.' using errcode = '22023';
  end if;

  select * into selected_product
  from public.products
  where id = p_product_id and active = true
  for share;

  if not found then
    raise exception 'El producto no existe.' using errcode = 'P0002';
  end if;
  if not selected_product.available then
    raise exception 'El producto no está disponible.' using errcode = 'P0001';
  end if;

  insert into public.orders (customer_name, table_number, total)
  values (clean_name, p_table_number, selected_product.price * p_quantity)
  returning * into new_order;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
  values (new_order.id, selected_product.id, selected_product.name, selected_product.price, p_quantity);

  return query select new_order.id, new_order.order_number, new_order.total;
end;
$$;

revoke all on function public.create_public_order(text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.create_public_order(text, integer, text, integer) to service_role;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.production_batches enable row level security;
alter table public.business_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.contact_messages enable row level security;

grant select on public.products, public.business_settings to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists "Public reads active products" on public.products;
create policy "Public reads active products" on public.products for select to anon, authenticated using (active = true);
drop policy if exists "Public reads business settings" on public.business_settings;
create policy "Public reads business settings" on public.business_settings for select to anon, authenticated using (true);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'products', 'orders', 'order_items', 'inventory_items',
    'inventory_movements', 'suppliers', 'purchases', 'purchase_items', 'sales',
    'recipes', 'recipe_items', 'production_batches', 'business_settings', 'audit_logs',
    'contact_messages'
  ] loop
    execute format('drop policy if exists "Admins manage %s" on public.%I', table_name, table_name);
    execute format(
      'create policy "Admins manage %s" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      table_name,
      table_name
    );
  end loop;
end;
$$;

insert into public.business_settings (id) values (true) on conflict (id) do nothing;

insert into public.products
  (id, name, category, description, short_description, price, visual, tone, display_order)
values
  ('api-tradicional', 'Api tradicional', 'Bebidas', 'Bebida caliente de maíz, disponible en mezcla morada o amarilla.', 'Mezclado, morado o amarillo.', 7, 'api', 'purple', 1),
  ('tojori', 'Tojorí', 'Bebidas', 'Bebida caliente tradicional preparada con maíz willkaparu sin leche.', 'Maíz willkaparu sin leche.', 7, 'tojori', 'gold', 2),
  ('tojori-con-leche', 'Tojorí con leche', 'Bebidas', 'Bebida caliente tradicional preparada con maíz willkaparu y leche.', 'Maíz willkaparu con leche.', 9, 'tojori', 'cream', 3),
  ('arroz-con-leche', 'Arroz con leche', 'Postres', 'Preparación dulce y cremosa elaborada con arroz, leche y especias.', 'Un clásico dulce de textura cremosa.', 18, 'arroz', 'cream', 4),
  ('chocolate-con-leche', 'Chocolate con leche', 'Bebidas', 'Barras de chocolate diluidas en leche caliente.', 'Chocolate tradicional diluido en leche.', 18, 'chocolate', 'cocoa', 5),
  ('cafe', 'Café', 'Bebidas', 'Café caliente preparado al momento.', 'Aromático y recién preparado.', 10, 'chocolate', 'cocoa', 6),
  ('cafe-con-leche', 'Café con leche', 'Bebidas', 'Café caliente combinado con leche.', 'Café suave y cremoso.', 15, 'chocolate', 'cream', 7),
  ('te-y-mates', 'Té y mates', 'Bebidas', 'Sobres de infusión a elección preparados en agua caliente.', 'Una infusión a elección.', 9, 'api', 'amber', 8),
  ('jugos-del-valle', 'Jugos del Valle', 'Bebidas', 'Jugo refrescante en sabores disponibles.', 'Una opción fresca para acompañar.', 15, 'api', 'gold', 9),
  ('refresco-de-mocochinchi', 'Refresco de mocochinchi', 'Bebidas', 'Refresco tradicional boliviano elaborado con durazno deshidratado.', 'Refrescante y lleno de tradición.', 8, 'api', 'amber', 10),
  ('pastel-de-queso', 'Pastel de queso', 'Acompañamientos', 'Fina masa horneada con relleno de queso.', 'Fina masa con queso.', 10, 'pastel', 'amber', 11),
  ('pastel-de-queso-y-jamon', 'Pastel de queso y jamón', 'Acompañamientos', 'Fina masa horneada con jamón y queso.', 'Fina masa con jamón y queso.', 12, 'pastel', 'cocoa', 12),
  ('bunuelos', 'Buñuelos', 'Acompañamientos', 'Masa dulce con anís, frita hasta quedar dorada.', 'Masa dulce con anís.', 2, 'bunuelo', 'gold', 13),
  ('tawa-tawa', 'Tawa Tawa', 'Acompañamientos', 'Masa tradicional frita.', 'Una masa tradicional para compartir.', 2, 'bunuelo', 'amber', 14),
  ('gordita-de-queso', 'Gordita de queso', 'Acompañamientos', 'Pastel pequeño con relleno extra de queso.', 'Pequeña, suave y con extra queso.', 10, 'pastel', 'cream', 15),
  ('gordita-de-jamon', 'Gordita de jamón', 'Acompañamientos', 'Pastel pequeño con relleno extra de jamón y queso.', 'Rellena de jamón y queso.', 10, 'pastel', 'cocoa', 16),
  ('gordita-de-guayaba', 'Gordita de guayaba', 'Postres', 'Pastel pequeño con relleno extra de guayaba.', 'Dulce relleno de guayaba.', 12, 'pastel', 'purple', 17)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  short_description = excluded.short_description,
  price = excluded.price,
  visual = excluded.visual,
  tone = excluded.tone,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.inventory_items (name, category, unit, current_stock, minimum_stock, cost_per_unit)
select * from (values
  ('Maíz morado', 'Materia prima', 'kg', 12::numeric, 5::numeric, 0::numeric),
  ('Maíz willkaparu', 'Materia prima', 'kg', 8::numeric, 4::numeric, 0::numeric),
  ('Leche', 'Lácteos', 'litro', 8::numeric, 5::numeric, 0::numeric),
  ('Chocolate', 'Ingredientes', 'kg', 3::numeric, 2::numeric, 0::numeric),
  ('Arroz', 'Granos', 'kg', 10::numeric, 3::numeric, 0::numeric),
  ('Queso', 'Lácteos', 'kg', 5::numeric, 2::numeric, 0::numeric)
) as seed(name, category, unit, current_stock, minimum_stock, cost_per_unit)
where not exists (select 1 from public.inventory_items);
