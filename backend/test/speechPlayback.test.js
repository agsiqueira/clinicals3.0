const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('../../mobile/node_modules/typescript');
function compile(file, requireFn, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../mobile/src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, { exports, require: requireFn, ...globals });
  return exports;
}
function harness(platform = 'web') {
  const requests = [], audios = [], files = [], sounds = []; let userId = 'user_A'; let blocked=false;
  const controller = compile('api/speechPlayback.js', () => ({}));
  const api = {};
  for (const method of ['speakPatientVoice', 'speakVoice']) api[method] = (body, headers) => new Promise((resolve,reject) => requests.push({ method, body, headers, resolve,reject }));
  class WebAudio {
    constructor() { this.plays = 0; this.pauses = 0; audios.push(this); }
    async play() { this.plays++; if(blocked) throw Object.assign(new Error("Blocked"), {name:"NotAllowedError"}); }
    pause() { this.pauses++; }
  }
  const fileSystem = { cacheDirectory: '/synthetic/', EncodingType: { Base64: 'base64' }, writeAsStringAsync: async file => files.push(file), deleteAsync: async () => {} };
  const audio = { setAudioModeAsync: async () => {}, Sound: { createAsync: async () => {
    const sound = { plays: 0, stops: 0, unloads: 0, setOnPlaybackStatusUpdate(callback) { this.callback = callback; }, async pauseAsync() { this.pauses=(this.pauses || 0)+1; }, async setIsMutedAsync(value) { this.isMuted=value; }, async playAsync() { this.plays++; }, async stopAsync() { this.stops++; }, async unloadAsync() { this.unloads++; } }; sounds.push(sound); return { sound };
  } } };
  function hook(initial) {
    const slots = [], effects = []; let cursor = 0; let config = initial;
    const react = {
      useRef: value => { const i = cursor++; return slots[i] ||= { current: value }; },
      useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = next; }]; },
      useCallback: fn => { cursor++; return fn; },
      useEffect: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((d, j) => d !== slots[i].deps[j])) { effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); } },
    };
    const module = compile('hooks/useSpeechPlayback.ts', name => {
      if (name === 'react') return react;
      if (name === '@clerk/clerk-expo') return { useAuth: () => ({ userId }) };
      if (name === '../api/sessionToken') return { captureSession: expected => () => { if (expected !== userId) throw new Error('Account switched'); } };
      if (name === '../api/speechPlayback') return controller;
      if (name === '../api/client') return { api };
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo-av') return { Audio: audio };
      if (name === 'expo-file-system/legacy') return fileSystem;
      throw new Error(name);
    }, { window: { Audio: WebAudio, atob: value => Buffer.from(value, 'base64').toString('binary') }, URL: { createObjectURL: () => 'synthetic:audio', revokeObjectURL() {} }, Blob, Uint8Array });
    const render = () => { cursor = 0; const result = module.useSpeechPlayback(config); effects.splice(0).forEach(fn => fn()); return result; };
    return { render, update: next => { config = { ...config, ...next }; return render(); }, unmount: () => slots.forEach(slot => slot?.cleanup?.()) };
  }
  const approval = id => ({ authorization: `approval-${id}`, turnId: id, conversationId: 'encounter_A', caseId: 'case_A' });
  const answer = (index, id) => requests[index].resolve({ audio_base64: 'c3ludGhldGlj', mime_type: 'audio/mpeg', turnId: id });
  return { blockPlayback:value=>{blocked=value;}, hook, requests, audios, sounds, files, audio, fileSystem, approval, answer, switchUser: () => { userId = 'user_B'; } };
}
test('patient TTS sends only approval context; duplicate turns play at most once', async () => {
  const h = harness(); const ui = h.hook({ channel: 'patient' }).render();
  const pending = ui.speak('My throat hurts.', h.approval('turn1'));
  await ui.speak('Internal substituted text', h.approval('turn1')); assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].method, 'speakPatientVoice'); assert.equal('text' in h.requests[0].body, false); assert.equal('voice' in h.requests[0].body, false);
  h.answer(0, 'turn1'); await pending; assert.equal(h.audios[0].plays, 1);
  await ui.speak('My throat hurts.', h.approval('turn1')); assert.equal(h.requests.length, 1);
  await ui.stop();
});
test('out-of-order responses and old callbacks cannot play or stop a newer turn', async () => {
  const h = harness(); const ui = h.hook({ channel: 'patient' }).render();
  const first = ui.speak('first', h.approval('first')); const second = ui.speak('second', h.approval('second'));
  h.answer(1, 'second'); await second; h.answer(0, 'first'); await first;
  assert.equal(h.audios.length, 1); assert.equal(h.audios[0].plays, 1);
  const oldEnded = h.audios[0].onended;
  const third = ui.speak('third', h.approval('third')); h.answer(2, 'third'); await third;
  oldEnded(); assert.equal(h.audios[1].pauses, 0); await ui.stop();
});
test('stop, mute, encounter change, unmount and account switch invalidate pending speech', async () => {
  for (const action of ['stop', 'mute', 'scope', 'unmount', 'account']) {
    const h = harness(); const hook = h.hook({ channel: 'patient', scopeKey: 'encounter_A' }); const ui = hook.render();
    const pending = ui.speak('first', h.approval('first'));
    if (action === 'stop') await ui.stop();
    if (action === 'mute') hook.update({ enabled: false });
    if (action === 'scope') hook.update({ scopeKey: 'encounter_B' });
    if (action === 'unmount') hook.unmount();
    if (action === 'account') { h.switchUser(); hook.render(); }
    h.answer(0, 'first'); await pending; assert.equal(h.audios.length, 0, action);
  }
});
test('mentor retains its explicit voice and cannot overlap patient audio in either direction', async () => {
  const h = harness(); const mentor = h.hook({ voice: 'configured-martinez' }).render();
  const patientHook = h.hook({ channel: 'patient', enabled: false }); patientHook.render();
  const oldMentor = mentor.speak('coaching'); assert.equal(h.requests[0].body.voice, 'configured-martinez');
  const patient = patientHook.update({ enabled: true });
  const currentPatient = patient.speak('Hello.', h.approval('greeting')); h.answer(1, 'greeting'); await currentPatient;
  h.answer(0); await oldMentor; assert.equal(h.audios.length, 1);
  await mentor.speak('outdated coaching'); assert.equal(h.requests.length, 2);
  patientHook.update({ enabled: false }); assert.equal(h.audios[0].pauses, 1);
  const newMentor = mentor.speak('new coaching'); h.answer(2); await newMentor; assert.equal(h.requests[2].body.voice, 'configured-martinez');
  await mentor.stop();
});
test('native playback uses the approved turn once and stop invalidates pending native speech', async () => {
  const h = harness('ios'); const ui = h.hook({ channel: 'patient' }).render();
  const first = ui.speak('Hello.', h.approval('greeting')); h.answer(0, 'greeting'); await first;
  assert.equal(h.sounds[0].plays, 1); await ui.speak('Hello.', h.approval('greeting')); assert.equal(h.requests.length, 1);
  const second = ui.speak('next', h.approval('next')); await ui.stop(); h.answer(1, 'next'); await second; assert.equal(h.sounds.length, 1);
});
test('a patient reply arriving after mute/unmute or stop cannot start a new speech request', async () => {
  const h = harness(); const hook = h.hook({ channel: 'patient' }); let ui = hook.render();
  const beforeStop = ui.capture(); await ui.stop();
  await ui.speak('late reply', h.approval('late'), beforeStop); assert.equal(h.requests.length, 0);
  const beforeMute = ui.capture(); hook.update({ enabled: false }); ui = hook.update({ enabled: true });
  await ui.speak('late reply', h.approval('late-muted'), beforeMute); assert.equal(h.requests.length, 0);
});
test('native audio created after a stop is unloaded without ever playing', async () => {
  const h = harness('ios'); const originalCreate = h.audio.Sound.createAsync;
  let release; h.audio.Sound.createAsync = async () => new Promise(resolve => { release = async () => resolve(await originalCreate()); });
  const ui = h.hook({ channel: 'patient' }).render(); const pending = ui.speak('Hello.', h.approval('greeting'));
  h.answer(0, 'greeting'); await new Promise(resolve => setImmediate(resolve)); assert.ok(release);
  await ui.stop(); await release(); await pending;
  assert.equal(h.sounds[0].plays, 0); assert.equal(h.sounds[0].unloads, 1);
});
test('patient speech without approval or with a mismatched returned turn never plays', async () => {
  const h = harness(); const ui = h.hook({ channel: 'patient' }).render();
  await ui.speak('Evaluation: unapproved'); assert.equal(h.requests.length, 0);
  const pending = ui.speak('approved', h.approval('expected')); h.answer(0, 'wrong-turn'); await pending;
  assert.equal(h.audios.length, 0);
});
test('replacement native playback waits until previous native audio stops', async () => {
  const h = harness('ios'); const ui = h.hook({ channel: 'patient' }).render();
  const first = ui.speak('first', h.approval('first')); h.answer(0, 'first'); await first;
  let release; h.sounds[0].stopAsync = () => new Promise(resolve => { release = resolve; });
  const second = ui.speak('second', h.approval('second')); h.answer(1, 'second');
  await new Promise(resolve => setImmediate(resolve)); assert.equal(h.sounds.length, 1);
  release(); await second; assert.equal(h.sounds[1].plays, 1); await ui.stop();
});
test('a briefing response received after entering and leaving an encounter remains stale', async () => {
  const h = harness(); const mentor = h.hook({ voice: 'configured-martinez' }).render();
  const beforeEncounter = mentor.capture();
  const patientHook = h.hook({ channel: 'patient', enabled: true, exclusive: true }); patientHook.render();
  patientHook.update({ enabled: false, exclusive: true });
  await mentor.speak('outdated briefing'); assert.equal(h.requests.length, 0);
  patientHook.update({ enabled: false, exclusive: false });
  await mentor.speak('late briefing', undefined, beforeEncounter); assert.equal(h.requests.length, 0);
});

test('mentor mute preserves playback, pause resumes same audio, and replay restarts on web and native',async()=>{
 for(const platform of ['web','ios']) {
  const h=harness(platform);const hook=h.hook({channel:'mentor',voice:'configured-martinez'});let ui=hook.render();
  const first=ui.speak('Exact instructional caption.');h.answer(0);await first;
  const audio=platform==='web'?h.audios[0]:h.sounds[0];const plays=audio.plays;
  ui=hook.update({muted:true});assert.equal(platform==='web'?audio.muted:audio.isMuted,true);assert.equal(audio.plays,plays);assert.equal(h.requests.length,1);
  ui=hook.update({muted:false});assert.equal(audio.plays,plays);assert.equal(h.requests.length,1);
  await ui.pause();ui=hook.render();assert.equal(ui.isPaused,true);await ui.resume();assert.equal(audio.plays,plays+1);assert.equal(h.requests.length,1);
  const replay=ui.speak('Exact instructional caption.');h.answer(1);await replay;assert.equal(h.requests.length,2);assert.equal((platform==='web'?h.audios:h.sounds).length,2);await ui.stop();
 }
});
test('blocked browser autoplay reports an error and explicit Play can retry',async()=>{
 const h=harness();const errors=[];const hook=h.hook({onError:e=>errors.push(e.code)});let ui=hook.render();
 h.blockPlayback(true);const pending=ui.speak('Introduction');h.answer(0);await pending;assert.deepEqual(errors,['PLAYBACK_BLOCKED']);ui=hook.render();assert.equal(ui.isSpeaking,false);assert.equal(ui.isPaused,true);h.blockPlayback(false);
 await ui.resume();ui=hook.render();assert.equal(ui.isSpeaking,true);assert.equal(ui.isPaused,false);assert.equal(h.requests.length,1);assert.equal(h.audios.length,1);assert.equal(h.audios[0].plays,2);await ui.stop();
});

test('leaving after blocked autoplay releases prepared audio and prevents late resume',async()=>{
 const h=harness();const hook=h.hook({scopeKey:'intro'});let ui=hook.render();h.blockPlayback(true);
 const pending=ui.speak('Introduction');h.answer(0);await pending;
 ui=hook.update({scopeKey:'practice'});h.blockPlayback(false);await ui.resume();assert.equal(h.audios[0].plays,1);assert.equal(hook.render().isPaused,false);
});

test('TTS failures distinguish authentication, provider access, and timeout without exposing upstream details',async()=>{
 for(const [error,code] of [
  [{status:401},'AUTH_REQUIRED'],
  [{status:503,data:{reason:'key_model_access_denied'}},'TTS_UNAVAILABLE'],
  [{code:'REQUEST_TIMEOUT'},'TTS_TIMEOUT'],
  [{status:500},'PLAYBACK_FAILED']
 ]) {
  const h=harness();const errors=[];const hook=h.hook({onError:e=>errors.push(e)});const ui=hook.render();
  const pending=ui.speak('Synthetic narration');h.requests[0].reject(Object.assign(new Error('private upstream content'),error));await pending;
  assert.equal(errors.length,1);assert.equal(errors[0].code,code);assert.equal(errors[0].message,'Speech playback unavailable');assert.equal(h.audios.length,0);assert.equal(hook.render().isSpeaking,false);
 }
});
