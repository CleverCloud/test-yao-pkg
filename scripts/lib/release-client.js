import { CellarClient } from './cellar-client.js';
import { getArchiveName, getBuildPath, getReleasePath, getAssetPath } from './paths.js';
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
   * @param {string} config.accessKeyId - AWS access key ID for Cellar
   * @param {string} config.secretAccessKey - AWS secret access key for Cellar
   */
  constructor ({ accessKeyId, secretAccessKey }) {
    this.#cellarClient = new CellarClient({
      bucket: 'm84ilsmeqobuxempbkuc',
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
    const archiveName = getArchiveName(version, os);
    const buildPath = getBuildPath(version, os);
    const releasePath = getReleasePath(version);

    const localPath = `${buildPath}/${archiveName}`;
    const remotePath = `${releasePath}/${archiveName}`;

    console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
    await this.#cellarClient.upload(localPath, remotePath);
  }

  /**
   * Publishes an RPM package for a specific version.
   * @param {string} version - The version identifier
   * @throws {Error} When upload fails
   */
  async publishRpm (version) {
    const rpmName = getAssetPath('rpm', version, 'local');
    const buildPath = getBuildPath(version);
    const releasePath = getReleasePath(version);

    const localPath = `${buildPath}/${rpmName}`;
    const remotePath = `${releasePath}/${rpmName}`;

    console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
    await this.#cellarClient.upload(localPath, remotePath);
  }

  /**
   * Publishes a DEB package for a specific version.
   * @param {string} version - The version identifier
   * @throws {Error} When upload fails
   */
  async publishDeb (version) {
    const debName = getAssetPath('deb', version, 'local');
    const buildPath = getBuildPath(version);
    const releasePath = getReleasePath(version);

    const localPath = `${buildPath}/${debName}`;
    const remotePath = `${releasePath}/${debName}`;

    console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
    await this.#cellarClient.upload(localPath, remotePath);
  }

}
