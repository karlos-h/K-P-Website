# Third-Party Notices

This site bundles third-party code into the JavaScript it serves to visitors.
Most of those dependencies are permissively licensed (MIT / ISC / Apache-2.0)
and are listed in `frontend/package.json` with their full terms in each
package's own directory under `frontend/node_modules/`.

The library below is called out separately because its licence carries
attribution and relinking obligations that the permissive ones do not.

## heic-to

- **Version:** 1.5.2
- **Licence:** LGPL-3.0
- **Source:** https://github.com/hoppergee/heic-to
- **npm:** https://www.npmjs.com/package/heic-to
- **Licence text:** https://www.gnu.org/licenses/lgpl-3.0.html

Used by [`frontend/src/lib/processImage.js`](frontend/src/lib/processImage.js)
to convert HEIC/HEIF photos to JPEG in the browser, so that visitors submitting
a photo from an iPhone get a file the site can actually accept. It embeds a
WebAssembly build of [libheif](https://github.com/strukturag/libheif)
(also LGPL-3.0).

The library is used unmodified, loaded as a separate chunk at runtime via a
dynamic `import()`, and is not statically linked into or derived from this
project's own source. Anyone receiving this site's bundle may replace the
`heic-to` chunk with their own build of the library.
