#!/usr/bin/env python3
"""Build a small, curated, game-ready art bundle from the approved ZIP library."""
from __future__ import annotations

import json
import os
import zipfile
from pathlib import Path
from typing import Any

from PIL import Image
from io import BytesIO

ROOT = Path.cwd()
OUT = ROOT / "public" / "assets" / "prototype"
RELEASE_DIR = Path(os.environ.get("BV_RELEASE_DIR", "/tmp/bv-release-assets"))

ARCHIVES = {
    "player": ROOT / "assets/beyond_the_veil_player_characters.zip",
    "enemies": ROOT / "assets/beyond_the_veil_enemies_pack.zip",
    "elite": RELEASE_DIR / "beyond_the_veil_elite_miniboss_pack.zip",
    "bosses": RELEASE_DIR / "beyond_the_veil_bosses_pack.zip",
    "vfx": ROOT / "assets/beyond_the_veil_combat_vfx_pack.zip",
    "loot": ROOT / "assets/beyond_the_veil_loot_objects_pack.zip",
    "forest": ROOT / "assets/cursed-forest-environment.zip",
    "cemetery": ROOT / "assets/forgotten-cemetery.zip",
    "dungeon": ROOT / "assets/abyssal-dungeon.zip",
    "swamp": ROOT / "assets/blighted-swamp.zip",
    "citadel": ROOT / "assets/cursed-citadel.zip",
}

ENEMY_SOURCE_MAP = {
    "rootbound-husk": ("enemies", "cursed_root_beast"),
    "thorn-pouncer": ("enemies", "twisted_forest_stalker"),
    "spore-spitter": ("enemies", "blighted_crow"),
    "gravebloom-nest": ("elite", "the_hollow_treant"),
    "briarback-charger": ("elite", "the_thorned_reaper"),
    "tomb-warden": ("enemies", "gravebound_skeleton"),
    "wailing-wisp": ("enemies", "tomb_wraith"),
    "bone-skitter": ("enemies", "bone_crawler"),
    "mourner-acolyte": ("elite", "the_mourning_specter"),
    "crypt-leaper": ("elite", "the_gravewarden"),
    "brass-sentinel": ("enemies", "abyssal_brute"),
    "ember-mortar": ("enemies", "bound_experiment"),
    "chain-duelist": ("enemies", "void_stalker"),
    "tunnel-burrower": ("elite", "the_abomination"),
    "rune-sapper": ("elite", "the_void_executioner"),
    "mire-lurker": ("enemies", "mire_toad"),
    "bog-leech": ("enemies", "venom_spitter"),
    "gas-sac": ("enemies", "rotting_treant"),
    "mire-witch": ("elite", "the_plague_mother"),
    "web-weaver": ("enemies", "rotting_treant"),
    "veil-stalker": ("enemies", "crimson_sentinel"),
    "frost-hound": ("enemies", "cursed_knight"),
    "mirror-mimic": ("enemies", "fallen_arbalist"),
    "soul-anchor": ("elite", "the_fallen_justiciar"),
    "dusk-revenant": ("elite", "the_blood_knight"),
}

BOSS_SOURCE_MAP = {
    "thorn-matriarch": "the_ancient_blight",
    "ossuary-king": "the_undying_monarch",
    "furnace-colossus": "the_void_devourer",
    "mire-oracle": "the_rotheart_abomination",
    "unwritten-regent": "the_fallen_sovereign",
}

REGION_ARCHIVES = {
    "cursed-forest": ("forest", "cursed_forest_terrain_atlas.png"),
    "forgotten-graveyard": ("cemetery", "forgotten_cemetery_terrain_atlas.png"),
    "deep-dungeon": ("dungeon", "abyssal_dungeon_terrain_atlas.png"),
    "rotten-swamp": ("swamp", "blighted_swamp_terrain_atlas.png"),
    "cursed-castle": ("citadel", "cursed_citadel_terrain_atlas.png"),
}


def open_zip(key: str) -> zipfile.ZipFile:
    path = ARCHIVES[key]
    if not path.is_file():
        raise FileNotFoundError(f"Required asset archive is missing: {path}")
    return zipfile.ZipFile(path)


def find_metadata(zf: zipfile.ZipFile, content_id: str) -> dict[str, Any]:
    for name in zf.namelist():
        if not name.endswith("/metadata.json"):
            continue
        try:
            data = json.loads(zf.read(name))
        except Exception:
            continue
        if data.get("enemyId") == content_id or data.get("bossId") == content_id or data.get("characterId") == content_id:
            return data
    raise KeyError(f"Metadata not found for asset id: {content_id}")


def animation_sheet(zf: zipfile.ZipFile, metadata: dict[str, Any], animation_name: str = "idle") -> tuple[bytes, int, int, dict[str, Any]]:
    animation = next((item for item in metadata.get("animations", []) if item.get("animationName") == animation_name), None)
    if not animation:
        raise KeyError(f"Animation {animation_name} missing for {metadata.get('enemyId') or metadata.get('bossId') or metadata.get('characterId')}")
    sheet_path = animation["spritesheetPath"]
    payload = zf.read(sheet_path)
    return payload, int(metadata["frameWidth"]), int(metadata["frameHeight"]), animation


def write_bytes(relative_path: str, payload: bytes) -> None:
    target = OUT / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)


def write_first_frame(relative_path: str, payload: bytes, frame_width: int, frame_height: int) -> None:
    image = Image.open(BytesIO(payload)).convert("RGBA")
    frame = image.crop((0, 0, frame_width, frame_height))
    buffer = BytesIO()
    frame.save(buffer, format="PNG", optimize=True)
    write_bytes(relative_path, buffer.getvalue())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, Any] = {
        "version": 1,
        "purpose": "Curated first-playable-prototype art bundle",
        "player": {},
        "enemies": {},
        "bosses": {},
        "loot": {},
        "regions": {},
        "projectile": {},
    }

    with open_zip("player") as zf:
        metadata = find_metadata(zf, "cursed_hunter")
        for anim_name in ("idle", "walk"):
            payload, fw, fh, animation = animation_sheet(zf, metadata, anim_name)
            file_name = f"characters/player/cursed-hunter-{anim_name}.png"
            write_bytes(file_name, payload)
            manifest["player"][anim_name] = {
                "file": f"/assets/prototype/{file_name}",
                "frameWidth": fw,
                "frameHeight": fh,
                "frameCount": int(animation["frameCount"]),
                "frameDuration": int(animation["frameDuration"]),
                "startFrameByDirection": animation.get("startFrameByDirection", {}),
                "directionOrder": animation.get("directionOrder", metadata.get("directionOrder", [])),
            }

    with open_zip("enemies") as normal_zf, open_zip("elite") as elite_zf:
        for game_id, (source_pack, source_id) in ENEMY_SOURCE_MAP.items():
            zf = normal_zf if source_pack == "enemies" else elite_zf
            metadata = find_metadata(zf, source_id)
            payload, fw, fh, animation = animation_sheet(zf, metadata, "idle")
            file_name = f"characters/enemies/{game_id}.png"
            write_bytes(file_name, payload)
            manifest["enemies"][game_id] = {
                "file": f"/assets/prototype/{file_name}",
                "sourceId": source_id,
                "sourcePack": source_pack,
                "frameWidth": fw,
                "frameHeight": fh,
                "frameCount": int(animation["frameCount"]),
            }

    with open_zip("bosses") as zf:
        for game_id, source_id in BOSS_SOURCE_MAP.items():
            metadata = find_metadata(zf, source_id)
            payload, fw, fh, animation = animation_sheet(zf, metadata, "idle")
            file_name = f"characters/bosses/{game_id}.png"
            write_bytes(file_name, payload)
            manifest["bosses"][game_id] = {
                "file": f"/assets/prototype/{file_name}",
                "sourceId": source_id,
                "frameWidth": fw,
                "frameHeight": fh,
                "frameCount": int(animation["frameCount"]),
                "frameDuration": int(animation["frameDuration"]),
            }

    with open_zip("loot") as zf:
        loot_manifest = json.loads(zf.read("assets/loot_and_objects_manifest.json"))
        xp = next(item for item in loot_manifest["loot"] if item["id"] == "loot_xp_crystal")
        xp_payload = zf.read(xp["spritesheetPath"])
        write_first_frame("loot/xp-crystal.png", xp_payload, int(xp["frameWidth"]), int(xp["frameHeight"]))
        manifest["loot"]["xp"] = {"file": "/assets/prototype/loot/xp-crystal.png", "frameWidth": xp["frameWidth"], "frameHeight": xp["frameHeight"]}

        chest = next(item for item in loot_manifest["chests"] if item["id"] == "chest_common")
        chest_file = "objects/chest-common.png"
        write_bytes(chest_file, zf.read(chest["spritesheetPath"]))
        manifest["loot"]["chest"] = {
            "file": f"/assets/prototype/{chest_file}",
            "frameWidth": int(chest["frameWidth"]),
            "frameHeight": int(chest["frameHeight"]),
            "frameCount": int(chest["frameCount"]),
        }

    with open_zip("vfx") as zf:
        vfx_manifest = json.loads(zf.read("assets/vfx/vfx_manifest.json"))
        projectile = next(item for item in vfx_manifest["effects"] if item["vfxId"] == "proj_veil_bolt")
        projectile_payload = zf.read(projectile["spritesheetPath"])
        write_first_frame("vfx/veil-bolt.png", projectile_payload, int(projectile["frameWidth"]), int(projectile["frameHeight"]))
        manifest["projectile"] = {"file": "/assets/prototype/vfx/veil-bolt.png"}

    for region_id, (archive_key, atlas_name) in REGION_ARCHIVES.items():
        with open_zip(archive_key) as zf:
            candidates = [name for name in zf.namelist() if name.endswith("/atlases/" + atlas_name)]
            if not candidates:
                raise FileNotFoundError(f"Terrain atlas not found: {atlas_name}")
            atlas = Image.open(BytesIO(zf.read(candidates[0]))).convert("RGBA")
            tile = atlas.crop((0, 0, 32, 32))
            buffer = BytesIO()
            tile.save(buffer, format="PNG", optimize=True)
            file_name = f"regions/{region_id}-ground.png"
            write_bytes(file_name, buffer.getvalue())
            manifest["regions"][region_id] = {"file": f"/assets/prototype/{file_name}", "tileWidth": 32, "tileHeight": 32}

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared curated prototype art bundle at {OUT}")
    print(f"Player: {len(manifest['player'])} animations")
    print(f"Enemies: {len(manifest['enemies'])} mapped sprites")
    print(f"Bosses: {len(manifest['bosses'])} animated spritesheets")
    print(f"Regions: {len(manifest['regions'])} ground tiles")
    print(f"Total files: {sum(1 for p in OUT.rglob('*') if p.is_file())}")


if __name__ == "__main__":
    main()
