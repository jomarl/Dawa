DROP TABLE IF EXISTS dar_husnummer CASCADE;
CREATE TABLE  dar_husnummer (
  versionid integer NOT NULL PRIMARY KEY,
  id integer NOT NULL,
  bkid uuid NOT NULL,
  adgangspunktid integer NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange,
  virkning tstzrange,
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
  vejkode smallint,
  husnummer husnr,
  ikrafttraedelsesdato timestamptz,
  vejnavn text,
  postnummer smallint,
  postdistrikt text,
  bynavn text
);

CREATE INDEX ON dar_husnummer(id);
CREATE INDEX ON dar_husnummer(bkid);
CREATE INDEX ON dar_husnummer(adgangspunktid);