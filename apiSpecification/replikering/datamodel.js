const assert = require('assert');

const definitions = require('../commonSchemaDefinitions');
const temaModels = require('../../dagiImport/temaModels');
const schemaUtl = require('../../apiSpecification/schemaUtil');
const darReplikeringModels = require('../../dar10/replikeringModels');

const defaultSchemas = {
  integer: {type: 'integer'},
  real: {type: 'number'},
  boolean: {type: 'boolean'},
  string: {type: 'string'},
  uuid: definitions.UUID,
  timestamp: {type: 'string'},
  localdatetime: {type: 'string'},
  point2d: {type: 'object'}
};
module.exports = {
  adgangsadresse: {
    key: ['id'],
    attributes: [
      {
        name: 'id',
        type: 'uuid',
        description: 'Universel, unik identifikation af adressen af datatypen UUID. ' +
        'Er stabil over hele adressens levetid (ligesom et CPR-nummer) ' +
        'dvs. uanset om adressen evt. ændrer vejnavn, husnummer, postnummer eller kommunekode. ' +
        'Repræsenteret som 32 hexadecimale tegn. Eksempel: ”0a3f507a-93e7-32b8-e044-0003ba298018”.'
      },
      {
        name: 'status',
        type: 'integer',
        schema: definitions.Status,
        description: 'Adgangsadressens status. 1 indikerer en gældende adresse, 3 indikerer en foreløbig adresse.',
      },
      {
        name: 'oprettet',
        type: 'localdatetime',
        nullable: true,
        description: 'Dato og tid for adgangsadressens oprettelse,' +
        ' som registreret i BBR. Eksempel: 2001-12-23T00:00:00.'
      },
      {
        name: 'ændret',
        type: 'localdatetime',
        nullable: true,
        description: 'Dato og tid hvor der sidst er ændret i adgangsadressen,' +
        ' som registreret i BBR. Eksempel: 2002-04-08T00:00:00.',
      },
      {
        name: 'ikrafttrædelsesdato',
        type: 'localdatetime',
        nullable: true,
        description: 'Adgangsadressens ikrafttrædelsesdato'
      }, {
        name: 'kommunekode',
        type: 'integer',
        nullable: true,
        schema: definitions.NullableKode4,
        description: 'Kommunekoden. 4 cifre.'
      }, {
        name: 'vejkode',
        type: 'integer',
        nullable: true,
        schema: definitions.NullableKode4,
        description: 'Identifikation af vejstykket, adgangsadressen befinder sig på.' +
        ' Er unikt indenfor den pågældende kommune. Repræsenteret ved fire cifre.' +
        ' Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.'
      }, {
        name: 'husnr',
        type: 'string',
        nullable: true,
        schema: definitions.Nullablehusnr,
        description: 'Husnummer der identificerer den pågældende adresse i forhold til andre adresser med samme vejnavn.' +
        ' Husnummeret består af et tal 1-999 evt. suppleret af et stort bogstav A..Z, og fastsættes i stigende orden,' +
        ' normalt med lige og ulige numre på hver side af vejen. Eksempel: "11", "12A", "187B".'
      }, {
        name: 'supplerendebynavn',
        type: 'string',
        nullable: true,
        schema: definitions.Nullablesupplerendebynavn,
        description: 'Et supplerende bynavn – typisk landsbyens navn – eller andet lokalt stednavn,' +
        ' der er fastsat af kommunen for at præcisere adressens beliggenhed indenfor postnummeret.' +
        ' Indgår som en del af den officielle adressebetegnelse. Indtil 34 tegn. Eksempel: ”Sønderholm”.'
      }, {
        name: 'postnr',
        type: 'string',
        nullable: true,
        schema: definitions.NullablePostnr,
        description: 'Postnummeret som adressen er beliggende i.'
      }, {
        name: 'ejerlavkode',
        type: 'integer',
        deprecated: true,
        nullable: true,
        schema: definitions.NullableUpTo7,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Benyt "jordstykke" i stedet. Angiver ejerlavkoden registreret i BBR.' +
        ' Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.'
      }, {
        name: 'matrikelnr',
        type: 'string',
        deprecated: true,
        nullable: true,
        schema: definitions.Nullablematrikelnr,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Benyt "jordstykke" i stedet. Angiver matrikelnummeret for jordstykket, som det var registreret i BBR.' +
        ' Repræsenteret ved Indtil 7 tegn: max. 4 cifre + max. 3 små bogstaver. Eksempel: ”18b”.'
      }, {
        name: 'esrejendomsnr',
        type: 'string',
        nullable: true,
        schema: definitions.Nullableesrejendomsnr,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret,' +
        ' ESR, som det matrikelnummer som adressen ligger på, er en del af.' +
        ' Stammer fra BBR.' +
        ' Repræsenteret ved op til syv cifre. Eksempel ”13606”.'
      }, {
        name: 'etrs89koordinat_øst',
        type: 'real',
        nullable: true,
        description: 'Adgangspunktets østlige koordiat angivet i koordinatsystemet UTM zone 32' +
        ' og ved brug af det fælles europæiske terrestriale referencesystem EUREF89/ETRS89.'
      }, {
        name: 'etrs89koordinat_nord',
        type: 'real',
        nullable: true,
        description: 'Adgangspunktets nordlige koordiat angivet i koordinatsystemet UTM zone 32' +
        ' og ved brug af det fælles europæiske terrestriale referencesystem EUREF89/ETRS89.'
      }, {
        name: 'nøjagtighed',
        type: 'string',
        schema: definitions['Nøjagtighed'],
        description: 'Kode der angiver nøjagtigheden for adressepunktet. Et tegn.' +
        ' ”A” betyder at adressepunktet er absolut placeret på et detaljeret grundkort,' +
        ' typisk med en nøjagtighed bedre end +/- 2 meter. ”B” betyder at adressepunktet er beregnet –' +
        ' typisk på basis af matrikelkortet, således at adressen ligger midt på det pågældende matrikelnummer.' +
        ' I så fald kan nøjagtigheden være ringere en end +/- 100 meter afhængig af forholdene.' +
        ' ”U” betyder intet adressepunkt.',
      }, {
        name: 'kilde',
        type: 'integer',
        nullable: true,
        description: 'Kode der angiver kilden til adressepunktet. Et tegn.' +
        ' ”1” = oprettet maskinelt fra teknisk kort;' +
        ' ”2” = Oprettet maskinelt fra af matrikelnummer tyngdepunkt;' +
        ' ”3” = Eksternt indberettet af konsulent på vegne af kommunen;' +
        ' ”4” = Eksternt indberettet af kommunes kortkontor o.l.' +
        ' ”5” = Oprettet af teknisk forvaltning."'
      }, {
        name: 'husnummerkilde',
        type: 'integer',
        nullable: true,
        description: 'Kode der angiver kilden til husnummeret. Et tal bestående af et ciffer.'
      }, {
        name: 'tekniskstandard',
        type: 'string',
        nullable: true,
        schema: definitions.NullableTekniskstandard,
        description: 'Kode der angiver den specifikation adressepunktet skal opfylde. 2 tegn.' +
        ' ”TD” = 3 meter inde i bygningen ved det sted hvor indgangsdør e.l. skønnes placeret;' +
        ' ”TK” = Udtrykkelig TK-standard: 3 meter inde i bygning, midt for længste side mod vej;' +
        ' ”TN” Alm. teknisk standard: bygningstyngdepunkt eller blot i bygning;' +
        ' ”UF” = Uspecificeret/foreløbig: ikke nødvendigvis placeret i bygning."'
      }, {
        name: 'tekstretning',
        type: 'real',
        nullable: true,
        schema: definitions.NullableTekstretning,
        description: 'Angiver en evt. retningsvinkel for adressen i ”gon”' +
        ' dvs. hvor hele cirklen er 400 gon og 200 er vandret.' +
        ' Værdier 0.00-400.00: Eksempel: ”128.34”.'
      }, {
        name: 'adressepunktændringsdato',
        type: 'localdatetime',
        nullable: true,
        description: 'Dato for sidste ændring i adressepunktet, som registreret af BBR.' +
        ' Eksempel: ”1998-11-17T00:00:00”'
      }, {
        name: 'esdhreference',
        type: 'string',
        nullable: true,
        description: 'Nøgle i ESDH system.'
      }, {
        name: 'journalnummer',
        type: 'string',
        nullable: true,
        description: 'Journalnummer.'
      },
      {
        name: 'højde',
        type: 'real',
        nullable: true,
        description: 'Højden (koten) er beregnet efter Dansk Vertikal Reference 1990 (DVR90) fra middelvandstanden i havene ved Danmarks kyster til terrænniveau.  Angivet i meter.'
      },
      {
        name: 'adgangspunktid',
        type: 'uuid',
        nullable: true,
        description: 'Adgangspunktets unikke ID'
      }
    ]
  },
  adresse: {
    key: ['id'],
    attributes: [
      {
        name: 'id',
        type: 'uuid',
        description: 'Universel, unik identifikation af adressen af datatypen UUID.' +
        ' Er stabil over hele adressens levetid (ligesom et CPR-nummer)' +
        ' dvs. uanset om adressen evt. ændrer vejnavn, husnummer, postnummer eller kommunekode.' +
        ' Repræsenteret som 32 hexadecimale tegn. Eksempel: ”0a3f507a-93e7-32b8-e044-0003ba298018”.'
      },
      {
        name: 'status',
        type: 'integer',
        schema: definitions.Status,
        description: 'Adressens status. 1 indikerer en gældende adresse, 3 indikerer en foreløbig adresse.'
      }, {
        name: 'oprettet',
        type: 'localdatetime',
        description: 'Dato og tid for adressens oprettelse, som registreret hos BBR. Eksempel: 2001-12-23T00:00:00.'
      }, {
        name: 'ændret',
        type: 'localdatetime',
        description: 'Dato og tid hvor der sidst er ændret i adgangsadressen, som registreret hos BBR. Eksempel: 2002-04-08T00:00:00.'
      }, {
        name: 'ikrafttrædelsesdato',
        type: 'localdatetime',
        nullable: true,
        description: 'Adressens ikrafttrædelsesdato.',
      }, {
        name: 'adgangsadresseid',
        type: 'uuid',
        description: 'Identifier for adressens adgangsadresse. UUID.',
      }, {
        name: 'etage',
        type: 'string',
        description: 'Etagebetegnelse. Hvis værdi angivet kan den antage følgende værdier:' +
        ' tal fra 1 til 99, st, kl, k2 op til k9.',
        nullable: true,
        schema: definitions.NullableEtage
      }, {
        name: 'dør',
        type: 'string',
        nullable: true,
        schema: definitions.NullableDør,
        description: 'Dørbetegnelse. Hvis værdi angivet kan den antage følgende værdier:' +
        ' tal fra 1 til 9999, små og store bogstaver samt tegnene / og -.'
      }, {
        name: 'kilde',
        type: 'integer',
        nullable: true,
        description: 'Kode der angiver kilden til adressen. Tal bestående af et ciffer.'
      },
      {
        name: 'esdhreference',
        type: 'string',
        nullable: true,
        description: 'Nøgle i ESDH system.'
      }, {
        name: 'journalnummer',
        type: 'string',
        nullable: true,
        description: 'Journalnummer.'
      }
    ]
  },
  ejerlav: {
    key: ['kode'],
    attributes: [
      {
        name: 'kode',
        type: 'integer',
        schema: definitions.UpTo7,
        description: 'Unik identifikation af det matrikulære ”ejerlav”.' +
        ' Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.'
      }, {
        name: 'navn',
        type: 'string',
        description: 'Det matrikulære ”ejerlav”s navn. Eksempel: ”Eskebjerg By, Bregninge”.'
      }]
  },
  jordstykketilknytning: {
    key: ['ejerlavkode', 'matrikelnr', 'adgangsadresseid'],
    attributes: [
      {
        name: 'ejerlavkode',
        type: 'string',
        description: 'Ejerlavkoden. 4 cifre.'
      },
      {
        name: 'matrikelnr',
        type: 'string',
        description: 'Matrikelnummeret for jordstykket.'
      },
      {
        name: 'adgangsadresseid',
        type: 'uuid',
        description: 'Adgangsadressens id.',
      }
    ]
  },
  navngivenvej: {
    key: ['id'],
    attributes: [
      {
        name: 'id',
        type: 'uuid',
        description: 'Den navngivne vejs unikke ID',
      },
      {
        name: 'darstatus',
        schema: definitions.Status,
        description: 'Statuskode. Mulige værdier: 2 (Foreløbig), 3 (Gældende).',
      },
      {
        name: 'oprettet',
        type: 'timestamp',
        description: 'Dato og tid for vejens oprettelse i DAR. Eksempel: 2001-12-23T00:00:00.',
      },
      {
        name: 'ændret',
        type: 'timestamp',
        description: 'Dato og tid for seneste ændring af vejen i DAR. Eksempel: 2002-04-08T00:00:00.',
      },
      {
        name: 'navn',
        type: 'string',
        description: 'Vejens navn. Repræsenteret ved indtil 40 tegn. Eksempel: ”Hvidkildevej”.',
        schema: definitions.Vejnavn
      }, {
        name: 'adresseringsnavn',
        type: 'string',
        nullable: true,
        schema: definitions.NullableVejnavnForkortet,
        description: 'En evt. forkortet udgave af vejnavnet på højst 20 tegn,' +
        ' som bruges ved adressering på labels og rudekuverter og lign., hvor der ikke plads til det fulde vejnavn.',
      }, {
        name: 'administreresafkommune',
        type: 'string',
        nullable: true,
        description: '?',
      }, {
        name: 'beskrivelse',
        type: 'string',
        nullable: true,
        description: 'En beskrivelse af den navngivne vej',
      }, {
        name: 'retskrivningskontrol',
        type: 'string',
        nullable: true,
        description: '?',
      }, {
        name: 'udtaltvejnavn',
        type: 'string',
        nullable: true,
        description: '?',
      }]
  },
  postnummer:
    {
      key: ['nr'],
      attributes: [
        {
          name: 'nr',
          type: 'string',
          schema: definitions.Postnr,
          description: 'Unik identifikation af det postnummeret. Postnumre fastsættes af Post Danmark.' +
          ' Repræsenteret ved fire cifre. Eksempel: ”2400” for ”København NV”.'
        },
        {
          name: 'navn',
          type: 'string',
          schema: definitions.PostnrNavn,
          description: 'Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn.' +
          ' Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.'
        },
        {
          name: 'stormodtager',
          type: 'boolean',
          description: 'Hvorvidt postnummeret er en særlig type,' +
          ' der er tilknyttet en organisation der modtager en større mængde post.'
        }]
    },
  stednavntilknytning: {
    key: ['stednavn_id', 'adgangsadresse_id'],
    attributes: [{
      name: 'stednavn_id',
      type: 'uuid',
      description: 'stednavnets ID',
    }, {
      name: 'adgangsadresse_id',
      type: 'uuid',
      description: 'adgangsadressens ID'
    }]
  },
  vejstykke: {
    key: ['kommunekode', 'kode'],
    attributes: [
      {
        name: 'kommunekode',
        type: 'string',
        description: 'Kommunekoden. 4 cifre.',
        schema: definitions.Kode4,

      },
      {
        name: 'kode',
        type: 'string',
        schema: definitions.Kode4,
        description: 'Identifikation af vejstykke. Er unikt indenfor den pågældende kommune. ' +
        'Repræsenteret ved fire cifre. Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.'
      },
      {
        name: 'oprettet',
        type: 'localdatetime',
        deprecated: true,
        nullable: true,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Oprettelsestidspunktet for vejstykket som registreret i BBR'
      }, {
        name: 'ændret',
        type: 'localdatetime',
        deprecated: true,
        nullable: true,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Tidspunkt for seneste ændring af vejstykket, som registreret i BBR'
      }, {
        name: 'navn',
        type: 'string',
        nullable: true,
        schema: definitions.NullableVejnavn,
        description: 'Vejens navn som det er fastsat og registreret af kommunen. ' +
        'Repræsenteret ved indtil 40 tegn. Eksempel: ”Hvidkildevej”.'
      }, {
        name: 'adresseringsnavn',
        type: 'string',
        nullable: true,
        schema: definitions.NullableVejnavnForkortet,
        description: 'En evt. forkortet udgave af vejnavnet på højst 20 tegn,' +
        ' som bruges ved adressering på labels og rudekuverter og lign., hvor der ikke plads til det fulde vejnavn.'
      }
    ]
  },
  vejstykkepostnummerrelation: {
    key: ['kommunekode', 'vejkode', 'postnr'],
    attributes: [
      {
        name: 'kommunekode',
        type: 'string',
        schema: definitions.Kode4,
        description: 'Kommunekoden. 4 cifre.'
      }, {
        name: 'vejkode',
        schema: definitions.Kode4,
        description: 'Vejkoden. 4 cifre.'
      }, {
        name: 'postnr',
        schema: definitions.Kode4,
        description: 'Postnummeret. 4 cifre.'
      }]
  },

};

for (let temaModel of temaModels.modelList) {
  module.exports[temaModel.tilknytningName] = temaModels.toReplikeringTilknytningModel(temaModel);
}

for(let [entityName, model] of Object.entries( darReplikeringModels.currentReplikeringModels)) {
  module.exports[`dar_${entityName.toLowerCase()}_aktuel`] = model;
}

for(let [entityName, model] of Object.entries( darReplikeringModels.historyReplikeringModels)) {
  module.exports[`dar_${entityName.toLowerCase()}_historik`] = model;
}

const getDefaultSchema = (type, nullable) => {
  const schemaType = defaultSchemas[type];
  assert(schemaType);
  return nullable ? schemaUtl.nullable(schemaType) : schemaType;
};

for(let modelName of Object.keys(module.exports)) {
  const model = module.exports[modelName];
  for(let attr of model.attributes) {
    attr.schema = attr.schema || getDefaultSchema(attr.type, attr.nullable);
    attr.deprecated = !!attr.deprecated;
  }
}