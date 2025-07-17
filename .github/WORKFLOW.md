* build
  * bundle-cjs #src #node
    * OUT => `build/clever.cjs`
  * build-binary (matrix)
    * NEEDS bundle-cjs
    * IN => `build/clever.cjs`
    * build-binary-linux #src #node
      * OUT => `build/clever`
    * build-binary-mac #src #node
      * OUT => `build/clever`
    * build-binary-windows #src #node
      * OUT => `build/clever.exe`
  * archive-checksum
    * NEEDS build-binary
    * IN => `build-linux/clever`
    * IN => `build-mac/clever`
    * IN => `build-windows/clever.exe`
    * OUT => `build-linux/clever-tools_linux.tar.gz`
    * OUT => `build-linux/clever-tools_linux.tar.gz.sha256`
    * OUT => `build-mac/clever-tools_mac.tar.gz`
    * OUT => `build-mac/clever-tools_mac.tar.gz.sha256`
    * OUT => `build-windows/clever-tools_wind.zip`
    * OUT => `build-windows/clever-tools_wind.zip.sha256`

* publish-preview #src #node
  * NEEDS build
  * IN => `build-linux/clever-tools_linux.tar.gz`
  * IN => `build-linux/clever-tools_linux.tar.gz.sha256`
  * IN => `build-mac/clever-tools_mac.tar.gz`
  * IN => `build-mac/clever-tools_mac.tar.gz.sha256`
  * IN => `build-windows/clever-tools_wind.zip`
  * IN => `build-windows/clever-tools_wind.zip.sha256`

* build-rpm
  * NEEDS build
* build-deb
  * NEEDS build
* build-nupkg
  * NEEDS build

* publish-npm #src #node
  * DIRECT

* publish-cellar-binaries
  * NEEDS build
* publish-cellar-rpm
  * NEEDS build-rpm
* publish-cellar-deb
  * NEEDS build-deb
* publish-cellar-nupkg
  * NEEDS build-nupkg

* publish-arch
  * NEEDS build
* publish-brew
  * NEEDS build
* publish-dockerhub
  * NEEDS build
* publish-exherbo
  * NEEDS build

* publish-nexus-rpm
  * NEEDS build-rpm
* publish-nexus-deb
  * NEEDS build-deb
* publish-nexus-nupkg
  * NEEDS build-nupkg
