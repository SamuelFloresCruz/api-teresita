"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice, type Product } from "@/data/products";
import { AdminPageHeader } from "./admin-page-header";

type PeriodType = "week" | "month" | "range" | "year";
type Granularity = "day" | "month";
type DashboardRow = {
  venta_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  subtotal: number;
  fecha_venta: string;
};
type Period = {
  startIso: string;
  endIso: string;
  startKey: string;
  endKey: string;
  granularity: Granularity;
  title: string;
};

const chartColors = ["#6b2d5c", "#c47a31", "#698348", "#3f6f82", "#a44949", "#795a9d", "#9a7c35", "#4d7e73", "#bd526e", "#5374b8", "#8e633f", "#aa6f9e", "#4d897f", "#d08a51", "#626b9c", "#8d8b43", "#b6533f"];
const chartWidth = 960;
const chartHeight = 350;
const chartMargin = { top: 24, right: 26, bottom: 54, left: 58 };
const boliviaTimeZone = "America/La_Paz";
const localDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: boliviaTimeZone, year: "numeric", month: "2-digit", day: "2-digit" });

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function currentMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function currentWeekValue(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${pad(week)}`;
}

function shiftMonth(value: string, amount: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

function shiftDay(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function weekBounds(value: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const weekday = januaryFourth.getUTCDay() || 7;
  januaryFourth.setUTCDate(januaryFourth.getUTCDate() - weekday + 1 + (week - 1) * 7);
  const start = `${januaryFourth.getUTCFullYear()}-${pad(januaryFourth.getUTCMonth() + 1)}-${pad(januaryFourth.getUTCDate())}`;
  return { start, end: shiftDay(start, 7) };
}

function buildPeriod(type: PeriodType, week: string, month: string, rangeStart: string, rangeEnd: string, year: string): Period | null {
  const offset = "T00:00:00-04:00";
  if (type === "week") {
    const bounds = weekBounds(week);
    if (!bounds) return null;
    return { startIso: `${bounds.start}${offset}`, endIso: `${bounds.end}${offset}`, startKey: bounds.start, endKey: bounds.end, granularity: "day", title: `Semana ${week.slice(-2)} de ${week.slice(0, 4)}` };
  }
  if (type === "month" && /^\d{4}-\d{2}$/.test(month)) {
    const end = shiftMonth(month, 1);
    return { startIso: `${month}-01${offset}`, endIso: `${end}-01${offset}`, startKey: `${month}-01`, endKey: `${end}-01`, granularity: "day", title: new Intl.DateTimeFormat("es-BO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`)) };
  }
  if (type === "range" && /^\d{4}-\d{2}$/.test(rangeStart) && /^\d{4}-\d{2}$/.test(rangeEnd) && rangeStart <= rangeEnd) {
    const end = shiftMonth(rangeEnd, 1);
    return { startIso: `${rangeStart}-01${offset}`, endIso: `${end}-01${offset}`, startKey: rangeStart, endKey: end, granularity: "month", title: `${rangeStart} a ${rangeEnd}` };
  }
  if (type === "year" && /^\d{4}$/.test(year)) {
    const nextYear = String(Number(year) + 1);
    return { startIso: `${year}-01-01${offset}`, endIso: `${nextYear}-01-01${offset}`, startKey: `${year}-01`, endKey: `${nextYear}-01`, granularity: "month", title: `Año ${year}` };
  }
  return null;
}

function dateKey(iso: string, granularity: Granularity) {
  const parts = Object.fromEntries(localDateFormatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return granularity === "month" ? `${parts.year}-${parts.month}` : `${parts.year}-${parts.month}-${parts.day}`;
}

function buildBuckets(period: Period) {
  const buckets: { key: string; label: string }[] = [];
  if (period.granularity === "month") {
    for (let cursor = period.startKey; cursor < period.endKey; cursor = shiftMonth(cursor, 1)) {
      const date = new Date(`${cursor}-01T00:00:00Z`);
      buckets.push({ key: cursor, label: new Intl.DateTimeFormat("es-BO", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date).replace(" de ", " ") });
    }
    return buckets;
  }
  for (let cursor = period.startKey; cursor < period.endKey; cursor = shiftDay(cursor, 1)) {
    const date = new Date(`${cursor}T00:00:00Z`);
    buckets.push({ key: cursor, label: new Intl.DateTimeFormat("es-BO", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(date) });
  }
  return buckets;
}

export function AdminDashboard() {
  const now = new Date();
  const initialMonth = currentMonthValue(now);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [week, setWeek] = useState(currentWeekValue(now));
  const [month, setMonth] = useState(initialMonth);
  const [rangeStart, setRangeStart] = useState(shiftMonth(initialMonth, -2));
  const [rangeEnd, setRangeEnd] = useState(initialMonth);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  const period = useMemo(() => buildPeriod(periodType, week, month, rangeStart, rangeEnd, year), [month, periodType, rangeEnd, rangeStart, week, year]);
  const selectedKey = selectedProductIds.join(",");

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(async () => {
      try {
        const response = await fetch("/api/admin/products", { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { products?: Product[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los productos.");
        const availableProducts = payload.products ?? [];
        setProducts(availableProducts);
        setSelectedProductIds(availableProducts.slice(0, 3).map((product) => product.id));
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "No se pudieron cargar los productos.");
      } finally {
        if (!controller.signal.aborted) setLoadingProducts(false);
      }
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!period || !selectedKey) {
      queueMicrotask(() => { setRows([]); setLoadingReport(false); });
      return;
    }
    const controller = new AbortController();
    queueMicrotask(async () => {
      setLoadingReport(true);
      setError("");
      try {
        const search = new URLSearchParams({ desde: period.startIso, hasta: period.endIso, productos: selectedKey });
        const response = await fetch(`/api/admin/dashboard?${search}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { rows?: DashboardRow[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "No se pudo generar el reporte.");
        setRows(payload.rows ?? []);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "No se pudo generar el reporte.");
      } finally {
        if (!controller.signal.aborted) setLoadingReport(false);
      }
    });
    return () => controller.abort();
  }, [period, selectedKey]);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const chart = useMemo(() => {
    if (!period) return { buckets: [], series: [], maximum: 1 };
    const buckets = buildBuckets(period);
    const bucketIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));
    const series = selectedProductIds.map((productId, index) => ({
      productId,
      name: productById.get(productId)?.name ?? rows.find((row) => row.producto_id === productId)?.nombre_producto ?? productId,
      color: chartColors[index % chartColors.length],
      values: Array.from({ length: buckets.length }, () => 0),
    }));
    const seriesById = new Map(series.map((item) => [item.productId, item]));
    rows.forEach((row) => {
      const index = bucketIndex.get(dateKey(row.fecha_venta, period.granularity));
      const item = seriesById.get(row.producto_id);
      if (index !== undefined && item) item.values[index] += row.cantidad;
    });
    return { buckets, series, maximum: Math.max(1, ...series.flatMap((item) => item.values)) };
  }, [period, productById, rows, selectedProductIds]);

  const totalsByProduct = useMemo(() => selectedProductIds.map((productId) => {
    const productRows = rows.filter((row) => row.producto_id === productId);
    return {
      id: productId,
      name: productById.get(productId)?.name ?? productRows[0]?.nombre_producto ?? productId,
      units: productRows.reduce((sum, row) => sum + row.cantidad, 0),
      sales: new Set(productRows.map((row) => row.venta_id)).size,
    };
  }).sort((a, b) => b.units - a.units), [productById, rows, selectedProductIds]);

  const totalUnits = rows.reduce((sum, row) => sum + row.cantidad, 0);
  const totalIncome = rows.reduce((sum, row) => sum + row.subtotal, 0);
  const totalSales = new Set(rows.map((row) => row.venta_id)).size;
  const graphWidth = chartWidth - chartMargin.left - chartMargin.right;
  const graphHeight = chartHeight - chartMargin.top - chartMargin.bottom;

  function toggleProduct(productId: string) {
    setSelectedProductIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  }

  return (
    <>
      <AdminPageHeader eyebrow="Análisis de ventas" title="Dashboard" description="Compara la cantidad vendida de uno o varios productos en el periodo que elijas." />

      <section className="dashboard-filter admin-card" aria-label="Filtros del Dashboard">
        <div className="dashboard-filter__periods" role="group" aria-label="Tipo de periodo">
          {(["week", "month", "range", "year"] as PeriodType[]).map((type) => <button type="button" className={periodType === type ? "is-active" : undefined} onClick={() => setPeriodType(type)} key={type}>{type === "week" ? "Semana" : type === "month" ? "Mes" : type === "range" ? "Rango de meses" : "Año"}</button>)}
        </div>
        <div className="dashboard-filter__dates">
          {periodType === "week" && <label>Semana<input type="week" value={week} onChange={(event) => setWeek(event.target.value)} /></label>}
          {periodType === "month" && <label>Mes<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>}
          {periodType === "range" && <><label>Desde<input type="month" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} /></label><label>Hasta<input type="month" value={rangeEnd} min={rangeStart} onChange={(event) => setRangeEnd(event.target.value)} /></label></>}
          {periodType === "year" && <label>Año<input type="number" min="2020" max="2100" step="1" value={year} onChange={(event) => setYear(event.target.value)} /></label>}
          <div className="dashboard-filter__period-name"><span>Periodo</span><strong>{period?.title ?? "Revisa las fechas"}</strong></div>
        </div>
        <div className="dashboard-products__header"><div><strong>Productos</strong><small>Selecciona uno o varios para compararlos.</small></div><div><button type="button" onClick={() => setSelectedProductIds(products.map((product) => product.id))}>Todos</button><button type="button" onClick={() => setSelectedProductIds([])}>Limpiar</button></div></div>
        <div className="dashboard-products" aria-label="Productos incluidos">
          {loadingProducts ? <p>Cargando productos…</p> : products.map((product) => {
            const selected = selectedProductIds.includes(product.id);
            return <label className={selected ? "is-selected" : undefined} key={product.id}><input type="checkbox" checked={selected} onChange={() => toggleProduct(product.id)} /><span>{product.name}</span><small>{formatPrice(product.price)}</small></label>;
          })}
        </div>
      </section>

      <section className="admin-stats admin-stats--three dashboard-stats" aria-label="Resumen del periodo">
        <article className="admin-stat admin-stat--purple"><span>Unidades vendidas</span><strong>{totalUnits}</strong><small>{selectedProductIds.length} productos comparados</small><i>UV</i></article>
        <article><span>Ventas registradas</span><strong>{totalSales}</strong><small>Tickets que incluyen la selección</small><i>VE</i></article>
        <article><span>Ingresos de la selección</span><strong>{formatPrice(totalIncome)}</strong><small>Solo productos filtrados</small><i>IN</i></article>
      </section>

      <section className="dashboard-chart-card admin-card">
        <header><div><p>Evolución</p><h2>Cantidad vendida por producto</h2></div><span>{loadingReport ? "Actualizando…" : period?.title}</span></header>
        {error && <p className="admin-inline-error dashboard-chart__error" role="alert">{error}</p>}
        {!selectedProductIds.length ? <div className="dashboard-chart__empty"><strong>Selecciona al menos un producto</strong><span>La gráfica aparecerá aquí.</span></div> : !loadingReport && rows.length === 0 ? <div className="dashboard-chart__empty"><strong>No hay ventas en este periodo</strong><span>Prueba otro producto o cambia las fechas.</span></div> : (
          <div className={`dashboard-chart${loadingReport ? " is-loading" : ""}`}>
            <div className="dashboard-chart__legend">{chart.series.map((item) => <span key={item.productId}><i style={{ backgroundColor: item.color }} />{item.name}</span>)}</div>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Gráfica de unidades vendidas, ${period?.title ?? "periodo seleccionado"}`}>
              {[0, 1, 2, 3, 4].map((tick) => {
                const value = Math.round((chart.maximum / 4) * (4 - tick));
                const y = chartMargin.top + (graphHeight / 4) * tick;
                return <g key={tick}><line x1={chartMargin.left} y1={y} x2={chartWidth - chartMargin.right} y2={y} /><text x={chartMargin.left - 12} y={y + 4} textAnchor="end">{value}</text></g>;
              })}
              {chart.buckets.map((bucket, index) => {
                const divisor = Math.max(1, Math.ceil(chart.buckets.length / 8));
                if (index % divisor !== 0 && index !== chart.buckets.length - 1) return null;
                const x = chartMargin.left + (chart.buckets.length === 1 ? graphWidth / 2 : (index / (chart.buckets.length - 1)) * graphWidth);
                return <text className="dashboard-chart__x-label" x={x} y={chartHeight - 18} textAnchor="middle" key={bucket.key}>{bucket.label}</text>;
              })}
              {chart.series.map((item) => {
                const points = item.values.map((value, index) => {
                  const x = chartMargin.left + (item.values.length === 1 ? graphWidth / 2 : (index / (item.values.length - 1)) * graphWidth);
                  const y = chartMargin.top + graphHeight - (value / chart.maximum) * graphHeight;
                  return `${x},${y}`;
                }).join(" ");
                return <g key={item.productId}><polyline points={points} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{item.values.map((value, index) => {
                  const x = chartMargin.left + (item.values.length === 1 ? graphWidth / 2 : (index / (item.values.length - 1)) * graphWidth);
                  const y = chartMargin.top + graphHeight - (value / chart.maximum) * graphHeight;
                  return <circle cx={x} cy={y} r="4.5" fill={item.color} stroke="#fff" strokeWidth="2" key={`${item.productId}-${index}`}><title>{`${item.name}: ${value} unidades · ${chart.buckets[index]?.label}`}</title></circle>;
                })}</g>;
              })}
            </svg>
          </div>
        )}
        {!!totalsByProduct.length && <div className="dashboard-ranking"><div className="dashboard-ranking__head"><span>Producto</span><span>Ventas</span><span>Unidades</span></div>{totalsByProduct.map((item) => <div key={item.id}><span><i style={{ backgroundColor: chartColors[selectedProductIds.indexOf(item.id) % chartColors.length] }} />{item.name}</span><span>{item.sales}</span><strong>{item.units}</strong></div>)}</div>}
      </section>
    </>
  );
}
