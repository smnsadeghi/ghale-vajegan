import os
import glob
import math
import numpy as np
from PIL import Image

SRC_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'scorched_city_cards_final')
DST_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'scorched_city_cards_crop')
REPORTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'reports')

TARGET_HEIGHT = 360
WEBP_QUALITY = 75
MAX_SIZE_KB = 30.0

def process_cards():
    os.makedirs(DST_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    files = sorted(glob.glob(os.path.join(SRC_DIR, '*.jpg')))
    if len(files) != 36:
        print(f"Warning: expected 36 images, found {len(files)}")

    results = []
    cropped_images = []

    print(f"Processing {len(files)} card images from {SRC_DIR}...")

    for fpath in files:
        fname = os.path.basename(fpath)
        base_name, _ = os.path.splitext(fname)
        out_name = f"{base_name}.webp"
        out_path = os.path.join(DST_DIR, out_name)

        im = Image.open(fpath)
        arr = np.array(im, dtype=np.float32)
        h, w, _ = arr.shape

        # 1. Background color from median of 20px edge strips
        edge_pixels = np.concatenate([
            arr[:20, :].reshape(-1, 3),
            arr[-20:, :].reshape(-1, 3),
            arr[:, :20].reshape(-1, 3),
            arr[:, -20:].reshape(-1, 3)
        ], axis=0)
        bg_median = np.median(edge_pixels, axis=0)

        # 2. Card bounding box with difference threshold ~40
        diff = np.sum(np.abs(arr - bg_median), axis=2)
        mask = diff > 40.0

        col_counts = np.sum(mask, axis=0)
        row_counts = np.sum(mask, axis=1)

        # Filter stray noise pixels (require at least 10 active pixels in row/col)
        cols = np.where(col_counts >= 10)[0]
        rows = np.where(row_counts >= 10)[0]

        if len(cols) == 0 or len(rows) == 0:
            cols = np.where(col_counts > 0)[0]
            rows = np.where(row_counts > 0)[0]

        xmin, xmax = int(cols.min()), int(cols.max())
        ymin, ymax = int(rows.min()), int(rows.max())

        # 3. 4px inward crop
        crop_x1 = min(xmin + 4, xmax)
        crop_y1 = min(ymin + 4, ymax)
        crop_x2 = max(xmax - 4, crop_x1)
        crop_y2 = max(ymax - 4, crop_y1)

        cropped = im.crop((crop_x1, crop_y1, crop_x2 + 1, crop_y2 + 1))
        cw, ch = cropped.size

        # 4. Target height 360px with proportional width
        target_w = int(round(cw * (TARGET_HEIGHT / float(ch))))
        resized = cropped.resize((target_w, TARGET_HEIGHT), Image.Resampling.LANCZOS)

        # 5. Save as WEBP quality ~75
        quality = WEBP_QUALITY
        resized.save(out_path, format="WEBP", quality=quality)
        file_size_kb = os.path.getsize(out_path) / 1024.0

        # Adjust quality if exceeds 30KB
        while file_size_kb > MAX_SIZE_KB and quality > 40:
            quality -= 5
            resized.save(out_path, format="WEBP", quality=quality)
            file_size_kb = os.path.getsize(out_path) / 1024.0

        aspect_ratio = target_w / float(TARGET_HEIGHT)

        # 6. Automated Verification: outer 3% of every edge must NOT be gray background
        res_arr = np.array(resized, dtype=np.float32)
        pixel_dist = np.mean(np.abs(res_arr - bg_median), axis=2)

        sy = max(1, int(round(TARGET_HEIGHT * 0.03)))
        sx = max(1, int(round(target_w * 0.03)))

        top_max = float(pixel_dist[:sy, :].max())
        bot_max = float(pixel_dist[-sy:, :].max())
        left_max = float(pixel_dist[:, :sx].max())
        right_max = float(pixel_dist[:, -sx:].max())

        # An edge is gray background if all pixels in the 3% strip have distance <= 12
        is_top_gray = top_max <= 12.0
        is_bot_gray = bot_max <= 12.0
        is_left_gray = left_max <= 12.0
        is_right_gray = right_max <= 12.0
        has_gray_edge = is_top_gray or is_bot_gray or is_left_gray or is_right_gray

        item = {
            'src_file': fname,
            'webp_file': out_name,
            'bg_median': [int(round(x)) for x in bg_median],
            'orig_w': w,
            'orig_h': h,
            'bbox': [xmin, ymin, xmax, ymax],
            'cropped_w': cw,
            'cropped_h': ch,
            'out_w': target_w,
            'out_h': TARGET_HEIGHT,
            'aspect_ratio': aspect_ratio,
            'file_size_kb': file_size_kb,
            'has_gray_edge': has_gray_edge,
            'edge_max_dists': [top_max, bot_max, left_max, right_max]
        }
        results.append(item)
        cropped_images.append(resized)

    # Calculate median aspect ratio
    aspect_ratios = [r['aspect_ratio'] for r in results]
    median_ar = float(np.median(aspect_ratios))

    outliers = []
    for r in results:
        deviation = (r['aspect_ratio'] - median_ar) / median_ar * 100.0
        r['deviation_pct'] = deviation
        r['is_outlier'] = abs(deviation) > 6.0
        if r['is_outlier']:
            outliers.append(r)

    # 7. Create 6x6 Contact Sheet
    create_contact_sheet(cropped_images, results, os.path.join(REPORTS_DIR, 'cards_contact_sheet.png'))

    # Print summary
    total_kb = sum(r['file_size_kb'] for r in results)
    print("\n" + "="*80)
    print(f"CROP SUMMARY: {len(results)} cards processed.")
    print(f"Median Aspect Ratio: {median_ar:.4f}")
    print(f"Total Size: {total_kb:.2f} KB (Avg: {total_kb/len(results):.2f} KB / card)")
    print(f"Max Single File Size: {max(r['file_size_kb'] for r in results):.2f} KB (<= {MAX_SIZE_KB} KB target)")
    print(f"Cards with gray edges (fails): {sum(1 for r in results if r['has_gray_edge'])}")
    print(f"Outliers with >6% aspect ratio deviation: {len(outliers)}")
    print("="*80)

    for o in outliers:
        print(f"  * {o['webp_file']:35s} {o['out_w']}x{o['out_h']} ar={o['aspect_ratio']:.4f} dev={o['deviation_pct']:+5.1f}%")

    return results, median_ar, outliers, total_kb

def create_contact_sheet(images, metadata, out_path):
    cols = 6
    rows = 6
    cell_w = 120
    cell_h = 160
    pad = 8
    header_h = 40

    sheet_w = cols * (cell_w + pad) + pad
    sheet_h = rows * (cell_h + pad) + pad + header_h

    # Dark Gothic Slate Background
    sheet = Image.new("RGB", (sheet_w, sheet_h), (20, 18, 16))

    for idx, (im, meta) in enumerate(zip(images, metadata)):
        r = idx // cols
        c = idx % cols

        x_cell = pad + c * (cell_w + pad)
        y_cell = header_h + pad + r * (cell_h + pad)

        # Scale thumbnail to fit cell_w x (cell_h - 20) preserving aspect ratio
        thumb_h = cell_h - 18
        thumb_w = int(round(im.width * (thumb_h / float(im.height))))
        if thumb_w > cell_w:
            thumb_w = cell_w
            thumb_h = int(round(im.height * (thumb_w / float(im.width))))

        thumb = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)

        # Center in cell
        tx = x_cell + (cell_w - thumb_w) // 2
        ty = y_cell + (cell_h - 18 - thumb_h) // 2
        sheet.paste(thumb, (tx, ty))

    sheet.save(out_path, format="PNG")
    print(f"Contact sheet saved to: {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")

if __name__ == "__main__":
    process_cards()
