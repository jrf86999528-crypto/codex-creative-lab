from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path("/Users/a123/Documents/codex")
OUT_DIR = ROOT / "output" / "automation" / "openclaw_skills_post"
OUT_DIR.mkdir(parents=True, exist_ok=True)

FONT_PATH = Path("/System/Library/Fonts/STHeiti Light.ttc")
BG_FILES = [
    ROOT / "output" / "automation" / "jimeng_bg_1.webp",
    ROOT / "output" / "automation" / "jimeng_bg_2.webp",
    ROOT / "output" / "automation" / "jimeng_bg_3.webp",
    ROOT / "output" / "automation" / "jimeng_bg_4.webp",
]

PAGES = [
    {
        "file": "01-cover.png",
        "badge": "OpenClaw 实战",
        "title": "最值得先装的\n5 个 Skill",
        "subtitle": "别先折腾复杂 agent\n先把真正提效的工具链装对",
        "bullets": ["网页自动化", "桌面排障", "CI 修复", "官方文档", "表格/报告处理"],
    },
    {
        "file": "02-why-skills.png",
        "badge": "为什么先看 Skill",
        "title": "同一个模型\n差距在 Skill 组合",
        "subtitle": "把聊天能力，变成可执行工作流",
        "bullets": [
            "会操作网页，效率直接翻倍",
            "会看日志，修 bug 更快",
            "会处理文件，才像真助理",
        ],
    },
    {
        "file": "03-playwright-screenshot.png",
        "badge": "先装 1 / 2",
        "title": "playwright + screenshot",
        "subtitle": "一套负责执行，一套负责兜底",
        "bullets": [
            "playwright：登录、抓数、填表、跑流程",
            "screenshot：桌面 App、系统页、异常态排障",
            "最适合真实业务自动化",
        ],
    },
    {
        "file": "04-docs-ci.png",
        "badge": "再装 3 / 4",
        "title": "openai-docs + gh-fix-ci",
        "subtitle": "写接口和修 PR 时最省时间",
        "bullets": [
            "openai-docs：少走文档弯路",
            "gh-fix-ci：直接看 Actions 日志定位失败点",
            "适合开发流、联调流、发版流",
        ],
    },
    {
        "file": "05-spreadsheet-summary.png",
        "badge": "第 5 个 + 总结",
        "title": "spreadsheet / pdf",
        "subtitle": "把 AI 从聊天，拉进交付",
        "bullets": [
            "表格整理、对账、批量改写很高频",
            "报告、材料、附件处理很常见",
            "我的常用组合：playwright + screenshot + gh-fix-ci",
        ],
    },
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size=size)


def fit_background(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    tw, th = size
    src = image.convert("RGB")
    ratio = max(tw / src.width, th / src.height)
    resized = src.resize((int(src.width * ratio), int(src.height * ratio)))
    left = (resized.width - tw) // 2
    top = (resized.height - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    x: int,
    y: int,
    max_chars: int,
    line_gap: int,
) -> int:
    cursor_y = y
    for raw_line in text.splitlines():
        for line in wrap(raw_line, width=max_chars) or [""]:
            draw.text((x, cursor_y), line, font=font, fill=fill)
            cursor_y += font.size + line_gap
    return cursor_y


def draw_text_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    box: tuple[int, int, int, int],
) -> None:
    left, top, right, bottom = box
    text_box = draw.textbbox((0, 0), text, font=font)
    text_w = text_box[2] - text_box[0]
    text_h = text_box[3] - text_box[1]
    x = left + (right - left - text_w) / 2
    y = top + (bottom - top - text_h) / 2 - text_box[1]
    draw.text((x, y), text, font=font, fill=fill)


def build_page(index: int, bg_path: Path, page: dict[str, object]) -> Path:
    canvas = fit_background(Image.open(bg_path), (1080, 1440))
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius=4))

    overlay = Image.new("RGBA", canvas.size, (8, 17, 34, 130))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay)

    card = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    card_draw = ImageDraw.Draw(card)
    card_draw.rounded_rectangle((70, 70, 1010, 1370), radius=42, fill=(248, 250, 255, 235))
    card_draw.rounded_rectangle((110, 110, 340, 166), radius=28, fill=(40, 106, 255, 255))
    canvas = Image.alpha_composite(canvas, card)

    # Add the unblurred hero image for more structure.
    hero_raw = Image.open(bg_path).convert("RGB")
    hero = fit_background(hero_raw, (820, 420))
    hero_mask = Image.new("L", hero.size, 0)
    ImageDraw.Draw(hero_mask).rounded_rectangle((0, 0, hero.width, hero.height), radius=32, fill=255)
    hero_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    hero_layer.paste(hero.convert("RGBA"), (130, 860), hero_mask)
    canvas = Image.alpha_composite(canvas, hero_layer)

    draw = ImageDraw.Draw(canvas)
    badge_font = load_font(28)
    title_font = load_font(74)
    subtitle_font = load_font(34)
    bullet_font = load_font(34)
    small_font = load_font(24)

    draw_text_centered(draw, str(page["badge"]), badge_font, (255, 255, 255), (110, 110, 340, 166))
    draw.text((130, 230), str(page["title"]), font=title_font, fill=(18, 26, 43), spacing=6)
    draw_wrapped(draw, str(page["subtitle"]), subtitle_font, (66, 78, 95), 130, 430, 22, 10)

    box_top = 580
    for i, bullet in enumerate(page["bullets"]):
        y = box_top + i * 86
        draw.rounded_rectangle((130, y, 950, y + 62), radius=20, fill=(234, 241, 255, 255))
        draw.ellipse((148, y + 15, 180, y + 47), fill=(40, 106, 255, 255))
        draw_text_centered(draw, str(i + 1), small_font, (255, 255, 255), (148, y + 15, 180, y + 47))
        draw_text_centered(draw, str(bullet), bullet_font, (22, 35, 59), (205, y + 8, 930, y + 54))

    footer = f"{index + 1}/5  OpenClaw Skill Map"
    draw.text((130, 1310), footer, font=small_font, fill=(96, 108, 128))

    out_path = OUT_DIR / str(page["file"])
    canvas.convert("RGB").save(out_path, quality=95)
    return out_path


def main() -> None:
    generated = []
    for index, page in enumerate(PAGES):
        bg_path = BG_FILES[index % len(BG_FILES)]
        generated.append(build_page(index, bg_path, page))
    for item in generated:
        print(item)


if __name__ == "__main__":
    main()
