// ORIGINAL: requestArchiveSave
// Extracted by LZFOF v1.0.0

interface Logger {
  info: (phase: string, msg: string) => void;
  success: (phase: string, msg: string) => void;
  warn: (phase: string, msg: string) => void;
}

const noopLogger: Logger = { info: () => { }, success: () => { }, warn: () => { } };

export async function requestArchiveSave(
  url: string,
  accessKey: string,
  secretKey: string,
  logger: Logger = noopLogger
): Promise<boolean> {
  if (!accessKey || !secretKey) {
    logger.warn('SAVE_API', 'Archive.org credentials missing. Skipping save request.');
    return false;
  }

  try {
    const saveUrl = 'https://web.archive.org/save/';
    logger.info('SAVE_API', `Requesting Archive.org to save: ${url.substring(0, 60)}...`);

    const response = await fetch(saveUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `LOW ${accessKey}:${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SmartMatch Discovery Bot/1.0',
      },
      body: `url=${encodeURIComponent(url)}`,
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      logger.success('SAVE_API', 'Archive save requested successfully');
      return true;
    }

    logger.warn('SAVE_API', `Unexpected status: ${response.status}`);
    return false;
  } catch (e: unknown) {
    logger.warn('SAVE_API', `Save request failed: ${(e as Error).message}`);
    return false;
  }
}
