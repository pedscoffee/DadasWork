// ============================================================
// Dada's Work: the Construction Site chain.
// One building is saved (localStorage) and each machine game
// does one step of it. The Job Site hub (job-site.html) shows
// the building as it grows.
//
// A machine game is in "job mode" when its URL has ?job=1.
// When the kid finishes the step, the game calls
//   JobSite.complete('dig')   (or 'gravel', 'pour', 'stack')
// and shows JobSite.backButton() to return to the hub.
// ============================================================
const JobSite = (() => {
    const KEY = 'dadas-jobsite-v1';

    const BUILDINGS = [
        { id: 'house', emoji: '🏠', name: 'house', floors: 2, colors: ['#e63946', '#ffb703'], roof: 'triangle' },
        { id: 'firestation', emoji: '🚒', name: 'fire station', floors: 3, colors: ['#d62828', '#f1faee'], roof: 'flat' },
        { id: 'school', emoji: '🏫', name: 'school', floors: 3, colors: ['#e9c46a', '#2a9d8f'], roof: 'flat' },
        { id: 'castle', emoji: '🏰', name: 'castle', floors: 4, colors: ['#8d99ae', '#adb5bd'], roof: 'castle' },
        { id: 'library', emoji: '📚', name: 'library', floors: 2, colors: ['#457b9d', '#a8dadc'], roof: 'triangle' },
        { id: 'tower', emoji: '🗼', name: 'tall tower', floors: 6, colors: ['#9b5de5', '#f15bb5', '#00bbf9'], roof: 'triangle' }
    ];

    // The steps, in order. `file` null = done right on the hub page.
    const STEPS = [
        { id: 'dig', emoji: '🚜', machine: 'Excavator', job: 'Dig the hole', file: 'excavator.html?job=1' },
        { id: 'gravel', emoji: '🚚', machine: 'Dump Truck', job: 'Fill it with gravel', file: 'dump-truck.html?job=1' },
        { id: 'pour', emoji: '🛢️', machine: 'Cement Mixer', job: 'Pour the floor', file: 'cement-mixer.html?job=1' },
        { id: 'stack', emoji: '🏗️', machine: 'Crane', job: 'Stack the floors', file: 'crane.html?job=1' },
        { id: 'ribbon', emoji: '✂️', machine: 'Ribbon', job: 'Cut the ribbon!', file: null }
    ];

    function fresh() { return { building: 0, step: 0, town: [], scribble: [], floors: [] }; }

    function load() {
        try {
            const s = JSON.parse(localStorage.getItem(KEY));
            if (s && typeof s.step === 'number') return Object.assign(fresh(), s);
        } catch (e) { }
        return fresh();
    }
    function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }

    const api = {
        BUILDINGS, STEPS,
        load, save,
        inJob() { return new URLSearchParams(location.search).get('job') === '1'; },
        building(s = load()) { return BUILDINGS[s.building % BUILDINGS.length]; },
        stepIndex(id) { return STEPS.findIndex(x => x.id === id); },
        // Mark a step finished (only moves forward; replays don't skip ahead)
        complete(id, extra = {}) {
            const s = load();
            const i = api.stepIndex(id);
            Object.assign(s, extra);
            if (i >= s.step) s.step = i + 1;
            save(s);
            return s;
        },
        // Ribbon cut: add the building to town, start the next job
        finishBuilding() {
            const s = load();
            const b = api.building(s);
            s.town.push({ emoji: b.emoji, name: b.name });
            s.building = (s.building + 1) % BUILDINGS.length;
            s.step = 0; s.scribble = []; s.floors = [];
            save(s);
            return s;
        },
        reset() { save(fresh()); },
        // A big "back to the job site" button for victory screens
        backButton(label = 'Back to the Job Site 🏗️') {
            const a = document.createElement('a');
            a.href = 'job-site.html';
            a.textContent = label;
            a.style.cssText = 'display:inline-block;margin:10px;padding:16px 36px;border-radius:40px;border:4px solid #fff;' +
                'background:linear-gradient(135deg,#ffb703,#fb8500);color:#fff;font:bold clamp(20px,4.5vw,30px) "Comic Sans MS","Chalkboard SE",sans-serif;' +
                'text-decoration:none;box-shadow:0 6px 0 #b55d00;';
            return a;
        },
        say(text) {
            try {
                if (!('speechSynthesis' in window)) return;
                speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(text);
                u.rate = 0.85; u.pitch = 1.15;
                speechSynthesis.speak(u);
            } catch (e) { }
        }
    };
    return api;
})();
