#!/usr/bin/env python3
"""
Import product catalog & images from a temnhaninox.com archive JSON export
into frontend/public/assets/products/ and infra/postgres/seed_products.sql.

Usage:
  python frontend/scripts/import-archive-json.py --json path/to/archive.json
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PRODUCTS_DIR = ROOT / "frontend" / "public" / "assets" / "products"
DEFAULT_SQL_OUT = ROOT / "infra" / "postgres" / "seed_products.sql"

CATEGORY_UUIDS: dict[str, tuple[str, str | None, int]] = {
    "tem-nhan": ("33333333-3333-3333-3333-333333333301", None, 1),
    "tem-nhan-inox": ("33333333-3333-3333-3333-333333333302", "tem-nhan", 1),
    "tem-nhan-nhom": ("33333333-3333-3333-3333-333333333303", "tem-nhan", 2),
    "tem-nhan-dong": ("33333333-3333-3333-3333-333333333304", "tem-nhan", 3),
    "tem-nhan-mica": ("33333333-3333-3333-3333-333333333305", "tem-nhan", 4),
    "tem-nhan-decal": ("33333333-3333-3333-3333-333333333309", "tem-nhan", 5),
    "cnc": ("33333333-3333-3333-3333-333333333306", None, 2),
    "laser": ("33333333-3333-3333-3333-333333333310", None, 3),
    "may-moc": ("33333333-3333-3333-3333-333333333307", None, 4),
    "hoa-chat": ("33333333-3333-3333-3333-333333333311", None, 5),
    "vat-pham-luu-niem": ("33333333-3333-3333-3333-333333333308", None, 6),
}

MAT_INOX = "11111111-1111-1111-1111-111111111101"
MAT_NHOM = "11111111-1111-1111-1111-111111111103"
MAT_DONG = "11111111-1111-1111-1111-111111111104"
MAT_MICA = "11111111-1111-1111-1111-111111111105"

PROC_ETCH = "22222222-2222-2222-2222-222222222201"
PROC_LASER = "22222222-2222-2222-2222-222222222202"
PROC_UV = "22222222-2222-2222-2222-222222222203"
PROC_CNC = "22222222-2222-2222-2222-222222222204"


def sql_str(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def strip_html(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def infer_material_and_method(cat_slugs: list[str], name: str) -> tuple[str, str]:
    joined = " ".join(cat_slugs) + " " + name.lower()
    if "tem-nhan-dong" in joined or "đồng" in joined:
        mat = MAT_DONG
    elif "tem-nhan-nhom" in joined or "nhôm" in joined:
        mat = MAT_NHOM
    elif "tem-nhan-mica" in joined or "tem-nhan-decal" in joined or "mica" in joined or "decal" in joined:
        mat = MAT_MICA
    else:
        mat = MAT_INOX

    if "cnc" in joined or "máy" in joined:
        proc = PROC_CNC
    elif "laser" in joined or "khắc" in joined:
        proc = PROC_LASER
    elif "mica" in joined or "decal" in joined or "uv" in joined:
        proc = PROC_UV
    else:
        proc = PROC_ETCH
    return mat, proc


def pick_category_id(cat_slugs: list[str]) -> str:
    # Prefer the most specific (non-root) category slug when multiple exist
    for slug in reversed(cat_slugs):
        if slug in CATEGORY_UUIDS:
            return CATEGORY_UUIDS[slug][0]
    return CATEGORY_UUIDS["tem-nhan"][0]


def copy_product_images(
    product: dict,
    archive_root: Path,
    dest_dir: Path,
) -> list[str]:
    slug = product["slug"]
    dest_dir.mkdir(parents=True, exist_ok=True)
    web_paths: list[str] = []

    for idx, img in enumerate(product.get("images") or [], start=1):
        local_rel = img.get("local_path")
        if not local_rel:
            continue
        src = archive_root / Path(local_rel.replace("\\", "/"))
        if not src.exists():
            continue
        ext = src.suffix.lower() or ".jpg"
        target_name = f"{slug}-{idx}{ext}"
        target_path = dest_dir / target_name
        shutil.copy2(src, target_path)
        web_paths.append(f"/assets/products/{target_name}")

    return web_paths


def build_seed_sql(data: dict, archive_root: Path, dest_dir: Path) -> tuple[str, int]:
    lines: list[str] = [
        "-- ============================================================================",
        "-- Tem Nhãn Inox NVX - Auto-imported from archive JSON",
        "-- Target Schema: catalog_pricing_schema",
        "-- ============================================================================",
        "BEGIN;",
        "",
        "-- 1. Upsert Categories",
    ]

    cat_names = {c["slug"]: html.unescape(c["name"]) for c in data.get("categories", [])}
    for slug, (cat_id, parent_slug, order) in CATEGORY_UUIDS.items():
        name = cat_names.get(slug, slug.replace("-", " ").title())
        parent_sql = sql_str(CATEGORY_UUIDS[parent_slug][0]) if parent_slug else "NULL"
        lines.append(
            "INSERT INTO catalog_pricing_schema.categories "
            "(id, parent_id, name, slug, display_order, is_active) VALUES "
            f"({sql_str(cat_id)}, {parent_sql}, {sql_str(name)}, {sql_str(slug)}, {order}, TRUE) "
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, "
            "parent_id = EXCLUDED.parent_id, display_order = EXCLUDED.display_order, is_active = TRUE;"
        )

    lines.extend(["", "-- 2. Upsert Products"])
    copied_images = 0

    for prod in data.get("products", []):
        slug = prod["slug"]
        name = html.unescape(prod["name"]).strip()
        sku = (prod.get("sku") or f"NVX-{prod['id']}").strip()
        cat_slugs = [c["slug"] for c in prod.get("categories", [])]
        cat_id = pick_category_id(cat_slugs)
        mat_id, proc_id = infer_material_and_method(cat_slugs, name)

        raw_price = (prod.get("prices") or {}).get("price", "0")
        price_num = float(raw_price or 0)
        is_custom = price_num <= 0 or not prod.get("is_purchasable", True)
        product_type = "CUSTOM_TEMPLATE" if is_custom else "STANDARD_ITEM"
        stock_qty = 0 if is_custom else 50

        desc = strip_html(prod.get("description") or prod.get("short_description") or "")
        if not desc:
            desc = (
                f"Sản phẩm {name} được gia công trực tiếp tại xưởng Kĩ Nghệ NVX – Sài Gòn "
                "(Quận 12, TP.HCM). Độ chính xác cao ±0.05mm, hỗ trợ xuất hóa đơn VAT."
            )

        images = copy_product_images(prod, archive_root, dest_dir)
        copied_images += len(images)
        images_json = json.dumps(images, ensure_ascii=False)

        lines.append(
            "INSERT INTO catalog_pricing_schema.products "
            "(category_id, material_id, processing_method_id, sku, name, slug, description, "
            "product_type, base_price, default_width_mm, default_height_mm, default_thickness_mm, "
            "stock_quantity, images, is_active) VALUES "
            f"({sql_str(cat_id)}, {sql_str(mat_id)}, {sql_str(proc_id)}, {sql_str(sku)}, "
            f"{sql_str(name)}, {sql_str(slug)}, {sql_str(desc)}, {sql_str(product_type)}, "
            f"{price_num:.2f}, 80.00, 40.00, 0.80, {stock_qty}, {sql_str(images_json)}::jsonb, TRUE) "
            "ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, "
            "material_id = EXCLUDED.material_id, processing_method_id = EXCLUDED.processing_method_id, "
            "name = EXCLUDED.name, description = EXCLUDED.description, product_type = EXCLUDED.product_type, "
            "base_price = EXCLUDED.base_price, images = EXCLUDED.images, is_active = TRUE;"
        )

    lines.extend(["", "COMMIT;", ""])
    return "\n".join(lines), copied_images


def main() -> None:
    parser = argparse.ArgumentParser(description="Import temnhaninox archive JSON to PostgreSQL & assets.")
    parser.add_argument("--json", required=True, type=Path, help="Path to the archive JSON file.")
    parser.add_argument(
        "--archive-root",
        type=Path,
        default=None,
        help="Base directory containing temnhaninox_archive/assets/... (defaults to JSON parent).",
    )
    parser.add_argument("--assets-dir", type=Path, default=DEFAULT_PRODUCTS_DIR)
    parser.add_argument("--sql-out", type=Path, default=DEFAULT_SQL_OUT)
    args = parser.parse_args()

    archive_root = args.archive_root or args.json.resolve().parent
    data = json.loads(args.json.read_text(encoding="utf-8"))
    sql_text, copied_count = build_seed_sql(data, archive_root, args.assets_dir)

    args.sql_out.parent.mkdir(parents=True, exist_ok=True)
    args.sql_out.write_text(sql_text, encoding="utf-8")

    print(
        f"Generated {args.sql_out} for {len(data.get('products', []))} products "
        f"(copied {copied_count} images to {args.assets_dir})."
    )


if __name__ == "__main__":
    main()
