# Third-party and inherited notices

The root proprietary LICENSE applies to new product work. It does not override the
terms on inherited material. No third-party dependency is installed in this repository.

- `lib/tutor/`: an adapted engine closure from `saitokiku/KaizenEdu` at
  `20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe`, under that repository's root
  MIT license (Copyright (c) 2026 THU-MAIC), reproduced verbatim below so the packed
  archive carries the permission text itself. The repository copy is
  [legacy/reference-implementations/kaizenedu/LICENSE](legacy/reference-implementations/kaizenedu/LICENSE),
  which `npm pack` does not ship.
  Per-file source hashes and adaptations: `tests/engine/closure-manifest.json`.
  Parts of that source were themselves ported from `saitokiku/Kaizen-AI` (noted in the
  file headers of `checks/math-expr.ts`, `checks/symbolic.ts`, `report/lead.ts`,
  `session/sitting.ts`); Kaizen-AI's proprietary terms remain as stated below.
- Development toolchain (not vendored, not installed here): `typescript` 6.0.3 and
  `@types/node` 22.20.2 are pinned in `package.json` and resolved offline from a
  read-only shared cache by `tests/engine/harness/toolchain.sh`. Both are Apache-2.0
  and MIT respectively upstream; their notices ship with those packages, not here.
- Runtime dependencies: none. `node:sqlite` and `node:crypto` are Node.js built-ins.

- `legacy/reference-implementations/kaizenedu/`: selected unmodified files from
  `saitokiku/KaizenEdu` at `20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe`.
  The source root [MIT license](legacy/reference-implementations/kaizenedu/LICENSE)
  includes Copyright (c) 2026 THU-MAIC and is retained verbatim.
- `legacy/reference-implementations/kaizen-ai/`: selected files from
  `saitokiku/Kaizen-AI` at `91af9e452c7df5867afa7249a6dc58b00003f531`.
  Its [proprietary license](legacy/reference-implementations/kaizen-ai/LICENSE)
  remains verbatim. Reuse is within Manny's authorized private product work;
  no public license or redistribution right is newly granted here.

[manifest.json](legacy/reference-implementations/manifest.json) maps every copied file to its
source commit and SHA-256. Before adding runtime dependencies or assets, retain their
actual applicable license/NOTICE texts and record the final dependency inventory.
No claim of full legacy licensing clearance is made.

## Inherited license text: `saitokiku/KaizenEdu` (applies to `lib/tutor/`)

Verbatim copy of `legacy/reference-implementations/kaizenedu/LICENSE`
(`tests/engine/run.cjs` case `c0_package_inputs` asserts the packed copy of this file
carries it):

```text
MIT License

Copyright (c) 2026 THU-MAIC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Local PostgreSQL harness driver

The E2 test harness resolves the existing offline `pg` (node-postgres) 8.23.0
installation, licensed MIT. It is a test adapter dependency and is not vendored
or installed by this change. Its transitive packages remain in that installation.
See `tests/engine/pg/resolve-pg.cjs` for the version check and
`tests/engine/pg/README.md` for reproduction requirements.
