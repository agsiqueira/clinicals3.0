const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../mobile/node_modules/typescript');
const root = path.resolve(__dirname, '../../mobile');
const jsx = (type, props) => ({ type, props });
function compile(source, requireFn) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: requireFn });
  return exports;
}
test('unresolved authentication mounts no navigator; protected routes require a complete Clerk identity', () => {
  let auth = { isLoaded: false };
  const Stack = Object.assign(() => {}, { Screen: 'Screen', Protected: 'Protected' });
  const component = compile(fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8'), name =>
    name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'expo-router' ? { Stack } : name === '@clerk/clerk-expo' ? { useAuth: () => auth } : name === 'react-native' ? { View: 'View', ActivityIndicator: 'Spinner' } : {});
  assert.equal(component.SessionNavigator().type, 'View');
  for (const state of [
    { isLoaded: true, isSignedIn: false },
    { isLoaded: true, isSignedIn: true, userId: 'A' },
    { isLoaded: true, isSignedIn: true, userId: 'A', sessionId: 'session_A' },
  ]) {
    auth = state;
    const [publicGroup, protectedGroup] = component.SessionNavigator().props.children;
    assert.equal(protectedGroup.props.guard, !!state.sessionId);
    assert.equal(publicGroup.props.guard, !state.sessionId);
    assert.deepEqual(Array.from(protectedGroup.props.children, n => n.props.name).sort(), ['(tabs)', 'attempt-result', 'attempts', 'clinical-portfolio', 'modal', 'module-0'].sort());
    assert.equal(publicGroup.props.children.props.name, '(auth)');
  }
});
test('Roadmap accepts genuinely empty results but rejects invalid successful responses', () => {
  const source = fs.readFileSync(path.join(root, 'app/(tabs)/cases.tsx'), 'utf8');
  const fn = source.slice(source.indexOf('function normalizeLearningPathsResponse'), source.indexOf('function achievementWeightLabels'));
  const { normalize } = compile(fn + '\nexport const normalize = normalizeLearningPathsResponse;', () => ({}));
  assert.equal(normalize([]).length, 0);
  assert.equal(normalize({ learningPaths: [] }).length, 0);
  assert.equal(normalize({ units: [] }).length, 1);
  for (const bad of [null, {}, '<html>Unavailable</html>', { error: 'denied' }]) assert.throws(() => normalize(bad), /invalid response/);
});

test('API bridge waits for binding and profile, and failed session recovery stays visible and retryable', async () => {
  const states = [], refs = [], deps = [], pending = [];
  let index = 0, refIndex = 0, effectIndex = 0, expired, signOutCalls = 0;
  const bindings = [];
  const token = async () => 'synthetic-token';
  let auth = { isLoaded: true, isSignedIn: true, userId: 'A', sessionId: 'session_A', getToken: token };
  let profile = { isLoaded: true, user: { id: 'A' } };
  const effect = (fn, next) => {
    const i = effectIndex++;
    if (!deps[i] || next.some((v, j) => v !== deps[i][j])) { deps[i] = next; pending.push(fn); }
  };
  const react = {
    useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], v => { states[i] = v; }]; },
    useRef: initial => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
    useEffect: effect, useLayoutEffect: effect,
  };
  const signOut = async () => { signOutCalls++; throw Error('synthetic offline'); };
  const component = compile(fs.readFileSync(path.join(root, 'src/components/ApiAuthBridge.tsx'), 'utf8'), name =>
    name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'react-native' ? { View: 'View', Text: 'Text', Pressable: 'Button', ActivityIndicator: 'Spinner' } : name === '@clerk/clerk-expo' ? { useAuth: () => auth, useUser: () => profile, useClerk: () => ({ signOut }) } : name.includes('sessionToken') ? { bindSession: (...args) => bindings.push(args), onSessionExpired: fn => { expired = fn; return () => {}; } } : {});
  function render() { index = refIndex = effectIndex = 0; return component.ApiAuthBridge({ children: 'protected learner' }); }
  function flush() { for (const fn of pending.splice(0)) fn(); }
  assert.equal(render().type, 'View'); flush();
  assert.equal(bindings[0][0], 'A');
  assert.equal(render().props.children, 'protected learner'); flush();
  profile = { isLoaded: true, user: { id: 'B' } };
  assert.equal(render().type, 'View');
  profile = { isLoaded: true, user: { id: 'A' } };
  expired(); expired(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(signOutCalls, 1);
  const recovery = render();
  assert.equal(recovery.type, 'View');
  assert.equal(bindings.at(-1)[0], null);
  assert.match(JSON.stringify(recovery), /Sign in again/);
});
