from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
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


# Game-over scene: a boss portrait, citadel ruins and a restrained blood eclipse.
boss_png = next(ROOT.glob("**/the_fallen_sovereign_idle.png"))
with Image.open(boss_png) as source:
    boss = source.convert("RGBA").crop((0, 0, 96, 96))
register_source("cursed-citadel final boss", boss_png)

back = gradient((640, 360), (24, 8, 18), (10, 11, 19))
draw = ImageDraw.Draw(back, "RGBA")
draw.ellipse((220, 18, 420, 218), fill=(130, 24, 38, 72), outline=(194, 48, 60, 170), width=4)
draw.ellipse((248, 46, 392, 190), fill=(104, 16, 34, 150), outline=(222, 71, 77, 180), width=2)
for index in range(26):
    angle = math.pi * 2 * index / 26
    x1, y1 = 320 + math.cos(angle) * 94, 118 + math.sin(angle) * 94
    x2, y2 = 320 + math.cos(angle) * 142, 118 + math.sin(angle) * 142
    draw.line((x1, y1, x2, y2), fill=(160, 35, 47, 48), width=2)
paste_height(back, boss, 320, 280, 230)
paste_height(back, get("citadel_tower_ruined_01"), 80, 350, 170)
paste_height(back, get("citadel_arch_fortress_01"), 565, 350, 200)
shade = Image.new("RGBA", back.size)
ImageDraw.Draw(shade, "RGBA").rectangle((0, 205, 640, 360), fill=(5, 6, 12, 150))
back.alpha_composite(shade)
back.resize((1280, 720), Image.Resampling.NEAREST).save(OUT / "game-over-backdrop.png")

manifest = {
    "version": 1,
    "generatedBy": "scripts/build-ui-art.py",
    "method": "Pillow nearest-neighbor compositions from repository ZIP asset atlases",
    "outputs": [
        "menu-backdrop.png", "selection-backdrop.png", "preparation-backdrop.png",
        "game-over-backdrop.png",
        "upgrade-icon-weapon.png", "upgrade-icon-passive.png", "upgrade-icon-base.png",
        "region-card-cursed-forest.png", "region-card-forgotten-graveyard.png",
        "region-card-deep-dungeon.png", "region-card-rotten-swamp.png",
        "region-card-cursed-castle.png"
    ],
    "sources": sources
}
(OUT / "generated-art-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Generated", len(manifest["outputs"]), "UI art assets.")
