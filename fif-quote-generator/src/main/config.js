const Store = require('electron-store');
const { machineIdSync } = require('node-machine-id');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

let store;

function getStore() {
  if (!store) {
    const machineId = machineIdSync({ original: true });
    store = new Store({
      name: 'fif-quote-config',
      encryptionKey: machineId,
      defaults: {
        api_key: '',
        shard: 'au1',
        pin_hash: '',
        default_business_id: '',
        default_terms: '',
        default_validity: '60 days',
        logo_path: '',
        footer_address: '',
        footer_phone: '',
        footer_fax: '',
        footer_email: '',
        footer_website: '',
        lockout_until: 0,
        failed_pin_attempts: 0,
        quote_counter: 0,
        quote_prefix: 'FIF',
        quote_suffix: '',
        cliniko_subdomain: ''
      }
    });
  }
  return store;
}

function getConfig() {
  const s = getStore();
  return {
    shard: s.get('shard'),
    default_business_id: s.get('default_business_id'),
    default_terms: s.get('default_terms'),
    default_validity: s.get('default_validity'),
    logo_path: s.get('logo_path'),
    footer_address: s.get('footer_address'),
    footer_phone: s.get('footer_phone'),
    footer_fax: s.get('footer_fax'),
    footer_email: s.get('footer_email'),
    footer_website: s.get('footer_website'),
    quote_counter: s.get('quote_counter'),
    quote_prefix: s.get('quote_prefix'),
    quote_suffix: s.get('quote_suffix'),
    cliniko_subdomain: s.get('cliniko_subdomain')
  };
}

function saveConfig(config) {
  const s = getStore();
  const allowedKeys = [
    'shard', 'default_business_id', 'default_terms',
    'default_validity', 'logo_path', 'quote_prefix', 'quote_suffix',
    'cliniko_subdomain', 'footer_address', 'footer_phone', 'footer_fax',
    'footer_email', 'footer_website'
  ];
  for (const key of allowedKeys) {
    if (config[key] !== undefined) {
      s.set(key, config[key]);
    }
  }
}

function saveApiKey(apiKey) {
  const s = getStore();
  s.set('api_key', apiKey);
}

function getApiKey() {
  return getStore().get('api_key');
}

function hasApiKey() {
  const key = getApiKey();
  return !!(key && key.length > 0);
}

function getShard() {
  return getStore().get('shard');
}

async function setupPin(pin) {
  const hash = await bcrypt.hash(pin, SALT_ROUNDS);
  const s = getStore();
  s.set('pin_hash', hash);
  s.set('failed_pin_attempts', 0);
  s.set('lockout_until', 0);
  return true;
}

async function verifyPin(pin) {
  const s = getStore();

  // Check lockout
  const lockoutUntil = s.get('lockout_until');
  if (lockoutUntil && Date.now() < lockoutUntil) {
    const remainingMs = lockoutUntil - Date.now();
    const remainingSec = Math.ceil(remainingMs / 1000);
    throw new Error(`Account locked. Try again in ${remainingSec} seconds.`);
  }

  const pinHash = s.get('pin_hash');
  if (!pinHash) {
    throw new Error('No PIN configured. Please set up a PIN first.');
  }

  const match = await bcrypt.compare(pin, pinHash);
  if (match) {
    s.set('failed_pin_attempts', 0);
    s.set('lockout_until', 0);
    return true;
  }

  // Failed attempt
  const attempts = s.get('failed_pin_attempts') + 1;
  s.set('failed_pin_attempts', attempts);

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    s.set('lockout_until', Date.now() + LOCKOUT_DURATION_MS);
    s.set('failed_pin_attempts', 0);
    throw new Error('Too many failed attempts. Account locked for 5 minutes.');
  }

  return false;
}

async function updatePin(currentPin, newPin) {
  const valid = await verifyPin(currentPin);
  if (!valid) {
    throw new Error('Current PIN is incorrect.');
  }
  return setupPin(newPin);
}

function hasPinConfigured() {
  const hash = getStore().get('pin_hash');
  return !!(hash && hash.length > 0);
}

function getNextQuoteNumber() {
  const s = getStore();
  const counter = s.get('quote_counter') + 1;
  s.set('quote_counter', counter);
  const suffix = s.get('quote_suffix') || '';
  return `${counter}${suffix}`;
}

function peekNextQuoteNumber() {
  const s = getStore();
  const counter = s.get('quote_counter') + 1;
  const suffix = s.get('quote_suffix') || '';
  return `${counter}${suffix}`;
}

function setQuoteCounter(value) {
  const s = getStore();
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0) {
    throw new Error('Quote counter must be a non-negative number.');
  }
  // Set to value - 1 so the next call to getNextQuoteNumber returns `value`
  s.set('quote_counter', num - 1);
}

function getLockoutStatus() {
  const s = getStore();
  const lockoutUntil = s.get('lockout_until');
  const failedAttempts = s.get('failed_pin_attempts');
  const isLocked = lockoutUntil && Date.now() < lockoutUntil;
  return {
    isLocked,
    lockoutUntil: isLocked ? lockoutUntil : null,
    remainingMs: isLocked ? lockoutUntil - Date.now() : 0,
    failedAttempts
  };
}

module.exports = {
  getConfig,
  saveConfig,
  saveApiKey,
  getApiKey,
  hasApiKey,
  getShard,
  setupPin,
  verifyPin,
  updatePin,
  hasPinConfigured,
  getLockoutStatus,
  getNextQuoteNumber,
  peekNextQuoteNumber,
  setQuoteCounter
};
