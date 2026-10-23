#!/bin/sh
# Copies the carried-over art into v2: the sprite sets v2 uses and the effects atlas,
# then cuts the portraits for the team screen.
# Run from the repository root: sh v2/tools/copy-assets.sh
set -e
SETS="kael_sword eiryn aerys nox eloryn braxen guard_gate spearwoman poacher erdra_baker hooded_follower golem_a beastfolk_f
caged_creature bandit_broad bandit_knife bandit_grabber bandit_lookout thug_a goblin goblin_spear goblin_archer goblin_hexer ogre"
mkdir -p v2/assets/sprites v2/assets/fx
for s in $SETS; do
  cp assets/pixel/$s.json v2/assets/sprites/
  cp assets/pixel/${s}_[0-9]*.png v2/assets/sprites/
done
cp assets/fx/fx.json assets/fx/fx_0.png v2/assets/fx/
python3 v2/tools/portraits.py
echo "copied: $SETS + fx + portraits"
