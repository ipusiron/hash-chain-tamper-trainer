English · [日本語](README.md)

# Hash Chain Tamper Trainer - Learn tampering and rechaining

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/hash-chain-tamper-trainer?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/hash-chain-tamper-trainer?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/hash-chain-tamper-trainer)
![GitHub license](https://img.shields.io/github/license/ipusiron/hash-chain-tamper-trainer)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/hash-chain-tamper-trainer/)

**Day117 - 200 Security Tools with Generative AI**

Hash Chain Tamper Trainer explores what a hash chain can and cannot detect.
Change fictional records and recompute the following hashes to see verification pass again. The tool also computes the outcomes of adding a held checkpoint, HMAC, a signature or a time-stamp for people with different access to keys.

## 🌐 Demo

👉 **[Open Hash Chain Tamper Trainer](https://ipusiron.github.io/hash-chain-tamper-trainer/)**

Download the files and open `index.html` in a browser to use it over file://. No installation or build is required.

## 📸 Screenshots

![Fictional access log chain](assets/en/chain.png)

*Eight fictional records form a chain. Open a hash to see all 64 hexadecimal characters and its input.*

![Protection and role comparison](assets/en/protections.png)

*Computed outcomes show the effects of protections, with the assumptions about checkpoints and time explained below.*

## ✨ Features

| Tab | Content |
|---|---|
| Build a chain | Fictional access log with 8 rows and temperature log with 6 rows; step through computation or add rows |
| Try tampering | 7 modifications, first mismatch, expected and stored hashes, trailer verification |
| Rechain and protect | Recompute the chain, compare 4 protections and 2 roles, choose combinations and inspect 4 steps |
| Learn | 11 lessons, from hash properties to git and Merkle trees |
| Quiz | 8 multiple-choice questions, explanations, links to related lessons and a return action |

The interface supports Japanese, English, and light and dark themes. Language changes preserve inputs, computed results and answers. Arrow keys, Home and End also navigate the tabs.

## 📖 Usage

1. Choose a sample in Build a chain and step through its computation.
2. Rewrite row 2 in Try tampering, then inspect the first mismatch and hashes.
3. Recompute all following hashes in Rechain and protect and observe verification pass.
4. Choose protections, calculate the comparison and compare the outsider with the recorder.
5. Use Learn and Quiz to examine the assumptions that change the outcome.

Changing the sample, header setting or trailer setting rebuilds the original chain. Each modification starts from a copy of that original. Protection comparisons use the same row-2 rewrite of the selected sample.

## 🔬 Chain format and verification results

The seed is SHA-256 of the header lines joined with LF. Excluding the header uses 64 zeros instead. Each row hashes `previousHash + '|' + fields.join(',')`; the trailer hashes `lastHash + '|rows=' + count`.

Hashes have 64 hexadecimal characters; the table shortens them to the first 12 and an ellipsis. Records contain 4 ASCII fields of 1–64 characters each, up to 100 rows. Commas, pipes and control characters are rejected. Whitespace is not trimmed and Unicode is not normalized. HMAC mode retains the SHA-256 seed and uses HMAC-SHA256 for data rows and the trailer.

The following results use the 8-row access log with its header and trailer. Operations target row 2; truncation removes the last 2 rows. A `-` means the remaining rows match but the original trailer does not. `pass` means verification succeeds after rechaining.

| Operation ID | Operation | First mismatching row | After rechaining |
|---|---|---|---|
| `rewrite` | Rewrite | 2 | pass |
| `delete` | Delete | 2 | pass |
| `swap` | Swap with the next row | 2 | pass |
| `insert` | Insert | 2 | pass |
| `truncate` | Remove the last 2 rows | - | pass |
| `header` | Rewrite the header | 1 | pass |
| `rehashOne` | Recompute only the rewritten row | 3 | pass |

Without a trailer, removing the last 2 rows passes. Rewriting and recomputing only the last row also passes without a trailer. A header excluded from the chain can change undetected. Different modifications can produce the same verification result, so the tool does not infer the modification type.

In the next table, ○ means detected and × means undetected. A different person holds the checkpoint. For time-stamps, the verifier knows the closing deadline independently of the log.

| Protection ID | Protection | Outsider without keys or checkpoint | Recorder holding the keys |
|---|---|---|---|
| `none` | None | × | × |
| `checkpoint` | Held checkpoint | ○ | ○ |
| `hmac` | HMAC-SHA256 | ○ | × |
| `signature` | ECDSA P-256 signature | ○ | × |
| `timestamp` | Simulated time-stamp | ○ | ○ |

All 16 protection combinations are available. HMAC plus a signature still lets the recorder rechain successfully; adding an independently held checkpoint detects the change.

## 🎯 Use cases

Three ways to explore the tool's core behavior are:

- An experiment notebook keeper removes 2 of 8 rows and compares the result with and without a trailer, separating internal consistency from evidence that a log was closed.
- A collaborative editing team chooses HMAC and a signature, observes detection for an outsider but not the recorder, and translates the result into a question about who has the authority to compute new values.
- A person managing submission deadlines opens the 4-step trace and sees a correctly signed step-3 token fail the step-2 deadline, separating content truth from prior existence.

Other uses include classroom demonstrations, reviewing record designs at work, learning how household notes could be linked, hobby programming and research discussions. Related tools can help explain hash types and signing keys. These experiments use fictional records and do not determine the truth of real records.

## ⚠️ Limits and assumptions

Anyone who knows the public construction can rechain the records. The exercise demonstrates why a hash chain alone does not prove the absence of tampering.

- A person who can replace both the log and its checkpoint defeats that comparison.
- Only HMAC key holders can verify it. Sharing the key also lets the recipient rechain.
- A recorder holding the signing key can sign a new tip.
- A time-stamp attests prior existence of a tip, not the truth of its contents.
- The simulated authority signs using a key inside the page. A real authority's private key is not held by its users.
- The verifier independently knows the closing deadline. The simulated clock uses steps 1–4, not real time.
- File import and Day041 CSV v3 verification are planned for the second installment and are not implemented here.

IPUSIRON writes technical books about security. The author does not encourage misuse of this tool.

## 🔒 Privacy and security

Records, keys and checkpoints stay on the device and are neither saved nor sent. Reloading the page clears them. Only the language choice is stored, using the localStorage key `hash-chain-tamper-trainer.lang`. The app does not use sessionStorage, cookies or IndexedDB.

Web Crypto performs SHA-256, HMAC and ECDSA P-256 operations. Private and HMAC keys are generated as non-extractable and are never displayed. All computations, including the simulated time-stamp authority, stay on the device. No external authority or blockchain is contacted.

CSP includes `connect-src 'none'`; the DOM is built with `textContent` and `createElement`. There are no CDNs, external fonts or package dependencies. Opening a reference link yourself navigates to that external site.

## 🔗 References and related tools

The lessons explain and link each reference.

- [CyberGhost — Hash Chain](https://www.cyberghostvpn.com/en_US/glossary/hash-chain)
- [Haber & Stornetta (1991), How to time-stamp a digital document](https://doi.org/10.1007/BF00196791)
- [Haber & Stornetta, CRYPTO 1990](https://doi.org/10.1007/3-540-38424-3_32)
- [Schneier & Kelsey (1998), Cryptographic Support for Secure Logs on Untrusted Machines](https://www.usenix.org/conference/7th-usenix-security-symposium/cryptographic-support-secure-logs-untrusted-machines)
- [Schneier & Kelsey (1999), Secure audit logs to support computer forensics](https://doi.org/10.1145/317087.317089)
- [Crosby & Wallach (2009), Efficient Data Structures for Tamper-Evident Logging](https://www.usenix.org/conference/usenixsecurity09/technical-sessions/presentation/efficient-data-structures-tamper-evident)
- [Lamport (1981), Password authentication with insecure communication](https://doi.org/10.1145/358790.358797)
- [RFC 1760 — The S/KEY One-Time Password System](https://www.rfc-editor.org/rfc/rfc1760)
- [RFC 2289 — A One-Time Password System](https://www.rfc-editor.org/rfc/rfc2289)
- [RFC 3161 — Internet X.509 Public Key Infrastructure Time-Stamp Protocol](https://www.rfc-editor.org/rfc/rfc3161)
- [RFC 5816 — ESSCertIDv2 Update for RFC 3161](https://www.rfc-editor.org/rfc/rfc5816)
- [RFC 6962 — Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962)
- [RFC 9162 — Certificate Transparency Version 2.0](https://www.rfc-editor.org/rfc/rfc9162)
- [Pro Git 10.2 — Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [Pro Git 7.6 — Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
- [Day041 Mic Gain Logger — CSV](https://github.com/ipusiron/mic-gain-logger/blob/main/docs/csv.md)
- [FIPS 180-4 — Secure Hash Standard](https://doi.org/10.6028/NIST.FIPS.180-4)
- [RFC 4231 — HMAC-SHA test vectors](https://www.rfc-editor.org/rfc/rfc4231)

- [Day041 Mic Gain Logger](https://ipusiron.github.io/mic-gain-logger/): a demonstrated rechaining case. [CSV documentation](https://github.com/ipusiron/mic-gain-logger/blob/main/docs/csv.md)
- [Day002 Hash Identifier](https://ipusiron.github.io/hash-detector/): examines possible hash types from string formats
- [Day053 JWT Inspector](https://ipusiron.github.io/jwt-inspector/): explores JWT structure and signatures

## 🧪 Tests

Use Node 22 or later without installing dependencies.

```sh
npm test
node --check chain-core.js
node --check app.js
```

Tests cover cryptographic known answers, sample vectors independently generated with Python hashlib, 7 modifications, final-row exceptions, protection and role combinations, and all 16 protection selections. They also check HTML, CSP, both dictionaries, contrast, lessons, questions, and README tables and images. GitHub Actions checks every JavaScript file's syntax and runs `npm test` on push and pull_request.

## 📁 Directory structure

```text
hash-chain-tamper-trainer/   # Project root
├── .github/                 # GitHub configuration
│   └── workflows/           # Automated checks
│       └── test.yml         # Syntax and tests
├── .gitignore               # Git exclusions
├── CLAUDE.md                # Developer guide
├── LICENSE                  # MIT license
├── README.en.md             # English documentation
├── README.md                # Japanese documentation
├── app.js                   # Interface and interactions
├── assets/                  # Japanese screenshots
│   ├── chain.png            # Chain view
│   ├── en/                  # English screenshots
│   │   ├── chain.png        # Chain view
│   │   └── protections.png  # Protection and role table
│   ├── protections.png      # Protection and role table
│   └── tamper.png           # Tampering result
├── chain-core.js            # Chain and cryptography
├── index.html               # Five-tab structure
├── messages.js              # Japanese and English text
├── package.json             # Test command
├── samples.js               # Two fictional samples
├── style.css                # Layout and light/dark colors
└── test/                    # Automated tests
    ├── chain-vectors.json   # Independent chain vectors
    ├── chain.test.js        # Chain and tampering checks
    ├── contrast.test.js     # Contrast checks
    ├── html.test.js         # HTML and CSP checks
    ├── i18n.test.js         # Dictionary and wording checks
    ├── learning.test.js     # Lesson and quiz checks
    ├── protections.test.js  # Protection and role checks
    └── readme.test.js       # Documentation consistency
```

## 💻 Requirements

Use a browser with JavaScript and Web Crypto support for SHA-256, HMAC and ECDSA P-256. HTTPS, local HTTP and file:// are checked.

| Engine | Checked coverage |
|---|---|
| Chromium 145 | HTTP and file://, widths 320, 390 and 1280px, Japanese and English |
| Firefox 146 | HTTP and file://, widths 320 and 1280px, Japanese |
| WebKit 26.0 | HTTP and file://, width 390px, Japanese and English |

Physical Safari, physical smartphones and screen-reader speech are unverified. Environments without Web Crypto show an explanation and disable computation.

## 📄 License

Source code is licensed under the [MIT License](LICENSE). Quoted passages and referenced works remain the property of their respective authors.

## 🛠️ About this tool

This tool is part of the 200 Security Tools with Generative AI project.
The project uses AI assistance to create and publish a variety of security tools over 100 days.

See the [project page](https://akademeia.info/?page_id=44607) for details and other tools.
