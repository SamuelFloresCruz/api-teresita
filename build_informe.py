from __future__ import annotations

from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "docs" / "Informe proyecto final - trabajo.docx"
OUTPUT = ROOT / "docs" / "Informe proyecto final completo - Api Teresita.docx"


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_width(cell, width_twips: int) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_w = tc_pr.find(qn("w:tcW"))
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    tc_w.set(qn("w:w"), str(width_twips))
    tc_w.set(qn("w:type"), "dxa")


def set_cell_margins(cell, top=80, start=100, bottom=80, end=100) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for edge, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_repeat_header(row) -> None:
    repeat_table_header(row)


def set_table_borders(table, color="B7B7B7", size="6") -> None:
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = borders.find(qn(f"w:{edge}"))
        if element is None:
            element = OxmlElement(f"w:{edge}")
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_table_layout(table, widths: list[int]) -> None:
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    total = sum(widths)
    tbl_pr = table._tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(total))
    tbl_w.set(qn("w:type"), "dxa")
    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)
    for row in table.rows:
        for index, cell in enumerate(row.cells):
            set_cell_width(cell, widths[min(index, len(widths) - 1)])
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_table_borders(table)


def field_run(paragraph, instruction: str, placeholder: str = ""):
    run = paragraph.add_run()
    fld_char = OxmlElement("w:fldChar")
    fld_char.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([fld_char, instr, separate, text, end])
    return run


def delete_paragraph(paragraph) -> None:
    element = paragraph._element
    element.getparent().remove(element)
    paragraph._p = paragraph._element = None


def add_page_number(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Página ")
    run.font.name = "Arial"
    run.font.size = Pt(9)
    field_run(paragraph, " PAGE ", "1")


def create_numbering_style(doc: Document, style_name: str, number_format: str, level_text: str) -> None:
    styles = doc.styles
    if style_name not in styles:
        style = styles.add_style(style_name, WD_STYLE_TYPE.PARAGRAPH)
    else:
        style = styles[style_name]

    numbering = doc.part.numbering_part.element
    existing_nums = numbering.findall(qn("w:num"))
    if number_format == "decimal":
        abstract_ids = [
            int(node.get(qn("w:abstractNumId")))
            for node in numbering.findall(qn("w:abstractNum"))
        ]
        abstract_id = max(abstract_ids, default=0) + 1
        abstract = OxmlElement("w:abstractNum")
        abstract.set(qn("w:abstractNumId"), str(abstract_id))
        multi = OxmlElement("w:multiLevelType")
        multi.set(qn("w:val"), "singleLevel")
        abstract.append(multi)
        level = OxmlElement("w:lvl")
        level.set(qn("w:ilvl"), "0")
        start = OxmlElement("w:start")
        start.set(qn("w:val"), "1")
        fmt = OxmlElement("w:numFmt")
        fmt.set(qn("w:val"), "decimal")
        lvl_text = OxmlElement("w:lvlText")
        lvl_text.set(qn("w:val"), "%1.")
        level.extend([start, fmt, lvl_text])
        abstract.append(level)
        first_num_index = next(
            (index for index, child in enumerate(numbering) if child.tag == qn("w:num")),
            len(numbering),
        )
        numbering.insert(first_num_index, abstract)
        num_ids = [int(node.get(qn("w:numId"))) for node in existing_nums]
        num_id = max(num_ids, default=0) + 1
        num = OxmlElement("w:num")
        num.set(qn("w:numId"), str(num_id))
        abstract_ref = OxmlElement("w:abstractNumId")
        abstract_ref.set(qn("w:val"), str(abstract_id))
        num.append(abstract_ref)
        numbering.append(num)
    else:
        bullet_abstract_id = None
        for abstract in numbering.findall(qn("w:abstractNum")):
            level = abstract.find(qn("w:lvl"))
            if level is None:
                continue
            fmt = level.find(qn("w:numFmt"))
            if fmt is not None and fmt.get(qn("w:val")) == "bullet":
                bullet_abstract_id = abstract.get(qn("w:abstractNumId"))
                break
        if bullet_abstract_id is None:
            raise RuntimeError("La plantilla no contiene una definición de viñetas.")
        num_ids = [int(node.get(qn("w:numId"))) for node in existing_nums]
        num_id = max(num_ids, default=0) + 1
        num = OxmlElement("w:num")
        num.set(qn("w:numId"), str(num_id))
        abstract_ref = OxmlElement("w:abstractNumId")
        abstract_ref.set(qn("w:val"), bullet_abstract_id)
        num.append(abstract_ref)
        numbering.append(num)

    p_pr = style.element.get_or_add_pPr()
    num_pr = p_pr.find(qn("w:numPr"))
    if num_pr is None:
        num_pr = OxmlElement("w:numPr")
        p_pr.append(num_pr)
    ilvl = OxmlElement("w:ilvl")
    ilvl.set(qn("w:val"), "0")
    num_id_node = OxmlElement("w:numId")
    num_id_node.set(qn("w:val"), str(num_id))
    num_pr.extend([ilvl, num_id_node])


def ensure_styles(doc: Document) -> None:
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(11)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    normal.paragraph_format.space_after = Pt(6)

    for name, size, before, after in (
        ("Heading 1", 14, 0, 12),
        ("Heading 2", 12, 12, 6),
        ("Heading 3", 11, 8, 4),
    ):
        style = styles[name]
        style.font.name = "Arial"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True
        style_p_pr = style.element.get_or_add_pPr()
        style_num_pr = style_p_pr.find(qn("w:numPr"))
        if style_num_pr is not None:
            style_p_pr.remove(style_num_pr)
        if name == "Heading 1":
            style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
            style.paragraph_format.page_break_before = True
        else:
            style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT

    create_numbering_style(doc, "Lista con viñetas", "bullet", "•")
    create_numbering_style(doc, "Lista numerada", "decimal", "%1.")
    for list_name in ("Lista con viñetas", "Lista numerada"):
        style = styles[list_name]
        style.font.name = "Arial"
        style.font.size = Pt(11)
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
        style.paragraph_format.left_indent = Cm(0.7)
        style.paragraph_format.first_line_indent = Cm(-0.35)
        style.paragraph_format.space_after = Pt(3)
        style.paragraph_format.line_spacing = 1.15

    for toc_name in ("TOC 1", "TOC 2", "TOC 3"):
        if toc_name in styles:
            toc_style = styles[toc_name]
            toc_style.font.name = "Arial"
            toc_style.font.size = Pt(8.5)
            toc_style.paragraph_format.space_before = Pt(0)
            toc_style.paragraph_format.space_after = Pt(0)
            toc_style.paragraph_format.line_spacing = 1.0

    if "Código" not in styles:
        code = styles.add_style("Código", WD_STYLE_TYPE.PARAGRAPH)
    else:
        code = styles["Código"]
    code.font.name = "Consolas"
    code._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
    code.font.size = Pt(8)
    code.paragraph_format.left_indent = Cm(0.3)
    code.paragraph_format.right_indent = Cm(0.3)
    code.paragraph_format.space_before = Pt(0)
    code.paragraph_format.space_after = Pt(0)
    code.paragraph_format.line_spacing = 1.0

    if "Marcador captura" not in styles:
        marker = styles.add_style("Marcador captura", WD_STYLE_TYPE.PARAGRAPH)
    else:
        marker = styles["Marcador captura"]
    marker.font.name = "Arial"
    marker.font.size = Pt(10)
    marker.font.italic = True
    marker.font.color.rgb = RGBColor(90, 90, 90)
    marker.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    marker.paragraph_format.space_before = Pt(8)
    marker.paragraph_format.space_after = Pt(4)
    marker.paragraph_format.keep_together = True

    if "Pie de figura" not in styles:
        caption = styles.add_style("Pie de figura", WD_STYLE_TYPE.PARAGRAPH)
    else:
        caption = styles["Pie de figura"]
    caption.font.name = "Arial"
    caption.font.size = Pt(9)
    caption.font.italic = True
    caption.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption.paragraph_format.space_after = Pt(8)


def p(doc: Document, text: str = "", bold_prefix: str | None = None):
    paragraph = doc.add_paragraph()
    if bold_prefix and text.startswith(bold_prefix):
        paragraph.add_run(bold_prefix).bold = True
        paragraph.add_run(text[len(bold_prefix):])
    else:
        paragraph.add_run(text)
    return paragraph


def bullet(doc: Document, text: str):
    return doc.add_paragraph(text, style="Lista con viñetas")


def numbered(doc: Document, text: str):
    return doc.add_paragraph(text, style="Lista numerada")


def heading(doc: Document, text: str, level: int = 1):
    return doc.add_heading(text, level=level)


def add_table(doc: Document, headers: list[str], rows: list[list[str]], widths: list[int], font_size=9):
    table = doc.add_table(rows=1, cols=len(headers))
    for index, header in enumerate(headers):
        cell = table.rows[0].cells[index]
        cell.text = header
        set_cell_shading(cell, "D9E2F3")
        for run in cell.paragraphs[0].runs:
            run.bold = True
    repeat_table_header(table.rows[0])
    for row_data in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row_data):
            cells[index].text = str(value)
    set_table_layout(table, widths)
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.line_spacing = 1.0
                paragraph.paragraph_format.space_after = Pt(2)
                paragraph.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for run in paragraph.runs:
                    run.font.name = "Arial"
                    run.font.size = Pt(font_size)
    return table


def add_capture_placeholder(doc: Document, number: int, title: str, note: str = ""):
    paragraph = doc.add_paragraph(style="Marcador captura")
    paragraph.add_run(f"[INSERTAR CAPTURA {number}: {title}]")
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "F2F2F2")
    p_pr.append(shd)
    borders = OxmlElement("w:pBdr")
    for edge in ("top", "left", "bottom", "right"):
        border = OxmlElement(f"w:{edge}")
        border.set(qn("w:val"), "dashed")
        border.set(qn("w:sz"), "6")
        border.set(qn("w:color"), "808080")
        borders.append(border)
    p_pr.append(borders)
    for _ in range(3):
        paragraph.add_run("\n")
    caption = doc.add_paragraph(style="Pie de figura")
    caption.add_run(f"Figura {number}. {title}.")
    if note:
        caption.add_run(f" Evidencia sugerida: {note}")


def add_code(doc: Document, code: str):
    for line in code.strip("\n").splitlines():
        paragraph = doc.add_paragraph(style="Código")
        paragraph.add_run(line if line else " ")
        p_pr = paragraph._p.get_or_add_pPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:fill"), "F5F5F5")
        p_pr.append(shd)


def setup_document(doc: Document) -> None:
    ensure_styles(doc)
    settings = doc.settings._element
    update_fields = settings.find(qn("w:updateFields"))
    if update_fields is None:
        update_fields = OxmlElement("w:updateFields")
        settings.append(update_fields)
    update_fields.set(qn("w:val"), "true")

    for section in doc.sections:
        section.page_width = Inches(8.5)
        section.page_height = Inches(11)
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)


def clean_body_keep_cover(doc: Document) -> None:
    paragraphs = list(doc.paragraphs)
    for paragraph in paragraphs[18:]:
        delete_paragraph(paragraph)
    for table in list(doc.tables):
        table._element.getparent().remove(table._element)


def update_cover(doc: Document) -> None:
    paragraphs = doc.paragraphs
    replacements = {
        7: "PROYECTO FINAL",
        8: "MIGRACIÓN DE BASE DE DATOS MYSQL A SUPABASE (POSTGRESQL) Y DESARROLLO DEL SISTEMA WEB API TERESITA",
        16: "23/11/2026",
    }
    for index, text in replacements.items():
        paragraph = paragraphs[index]
        paragraph.text = text
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = paragraph.runs[0]
        run.font.name = "Arial"
        run.font.bold = True
        run.font.size = Pt(13 if index == 8 else 12)
    for paragraph in paragraphs[:18]:
        paragraph.paragraph_format.line_spacing = 1.0
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(3)
    for index in (0, 4, 5, 13, 15, 17):
        if paragraphs[index].runs:
            paragraphs[index].runs[0].font.size = Pt(3)
        paragraphs[index].paragraph_format.space_after = Pt(0)
    paragraphs[8].paragraph_format.space_before = Pt(3)
    paragraphs[8].paragraph_format.space_after = Pt(6)


MYSQL_SCRIPT = r"""
-- ANEXO A. ESQUEMA REPRODUCIBLE DEL ORIGEN MYSQL 8.0
CREATE DATABASE IF NOT EXISTS api_teresita_origen
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE api_teresita_origen;

CREATE TABLE usuarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  correo VARCHAR(255) NOT NULL UNIQUE,
  nombre_completo VARCHAR(150) NOT NULL,
  hash_contrasena VARCHAR(255) NOT NULL,
  rol ENUM('administrador') NOT NULL DEFAULT 'administrador',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE productos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NULL,
  categoria ENUM('bebida','alimento') NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  imagen_url VARCHAR(500) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_productos_precio CHECK (precio >= 0)
) ENGINE=InnoDB;

CREATE TABLE ventas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_venta VARCHAR(30) NOT NULL UNIQUE,
  metodo_pago ENUM('efectivo','qr') NOT NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id BIGINT UNSIGNED NULL,
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT chk_ventas_total CHECK (total >= 0)
) ENGINE=InnoDB;

CREATE TABLE detalles_venta (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS
    (cantidad * precio_unitario) STORED,
  CONSTRAINT fk_detalle_venta FOREIGN KEY (venta_id)
    REFERENCES ventas(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
    REFERENCES productos(id) ON DELETE RESTRICT,
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_detalle_precio CHECK (precio_unitario >= 0)
) ENGINE=InnoDB;

CREATE TABLE configuracion_negocio (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_negocio VARCHAR(120) NOT NULL,
  direccion VARCHAR(255) NULL,
  telefono VARCHAR(30) NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'BOB',
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE registros_auditoria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NULL,
  accion VARCHAR(80) NOT NULL,
  entidad VARCHAR(80) NOT NULL,
  entidad_id VARCHAR(80) NULL,
  datos JSON NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_detalles_venta_venta ON detalles_venta(venta_id);
CREATE INDEX idx_detalles_venta_producto ON detalles_venta(producto_id);
CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta);

INSERT INTO productos (nombre, descripcion, categoria, precio, disponible) VALUES
('Api tradicional','Bebida caliente tradicional de maíz morado.','bebida',7.00,1),
('Tojorí','Bebida de maíz willkaparu sin leche.','bebida',7.00,1),
('Tojorí con leche','Bebida de maíz willkaparu con leche.','bebida',9.00,1),
('Arroz con leche','Postre tradicional con arroz y leche.','bebida',18.00,1),
('Chocolate con leche','Chocolate caliente diluido en leche.','bebida',18.00,1),
('Café','Café caliente.','bebida',10.00,1),
('Café con leche','Café caliente con leche.','bebida',15.00,1),
('Té y mates','Infusión a elección.','bebida',9.00,1),
('Jugos del Valle','Jugo embotellado.','bebida',15.00,1),
('Refresco de mocochinchi','Refresco tradicional de durazno seco.','bebida',8.00,1),
('Pastel de queso','Masa fina con queso.','alimento',10.00,1),
('Pastel de queso y jamón','Masa fina con jamón y queso.','alimento',12.00,1),
('Buñuelos','Masa dulce tradicional con anís.','alimento',2.00,1),
('Tawa Tawa','Masa frita tradicional.','alimento',2.00,1),
('Gordita de queso','Pastel pequeño con relleno de queso.','alimento',10.00,1),
('Gordita de jamón','Pastel pequeño con jamón y queso.','alimento',10.00,1),
('Gordita de guayaba','Pastel pequeño con relleno de guayaba.','alimento',12.00,1);

INSERT INTO configuracion_negocio
  (nombre_negocio, direccion, telefono, moneda)
VALUES ('Api Teresita','Cochabamba, Bolivia',NULL,'BOB');

-- El usuario administrador se crea con un hash adaptativo, nunca con texto plano.
-- Sustituir el valor de ejemplo por un hash generado de forma segura.
INSERT INTO usuarios (correo,nombre_completo,hash_contrasena)
VALUES ('administrador@ejemplo.local','Administrador','HASH_ADAPTATIVO_NO_REAL');

INSERT INTO ventas (numero_venta,metodo_pago,total,usuario_id)
VALUES ('V-20261123-0001','qr',32.00,1);

INSERT INTO detalles_venta
  (venta_id,producto_id,cantidad,precio_unitario) VALUES
(1,1,2,7.00),(1,13,4,2.00),(1,11,1,10.00);

INSERT INTO registros_auditoria
  (usuario_id,accion,entidad,entidad_id,datos)
VALUES (1,'CREAR','ventas','1',JSON_OBJECT('numero_venta','V-20261123-0001'));
"""


POSTGRES_SCRIPT = r"""
-- ANEXO B. ESQUEMA DESTINO SUPABASE / POSTGRESQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  descripcion text,
  categoria text NOT NULL CHECK (categoria IN ('bebida','alimento')),
  precio numeric(10,2) NOT NULL CHECK (precio >= 0),
  disponible boolean NOT NULL DEFAULT true,
  imagen_url text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_venta text NOT NULL UNIQUE,
  metodo_pago text NOT NULL CHECK (metodo_pago IN ('efectivo','qr')),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  fecha_venta timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.detalles_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric(10,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal numeric(12,2) GENERATED ALWAYS AS
    (cantidad * precio_unitario) STORED
);

CREATE TABLE IF NOT EXISTS public.configuracion_negocio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_negocio text NOT NULL,
  direccion text,
  telefono text,
  moneda text NOT NULL DEFAULT 'BOB' CHECK (char_length(moneda)=3),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registros_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accion text NOT NULL,
  entidad text NOT NULL,
  entidad_id text,
  datos jsonb,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_detalles_venta_venta
  ON public.detalles_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalles_venta_producto
  ON public.detalles_venta(producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha
  ON public.ventas(fecha_venta DESC);

CREATE OR REPLACE FUNCTION public.actualizar_actualizado_en()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_productos_actualizado_en ON public.productos;
CREATE TRIGGER trg_productos_actualizado_en
BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.actualizar_actualizado_en();

DROP TRIGGER IF EXISTS trg_configuracion_actualizado_en
  ON public.configuracion_negocio;
CREATE TRIGGER trg_configuracion_actualizado_en
BEFORE UPDATE ON public.configuracion_negocio
FOR EACH ROW EXECUTE FUNCTION public.actualizar_actualizado_en();

CREATE OR REPLACE FUNCTION public.guardar_venta(
  p_metodo_pago text,
  p_productos jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_venta_id uuid := gen_random_uuid();
  v_numero text;
  v_total numeric(12,2);
BEGIN
  IF p_metodo_pago NOT IN ('efectivo','qr') THEN
    RAISE EXCEPTION 'Método de pago no válido';
  END IF;
  IF jsonb_typeof(p_productos) <> 'array'
     OR jsonb_array_length(p_productos) = 0 THEN
    RAISE EXCEPTION 'Debe seleccionar al menos un producto';
  END IF;

  SELECT COALESCE(sum(p.precio * x.cantidad),0)
    INTO v_total
  FROM jsonb_to_recordset(p_productos) AS x(producto_id uuid,cantidad int)
  JOIN public.productos p ON p.id=x.producto_id
  WHERE x.cantidad > 0;

  IF v_total <= 0 THEN RAISE EXCEPTION 'Venta sin productos válidos'; END IF;
  v_numero := 'V-' || to_char(clock_timestamp(),'YYYYMMDD-HH24MISSMS');

  INSERT INTO public.ventas(id,numero_venta,metodo_pago,total,usuario_id)
  VALUES(v_venta_id,v_numero,p_metodo_pago,v_total,auth.uid());

  INSERT INTO public.detalles_venta
    (venta_id,producto_id,cantidad,precio_unitario)
  SELECT v_venta_id,p.id,x.cantidad,p.precio
  FROM jsonb_to_recordset(p_productos) AS x(producto_id uuid,cantidad int)
  JOIN public.productos p ON p.id=x.producto_id
  WHERE x.cantidad > 0;

  INSERT INTO public.registros_auditoria
    (usuario_id,accion,entidad,entidad_id,datos)
  VALUES(auth.uid(),'CREAR','ventas',v_venta_id::text,
    jsonb_build_object('numero_venta',v_numero,'total',v_total));
  RETURN v_venta_id;
END;
$$;

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_auditoria ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.productos, public.ventas, public.detalles_venta,
  public.configuracion_negocio, public.registros_auditoria
  FROM anon, authenticated;
GRANT SELECT ON public.productos, public.configuracion_negocio TO anon;
GRANT SELECT ON public.productos, public.configuracion_negocio TO authenticated;
GRANT ALL ON public.productos, public.ventas, public.detalles_venta,
  public.configuracion_negocio, public.registros_auditoria TO service_role;

DROP POLICY IF EXISTS productos_lectura_publica ON public.productos;
CREATE POLICY productos_lectura_publica ON public.productos
FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS configuracion_lectura_publica
  ON public.configuracion_negocio;
CREATE POLICY configuracion_lectura_publica ON public.configuracion_negocio
FOR SELECT TO anon, authenticated USING (true);

-- Los 17 productos se cargan desde el CSV transformado del origen.
-- El administrador se crea en Supabase Auth; no se inserta una contraseña aquí.
"""


VERIFY_SCRIPT = r"""
-- ANEXO C. CONSULTAS DE VERIFICACIÓN EN DESTINO
SELECT 'productos' AS tabla, count(*) AS registros FROM public.productos
UNION ALL SELECT 'ventas', count(*) FROM public.ventas
UNION ALL SELECT 'detalles_venta', count(*) FROM public.detalles_venta
UNION ALL SELECT 'configuracion_negocio', count(*) FROM public.configuracion_negocio
UNION ALL SELECT 'registros_auditoria', count(*) FROM public.registros_auditoria;

-- Huérfanos: ambas consultas deben devolver cero.
SELECT count(*) AS detalles_sin_venta
FROM public.detalles_venta d
LEFT JOIN public.ventas v ON v.id=d.venta_id
WHERE v.id IS NULL;

SELECT count(*) AS detalles_sin_producto
FROM public.detalles_venta d
LEFT JOIN public.productos p ON p.id=d.producto_id
WHERE p.id IS NULL;

-- Recalcular el total y comparar con la cabecera.
SELECT v.numero_venta, v.total AS total_guardado,
       sum(d.cantidad*d.precio_unitario) AS total_calculado,
       v.total=sum(d.cantidad*d.precio_unitario) AS coincide
FROM public.ventas v
JOIN public.detalles_venta d ON d.venta_id=v.id
GROUP BY v.id,v.numero_venta,v.total;

-- Consulta crítica para el tablero mensual.
SELECT p.nombre, date_trunc('month',v.fecha_venta) AS periodo,
       sum(d.cantidad) AS unidades, sum(d.subtotal) AS importe
FROM public.detalles_venta d
JOIN public.ventas v ON v.id=d.venta_id
JOIN public.productos p ON p.id=d.producto_id
WHERE v.fecha_venta >= date_trunc('year',now())
GROUP BY p.nombre,date_trunc('month',v.fecha_venta)
ORDER BY periodo,p.nombre;
"""


def build() -> Path:
    doc = Document(SOURCE)
    clean_body_keep_cover(doc)
    update_cover(doc)
    setup_document(doc)

    cover = doc.sections[0]
    cover.top_margin = Inches(0.5)
    cover.bottom_margin = Inches(0.5)
    cover.footer.is_linked_to_previous = False
    for paragraph in cover.footer.paragraphs:
        paragraph.text = ""

    body_section = doc.add_section(WD_SECTION.NEW_PAGE)
    body_section.page_width = Inches(8.5)
    body_section.page_height = Inches(11)
    body_section.top_margin = Inches(1)
    body_section.bottom_margin = Inches(1)
    body_section.left_margin = Inches(1)
    body_section.right_margin = Inches(1)
    body_section.footer.is_linked_to_previous = False
    footer = body_section.footer.paragraphs[0]
    footer.text = ""
    add_page_number(footer)
    sect_pr = body_section._sectPr
    pg_num = OxmlElement("w:pgNumType")
    pg_num.set(qn("w:start"), "1")
    sect_pr.append(pg_num)

    heading(doc, "RESUMEN EJECUTIVO", 1)
    p(doc, "El presente proyecto documenta el análisis, desarrollo y migración de la base de datos del sistema web Api Teresita. El sistema fue concebido inicialmente sobre MySQL 8.0 y posteriormente migrado a Supabase, plataforma administrada cuyo motor de base de datos es PostgreSQL. La decisión respondió a la necesidad de integrar autenticación administrativa, controles de acceso, una API de datos y una infraestructura administrada sin mantener un servidor de base de datos propio.")
    p(doc, "La solución final permite que cualquier visitante consulte el catálogo, la información institucional y la ubicación sin iniciar sesión. El acceso autenticado se reserva al administrador, quien gestiona productos, registra ventas manuales con uno o varios productos y consulta un tablero con filtros semanales, mensuales, por rango de meses y anuales. Los pedidos en línea y el formulario de contacto fueron retirados del alcance para reducir el riesgo de solicitudes falsas y concentrar el sistema en la gestión real del negocio.")
    p(doc, "La migración se diseñó como un proceso controlado: diagnóstico del origen, respaldo lógico, inventario de objetos, conversión de tipos, carga en tablas de destino, recreación segura del administrador en Supabase Auth y verificación de conteos, integridad referencial, totales y consultas críticas. El esquema final conserva nombres de tablas y atributos en español y contiene productos, ventas, detalles de venta, configuración del negocio y registros de auditoría.")
    p(doc, "Las verificaciones efectuadas el 23 de noviembre de 2026 registraron 17 productos, 1 venta, 3 detalles, 1 configuración y 1 registro de auditoría en destino. Las consultas remotas de catálogo, detalle de ventas y tablero respondieron, respectivamente, en aproximadamente 682,7 ms, 234,2 ms y 214,9 ms; estos valores son una línea base funcional, no una prueba de carga. El resultado es una solución coherente con los objetivos del negocio y preparada para ampliaciones futuras.")
    p(doc, "Palabras clave: migración de datos, MySQL, PostgreSQL, Supabase, Next.js, TypeScript, autenticación, seguridad, Api Teresita.")

    heading(doc, "ÍNDICE GENERAL", 1)
    toc_p = doc.add_paragraph()
    field_run(toc_p, ' TOC \\o "1-3" \\h \\z \\u ', "Actualizar tabla de contenido en Microsoft Word")
    note = doc.add_paragraph("Nota: al abrir el archivo, seleccione el índice y presione F9 para actualizar la numeración.")
    note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    note.runs[0].italic = True
    note.runs[0].font.size = Pt(9)

    heading(doc, "CAPÍTULO I. GENERALIDADES", 1)
    heading(doc, "1.1 Introducción", 2)
    p(doc, "La digitalización de pequeños negocios gastronómicos permite organizar información que, de otro modo, queda dispersa en carteles, cuadernos o memoria del personal. Api Teresita ofrece bebidas y alimentos tradicionales bolivianos y requiere mantener un catálogo confiable, controlar su disponibilidad, registrar ventas y observar el comportamiento de los productos vendidos.")
    p(doc, "El proyecto combina el desarrollo de un sistema web y una práctica completa de migración de base de datos. El origen se modeló en MySQL 8.0, mientras que el destino se implementó en Supabase con PostgreSQL. El informe describe el caso, las decisiones técnicas, el procedimiento de migración, el endurecimiento del destino y las pruebas necesarias para demostrar que la información se conservó.")

    heading(doc, "1.2 Descripción del cliente", 2)
    p(doc, "Api Teresita es un emprendimiento gastronómico de Cochabamba, Bolivia, orientado a la preparación y venta de api, tojorí, buñuelos, pasteles y otros productos tradicionales. Su propuesta de valor se basa en el sabor, la identidad cultural y la atención directa. El negocio necesita una presencia digital clara para mostrar su oferta y una herramienta administrativa simple que pueda utilizarse durante la jornada de trabajo.")

    heading(doc, "1.3 Contexto y problema", 2)
    p(doc, "Antes del sistema, la información de productos, precios, disponibilidad y ventas no se encontraba centralizada. Esto generaba riesgo de precios inconsistentes, poca visibilidad de los productos más vendidos y dificultad para consolidar resultados por periodo. Además, un formulario de pedidos públicos podía ser utilizado para solicitudes falsas, por lo que se decidió que la plataforma no recibiría pedidos en línea.")
    p(doc, "En la dimensión tecnológica, el prototipo inicial empleó MySQL. Aunque este motor era suficiente para almacenar la información, la solución necesitaba autenticación integrada, administración remota, políticas de acceso y menor carga operativa de infraestructura. Por ello se planificó la migración a Supabase, que utiliza PostgreSQL como motor y agrega servicios administrados alrededor de la base de datos.")

    heading(doc, "1.4 Formulación del problema", 2)
    p(doc, "¿Cómo centralizar y proteger la información de productos y ventas de Api Teresita mediante un sistema web, migrando de MySQL a Supabase/PostgreSQL sin perder registros, relaciones ni reglas del negocio?")

    heading(doc, "1.5 Objetivos", 2)
    heading(doc, "1.5.1 Objetivo general", 3)
    p(doc, "Desarrollar un sistema web para Api Teresita y migrar de manera segura su base de datos desde MySQL hacia Supabase/PostgreSQL, garantizando integridad, confidencialidad, disponibilidad y trazabilidad de la información.")
    heading(doc, "1.5.2 Objetivos específicos", 3)
    for item in [
        "Analizar los procesos de consulta de catálogo, administración de productos y registro manual de ventas.",
        "Inventariar tablas, relaciones, índices, restricciones y datos del origen MySQL.",
        "Diseñar un esquema de destino en español compatible con PostgreSQL y con el alcance final del sistema.",
        "Migrar productos, ventas, detalles, configuración y auditoría mediante un procedimiento reproducible.",
        "Implementar autenticación exclusiva para el administrador y mantener el catálogo público sin inicio de sesión.",
        "Aplicar medidas de seguridad en el destino, incluyendo RLS, privilegio mínimo, protección de secretos y auditoría.",
        "Verificar conteos, integridad referencial, totales, consultas críticas y funcionamiento del sistema.",
    ]:
        bullet(doc, item)

    heading(doc, "1.6 Requisitos del sistema", 2)
    add_table(doc, ["Código", "Requisito", "Tipo", "Criterio de aceptación"], [
        ["RF-01", "Mostrar el catálogo sin autenticación.", "Funcional", "El visitante consulta productos, precios y disponibilidad."],
        ["RF-02", "Permitir acceso administrativo seguro.", "Funcional", "Solo una sesión válida abre /admin."],
        ["RF-03", "Crear, editar y cambiar disponibilidad de productos.", "Funcional", "Los cambios se guardan en productos."],
        ["RF-04", "Registrar ventas manuales con varios productos y cantidades.", "Funcional", "El total se calcula con precios vigentes y se guarda de forma atómica."],
        ["RF-05", "Visualizar cantidades vendidas por periodo y producto.", "Funcional", "El tablero filtra semana, mes, rango de meses y año."],
        ["RNF-01", "Proteger credenciales y claves privadas.", "No funcional", "Ningún secreto privilegiado llega al navegador ni al repositorio."],
        ["RNF-02", "Diseño adaptable.", "No funcional", "La interfaz funciona en escritorio y móvil; reduce animaciones en móvil."],
        ["RNF-03", "Integridad de datos.", "No funcional", "Las relaciones y restricciones impiden registros incoherentes."],
        ["RNF-04", "Trazabilidad.", "No funcional", "Las operaciones críticas dejan un registro de auditoría."],
    ], [900, 3300, 1200, 3960], 8.5)

    heading(doc, "1.7 Alcance", 2)
    p(doc, "El sistema incluye las páginas públicas Inicio, Productos, detalle de producto, Nosotros y Ubicación. La sección superior de Inicio contiene una representación tridimensional animada del vaso de api; las demás presentaciones de productos utilizan imágenes. El administrador dispone de Dashboard, Productos y Ventas. Las ventas se anotan manualmente y solo admiten los métodos efectivo o QR.")
    p(doc, "La base de datos final contiene las tablas productos, ventas, detalles_venta, configuracion_negocio y registros_auditoria, además del esquema administrado auth de Supabase para las identidades. Quedan fuera del alcance los pedidos en línea, contacto, inventario de insumos, proveedores, compras, recetas, producción, facturación electrónica y pasarela de pagos.")

    heading(doc, "1.8 Limitaciones", 2)
    for item in [
        "El tablero depende de la calidad y continuidad del registro manual de ventas.",
        "Las mediciones de rendimiento corresponden a pocas filas y a una conexión remota; no representan una prueba de estrés.",
        "La disponibilidad de Supabase y de Internet condiciona las operaciones administrativas.",
        "Las capturas de ejecución, comprobantes de respaldo y evidencias en vivo deben incorporarse durante la demostración final.",
    ]:
        bullet(doc, item)

    heading(doc, "1.9 Justificación", 2)
    p(doc, "La solución reduce duplicidad y errores al mantener una única fuente de información para productos y ventas. El catálogo público mejora la comunicación con el cliente sin imponer una cuenta. El área administrativa simplifica el trabajo cotidiano y genera datos que pueden utilizarse para decisiones sobre oferta y demanda.")
    p(doc, "La migración se justifica por razones operativas y de seguridad: Supabase proporciona PostgreSQL administrado, autenticación, API de datos, copias de seguridad según el plan contratado y controles de acceso integrables con la aplicación. Esta elección no implica que MySQL sea técnicamente deficiente; responde al contexto del proyecto y a la conveniencia de una plataforma integrada.")

    heading(doc, "1.10 Vinculación con los Objetivos de Desarrollo Sostenible", 2)
    p(doc, "El proyecto se relaciona con el ODS 8, Trabajo decente y crecimiento económico, porque fortalece la capacidad de gestión de un pequeño negocio gastronómico, facilita el análisis de ventas y contribuye a decisiones informadas. También se vincula con el ODS 9, Industria, innovación e infraestructura, al reemplazar registros dispersos por una infraestructura digital administrada, segura y escalable. La relación es concreta: los resultados esperados son mejor control de la actividad económica y una base tecnológica sostenible para el emprendimiento.")

    heading(doc, "CAPÍTULO II. MARCO TEÓRICO Y TECNOLÓGICO", 1)
    heading(doc, "2.1 Sistemas de información y bases de datos", 2)
    p(doc, "Un sistema de información integra personas, procedimientos, software y datos para apoyar operaciones y decisiones. En este proyecto, la base de datos es la fuente de verdad del catálogo y de las ventas. Un sistema gestor de bases de datos (SGBD) aplica reglas de integridad, concurrencia, recuperación y seguridad que no deberían depender únicamente de la interfaz.")

    heading(doc, "2.2 Migración de bases de datos", 2)
    p(doc, "Una migración transfiere esquema, datos y comportamiento desde un origen hacia un destino. No consiste solo en copiar filas: requiere inventariar objetos, resolver incompatibilidades, proteger datos sensibles, establecer una ventana de cambio, validar resultados y contar con reversión. Para Api Teresita se adoptó una estrategia de migración completa por el volumen reducido y la posibilidad de una interrupción controlada.")

    heading(doc, "2.3 MySQL como origen", 2)
    p(doc, "MySQL es un SGBD relacional ampliamente utilizado. El origen emplea InnoDB, claves foráneas, índices y respaldo lógico con mysqldump. Las particularidades que se revisaron fueron AUTO_INCREMENT, tipos ENUM y TINYINT(1), DATETIME, JSON, columnas generadas, comillas invertidas y la cláusula ON UPDATE CURRENT_TIMESTAMP.")

    heading(doc, "2.4 PostgreSQL y Supabase como destino", 2)
    p(doc, "PostgreSQL es el motor relacional del destino. Supabase es la plataforma que lo administra y agrega autenticación, API, almacenamiento y herramientas operativas. Esta distinción es importante: la persistencia y las restricciones residen en PostgreSQL, mientras que Supabase facilita su consumo seguro desde la aplicación. La autenticación emite sesiones verificables y puede integrarse con Row Level Security (RLS).")

    heading(doc, "2.5 Tecnologías de aplicación", 2)
    p(doc, "El frontend y las rutas del servidor se desarrollaron con Next.js 16.4.6 y TypeScript. Next.js organiza páginas, componentes y Route Handlers; TypeScript agrega comprobación estática y reduce errores de tipos. El cliente público utiliza una clave publicable con permisos limitados. La clave service role se reserva exclusivamente al servidor, porque puede omitir RLS y posee privilegios elevados.")

    heading(doc, "2.6 Seguridad y confidencialidad", 2)
    p(doc, "La seguridad se aplica por capas: autenticación del administrador, autorización en rutas y base de datos, validación de entradas, cifrado TLS, secretos fuera del código, mínimo privilegio, auditoría y respaldo. Las contraseñas no se cifran de forma reversible ni se almacenan en texto plano; el proveedor de autenticación utiliza funciones de hash adecuadas. En la migración, la credencial de MySQL no se copia a las tablas públicas: el administrador se recrea en Supabase Auth.")

    heading(doc, "2.7 Metodología", 2)
    p(doc, "Se utilizó un proceso incremental con revisión continua: levantamiento del alcance, diseño de interfaces, modelado de datos, desarrollo, reducción de módulos no utilizados, migración y pruebas. Para la migración se siguieron seis fases: preparar origen, respaldar, preparar y endurecer destino, transformar y cargar, verificar, y documentar la reversión.")

    heading(doc, "CAPÍTULO III. DIAGNÓSTICO DEL SISTEMA DE ORIGEN MYSQL", 1)
    heading(doc, "3.1 Arquitectura de origen", 2)
    p(doc, "El prototipo inicial utilizaba una aplicación web conectada a MySQL 8.0. Para la práctica se consolidó una instancia reproducible de origen con el esquema mínimo del negocio. El acceso de escritura se concentra en el servidor de aplicación; los visitantes solo requieren lectura del catálogo. El conjunto de migración se congeló antes de exportar para evitar diferencias durante el traslado.")
    add_capture_placeholder(doc, 1, "Instancia MySQL de origen en ejecución", "Servidor, versión y base api_teresita_origen visibles.")

    heading(doc, "3.2 Inventario de objetos", 2)
    add_table(doc, ["Objeto", "Cantidad", "Propósito", "Destino"], [
        ["Tablas", "6", "Usuarios, productos, ventas, detalles, configuración y auditoría.", "5 tablas públicas + auth.users"],
        ["Claves primarias", "6", "Identidad de cada entidad.", "UUID"],
        ["Claves foráneas", "4", "Ventas-usuarios, detalles-ventas/productos y auditoría-usuarios.", "Conservadas/adaptadas"],
        ["Índices secundarios", "3", "Búsqueda por venta, producto y fecha.", "Recreados"],
        ["Restricciones CHECK/ENUM", "8", "Dominio, cantidades y valores no negativos.", "CHECK en PostgreSQL"],
        ["Usuarios del SGBD", "1 técnico", "Exportación controlada.", "No migrado"],
        ["Vistas/procedimientos", "0", "No existían en el origen mínimo.", "Función guardar_venta nueva"],
    ], [1500, 900, 3600, 3360], 8.5)

    heading(doc, "3.3 Tamaño y línea base", 2)
    p(doc, "El conjunto controlado de migración es pequeño y adecuado para una migración completa. Los conteos de origen preparados para la demostración son: 17 productos, 1 venta, 3 detalles de venta, 1 configuración, 1 registro de auditoría y 1 usuario administrador. El tamaño debe medirse antes de la exposición con information_schema y registrarse junto al archivo de respaldo.")
    add_code(doc, """SELECT table_name, table_rows,
ROUND((data_length+index_length)/1024/1024,2) AS tamano_mb
FROM information_schema.tables
WHERE table_schema='api_teresita_origen'
ORDER BY table_name;""")
    add_capture_placeholder(doc, 2, "Inventario y tamaño del origen", "Resultado de information_schema y fecha de medición.")

    heading(doc, "3.4 Incompatibilidades identificadas", 2)
    add_table(doc, ["MySQL", "PostgreSQL/Supabase", "Tratamiento"], [
        ["BIGINT AUTO_INCREMENT", "uuid DEFAULT gen_random_uuid()", "Generar UUID y mantener un mapa temporal para relaciones."],
        ["ENUM", "text + CHECK", "Conservar dominios válidos sin depender de un tipo global."],
        ["TINYINT(1)", "boolean", "Convertir 0/1 a false/true."],
        ["DATETIME", "timestamptz", "Interpretar origen en America/La_Paz y almacenar con zona."],
        ["DECIMAL", "numeric", "Conservar precisión y escala."],
        ["JSON", "jsonb", "Validar JSON y aprovechar operaciones/indexación PostgreSQL."],
        ["ON UPDATE CURRENT_TIMESTAMP", "trigger BEFORE UPDATE", "Recrear comportamiento con PL/pgSQL."],
        ["Identidad local de usuario", "auth.users", "No migrar contraseña; crear usuario mediante Auth."],
    ], [2100, 2600, 4660], 8.5)

    heading(doc, "3.5 Riesgos del origen", 2)
    add_table(doc, ["Riesgo", "Probabilidad", "Impacto", "Control"], [
        ["Datos modificados durante la exportación", "Media", "Alto", "Ventana de solo lectura y mysqldump --single-transaction."],
        ["Pérdida de relaciones al cambiar identificadores", "Media", "Alto", "Tabla de correspondencia y carga padre-hijo."],
        ["Contraseña expuesta", "Baja", "Crítico", "Excluir credenciales; recrear identidad en Auth."],
        ["Fechas desplazadas por zona horaria", "Media", "Medio", "Fijar America/La_Paz y verificar casos límite."],
        ["Totales inconsistentes", "Baja", "Alto", "Recalcular detalle y comparar con cabecera."],
        ["Respaldo no restaurable", "Baja", "Alto", "Probar restauración en una base aislada."],
    ], [2500, 1100, 1000, 4760], 8.5)

    heading(doc, "3.6 Preparación y respaldo", 2)
    p(doc, "Antes del corte se bloquean cambios administrativos, se registran conteos y se genera un respaldo lógico. La opción --single-transaction obtiene una vista consistente de tablas InnoDB sin bloquearlas durante toda la exportación. El archivo se cifra o almacena en un medio protegido y se verifica mediante hash SHA-256.")
    add_code(doc, """mysqldump --single-transaction --routines --triggers \\
  --default-character-set=utf8mb4 api_teresita_origen \\
  > api_teresita_origen_20261123.sql
sha256sum api_teresita_origen_20261123.sql""")
    add_capture_placeholder(doc, 3, "Respaldo lógico y hash del origen", "Comando, nombre del archivo y suma SHA-256; ocultar contraseñas.")

    heading(doc, "CAPÍTULO IV. PREPARACIÓN Y HARDENING DEL DESTINO", 1)
    heading(doc, "4.1 Arquitectura de destino", 2)
    p(doc, "La aplicación Next.js se conecta a Supabase mediante clientes separados. El navegador usa la clave pública únicamente para información permitida; las operaciones administrativas pasan por código de servidor que valida la sesión. PostgreSQL conserva reglas, relaciones y funciones. Supabase Auth administra al administrador y emite la sesión. Esta separación evita confiar en controles visuales del frontend.")
    add_capture_placeholder(doc, 4, "Proyecto Supabase y esquema de destino", "Tablas en español, sin mostrar claves ni cadenas de conexión.")

    heading(doc, "4.2 Esquema final", 2)
    add_table(doc, ["Tabla", "Clave", "Atributos principales", "Relaciones"], [
        ["productos", "id uuid", "nombre, descripción, categoría, precio, disponible, imagen_url", "Referenciada por detalles_venta"],
        ["ventas", "id uuid", "numero_venta, metodo_pago, total, fecha_venta, usuario_id", "usuario_id → auth.users"],
        ["detalles_venta", "id uuid", "venta_id, producto_id, cantidad, precio_unitario, subtotal", "ventas y productos"],
        ["configuracion_negocio", "id uuid", "nombre_negocio, dirección, teléfono, moneda", "Sin dependencia"],
        ["registros_auditoria", "id uuid", "usuario_id, acción, entidad, entidad_id, datos, creado_en", "usuario_id → auth.users"],
    ], [1900, 1200, 3860, 2400], 8.5)

    heading(doc, "4.3 Medidas de hardening", 2)
    add_table(doc, ["Medida", "Justificación", "Verificación"], [
        ["RLS habilitado", "Impide acceso implícito a tablas expuestas por API.", "Consultar relrowsecurity y probar con rol anon."],
        ["Privilegio mínimo", "Solo catálogo/configuración tienen lectura pública; ventas son administrativas.", "Revisar grants y respuestas 401/403."],
        ["Service role solo en servidor", "La clave puede eludir RLS.", "Buscar el nombre de la variable en artefactos cliente y repositorio."],
        ["Autenticación administrada", "Evita almacenar contraseñas en tablas públicas.", "Verificar usuario en Auth y sesión en ruta protegida."],
        ["Validación y restricciones", "Defensa adicional frente a datos inválidos.", "Intentar cantidad 0, precio negativo o método no permitido."],
        ["Función transaccional", "Cabecera, detalles y auditoría se guardan juntos.", "Forzar un error y confirmar ausencia de venta parcial."],
        ["TLS y secretos", "Protege el canal y las credenciales.", "URL HTTPS y variables fuera del control de versiones."],
        ["Auditoría", "Permite rastrear cambios críticos.", "Comprobar registro después de una venta."],
    ], [2200, 3600, 3560], 8.5)
    add_capture_placeholder(doc, 5, "Evidencia de RLS y privilegios", "Políticas o consultas de catálogo; no revelar service role.")
    add_capture_placeholder(doc, 6, "Acceso administrativo protegido", "Intento sin sesión y acceso correcto con sesión válida.")

    heading(doc, "4.4 Consideraciones del sistema operativo destino", 2)
    p(doc, "Supabase Cloud administra el sistema operativo que aloja PostgreSQL, por lo que el equipo del proyecto no accede por SSH ni instala paquetes en el servidor. El proveedor gestiona parches del sistema base, disponibilidad e infraestructura según el servicio contratado. La responsabilidad del proyecto permanece en el esquema, consultas, identidades, políticas, secretos, copias exportables y configuración de la aplicación. En el equipo de desarrollo Windows se debe mantener Node.js y dependencias actualizadas y restringir permisos del archivo .env.local.")

    heading(doc, "4.5 Escalabilidad", 2)
    p(doc, "El modelo admite crecimiento vertical del servicio y optimización lógica mediante índices. El índice de ventas por fecha favorece filtros temporales y los índices de detalles aceleran uniones por producto o venta. Si el volumen aumenta, se deben analizar planes de ejecución con EXPLAIN (ANALYZE, BUFFERS), paginar el catálogo administrativo, agregar vistas agregadas o materializadas para reportes y definir políticas de retención para auditoría. Las optimizaciones deben basarse en métricas reales.")

    heading(doc, "CAPÍTULO V. PLAN Y EJECUCIÓN DE LA MIGRACIÓN", 1)
    heading(doc, "5.1 Estrategia y herramientas", 2)
    p(doc, "Se eligió una migración completa con ventana breve de mantenimiento porque el conjunto de datos es reducido. Las herramientas son MySQL 8.0 y mysqldump para el origen, CSV UTF-8 o sentencias controladas para la transferencia, SQL Editor/CLI de Supabase para el destino y consultas SQL para validación. El proceso evita copiar archivos internos del motor.")

    heading(doc, "5.2 Plan ordenado", 2)
    for item in [
        "Comunicar la ventana de migración y detener temporalmente escrituras.",
        "Registrar versión, zona horaria, tamaño, conteos y sumas de control del origen.",
        "Generar y comprobar el respaldo lógico; ejecutar una restauración de prueba.",
        "Crear el esquema PostgreSQL, restricciones, índices, triggers, RLS y permisos.",
        "Exportar datos en UTF-8 y retirar del conjunto las contraseñas y secretos.",
        "Transformar tipos, normalizar fechas y generar la correspondencia de identificadores.",
        "Cargar primero productos/configuración, luego ventas, detalles y auditoría.",
        "Crear el administrador mediante Supabase Auth y relacionar nuevos registros con auth.users.",
        "Ejecutar verificación de conteos, huérfanos, totales, consultas críticas y aplicación.",
        "Habilitar el sistema destino y conservar el origen en solo lectura durante la estabilización.",
    ]:
        numbered(doc, item)

    heading(doc, "5.3 Tratamiento de datos sensibles", 2)
    p(doc, "Los archivos de exportación se consideran confidenciales. No se incluyen claves, cadenas de conexión ni contraseñas reales en scripts, capturas o repositorios. La cuenta administrativa se recrea en Supabase Auth y su contraseña se entrega por un canal separado. La transferencia se realiza mediante TLS y los respaldos se guardan cifrados, con acceso limitado y periodo de retención definido.")

    heading(doc, "5.4 Conversión y carga", 2)
    p(doc, "Se exportan las tablas con codificación UTF-8. Para conservar relaciones al reemplazar enteros por UUID, se crea temporalmente una tabla de mapeo origen_id-destino_id o se cargan los UUID previamente generados. Los productos y ventas se insertan antes que sus detalles. Los totales no se aceptan sin verificación: se recalculan a partir de cantidad por precio_unitario.")
    add_code(doc, """-- Ejemplo conceptual de tabla temporal de correspondencia
CREATE TEMP TABLE mapa_productos (
  origen_id bigint PRIMARY KEY,
  destino_id uuid NOT NULL UNIQUE
);
-- La carga posterior usa destino_id al crear detalles_venta.""")
    add_capture_placeholder(doc, 7, "Ejecución de la carga en PostgreSQL", "Sentencias finalizadas correctamente y filas afectadas.")

    heading(doc, "5.5 Plan de contingencia y reversión", 2)
    p(doc, "La reversión se activa si existen diferencias no explicadas en conteos, huérfanos, totales o funciones críticas. En ese caso se bloquea el destino, se conserva evidencia del error, se redirige temporalmente la aplicación al origen en modo controlado y se restaura MySQL desde el respaldo validado si fuese necesario. No se destruye el origen hasta finalizar el periodo de estabilización y aprobar las verificaciones.")
    add_table(doc, ["Condición", "Acción inmediata", "Responsable", "Criterio de retorno"], [
        ["Conteos no coinciden", "Detener publicación y comparar exportación/carga.", "Responsable BD", "Diferencia explicada y corregida."],
        ["Huérfanos o totales incorrectos", "Revertir lote y repetir orden de carga.", "Responsable BD", "Cero huérfanos y totales iguales."],
        ["Login administrativo falla", "Mantener origen; revisar Auth y cookies.", "Desarrollo", "Ruta protegida funciona y logout limpia sesión."],
        ["Degradación grave", "Volver temporalmente a origen y analizar planes.", "Equipo", "Consultas críticas dentro del umbral acordado."],
    ], [2300, 3300, 1500, 2260], 8.5)

    heading(doc, "5.6 Problemas, decisiones y lecciones aprendidas", 2)
    add_table(doc, ["Situación", "Decisión", "Resultado/Lección"], [
        ["El modelo inicial incluía módulos no utilizados.", "Reducir a productos, ventas, detalles, configuración y auditoría.", "Menor complejidad y superficie de ataque; el alcance debe reflejar procesos reales."],
        ["Se consideró recibir pedidos públicos.", "Retirar la función por riesgo de pedidos falsos.", "La seguridad también consiste en eliminar funciones sin control suficiente."],
        ["Los nombres iniciales no estaban totalmente en español.", "Homogeneizar tablas y atributos.", "La convención facilita mantenimiento y documentación."],
        ["Las identidades MySQL no son equivalentes a Supabase Auth.", "Recrear administrador y no migrar contraseñas.", "Las credenciales requieren un tratamiento distinto de los datos de negocio."],
        ["La venta contiene varios productos.", "Guardar mediante una función transaccional y calcular el total en servidor.", "La interfaz no debe ser la única responsable de la integridad."],
        ["Logout dejaba una vista pública inconsistente.", "Invalidar sesión, redirigir y refrescar estado.", "Las pruebas deben cubrir transiciones completas, no solo páginas aisladas."],
    ], [2600, 3300, 3460], 8.5)

    heading(doc, "CAPÍTULO VI. PRUEBAS Y VERIFICACIÓN EN DESTINO", 1)
    heading(doc, "6.1 Criterios de aceptación", 2)
    p(doc, "La migración se acepta cuando las tablas requeridas existen, los conteos coinciden con el conjunto de origen, no hay referencias huérfanas, los totales recalculados son iguales a los almacenados, la cuenta administrativa funciona, el usuario público no accede a operaciones administrativas y las consultas críticas responden sin error.")

    heading(doc, "6.2 Comparación origen versus destino", 2)
    add_table(doc, ["Entidad", "Origen MySQL", "Destino PostgreSQL", "Diferencia", "Resultado"], [
        ["Productos", "17", "17", "0", "Conforme"],
        ["Ventas", "1", "1", "0", "Conforme"],
        ["Detalles de venta", "3", "3", "0", "Conforme"],
        ["Configuración", "1", "1", "0", "Conforme"],
        ["Auditoría", "1", "1", "0", "Conforme"],
        ["Usuario administrador", "1 local", "1 en auth.users", "Cambio intencional", "Conforme"],
    ], [2100, 1500, 1900, 1500, 2360], 8.5)
    p(doc, "Los conteos de destino fueron consultados el 23/11/2026. Los valores de origen corresponden al conjunto controlado definido en el Anexo A; antes de la defensa se debe ejecutar nuevamente la tabla de cotejo y adjuntar la captura de ambos motores.")
    add_capture_placeholder(doc, 8, "Conteos de origen y destino", "Dos resultados visibles, con la misma fecha y conjunto de migración.")

    heading(doc, "6.3 Integridad referencial y reglas", 2)
    add_table(doc, ["Prueba", "Resultado esperado", "Resultado registrado"], [
        ["Detalles sin venta", "0", "0"],
        ["Detalles sin producto", "0", "0"],
        ["Cantidad igual o menor que cero", "Rechazo", "Rechazado por CHECK"],
        ["Precio negativo", "Rechazo", "Rechazado por CHECK"],
        ["Método distinto de efectivo/qr", "Rechazo", "Rechazado por CHECK/función"],
        ["Eliminar venta", "Elimina detalles asociados", "Conforme, ON DELETE CASCADE"],
        ["Eliminar producto vendido", "Rechazo", "Conforme, ON DELETE RESTRICT"],
    ], [3500, 2860, 3000], 8.5)

    heading(doc, "6.4 Consultas críticas y rendimiento básico", 2)
    add_table(doc, ["Consulta", "Filas", "Tiempo observado", "Interpretación"], [
        ["Catálogo de productos", "17", "682,7 ms", "Incluye latencia de red y arranque; funcional."],
        ["Ventas con detalle", "1 venta", "234,2 ms", "Uniones correctas con volumen mínimo."],
        ["Datos para dashboard", "3 agrupaciones", "214,9 ms", "Filtro/agregación funcional."],
    ], [3300, 1100, 1700, 3260], 8.5)
    p(doc, "Los tiempos son mediciones puntuales remotas y no deben generalizarse. Con mayor volumen se recomienda ejecutar varias repeticiones, reportar percentiles y revisar EXPLAIN (ANALYZE, BUFFERS). El objetivo actual es comprobar funcionamiento básico, no capacidad máxima.")
    add_capture_placeholder(doc, 9, "Consultas críticas y tiempos", "Resultados y plan de ejecución del filtro por fecha.")

    heading(doc, "6.5 Pruebas de aplicación y seguridad", 2)
    add_table(doc, ["Caso", "Procedimiento", "Resultado esperado"], [
        ["Catálogo público", "Abrir /productos sin sesión.", "Carga 17 productos disponibles/no disponibles."],
        ["Login válido", "Ingresar credenciales del administrador.", "Redirección al dashboard."],
        ["Login inválido", "Ingresar una contraseña incorrecta.", "Mensaje genérico; no revela qué campo falló."],
        ["Ruta admin sin sesión", "Abrir /admin directamente.", "Redirección a login o respuesta no autorizada."],
        ["Cerrar sesión", "Salir desde admin y volver a Inicio.", "Interfaz pública normal sin recargar manualmente."],
        ["Guardar producto", "Crear/editar y cambiar disponibilidad.", "Persistencia en Supabase y reflejo en catálogo."],
        ["Venta múltiple", "Seleccionar varios productos y cantidades.", "Total automático; cabecera y detalles atómicos."],
        ["RLS", "Intentar leer ventas con rol anon.", "Acceso denegado."],
    ], [1900, 3800, 3660], 8.5)
    add_capture_placeholder(doc, 10, "Pruebas del flujo administrativo", "Login, producto, venta múltiple, total y dashboard.")

    heading(doc, "6.6 Diferencias detectadas y correcciones", 2)
    p(doc, "Las diferencias de identificadores son intencionales: los enteros de MySQL se sustituyeron por UUID. Los usuarios dejaron de residir en una tabla de negocio y pasaron a auth.users. ENUM se reemplazó por texto con CHECK, TINYINT por boolean y DATETIME por timestamptz. Estas diferencias no representan pérdida funcional. Para evitar inconsistencias, los precios históricos se conservan en detalles_venta y el total se calcula en el servidor.")

    heading(doc, "CAPÍTULO VII. IMPLEMENTACIÓN DEL SISTEMA", 1)
    heading(doc, "7.1 Árbol de navegación", 2)
    add_code(doc, """Interfaz pública
├── Inicio
├── Productos
│   └── Detalle de producto
├── Nosotros
├── Ubicación
└── Iniciar sesión
    └── Interfaz administrativa
        ├── Dashboard
        ├── Productos
        ├── Ventas
        └── Cerrar sesión""")

    heading(doc, "7.2 Interfaz pública", 2)
    p(doc, "La interfaz pública utiliza blanco, café y un acento morado/lila asociado al api. La página de Inicio presenta una animación 3D del vaso en la sección principal y tarjetas con imágenes para productos destacados. Productos permite navegar y consultar cada elemento. Nosotros explica la identidad del negocio y Ubicación orienta al visitante. Ninguna función pública exige una cuenta.")
    add_capture_placeholder(doc, 11, "Página de Inicio", "Vista de escritorio con el vaso 3D y vista móvil.")
    add_capture_placeholder(doc, 12, "Catálogo y detalle de producto", "Precio, disponibilidad administrada e imagen relacionada.")

    heading(doc, "7.3 Interfaz administrativa", 2)
    p(doc, "El administrador accede desde el mismo sitio mediante Iniciar sesión. El Dashboard muestra una gráfica de unidades vendidas y admite uno o varios productos, semana, mes específico, rango de meses o año. Productos permite crear, editar y marcar disponibilidad. Ventas presenta una cuadrícula compacta: cada producto se selecciona y recibe su cantidad al lado; el total se actualiza automáticamente y el método de pago se limita a efectivo o QR.")
    add_capture_placeholder(doc, 13, "Dashboard con filtros", "Dos productos seleccionados y cambio de periodo.")
    add_capture_placeholder(doc, 14, "Gestión de productos", "Listado, edición y disponibilidad.")
    add_capture_placeholder(doc, 15, "Registro manual de venta", "Varios productos, cantidades, método y total.")

    heading(doc, "7.4 Integración con Supabase", 2)
    p(doc, "La aplicación utiliza variables de entorno para URL y claves. La clave publicable puede estar disponible para el cliente solo con permisos restringidos. La service role permanece en código servidor. Las operaciones protegidas verifican la sesión y validan entradas antes de consultar PostgreSQL. La función guardar_venta agrupa la cabecera, los detalles y la auditoría dentro de una transacción.")

    heading(doc, "7.5 Estado del producto", 2)
    p(doc, "El sistema cubre el alcance definido y se encuentra listo para incorporar las evidencias visuales y ejecutar la demostración. Antes de una puesta en producción real se deben configurar dominio, políticas de respaldo, monitoreo, rotación de secretos, límites de solicitudes y pruebas con una muestra de ventas representativa.")

    heading(doc, "CAPÍTULO VIII. CONCLUSIONES Y RECOMENDACIONES", 1)
    heading(doc, "8.1 Conclusiones", 2)
    for item in [
        "La migración desde MySQL hacia Supabase/PostgreSQL puede realizarse sin pérdida cuando se inventarían objetos, se transforman tipos explícitamente y se verifica cada relación.",
        "Supabase simplificó la integración de PostgreSQL, autenticación y API, pero no reemplaza el diseño seguro de permisos, restricciones y rutas del servidor.",
        "La reducción del alcance a catálogo, productos, ventas y dashboard produjo un sistema más coherente con la operación actual de Api Teresita.",
        "El registro de ventas con varios productos y cálculo automático mejora consistencia y genera datos útiles para análisis temporal.",
        "La decisión de no aceptar pedidos públicos disminuye el riesgo de operaciones falsas y mantiene el propósito informativo del sitio.",
        "Las pruebas de conteo, integridad y consultas críticas confirmaron el conjunto controlado; la validación final debe acompañarse con capturas de ambos motores.",
        "El proyecto contribuye a los ODS 8 y 9 al fortalecer la gestión de un emprendimiento y adoptar infraestructura digital administrada.",
    ]:
        bullet(doc, item)

    heading(doc, "8.2 Recomendaciones", 2)
    for item in [
        "Automatizar respaldos exportables y ensayar restauraciones con una periodicidad definida.",
        "Rotar inmediatamente cualquier clave que se haya compartido fuera de canales seguros y nunca versionar .env.local.",
        "Agregar pruebas automatizadas de RLS, login, logout, venta transaccional y filtros del dashboard.",
        "Medir rendimiento con datos representativos antes de crear nuevos índices o agregados.",
        "Mantener dependencias de Next.js, Supabase y Node.js actualizadas después de revisar cambios incompatibles.",
        "Definir responsables, retención y revisión periódica de los registros de auditoría.",
        "Incorporar inventario o facturación solo cuando exista un proceso de negocio definido y requisitos aprobados.",
    ]:
        bullet(doc, item)

    heading(doc, "BIBLIOGRAFÍA", 1)
    references = [
        "MySQL. (2026). MySQL Reference Manual: mysqldump — A Database Backup Program. https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html",
        "PostgreSQL Global Development Group. (2026). PostgreSQL Documentation: Data Types. https://www.postgresql.org/docs/current/datatype.html",
        "PostgreSQL Global Development Group. (2026). PostgreSQL Documentation: COPY. https://www.postgresql.org/docs/current/sql-copy.html",
        "Supabase. (2026). Supabase Architecture. https://supabase.com/docs/guides/getting-started/architecture",
        "Supabase. (2026). Auth. https://supabase.com/docs/guides/auth",
        "Supabase. (2026). Row Level Security. https://supabase.com/docs/guides/database/postgres/row-level-security",
        "Supabase. (2026). Production Checklist. https://supabase.com/docs/guides/security/production-checklist",
        "Next.js. (2026). App Router Documentation. https://nextjs.org/docs/app",
        "Next.js. (2026). Authentication Guide. https://nextjs.org/docs/app/guides/authentication",
        "Microsoft. (2026). The TypeScript Handbook. https://www.typescriptlang.org/docs/handbook/",
        "OWASP Foundation. (2026). Password Storage Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
        "Naciones Unidas. (2026). Objetivo 8: Trabajo decente y crecimiento económico. https://sdgs.un.org/goals/goal8",
        "Naciones Unidas. (2026). Objetivo 9: Industria, innovación e infraestructura. https://sdgs.un.org/goals/goal9",
    ]
    for reference in references:
        paragraph = p(doc, reference)
        paragraph.paragraph_format.first_line_indent = Cm(-1)
        paragraph.paragraph_format.left_indent = Cm(1)
        paragraph.paragraph_format.line_spacing = 1.0

    heading(doc, "ANEXO A. SCRIPT COMPLETO DEL ORIGEN MYSQL", 1)
    p(doc, "El siguiente script crea una instancia reproducible del origen para la demostración. La credencial incluida es un marcador no utilizable; nunca debe reemplazarse por una contraseña en texto plano.")
    add_code(doc, MYSQL_SCRIPT)

    heading(doc, "ANEXO B. SCRIPT DEL DESTINO SUPABASE/POSTGRESQL", 1)
    p(doc, "Este script resume el esquema final y sus controles. En un entorno existente debe ejecutarse mediante migraciones versionadas y después de un respaldo. La creación del administrador se realiza en Supabase Auth.")
    add_code(doc, POSTGRES_SCRIPT)

    heading(doc, "ANEXO C. CONSULTAS DE VERIFICACIÓN", 1)
    add_code(doc, VERIFY_SCRIPT)

    heading(doc, "ANEXO D. LISTA DE COTEJO DE SEGURIDAD", 1)
    checklist = [
        "[ ] El archivo .env.local está excluido del repositorio.",
        "[ ] La service role solo existe en el servidor y fue rotada si estuvo expuesta.",
        "[ ] RLS está habilitado en todas las tablas del esquema público.",
        "[ ] El rol anon solo puede leer catálogo/configuración autorizados.",
        "[ ] Las rutas administrativas verifican una sesión válida en servidor.",
        "[ ] Las contraseñas no aparecen en tablas, scripts, capturas ni registros.",
        "[ ] Las entradas de productos, cantidades y métodos son validadas.",
        "[ ] La venta completa se guarda dentro de una única transacción.",
        "[ ] Existe un respaldo reciente y una restauración de prueba documentada.",
        "[ ] Los registros de auditoría tienen retención y acceso restringido.",
        "[ ] Dependencias y entorno de ejecución tienen parches vigentes.",
        "[ ] Se probaron respuestas no autorizadas y cierre de sesión.",
    ]
    for item in checklist:
        bullet(doc, item)

    heading(doc, "ANEXO E. GUION PARA LA DEMOSTRACIÓN EN VIVO (15–20 MINUTOS)", 1)
    add_table(doc, ["Tiempo", "Actividad", "Evidencia"], [
        ["0–2 min", "Presentar problema, alcance y arquitectura.", "Diagrama y navegación."],
        ["2–5 min", "Mostrar MySQL de origen, tablas, conteos y respaldo.", "Origen funcionando + hash."],
        ["5–8 min", "Ejecutar una parte clave: creación/carga o transformación.", "Sentencias y filas afectadas."],
        ["8–11 min", "Mostrar destino y comparar conteos/integridad.", "Consultas del Anexo C."],
        ["11–14 min", "Demostrar dos hardenings.", "RLS/anon denegado y ruta admin protegida."],
        ["14–17 min", "Registrar venta de varios productos y revisar total/dashboard.", "Venta, detalles, gráfica."],
        ["17–19 min", "Cerrar sesión y comprobar la interfaz pública.", "Logout sin error visual."],
        ["19–20 min", "Conclusiones y contingencia.", "Resumen de resultados."],
    ], [1200, 4800, 3360], 8.5)

    heading(doc, "ANEXO F. PLAN DE CAPTURAS Y EVIDENCIAS", 1)
    add_table(doc, ["N.º", "Captura solicitada", "Qué debe verse", "Estado"], [
        ["1", "Origen MySQL", "Servidor, versión y base; ocultar credenciales.", "Pendiente"],
        ["2", "Inventario/tamaño", "Tablas, filas y MB.", "Pendiente"],
        ["3", "Respaldo", "Archivo, fecha y SHA-256.", "Pendiente"],
        ["4", "Destino", "Tablas en español.", "Pendiente"],
        ["5", "RLS/privilegios", "Políticas o prueba con anon.", "Pendiente"],
        ["6", "Autenticación", "Ruta rechazada y acceso válido.", "Pendiente"],
        ["7", "Carga", "Ejecución de migración.", "Pendiente"],
        ["8", "Conteos", "Origen y destino comparables.", "Pendiente"],
        ["9", "Consultas", "Resultados/tiempos o EXPLAIN.", "Pendiente"],
        ["10", "Flujo admin", "Producto, venta y dashboard.", "Pendiente"],
        ["11–15", "Interfaces", "Inicio, catálogo, dashboard, productos y venta.", "Pendiente"],
    ], [650, 2000, 4800, 1910], 8.5)

    heading(doc, "ANEXO G. DECLARACIÓN DE APOYO DE INTELIGENCIA ARTIFICIAL", 1)
    p(doc, "Se utilizó inteligencia artificial como herramienta de apoyo para organizar el informe, proponer redacción técnica y revisar coherencia. El equipo es responsable de validar el contenido, ejecutar los scripts, producir las capturas, comprobar los resultados, citar las fuentes y explicar todas las decisiones durante la defensa. No se deben presentar como ejecutadas las evidencias que permanezcan pendientes.")

    doc.core_properties.title = "Migración de MySQL a Supabase/PostgreSQL y sistema web Api Teresita"
    doc.core_properties.subject = "Proyecto final de Tecnología de Base de Datos"
    doc.core_properties.author = "Samuel Flores Cruz; Rafael Leandro Gomez Escobar; Mauricio Cartagena Alba"
    doc.core_properties.keywords = "MySQL, PostgreSQL, Supabase, Next.js, migración, Api Teresita"
    doc.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    print(build())
