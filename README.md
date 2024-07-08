# Nintendo File Formats
### TypeScript library for interacting with several Nintendo file formats across various consoles.

## Installation
```
npm i @pretendonetwork/nintendo-files
```

## Usage
This package makes use of the [`"exports"` entry point](https://nodejs.org/api/packages.html#package-entry-points). Ensure your `tsconfig.json` is configured for this.

Each file type may be imported both individually through separate import paths, or as named exports from the package root.

```ts
import BYAML from '@pretendonetwork/nintendo-files/byaml';
import BYML from '@pretendonetwork/nintendo-files/byml'; // Alias of byaml export
import Certificate from '@pretendonetwork/nintendo-files/certificate';
import CIA from '@pretendonetwork/nintendo-files/cia';
import MSBT from '@pretendonetwork/nintendo-files/msbt';
import SMDH from '@pretendonetwork/nintendo-files/smdh';
import Ticket from '@pretendonetwork/nintendo-files/ticket';
import TMD from '@pretendonetwork/nintendo-files/tmd';

import {
	BYAML,
	BYML, // Alias of byaml export
	Certificate,
	CIA,
	MSBT,
	SMDH,
	Ticket,
	TMD
} from '@pretendonetwork/nintendo-files';
```

In order to parse each file, call one of the provided parser methods. Methods exist both as instance and static methods for convenience. Each method is designed for parse the data from various data sources. Each class has the same common parser methods. For file specific methods and fields, see the classes type defs.

```ts
import CIA from '@pretendonetwork/nintendo-files/cia';

let cia: CIA;

cia = CIA.fromFile(fs.openSync('./nimbus.cia')); // Open file `fd`
cia = CIA.fromFile('./nimbus.cia'); // File path on disk
cia = CIA.fromBuffer(Buffer.from('...')); // Data as a buffer
cia = CIA.fromString('...'); // Base64 encoded data string
cia = CIA.fromFileStream(stream); // Mostly used for internal use. Accepts a FileStream from this library
```

Some classes support encoding the data back into a buffer. This is done through a `bytes()` method on each class. See below for a list of file type support.

## Supported files (parsing)
- [x] CIA. Does not decrypt contents
- [x] Certificates. Signature verification works, just not on illegitimate signatures (homebrew, forged tickets, etc)
- [x] SMDH. All data is extracted, but some pieces (like several sections of Application Settings) are left as `Buffer` blobs
- [x] TMD
- [x] Ticket. Does not decrypt title key
- [ ] Encrypted title parts (`.app` files)
- [ ] Title hashes (`.h3` files)
- [ ] Mii data
- [x] MSBT. Parses:
  - [x] LBL1
  - [x] ATR1
  - [x] TXT2
  - [x] NLI1
  - [ ] TSY1
- [x] BYML/BYAML
- [ ] SARC
- [ ] SZS (Yaz0)

## Supported files (encoding)
- [ ] CIA. Does not decrypt contents
- [x] Certificates. Signature verification works, just not on illegitimate signatures (homebrew, forged tickets, etc)
- [ ] SMDH. All data is extracted, but some pieces (like several sections of Application Settings) are left as `Buffer` blobs
- [x] TMD
- [x] Ticket. Does not decrypt title key
- [ ] Encrypted title parts (`.app` files)
- [ ] Title hashes (`.h3` files)
- [ ] Mii data
- [ ] MSBT
- [ ] BYML/BYAML
- [ ] SARC
- [ ] SZS (Yaz0)

## Example
```ts
import fs from 'node:fs';
import CIA from '@pretendonetwork/nintendo-files/cia';

const cia = CIA.fromFile(`${__dirname}/nimbus.cia`);

console.log(cia.CACertificate.verifySignature(cia.TMDCertificate)); // true. Certificates are signed by Nintendo, and should always pass
console.log(cia.CACertificate.verifySignature(cia.ticketCertificate)); // true. Certificates are signed by Nintendo, and should always pass
console.log(cia.TMDCertificate.verifySignature(cia.TMD)); // false. Example Nimbus is a homebrew title, not signed by Nintendo. Nintendo signatures return true
console.log(cia.ticketCertificate.verifySignature(cia.ticket)); // false. Example Nimbus is a homebrew title, not signed by Nintendo. Nintendo signatures return true

if (cia.meta) {
	const largeIconData = cia.meta.iconData.exportLargeImage();
	fs.writeFileSync('./icon-large.png', largeIconData); // 48x48px SMDH icon from the CIA meta section

	console.log(cia.meta.iconData.getEnglishApplicationTitle());
	//{
	//	descriptionShort: 'Nimbus',
	//	descriptionLong: 'Nimbus',
	//	publisher: 'Zaksabeast, shutterbug2000'
	//}
}
```