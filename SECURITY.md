# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately instead:

- Use GitHub's [private vulnerability reporting](https://github.com/Deityhub/lienzo/security/advisories/new) for this repository, or
- Email [contact@deityhub.com](mailto:contact@deityhub.com) with "Lienzo security" in the subject.

Please include what you found, the steps to reproduce it, the browser and version, and what an attacker could do with it. A small example file or a screen recording helps.

What you can expect:

- A reply within 5 working days to confirm that we have your report.
- A fix, or a plan for one, as soon as the problem is understood. We will keep you updated.
- Credit in the release notes when the fix ships, unless you would rather stay anonymous.

Please give us a reasonable time to fix the problem before you share it publicly.

## Supported versions

Only the latest release gets security fixes. Lienzo is a web app, so the hosted site at <https://lienzo.deityhub.com> is always the latest release. If you run your own copy (for example the Docker image), please keep it up to date.

## What matters most here

Lienzo has no accounts and no server-side storage. Documents live in the browser (IndexedDB) and are never uploaded. The areas where a bug would matter most are:

- **Opening files.** Importing a `.lienzo.json` file or a PDF exported from Lienzo reads untrusted content. A crafted file should never run code, break out of the page or damage other saved documents.
- **Pasting and dropping.** Content from the clipboard or dragged in from elsewhere.
- **Images from a web address.** Image elements load a URL, and PDF export fetches it.
- **Saved data.** Anything that could let one site read or change the documents saved by another.
- **The Docker image and the Node server build,** including the headers and defaults they ship with.

Out of scope: problems that need a user to already control their own browser (for example, running code in their own developer console), and findings in third-party services we link to.

## Dependencies

Dependencies are updated weekly by Dependabot, and every change goes through CI. The packages that ship with the app are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
