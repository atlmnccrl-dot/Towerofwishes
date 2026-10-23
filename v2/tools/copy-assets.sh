#!/bin/sh
# Copies the carried-over art into v2: the sprite sets v2 uses and the effects atlas.
# Run from the repository root: sh v2/tools/copy-assets.sh
set -e
SETS="kael_sword eiryn bandit_broad bandit_knife bandit_grabber bandit_lookout"
for s in $SETS; do
  cp assets/pixel/$s.json v2/assets/sprites/
  cp assets/pixel/${s}_[0-9]*.png v2/assets/sprites/
done
cp assets/fx/fx.json assets/fx/fx_0.png v2/assets/fx/
echo "copied: $SETS + fx"
