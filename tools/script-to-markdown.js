// Turns tools/script-pages.json into the readable recording script (voice/SCRIPT.md).
const fs = require('fs'), path = require('path');
const pages = require('./script-pages.json');
const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty'];
const INTRO = "# Dada's Work \u2014 Voice Script\n\n## How to record\n\n- **What you need:** Voice Memos on your phone, a quiet room, the phone about a foot away. Keep the same spot the whole time.\n- **Each page:** \ud83d\udc4f **clap once**, say the page number (\"Page five\"), pause, then read the lines.\n- **After every line:** pause about **one second** (a slow \"one-Mississippi\"). The pauses are how the lines get cut apart.\n- **Messed up?** Just \ud83d\udc4f clap and start that page over. The last complete take of each page is the one that's kept.\n- **Lines ending in \"\u2026\"** are pieces that get glued to a word (\"Find the word \u2026\" + \"cat\"). Say them like the middle of a sentence, without trailing off.\n- **Single words:** clear and friendly, like you're answering a question.\n- **Letter sounds:** short and clean (\"buh\", not \"BUHHH\"); hold the hissy ones (sss, mmm, fff) for about a second.\n- **In chunks is fine.** Pages 1\u20138 (cheers, hints, letters, sounds, numbers) make the biggest difference, so they're a good first sitting. Any lines that aren't recorded yet keep using the device voice.\n- **When you're done,** send me the recording(s). About 650 lines, roughly 30\u201340 minutes in total.\n\n";
let md = INTRO;
pages.forEach((p, pi) => {
    md += `\n## Page ${pi + 1}\n\n👏 **Clap once, then say "Page ${words[pi + 1]}."**\n\n`;
    p.lines.forEach((l, li) => {
        if (l.first || li === 0) md += `**${l.section}${l.first ? '' : ' (continued)'}**${l.first && l.note ? ' · _' + l.note + '_' : ''}\n\n`;
        md += `${li + 1}. ${l.text}${l.hint ? ` · _${l.hint}_` : ''}\n`;
        if (li < p.lines.length - 1 && p.lines[li + 1].first) md += '\n';
    });
});
fs.writeFileSync(path.join(__dirname, '..', 'voice', 'SCRIPT.md'), md);
console.log(md.length, 'chars');
