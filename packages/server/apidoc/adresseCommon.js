const {
  SRIDParameter
} = require('./common');

const strukturParameterAdresse = {
  name: 'struktur',
  doc: 'Angiver om der ønskes en fuld svarstruktur (nestet), en flad svarstruktur (flad) eller en reduceret svarstruktur (mini). ' +
  ' Mulige værdier: "nestet", "flad" eller "mini".  For JSON er default "nestet", og for CSV og GeoJSON er default "flad".' +
  ' Det anbefales at benytte mini-formatet hvis der ikke er behov for den fulde struktur, da dette vil' +
  ' give bedre svartider.'
};

const geometriParam = {
  name: 'geometri',
  doc: 'Hvis GeoJSON formatet anvendes, angiver parameteren om det er adgangspunktet eller vejpunktet der anvendes. Mulige værdier: "adgangspunkt" eller "vejpunkt"'
};

const medtagUgyldigeNedlagte = [
  {
    name: 'medtagugyldige',
    doc: 'Medtag ugyldige adresser i svaret (adresser uden vejnavn, postnummer eller husnummer).'
  },
  {
    name: 'medtagnedlagte',
    doc: 'Medtag nedlagte eller henlagte adresser i svaret.'
  }
]

const parametersForBothAdresseAndAdgangsAdresse = [
  {
    name: 'status',
    doc: 'Find adresser med den angivne status. "1" angiver en endelig adresse og "3" angiver en foreløbig adresse". ' +
    'Adresser med status "2" eller "4" er ikke med i DAWA.'
  },
  {
    name: 'vejkode',
    doc: 'Vejkoden. 4 cifre.'
  },
  {
    name: 'vejnavn',
    doc: 'Vejnavn. Der skelnes mellem store og små bogstaver.',
    nullable: true
  },
  {
    name: 'husnr',
    doc: 'Husnummer. Max 4 cifre eventuelt med et efterfølgende bogstav.'
  },
  {
    name: 'husnrfra',
    doc: 'Returner kun adresser hvor husnr er større eller lig det angivne.'
  },
  {
    name: 'husnrtil',
    doc: 'Returner kun adresser hvor husnr er mindre eller lig det angivne. Bemærk, at hvis der angives' +
    ' f.eks. husnrtil=20, så er 20A ikke med i resultatet.'
  },
  {
    name: 'supplerendebynavn',
    doc: 'Det supplerende bynavn.',
    nullable: true
  },
  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.'
  },
  {
    name: 'kommunekode',
    doc: 'Kommunekoden for den kommune som adressen skal ligge på. 4 cifre.'
  },
  {
    name: 'ejerlavkode',
    doc: 'Koden på det matrikulære ejerlav som adressen skal ligge på.'
  },
  {
    name: 'zonekode',
    doc: 'Heltalskoden for den zone som adressen skal ligge i. Mulige værdier er 1 for byzone, 2 for landzone og 3 for sommerhusområde.'
  },
  {
    name: 'zone',
    doc: 'Adressens zonestatus. Mulige værdier: "Byzone", "Sommerhusområde" eller "Landzone"'
  },
  {
    name: 'matrikelnr',
    doc: 'Matrikelnummer. Unikt indenfor et ejerlav.'
  },
  {
    name: 'esrejendomsnr',
    doc: 'ESR Ejendomsnummer. Indtil 7 cifre. Søger på esrejendomsnummeret for det tilknyttede jordstykke.'
  },
  SRIDParameter,
  {
    name: 'polygon',
    doc: 'Find de adresser, som ligger indenfor det angivne polygon. ' +
    'Polygonet specificeres som et array af koordinater på samme måde som' +
    ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
    ' Bemærk at polygoner skal' +
    ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
    ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Dette' +
    ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
    ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].'

  },
  {
    name: 'cirkel',
    doc: 'Find de adresser, som ligger indenfor den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.'
  },
  {
    name: 'nøjagtighed',
    doc: 'Find adresser hvor adgangspunktet har en den angivne nøjagtighed. Mulige værdier er "A", "B" og "U"'
  },
  {
    name: 'regionskode',
    doc: 'Find de adresser som ligger indenfor regionen angivet ved regionkoden.',
    nullable: true
  },
  {
    name: 'sognekode',
    doc: 'Find de adresser som ligger indenfor sognet angivet ved sognkoden.',
    nullable: true
  },
  {
    name: 'afstemningsområdenummer',
    doc: 'Find de adresser som ligger i et afstemningsområde med det angivne nummer. Kombineres som regel med kommunekodeparameteren.'
  },
  {
    name: 'opstillingskredskode',
    doc: 'Find de adresser som ligger indenfor opstillingskredsen angivet ved opstillingskredskoden.',
    nullable: true
  },
  {
    name: 'storkredsnummer',
    doc: 'Find de adresser som ligger storkredsen med det angivne nummer.'
  },
  {
    name: 'valglandsdelsbogstav',
    doc: 'Find de adresser som ligger i den angivne valglandsdel.'
  },
  {
    name: 'retskredskode',
    doc: 'Find de adresser som ligger indenfor retskredsen angivet ved retskredskoden.',
    nullable: true
  },
  {
    name: 'politikredskode',
    doc: 'Find de adresser som ligger indenfor politikredsen angivet ved politikredskoden.',
    nullable: true
  },
  {
    name: 'stednavnid',
    doc: 'Deprecated, anvend stedid parameteren i stedet. Find de adresser som ligger indenfor stedet med den angivne ID'
  },
  {
    name: 'stedid',
    doc: 'Find de adresser som ligger indenfor stedet med den angivne ID'
  },
  {
    name: 'stednavnafstand',
    doc: 'Deprecated, anvend stedafstand parameteren i stedet. Anvendes sammen med stedid. Find de adresser, hvor afstanden til stedet angivet ved stedid er mindre end den angivne værdi. Afstanden angives i meter.'
  },
  {
    name: 'stedafstand',
    doc: 'Anvendes sammen med stedid. Find de adresser, hvor afstanden til stedet angivet ved stedid er mindre end den angivne værdi. Afstanden angives i meter.'
  },
  {
    name: 'bebyggelsesid',
    doc: 'Find de adresser som ligger indenfor bebyggelsen med den angivne ID'
  },
  {
    name: 'bebyggelsestype',
    doc: 'Find de adresser som ligger en bebyggelse af den angivne type. Mulige værdier: "by", "bydel", "spredtBebyggelse", "sommerhusområde", "sommerhusområdedel", "industriområde", "kolonihave", "storby".'
  },
  {
    name: 'adgangspunktid',
    doc: 'Find adressen med det angivne adgangspunkt ID'
  },
  {
    name: 'vejpunkt_id',
    doc: 'Find adressen med det angivne vejpunkt ID'
  }
];

module.exports = {
  strukturParameterAdresse,
  geometriParam,
  parametersForBothAdresseAndAdgangsAdresse,
  medtagUgyldigeNedlagte
};

