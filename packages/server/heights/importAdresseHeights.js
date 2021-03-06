#!/usr/bin/env node
"use strict";

const _ = require('underscore');

const { runImporter } = require('@dawadk/common/src/cli/run-importer');
const importAdresseHeightsImpl = require('./importAdresseHeightsImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction} = require('../importUtil/transaction-util');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med vejmidter', 'string']
};

runImporter('højdeudtræk', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client =>
    withImportTransaction(client, "importHeights", (txid) =>
      importAdresseHeightsImpl.importHeights(client,txid, options.file)));
});
