/**
 * @typedef {import('./preview-client.types.d.ts').Preview} Preview
 */

/**
 * Handles display and management of preview builds
 */
export class PreviewDisplay {
  /**
   * @param {Array<Preview>} remotePreviews - Remote preview builds
   * @param {Array<Preview>} localPreviews - Local preview builds
   */
  constructor (remotePreviews, localPreviews) {
  }

  /**
   * Initialize the display interface
   */
  init () {
  }

  /**
   * Update the details of a specific preview
   * @param {string} previewName - Name of the preview to update
   * @param {string} details - New details for the preview
   */
  update (previewName, details) {
  }
}
