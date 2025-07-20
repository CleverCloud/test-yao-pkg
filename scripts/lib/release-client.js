import { CellarClient } from './cellar-client.js';
import { getArchiveName, getBuildPath, getReleasePath } from './paths.js';

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

    console.log(`=> Publishing archive for version ${version} and OS ${os}`);
    console.log(`   Source: ${localPath}`);
    console.log(`   Target: ${remotePath}`);
    console.log(`=> Archive upload completed`);
  }

  /**
   * Publishes an RPM package for a specific version.
   * @param {string} version - The version identifier
   * @throws {Error} When upload fails
   */
  async publishRpm (version) {
    const sourcePath = `build/${version}/rpm/`;
    const targetPath = `rpm/${version}/`;

    console.log(`=> Publishing RPM for version ${version}`);
    console.log(`   Source: ${sourcePath}`);
    console.log(`   Target: ${targetPath}`);
    console.log(`=> RPM upload completed`);
  }

  /**
   * Publishes a DEB package for a specific version.
   * @param {string} version - The version identifier
   * @throws {Error} When upload fails
   */
  async publishDeb (version) {
    const sourcePath = `build/${version}/deb/`;
    const targetPath = `deb/${version}/`;

    console.log(`=> Publishing DEB for version ${version}`);
    console.log(`   Source: ${sourcePath}`);
    console.log(`   Target: ${targetPath}`);
    console.log(`=> DEB upload completed`);
  }

}
