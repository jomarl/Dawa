DROP VIEW IF EXISTS adgangsadresser_mat_view CASCADE;
CREATE VIEW adgangsadresser_mat_view AS
  SELECT
    A.id ,
    A.kommunekode,
    A.vejkode,
    A.husnr,
    A.supplerendebynavn,
    A.supplerendebynavn_dagi_id,
    A.postnr,
    A.ejerlavkode,
    A.matrikelnr,
    A.esrejendomsnr,
    A.objekttype,
    A.oprettet,
    A.ikraftfra,
    A.aendret,
    A.adgangspunktid,
    A.etrs89oest,
    A.etrs89nord,
    A.noejagtighed,
    A.adgangspunktkilde,
    A.husnummerkilde,
    A.placering,
    A.tekniskstandard,
    A.tekstretning,
    A.adressepunktaendringsdato,
    A.esdhReference,
    A.journalnummer,
    A.hoejde,
    A.navngivenvej_id,
    A.navngivenvejkommunedel_id,
    A.supplerendebynavn_id,
    A.darkommuneinddeling_id,
    A.adressepunkt_id,
    A.postnummer_id,
    P.navn AS postnrnavn,
    V.vejnavn,
    V.adresseringsnavn as adresseringsvejnavn ,
    E.navn as ejerlavnavn,
    S.nr AS stormodtagerpostnr,
    S.navn AS stormodtagerpostnrnavn,
    vp.id AS vejpunkt_id,
    vp.kilde AS vejpunkt_kilde,
    vp.tekniskstandard AS vejpunkt_tekniskstandard,
    vp.noejagtighedsklasse AS vejpunkt_noejagtighedsklasse,
    vp.geom AS vejpunkt_geom
  FROM adgangsadresser A
    LEFT JOIN Ejerlav E ON A.ejerlavkode = E.kode
    LEFT JOIN vejstykker        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
    LEFT JOIN Postnumre       AS P   ON (A.postnr = P.nr)
  LEFT JOIN stormodtagere AS S ON A.id = S.adgangsadresseid
LEFT JOIN vejpunkter vp ON vp.id = A.vejpunkt_id;