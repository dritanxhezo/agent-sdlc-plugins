/**
 * stdin/stdout plumbing shared by the client adapters.
 *
 * Every hook fails open: an unreadable payload, a crash, or a missing field must
 * never stop the agent from working. A gate that breaks the editor is worse than
 * no gate at all.
 */

import { logError } from './log.mjs';

const EMPTY_PAYLOAD = {};

/** @returns {Promise<object>} The parsed payload, or an empty object. */
export const readPayload = async () => {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    return raw.length > 0 ? JSON.parse(raw) : EMPTY_PAYLOAD;
  } catch (error) {
    logError('could not read hook payload:', error.message);
    return EMPTY_PAYLOAD;
  }
};

/** @param {object} response */
export const writeResponse = (response) => {
  process.stdout.write(JSON.stringify(response));
};

/**
 * Wraps an adapter so that any thrown error still produces a permissive
 * response and a zero exit code.
 *
 * @param {() => Promise<object>} adapter
 * @param {object} fallbackResponse
 */
export const runAdapter = async (adapter, fallbackResponse) => {
  try {
    writeResponse(await adapter());
  } catch (error) {
    logError('hook crashed, allowing action:', error.message);
    writeResponse(fallbackResponse);
  }
};

/**
 * Picks the first present value among several candidate field names, so a client
 * renaming a payload field does not silently disable a gate.
 *
 * @param {object} source
 * @param {string[]} keys
 */
export const firstOf = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
};
