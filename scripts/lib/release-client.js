import { CellarClient } from './cellar-client.js';

export class ReleaseClient {

  #cellarClient;

  constructor ({ accessKeyId, secretAccessKey }) {
    this.#cellarClient = new CellarClient({
      bucket: 'm84ilsmeqobuxempbkuc',
      accessKeyId,
      secretAccessKey,
    });
  }

}
