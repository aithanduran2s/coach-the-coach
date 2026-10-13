/* Coach the Coach — static PWA. No server. Audio never leaves the device
   except for the Gemini calls the user explicitly triggers. */

window.__boot = true;

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const CHUNK_SECONDS = 300;   // 5 min per transcription request (~12.8MB base64, under the 20MB cap)
const RATE = 16000;          // 16kHz mono is plenty for speech and keeps requests small

/* Every graded session is logged to Joey's sheet so he can see a session happened
   without the team lead having to send him anything.

   This posts to a Google Form rather than an Apps Script web app: the Mazama
   Workspace admin blocks web apps from accepting outside requests, but an
   anonymous Form submission goes through. Responses land in
   "Coach the Coach — Session Log". Blank LOG_URL disables reporting. */
const LOG_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSenAw__JwCCn07OJl7XXueRNZjfhshyzJjLlVEQfkZz-FG9iA/formResponse';
const LOG_FIELDS = {
  at:       'entry.16029254',
  lead:     'entry.1936753996',
  agent:    'entry.802614363',
  minutes:  'entry.1366046613',
  score:    'entry.778580099',
  snapshot: 'entry.170110765',
  fix:      'entry.557265612',
  next:     'entry.1061597635',  // an on-submit trigger turns this into a calendar event
  email:    'entry.544662998'    // the lead gets invited to the event, so her phone reminds her
};

/* The coaching standard ships with the app so a team lead installs and is ready.
   Declared up here because cfg.rubric falls back to it during initial setup. */
const STANDARD = `COACHING STANDARD v2 — grade the technique, not the call

HOW TO READ THIS STANDARD
Every item below is a MOVE the team lead either made or did not make. The "Sounds like"
lines are illustrations of what the move sounds like — they come from one particular
call about one particular customer. They are NOT the answer the lead has to produce.
Never mark a lead down for failing to mention a provider, a price, a product or a
customer detail that appears in an example. Grade whether the MOVE happened, on
whatever material this lead's session actually contained.

HARD FAILS — any one of these caps the session at 55

HF1. Made it about the person instead of the call. Character or trait verdicts
("you're not hungry," "you lack confidence"), or ranking against peers. Describing a
repeated behavior ("your customers control your calls") is fine. Describing the person
is not.
HF2. The lead gave their verdict before the agent self-assessed.
HF3. Session ended with no commitment the agent stated in their own words.
HF4. Session ended with no checkpoint date.
HF5. Firehose — five or more things to fix. The agent changes nothing.

=== OPEN ===

1. MADE THE AGENT SELF-ASSESS FIRST, IN THREE PARTS
The lead's first move is a question, not a verdict: what went well, what could improve,
what to stop. The lead offers no evaluation until the agent has gone first.
Sounds like: "Tell me what you think about your call. Be honest. What you did good,
what you think you can improve, and what you think maybe you should stop doing."
Fail: leading with the lead's own read of the call.

2. PRESSED AGAIN WHEN THE SELF-ASSESSMENT CAME BACK EMPTY
"I don't know" is not an answer the lead accepts and moves past — a blind spot is the
finding, and the lead surfaces it rather than filling it in.
Sounds like: "Is there any part of the call you think you could have done better?"
Fail: taking "no, it was fine" and proceeding to the lead's list.

3. AUDITED THE TOOLS AND THE FACTS BEFORE JUDGING
Establishes what the agent actually did and actually saw before evaluating any of it.
Sounds like: "What tools did you use?" then "So in that system, you only saw one
provider available?"
Fail: accepting the agent's account of the call at face value and coaching off it.

=== DIAGNOSE ===

4. ANCHORED EVERY CRITICISM TO A QUOTED MOMENT
Replays what was actually said, then what it cost. No adjectives about the agent, no
guessed motive.
Sounds like: "She told you it was ending on the 14th. Today's the 12th. She has two
more days of internet, and you didn't use that to create any urgency at all."
Fail: "you tend to..." / "you need to build more value" with nothing quoted.

5. EXPOSED THE GAP WITH A QUESTION THE AGENT HAD TO ANSWER
Rather than announcing the miss, the lead asks a question the agent cannot answer
without conceding it. The agent says it out loud, so there's nothing to defend against.
Sounds like: "How long has she been with her provider? You told her it's a long time,
but you never asked. Did you?" — "No." — "Exactly. So how do you know?"
Fail: telling the agent what they missed and moving on.

6. FORCED A SPECIFIC ONTO A VAGUE CLAIM
Any time a number, name or detail is fuzzy — on the call or in the room — the lead
stops and pins it down.
Sounds like: "You told her it was a significant discount. How much is significant?" /
"Which provider?" / "Fifty dollars for what? Which service?"
Fail: letting "significant," "a lot," "better" pass unchallenged.

7. NAMED IT AS A REPEAT WHEN IT WAS ONE
If this has been coached before, the lead says so, and says when — it changes the
conversation from a miss into a pattern the agent now owns.
Sounds like: "I gave you that feedback right before this call. Same type of call, and
you didn't apply it. We talked about this last week."
Fail: treating a known recurring miss as a fresh observation.
Note: only score this if the transcript shows the lead had prior coaching to reference.
If nothing in the session indicates a repeat, mark it Not observed, not a miss.

=== TEACH ===

8. NAMED A SPECIFIC THING THAT WORKED, QUOTED, WITH THE SAME PRECISION AS THE CORRECTION
A real moment and why it worked.
Sounds like: "You got her laughing. Her guard was down. She gave you her Social without
hesitating — that's hard to get and you earned it."
Fail: "good energy today," or praise used only as padding around the criticism.
Do NOT grade a positive-to-negative ratio and do NOT reward praise wrapped around a
correction. What is graded here is specificity, not quantity.

9. MODELED THE BETTER VERSION WORD FOR WORD
The lead actually speaks the lines, in full, the way they should sound. Not a
description of them.
Sounds like: running the whole opener aloud — "Oh, that's a good company to have. How
long have you been with them?... So I imagine you're planning on not renewing, right?..."
Fail: "you need to ask better probing questions."

10. HAD THE AGENT RUN IT BACK IN THE ROOM
The agent performs the new behavior at least once, out loud, before leaving — on an
objection they actually got. Framed as practice, not a test: "run it at me, we'll mess
it up a few times."
Fail: the lead models it and the session moves on. Modeling without rehearsal is the
most commonly skipped phase and the one with the best transfer evidence.

11. MADE THE COST CONCRETE
Plays the consequence forward, or scales it, so the miss stops being abstract.
Sounds like: "If you'd sold this and she said 'he lied to me' — she'd probably be
right." / "You're taking 200 to 300 calls a day. That's over 1,000 calls a week."
Fail: naming the error with no stake attached.

=== OWNERSHIP ===

12. REFUSED TO OWN THE FIX ALONE
Hands the problem back and waits. The lead does not answer their own question or supply
the agent's solution.
Sounds like: "I'm giving you the feedback. What are you doing with it?" — silence —
"See, no, I'm asking you."
Fail: the lead fills the silence and prescribes.

13. TOOK THE EXCUSE SERIOUSLY AND REMOVED IT AS AN EXCUSE
Accepts the premise, then turns it into the agent's responsibility. Doesn't argue with
it and doesn't let it stand.
Sounds like: "You forget. Okay, that's fine. But because you know you forget —
shouldn't you do something about it?"
Fail: dismissing it ("that's not an excuse") or accepting it and moving on.
Note: only score this if the agent actually offered an excuse.

14. SEPARATED THE PROCESS FROM THE OUTCOME
Makes clear the measure is the behavior, not the sale. Coaches what's visible on the
next dial.
Sounds like: "Even if you'd done all of this, you still might not have gotten the sale.
You're not going to be perfect 10 out of 10 — but you can't fail 10 out of 10 either."
Fail: coaching the result ("your close rate is down") — a lagging number the agent
can't act on in the next hour.

=== CLOSE ===

15. LEFT WITH ONE OR TWO BEHAVIORS, NOT A LIST
Everything else observed gets parked for a later session.
Fail: five or more fixes — see HF5.

16. TURNED THE COMMITMENT INTO A TRIGGER, STATED BY THE AGENT
Not "I'll build more value" but: when X happens, I will do Y — the cue named, not just
the intention. And the agent says it back in their own words; the lead does not
summarize it for them.
Sounds like: "So when they tell you who their current provider is, what's the next
thing out of your mouth?" — and the agent answers.

17. DEMANDED A VISIBLE ARTIFACT AND NAMED HOW IT GETS VERIFIED
Something physical the lead will actually lay eyes on.
Sounds like: "I need to see that in your notepad," plus the lead checking the desk that
week.
Fail: a commitment that exists only in the conversation.

18. BOOKED THE CHECKPOINT, AND COMMITTED TO THE LEAD'S OWN DELIVERABLE
A date, not "we'll check in." And the lead leaves with homework too.
Sounds like: "I'm going to write out the important notes from this call and send them
to you."
Fail: the agent owes something and the lead owes nothing.

19. ASKED WHAT THE AGENT NEEDS, AND ANSWERED IT
Sounds like: "Is there anything you need from me to help you?" — and when the agent
raises a real gap, the lead treats it as a legitimate ask rather than an excuse.
Fail: skipping it, or hearing the ask and letting it die.

20. CHECKED UNDERSTANDING — AND RE-ASKED WHEN IT WAS DODGED
Sounds like: "Any questions about that?" then the agent deflects, then "Do you have any
questions about that, though?"
Fail: accepting a nod.

21. CLOSED WARM WITHOUT SOFTENING THE MESSAGE
The correction stands; the relationship is intact.
Sounds like: "You're not perfect. You're not a machine. Thanks for your time."
Fail: ending cold, or walking the feedback back at the door.

=== NOT GRADED — ON PURPOSE ===

- Talk ratio. Report who talked more as an observation. Do not score it.
- Whether the sale closed. Not the lead's measure. See item 14.
- Anything this standard does not cover. Say "not covered by the standard" rather than
  inventing a best practice.
- Any subject matter, provider, product or customer detail from the examples above.`;
const $ = id => document.getElementById(id);
const cfg = {
  get key()    { return localStorage.getItem('ctc.key') || ''; },
  set key(v)   { localStorage.setItem('ctc.key', v); },
  get rubric() { return localStorage.getItem('ctc.rubric') || STANDARD; },
  set rubric(v){ localStorage.setItem('ctc.rubric', v); },
  get lang()   { return localStorage.getItem('ctc.lang') || 'English'; },
  set lang(v)  { localStorage.setItem('ctc.lang', v); },
  get model()  { return localStorage.getItem('ctc.model') || ''; },
  set model(v) { localStorage.setItem('ctc.model', v); },
  get email()  { return localStorage.getItem('ctc.email') || ''; },
  set email(v) { localStorage.setItem('ctc.email', v); },
};
const store = {
  all()  { try { return JSON.parse(localStorage.getItem('ctc.sessions') || '[]'); } catch { return []; } },
  save(s){ const a = store.all(); a.unshift(s); localStorage.setItem('ctc.sessions', JSON.stringify(a)); },
  del(id){ localStorage.setItem('ctc.sessions', JSON.stringify(store.all().filter(s => s.id !== id))); },
  put(s) { const a = store.all().map(x => x.id === s.id ? s : x);
           localStorage.setItem('ctc.sessions', JSON.stringify(a)); },
  gold() { return store.all().filter(s => s.gold); },   // Joey's own sessions = the standard
};

// 'grade' = a team lead's session, score it. 'teach' = Joey's own, learn from it.
let mode = 'grade';

/* ---------------- views ---------------- */
const views = { vRec: 'tRec', vHist: 'tHist', vSet: 'tSet', vOut: null };
function show(v) {
  Object.keys(views).forEach(k => $(k).classList.toggle('hide', k !== v));
  ['tRec','tHist','tSet'].forEach(t => $(t).classList.toggle('on', views[v] === t));
  if (v === 'vHist') renderHistory();
}
$('tRec').onclick  = () => show('vRec');

function setMode(m) {
  mode = m;
  $('modeGrade').classList.toggle('on', m === 'grade');
  $('modeTeach').classList.toggle('on', m === 'teach');
  $('lbLead').textContent = m === 'grade' ? 'Team lead being coached' : 'Who ran the session';
  $('lead').placeholder = m === 'grade' ? 'e.g. Yasmin' : 'Joey';
  $('modeHelp').textContent = m === 'grade'
    ? 'Transcribed, then graded against your rubric.'
    : 'Transcribed and saved as your reference standard. Not graded.';
  $('btnGo').textContent = m === 'grade' ? 'Transcribe & coach' : 'Transcribe & save as my standard';
  // Joey's own sessions aren't logged, so there is nothing to put on the calendar.
  $('nextWrap').classList.toggle('hide', m !== 'grade');
}
$('modeGrade').onclick = () => setMode('grade');
$('modeTeach').onclick = () => setMode('teach');
$('tHist').onclick = () => show('vHist');
$('tSet').onclick  = () => show('vSet');
$('btnBack').onclick = () => show('vHist');

function err(msg) { $('recErr').innerHTML = `<div class="err">${esc(msg)}</div>`; }
function clearErr() { $('recErr').innerHTML = ''; }

/* Nothing is saved, logged or put on a calendar, and the recording is left loaded on
   purpose — a lead who stopped early can keep going rather than lose the audio. */
function notASession(reason) {
  $('progWrap').classList.add('hide');
  $('progTxt').textContent = '';
  $('recErr').innerHTML =
    `<div class="notice"><b>This doesn\u2019t look like a coaching session, so there\u2019s nothing to grade.</b>`
    + (reason ? `\n${esc(reason)}` : '')
    + `\n\nNothing was saved. Your recording is still here \u2014 record over it, or tap Discard.</div>`;
}
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
const mmss = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;

/* ---------------- recording ---------------- */
let rec = null, chunks = [], t0 = 0, tick = null, stream = null, audioBlob = null, meterRaf = null;

$('btnRec').onclick = () => (rec && rec.state === 'recording') ? stopRec() : startRec();

async function startRec() {
  clearErr();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
  } catch (e) {
    return err('Microphone blocked. Allow mic access for this site, then try again.\n\n' + e.message);
  }
  chunks = [];
  const mime = ['audio/mp4','audio/webm;codecs=opus','audio/webm']
    .find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = finishRec;
  rec.start(1000);

  t0 = Date.now();
  $('timer').innerHTML = '<span class="dot"></span>00:00';
  tick = setInterval(() => {
    $('timer').innerHTML = '<span class="dot"></span>' + mmss((Date.now() - t0) / 1000);
  }, 500);

  $('btnRec').textContent = 'Stop recording';
  $('btnRec').classList.add('stop');
  $('btnFile').disabled = true;
  meter(stream);
}

function stopRec() { if (rec && rec.state === 'recording') rec.stop(); }

function finishRec() {
  clearInterval(tick);
  cancelAnimationFrame(meterRaf);
  stream.getTracks().forEach(t => t.stop());
  $('lvl').style.width = '0%';
  $('btnRec').textContent = 'Start recording';
  $('btnRec').classList.remove('stop');
  $('btnFile').disabled = false;
  const secs = (Date.now() - t0) / 1000;
  $('timer').textContent = mmss(secs);
  loadBlob(new Blob(chunks, { type: rec.mimeType || 'audio/mp4' }), secs);
}

function meter(s) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const an = ac.createAnalyser(); an.fftSize = 512;
  ac.createMediaStreamSource(s).connect(an);
  const buf = new Uint8Array(an.frequencyBinCount);
  (function loop() {
    an.getByteTimeDomainData(buf);
    let peak = 0;
    for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
    $('lvl').style.width = Math.min(100, peak * 180) + '%';
    meterRaf = requestAnimationFrame(loop);
  })();
}

$('btnFile').onclick = () => $('file').click();
$('file').onchange = e => { const f = e.target.files[0]; if (f) loadBlob(f, null); };

function loadBlob(blob, secs) {
  audioBlob = blob;
  $('player').src = URL.createObjectURL(blob);
  const mb = (blob.size / 1048576).toFixed(1);
  $('recInfo').textContent = (secs ? mmss(secs) + ' · ' : '') + mb + ' MB captured';
  $('doneCard').classList.remove('hide');
  $('progWrap').classList.add('hide');
  $('progTxt').textContent = '';
}

/* Download the raw recording. The only copy of the audio is this in-memory blob,
   so this is the one chance to get it off the device before Discard or a reload. */
$('btnDl').onclick = () => {
  if (!audioBlob) return;
  const ext = (audioBlob.type.split('/')[1] || 'webm').split(';')[0];
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(audioBlob);
  a.download = `coaching-${stamp}.${ext}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
};

$('btnScrap').onclick = () => {
  audioBlob = null;
  $('doneCard').classList.add('hide');
  $('timer').textContent = '00:00';
  $('file').value = '';
  clearErr();
};

/* ---------------- audio → 16kHz mono WAV chunks ---------------- */
async function toWavChunks(blob) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ac.decodeAudioData(await blob.arrayBuffer());

  // downmix to mono
  const n = buf.length, mono = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels;
  }
  // linear resample to 16kHz (works everywhere; OfflineAudioContext rates vary by browser)
  const ratio = buf.sampleRate / RATE;
  const outLen = Math.floor(n / ratio);
  const pcm = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const p = i * ratio, i0 = Math.floor(p), f = p - i0;
    pcm[i] = (mono[i0] || 0) * (1 - f) + (mono[i0 + 1] || 0) * f;
  }
  ac.close();

  const per = CHUNK_SECONDS * RATE, out = [];
  for (let s = 0; s < pcm.length; s += per) out.push(wav(pcm.subarray(s, Math.min(s + per, pcm.length))));
  return { parts: out, duration: outLen / RATE };
}

function wav(f32) {
  const b = new ArrayBuffer(44 + f32.length * 2), v = new DataView(b);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + f32.length * 2, true); str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, f32.length * 2, true);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return b64(new Uint8Array(b));
}

function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/* ---------------- Gemini ---------------- */
/* Model names get retired (2.5-flash stopped accepting new keys). Never hardcode one —
   ask the key what it can actually run and pick the best fit. */
async function listModels() {
  const r = await fetch(`${BASE}/models?key=${encodeURIComponent(cfg.key)}&pageSize=200`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Could not list models (${r.status})`);
  return (j.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(n => !/embedding|aqa|tts|image|vision|live|learnlm|gemma/i.test(n));
}

// Prefer the newest non-lite flash: cheapest model that still handles audio well.
function rank(n) {
  const v = parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
  let s = v * 100;
  if (/flash/.test(n)) s += 50;
  if (/pro/.test(n)) s += 20;
  if (/lite/.test(n)) s -= 40;
  if (/preview|exp/.test(n)) s -= 15;
  if (/latest/.test(n)) s += 5;
  return s;
}

let MODELS = [];   // ranked, best first — used for fallback when one is overloaded

async function pickModel() {
  const models = await listModels();
  if (!models.length) throw new Error('This key has no usable models.');
  MODELS = models.sort((a, b) => rank(b) - rank(a));
  cfg.model = MODELS[0];
  return { best: cfg.model, models: MODELS };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Free-tier models get overloaded and the browser surfaces it as a bare "Failed to fetch".
const transient = (status, msg = '') =>
  status === 429 || status === 500 || status === 503 || status === 0 ||
  /high demand|overload|try again|unavailable|rate limit|quota/i.test(msg);

async function gemini(parts, gen = {}, onNote = () => {}) {
  if (!cfg.model) await pickModel();

  const body = { contents: [{ parts }], generationConfig: { temperature: 0.3, maxOutputTokens: 8192, ...gen } };

  const call = async model => {
    try {
      const r = await fetch(
        `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(cfg.key)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      return { status: r.status, ok: r.ok, j: await r.json().catch(() => ({})) };
    } catch (e) {
      return { status: 0, ok: false, j: { error: { message: e.message } } }; // network/overload
    }
  };

  // Try the chosen model with backoff, then walk down the ranked list.
  const queue = [cfg.model, ...MODELS.filter(m => m !== cfg.model).slice(0, 3)];
  let last = 'Gemini call failed';

  for (let mi = 0; mi < queue.length; mi++) {
    const model = queue[mi];
    if (mi > 0) onNote(`Switching to ${model}…`);

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) { onNote(`Busy — retrying (${attempt}/2)…`); await sleep(1500 * 2 ** (attempt - 1)); }

      let { status, ok, j } = await call(model);
      const msg = j?.error?.message || '';

      // Not every model accepts thinkingConfig; drop it and retry rather than failing.
      if (!ok && body.generationConfig.thinkingConfig && /thinking/i.test(msg)) {
        delete body.generationConfig.thinkingConfig;
        ({ status, ok, j } = await call(model));
      }

      if (ok) {
        const c = j.candidates?.[0];
        const text = c?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
        if (text) { cfg.model = model; return text; }
        last = 'Gemini returned no text' + (c?.finishReason ? ` (${c.finishReason})` : '');
        break; // empty response won't fix itself on retry
      }

      last = j?.error?.message || `Gemini returned ${status}`;
      if (!transient(status, last)) return Promise.reject(new Error(last)); // real error: stop
    }
  }
  throw new Error(last);
}

const TRANSCRIBE = `Transcribe this audio verbatim.

Context: it is a one-on-one coaching conversation at a call center, between a TEAM LEAD and a sales AGENT. It may be in English, Spanish, or a mix of both. Transcribe in whatever language is actually spoken — do not translate.

Rules:
- Label every turn as "TEAM LEAD:" or "AGENT:". The team lead is the one asking questions, giving direction, or reviewing performance.
- If you genuinely cannot tell who is speaking, use "SPEAKER:".
- Include filler and false starts. Do not clean up, summarize, or paraphrase.
- Mark anything inaudible as [inaudible].
- Output the transcript only. No preamble.`;

/* Models sometimes prepend a "Transcript:" label or echo the instructions back.
   The transcript is guaranteed to start at the first speaker label, so cut to it. */
function cleanTranscript(t) {
  // Take the first label that starts an actual turn, skipping ones merely quoted
  // inside echoed instructions (e.g. - Labels: "TEAM LEAD:" or "AGENT:").
  const re = /(TEAM LEAD|AGENT|SPEAKER)\s*:/g;
  for (let m; (m = re.exec(t)); ) {
    const before = t[m.index - 1], after = t[m.index + m[0].length];
    if (before === '"' || before === "'" || before === '\u201c') continue; // quoted mention
    if (after === '"' || after === "'" || after === '\u201d') continue;    // label inside quotes
    return t.slice(m.index).trim();
  }
  return t.replace(/^\s*(transcript|transcripci[óo]n)\s*:?\s*/i, '').trim();
}

/* The manager's own sessions are the reference standard. Two most recent, capped
   so a long session can't crowd out the rubric. */
function goldBlock() {
  const g = store.gold().slice(0, 2);
  if (!g.length) return '';
  return `
=== HOW THE HEAD MANAGER COACHES (the benchmark) ===
These are real sessions run by the manager who set the standard above. Study the MOVES he
makes — how he opens, how he questions, how he closes. Do not treat the calls he discusses,
the providers, products or customers in them as subject matter the team lead was supposed to
cover. Judge the team lead on the same moves applied to their own session.

${g.map((s, i) => `--- Reference session ${i + 1} ---\n${s.transcript.slice(0, 6000)}`).join('\n\n')}
=== END OF BENCHMARK ===
`;
}

const coachPrompt = (rubric, lang, lead, agent) => `You are a senior call-center director reviewing how well one of your team leads coached a sales agent. You are coaching the COACH, not the agent.

=== THE STANDARD YOU GRADE AGAINST ===
${rubric}
=== END OF STANDARD ===
${goldBlock()}

BEFORE YOU GRADE, CHECK THIS IS ACTUALLY A COACHING SESSION.
A coaching session is a team lead and an agent talking about the agent's calls or performance.
If the transcript is NOT that — a few seconds of test audio, silence, someone checking the mic,
a sales call, a meeting with no coaching in it, or too little conversation to judge — then do
not grade it and do not score it. Output exactly one line and nothing else:
NOT_A_SESSION: <one short sentence saying what the recording appears to be>
Only do this when you are confident. A real session that went badly is still a session — grade
it. A short session is still a session if coaching happened in it.

Grade ONLY against the standard above. If the standard does not cover something, say so rather than inventing a best practice.

CRITICAL — how to use the examples in the standard. Every "Sounds like" line is an
illustration of what a coaching MOVE sounds like, drawn from one specific call about one
specific customer. It is not an answer key. You are grading whether the lead made the move,
not whether they produced the example's words, provider, product, price or subject matter.
Never dock a lead for not mentioning anything that appears only in an example. If an item
describes a situation that did not arise in this session, mark it Not observed and do not
subtract for it.
Every "better version" you write must be built from THIS session's transcript — this agent,
this lead, the objections and customers they actually discussed. Do not import content from
the examples.

Team lead: ${lead || 'unnamed'}
Agent being coached: ${agent || 'unnamed'}

Write your response in ${lang}, using these exact section headings:

## Score
A single line, exactly this format and nothing else on the line:
SCORE: NN/100
Where NN is a whole number. Score only the items the session gave the lead a chance to make.
Start at 100, subtract for each of those the lead missed, and subtract nothing for items marked
Not observed because the situation never arose. A session that trips any hard fail cannot score
above 55. Do not grade on a curve and do not be generous.
On the next line, one short sentence justifying the number.

## Snapshot
Two sentences: what this session was about and how it went.

## Scorecard
One line per item in the standard: the item name, a rating of Strong / Adequate / Needs work / Not observed, and a half-line of why.

## What the lead did well
2-4 bullets. Quote the transcript directly for each one.

## What to fix
2-4 bullets, most important first. For each: quote what the lead actually said, then write the better version word-for-word.

## Missed opportunities
Things the agent raised that the lead let slide.

## Talk ratio and tone
Who talked more, whether the lead asked real questions or just told, and how the agent seemed to receive it.

## One thing for next session
A single concrete behavior change. Not advice — an instruction.

Be direct and specific. Quote the transcript constantly. Never give generic coaching advice that could apply to any session.

=== TRANSCRIPT ===
`;

/* ---------------- score + reporting ---------------- */
// The model is told to emit "SCORE: NN/100" on its own line. Anything else means
// it ignored the format, and a missing score is better than a made-up one.
function parseScore(text) {
  const m = /SCORE:\s*(\d{1,3})\s*\/\s*100/i.exec(text || '');
  if (!m) return null;
  const n = +m[1];
  return n >= 0 && n <= 100 ? n : null;
}

/* A throwaway test recording used to come back as a real 0/100 scorecard, which reads
   like a verdict on the team lead. Nothing that isn't a coaching session gets a score,
   a row in the log, or a calendar invite.

   Two layers: this one catches the obvious junk for free before spending a grading call,
   and the prompt asks the model to emit NOT_A_SESSION for everything subtler. The bar
   here is deliberately low — only clearly-nothing recordings — because a real session
   wrongly rejected is far worse than a test recording that slips through to the model. */
function tooThinToGrade(transcript, duration) {
  const words = (transcript || '').trim().split(/\s+/).filter(Boolean).length;
  if (duration < 45)  return 'The recording is only ' + Math.round(duration) + ' seconds long.';
  if (words    < 60)  return 'There is almost nothing said in the recording.';
  return null;
}

const NOT_A_SESSION = /^\s*NOT_A_SESSION\s*:?\s*(.*)$/im;

/* Fire-and-forget. no-cors because Forms sends no CORS headers — we never read
   the response, and a failed log must never surface to the team lead mid-session. */
function logSession(s) {
  if (!LOG_URL || s.gold) return;          // Joey's own sessions aren't reported
  try {
    const f = new FormData();
    f.append(LOG_FIELDS.at,       new Date(s.at).toLocaleString());
    f.append(LOG_FIELDS.lead,     s.lead || '(not named)');
    f.append(LOG_FIELDS.agent,    s.agent || '(not named)');
    f.append(LOG_FIELDS.minutes,  String(Math.round((s.duration || 0) / 60)));
    f.append(LOG_FIELDS.score,    s.score == null ? '' : String(s.score));
    f.append(LOG_FIELDS.snapshot, sectionOf(s.coaching, 'Snapshot').slice(0, 900));
    f.append(LOG_FIELDS.fix,      sectionOf(s.coaching, 'One thing for next session').slice(0, 900));
    // Send an absolute timestamp, resolved on this device: a lead in El Salvador
    // picking 2:30 must mean 2:30 where they are, not 2:30 on Joey's clock.
    f.append(LOG_FIELDS.next,     s.next ? new Date(s.next).toISOString() : '');
    f.append(LOG_FIELDS.email,    cfg.email || '');
    fetch(LOG_URL, { method: 'POST', mode: 'no-cors', body: f }).catch(() => {});
  } catch (e) { /* never break the app over reporting */ }
}

function sectionOf(text, heading) {
  const re = new RegExp('^##\\s*' + heading + '[ \\t]*$([\\s\\S]*?)(?=^##[ \\t]|$(?![\\s\\S]))', 'mi');
  const m = re.exec(text || '');
  return m ? m[1].trim() : '';
}

/* ---------------- run ---------------- */
$('btnGo').onclick = async () => {
  clearErr();
  if (!cfg.key) { show('vSet'); return err('Add your Gemini API key in Setup first.'); }
  if (mode === 'grade' && !cfg.rubric.trim()) {
    show('vSet'); return err('Add your coaching rubric in Setup first — it is what the AI grades against.');
  }
  if (!audioBlob) return err('No audio loaded.');

  const btn = $('btnGo');
  btn.disabled = true;
  $('progWrap').classList.remove('hide');
  const setProg = (pct, txt) => { $('prog').style.width = pct + '%'; $('progTxt').textContent = txt; };

  try {
    setProg(5, 'Preparing audio…');
    const { parts, duration } = await toWavChunks(audioBlob);

    const pieces = [];
    for (let i = 0; i < parts.length; i++) {
      setProg(10 + (i / parts.length) * 65, `Transcribing part ${i + 1} of ${parts.length}…`);
      pieces.push(await gemini(
        [{ text: parts.length > 1 ? `${TRANSCRIBE}\n\nThis is part ${i + 1} of ${parts.length} of a longer session; it may start mid-sentence.` : TRANSCRIBE },
         { inline_data: { mime_type: 'audio/wav', data: parts[i] } }],
        { maxOutputTokens: 32768, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
        note => setProg(10 + (i / parts.length) * 65, note)
      ));
    }
    const transcript = pieces.map(cleanTranscript).join('\n\n');

    const lead = $('lead').value.trim(), agent = $('agent').value.trim();
    let coaching = '';

    if (mode === 'grade') {
      const thin = tooThinToGrade(transcript, duration);
      if (thin) return notASession(thin);

      setProg(82, 'Writing the coaching…');
      coaching = await gemini(
        [{ text: coachPrompt(cfg.rubric, cfg.lang, lead, agent) + transcript }],
        { maxOutputTokens: 16384, thinkingConfig: { thinkingBudget: 2048 } },
        note => setProg(82, note)
      );

      const m = NOT_A_SESSION.exec(coaching);
      if (m) return notASession(m[1].trim());
    }

    setProg(100, 'Done');
    const sess = {
      id: Date.now(), at: new Date().toISOString(), gold: mode === 'teach',
      lead, agent, duration: Math.round(duration), transcript, coaching,
      score: parseScore(coaching), next: $('next1on1').value
    };
    store.save(sess);
    logSession(sess);
    $('btnScrap').click();
    $('lead').value = ''; $('agent').value = ''; $('next1on1').value = '';  // don't carry onto the next session
    refreshGoldCount();
    openSession(sess);
  } catch (e) {
    err(e.message);
    $('progWrap').classList.add('hide');
    $('progTxt').textContent = '';
  } finally {
    btn.disabled = false;
  }
};

/* ---------------- output ---------------- */
let current = null;
function openSession(s) {
  current = s;
  $('outTitle').innerHTML = esc(s.lead || 'Team lead') + ' coaching ' + esc(s.agent || 'agent') +
    (s.gold ? '<span class="pill">MY STANDARD</span>' : '');
  $('outSub').textContent = new Date(s.at).toLocaleString() + ' · ' + mmss(s.duration);
  $('btnGold').textContent = s.gold ? 'Remove from my standard' : 'Use as my standard';

  // A gold session has no coaching to show — open it on the transcript.
  const hasCoaching = !!s.coaching;
  $('tCoach').classList.toggle('hide', !hasCoaching);
  $('btnMail').classList.toggle('hide', !hasCoaching);
  // Copy and Download always available — on a gold session they act on the transcript.
  $('btnCopy').classList.remove('hide');
  $('btnCopy').textContent = hasCoaching ? 'Copy' : 'Copy transcript';
  $('btnTxt').textContent = 'Download';
  $('outCoach').innerHTML = hasCoaching ? md(s.coaching)
    : '<p class="muted">Saved as your reference standard. No grading on your own sessions.</p>';
  $('outScript').textContent = s.transcript;

  $('tCoach').classList.toggle('on', hasCoaching);
  $('tScript').classList.toggle('on', !hasCoaching);
  $('outCoach').classList.toggle('hide', !hasCoaching);
  $('outScript').classList.toggle('hide', hasCoaching);
  show('vOut');
  window.scrollTo(0, 0);
}
$('tCoach').onclick = () => {
  $('tCoach').classList.add('on'); $('tScript').classList.remove('on');
  $('outCoach').classList.remove('hide'); $('outScript').classList.add('hide');
};
$('tScript').onclick = () => {
  $('tScript').classList.add('on'); $('tCoach').classList.remove('on');
  $('outScript').classList.remove('hide'); $('outCoach').classList.add('hide');
};

// minimal markdown: headings + bullets + bold
function md(t) {
  return esc(t)
    .replace(/^#{2,3}\s*(.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^[-*]\s+(.+)$/gm, '• $1');
}

$('btnCopy').onclick = async () => {
  const label = current.coaching ? 'Copy' : 'Copy transcript';
  const text = current.coaching || current.transcript || '';
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    // iOS Safari refuses the async clipboard outside a trusted gesture chain.
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  $('btnCopy').textContent = 'Copied'; setTimeout(() => $('btnCopy').textContent = label, 1200);
};

/* Save the write-up as a file. A gold session has no coaching, so it saves the
   transcript instead — same as Copy does. */
$('btnTxt').onclick = () => {
  const d = new Date(current.at);
  const head = [
    `${current.lead || 'Team lead'} coaching ${current.agent || 'agent'}`,
    `${d.toLocaleString()} · ${mmss(current.duration)}` +
      (current.score != null ? ` · scored ${current.score}/100` : ''),
    ''
  ].join('\n');
  const body = current.coaching || current.transcript || '';
  const slug = s => (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const name = ['coaching', slug(current.lead), slug(current.agent),
    d.toISOString().slice(0, 10)].filter(Boolean).join('-') + '.txt';

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([head + body], { type: 'text/plain' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  $('btnTxt').textContent = 'Saved'; setTimeout(() => $('btnTxt').textContent = 'Download', 1200);
};
$('btnMail').onclick = () => {
  const sub = `Coaching feedback — ${current.lead || 'session'} / ${new Date(current.at).toLocaleDateString()}`;
  location.href = `mailto:?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(current.coaching.slice(0, 1800))}`;
};
$('btnDel').onclick = () => {
  if (!confirm('Delete this session permanently?')) return;
  store.del(current.id); current = null; show('vHist');
};

function renderHistory() {
  const a = store.all();
  $('histList').innerHTML = a.length
    ? a.map(s => `<div class="sess" data-id="${s.id}">
        <div><b>${esc(s.lead || 'Team lead')} → ${esc(s.agent || 'agent')}</b>${s.gold ? '<span class="pill">MY STANDARD</span>' : ''}${s.score != null ? `<span class="pill">${s.score}</span>` : ''}
        <div class="muted">${new Date(s.at).toLocaleString()} · ${mmss(s.duration)}</div></div>
        <span class="muted">›</span></div>`).join('')
    : '<p class="muted">No sessions yet. Record one on the Record tab.</p>';
  $('histList').querySelectorAll('.sess').forEach(el =>
    el.onclick = () => openSession(store.all().find(s => s.id == el.dataset.id)));
}

$('btnGold').onclick = () => {
  current.gold = !current.gold;
  store.put(current);
  openSession(current);
  refreshGoldCount();
};

/* ---------------- setup ---------------- */
$('key').value = cfg.key;
$('rubric').value = cfg.rubric;
$('outLang').value = cfg.lang;
$('myEmail').value = cfg.email;

$('btnSave').onclick = () => {
  cfg.key = $('key').value.trim();
  cfg.lang = $('outLang').value;
  cfg.email = $('myEmail').value.trim();
  $('setMsg').textContent = 'Saved';
  $('setMsg').className = 'ok';
  setTimeout(() => $('setMsg').textContent = '', 1800);
};

$('btnSaveRubric').onclick = () => {
  cfg.rubric = $('rubric').value;
  $('rubricMsg').textContent = 'Rubric saved';
  $('rubricMsg').className = 'ok';
  setTimeout(() => $('rubricMsg').textContent = '', 1800);
};

/* Owner mode: the rubric and the learn-from-my-sessions tools are Joey's, not the
   team leads'. Unlock once per device by opening the app with #owner on the URL. */
if (location.hash === '#owner') { localStorage.setItem('ctc.owner', '1'); history.replaceState(null, '', location.pathname); }
if (location.hash === '#teamlead') { localStorage.removeItem('ctc.owner'); history.replaceState(null, '', location.pathname); }
if (localStorage.getItem('ctc.owner') === '1') {
  $('cardRubric').classList.remove('hide');
  $('cardLearn').classList.remove('hide');
  // A team lead must never reach 'teach' mode — it skips the log and the calendar.
  $('modeWrap').classList.remove('hide');
}

$('btnTest').onclick = async () => {
  cfg.key = $('key').value.trim();
  if (!cfg.key) { $('keyMsg').textContent = 'Paste a key first.'; return; }
  $('keyMsg').textContent = 'Checking…'; $('keyMsg').className = 'muted';
  try {
    const { best, models } = await pickModel();
    fillModels(models, best);
    await gemini([{ text: 'Reply with the single word: ok' }]);
    $('keyMsg').textContent = `Key works — using ${best}`;
    $('keyMsg').className = 'ok';
  } catch (e) {
    $('keyMsg').textContent = e.message;
    $('keyMsg').className = 'muted';
  }
};

function fillModels(models, selected) {
  const s = $('model');
  s.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
  s.value = selected;
  $('modelWrap').classList.remove('hide');
}
$('model').onchange = e => {
  cfg.model = e.target.value;
  $('keyMsg').textContent = `Using ${e.target.value}`;
  $('keyMsg').className = 'ok';
};

/* ---------------- learn from Joey's own sessions ---------------- */
function refreshGoldCount() {
  const n = store.gold().length;
  $('goldCount').innerHTML = n
    ? `<b class="ok">${n} of your own session${n > 1 ? 's' : ''} saved.</b>`
    : 'No sessions of your own yet.';
  $('btnLearn').disabled = n === 0;
}

const LEARN = (rubric, lang, sessions) => `You are reverse-engineering a coaching standard from real practice.

Below are transcripts of ${sessions.length} one-on-one coaching session${sessions.length > 1 ? 's' : ''} run by the head manager of a sales call center. He is the benchmark — his habits ARE the standard.

Your job: rewrite the coaching rubric so it captures how HE actually coaches, not generic management theory.

Current rubric (keep what still holds, correct what contradicts his practice, add what is missing):
=== CURRENT RUBRIC ===
${rubric || '(none yet)'}
=== END ===

Rules:
- Every item must be something observably present in the transcripts. No invented best practices.
- Keep his actual phrasing where he has a signature move — quote it as the example.
- Write each item as: a NUMBERED NAME, one line of what it means, then "Pass:" and "Fail:" examples drawn from or modeled on the transcripts.
- Keep a HARD FAILS section at the end for things he clearly never does.
- 6 to 10 items. If the transcripts only support 6, write 6.
- Output the rubric only — no commentary, no preamble. Write it in ${lang}.

=== SESSIONS ===
${sessions.map((s, i) => `--- Session ${i + 1}${s.agent ? ` (with ${s.agent})` : ''} ---\n${s.transcript.slice(0, 8000)}`).join('\n\n')}`;

$('btnLearn').onclick = async () => {
  const g = store.gold();
  if (!cfg.key) { $('learnMsg').textContent = 'Add your API key first.'; return; }
  if (!g.length) return;
  if (cfg.rubric.trim() && !confirm(`Rewrite your rubric based on ${g.length} of your own session${g.length > 1 ? 's' : ''}?\n\nThe current rubric will be replaced.`)) return;

  $('btnLearn').disabled = true;
  $('learnBar').classList.remove('hide');
  $('learnProg').style.width = '30%';
  $('learnMsg').textContent = 'Reading your sessions…';
  $('learnMsg').className = 'muted';
  try {
    const out = await gemini(
      [{ text: LEARN(cfg.rubric, cfg.lang, g.slice(0, 5)) }],
      { maxOutputTokens: 16384, temperature: 0.2 },
      n => { $('learnMsg').textContent = n; }
    );
    $('learnProg').style.width = '100%';
    cfg.rubric = out.trim();
    $('rubric').value = cfg.rubric;
    $('learnMsg').textContent = `Rubric rewritten from ${g.length} session${g.length > 1 ? 's' : ''}`;
    $('learnMsg').className = 'ok';
  } catch (e) {
    $('learnMsg').textContent = e.message;
  } finally {
    $('btnLearn').disabled = false;
    setTimeout(() => $('learnBar').classList.add('hide'), 1200);
  }
};

$('btnSeed').onclick = () => {
  if ($('rubric').value.trim() && !confirm('Replace what is in the rubric box with the shipped standard?')) return;
  $('rubric').value = STANDARD;
};


/* No service worker: the app needs the network for Gemini anyway, and offline
   caching only ever served stale builds. Tear down any old registration. */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(rs => Promise.all(rs.map(r => r.unregister())))
    .then(() => caches.keys())
    .then(ks => Promise.all(ks.map(k => caches.delete(k))))
    .catch(() => {});
}

setMode('grade');
refreshGoldCount();
if (!cfg.key) show('vSet');

/* Opened from the calendar reminder: ?lead=&agent= fills the names in so she can
   hit record without typing. Strip them afterwards so a reload starts clean. */
(function prefillFromLink() {
  const q = new URLSearchParams(location.search);
  const lead = q.get('lead'), agent = q.get('agent');
  if (!lead && !agent) return;
  if (lead)  $('lead').value  = lead;
  if (agent) $('agent').value = agent;
  if (cfg.key) show('vRec');
  history.replaceState(null, '', location.pathname);
})();
