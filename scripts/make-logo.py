#!/usr/bin/env python3
"""
Generates the ProFit brand assets:
  public/logo.png       — full lockup (mark + wordmark), transparent bg
  public/logo-mark.png  — square mark on dark rounded tile (favicon/app icon)

Mark concept: a barbell rising like a profit chart, tipped with an arrowhead —
fitness + growth in one shape. Brand blue: #2e7cf6 (matches --color-primary).
"""

from PIL import Image, ImageDraw, ImageFont

BLUE = (46, 124, 246, 255)        # #2e7cf6
BLUE_LIGHT = (107, 163, 248, 255) # #6ba3f8
WHITE = (230, 237, 243, 255)      # #e6edf3
DARK = (17, 22, 29, 255)          # #11161d (surface)

S = 4  # supersampling factor


def rounded_rect(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def make_mark(size=400):
    """Horizontal barbell w/ arrow, then rotated upward."""
    w, h = size * S, size * S
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    cy = h // 2
    bar_t = int(h * 0.045)          # bar half-thickness
    bar_x0, bar_x1 = int(w * 0.10), int(w * 0.76)

    # bar
    rounded_rect(d, (bar_x0, cy - bar_t, bar_x1, cy + bar_t), bar_t, BLUE)

    # arrowhead cap at the right end (clean chevron)
    ah = int(h * 0.095)
    d.polygon(
        [
            (bar_x1 - int(ah * 0.25), cy - ah),
            (bar_x1 + int(ah * 1.05), cy),
            (bar_x1 - int(ah * 0.25), cy + ah),
        ],
        fill=BLUE,
    )

    # plates: outer (short) + inner (tall) pairs on both sides
    def plate(cx, half_h, half_w, color):
        rounded_rect(
            d, (cx - half_w, cy - half_h, cx + half_w, cy + half_h),
            half_w, color,
        )

    tall, short = int(h * 0.185), int(h * 0.125)
    pw = int(h * 0.034)
    plate(int(w * 0.20), short, pw, BLUE_LIGHT)
    plate(int(w * 0.27), tall, pw, BLUE)
    plate(int(w * 0.55), tall, pw, BLUE)
    plate(int(w * 0.62), short, pw, BLUE_LIGHT)

    img = img.rotate(22, resample=Image.BICUBIC, expand=True)
    img = img.crop(img.getbbox())
    return img


def text_size(font, s):
    box = font.getbbox(s)
    return box[2] - box[0], box[3] - box[1], box


def make_lockup():
    font = ImageFont.truetype(
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 150 * S
    )
    pro_w, _, _ = text_size(font, "Pro")
    fit_w, _, _ = text_size(font, "Fit")
    _, cap_h, cap_box = text_size(font, "PF")

    mark = make_mark(400)
    # scale mark to sit slightly taller than the caps
    target_h = int(cap_h * 1.45)
    mark = mark.resize(
        (int(mark.width * target_h / mark.height), target_h), Image.LANCZOS
    )
    gap = 22 * S
    pad = 24 * S
    text_w = pro_w + fit_w + int(6 * S)

    W = pad + mark.width + gap + text_w + pad + int(10 * S)
    H = max(mark.height, cap_h) + pad * 2
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    img.alpha_composite(mark, (pad, (H - mark.height) // 2))

    d = ImageDraw.Draw(img)
    tx = pad + mark.width + gap
    ty = (H - cap_h) // 2 - cap_box[1]
    d.text((tx, ty), "Pro", font=font, fill=WHITE)
    d.text((tx + pro_w + int(6 * S), ty), "Fit", font=font, fill=BLUE)

    img = img.crop(img.getbbox())
    # pad a little back
    out = Image.new("RGBA", (img.width + 8 * S, img.height + 8 * S), (0, 0, 0, 0))
    out.alpha_composite(img, (4 * S, 4 * S))
    out = out.resize((out.width // S, out.height // S), Image.LANCZOS)
    return out


def make_tile():
    size = 256 * S
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, size, size), radius=size // 5, fill=DARK)
    mark = make_mark(400).resize((int(size * 0.82),) * 2, Image.LANCZOS)
    img.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return img.resize((512, 512), Image.LANCZOS)


if __name__ == "__main__":
    import os

    root = os.path.join(os.path.dirname(__file__), "..", "public")
    os.makedirs(root, exist_ok=True)
    make_lockup().save(os.path.join(root, "logo.png"))
    make_tile().save(os.path.join(root, "logo-mark.png"))
    print("wrote public/logo.png + public/logo-mark.png")
