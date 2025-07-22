import { CellarClient } from './cellar-client.js';
import { getAssetPath } from './paths.js';
import { highlight } from './utils.js';

/**
 * A client for managing release artifacts in Clever Cloud's storage.
 * Handles uploading archives, RPM, and DEB packages to the release bucket.
 */
export class ReleaseClient {

  /** @type {CellarClient} */
  #cellarClient;

  /**
   * Creates a new ReleaseClient instance.
   * @param {Object} config - Configuration object
   * @param {string} config.bucket - The bucket name for Cellar
   * @param {string} config.accessKeyId - AWS access key ID for Cellar
   * @param {string} config.secretAccessKey - AWS secret access key for Cellar
   */
  constructor ({ bucket, accessKeyId, secretAccessKey }) {
    this.#cellarClient = new CellarClient({
      bucket,
      accessKeyId,
      secretAccessKey,
    });
  }

  /**
   * Publishes an archive artifact for a specific version and OS.
   * @param {string} version - The version identifier
   * @param {'linux'|'macos'|'win'} os - The target operating system
   * @throws {Error} When upload fails
   */
  async publishArchive (version, os) {
    const localPath = getAssetPath('archive', version, 'build', os);
    const remotePath = getAssetPath('archive', version, 'release', os);
    console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
    await this.#cellarClient.upload(localPath, remotePath);
  }

  /**
   * Publishes an RPM package for a specific version.
   * @param {string} version - The version identifier
   * @throws {Error} When upload fails
   */
  async publishRpm (version) {
    const localPath = getAssetPath('rpm', version, 'build');
    const remotePath = getAssetPath('rpm', version, 'release');
    console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
    await this.#cellarClient.upload(localPath, remotePath);
  }

  /**
   * Publishes a DEB package for a specific version.
   * @param {string} version - The version identifier
   * @throws {Error} When upload fails
   */
  async publishDeb (version) {
    const localPath = getAssetPath('deb', version, 'build');
    const remotePath = getAssetPath('deb', version, 'release');
    console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
    await this.#cellarClient.upload(localPath, remotePath);
  }

}
