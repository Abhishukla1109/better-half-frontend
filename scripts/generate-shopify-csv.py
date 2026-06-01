#!/usr/bin/env python3
"""
Generate a Shopify product import CSV from BetterHalf catalog TypeScript files.
Usage: python3 generate-shopify-csv.py
Output: shopify-products-full.csv (in project root)
"""

import re
import csv
import sys
import os

def extract_string(block, key):
    """Extract a single-line string field value."""
    # Match: key: "value" or key: 'value'
    m = re.search(rf'\b{key}\s*:\s*"((?:[^"\\]|\\.)*)"', block)
    if m:
        return m.group(1).replace('\\"', '"').replace('\\n', '\n').replace('\\/', '/')
    m = re.search(rf"\b{key}\s*:\s*'((?:[^'\\]|\\.)*)'", block)
    if m:
        return m.group(1).replace("\\'", "'")
    return ""

def extract_number(block, key):
    """Extract a numeric field value."""
    m = re.search(rf'\b{key}\s*:\s*([\d.]+)', block)
    return m.group(1) if m else "0"

def extract_array(block, key):
    """Extract an array of string values."""
    m = re.search(rf'\b{key}\s*:\s*\[(.*?)\]', block, re.DOTALL)
    if not m:
        return []
    inner = m.group(1)
    vals = re.findall(r'"([^"]*)"', inner)
    vals += re.findall(r"'([^']*)'", inner)
    return vals

def parse_products_from_file(filepath):
    """Parse product objects from a TypeScript catalog file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    products = []

    # Find all top-level product blocks by locating each `{` after an array entry
    # Strategy: split on the pattern that starts a product object
    # Each product starts with:  {
    #   id: "...",
    # We find all positions of `{\n    id:` (or similar whitespace)

    # Find all product objects - they start with '  {' at the array level
    # We'll use a bracket-counting approach to extract each object

    # Find the opening of the array
    arr_start = content.find('= [')
    if arr_start == -1:
        arr_start = content.find(': [')
    if arr_start == -1:
        return products

    text = content[arr_start:]

    i = 0
    while i < len(text):
        # Find opening brace that starts a product
        start = text.find('{', i)
        if start == -1:
            break

        # Check if this looks like a product (has id: field nearby)
        lookahead = text[start:start+200]
        if '\n    id:' not in lookahead and '\n  id:' not in lookahead and 'id:' not in lookahead[:50]:
            i = start + 1
            continue

        # Count braces to find the matching close
        depth = 0
        j = start
        while j < len(text):
            if text[j] == '{':
                depth += 1
            elif text[j] == '}':
                depth -= 1
                if depth == 0:
                    break
            j += 1

        block = text[start:j+1]

        # Only process if it has an id field
        if re.search(r'\bid\s*:', block):
            prod = parse_product_block(block)
            if prod and prod.get('id'):
                products.append(prod)

        i = j + 1

    return products

def parse_product_block(block):
    """Parse a single product object block."""
    prod = {}

    prod['id'] = extract_string(block, 'id')
    prod['name'] = extract_string(block, 'name')
    prod['brand'] = extract_string(block, 'brand')
    prod['description'] = extract_string(block, 'description')
    prod['image'] = extract_string(block, 'image')
    prod['url'] = extract_string(block, 'url')
    prod['category'] = extract_string(block, 'category')
    prod['price'] = extract_number(block, 'price')
    prod['mrp'] = extract_number(block, 'mrp')
    prod['concern'] = extract_array(block, 'concern')
    prod['followUp'] = extract_array(block, 'followUp')
    prod['ingredients'] = extract_array(block, 'ingredients')

    return prod

def build_tags(prod):
    """Build Shopify tags from concern + followUp arrays."""
    tags = []
    tags.extend(prod.get('concern', []))
    tags.extend(prod.get('followUp', []))
    tags.append(prod.get('brand', ''))
    tags.append(prod.get('category', ''))
    return ', '.join(t for t in tags if t)

def clean_html(text):
    """Clean up HTML in description for Shopify."""
    if not text:
        return ""
    # Unescape HTML entities minimally
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
    # Wrap in paragraph if no block tags
    if text and not text.strip().startswith('<'):
        text = '<p>' + text + '</p>'
    return text

def products_to_csv(products, output_path):
    """Write products to Shopify-compatible CSV."""

    fieldnames = [
        'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category',
        'Type', 'Tags', 'Published',
        'Option1 Name', 'Option1 Value',
        'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker',
        'Variant Inventory Qty', 'Variant Inventory Policy', 'Variant Fulfillment Service',
        'Variant Price', 'Variant Compare At Price',
        'Variant Requires Shipping', 'Variant Taxable',
        'Image Src', 'Image Position', 'Image Alt Text',
        'Gift Card', 'SEO Title', 'SEO Description',
        'Google Shopping / Google Product Category', 'Google Shopping / Gender',
        'Google Shopping / Age Group', 'Google Shopping / MPN',
        'Google Shopping / Condition', 'Google Shopping / Custom Product',
        'Google Shopping / Custom Label 0', 'Google Shopping / Custom Label 1',
        'Google Shopping / Custom Label 2', 'Google Shopping / Custom Label 3',
        'Google Shopping / Custom Label 4',
        'Variant Image', 'Variant Weight Unit', 'Variant Tax Code',
        'Cost per item', 'Included / India', 'Price / India', 'Compare At Price / India',
        'Status',
    ]

    rows = []

    for prod in products:
        if not prod.get('id') or not prod.get('name'):
            continue

        handle = prod['id']
        title = prod['name']
        body = clean_html(prod.get('description', ''))
        vendor = prod.get('brand', 'BetterHalf')
        p_type = prod.get('category', '').replace('-', ' ').title()
        tags = build_tags(prod)
        price = prod.get('price', '0')
        mrp = prod.get('mrp', '0')
        image = prod.get('image', '')

        # Only set compare-at price if it differs from price (i.e., there's a discount)
        compare_at = mrp if mrp != price else ''

        row = {
            'Handle': handle,
            'Title': title,
            'Body (HTML)': body,
            'Vendor': vendor,
            'Product Category': '',
            'Type': p_type,
            'Tags': tags,
            'Published': 'TRUE',
            'Option1 Name': 'Title',
            'Option1 Value': 'Default Title',
            'Variant SKU': handle,
            'Variant Grams': '0',
            'Variant Inventory Tracker': 'shopify',
            'Variant Inventory Qty': '100',
            'Variant Inventory Policy': 'continue',
            'Variant Fulfillment Service': 'manual',
            'Variant Price': price,
            'Variant Compare At Price': compare_at,
            'Variant Requires Shipping': 'TRUE',
            'Variant Taxable': 'TRUE',
            'Image Src': image,
            'Image Position': '1',
            'Image Alt Text': title,
            'Gift Card': 'FALSE',
            'SEO Title': title,
            'SEO Description': '',
            'Google Shopping / Google Product Category': '',
            'Google Shopping / Gender': '',
            'Google Shopping / Age Group': '',
            'Google Shopping / MPN': '',
            'Google Shopping / Condition': 'new',
            'Google Shopping / Custom Product': 'FALSE',
            'Google Shopping / Custom Label 0': '',
            'Google Shopping / Custom Label 1': '',
            'Google Shopping / Custom Label 2': '',
            'Google Shopping / Custom Label 3': '',
            'Google Shopping / Custom Label 4': '',
            'Variant Image': '',
            'Variant Weight Unit': 'g',
            'Variant Tax Code': '',
            'Cost per item': '',
            'Included / India': 'TRUE',
            'Price / India': price,
            'Compare At Price / India': compare_at,
            'Status': 'active',
        }
        rows.append(row)

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)

def dedup_products(catalog_products, lj_products):
    """
    Deduplicate: keep first occurrence per ID across catalog.
    For LJ products whose ID conflicts with catalog, prefix handle with 'lj-'.
    Returns (deduplicated list, lj_prefix_map {original_id: shopify_handle}).
    """
    seen_ids = {}
    result = []
    lj_prefix_map = {}  # maps lj original id -> shopify handle used

    # Process catalog first
    for p in catalog_products:
        pid = p['id']
        if pid not in seen_ids:
            seen_ids[pid] = True
            result.append(p)
        # silently skip duplicates within catalog

    catalog_id_set = set(p['id'] for p in result)

    # Process LJ products
    for p in lj_products:
        pid = p['id']
        if pid in catalog_id_set:
            # Conflict: prefix with lj-
            new_handle = 'lj-' + pid
            lj_prefix_map[pid] = new_handle
            p = dict(p, id=new_handle)
        if p['id'] not in seen_ids:
            seen_ids[p['id']] = True
            result.append(p)

    return result, lj_prefix_map


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend = os.path.join(base, 'frontend')

    catalog_path = os.path.join(frontend, 'src/lib/ai/catalog.ts')
    lj_path = os.path.join(frontend, 'src/lib/ai/lj-products.ts')
    output_path = os.path.join(base, 'shopify-products-full.csv')

    print(f"Parsing catalog: {catalog_path}")
    catalog_products = parse_products_from_file(catalog_path)
    print(f"  Found {len(catalog_products)} raw catalog entries")

    print(f"Parsing LJ products: {lj_path}")
    lj_products = parse_products_from_file(lj_path)
    print(f"  Found {len(lj_products)} Little Joys entries")

    all_products, lj_prefix_map = dedup_products(catalog_products, lj_products)
    print(f"  Unique products after deduplication: {len(all_products)}")

    if lj_prefix_map:
        print(f"\n  LJ products prefixed with 'lj-' (cross-file conflict):")
        for orig, handle in lj_prefix_map.items():
            print(f"    {orig} → {handle}")
        print(f"\n  NOTE: Add these to shopify-handle-map.ts if kids should add them to cart:")
        for orig, handle in lj_prefix_map.items():
            print(f'    "{orig}": "{handle}",  // LJ prefix to avoid collision with catalog')

    count = products_to_csv(all_products, output_path)
    print(f"\nCSV written: {output_path}")
    print(f"Rows written: {count}")

    # Print sample
    print("\nSample handles (first 10):")
    for p in all_products[:10]:
        print(f"  {p['id']:50s}  ₹{p['price']:>6}  {p['name'][:40]}")

if __name__ == '__main__':
    main()
