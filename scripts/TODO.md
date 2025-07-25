* Remove the "CLI script" in description
  * Just start with a verb like "Build binary..." or "Create archive..."
* Don't mention `node ` in "usage" or "examples", the script has a shebang
* When the argument "version" is optionnal
  * The description should be `Version (e.g., "1.2.3") or branch name (e.g., "my-feature")`
* for the preview.js
  * do a list for USAGE with all commands
* sha256sum is not required, we do it with Node.js
* these don't need curl
  * publish cellar
  * publish nexus
