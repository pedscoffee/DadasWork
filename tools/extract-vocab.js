// Pull the word lists out of the game files so the voice script matches them exactly.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
function grab(file, startRe) {
    const s = fs.readFileSync(path.join(dir, file), 'utf8');
    const m = s.match(startRe);
    if (!m) throw new Error('not found: ' + file + ' ' + startRe);
    let i = m.index + m[0].length - 1, depth = 0, j = i;
    for (; j < s.length; j++) { const c = s[j]; if (c === '[' || c === '{') depth++; if (c === ']' || c === '}') { depth--; if (depth === 0) break; } }
    return eval('(' + s.slice(i, j + 1) + ')');
}
const out = {
    bubbleWords: grab('bubble-pop.html', /const WORDS = \[/),
    carWords: grab('car-wash.html', /const WORDS = \[/),
    sounds: grab('car-wash.html', /const SOUND = \{/),
    syllables: grab('monster-truck.html', /const WORDS = \[/),
    rhymes: grab('rhyme-train.html', /const FAMILIES = \[/),
    sight: grab('garbage-truck.html', /const SIGHT = \[/),
    fetchLetters: grab('fetch.html', /const LETTERS = \[/),
    sort: grab('recycle-sort.html', /const MODES = \[/),
};
fs.writeFileSync(path.join(__dirname, 'vocab.json'), JSON.stringify(out, null, 1));
console.log(Object.entries(out).map(([k, v]) => k + ':' + (Array.isArray(v) ? v.length : Object.keys(v).length)).join('  '));
