// Builds the voice recording script: voice/script.js (used by the games)
// and voice/script.md (for reading aloud).
//
//   node tools/extract-vocab.js && node tools/build-voice-script.js
//
// Each line gets a stable id (p03-07 = page 3, line 7). The games glue
// pieces together ("Find the word" + "cat"), so frames and words are
// recorded separately. Duplicates are dropped automatically.
const fs = require('fs'), path = require('path');
const { VoiceText } = require('../voice.js');
const V = require('./vocab.json');

const sections = [];
const S = (title, note, lines) => sections.push({ title, note, lines: lines.map(l => typeof l === 'string' ? { text: l } : l) });
const uniq = (a) => [...new Set(a)];
const words = (list) => list.map(w => ({ text: w }));

// ---------------- 2. Letters, sounds, numbers ----------------
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
S('Letter names', 'Just the name of each letter: "A" (ay), "B" (bee)…', AZ.map(L => ({ text: L, hint: 'letter name' })));
const soundHint = { a: 'short a, as in apple', e: 'short e, as in egg', i: 'short i, as in itch', o: 'short o, as in octopus', u: 'short u, as in up',
    c: 'hard c, as in cat', g: 'hard g, as in goat', x: 'as at the end of box', k: 'same as c', q: 'as in queen' };
const SOUNDS = Object.assign({ q: 'kwuh' }, V.sounds);
S('Letter sounds', 'The SOUND each letter makes, short and clipped. Try not to add much "uh" after b, d, g, p, t. Hold s, m, n, f, l, v, z, r for about a second.',
    Object.keys(SOUNDS).sort().filter((l, i, a) => SOUNDS[l] !== SOUNDS[a[i - 1]])
        .map(l => ({ text: SOUNDS[l], hint: `the sound ${l.toUpperCase()} makes` + (soundHint[l] ? ` (${soundHint[l]})` : '') })));
const nums = [...Array(21).keys()].map(n => VoiceText.numberWords(n).join(' ')).concat(['thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'one hundred']);
S('Numbers', 'Counting voice, like "one, two, three".', nums);

// ---------------- 1. Warm-up ----------------
S('Warm-up: cheers', 'Big and happy. These get heard a LOT.', [
    'Yes!', 'Hooray!', 'Great job!', 'Perfect!', 'Beautiful!', 'Wheee!', 'Boing!', 'Silly!', 'Yum!',
    'You read it!', 'You found it!', 'You guessed it!', "Let's try another!", "Let's find out!",
    'Keep going!', 'Keep jumping!', 'Keep spinning!', 'Choo choo!', 'All aboard!', 'Treasure!', 'Blast off!',
    'Gobble gobble!', 'Good boy, Sully!', 'Great pattern!', 'A new pattern!', "That's"
]);
S('Hints', 'Gentle, helpful voice.', [
    'Look for the glowing ones!', 'Look for the glowing bubble!', 'Look for the glowing can!', 'Tap the glowing bin!',
    "It's the glowing one!", 'Tap any fish.', 'Tap a number!', 'Tap a car!', 'Tap the picture!', 'Tap to jump!'
]);

// ---------------- 3. Word lists ----------------
const cvc = uniq([...V.bubbleWords.map(w => w[0]), ...V.carWords.map(w => w[0])]);
S('Reading words (Bubble Pop, Car Wash)', 'Say each word clearly, like you are reading it to him.', cvc);
const sightW = V.sight.filter(w => w.length > 1 || w === 'I' || w === 'a').map(w => w === 'a' || w === 'I' ? null : w).filter(Boolean);
S('Sight words (Garbage Truck)', 'Clear and simple. ("a" and "I" are already covered by the letter names.)', sightW);
const rhyme = uniq(V.rhymes.flatMap(f => [f.head[0], ...f.rhymes.map(r => r[0])]));
S('Rhyme Train words', '', rhyme);
const fetchItems = uniq(V.fetchLetters.flatMap(s => [s.like, ...s.items.map(i => i[1])]));
S('Fetch with Sully words', '', fetchItems);
S('Monster Truck words', 'The whole word, then (next section) each part on its own.', V.syllables.map(w => w[0]));
const chunks = [];
V.syllables.forEach(w => w[3].forEach((c, i) => { if (w[3].length > 1) chunks.push({ text: c, hint: `"${w[2][i]}" in ${w[0]}` }); }));
S('Monster Truck word parts', 'Each part on its own, like clapping it out: "dye"… "no"… "sore". The hint shows which word it comes from.', chunks);
S('Colors and shapes', '', ['red', 'yellow', 'white', 'green', 'gray', 'light gray', 'blue', 'light blue', 'purple', 'pink', 'orange',
    'circle', 'square', 'triangle', 'star', 'rectangle', 'oval', 'semicircle', 'heart', 'diamond', 'pentagon', 'hexagon', 'trapezoid']);

// ---------------- 4. Game lines ----------------
S('Bubble Pop', '', [
    'Pop the', 'Pop the little', 'little', 'Big', 'Find little', 'Find the word for', 'Which one says', 'That says', 'is',
    'You popped all the', 'bubbles', 'Next comes', 'You counted all the way to one hundred!', 'You did ten words!', 'You got', 'star', 'stars'
]);
S('Car Wash Words', '', ['Tap the', 'wash', 'Tap the blower to blow the sounds together!', 'What did we make?', "That's a", 'We made']);
S('Garbage Truck Words', '', ['Find the word', 'Yum!', 'That one says', 'Can you find', 'Ten words!', 'The truck is full!', 'Off to the dump!']);
S('Rhyme Train', '', ['What rhymes with', 'This train is for', 'They rhyme!', 'No rhyme!']);
S('Monster Truck Jumps', '', ['Jump for each part.', 'How many jumps was that?', 'How many jumps?', 'jumps', 'jump', 'has']);
S('Fishing for 10', '', ['Catch a fish!', 'Catch another fish!', 'How many more make ten?', 'and', 'make', 'make ten!', 'Too many!',
    'Not ten yet!', 'We need', 'Count the empty boxes!', 'Count the empty boxes:', 'Catch the']);
S('Number Line Jumps', '', ['We start on', 'plus', 'take away', 'Where will we land?', 'Where will the truck land?', 'Tap to jump',
    'time', 'times', 'Count', 'jumps from']);
const sortItems = V.sort.flatMap(m => m.items);
S('Sort It!', '', [
    'Trash, recycling, or compost?', 'Sort by color!', 'Sort by shape!', 'Here comes the belt!', 'Where does it go?', 'What color is it?',
    'What shape is it?', "It's", 'Trash', 'Recycle', 'Compost', 'Ten things sorted!', 'Great sorting!',
    ...uniq(sortItems.map(i => i[2]))
]);
S('Sort It! reasons', 'One short reason for each thing.', uniq(sortItems.map(i => i[3])));
S('Fetch with Sully', '', [
    "Hi! I'm Sully!", 'Throw the ball for Sully!', 'Sully wants the ball! Throw it!', 'Ready? Throw it far!', 'Throw it to the',
    'far', 'near', 'tree', 'far tree', 'near tree', 'Throw it to number', 'Which one starts with', 'like', 'Throw it there!',
    'Look, a', 'sunny', 'sunset', 'snowy', 'park', 'Ten fetches!', "Here's a treat!", 'That was the', 'That was number', 'number',
    'starts with', 'Sully got the', 'The'
]);
S('Job Site', '', [
    "Let's build a", 'First, the excavator digs the hole.', 'First,', 'dig the hole', 'fill it with gravel', 'pour the floor', 'stack the floors',
    'windows, decorations and paint', 'cut the ribbon', 'Next, the', 'excavator', 'dump truck', 'cement mixer', 'crane', 'finish crew',
    'Dig the hole.', 'Fill it with gravel.', 'Pour the floor.', 'Stack the floors.', 'Windows, decorations and paint.',
    'is finished!', 'Tap the scissors to cut the ribbon!', 'is open!',
    'house', 'fire station', 'school', 'castle', 'library', 'tall tower'
]);
S('Digging and dump truck', '', [
    'The hole is dug! Now the dump truck!', 'Tap the digger to load it up!', 'Go get more rocks!', 'Full!', 'Back it up to the hole!',
    'The hole is full of gravel! Now the cement mixer!', 'You built', 'Drive the truck to the digger first!', 'Drive to the digger!',
    'a house', 'a castle', 'a school', 'a circus tent', 'a fountain', 'a home with a garden', 'a tower', 'a Ferris wheel', 'a stadium', 'a fire station'
]);
S('Cement Mixer', '', [
    'to put it in the mixer!', 'water', 'sand', 'gravel', 'cement', 'Tap the drum to spin it! Spin it ten times!', 'Pour the cement in number',
    'Rub the cement to make it smooth!', 'Now write your letter in the wet cement!', 'Mixed!', "Now let's pour it!", 'Pour in number',
    'The floor is done!', 'Now the crane!', 'That one is full!', 'All mixed!', 'Put in the', 'too!', 'All poured!', 'Now pour in number'
]);
S('Crane', '', [
    'Look at the plan!', 'The first floor is', 'block!', 'What comes next in the pattern?', 'Tap to drop it on the building!',
    'Now the roof! Tap to drop it!', 'Floor', 'floors!', 'Now the finish crew!', 'What a building!', 'Time for the roof!', 'this one'
]);
S('Finish Crew', '', [
    "Let's put in the windows!", 'Find the', 'window!', 'Now find the', 'A circle is round, with no corners.', 'A square has four sides, all the same.',
    'A triangle has three sides.', 'A star has five points!', 'All the windows are in!', 'Knock knock, here comes the door!',
    'Put the flag on top of the building!', 'Put the cat next to the door!', 'Put the flowers under the window!', 'flag', 'cat', 'flowers',
    'on top of the building', 'next to the door', 'under the window', 'beside the building', 'Last job: paint it!',
    'Pick a color, then tap the building.', 'Back to the job site to cut the ribbon!', 'Tap the building to paint it!', 'Pick a paint color!', 'Pick a paint color first!'
]);
S('Older games', 'Turkey Feathers, Letter Train, Rocket Builder, Feed the Animals.', [
    'Give the turkey', 'feathers!', 'The turkey has', 'feathers.', 'Make it', 'How many feathers? Tap each one to count!', 'Ten! One full row!',
    'So, how many feathers?', 'The last number you counted was', "Let's spell", 'love', 'This spot needs a', 'Drag each shape to the spot that matches!',
    'Rocket number', 'shapes.', 'Who wants the', "doesn't eat that. No thank you!", 'Everybody is full! Great job!',
    'bone', 'fish', 'carrot', 'banana', 'cheese', 'bamboo', 'honey', 'corn', 'apple', 'acorn', 'shrimp', 'leaves',
    'Woof woof!', 'Meow!', 'Nom nom nom!', 'Ooh ooh ah ah!', 'Squeak squeak!', 'Munch munch!', 'Mmm, honey!', 'Bawk bawk!', 'Neigh!',
    'Crunch crunch!', 'Squawk!', 'Yum yum!', 'dog', 'bunny', 'monkey', 'mouse', 'panda', 'bear', 'chicken', 'horse', 'squirrel', 'penguin', 'koala',
    'cow', 'pig', 'bee', 'owl', 'egg', 'car', 'hat', 'bed', 'cup', 'moon', 'cake', 'duck', 'frog', 'tree', 'boat', 'mom', 'dad', 'ball', 'book', 'truck', 'train', 'sun', 'bus', 'fox', 'star'
]);

// Pieces that come BEFORE a word ("Find the word" + "cat"). Shown with "…" so they're read
// like the middle of a sentence. (The "…" doesn't change how the line is matched.)
const LEADS = new Set(['Pop the', 'Pop the little', 'little', 'Big', 'Find little', 'Find the word for', 'Which one says', 'That says',
    'You popped all the', 'Next comes', 'You got', 'Tap the', "That's a", 'We made', 'Find the word', 'That one says', 'Can you find',
    'What rhymes with', 'This train is for', 'has', 'make', 'We need', 'Catch the', 'Count the empty boxes:', 'We start on', 'plus',
    'take away', 'Tap to jump', 'time', 'times', 'Count', 'jumps from', "It's", 'Throw it to the', 'Throw it to number', 'Which one starts with',
    'Look, a', 'That was the', 'That was number', 'number', 'starts with', 'Sully got the', 'The', "Let's build a", 'First,', 'Next, the',
    'You built', 'Pour the cement in number', 'Pour in number', 'Put in the', 'Now pour in number', 'The first floor is', 'Floor', 'Find the',
    'Now find the', 'Give the turkey', 'The turkey has', 'Make it', 'The last number you counted was', "Let's spell", 'This spot needs a',
    'Rocket number', 'Who wants the', "That's"]);
sections.forEach(sec => sec.lines.forEach(l => { if (LEADS.has(l.text)) l.text += ' …'; }));

// ---------------- build: dedupe, paginate, ids ----------------
// Each section starts its own page; long sections split into pages of up to 30 lines.
const PAGE = 30, seen = new Set(), pages = [];
sections.forEach(sec => {
    const lines = sec.lines.filter(l => { const k = VoiceText.key(l.text); if (!k || seen.has(k)) return false; seen.add(k); return true; });
    const n = Math.ceil(lines.length / PAGE);
    for (let i = 0; i < n; i++) {
        const chunk = lines.slice(Math.floor(i * lines.length / n), Math.floor((i + 1) * lines.length / n));   // even split
        pages.push({ lines: chunk.map((l, li) => Object.assign({ section: sec.title + (n > 1 ? ` (${i + 1} of ${n})` : ''), note: i === 0 ? sec.note : null, first: li === 0 }, l)) });
    }
});
const flat = [];
pages.forEach((p, pi) => p.lines.forEach((l, li) => {
    l.id = `p${String(pi + 1).padStart(2, '0')}-${String(li + 1).padStart(2, '0')}`;
    flat.push({ id: l.id, text: l.text, hint: l.hint || '' });
}));
const outDir = path.join(__dirname, '..', 'voice');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'script.js'),
    '// Generated by tools/build-voice-script.js. Do not edit by hand.\n' +
    '// The recording script: each line is one clip (voice/clips/<id>.mp3).\n' +
    'window.VOICE_SCRIPT = ' + JSON.stringify(flat, null, 0).replace(/\},\{/g, '},\n{') + ';\n');
fs.writeFileSync(path.join(__dirname, 'script-pages.json'), JSON.stringify(pages, null, 1));
if (!fs.existsSync(path.join(outDir, 'clips.js')))
    fs.writeFileSync(path.join(outDir, 'clips.js'), '// Which lines have been recorded: id -> file in voice/clips/. Filled in by tools/split-recording.py.\nwindow.VOICE_CLIPS = {};\n');
console.log(`${pages.length} pages, ${flat.length} lines`);
