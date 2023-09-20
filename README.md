# ctr-tools
### TypeScript library for interacting with several Nintendo 3DS file types. Mainly used to process CIA files for the Pretendo eShop

## Installation
```
npm i @pretendonetwork/ctr-tools
```

## Supported files
- [x] CIA. Does not decrypt contents
- [x] Certificates. Partial. All data is extracted, but signature verification seems to always fail?
- [x] SMDH. All data is extracted, but some pieces (like several sections of Application Settings) are left as `Buffer` blobs
- [x] TMD
- [x] Ticket. Does not decrypt title key

## Example
```ts
import fs from 'node:fs';
import { CIA } from '@pretendonetwork/ctr-tools/cia';

const cia = new CIA(`${__dirname}/nimbus.cia`);

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