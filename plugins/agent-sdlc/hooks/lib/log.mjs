/**
 * Diagnostic logging for hooks.
 *
 * Hooks communicate with the client over stdout, so nothing may ever be written
 * there except the response JSON. All diagnostics go to stderr, and only when
 * SDLC_DEBUG is set, so a normal session stays silent.
 */

const DEBUG_ENV_VAR = 'SDLC_DEBUG';
const PREFIX = '[agent-sdlc]';

const isDebugEnabled = () => {
  const value = process.env[DEBUG_ENV_VAR];
  return value !== undefined && value !== '' && value !== '0' && value !== 'false';
};

export const logDebug = (...args) => {
  if (!isDebugEnabled()) return;
  console.error(PREFIX, ...args);
};

export const logError = (...args) => {
  console.error(PREFIX, 'error:', ...args);
};
