#!/usr/bin/env node
/**
 * MGR REA Engine — full official REA MCP entry, not a substitute REA implementation.
 * The same pinned upstream runtime is used by ChatGPT-capable local hosts and Codex.
 * This file never downloads packages, accepts paths from tools, or invents results.
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const PIN = '6.8.0';
const home = resolve(process.env.MGR_REA_HOME || join(homedir(), '.mgr-tools', 'rea'));
const binary = resolve(process.env.MGR_REA_NODE || (process.platform === 'win32'
  ? join(home, 'node', 'node.exe') : process.execPath));
const installed = resolve(process.env.MGR_REA_PACKAGE || join(home, 'runtime', 'node_modules', 'rea-agents'));
const workspace = resolve(process.env.MGR_REA_ALLOWED_ROOT || join(home, 'workspace'));

try {
  const info = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  if (info.name !== 'rea-agents' || info.version !== PIN) {
    throw new Error(`Expected official rea-agents@${PIN}; found ${info.name}@${info.version}.`);
  }
  const options = {
    cwd: workspace,
    stdio: 'inherit',
    windowsHide: true,
    // REA owns its canonical 229-tool protocol and its approval requirements.
    // Do not replace REA's own tool catalogue with a one-tool facade.
    env: {
      ...process.env,
      REA_MCP_INPUT_SCHEMA_PROFILE: process.env.REA_MCP_INPUT_SCHEMA_PROFILE || 'compact',
    },
  };
  const child = spawn(binary, [join(installed, 'scripts', 'rea.mjs'), '--mcp'], options);
  child.on('error', error => {
    process.stderr.write(`MGR REA Engine failed to launch: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.on('close', (code, signal) => {
    if (signal) process.stderr.write(`MGR REA Engine exited after ${signal}.\n`);
    process.exitCode = code ?? 1;
  });
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      if (child.exitCode === null && !child.killed) child.kill(signal);
    });
  }
} catch (error) {
  process.stderr.write(`MGR REA Engine unavailable: ${error.message}\n`);
  process.exitCode = 1;
}
