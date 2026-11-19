#!/bin/bash
# Capture takes on N parallel workers: ./run.sh <outroot> <workers> take1 take2 ...
OUT=$1; N=$2; shift 2; mkdir -p $OUT
printf "%s\n" "$@" | xargs -P $N -I{} sh -c 'if [ ! -f '"$OUT"'/{}/audio.wav ]; then NODE_PATH=$(npm root -g) timeout 3000 node '"$(dirname $0)"'/cap.js '"$(dirname $0)"'/takes.js#{} '"$OUT"'/{} > '"$OUT"'/{}.log 2>&1; echo "{}: $(tail -1 '"$OUT"'/{}.log)"; fi'
