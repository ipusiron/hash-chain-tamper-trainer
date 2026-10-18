English · [日本語](README.md)

# Hash Chain Tamper Trainer - Learn tampering and rechaining

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/hash-chain-tamper-trainer?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/hash-chain-tamper-trainer?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/hash-chain-tamper-trainer)
![GitHub license](https://img.shields.io/github/license/ipusiron/hash-chain-tamper-trainer)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/hash-chain-tamper-trainer/)

**Day117 - 200 Security Tools with Generative AI**

Hash Chain Tamper Trainer explores what a hash chain can and cannot detect. A hash is the output of a hash function.

This tool keeps records with their corresponding hashes and compares them with recomputed hashes. The overview in step 1 shows the data structure and the roles of the recorder, verifier and independent checkpoint holder.

Change fictional records and recompute the following hashes to see verification pass again. The tool also computes the outcomes of adding a held checkpoint, HMAC, a signature or a time-stamp for people with different access to keys.

## 🌐 Demo

👉 **[Open Hash Chain Tamper Trainer](https://ipusiron.github.io/hash-chain-tamper-trainer/)**

Download the files and open `index.html` in a browser to use it over file://. No installation or build is required.

## 📸 Screenshots

![Learning path step 1](assets/en/chain.png)

*The step-1 overview after all eight calculations. It separates the recorder who holds the record/hash pairs, the verifier who receives the bundle, and the independent checkpoint holder.*

![Learning path step 6](assets/en/protections.png)

*Step 6 compares computed protection outcomes for an outsider and the recorder.*

![Understanding check settings](assets/en/settings.png)

*View the understood count, change whether checks are saved, or clear all understanding checks.*

## ✨ Features

| Entrance | Content |
|---|---|
| Learning path | Seven steps with an aim, open prerequisites, an action, What just happened, How it works and What you learned; from a one-character change to protections and questions |
| Free experiment | Two samples, row additions, seven modifications, all 16 protection combinations and computation details |
| Learn | Four advanced and reference sections: Lamport chains; Git, Merkle trees and blockchains; the Day041 case study; references |
| Settings | Save preferences and clear all understanding checks |

Japanese, English, and light and dark themes are supported. Language changes preserve inputs, results, answers and understanding checks. Arrow keys, Home and End navigate entrances and steps. The understood count is separate from the current step number.

## 📖 Usage

Step 1 starts its prerequisites with the card-access illustration and a data overview: the header, eight record/hash pairs, the trailer and an independently held checkpoint. Pending hashes are replaced by actual results as you calculate. After all eight calculations, use Return to the completed data overview to inspect the finished structure.

The Learning path opens first. Read the aim and prerequisites, then use the main button. What just happened includes calculated hashes and verification results. Read How it works and What you learned below for the reasons. Prerequisites are open from the start and include links to related tools.

1. Build a chain: calculate the hash for each of records 1–8. Inspect the stored pairs in the overview and distinguish the input string, UTF-8 bytes and output in the calculation diagram. Finish with the trailer and an example of the tip to keep as a checkpoint. Restart from record 1 at any time.
2. Change one character: change the time in record 2 from 09:05 to 09:06 and verify while retaining the stored hashes. Compare the original chain’s hashes with hashes recalculated from the changed records, record by record. Expand any record to compare all 64 characters.
3. Update only the hash for the changed record: calculate from the input containing the changed record 2 and replace its stored hash. The first mismatch moves to record 3.
4. Rebuild all later hashes: replace all hashes and the trailer. See verification pass with the changed records, alongside the failing step-3 result.
5. Cut off the tail: remove original records 7 and 8. The six remaining hashes match, but comparison with the original trailer fails.
6. Add protections: select a held checkpoint, HMAC, a signature or a simulated time-stamp. Compare an outsider with the key-holding recorder. Test the checkpoint role introduced in the step-1 overview.
7. Check your understanding: answer eight questions. Questions 1–6 lead to explanations within the relevant step; questions 7–8 lead to Learn. Both destinations let you return to the same question.

Use Next, Back or the step bar to jump freely. On narrow screens, open Choose a step. Steps 2–4 continue the same record and provide a reset button. Starting at a later step prepares the preceding records as needed.

Each step distinguishes changing a record, updating its stored hash, and comparing values during verification. The trailer example keeps the original trailer for comparison, and the protection examples identify who holds the keys and the independent checkpoint.

Each section heading has its own "I understand" checkbox. The aim, prerequisites, task, observation, individual explanation headings and takeaway form 44 independent sections across the seven steps. Checked sections have a green background and an Understood label. Actions and quiz answers never check them automatically, and you can move on without checking them. The step list shows partial counts for each step.

Related tools have link buttons labeled "Open tool (new tab)" in the prerequisites and at the end of the corresponding explanation.

In Settings, "Save understanding checks in this browser" is on by default. Turning it off removes saved checks while retaining the current checks until you reload. Turning it back on saves the current checks. "Clear all understanding checks" asks for confirmation and clears only the checks, preserving the language, saving preference, experiment data and quiz answers. Cancel or Esc dismisses the confirmation. Previous whole-step checks remain listed in Settings; individual section checks start unchecked. Clearing all checks also clears those previous records.

Free experiment provides build, tamper and protection experiments. Changing sample, header or trailer settings rebuilds the original chain; each modification begins from its copy. Protection comparisons use a common row-2 rewrite. These records are independent of the Learning path.

A side-by-side example connects the short display to all 64 characters, with the first 8 underlined. The calculation diagram separates the previous hash, separator and current record, and shows the actual input and output. Opening the exact input also shows every UTF-8 byte directly below it, with the byte count and character-to-byte examples.

Diagrams show the status of all 8 rows, tail deletion, and the people who hold keys or independent copies. All four advanced sections have worked examples, and explanatory prose is divided into paragraphs by topic.

## 🔬 Chain format and verification results

This tool keeps records paired with their corresponding hashes, as shown below. This is a content structure, not a universal CSV or JSON specification. File formats, storage locations and access policies are deployment choices; neither records nor hashes need to be made public.

```plaintext
Bundle held by the recorder
  Header                    Record type, start time, etc.
  Record 1 + its hash
  Record 2 + its hash
  ...
  Record 8 + its hash
  Trailer                   Check of the count and ending
```

| Role | What is kept, received or compared |
|---|---|
| Recorder | Keeps the bundle above and gives it to the verifier |
| Verifier | Receives the bundle, recomputes from the header onward, and compares with the received hashes and trailer |
| Independent checkpoint holder (step 6) | Keeps the final hash at log closure separately; the verifier compares the current tip with this original checkpoint |

Keeping a checkpoint beside the records is insufficient if the person changing the records can replace it too. Step 6 assumes a different person holds the checkpoint. HMAC, signatures and time-stamps also depend on who holds keys and whether the verifier independently knows the closing time.

This tool simulates all roles in the same browser. It does not send data to another person or save it as a file.

**The stored record is distinct from the calculation input.** Record 2 contains the four fields in `09:05,Room-B,C-1002,IN`. Its input also includes the 64-character hash for record 1 and the separator `|`. Encode the complete joined string as UTF-8 bytes and pass it to SHA-256 to obtain the hash for record 2.

The seed is SHA-256 of the header lines joined with LF. Excluding the header uses 64 zeros instead. Each record’s calculation hashes `previousHash + '|' + fields.join(',')`; the trailer hashes `lastHash + '|rows=' + count`.

Hashes have 64 hexadecimal characters. The step-1 overview and result summaries show the first 8 followed by an ellipsis. Other compact rows show the first 8 characters of the preceding hash and the first 12 of the current hash. Expanding a row reveals the complete value. Records contain 4 ASCII fields of 1–64 characters each, up to 100 rows. Commas, pipes and control characters are rejected. Whitespace is not trimmed and Unicode is not normalized. HMAC mode retains the SHA-256 seed and uses HMAC-SHA256 for data rows and the trailer.

The following results use the 8-row access log with its header and trailer. Operations target record 2; truncation removes the last 2 rows. A `-` means the remaining rows match but the original trailer does not. `pass` means verification succeeds after rechaining.

| Operation ID | Operation | First mismatching row | After rechaining |
|---|---|---|---|
| `rewrite` | Rewrite | 2 | pass |
| `delete` | Delete | 2 | pass |
| `swap` | Swap with the next row | 2 | pass |
| `insert` | Insert | 2 | pass |
| `truncate` | Remove the last 2 rows | - | pass |
| `header` | Rewrite the header | 1 | pass |
| `rehashOne` | Update only the hash for the rewritten record | 3 | pass |

Without a trailer, removing the last 2 rows passes. Rewriting only the last record and updating its hash also passes without a trailer. A header excluded from the chain can change undetected. Different modifications can produce the same verification result, so the tool does not infer the modification type.

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

Records, keys and checkpoints stay on the device and are neither saved nor sent. Reloading the page clears them. localStorage stores the language choice under `hash-chain-tamper-trainer.lang`, and the saving preference and checks when saving is on under `hash-chain-tamper-trainer.learning`. The current step number, calculation results and quiz answers are not saved. The app does not use sessionStorage, cookies or IndexedDB.

If storage is unavailable, checks still work on the current page and a saving failure is shown. Invalid saved data is ignored and all checks start unchecked. If updating storage fails, reloading may restore previously saved checks.

Web Crypto performs SHA-256, HMAC and ECDSA P-256 operations. Private and HMAC keys are generated as non-extractable and are never displayed. All computations, including the simulated time-stamp authority, stay on the device. No external authority or blockchain is contacted.

CSP includes `connect-src 'none'`; the DOM is built with `textContent` and `createElement`. There are no CDNs, external fonts or package dependencies. Opening a reference link yourself navigates to that external site.

## 🔗 References and related tools

Each step links the references for its explanation. The references section in Learn lists all 18, including works discussed in the steps.

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

- [Day002 Hash Identifier](https://ipusiron.github.io/hash-detector/): Hash string formats
- [Day031 Git Secrets Playground](https://ipusiron.github.io/git-secrets-playground/): Computing Git objects
- [Day041 Mic Gain Logger](https://ipusiron.github.io/mic-gain-logger/): Logs and a rechaining case study
- [Day052 BaseXX Visualizer](https://ipusiron.github.io/basexx-visualizer/): Encoding byte sequences
- [Day053 JWT Inspector](https://ipusiron.github.io/jwt-inspector/): HMAC and signature verification
- [Day056 HashViz](https://ipusiron.github.io/hashviz/): Avalanche effect and collisions
- [Day114 Hex Dump Trainer](https://ipusiron.github.io/hex-dump-trainer/): Hexadecimal and bytes
- [Day029 OTP Animation](https://ipusiron.github.io/otp-animation/): One-time pad, distinct from the Lamport construction

## 🧪 Tests

Use Node 22 or later without installing dependencies.

```sh
npm test
node --check chain-core.js
node --check app.js
```

Tests cover cryptographic known answers, sample vectors independently generated with Python hashlib, 7 modifications, final-row exceptions, protection and role combinations, and all 16 protection selections. They also check HTML, CSP, both dictionaries, contrast, seven step explanations, four Learn sections, quiz destinations, and README tables and images. GitHub Actions checks every JavaScript file's syntax and runs `npm test` on push and pull_request.

## 📁 Directory structure

```text
hash-chain-tamper-trainer/        # Project root
├── .github/                      # GitHub configuration
│   └── workflows/                # Automated checks
│       └── test.yml              # Syntax and tests
├── .gitignore                    # Git exclusions
├── CLAUDE.md                     # Developer guide
├── LICENSE                       # MIT license
├── README.en.md                  # English documentation
├── README.md                     # Japanese documentation
├── app.js                        # Interface and interactions
├── assets/                       # Screenshots and illustration
│   ├── access-entry.webp         # Card access illustration
│   ├── chain.png                 # Chain view
│   ├── en/                       # English screenshots
│   │   ├── chain.png             # Chain view
│   │   ├── protections.png       # Protection and role table
│   │   └── settings.png          # Understanding check settings
│   ├── protections.png           # Protection and role table
│   ├── settings.png              # Understanding check settings
│   └── tamper.png                # Tampering result
├── chain-core.js                 # Chain and cryptography
├── index.html                    # Four entrances and seven guided steps
├── learning-progress.js          # Understanding checks and persistence
├── messages.js                   # Japanese and English text
├── package.json                  # Test command
├── samples.js                    # Two fictional samples
├── style.css                     # Layout and light/dark colors
└── test/                         # Automated tests
    ├── chain-vectors.json        # Independent chain vectors
    ├── chain.test.js             # Chain and tampering checks
    ├── contrast.test.js          # Contrast checks
    ├── html.test.js              # HTML and CSP checks
    ├── i18n.test.js              # Dictionary and wording checks
    ├── learning-progress.test.js # Understanding and storage checks
    ├── learning.test.js          # Lesson and quiz checks
    ├── protections.test.js       # Protection and role checks
    └── readme.test.js            # Documentation consistency
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
