#!/usr/bin/env python3
"""
Cut Dad's voice recording(s) into one clip per script line.

    python3 tools/split-recording.py recording1.m4a [recording2.m4a ...] [--start-page 1]

How the recording is laid out (see voice/SCRIPT.md):
    CLAP  "Page five"  line 1  line 2 ...  CLAP  "Page six" ...
    (pause ~1 s between lines; a flubbed page is restarted with another clap)

What this does:
  1. Finds the claps (short, sharp, loud) and the spoken bits between pauses.
  2. Each clap starts a "take". The first bit after the clap is the page number
     (thrown away); the rest are the lines.
  3. Matches takes to pages in order. A take with too few lines followed by a
     complete take of the same page was a restart, so it's dropped. Small
     mismatches (a line split by a long pause, two lines run together) are
     repaired; anything that still doesn't line up is reported, not guessed.
  4. Writes voice/clips/<id>.mp3 (trimmed, faded, leveled), updates
     voice/clips.js, and writes voice/review.html to listen through every clip.
"""
import argparse, json, os, re, subprocess, sys, tempfile
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SR = 22050
FRAME = 220         # samples per analysis frame (~10 ms)
HOP = FRAME / SR    # exact frame length in seconds (keeps long recordings in sync)


def load_audio(path):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def load_script():
    txt = open(os.path.join(ROOT, 'voice', 'script.js'), encoding='utf8').read()
    lines = json.loads(txt[txt.index('['):txt.rindex(']') + 1])
    pages = {}
    for l in lines:
        p = int(l['id'][1:3])
        pages.setdefault(p, []).append(l)
    return lines, pages


def frames_db(x):
    n = FRAME
    m = len(x) // n
    fr = x[:m * n].reshape(m, n)
    rms = np.sqrt((fr ** 2).mean(axis=1) + 1e-12)
    peak = np.abs(fr).max(axis=1)
    return 20 * np.log10(rms + 1e-9), peak


def find_segments(x, min_gap=0.45, min_len=0.015):
    """Sound islands separated by at least min_gap seconds of quiet."""
    db, peak = frames_db(x)
    floor = np.percentile(db, 15)
    loud = np.percentile(db, 95)
    thr = floor + max(10, (loud - floor) * 0.28)
    on = db > thr
    segs, i, n = [], 0, len(on)
    gap_f = int(min_gap / HOP)
    while i < n:
        if not on[i]:
            i += 1
            continue
        start, last_on = i, i
        j = i
        while j < n and j - last_on <= gap_f:
            if on[j]:
                last_on = j
            j += 1
        if (last_on - start + 1) * HOP >= min_len:
            segs.append([start * HOP, (last_on + 1) * HOP])
        i = last_on + 1
    return segs, thr


def is_clap(x, seg):
    """A clap: very short, very sharp, mostly high-frequency noise."""
    a, b = int(seg[0] * SR), int(seg[1] * SR)
    s = x[a:b]
    dur = seg[1] - seg[0]
    if dur > 0.3 or len(s) < 64:
        return False
    peak = np.abs(s).max()
    # energy concentrated in the first 60 ms
    head = s[:int(0.06 * SR)]
    conc = (head ** 2).sum() / ((s ** 2).sum() + 1e-12)
    spec = np.abs(np.fft.rfft(s * np.hanning(len(s))))
    freqs = np.fft.rfftfreq(len(s), 1 / SR)
    centroid = (spec * freqs).sum() / (spec.sum() + 1e-12)
    flat = np.exp(np.mean(np.log(spec + 1e-9))) / (np.mean(spec) + 1e-9)
    return conc > 0.7 and centroid > 1500 and flat > 0.15 and peak > 0.15


def split_takes(x):
    segs, thr = find_segments(x)
    takes, cur = [], None
    for s in segs:
        clap = is_clap(x, s)
        if not clap and s[1] - s[0] < 0.08:
            continue          # a tick or bump, not a word
        if clap:
            cur = {'clap': s[0], 'segs': []}
            takes.append(cur)
        elif cur is not None:
            cur['segs'].append(s)
    # first bit after the clap is "Page N"
    for t in takes:
        t['announce'] = t['segs'][0] if t['segs'] else None
        t['lines'] = t['segs'][1:]
    return takes


def repair(lines, want):
    """Nudge a take to the expected number of lines if it's off by a little."""
    lines = [list(l) for l in lines]
    # too many: merge the two pieces with the smallest gap between them
    while len(lines) > want:
        gaps = [lines[i + 1][0] - lines[i][1] for i in range(len(lines) - 1)]
        k = int(np.argmin(gaps))
        if gaps[k] > 0.9:      # a real pause; don't merge real lines
            return None
        lines[k] = [lines[k][0], lines[k + 1][1]]
        del lines[k + 1]
    return lines


def assign(takes, pages, start_page):
    """Match takes to pages in order. Returns {page: lines}, problems."""
    out, problems = {}, []
    p = start_page
    i = 0
    while i < len(takes) and p in pages:
        want = len(pages[p])
        have = len(takes[i]['lines'])
        nxt = takes[i + 1] if i + 1 < len(takes) else None
        if have == want:
            out[p] = takes[i]['lines']; p += 1; i += 1; continue
        # a false "clap" (a sharp sound like "tuh") split the page in two: join them back
        if have < want and nxt is not None and nxt['announce'] is not None and have + 1 + len(nxt['lines']) == want:
            out[p] = takes[i]['lines'] + [nxt['announce']] + nxt['lines']; p += 1; i += 2; continue
        # restarted page: short take, and the next take is the full page
        if have < want and nxt is not None and abs(len(nxt['lines']) - want) <= 2:
            i += 1; continue
        if have > want and have - want <= 3:
            fixed = repair(takes[i]['lines'], want)
            if fixed:
                out[p] = fixed; p += 1; i += 1; continue
        if have < want and nxt is None:
            problems.append(f'Page {p}: the recording ends partway through ({have} of {want} lines). Re-record page {p}.')
            break
        problems.append(f'Page {p}: found {have} lines, expected {want}. Skipped; please re-record page {p}.')
        p += 1; i += 1
    if i < len(takes):
        problems.append(f'{len(takes) - i} extra take(s) after page {p - 1} were not used.')
    return out, problems


def export_clip(x, seg, path):
    pad = 0.06
    a, b = max(0, int((seg[0] - pad) * SR)), min(len(x), int((seg[1] + pad) * SR))
    s = x[a:b].copy()
    # level: speech RMS to about -20 dBFS, without clipping
    rms = np.sqrt((s ** 2).mean() + 1e-12)
    g = min(10 ** (-20 / 20) / rms, 0.95 / (np.abs(s).max() + 1e-9))
    s *= g
    f = int(0.012 * SR)
    s[:f] *= np.linspace(0, 1, f); s[-f:] *= np.linspace(1, 0, f)
    with tempfile.NamedTemporaryFile(suffix='.f32', delete=False) as tmp:
        tmp.write(s.astype(np.float32).tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', tmp.name,
                    '-codec:a', 'libmp3lame', '-b:a', '64k', path], check=True)
    os.unlink(tmp.name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--start-page', type=int, default=1, help='page the first recording starts on')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    lines, pages = load_script()
    clips_dir = os.path.join(ROOT, 'voice', 'clips')
    os.makedirs(clips_dir, exist_ok=True)
    clips_js = os.path.join(ROOT, 'voice', 'clips.js')
    existing = {}
    if os.path.exists(clips_js):
        t = open(clips_js).read()
        existing = json.loads(t[t.index('{'):t.rindex('}') + 1])
    page = a.start_page
    report, made = [], {}
    for f in a.files:
        x = load_audio(f)
        takes = split_takes(x)
        got, problems = assign(takes, pages, page)
        report.append(f'{os.path.basename(f)}: {len(takes)} claps, pages {sorted(got) or "none"}')
        report += ['  ' + p for p in problems]
        for p, segs in got.items():
            for l, seg in zip(pages[p], segs):
                name = l['id'] + '.mp3'
                if not a.dry_run:
                    export_clip(x, seg, os.path.join(clips_dir, name))
                made[l['id']] = name
        if got:
            page = max(got) + 1
    existing.update(made)
    if not a.dry_run:
        with open(clips_js, 'w') as fh:
            fh.write('// Which lines have been recorded: id -> file in voice/clips/. Filled in by tools/split-recording.py.\n')
            fh.write('window.VOICE_CLIPS = ' + json.dumps(existing, indent=0, sort_keys=True) + ';\n')
        write_review(lines, existing)
    print('\n'.join(report))
    print(f'{len(made)} clips made this run; {len(existing)} of {len(lines)} lines recorded in total.')
    return made


def write_review(lines, clips):
    rows = []
    for l in lines:
        c = clips.get(l['id'])
        audio = f'<audio controls preload="none" src="clips/{c}"></audio>' if c else '<span class="no">not recorded</span>'
        rows.append(f'<tr><td>{l["id"]}</td><td>{l["text"]}</td><td>{audio}</td></tr>')
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Voice clips review</title><style>body{{font-family:system-ui,sans-serif;margin:16px}}td{{padding:4px 8px;border-bottom:1px solid #eee}}
.no{{color:#999}}audio{{height:32px}}</style></head><body><h1>Voice clips ({len(clips)} of {len(lines)})</h1>
<p>Play down the list: each clip should say the text next to it.</p><table>{''.join(rows)}</table></body></html>"""
    open(os.path.join(ROOT, 'voice', 'review.html'), 'w').write(html)


if __name__ == '__main__':
    main()
