from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageOps
from pathlib import Path
import json
import random
import math
import hashlib

ROOT = Path("asset-inspection/extracted")
OUT = Path("public/assets/ui")
OUT.mkdir(parents=True, exist_ok=True)


def atlas(folder: str, prefix: str):
    base = ROOT / folder
    png = next(base.glob("**/" + prefix + ".png"))
    metadata = next(base.glob("**/" + prefix + ".json"))
    image = Image.open(png).convert("RGBA")
    frames = json.loads(metadata.read_text(encoding="utf-8"))["frames"]

    def get(name: str):
        frame = frames[name]["frame"]
        return image.crop((
            frame["x"], frame["y"],
            frame["x"] + frame["w"], frame["y"] + frame["h"]
        ))

    return get, list(frames), png, metadata


def paste_height(canvas, sprite, center_x: int, bottom_y: int, target_height: int):
    target_width = max(1, round(sprite.width * target_height / sprite.height))
    scaled = sprite.resize((target_width, target_height), Image.Resampling.NEAREST)
    canvas.alpha_composite(scaled, (int(center_x - target_width / 2), int(bottom_y - target_height)))


def gradient(size, top, bottom):
    width, height = size
    image = Image.new("RGBA", size)
    pixels = image.load()
    for y in range(height):
        t = y / max(1, height - 1)
        color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3)) + (255,)
        for x in range(width):
            pixels[x, y] = color
    return image


sources = []


def register_source(label, png, metadata=None):
    sources.append({
        "label": label,
        "image": str(png.relative_to(ROOT)),
        "metadata": str(metadata.relative_to(ROOT)) if metadata else None,
        "sha256": hashlib.sha256(png.read_bytes()).hexdigest()
    })


# Main menu vista: a real pixel-art composition made from the repository's
# cursed-citadel environment atlas, not a flattened UI screenshot.
get, names, source_png, source_json = atlas("cursed-citadel", "cursed_citadel_props_atlas")
register_source("cursed-citadel props", source_png, source_json)
base = gradient((640, 360), (10, 18, 34), (22, 25, 35))
draw = ImageDraw.Draw(base, "RGBA")
random.seed(31)

for _ in range(95):
    x = random.randrange(640)
    y = random.randrange(10, 235)
    radius = random.choice([1, 1, 1, 2])
    draw.rectangle((x, y, x + radius, y + radius),
                   fill=(180, 194, 212, random.randrange(35, 110)))

halo = Image.new("RGBA", base.size)
halo_draw = ImageDraw.Draw(halo, "RGBA")
halo_draw.ellipse((410, 20, 560, 170), fill=(110, 154, 185, 26))
halo_draw.ellipse((438, 42, 530, 134), fill=(194, 213, 221, 235))
halo_draw.ellipse((465, 26, 550, 117), fill=(10, 18, 34, 255))
base.alpha_composite(halo)

draw = ImageDraw.Draw(base, "RGBA")
for i in range(18):
    x = i * 42 - 10
    height = random.randrange(42, 112)
    draw.rectangle((x, 220 - height, x + random.randrange(22, 44), 222),
                   fill=(12, 19, 31, 210))

paste_height(base, get("citadel_tower_central_keep_01"), 430, 240, 185)
paste_height(base, get("citadel_tower_round_01"), 315, 250, 150)
paste_height(base, get("citadel_tower_square_01"), 540, 250, 145)
paste_height(base, get("citadel_spire_gothic_01"), 365, 235, 150)
paste_height(base, get("citadel_spire_corrupted_01"), 505, 225, 160)
paste_height(base, get("citadel_tower_ruined_01"), 245, 255, 120)
paste_height(base, get("citadel_arch_fortress_01"), 590, 320, 230)
paste_height(base, get("citadel_statue_angel_corrupted_01"), 70, 310, 132)
paste_height(base, get("citadel_tree_courtyard_dead_01"), 165, 328, 138)
paste_height(base, get("citadel_floor_lamp_royal_01"), 505, 333, 82)
paste_height(base, get("citadel_torch_crimson_01"), 575, 345, 52)
paste_height(base, get("citadel_staircase_monumental_01"), 350, 360, 120)
paste_height(base, get("citadel_bridge_stone_01"), 465, 365, 118)

fog = Image.new("RGBA", base.size)
fog_draw = ImageDraw.Draw(fog, "RGBA")
for i in range(8):
    y = 230 + i * 16
    fog_draw.rectangle((0, y, 640, 360), fill=(11, 17, 27, 12 + i * 2))
base.alpha_composite(fog.filter(ImageFilter.GaussianBlur(8)))

shade = Image.new("RGBA", base.size)
shade_draw = ImageDraw.Draw(shade, "RGBA")
for x in range(300):
    alpha = int(165 * (1 - x / 300))
    shade_draw.line((x, 0, x, 360), fill=(3, 7, 13, alpha))
shade_draw.rectangle((0, 0, 640, 360), outline=(174, 145, 99, 75), width=2)
base.alpha_composite(shade)

menu = base.resize((1280, 720), Image.Resampling.NEAREST)
menu.save(OUT / "menu-backdrop.png")
selection = ImageEnhance.Color(ImageEnhance.Brightness(menu).enhance(0.76)).enhance(0.82)
selection.save(OUT / "selection-backdrop.png")
preparation = ImageEnhance.Color(ImageEnhance.Brightness(menu).enhance(0.64)).enhance(0.72)
preparation.save(OUT / "preparation-backdrop.png")


# Five region cards composed from each region's actual terrain and prop atlases.
regions = [
    ("cursed-forest", "cursed-forest-environment", "cursed_forest_nature_atlas",
     "cursed-forest-environment", "cursed_forest_terrain_atlas",
     ["forest_tree_ancient_roots_01", "forest_tree_dead_oak_01",
      "forest_crystal_turquoise_01", "forest_bush_dense_01", "forest_mushroom_violet_01"],
     (25, 42, 34), (87, 126, 79)),
    ("forgotten-graveyard", "forgotten-cemetery", "forgotten_cemetery_props_atlas",
     "forgotten-cemetery", "forgotten_cemetery_terrain_atlas",
     ["cemetery_chapel_facade_ruined_01", "cemetery_gravestone_gothic_01",
      "cemetery_crypt_entrance_open_01", "cemetery_cursed_monument_flame_01",
      "cemetery_gothic_pillar_pair_01"],
     (25, 27, 38), (95, 91, 106)),
    ("deep-dungeon", "abyssal-dungeon", "abyssal_dungeon_props_atlas",
     "abyssal-dungeon", "abyssal_dungeon_terrain_atlas",
     ["dungeon_arch_gothic_01", "dungeon_machine_gear_large_01",
      "dungeon_gate_iron_open", "dungeon_torch_fire_01", "dungeon_lava_fissure_01"],
     (28, 28, 34), (113, 82, 55)),
    ("rotten-swamp", "blighted-swamp", "blighted_swamp_props_atlas",
     "blighted-swamp", "blighted_swamp_terrain_atlas",
     ["swamp_tree_ancient_01", "swamp_tree_submerged_01",
      "swamp_root_arch_large_01", "swamp_plant_reeds_01", "swamp_fog_teal_01"],
     (20, 38, 32), (72, 103, 77)),
    ("cursed-castle", "cursed-citadel", "cursed_citadel_props_atlas",
     "cursed-citadel", "cursed_citadel_terrain_atlas",
     ["citadel_tower_central_keep_01", "citadel_spire_gothic_01",
      "citadel_gate_royal_ceremonial_01", "citadel_statue_knight_kneeling_01",
      "citadel_veil_portal_active_01"],
     (22, 21, 32), (86, 62, 94)),
]

for index, (slug, prop_folder, prop_prefix, terrain_folder, terrain_prefix,
            prop_names, top_color, bottom_color) in enumerate(regions):
    get_props, prop_keys, prop_png, prop_json = atlas(prop_folder, prop_prefix)
    get_terrain, terrain_keys, terrain_png, terrain_json = atlas(terrain_folder, terrain_prefix)
    register_source(slug + " props", prop_png, prop_json)
    register_source(slug + " terrain", terrain_png, terrain_json)

    canvas = gradient((256, 144), top_color, bottom_color)
    tile_names = [
        name for name in terrain_keys
        if any(token in name for token in ("ground", "floor", "soil", "moss", "stone", "path", "water"))
    ] or terrain_keys[:4]
    random.seed(100 + index)
    for y in range(0, 144, 16):
        for x in range(0, 256, 16):
            tile = get_terrain(random.choice(tile_names)).resize((16, 16), Image.Resampling.NEAREST)
            canvas.alpha_composite(tile, (x, y))

    veil = Image.new("RGBA", canvas.size)
    ImageDraw.Draw(veil, "RGBA").rectangle((0, 0, 256, 144), fill=(8, 12, 18, 46))
    canvas.alpha_composite(veil)

    placements = [(38, 116, 58), (105, 122, 72), (185, 118, 62), (230, 130, 40), (145, 140, 28)]
    for name, (x, bottom_y, height) in zip(prop_names, placements):
        if name in prop_keys:
            paste_height(canvas, get_props(name), x, bottom_y, height)

    mist = Image.new("RGBA", canvas.size)
    mist_draw = ImageDraw.Draw(mist, "RGBA")
    for y in range(100, 144, 8):
        mist_draw.rectangle((0, y, 256, 144),
                            fill=(*bottom_color, max(0, min(60, (y - 100) * 2))))
    canvas.alpha_composite(mist.filter(ImageFilter.GaussianBlur(5)))

    vignette = Image.new("RGBA", canvas.size)
    ImageDraw.Draw(vignette, "RGBA").rectangle((0, 0, 256, 144),
                                                outline=(3, 5, 9, 130), width=10)
    canvas.alpha_composite(vignette)
    canvas.resize((512, 288), Image.Resampling.NEAREST).save(OUT / ("region-card-" + slug + ".png"))

    world_props = Path("public/assets/world/props")
    world_props.mkdir(parents=True, exist_ok=True)
    for prop_name in prop_names:
        prop = get_props(prop_name)
        prop_path = world_props / (slug + "-" + prop_name + ".png")
        prop.save(prop_path)
        register_source(slug + " world prop " + prop_name, prop_png, prop_json)


# Use the seven approved screen references as actual visual source material.
# Dynamic Phaser controls are drawn over masked reference backgrounds; screenshots
# are never used as flattened, non-interactive screens.
reference_sources = []


def reference_image(filename: str):
    path = Path("beyond-the-veil-ui-design") / filename
    with Image.open(path) as source:
        image = ImageOps.fit(source.convert("RGBA"), (1280, 720), method=Image.Resampling.LANCZOS)
    reference_sources.append({
        "file": str(path),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()
    })
    return image


def mask_panel(image, box, alpha=255, radius=10):
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(overlay, "RGBA").rounded_rectangle(
        box, radius=radius, fill=(5, 8, 14, alpha)
    )
    image.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(3)))


def save_backdrop(image, filename):
    image.convert('RGB').save(OUT / filename, 'JPEG', quality=90, optimize=True, progressive=True)


# Main menu keeps the supplied title artwork and gothic city, while the old
# baked menu labels are masked so all controls remain live Phaser objects.
menu_reference = reference_image("01_main_menu.png")
mask_panel(menu_reference, (0, 218, 452, 640), 255, 4)
mask_panel(menu_reference, (0, 674, 330, 720), 255, 0)
save_backdrop(menu_reference, "menu-backdrop.jpg")

# Hunter selection retains the original cathedral atmosphere; all static
# labels, portraits and the old center character are hidden beneath live UI.
selection_reference = reference_image("02_hunter_selection.png")
for box in [
    (380, 12, 900, 128),
    (48, 100, 180, 652),
    (390, 148, 820, 570),
    (852, 145, 1180, 548),
    (770, 580, 1200, 690),
]:
    mask_panel(selection_reference, box, 255, 8)
save_backdrop(selection_reference, "selection-backdrop.jpg")

# Region screen: five portrait-format card artworks are extracted from the
# supplied reference; all headings, locks and controls are recreated in Phaser.
region_reference = reference_image("03_region_selection.png")
for box in [(280, 8, 950, 128), (48, 138, 1170, 548), (40, 545, 1180, 700)]:
    mask_panel(region_reference, box, 255, 8)
save_backdrop(region_reference, "region-selection-backdrop.jpg")

region_source_path = Path("beyond-the-veil-ui-design/03_region_selection.png")
with Image.open(region_source_path) as source:
    source = source.convert("RGBA")
    scale_x, scale_y = source.width / 1200, source.height / 670
    card_boxes = [
        (76, 212, 266, 408),
        (296, 212, 486, 408),
        (516, 212, 706, 408),
        (736, 212, 926, 408),
        (956, 212, 1146, 408),
    ]
    region_slugs = [
        "cursed-forest", "forgotten-graveyard", "deep-dungeon",
        "rotten-swamp", "cursed-castle"
    ]
    for slug, (x1, y1, x2, y2) in zip(region_slugs, card_boxes):
        crop = source.crop((
            round(x1 * scale_x), round(y1 * scale_y),
            round(x2 * scale_x), round(y2 * scale_y)
        ))
        crop = ImageOps.fit(crop, (512, 384), method=Image.Resampling.LANCZOS)
        crop.save(OUT / ("region-card-" + slug + ".png"))
reference_sources.append({
    "file": str(region_source_path),
    "sha256": hashlib.sha256(region_source_path.read_bytes()).hexdigest()
})

# Run preparation uses its own reference hall; live loadout/profile controls
# are drawn over the masked panel regions.
preparation_reference = reference_image("04_run_preparation.png")
for box in [
    (340, 10, 970, 125),
    (55, 135, 520, 620),
    (565, 135, 1170, 620),
    (35, 620, 1190, 704),
]:
    mask_panel(preparation_reference, box, 255, 8)
save_backdrop(preparation_reference, "preparation-backdrop.jpg")

# Extract the three large reference upgrade glyphs for dynamic level-up cards.
levelup_path = Path("beyond-the-veil-ui-design/06_level_up.png")
with Image.open(levelup_path) as source:
    source = source.convert("RGBA")
    sx, sy = source.width / 1200, source.height / 675
    icon_boxes = [
        ("upgrade-icon-weapon.png", (324, 218, 454, 330)),
        ("upgrade-icon-passive.png", (560, 218, 690, 330)),
        ("upgrade-icon-base.png", (800, 218, 930, 330)),
    ]
    for output_name, (x1, y1, x2, y2) in icon_boxes:
        icon = source.crop((round(x1*sx), round(y1*sy), round(x2*sx), round(y2*sy)))
        ImageOps.fit(icon, (128, 128), method=Image.Resampling.LANCZOS).save(OUT / output_name)
reference_sources.append({
    "file": str(levelup_path),
    "sha256": hashlib.sha256(levelup_path.read_bytes()).hexdigest()
})

# The reference game-over composition supplies the skull/veil boss artwork.
# Mask only the old result text and controls; Phaser renders live run results.
game_over_reference = reference_image("07_game_over.png")
for box in [
    (350, 245, 940, 342),
    (350, 350, 930, 520),
    (320, 530, 950, 650),
]:
    mask_panel(game_over_reference, box, 255, 8)
save_backdrop(game_over_reference, "game-over-backdrop.jpg")

# The original hunter-selection portraits are cropped into a five-frame sheet.
portrait_path = Path("beyond-the-veil-ui-design/02_hunter_selection.png")
with Image.open(portrait_path) as source:
    source = source.convert("RGBA")
    sx, sy = source.width / 1200, source.height / 670
    portrait_y = [(340, 405), (115, 165), (175, 238), (255, 320), (420, 485)]
    sheet = Image.new("RGBA", (800, 160), (8, 11, 17, 255))
    for index, (top, bottom) in enumerate(portrait_y):
        crop = source.crop((
            round(78*sx), round(top*sy), round(144*sx), round(bottom*sy)
        ))
        portrait = ImageOps.fit(crop, (160, 160), method=Image.Resampling.LANCZOS)
        sheet.alpha_composite(portrait, (index * 160, 0))
    sheet.save(OUT / "hunter-portraits.png")
reference_sources.append({
    "file": str(portrait_path),
    "sha256": hashlib.sha256(portrait_path.read_bytes()).hexdigest()
})


# Remove superseded PNG backdrops so the browser build does not ship duplicate
# multi-megabyte background files alongside the compressed JPEG versions.
for obsolete in [
    "menu-backdrop.png", "selection-backdrop.png", "region-selection-backdrop.png",
    "preparation-backdrop.png", "game-over-backdrop.png"
]:
    (OUT / obsolete).unlink(missing_ok=True)

manifest = {
    "version": 1,
    "generatedBy": "scripts/build-ui-art.py",
    "method": "Reference-derived masked JPEG backdrops, cropped reference portraits/cards/icons, and Pillow compositions from repository ZIP asset atlases",
    "outputs": [
        "menu-backdrop.jpg", "selection-backdrop.jpg", "region-selection-backdrop.jpg",
        "preparation-backdrop.jpg", "game-over-backdrop.jpg", "hunter-portraits.png",
        "upgrade-icon-weapon.png", "upgrade-icon-passive.png", "upgrade-icon-base.png",
        "region-card-cursed-forest.png", "region-card-forgotten-graveyard.png",
        "region-card-deep-dungeon.png", "region-card-rotten-swamp.png",
        "region-card-cursed-castle.png"
    ] + [
        "world/props/" + slug + "-" + prop_name + ".png"
        for slug, _, _, _, _, prop_names, _, _ in regions
        for prop_name in prop_names
    ],
    "sources": sources,
    "referenceSources": reference_sources
}
(OUT / "generated-art-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Generated", len(manifest["outputs"]), "UI art assets.")
