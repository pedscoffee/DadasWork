// Checks that game sentences can be built from the recording script.
//   node tools/voice-coverage.js [extra-lines.txt]
// Pretends every script line is recorded, then tries to cover:
//   - sentences generated from each game's templates and word lists
//   - any extra logged lines (one per line, optionally "file<TAB>text")
// Prints the sentences that can't be covered and the missing piece.
const fs = require('fs'), path = require('path');
const { VoiceText } = require('../voice.js');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'voice', 'script.js'), 'utf8'));
const dict = {};
window.VOICE_SCRIPT.forEach(l => { dict[VoiceText.key(l.text)] = l.id; });
const V = require('./vocab.json');
const N = (n) => VoiceText.numberWords(n).join(' ');
const spell = (w) => w.toUpperCase().split('').join(', ');
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const out = [];
const add = (game, ...lines) => lines.forEach(l => out.push([game, l]));

// Bubble Pop
AZ.forEach(L => add('bubble', `Pop the ${L}!`, `Pop the little ${L}!`, `Big ${L}. Find little ${L}!`, `little ${L}`, L,
    `Hooray! You popped all the ${L} bubbles!`, `Hooray! You popped all the little ${L} bubbles!`, `Pop the ${L}! Look for the glowing ones!`));
[...Array(20).keys()].map(i => i + 1).concat([30, 40, 50, 60, 70, 80, 90, 100]).forEach((n, i, a) => add('bubble', `Pop the ${n}!`, String(n), a[i + 1] ? `Hooray! ${n}! Next comes ${a[i + 1]}!` : 'Hooray! You counted all the way to one hundred!'));
V.bubbleWords.forEach(([w]) => add('bubble', `Find the word for ${w}! Which one says ${w}?`, `${spell(w)}. ${w}! You read it!`,
    `That says ${w}! ${cap(w)} is ${spell(w)}. Let's try another!`, `${w}! Look for the glowing bubble!`));
[0, 1, 5, 10].forEach(n => add('bubble', `You did ten words! You got ${n} star${n === 1 ? '' : 's'}!`));
// Car wash
V.carWords.forEach(([w]) => {
    const s = w.split('').map(c => V.sounds[c]);
    add('carwash', ...w.split('').map(c => `Tap the ${c.toUpperCase()} wash!`), ...s, `${s.join('... ')}... ${s.join(' ')}... ${w}!`,
        `Yes! ${w}! You read it!`, `That's a ${w}! We made... ${w}!`, s.join('... '));
});
add('carwash', 'Tap the blower to blow the sounds together!', 'What did we make? Tap the picture!');
// Garbage truck
const sw = (w) => (w === 'a' ? 'A' : w);
V.sight.forEach(w => add('garbage', `Find the word ${sw(w)}!`, `${spell(w)}. ${sw(w)}! You found it!`, `Yum! That one says ${sw(w)}. Can you find ${sw(w)}?`, `${sw(w)}! Look for the glowing can!`));
add('garbage', 'Ten words! The truck is full! Off to the dump!');
// Rhyme train
V.rhymes.forEach(f => {
    const h = f.head[0];
    add('rhyme', h, `What rhymes with ${h}? Tap a car!`, `Choo choo! This train is for ${h}! What rhymes with ${h}?`,
        ...f.rhymes.map(r => `${h}... ${r[0]}! They rhyme!`), `${h}... dog. No rhyme! Boing!`, `All aboard! ${[h, ...f.rhymes.map(r => r[0])].join(', ')}!`);
});
// Monster truck
V.syllables.forEach(w => {
    const c = w[3].join('... ');
    add('monster', `${w[0]}! Jump for each part. ${c}!`, ...w[3], `${c}... ${w[0]}! How many jumps was that?`, `Yes! ${N(w[2].length)} jumps! ${c}!`,
        `${w[0]} has ${N(w[2].length)}! ${c}!`, `${w[0]}! ${c}!`, `${w[0]}! Tap to jump!`, `How many jumps? ${c}`);
});
add('monster', 'Wheee!', 'Keep jumping!', 'How many jumps was that?');
// Fishing
for (let a = 1; a <= 9; a++) {
    add('fishing', `${N(a)}! How many more make ten?`, `${N(a)}! How many more make ten? Count the empty boxes!`, `Count the empty boxes: ${N(10 - a)}! Catch the ${N(10 - a)}!`);
    for (let b = 1; b <= 9; b++) {
        const s = a + b;
        add('fishing', s === 10 ? `${N(a)} and ${N(b)} make ten!` : s > 10 ? `${N(a)} and ${N(b)} make ${N(s)}. Too many! We need ${N(10 - a)}.` : `${N(a)} and ${N(b)} make ${N(s)}. Not ten yet! We need ${N(10 - a)}.`);
    }
}
add('fishing', 'Catch a fish! Tap any fish.', 'Catch another fish!', 'Ten, twenty, thirty, forty, fifty! Treasure!');
// Number line
for (let a = 0; a <= 10; a++) for (let b = 1; b <= 4; b++) {
    if (a + b <= 10) add('numberline', `We start on ${N(a)}. ${a} plus ${b}. Where will we land? Tap a number!`, `${a} plus ${b}. Where will the truck land? Tap a number!`,
        `${N(a + b)}? Let's find out! Tap to jump ${N(b)} time${b > 1 ? 's' : ''}!`, `${a} plus ${b} is ${N(a + b)}! You guessed it!`, `Count ${N(b)} jumps from ${N(a)}... it's the glowing one!`, N(a + b));
    if (a - b >= 0) add('numberline', `${a} take away ${b} is ${N(a - b)}!`);
}
add('numberline', 'Keep jumping!', 'Tap to jump two times!');
// Sort It
V.sort.forEach(m => {
    add('sort', `${m.name === 'material' ? 'Trash, recycling, or compost?' : m.name === 'color' ? 'Sort by color!' : 'Sort by shape!'} Here comes the belt!`);
    m.items.forEach(i => { const b = m.bins.find(b => b.id === i[1]); add('sort', `${m.ask} It's ${i[2]}.`, `${b.label}! ${i[3]}`, `Boing! ${i[3]}`, `${b.label}! Tap the glowing bin!`); });
});
add('sort', 'Ten things sorted! Great sorting!');
// Fetch
V.fetchLetters.forEach(s => {
    s.items.forEach(([e, w]) => add('fetch', `Which one starts with ${s.L}? ${s.L}, like ${s.like}! Throw it there!`, `Yes! ${w} starts with ${s.L}!`,
        `Sully got the ${w}! ${w} starts with ${s.L}.`, `Wheee! ${w} starts with ${s.L}.`));
});
['far', 'near'].forEach(x => add('fetch', `Throw it to the ${x.toUpperCase()} tree!`, `Yes! The ${x} tree!`, `That was the ${x} tree!`));
for (let n = 1; n <= 10; n++) add('fetch', `Throw it to number ${N(n)}!`, `Yes! Number ${N(n)}!`, `That was number ${N(n)}!`, `${N(n)}! Throw the ball for Sully!`);
['sunny', 'sunset', 'snowy'].forEach(p => add('fetch', `Look, a ${p} park! Throw the ball for Sully!`));
add('fetch', "Hi! I'm Sully! Throw the ball for Sully!", 'Sully wants the ball! Throw it!', 'Ready? Throw it far!', "Ten fetches! Good boy, Sully! Here's a treat!");
// Construction chain
const B = ['house', 'fire station', 'school', 'castle', 'library', 'tall tower'];
const jobs = ['dig the hole', 'fill it with gravel', 'pour the floor', 'stack the floors', 'windows, decorations and paint', 'cut the ribbon!'];
const machines = ['excavator', 'dump truck', 'cement mixer', 'crane', 'finish crew'];
B.forEach(b => add('jobsite', `Let's build a ${b}! First, the excavator digs the hole.`, `The ${b} is finished! Tap the scissors to cut the ribbon!`, `Hooray! The ${b} is open!`,
    `The ${b} is finished! Back to the job site to cut the ribbon!`));
jobs.forEach(j => add('jobsite', `First, ${j}!`));
machines.forEach((m, i) => add('jobsite', `Next, the ${m}! ${cap(jobs[i])}.`));
add('excavator', 'The hole is dug! Now the dump truck!');
[...Array(10).keys()].forEach(n => add('dump', `${N(n + 1)}!`));
add('dump', 'Tap the digger to load it up!', 'Go get more rocks!', 'Ten! Full! Back it up to the hole!', 'The hole is full of gravel! Now the cement mixer!',
    'Drive the truck to the digger first!', 'Drive to the digger!', ...['a house', 'a castle', 'a school', 'a circus tent', 'a fountain', 'a home with a garden', 'a tower', 'a Ferris wheel', 'a stadium', 'a fire station'].map(b => `Hooray! You built ${b}!`));
['water', 'sand', 'gravel', 'cement'].forEach(x => add('cement', `Tap the ${x} to put it in the mixer!`, `Wheee! Put in the ${x} too!`));
for (let n = 1; n <= 10; n++) add('cement', `Keep spinning! ${N(n)}!`, `${N(n)}!`);
for (let n = 1; n <= 5; n++) add('cement', `Pour the cement in number ${n}!`, `Mixed! Now let's pour it! Pour in number ${n}!`, `That one is full! Pour in number ${n}!`,
    `Yes, number ${n}! Now pour in number ${n}!`, `That was number ${n}! Now pour in number ${n}!`);
add('cement', 'Tap the drum to spin it! Spin it ten times!', 'Ten! All mixed!', 'All poured!', 'Rub the cement to make it smooth!', 'Now write your letter in the wet cement!',
    'The floor is done! Now the crane!', 'The floor is done!');
const colors = ['red', 'yellow', 'white', 'green', 'gray', 'light gray', 'blue', 'light blue', 'purple', 'pink'];
colors.forEach(c => add('crane', `Look at the plan! The first floor is ${c}. Tap the ${c} block!`, `${c}! Great pattern!`, `${c}! A new pattern!`, `What comes next in the pattern? ${c}, ${c}, ...`));
for (let n = 1; n <= 6; n++) add('crane', `Floor ${N(n)}!`, `Perfect! Floor ${N(n)}!`, N(n), `${N(n)} floors! Now the finish crew!`, `${N(n)} floors! What a building!`);
add('crane', 'Tap to drop it on the building!', 'Now the roof! Tap to drop it!', 'Time for the roof!');
const talk = { circle: 'A circle is round, with no corners.', square: 'A square has four sides, all the same.', triangle: 'A triangle has three sides.', star: 'A star has five points!' };
Object.keys(talk).forEach(sh => add('finish', `Let's put in the windows! Find the ${sh} window!`, `${cap(sh)}! Yes! ${talk[sh]}`, `That's a ${sh}! ${talk[sh]}`, `Find the ${sh} window!`, `Now find the ${sh} window!`));
const spots = { top: 'on top of the building', door: 'next to the door', under: 'under the window', side: 'beside the building' };
['flag', 'cat', 'flowers'].forEach(n => Object.values(spots).forEach(sp => add('finish', `Yes! The ${n} is ${sp}!`, `Silly! The ${n} is ${sp}!`)));
add('finish', 'All the windows are in! Knock knock, here comes the door!', 'Put the flag on top of the building!', 'Put the cat next to the door!', 'Put the flowers under the window!',
    'Last job: paint it! Pick a color, then tap the building.', 'Beautiful!', 'Tap the building to paint it!', 'Pick a paint color!', 'Pick a paint color first!');
// Older games
for (let n = 1; n <= 20; n++) add('turkey', `Give the turkey ${n} feathers!`, `The turkey has ${n} feathers. Make it ${n}!`, `That's ${n}. The last number you counted was ${n}!`, `${n} feathers! Gobble gobble!`, String(n));
add('turkey', 'How many feathers? Tap each one to count!', 'Ten! One full row!', 'So, how many feathers?');
['LOVE', 'CAT', 'DOG', 'SUN', 'BUS', 'COW', 'PIG', 'BEE', 'FOX', 'OWL', 'EGG', 'CAR', 'HAT', 'BED', 'CUP', 'MOON', 'STAR', 'FISH', 'CAKE', 'DUCK', 'FROG', 'BEAR', 'TREE', 'BOAT', 'MOM', 'DAD', 'BALL', 'BOOK', 'APPLE', 'TRUCK', 'HORSE', 'TRAIN']
    .forEach(w => add('lettertrain', w.toLowerCase(), `Let's spell ${w.toLowerCase()}!`, `${w.split('').join(', ')}. ${w.toLowerCase()}!`));
add('lettertrain', "Let's spell love!");
['circle', 'oval', 'square', 'rectangle', 'triangle', 'semicircle', 'star', 'heart', 'diamond', 'pentagon', 'hexagon', 'trapezoid'].forEach(s =>
    add('rocket', `This spot needs a ${s}.`, s, `${s}!`, `That's a ${s}. This spot needs a ${s}.`));
for (let n = 2; n <= 6; n++) add('rocket', `Rocket number ${n}! ${n} shapes.`);
add('rocket', 'Drag each shape to the spot that matches!', 'Blast off!', ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(String));
['bone', 'fish', 'carrot', 'banana', 'cheese', 'bamboo', 'honey', 'corn', 'apple', 'acorn', 'shrimp', 'leaves'].forEach(f => add('feed', `Who wants the ${f}?`));
['dog', 'cat', 'bunny', 'monkey', 'mouse', 'panda', 'bear', 'chicken', 'horse', 'squirrel', 'penguin', 'koala'].forEach(a => add('feed', `The ${a} doesn't eat that. No thank you!`));
add('feed', 'Woof woof!', 'Meow!', 'Nom nom nom!', 'Ooh ooh ah ah!', 'Squeak squeak!', 'Munch munch!', 'Mmm, honey!', 'Bawk bawk!', 'Neigh!', 'Crunch crunch!', 'Squawk!', 'Yum yum!', 'Everybody is full! Great job!');

// extra logged lines
if (process.argv[2]) fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).forEach(l => { const p = l.split('\t'); add(p.length > 1 ? p[0] : 'log', p[p.length - 1]); });

// ---- check ----
const missing = {};
let ok = 0;
for (const [game, text] of out) {
    if (VoiceText.segment(text, dict)) { ok++; continue; }
    // find the first piece that can't be covered
    const toks = VoiceText.tokenize(text); let i = 0, miss = '';
    while (i < toks.length) {
        let n = Math.min(14, toks.length - i);
        for (; n >= 1; n--) if (dict[toks.slice(i, i + n).join(' ')]) break;
        if (n >= 1) { i += n; continue; }
        if (toks[i] === ',' || toks[i] === '.') { i++; continue; }
        miss = toks[i]; break;
    }
    (missing[miss] = missing[miss] || []).push(`${game}: ${text}`);
}
console.log(`covered ${ok} / ${out.length} sentences`);
Object.entries(missing).sort((a, b) => b[1].length - a[1].length).forEach(([m, l]) => console.log(`  missing "${m}" (${l.length}x) e.g. ${l[0]}`));
