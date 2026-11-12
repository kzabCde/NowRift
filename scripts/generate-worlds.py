"""Generate original CC0 biome art. Existing pixel paths and frame grids are preserved.
Projectiles are owned by generate-effects.py and deliberately are not overwritten here.
"""
from pathlib import Path
import importlib.util
_spec = importlib.util.spec_from_file_location('world_art', Path(__file__).with_name('world-art.py'))
_art = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_art)
_art.worldset()
print('Generated four distinct original biome sets: terrain, props, animated enemies, bosses and previews. Projectile art preserved.')
