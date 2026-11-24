import { runQpdfCommand } from '../lib/qpdfRunner.js';

self.onmessage = async (event) => {
  const { id, action, bytes, options } = event.data || {};

  try {
    const result = await runQpdfCommand({
      action,
      bytes,
      options,
      locateFile: (path) => (path.endsWith('.wasm') ? '/wasm/qpdf.wasm' : path),
    });

    const transferList = result.buffer ? [result.buffer] : [];
    self.postMessage(
      {
        id,
        ok: true,
        buffer: result.buffer,
        exitCode: result.exitCode,
        logs: result.logs,
      },
      transferList
    );
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err?.message || 'QPDF worker failed.',
      code: err?.code || 'QPDF_ERROR',
      logs: err?.logs || [],
      exitCode: err?.exitCode ?? null,
    });
  }
};

