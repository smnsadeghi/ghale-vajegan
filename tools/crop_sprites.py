#!/usr/bin/env python3
"""
tools/crop_sprites.py

Advanced Sprite Sheet Cropper, Chroma Keyer, and Alignment Tool
Conforms strictly to the user specification:
1. Dynamic background color detection (median of 4px outer frame).
2. Lab (< 18) & Hue-Sat (+/- 25 deg, sat > 0.30) masking.
3. Connected components + 3px dilation for grouping (sword/spark preservation).
4. Despill (spill = max(0, min(r,b) - g)), edge cleanup (hue 270-340, sat > 0.35), enclosed hole cleanup.
5. Multiple of 16 cell size (min 128), shared baseline (cell_height - 16), feet-centered.
6. Multi-format output: PNG, lossless WebP, frames/, previews (white, black, green), meta JSON.
7. Final markdown / text report table.
"""

import os
import sys
import glob
import json
import colorsys
import numpy as np
from PIL import Image, ImageDraw

try:
    from scipy import ndimage
    from skimage import color
except ImportError as e:
    print(f"Error importing libraries: {e}")
    sys.exit(1)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_DIR = os.path.join(PROJECT_ROOT, "assets", "redesign", "raw")
OUT_DIR = os.path.join(PROJECT_ROOT, "assets", "redesign", "clean")
FRAMES_DIR = os.path.join(OUT_DIR, "frames")
TOOLS_DIR = os.path.join(PROJECT_ROOT, "tools")


def find_input_files():
    """
    Search for png/webp/jpg files matching 'knight' or 'enemy' in:
    assets/redesign/raw/ first, then assets/redesign/, assets/, and root.
    """
    search_dirs = [
        RAW_DIR,
        os.path.join(PROJECT_ROOT, "assets", "redesign"),
        os.path.join(PROJECT_ROOT, "assets"),
        PROJECT_ROOT
    ]
    extensions = ("*.png", "*.webp", "*.jpg", "*.jpeg")
    
    found_files = []
    seen_bases = set()

    for sdir in search_dirs:
        if not os.path.exists(sdir):
            continue
        for ext in extensions:
            pattern = os.path.join(sdir, ext)
            for fpath in sorted(glob.glob(pattern)):
                filename = os.path.basename(fpath).lower()
                if "knight" in filename or "enemy" in filename:
                    # Ignore working / temporary / preview files
                    if any(x in filename for x in ["preview", "clean", "test", "debug", "thumb", "view", "face", "flood"]):
                        continue
                    # Ignore raw gemini jpgs if standard name exists
                    base_name = os.path.splitext(os.path.basename(fpath))[0]
                    if base_name.startswith("gemini_generated"):
                        continue
                    if base_name not in seen_bases:
                        seen_bases.add(base_name)
                        found_files.append(fpath)

    return found_files


def detect_background_color(img_rgba):
    """
    Background color = median of the 4px outer frame pixels of the image.
    If image has true alpha and corners are transparent, that alpha is background.
    """
    h, w, _ = img_rgba.shape
    alpha = img_rgba[:, :, 3]

    corners = [alpha[0, 0], alpha[0, w - 1], alpha[h - 1, 0], alpha[h - 1, w - 1]]
    has_alpha_bg = sum(c < 10 for c in corners) >= 3

    frame_mask = np.zeros((h, w), dtype=bool)
    frame_mask[:4, :] = True
    frame_mask[-4:, :] = True
    frame_mask[:, :4] = True
    frame_mask[:, -4:] = True

    if has_alpha_bg:
        frame_rgb = img_rgba[frame_mask & (alpha > 50)][:, :3]
        if len(frame_rgb) == 0:
            frame_rgb = img_rgba[frame_mask][:, :3]
    else:
        frame_rgb = img_rgba[frame_mask][:, :3]

    if len(frame_rgb) > 0:
        med_rgb = np.median(frame_rgb, axis=0).astype(np.uint8)
    else:
        med_rgb = np.array([255, 0, 255], dtype=np.uint8)

    return med_rgb, has_alpha_bg


def rgb_to_hue_sat(rgb_norm):
    """Vectorized RGB (0..1) to Hue (0..360) and Saturation (0..1)."""
    r, g, b = rgb_norm[..., 0], rgb_norm[..., 1], rgb_norm[..., 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    deltac = maxc - minc

    sat = np.zeros_like(maxc)
    nonzero = maxc > 1e-6
    sat[nonzero] = deltac[nonzero] / maxc[nonzero]

    hue = np.zeros_like(maxc)
    mask_r = (maxc == r) & (deltac > 1e-6)
    mask_g = (maxc == g) & (deltac > 1e-6) & ~mask_r
    mask_b = (maxc == b) & (deltac > 1e-6) & ~mask_r & ~mask_g

    hue[mask_r] = ((g[mask_r] - b[mask_r]) / deltac[mask_r]) % 6.0
    hue[mask_g] = ((b[mask_g] - r[mask_g]) / deltac[mask_g]) + 2.0
    hue[mask_b] = ((r[mask_b] - g[mask_b]) / deltac[mask_b]) + 4.0
    hue = hue * 60.0

    return hue, sat


def compute_background_mask(img_rgba, bg_rgb, has_alpha_bg):
    """
    Background mask = union of:
    (a) Lab distance from background color < 18
    (b) hue within +/- 25 degrees of background hue with saturation > 0.30
    Also includes initial alpha < 10 if present.
    """
    h, w, _ = img_rgba.shape
    rgb = img_rgba[:, :, :3]
    rgb_norm = rgb.astype(np.float64) / 255.0

    # (a) Lab distance < 18
    lab_img = color.rgb2lab(rgb_norm)
    bg_lab = color.rgb2lab(bg_rgb.reshape((1, 1, 3)).astype(np.float64) / 255.0)[0, 0]
    lab_dist = np.linalg.norm(lab_img - bg_lab, axis=2)
    mask_lab = lab_dist < 18.0

    # (b) Hue within +/- 25 deg and sat > 0.30
    hues, sats = rgb_to_hue_sat(rgb_norm)
    bg_norm = bg_rgb.astype(np.float64) / 255.0
    bg_h, bg_s, _ = colorsys.rgb_to_hsv(bg_norm[0], bg_norm[1], bg_norm[2])
    bg_hue_deg = bg_h * 360.0

    hue_diff = np.abs(hues - bg_hue_deg)
    hue_diff = np.minimum(hue_diff, 360.0 - hue_diff)
    mask_hue = (hue_diff <= 25.0) & (sats > 0.30)

    bg_mask = mask_lab | mask_hue

    if has_alpha_bg:
        bg_mask = bg_mask | (img_rgba[:, :, 3] < 10)

    return bg_mask


def find_frames(bg_mask, img_w, img_h, debug_path, base_name=""):
    """
    Foreground = ~bg_mask
    Connected components (connectivity=8), filter noise < 30px.
    Group detached pieces (swords, sparks, statue rubble) to their frame.
    Row grouping: sort by Y centroid and break when vertical gap > 0.5 * median_h.
    Col grouping: sort by X centroid.
    If not 4x4, save debug image with bounding boxes.
    """
    fg = ~bg_mask

    struct8 = np.ones((3, 3), dtype=bool)
    labeled, num_features = ndimage.label(fg, structure=struct8)
    sizes = ndimage.sum(fg, labeled, range(1, num_features + 1))
    fg_clean = fg.copy()
    fg_clean[np.isin(labeled, np.where(sizes < 30)[0] + 1)] = False

    # For enemy_w3 (floating stone rubble), dilate by 2 to bridge pieces of statue frames
    d_iters = 2 if "enemy_w3" in base_name else 0
    fg_dil = ndimage.binary_dilation(fg_clean, structure=struct8, iterations=d_iters) if d_iters > 0 else fg_clean
    lab_seed, n_seed = ndimage.label(fg_dil, structure=struct8)
    s_seed = ndimage.sum(fg_dil, lab_seed, range(1, n_seed + 1))
    
    top_indices = np.argsort(s_seed)[::-1]
    # Check if 16 major frames exist
    if len(top_indices) >= 16 and s_seed[top_indices[15]] > 800:
        major_labels = top_indices[:16] + 1
        seed_mask = np.isin(lab_seed, major_labels)
        major_labeled, _ = ndimage.label(seed_mask, structure=struct8)
        dist, nearest_idx = ndimage.distance_transform_edt(~seed_mask, return_indices=True)
        final_labeled = np.where(fg_clean, major_labeled[nearest_idx[0], nearest_idx[1]], 0)
    else:
        # Standard fallback: 3px dilation
        dilated = ndimage.binary_dilation(fg_clean, structure=struct8, iterations=3)
        final_labeled, _ = ndimage.label(dilated, structure=struct8)

    unique_ids = np.unique(final_labeled[final_labeled > 0])

    groups = []
    for g_id in unique_ids:
        pts = np.where(final_labeled == g_id)
        if len(pts[0]) < 80:  # Ignore tiny stray motes
            continue
        y_min, y_max = np.min(pts[0]), np.max(pts[0])
        x_min, x_max = np.min(pts[1]), np.max(pts[1])
        cy = (y_min + y_max) / 2.0
        cx = (x_min + x_max) / 2.0
        gh = y_max - y_min + 1
        gw = x_max - x_min + 1
        groups.append({
            "id": int(g_id),
            "y_min": int(y_min),
            "y_max": int(y_max),
            "x_min": int(x_min),
            "x_max": int(x_max),
            "cy": cy,
            "cx": cx,
            "h": gh,
            "w": gw
        })

    if not groups:
        return [], 0, 0

    # Row grouping: sort by Y centroid and break when vertical gap > 0.5 * median_h
    median_h = np.median([g["h"] for g in groups])
    groups_by_y = sorted(groups, key=lambda g: g["cy"])

    rows = []
    curr_row = [groups_by_y[0]]
    for i in range(1, len(groups_by_y)):
        prev_g = curr_row[-1]
        curr_g = groups_by_y[i]
        vertical_gap = curr_g["cy"] - prev_g["cy"]
        if vertical_gap > (0.5 * median_h):
            rows.append(curr_row)
            curr_row = [curr_g]
        else:
            curr_row.append(curr_g)
    if curr_row:
        rows.append(curr_row)

    # In each row, sort by X centroid
    for r in rows:
        r.sort(key=lambda g: g["cx"])

    row_count = len(rows)
    col_counts = [len(r) for r in rows]
    col_count = int(np.median(col_counts)) if col_counts else 0

    is_standard = (row_count == 4 and all(c == 4 for c in col_counts))
    if not is_standard and debug_path:
        os.makedirs(os.path.dirname(debug_path), exist_ok=True)
        debug_img = Image.new("RGB", (img_w, img_h), (20, 20, 20))
        draw = ImageDraw.Draw(debug_img)
        draw.bitmap((0, 0), Image.fromarray((fg * 100).astype(np.uint8)), fill=(80, 80, 80))
        for r_idx, r in enumerate(rows):
            for c_idx, g in enumerate(r):
                draw.rectangle([g["x_min"], g["y_min"], g["x_max"], g["y_max"]], outline=(255, 215, 0), width=2)
                draw.text((g["x_min"] + 4, g["y_min"] + 4), f"R{r_idx}C{c_idx}", fill=(255, 255, 255))
        debug_img.save(debug_path)

    return rows, row_count, col_count


def clean_frame(frame_crop_rgba, bg_mask_crop, bg_rgb):
    """
    Clean cropped frame:
    1. Apply binary alpha from background mask.
    2. Enclosed holes inside body: only remove if Lab < 10 and area > 6px.
       Body colors (eyes, runes, flames, dark shadows) preserved.
    3. Despill: within 2px radius from background: spill = max(0, min(r,b) - g) subtracted from r & b.
    4. Edge cleanup: edge pixels with hue 270-340 and sat > 0.35 get alpha=0 (up to 2 passes).
    """
    img = frame_crop_rgba.copy()
    h, w, _ = img.shape
    alpha = np.where(bg_mask_crop, 0, 255).astype(np.uint8)

    # 1. Enclosed holes inside body: check non-border holes of alpha==0
    struct4 = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
    holes_mask = (alpha == 0)
    labeled_holes, num_holes = ndimage.label(holes_mask, structure=struct4)
    border_labels = set(np.unique(labeled_holes[0, :])) | \
                    set(np.unique(labeled_holes[-1, :])) | \
                    set(np.unique(labeled_holes[:, 0])) | \
                    set(np.unique(labeled_holes[:, -1]))

    rgb = img[:, :, :3]
    rgb_norm = rgb.astype(np.float64) / 255.0
    lab_img = color.rgb2lab(rgb_norm)
    bg_lab = color.rgb2lab(bg_rgb.reshape((1, 1, 3)).astype(np.float64) / 255.0)[0, 0]
    lab_dist = np.linalg.norm(lab_img - bg_lab, axis=2)

    for h_id in range(1, num_holes + 1):
        if h_id in border_labels:
            continue
        hole_pts = (labeled_holes == h_id)
        pure_bg_pixels = np.sum(lab_dist[hole_pts] < 10.0)
        # Hole is only pure background if it has >= 6 pure BG pixels and 20th percentile < 10
        is_pure_bg = (pure_bg_pixels >= 6) and (np.percentile(lab_dist[hole_pts], 20) < 10.0)
        if not is_pure_bg:
            alpha[hole_pts] = 255

    # 2. Despill within 2px radius from background
    bg_region = (alpha == 0)
    near_bg = ndimage.binary_dilation(bg_region, structure=struct4, iterations=2) & (alpha > 0)

    r = img[:, :, 0].astype(np.float64)
    g = img[:, :, 1].astype(np.float64)
    b = img[:, :, 2].astype(np.float64)

    spill = np.maximum(0.0, np.minimum(r, b) - g)
    r[near_bg] = np.maximum(0.0, r[near_bg] - spill[near_bg])
    b[near_bg] = np.maximum(0.0, b[near_bg] - spill[near_bg])

    img[:, :, 0] = np.clip(r, 0, 255).astype(np.uint8)
    img[:, :, 2] = np.clip(b, 0, 255).astype(np.uint8)

    # 3. Edge cleanup: hue 270-340 and sat > 0.35 on border (up to 2 passes)
    for _ in range(2):
        eroded_alpha = ndimage.binary_erosion(alpha > 0, structure=struct4, iterations=1)
        edge_pixels = (alpha > 0) & ~eroded_alpha

        if not np.any(edge_pixels):
            break

        c_rgb_norm = img[:, :, :3].astype(np.float64) / 255.0
        hues, sats = rgb_to_hue_sat(c_rgb_norm)

        fringe_mask = edge_pixels & (hues >= 270.0) & (hues <= 340.0) & (sats > 0.35)
        if np.any(fringe_mask):
            alpha[fringe_mask] = 0
        else:
            break

    img[:, :, 3] = alpha
    return img


def pack_sheet(frames_grid, cell_size, rows_count, cols_count):
    """
    Pack aligned frames into clean sheet:
    - Destination cell size = multiple of 16 (min 128).
    - Baseline = cell_size - 16.
    - Horizontal centering: horizontal center of bottom 8 rows of opaque pixels at cell_size // 2.
    - Frames are NEVER resized.
    """
    sheet_w = cell_size * cols_count
    sheet_h = cell_size * rows_count
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    baseline = cell_size - 16
    suspicious_frames = []

    for r_idx, row in enumerate(frames_grid):
        for c_idx, f_img in enumerate(row):
            fw, fh = f_img.size
            if fw > cell_size or fh > cell_size:
                suspicious_frames.append(f"R{r_idx}C{c_idx}({fw}x{fh}>{cell_size})")

            # Determine horizontal center of feet (bottom 8 rows of opaque pixels)
            f_arr = np.array(f_img)
            f_alpha = f_arr[:, :, 3]
            opaque_rows = np.where(np.any(f_alpha > 0, axis=1))[0]

            if len(opaque_rows) > 0:
                bottom_y = opaque_rows[-1]
                top_feet_y = max(0, bottom_y - 7)
                feet_region = f_alpha[top_feet_y:bottom_y + 1, :]
                feet_cols = np.where(np.any(feet_region > 0, axis=0))[0]
                if len(feet_cols) > 0:
                    feet_cx = (feet_cols[0] + feet_cols[-1]) / 2.0
                else:
                    feet_cx = fw / 2.0
            else:
                bottom_y = fh - 1
                feet_cx = fw / 2.0

            cell_cx = cell_size // 2
            paste_x = int(round((c_idx * cell_size) + cell_cx - feet_cx))
            paste_y = int(round((r_idx * cell_size) + baseline - bottom_y))

            sheet.paste(f_img, (paste_x, paste_y), f_img)

    return sheet, baseline, suspicious_frames


def count_fringe_pixels(img_rgba):
    """
    Count opaque pixels with hue 270-340 and sat > 0.35.
    Returns: (total_fringe, edge_fringe, body_fringe)
    """
    alpha = img_rgba[:, :, 3]
    opaque = alpha > 0
    if not np.any(opaque):
        return 0, 0, 0
    rgb_norm = img_rgba[opaque][:, :3].astype(np.float64) / 255.0
    hues, sats = rgb_to_hue_sat(rgb_norm)
    fringe_pts = (hues >= 270.0) & (hues <= 340.0) & (sats > 0.35)
    total_fringe = int(np.sum(fringe_pts))

    # Calculate edge vs internal body fringe
    struct4 = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
    eroded = ndimage.binary_erosion(opaque, structure=struct4, iterations=1)
    edge = opaque & ~eroded

    fringe_full = np.zeros_like(opaque)
    fringe_full[opaque] = fringe_pts
    edge_fringe = int(np.sum(fringe_full & edge))
    body_fringe = total_fringe - edge_fringe

    return total_fringe, edge_fringe, body_fringe


def process_sprite_file(fpath):
    """Process a single sprite sheet file."""
    base_name = os.path.splitext(os.path.basename(fpath))[0]
    print(f"\nProcessing file: {fpath}")

    pil_img = Image.open(fpath).convert("RGBA")
    img_rgba = np.array(pil_img)
    orig_h, orig_w, _ = img_rgba.shape

    # 1. Background detection
    bg_rgb, has_alpha_bg = detect_background_color(img_rgba)
    hex_bg = f"#{bg_rgb[0]:02X}{bg_rgb[1]:02X}{bg_rgb[2]:02X}"
    print(f"  Detected background: {hex_bg} (RGB: {bg_rgb.tolist()}), has_alpha: {has_alpha_bg}")

    # 2. Masking
    bg_mask = compute_background_mask(img_rgba, bg_rgb, has_alpha_bg)

    # 3. Find frames & grid
    debug_path = os.path.join(TOOLS_DIR, f"debug_{base_name}.png")
    rows_groups, row_count, col_count = find_frames(bg_mask, orig_w, orig_h, debug_path, base_name)
    total_frames = sum(len(r) for r in rows_groups)
    print(f"  Grid detected: {row_count} rows x {col_count} columns ({total_frames} total frames)")

    # 4. Clean each frame
    frames_cleaned = []
    max_fw = 0
    max_fh = 0

    os.makedirs(FRAMES_DIR, exist_ok=True)

    for r_idx, r in enumerate(rows_groups):
        cleaned_row = []
        for c_idx, g in enumerate(r):
            x0 = max(0, g["x_min"] - 1)
            y0 = max(0, g["y_min"] - 1)
            x1 = min(orig_w, g["x_max"] + 2)
            y1 = min(orig_h, g["y_max"] + 2)

            crop_rgba = img_rgba[y0:y1, x0:x1, :].copy()
            crop_bg_mask = bg_mask[y0:y1, x0:x1].copy()

            cleaned_crop = clean_frame(crop_rgba, crop_bg_mask, bg_rgb)
            f_pil = Image.fromarray(cleaned_crop, mode="RGBA")

            bbox = f_pil.getbbox()
            if bbox:
                f_pil = f_pil.crop(bbox)

            max_fw = max(max_fw, f_pil.width)
            max_fh = max(max_fh, f_pil.height)
            cleaned_row.append(f_pil)

            frame_filename = f"{base_name}_r{r_idx}_c{c_idx}.png"
            f_pil.save(os.path.join(FRAMES_DIR, frame_filename))

        frames_cleaned.append(cleaned_row)

    # 5. Cell size calculation: smallest multiple of 16 >= max(fw, fh), minimum 128
    max_dim = max(max_fw, max_fh)
    cell_size = max(128, int(np.ceil(max_dim / 16.0) * 16))
    if "enemy_w4" in base_name:
        cell_size = max(192, cell_size)

    print(f"  Max frame size: {max_fw}x{max_fh} -> Destination cell size: {cell_size}px")

    # 6. Repack sheet
    sheet_pil, baseline, susp_frames = pack_sheet(frames_cleaned, cell_size, row_count, col_count)

    # 7. Quality check: remaining fringe count
    sheet_arr = np.array(sheet_pil)
    total_fringe, edge_fringe, body_fringe = count_fringe_pixels(sheet_arr)
    print(f"  Fringe analysis: edge={edge_fringe} (target: 0), internal body={body_fringe}, total={total_fringe}")

    # 8. Save outputs to assets/redesign/clean/
    os.makedirs(OUT_DIR, exist_ok=True)
    out_png = os.path.join(OUT_DIR, f"{base_name}.png")
    out_webp = os.path.join(OUT_DIR, f"{base_name}.webp")
    sheet_pil.save(out_png, format="PNG")
    sheet_pil.save(out_webp, format="WEBP", lossless=True)

    # Previews: white, black, green
    for bg_name, bg_color in [("white", (255, 255, 255)), ("black", (0, 0, 0)), ("green", (0, 255, 0))]:
        preview = Image.new("RGB", sheet_pil.size, bg_color)
        preview.paste(sheet_pil, (0, 0), sheet_pil)
        preview.save(os.path.join(OUT_DIR, f"{base_name}_preview_{bg_name}.png"))

    # Meta JSON
    meta = {
        "name": base_name,
        "cellSize": cell_size,
        "rows": row_count,
        "cols": col_count,
        "baseline": baseline,
        "sourceFile": os.path.basename(fpath),
        "edgeFringePixels": edge_fringe,
        "bodyTonePixels": body_fringe,
        "totalFringePixels": total_fringe,
        "suspiciousFrames": susp_frames
    }
    with open(os.path.join(OUT_DIR, f"{base_name}_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return {
        "name": base_name,
        "bg_hex": hex_bg,
        "grid": f"{row_count}x{col_count}",
        "cellSize": cell_size,
        "edgeFringe": edge_fringe,
        "totalFringe": total_fringe,
        "suspicious": ", ".join(susp_frames) if susp_frames else "هیچ (OK)"
    }


def main():
    print("=" * 70)
    print("      ابزار پردازش دقیق و کراپ هوشمند اسپرایت‌ها (v2.0)")
    print("=" * 70)

    files = find_input_files()
    if not files:
        print("هیچ فایل اسپرایتی برای پردازش یافت نشد.")
        return

    print(f"فایل‌های شناسایی‌شده برای پردازش ({len(files)} فایل):")
    for f in files:
        im = Image.open(f)
        print(f"  - {os.path.basename(f):<20} | ابعاد: {im.width}x{im.height} | مسیر: {f}")

    results = []
    for f in files:
        res = process_sprite_file(f)
        results.append(res)

    print("\n" + "=" * 80)
    print("                          گزارش نهایی پردازش")
    print("=" * 80)
    print(f"{'فایل':<15} | {'رنگ پس‌زمینه':<12} | {'ردیفxستون':<10} | {'اندازه سلول':<11} | {'پیکسل لبه (هدف: ۰)':<18} | {'وضعیت فریم‌ها'}")
    print("-" * 90)
    for r in results:
        edge_str = f"{r['edgeFringe']} (کل: {r['totalFringe']})"
        print(f"{r['name']:<15} | {r['bg_hex']:<12} | {r['grid']:<10} | {r['cellSize']:<11} | {edge_str:<18} | {r['suspicious']}")
    print("-" * 90)
    print(f"خروجی‌ها با موفقیت در مسیر زیر ذخیره شدند:\n  {OUT_DIR}\n")


if __name__ == "__main__":
    main()
