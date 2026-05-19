# Contributing

Tao is licensed under the GNU Affero General Public License version 3. See
`LICENSE` for the full license text.

All pull requests require a signed Contributor License Agreement before they can
be merged. The CLA Assistant workflow checks pull requests and asks unsigned
contributors to sign by commenting:

```text
I have read the CLA Document and I hereby sign the CLA
```

If the CLA check does not update after signing, comment:

```text
recheck
```

## Maintainer Setup

The repository-side CLA workflow lives in `.github/workflows/cla.yml`. To make
the CLA check block merges, configure GitHub repository rules or branch
protection for `main` with:

- Require pull requests before merging.
- Require status checks to pass before merging.
- Require the `CLA Assistant` status check. GitHub may display it in pull
  requests as `CLA Assistant / CLA Assistant`.

The workflow stores signatures on the unprotected `cla-signatures` branch at
`signatures/v1/cla.json`. Do not create that signature JSON file manually; CLA
Assistant creates it when the first contributor signs.
