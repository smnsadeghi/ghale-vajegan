import os
import glob
from PIL import Image

CROP_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'scorched_city_cards_crop')
REPORTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'reports')

def sync_cards():
    png_files = sorted(glob.glob(os.path.join(CROP_DIR, '*.png')))
    if len(png_files) != 36:
        print(f"Warning: Expected 36 PNG files, found {len(png_files)}")

    print(f"Syncing {len(png_files)} transparent PNG cards to WebP...")
    webps = []
    for p in png_files:
        im = Image.open(p)
        base = os.path.splitext(os.path.basename(p))[0]
        webp_path = os.path.join(CROP_DIR, f"{base}.webp")
        im.save(webp_path, format="WEBP", quality=85, method=6)
        webps.append(webp_path)

    total_sz_kb = sum(os.path.getsize(w) for w in webps) / 1024.0
    print(f"Generated {len(webps)} WebP files.")
    print(f"Total WebP size: {total_sz_kb:.2f} KB (Avg: {total_sz_kb/len(webps):.2f} KB/card)")

    # Update contact sheet
    update_contact_sheet(webps, os.path.join(REPORTS_DIR, 'cards_contact_sheet.png'))

def update_contact_sheet(webp_files, out_path):
    cols = 6
    rows = 6
    cell_w = 120
    cell_h = 160
    pad = 8
    header_h = 40

    sheet_w = cols * (cell_w + pad) + pad
    sheet_h = rows * (cell_h + pad) + pad + header_h

    sheet = Image.new("RGB", (sheet_w, sheet_h), (20, 18, 16))

    for idx, fpath in enumerate(webp_files):
        r = idx // cols
        c = idx % cols
        x_cell = pad + c * (cell_w + pad)
        y_cell = header_h + pad + r * (cell_h + pad)

        im = Image.open(fpath)
        thumb_h = cell_h - 18
        thumb_w = int(round(im.width * (thumb_h / float(im.height))))
        if thumb_w > cell_w:
            thumb_w = cell_w
            thumb_h = int(round(im.height * (thumb_w / float(im.width))))

        thumb = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        tx = x_cell + (cell_w - thumb_w) // 2
        ty = y_cell + (cell_h - 18 - thumb_h) // 2

        if thumb.mode == "RGBA":
            sheet.paste(thumb, (tx, ty), thumb)
        else:
            sheet.paste(thumb, (tx, ty))

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    sheet.save(out_path, format="PNG")
    print(f"Saved contact sheet: {out_path}")

if __name__ == "__main__":
    sync_cards()
