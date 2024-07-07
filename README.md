# Nintendo File Formats
### TypeScript library for interacting with several Nintendo file formats across various consoles.

## Installation
```
npm i @pretendonetwork/nintendo-files
```

## Supported files (parsing)
- [x] CIA. Does not decrypt contents
- [x] Certificates. Signature verification works, just not on illegitimate signatures (homebrew, forged tickets, etc)
- [x] SMDH. All data is extracted, but some pieces (like several sections of Application Settings) are left as `Buffer` blobs
- [x] TMD
- [x] Ticket. Does not decrypt title key
- [ ] Encrypted title parts (`.app` files)
- [ ] Title hashes (`.h3` files)
- [ ] Mii data
- [ ] MSBT
- [ ] BYML/BYAML
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

const cia = new CIA(`${__dirname}/nimbus.cia`);

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