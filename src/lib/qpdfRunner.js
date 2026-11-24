/**
 * Pure QPDF WASM command builder and executor.
 * Safe in both Web Workers (browser) and Node.js (Jest tests).
 */

export class QpdfExecutionError extends Error {
  constructor(message, code = 'QPDF_ERROR', logs = [], exitCode = null) {
    super(message);
    this.name = 'QpdfExecutionError';
    this.code = code;
    this.logs = logs;
    this.exitCode = exitCode;
  }
}

/**
 * Builds QPDF CLI argument arrays for supported actions.
 * @param {string} action
 * @param {object} options
 * @param {string} inPath
 * @param {string} outPath
 * @returns {{ args: string[], hasOutput: boolean }}
 */
export function buildQpdfArgs(action, options = {}, inPath, outPath) {
  switch (action) {
    case 'encrypt': {
      const userPassword = String(options.userPassword ?? '');
      const ownerPassword = String(options.ownerPassword ?? `${userPassword}_owner`);
      const permissions = options.permissions || {};
      const printOpt =
        permissions.printing === 'none'
          ? 'none'
          : permissions.printing === 'low'
            ? 'low'
            : 'full';
      const modifyOpt = permissions.modifying === false ? 'none' : 'all';
      const extractOpt = permissions.copying === false ? 'n' : 'y';

      return {
        hasOutput: true,
        args: [
          '--encrypt',
          userPassword,
          ownerPassword,
          '256',
          `--print=${printOpt}`,
          `--modify=${modifyOpt}`,
          `--extract=${extractOpt}`,
          '--',
          inPath,
          outPath,
        ],
      };
    }

    case 'decrypt': {
      const password = options.password ? String(options.password) : '';
      const args = [];
      if (password) args.push(`--password=${password}`);
      args.push('--decrypt', inPath, outPath);
      return { hasOutput: true, args };
    }

    case 'verifyPassword': {
      const password = options.password ? String(options.password) : '';
      const args = [];
      if (password) args.push(`--password=${password}`);
      args.push('--check', inPath);
      return { hasOutput: false, args };
    }

    case 'compress':
      return {
        hasOutput: true,
        args: [
          '--warning-exit-0',
          '--compress-streams=y',
          '--recompress-flate',
          '--compression-level=9',
          '--object-streams=generate',
          '--remove-unreferenced-resources=yes',
          '--linearize',
          inPath,
          outPath,
        ],
      };

    case 'repair':
      return {
        hasOutput: true,
        args: [inPath, outPath],
      };

    case 'flattenAnnotations':
      return {
        hasOutput: true,
        args: ['--warning-exit-0', '--flatten-annotations=all', inPath, outPath],
      };

    default:
      throw new QpdfExecutionError(`Unsupported QPDF action: ${action}`, 'UNKNOWN_ACTION');
  }
}

let qpdfQueue = Promise.resolve();

/**
 * Executes a single QPDF command inside an isolated Emscripten module instance.
 * Serialized because Emscripten's compiled bundle captures console.log/error at module init.
 * @param {{ action: string, bytes: ArrayBuffer|Uint8Array, options?: object, locateFile?: (path: string, prefix?: string) => string }} params
 * @returns {Promise<{ buffer: ArrayBuffer|null, exitCode: number, logs: string[] }>}
 */
export function runQpdfCommand(params) {
  const next = qpdfQueue.then(() => executeQpdfSingle(params));
  qpdfQueue = next.catch(() => {});
  return next;
}

async function executeQpdfSingle({ action, bytes, options = {}, locateFile }) {
  if (!bytes || (bytes.byteLength ?? bytes.length ?? 0) === 0) {
    throw new QpdfExecutionError('Input PDF buffer is empty.', 'EMPTY_INPUT');
  }

  const qpdfModuleExport = await import('@neslinesli93/qpdf-wasm');
  const createQpdfModule = qpdfModuleExport.default || qpdfModuleExport;

  const moduleConfig = {
    noInitialRun: true,
  };
  if (typeof locateFile === 'function') {
    moduleConfig.locateFile = locateFile;
  }

  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const inPath = `/input_${runId}.pdf`;
  const outPath = `/output_${runId}.pdf`;

  const { args, hasOutput } = buildQpdfArgs(action, options, inPath, outPath);
  const logs = [];

  const origLog = console.log;
  const origError = console.error;
  console.log = (...parts) => logs.push(parts.map(String).join(' '));
  console.error = (...parts) => logs.push(parts.map(String).join(' '));

  let qpdf = null;
  let exitCode = 0;
  try {
    qpdf = await createQpdfModule(moduleConfig);
    const inputArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    qpdf.FS.writeFile(inPath, inputArray);

    try {
      const ret = qpdf.callMain(args);
      exitCode = typeof ret === 'number' ? ret : 0;
    } catch (err) {
      if (err && typeof err.status === 'number') {
        exitCode = err.status;
      } else {
        throw new QpdfExecutionError(
          err?.message || 'QPDF WASM execution failed.',
          'QPDF_CRASH',
          logs
        );
      }
    }

    // QPDF exit code 0 = success, 3 = succeeded with warnings
    if (exitCode !== 0 && exitCode !== 3) {
      const combinedLogs = logs.join('\n');
      const isPasswordError = /invalid password|password.*required|incorrect password/i.test(
        combinedLogs
      );
      throw new QpdfExecutionError(
        isPasswordError
          ? 'Invalid or missing PDF password.'
          : combinedLogs || `QPDF failed with exit code ${exitCode}.`,
        isPasswordError ? 'INVALID_PASSWORD' : 'QPDF_FAILED',
        logs,
        exitCode
      );
    }

    let outputBuffer = null;
    if (hasOutput) {
      // Clone out of Emscripten HEAPU8 before transferring so the WASM heap is never detached.
      const outputSlice = qpdf.FS.readFile(outPath).slice();
      outputBuffer = outputSlice.buffer;
    }

    return {
      buffer: outputBuffer,
      exitCode,
      logs,
    };
  } finally {
    console.log = origLog;
    console.error = origError;
    if (qpdf?.FS) {
      try {
        qpdf.FS.unlink(inPath);
      } catch {
        // ignore missing file
      }
      if (hasOutput) {
        try {
          qpdf.FS.unlink(outPath);
        } catch {
          // ignore missing file
        }
      }
    }
  }
}

