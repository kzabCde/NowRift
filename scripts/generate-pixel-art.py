"""Reproduce all committed original gameplay art. Requires Pillow; runtime needs none."""
from pathlib import Path
import subprocess, sys
root=Path(__file__).resolve().parent.parent
# The final overlays intentionally follow the compatible legacy generators.
for generator in ['character-art.py','generate-assets.py','generate-worlds.py','generate-haven.py','generate-items.py','character-layers.py','enrich-environment.py','generate-effects.py','generate-weapon-evolution.py']:
    subprocess.run([sys.executable,str(root/'scripts'/generator)],cwd=root,check=True)
print('All original pixel art regenerated. Run npm run assets:index after changing art sources.')
