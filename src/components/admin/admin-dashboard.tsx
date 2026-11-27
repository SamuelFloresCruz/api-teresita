"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice, type Product } from "@/data/products";
import { AdminPageHeader } from "./admin-page-header";

type PeriodType = "week" | "month" | "range" | "year";
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
  title: string;
};

const chartColors = ["#6b2d5c", "#c47a31", "#698348", "#3f6f82", "#a44949", "#795a9d", "#9a7c35", "#4d7e73", "#bd526e", "#5374b8", "#8e633f", "#aa6f9e", "#4d897f", "#d08a51", "#626b9c", "#8d8b43", "#b6533f"];

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

function shortenChartLabel(value: string, selectedCount: number) {
  const maximum = selectedCount > 12 ? 8 : selectedCount > 8 ? 11 : selectedCount > 5 ? 14 : 19;
  return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
}

function buildPeriod(type: PeriodType, week: string, month: string, rangeStart: string, rangeEnd: string, year: string): Period | null {
  const offset = "T00:00:00-04:00";
  if (type === "week") {
    const bounds = weekBounds(week);
    if (!bounds) return null;
    return { startIso: `${bounds.start}${offset}`, endIso: `${bounds.end}${offset}`, title: `Semana ${week.slice(-2)} de ${week.slice(0, 4)}` };
  }
  if (type === "month" && /^\d{4}-\d{2}$/.test(month)) {
    const end = shiftMonth(month, 1);
    return { startIso: `${month}-01${offset}`, endIso: `${end}-01${offset}`, title: new Intl.DateTimeFormat("es-BO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`)) };
  }
  if (type === "range" && /^\d{4}-\d{2}$/.test(rangeStart) && /^\d{4}-\d{2}$/.test(rangeEnd) && rangeStart <= rangeEnd) {
    const end = shiftMonth(rangeEnd, 1);
    return { startIso: `${rangeStart}-01${offset}`, endIso: `${end}-01${offset}`, title: `${rangeStart} a ${rangeEnd}` };
  }
  if (type === "year" && /^\d{4}$/.test(year)) {
    const nextYear = String(Number(year) + 1);
    return { startIso: `${year}-01-01${offset}`, endIso: `${nextYear}-01-01${offset}`, title: `Año ${year}` };
  }
  return null;
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
  const productColorById = useMemo(() => new Map(products.map((product, index) => [product.id, chartColors[index % chartColors.length]])), [products]);
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
  const donutSegments = useMemo(() => {
    const percent = selectedProductIds.length > 0 ? 100 / selectedProductIds.length : 0;
    return totalsByProduct.map((item, index) => {
      const offset = index * percent;
      const middleAngle = -90 + (offset + percent / 2) * 3.6;
      const radians = middleAngle * Math.PI / 180;
      const rotation = middleAngle + 90 > 90 && middleAngle + 90 < 270 ? middleAngle + 270 : middleAngle + 90;
      return {
        ...item,
        color: productColorById.get(item.id) ?? chartColors[index % chartColors.length],
        percent,
        dash: Math.min(100, percent + .18),
        offset,
        label: shortenChartLabel(item.name, selectedProductIds.length),
        labelX: 210 + Math.cos(radians) * 158,
        labelY: 210 + Math.sin(radians) * 158,
        labelRotation: rotation,
      };
    });
  }, [productColorById, selectedProductIds.length, totalsByProduct]);

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
      </section>

      <section className="admin-stats admin-stats--three dashboard-stats" aria-label="Resumen del periodo">
        <article className="admin-stat admin-stat--purple"><span>Unidades vendidas</span><strong>{totalUnits}</strong><small>{selectedProductIds.length} productos comparados</small><i>UV</i></article>
        <article><span>Ventas registradas</span><strong>{totalSales}</strong><small>Tickets que incluyen la selección</small><i>VE</i></article>
        <article><span>Ingresos de la selección</span><strong>{formatPrice(totalIncome)}</strong><small>Solo productos filtrados</small><i>IN</i></article>
      </section>

      <section className="dashboard-chart-card admin-card">
        <header><div><p>Visualización circular</p><h2>Productos seleccionados y unidades vendidas</h2></div><span>{loadingReport ? "Actualizando…" : period?.title}</span></header>
        {error && <p className="admin-inline-error dashboard-chart__error" role="alert">{error}</p>}
        <div className="dashboard-chart-products">
          <div className="dashboard-products__header">
            <div><strong>Seleccionar productos</strong><small>Cada producto añade un nuevo espacio de color al círculo.</small></div>
            <div>
              <button type="button" disabled={loadingProducts || selectedProductIds.length === products.length} onClick={() => setSelectedProductIds(products.map((product) => product.id))}>Seleccionar todo</button>
              <button type="button" disabled={!selectedProductIds.length} onClick={() => setSelectedProductIds([])}>Limpiar selección</button>
            </div>
          </div>
          <div className="dashboard-products" aria-label="Productos incluidos">
            {loadingProducts ? <p>Cargando productos…</p> : products.map((product) => {
              const selected = selectedProductIds.includes(product.id);
              const color = productColorById.get(product.id) ?? chartColors[0];
              return <label className={selected ? "is-selected" : undefined} key={product.id}>
                <input type="checkbox" checked={selected} onChange={() => toggleProduct(product.id)} />
                <i className="dashboard-product-color" style={{ backgroundColor: color }} />
                <span>{product.name}</span>
                <small>{formatPrice(product.price)}</small>
              </label>;
            })}
          </div>
        </div>
        <div className={`dashboard-chart${loadingReport ? " is-loading" : ""}`}>
            <div className="dashboard-donut">
              <div className="dashboard-donut__visual">
                <svg viewBox="0 0 420 420" role="img" aria-label={`Gráfica circular de unidades vendidas, ${period?.title ?? "periodo seleccionado"}`}>
                  <defs>
                    <filter id="dashboard-donut-shadow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="13" stdDeviation="13" floodColor="#321527" floodOpacity=".22" />
                    </filter>
                  </defs>
                  <circle className="dashboard-donut__shadow" cx="210" cy="210" r="158" />
                  <circle className="dashboard-donut__track" cx="210" cy="210" r="158" pathLength="100" />
                  {donutSegments.map((item) => (
                    <circle
                      className="dashboard-donut__segment"
                      cx="210"
                      cy="210"
                      r="158"
                      pathLength="100"
                      fill="none"
                      stroke={item.color}
                      strokeDasharray={`${item.dash} ${100 - item.dash}`}
                      strokeDashoffset={-item.offset}
                      key={item.id}
                    >
                      <title>{`${item.name}: ${item.percent.toFixed(1)} %`}</title>
                    </circle>
                  ))}
                  {donutSegments.map((item) => (
                    <g className="dashboard-donut__segment-copy" transform={`translate(${item.labelX} ${item.labelY}) rotate(${item.labelRotation})`} key={`label-${item.id}`}>
                      <text textAnchor="middle" y="-3">{item.label}</text>
                      <text className="dashboard-donut__segment-percent" textAnchor="middle" y="13">{item.percent.toFixed(Number.isInteger(item.percent) ? 0 : 1)}%</text>
                    </g>
                  ))}
                  <circle className="dashboard-donut__center" cx="210" cy="210" r="118" fill="#fff" />
                  <text className="dashboard-donut__center-label" x="210" y="182" textAnchor="middle">TOTAL DE PRODUCTOS</text>
                  <text className="dashboard-donut__center-value" x="210" y="235" textAnchor="middle">{totalUnits}</text>
                  <text className="dashboard-donut__center-unit" x="210" y="261" textAnchor="middle">VENDIDOS</text>
                </svg>
              </div>
              <div className="dashboard-ranking dashboard-ranking--side">
                <div className="dashboard-ranking__head"><span>Producto</span><span>Ventas</span><span>Unidades</span></div>
                {totalsByProduct.length ? totalsByProduct.map((item) => <div key={item.id}><span><i style={{ backgroundColor: productColorById.get(item.id) ?? chartColors[0] }} />{item.name}</span><span>{item.sales}</span><strong>{item.units}</strong></div>) : <div className="dashboard-ranking__empty"><span>Selecciona productos para ver el detalle.</span></div>}
              </div>
            </div>
        </div>
        {!!selectedProductIds.length && !loadingReport && rows.length === 0 && <p className="dashboard-chart__notice">Los productos seleccionados todavía no tienen ventas en este periodo, pero conservan su espacio en el círculo.</p>}
      </section>
    </>
  );
}
