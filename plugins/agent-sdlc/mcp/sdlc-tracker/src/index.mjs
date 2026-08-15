#!/usr/bin/env node
/**
 * sdlc-tracker MCP server.
 *
 * A newline-delimited JSON-RPC 2.0 server over stdio, with no dependencies, so
 * it runs from a plugin checkout without an install step.
 */

import { createInterface } from 'node:readline';
import { TOOLS, callTool } from './tools.mjs';

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_NAME = 'sdlc-tracker';
const SERVER_VERSION = '0.1.0';

const ERROR_METHOD_NOT_FOUND = -32601;
const ERROR_INTERNAL = -32603;

/** @param {number | string | null} id @param {object} result */
const reply = (id, result) => {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
};

/** @param {number | string | null} id @param {number} code @param {string} message */
const replyError = (id, code, message) => {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
};

const handleInitialize = (id) => {
  reply(id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: {} },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
  });
};

const handleToolsList = (id) => {
  reply(id, {
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  });
};

/** @param {number | string | null} id @param {object} params */
const handleToolsCall = (id, params) => {
  const result = callTool(params?.name ?? '', params?.arguments ?? {});
  reply(id, result);
};

/** @param {object} message */
const handleMessage = (message) => {
  const { id, method, params } = message;

  switch (method) {
    case 'initialize':
      handleInitialize(id);
      return;
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return;
    case 'tools/list':
      handleToolsList(id);
      return;
    case 'tools/call':
      handleToolsCall(id, params);
      return;
    case 'ping':
      reply(id, {});
      return;
    default:
      if (id !== undefined) replyError(id, ERROR_METHOD_NOT_FOUND, `Unsupported method: ${method}`);
  }
};

const reader = createInterface({ input: process.stdin, crlfDelay: Infinity });

reader.on('line', (line) => {
  const trimmed = line.trim();
  if (trimmed.length === 0) return;

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    return;
  }

  try {
    handleMessage(message);
  } catch (error) {
    if (message.id !== undefined) replyError(message.id, ERROR_INTERNAL, error.message);
  }
});

reader.on('close', () => process.exit(0));
