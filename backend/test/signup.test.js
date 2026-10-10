const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../../mobile/node_modules/typescript');

// Exercise the real screen handlers with synthetic Clerk resources, without live credentials.
function screen(clerk) {
  const state = []; let cursor = 0;
  const react = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; }, useEffect() {} };
  const routes = []; const exports = {};
  const source = fs.readFileSync(require('node:path').join(__dirname, '../../mobile/app/(auth)/signup.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, {
    exports, require: name => {
      if (name === 'react') return { ...react, default: react };
      if (name === 'react-native') return new Proxy({ Platform: { OS: 'web' } }, { get: (target, key) => target[key] || key });
      if (name === 'expo-router') return { useRouter: () => ({ replace: route => routes.push(route) }) };
      if (name === '@clerk/clerk-expo') return { useAuth: () => ({ isLoaded: true, isSignedIn: false }), useSignUp: () => clerk };
      return { authStyles: {} };
    }
  });
  const render = () => { cursor = 0; return exports.default(); };
  function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...tree.children.flat(Infinity).flatMap(nodes)]; }
  const all = () => nodes(render());
  return { routes, all, input: (placeholder, value) => all().find(n => n.props.placeholder === placeholder).props.onChangeText(value),
    submit: () => all().find(n => n.props.onPress && n.children.some(c => c && c.type === 'Text' && /Create Account|Verify Email|Please wait/.test(c.children.join('')))).props.onPress() };
}
function fixture(result) {
  const calls = []; const active = [];
  const clerk = { isLoaded: true, setActive: async value => active.push(value), signUp: {
    create: async params => { calls.push(params); return result; },
    prepareEmailAddressVerification: async params => calls.push(params),
    attemptEmailAddressVerification: async params => { calls.push(params); return { status: 'complete', createdSessionId: 'verified-session' }; }
  } };
  const ui = screen(clerk);
  ui.input('Email', ' learner@example.test '); ui.input('Password', 'synthetic-password');
  return { ui, clerk, calls, active };
}
test('signup has no username field and sends only email and password', async () => {
  const f = fixture({ status: 'complete', createdSessionId: 'session' });
  assert.equal(f.ui.all().some(n => n.props.placeholder === 'Username'), false);
  await f.ui.submit();
  assert.equal(JSON.stringify(f.calls), JSON.stringify([{ emailAddress: 'learner@example.test', password: 'synthetic-password' }]));
  assert.equal(f.active[0].session, 'session'); assert.equal(f.ui.routes[0], '/(tabs)');
});
test('email code verification precedes session activation', async () => {
  const f = fixture({ status: 'missing_requirements', unverifiedFields: ['email_address'] });
  await f.ui.submit(); assert.equal(f.active.length, 0);
  assert.equal(f.calls[1].strategy, 'email_code');
  f.ui.input('Email verification code', ' 123456 '); await f.ui.submit();
  assert.equal(f.calls[2].code, '123456'); assert.equal(f.active[0].session, 'verified-session');
});
test('invalid verification code leaves signup pending without activating a session', async () => {
  const f = fixture({ status: 'missing_requirements', unverifiedFields: ['email_address'] });
  await f.ui.submit();
  f.clerk.signUp.attemptEmailAddressVerification = async () => { throw { errors: [{ longMessage: 'Invalid code' }] }; };
  f.ui.input('Email verification code', 'wrong'); await f.ui.submit();
  assert.equal(f.active.length, 0); assert.equal(f.ui.routes.length, 0);
  assert.ok(f.ui.all().some(n => n.children.includes('Invalid code')));
});
test('missing credentials and incomplete signup never activate a session', async () => {
  const f = fixture({ status: 'missing_requirements', unverifiedFields: [] });
  f.ui.input('Password', ''); await f.ui.submit(); assert.equal(f.calls.length, 0);
  f.ui.input('Password', 'synthetic-password'); await f.ui.submit(); assert.equal(f.active.length, 0);
});
