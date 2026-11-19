#!/bin/bash
# contact sheet of a take: ./sheet.sh <takedir> <out.png> [n=6]
D=$1; O=$2; N=${3:-6}; C=$(ls $D/*.jpg | wc -l); STEP=$(( C / N )); FILES=(); for i in $(seq 0 $((N-1))); do FILES+=($(printf "$D/%05d.jpg" $((i*STEP)))); done
ARGS=(); for f in "${FILES[@]}"; do ARGS+=(-i "$f"); done
ffmpeg -v error -y "${ARGS[@]}" -filter_complex "$(for i in $(seq 0 $((N-1))); do printf "[$i]scale=480:-1[s$i];"; done)$(for i in $(seq 0 $((N-1))); do printf "[s$i]"; done)xstack=inputs=$N:layout=$(python3 -c "
n=$N;c=3;print('|'.join(f'{(i%c)}*w0_{(i//c)}*h0'.replace('*w0','_w0').replace('0_w0','0') for i in range(n)))" | sed 's/\([0-9]\)_w0/w0*\1/g')" $O 2>&1 | head -3
