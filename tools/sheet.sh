#!/bin/bash
# usage: tools/sheet.sh OUTDIR SCALE COLS t1 t2 ...  -> renders frames and tiles them into OUTDIR/sheet.jpg
OUT=$1; SC=$2; COLS=$3; shift 3
rm -rf $OUT; mkdir -p $OUT
node tools/snap.js $OUT $SC "$@" 2>&1 | grep -a -v -E "useProgram|GPU stall|Failed to load resource" | tail -n 5
N=$(ls $OUT/f_*.jpg | wc -l); ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -v error -y -pattern_type glob -i "$OUT/f_*.jpg" -vf "scale=480:-1,drawtext=text='%{metadata\:lavf.image2dec.source_basename}':x=5:y=5:fontsize=14:fontcolor=yellow,tile=${COLS}x${ROWS}" -frames:v 1 $OUT/sheet.jpg 2>/dev/null || ffmpeg -v error -y -pattern_type glob -i "$OUT/f_*.jpg" -vf "scale=480:-1,tile=${COLS}x${ROWS}" -frames:v 1 $OUT/sheet.jpg
echo "sheet: $OUT/sheet.jpg ($N frames)"
