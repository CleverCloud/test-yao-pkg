# Changelog

## [1.3.0](https://github.com/CleverCloud/test-yao-pkg/compare/1.2.0...1.3.0) (2025-07-23)


### 🚀 Features

* ignore release-please branches in preview workflow ([3d917bc](https://github.com/CleverCloud/test-yao-pkg/commit/3d917bcdaa400ceca7a54b79758969839fe921bc))

## [1.2.0](https://github.com/CleverCloud/test-yao-pkg/compare/1.1.0...1.2.0) (2025-07-23)


### 🚀 Features

* format release-please branch names in preview display ([1c59124](https://github.com/CleverCloud/test-yao-pkg/commit/1c59124371940cad3a5962e57d2151c3c22a967b))

## [1.1.0](https://github.com/CleverCloud/test-yao-pkg/compare/1.0.0...1.1.0) (2025-07-23)


### 🚀 Features

* test release workflow with staged changes ([268e400](https://github.com/CleverCloud/test-yao-pkg/commit/268e400d54d035e19f2ac3c52ef5f365f49bbb60))

## 1.0.0 (2025-07-23)


### 🚀 Features

* add conditional Windows builds to preview workflow ([cba3c02](https://github.com/CleverCloud/test-yao-pkg/commit/cba3c023c897d2471fa5941078633b726391b906))
* add DEB package workflow with nfpm ([9300fd7](https://github.com/CleverCloud/test-yao-pkg/commit/9300fd7840f68e70208bae6c4f4eddcba1e2ef0f))
* add Debian package (.deb) build and publish to Nexus ([c8914cf](https://github.com/CleverCloud/test-yao-pkg/commit/c8914cf22665d4cb2ba4127a8abcb1991e73ce08))
* add dummy feature for testing changelog-types ([16af7ab](https://github.com/CleverCloud/test-yao-pkg/commit/16af7ab01906067a8df400a27d114f8d693469d2))
* add HTTP status code validation for Nexus uploads ([afe27a8](https://github.com/CleverCloud/test-yao-pkg/commit/afe27a80f46812240bcd3bd4f82dc6f276f1c066))
* add npm caching to GitHub Actions workflows ([28056ad](https://github.com/CleverCloud/test-yao-pkg/commit/28056ad1fc9439df34c600013aec3da09b78c7bd))
* implement nfpm-based RPM building with signing ([7cb98f9](https://github.com/CleverCloud/test-yao-pkg/commit/7cb98f97d09dfbe347f64fa6e7f39e7e77727dc4))
* implement publish-aur job ([0eee160](https://github.com/CleverCloud/test-yao-pkg/commit/0eee16062a8ec58f5c987bc8247f69e786a547a4))
* improve preview comment formatting with table layout ([e5fac6b](https://github.com/CleverCloud/test-yao-pkg/commit/e5fac6bcaf69f8a047dffe0ff25634f0807cff6a))
* replace Nexus GitHub action with direct cURL upload ([c2bfb2d](https://github.com/CleverCloud/test-yao-pkg/commit/c2bfb2d85980e49ac35b2f7264f5d65700e7779c))
* unify nfpm template with NFPM_ARCH environment variable ([3c2e3b3](https://github.com/CleverCloud/test-yao-pkg/commit/3c2e3b3c004f39fc3d7c4c235d93c07ddc7111cf))
* use real preview links from script in PR comments ([fcecbf2](https://github.com/CleverCloud/test-yao-pkg/commit/fcecbf2fc5ec431da6799dbfac2ef0cd478f577a))


### 🐛 Bug Fixes

* add filename to RPM and DEB repository URLs ([0ee50be](https://github.com/CleverCloud/test-yao-pkg/commit/0ee50beadce2b804eb97c80fdeedce9d3e892f9c))
* add missing branch parameter to pr-comment command ([fc420b5](https://github.com/CleverCloud/test-yao-pkg/commit/fc420b5143ed092d2d2126db715792b3c1f5a363))
* add permissions to preview-cleanup workflow ([00043b0](https://github.com/CleverCloud/test-yao-pkg/commit/00043b024142748a712af822f8b443417760e4a3))
* correct nfpm overrides configuration ([44d5050](https://github.com/CleverCloud/test-yao-pkg/commit/44d505059d2e4db67b6415e9ad78de4e071fb2e2))
* correct script name from publish-to-cellar.js to publish-cellar.js ([1eea2e3](https://github.com/CleverCloud/test-yao-pkg/commit/1eea2e3a3b33c7523bf1ec373da1a80061e2448c))
* correct workflow syntax for reading changelog-types JSON ([c980823](https://github.com/CleverCloud/test-yao-pkg/commit/c9808233a85042c462af31eae723c30dce68fe57))
* DEB version format must start with digit ([962d66d](https://github.com/CleverCloud/test-yao-pkg/commit/962d66d4e0030ce26d700343e80dafe42522f1b4))
* improve artifact download configuration in release workflow ([87cc459](https://github.com/CleverCloud/test-yao-pkg/commit/87cc459ad9310e5e8a8ccc940651db9595b8f5ab))
* switch to sticky comment action to prevent duplicate comments ([b3589cb](https://github.com/CleverCloud/test-yao-pkg/commit/b3589cb7859cb95a1c9ad3c581bed374547aa485))
* use POST method for DEB upload to Nexus instead of PUT ([1c2174a](https://github.com/CleverCloud/test-yao-pkg/commit/1c2174a4b587d19a1de52db4bf61166893f0bb89))


### 💪 Performance Improvements

* optimize nfpm installation using direct binary download ([9127a1f](https://github.com/CleverCloud/test-yao-pkg/commit/9127a1f630923ca4ae50ab919c24caad3616fd57))
