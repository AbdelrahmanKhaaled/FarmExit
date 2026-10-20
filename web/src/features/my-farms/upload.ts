/** Progress is bytes sent, never a claim that the server has accepted the file. */
export function uploadPrivateFile(
  url: string,
  body: FormData,
  onProgress: (percent: number | null) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', url);
    request.withCredentials = true;
    request.upload.onprogress = (event) =>
      onProgress(event.lengthComputable ? Math.round((event.loaded / event.total) * 100) : null);
    request.onerror = () => reject(new Error('network'));
    request.onabort = () => reject(new Error('aborted'));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) reject(new Error(String(request.status)));
      else {
        try {
          resolve(JSON.parse(request.responseText));
        } catch {
          reject(new Error('response'));
        }
      }
    };
    request.send(body);
  });
}
