"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {allColumnNames, nonPrimaryColumnNames, publicNonKeyColumnNames,
  deriveColumnsForChange, makeSelectClause, derivedColumnNames,
  nonDerivedColumnNames, assignSequenceNumbers, columnsDistinctClause} = require('./table-model-util');
const {selectList, columnsEqualClause} = require('@dawadk/common/src/postgres/sql-util');

const applyCurrentTableToChangeTable = (client, tableModel, columnsToApply) => {
  return client.query(`WITH rowsToUpdate AS (SELECT ${selectList('t', tableModel.primaryKey)}, ${selectList('t', columnsToApply)},txid,changeid
  FROM ${tableModel.table} t JOIN LATERAL (select txid, changeid FROM ${tableModel.table}_changes c WHERE
  ${columnsEqualClause('t', 'c', tableModel.primaryKey)} 
   ORDER BY txid DESC NULLS LAST, changeid DESC NULLS LAST limit 1) c ON true)
UPDATE ${tableModel.table}_changes c  SET ${columnsToApply.map(column => `${column} = u.${column}`).join(',')} FROM rowsToUpdate u
WHERE ${columnsEqualClause('c', 'u', tableModel.primaryKey)} AND u.txid = c.txid AND u.changeid IS NOT DISTINCT FROM c.changeid;`);
};

const computeInsertsView =
  (client, txid, srcTable, dstTable, tableModel, columnNames) => {

    columnNames = columnNames ? _.union(columnNames, derivedColumnNames(tableModel)) : allColumnNames(tableModel);
    const idColumns = tableModel.primaryKey;
    const selectIds = selectList(null, idColumns);
    const selectClause = makeSelectClause('t', tableModel, columnNames);
    const changesColumnList = ['txid', 'operation', 'public', columnNames];
    const sql =
      `WITH ids AS 
    (SELECT ${selectIds} FROM ${srcTable} EXCEPT SELECT ${selectIds} FROM ${dstTable})
      INSERT INTO ${tableModel.table}_changes(${changesColumnList.join(', ')}) (SELECT ${txid}, 'insert', true, ${selectClause} FROM ${srcTable} t NATURAL JOIN ids)`;
    return client.query(sql);
  };


/**
 */
const computeInserts = (client, txid, srcTable, tableModel, columnNames) =>
  computeInsertsView(client, txid, srcTable, tableModel.table, tableModel, columnNames);

const computeInsertsSubset = (client, txid, sourceTableOrView, dirtyTable, tableModel, columnNames) => {
  columnNames = columnNames ? _.union(columnNames, derivedColumnNames(tableModel)) : allColumnNames(tableModel);
  const selectClause = makeSelectClause('v', tableModel, columnNames);
  const idSelect = selectList(null, tableModel.primaryKey);
  const beforeSql = `SELECT ${idSelect} FROM ${tableModel.table} NATURAL JOIN ${dirtyTable}`;
  const afterSql = `SELECT ${idSelect} FROM ${sourceTableOrView} NATURAL JOIN ${dirtyTable}`;
  const insertIdsSql = `WITH before as (${beforeSql}), after AS (${afterSql}) SELECT ${idSelect} from after EXCEPT SELECT ${idSelect} FROM before`;
  const sql = `WITH inserts AS (${insertIdsSql}) INSERT INTO ${tableModel.table}_changes(txid, operation, public, ${selectList(null, columnNames)}) (SELECT $1, 'insert', true, ${selectClause} FROM ${sourceTableOrView} v NATURAL JOIN inserts)`;
  return client.query(sql, [txid]);

};

const makePublicClause = (client, tableModel) => {
  const hasNonpublicFields = _.some(tableModel.columns, c => c.public === false);
  if (!hasNonpublicFields) {
    return 'true'
  }
  const publicColNames = publicNonKeyColumnNames(tableModel);
  if (publicColNames.length === 0) {
    return 'false';
  }
  const publicCols = publicColNames.map(colName => _.findWhere(tableModel.columns, {name: colName}));
  return columnsDistinctClause('before', 'after', publicCols);
};

const computeUpdatesSubset = (client, txid, sourceTableOrView, dirtyTable, tableModel, nonPreservedColumns) => go(function* () {
  nonPreservedColumns = nonPreservedColumns ? _.union(nonPreservedColumns, derivedColumnNames(tableModel)) : allColumnNames(tableModel);
  const columnsFromSource = _.difference(nonPreservedColumns, derivedColumnNames(tableModel));
  const idSelect = selectList(null, tableModel.primaryKey);
  const presentBeforeSql = `SELECT ${idSelect} FROM ${tableModel.table} NATURAL JOIN ${dirtyTable}`;
  const presentAfterSql = `SELECT ${idSelect} FROM ${sourceTableOrView} NATURAL JOIN ${dirtyTable}`;
  const possiblyChangedIds = `${presentBeforeSql} INTERSECT ${presentAfterSql}`;
  const nonPrimaryColNames = nonPrimaryColumnNames(tableModel);

  if (nonPrimaryColNames.length === 0) {
    return;
  }
  const nonPrimaryCols = nonPrimaryColNames.map(colName => _.findWhere(tableModel.columns, {name: colName}));
  const changedColumnClause = columnsDistinctClause('before', 'after', nonPrimaryCols);
  const publicClause = makePublicClause(client, tableModel);
  const preservedColumns = _.difference(allColumnNames(tableModel), nonPreservedColumns);
  let rawAfterPreservedSelectClause = selectList('raw_after', columnsFromSource);
  if (preservedColumns.length > 0) {
    rawAfterPreservedSelectClause += ', ' + selectList('before', preservedColumns);
  }
  const sql =
    `WITH possiblyChanged AS (${possiblyChangedIds}),
     before AS (select ${selectList(tableModel.table, allColumnNames(tableModel))} FROM ${tableModel.table} NATURAL JOIN possiblyChanged),
     raw_after AS (select ${selectList(sourceTableOrView, columnsFromSource)} FROM ${sourceTableOrView} NATURAL JOIN possiblyChanged),
     raw_after_preserved AS (SELECT ${rawAfterPreservedSelectClause}
                            FROM before JOIN raw_after ON ${columnsEqualClause('before', 'raw_after', tableModel.primaryKey)}),
     after AS (SELECT ${makeSelectClause('raw_after_preserved', tableModel, allColumnNames(tableModel))}  FROM raw_after_preserved),
     changedIds AS (SELECT ${selectList('before', tableModel.primaryKey)}, ${publicClause} as is_public 
  FROM before JOIN after ON ${columnsEqualClause('before', 'after', tableModel.primaryKey)}
  WHERE ${changedColumnClause})
   INSERT INTO ${tableModel.table}_changes(txid, operation, public, ${selectList(null, allColumnNames(tableModel))}) (SELECT ${txid}, 'update', is_public, ${selectList(null, allColumnNames(tableModel))} FROM after NATURAL JOIN changedIds)
`;
  yield client.query(sql);
});

const computeUpdatesView =
  (client, txid, sourceTableOrView, dstTable, tableModel, nonPreservedColumns) => go(function* () {
    nonPreservedColumns = nonPreservedColumns ? _.union(nonPreservedColumns, derivedColumnNames(tableModel)) : allColumnNames(tableModel);
    const columnsFromSource = _.difference(nonPreservedColumns, derivedColumnNames(tableModel));
    const nonPrimaryColumnNamesList = nonPrimaryColumnNames(tableModel);
    if (nonPrimaryColumnNamesList.length === 0) {
      return;
    }
    const nonPrimaryColumns = nonPrimaryColumnNamesList.map(columnName => _.findWhere(tableModel.columns, {name: columnName}));
    const changedColumnClause = columnsDistinctClause('before', 'after', nonPrimaryColumns);
    const publicClause = makePublicClause(client, tableModel);
    const preservedColumns = _.difference(allColumnNames(tableModel), nonPreservedColumns);
    let rawAfterPreservedSelectClause = selectList('raw_after', columnsFromSource);
    if (preservedColumns.length > 0) {
      rawAfterPreservedSelectClause += ', ' + selectList('before', preservedColumns);
    }
    const sql =
      `WITH 
     raw_after AS (select ${selectList(sourceTableOrView, columnsFromSource)} FROM ${sourceTableOrView}),
     raw_after_preserved AS (SELECT ${rawAfterPreservedSelectClause}
                            FROM ${dstTable} before JOIN raw_after ON ${columnsEqualClause('before', 'raw_after', tableModel.primaryKey)}),
     after AS (SELECT ${makeSelectClause('raw_after_preserved', tableModel, allColumnNames(tableModel))} FROM raw_after_preserved),
     changedIds AS (SELECT ${selectList('before', tableModel.primaryKey)}, ${publicClause} as is_public 
  FROM ${dstTable} before JOIN after ON ${columnsEqualClause('before', 'after', tableModel.primaryKey)}
  ${nonPrimaryColumnNamesList.length > 0 ? `WHERE ${changedColumnClause}` : ''})
   INSERT INTO ${tableModel.table}_changes(txid, operation, public, ${selectList(null, allColumnNames(tableModel))}) (SELECT ${txid}, 'update', is_public, ${selectList(null, allColumnNames(tableModel))} FROM after NATURAL JOIN changedIds)
`;
    yield client.query(sql);
  });
/**
 * Given srcTable and dstTable, insert into a new, temporary table instTable the set of rows
 * to be inserted into dstTable in order to make srcTable and dstTable equal.
 */
const computeUpdates = (client, txid, sourceTableOrView, tableModel, nonPreservedColumns) =>
  computeUpdatesView(client, txid, sourceTableOrView, tableModel.table, tableModel, nonPreservedColumns);

const computeDeletesView = (client, txid, srcTable, dstTable, tableModel) => {
  const selectIds = selectList(null, tableModel.primaryKey);
  const changesColumnList = ['txid', 'operation', 'public', ...allColumnNames(tableModel)];
  const selectColumns = selectList('t', allColumnNames(tableModel));
  const sql =
    `WITH ids AS 
    (SELECT ${selectIds} FROM ${dstTable} EXCEPT SELECT ${selectIds} FROM ${srcTable})
      INSERT INTO ${tableModel.table}_changes(${changesColumnList.join(', ')}) (SELECT ${txid}, 'delete', true, ${selectColumns} FROM ${dstTable} t NATURAL JOIN ids)`;
  return client.query(sql);
};


const computeDeletes = (client, txid, srcTable, tableModel) =>
  computeDeletesView(client, txid, srcTable, tableModel.table, tableModel);

const computeDeletesSubset = (client, txid, srcTableOrView, dirtyTable, tableModel) => {
  const idSelect = selectList(null, tableModel.primaryKey);
  const beforeSql = `SELECT ${idSelect} FROM ${tableModel.table} NATURAL JOIN ${dirtyTable}`;
  const afterSql = `SELECT ${idSelect} FROM ${srcTableOrView} NATURAL JOIN ${dirtyTable}`;
  const deleteIdsSql = `WITH before as (${beforeSql}), after AS (${afterSql}) SELECT ${idSelect} from before EXCEPT SELECT ${idSelect} FROM after`;

  const sql = `WITH deletes AS (${deleteIdsSql}) 
  INSERT INTO ${tableModel.table}_changes(txid, operation, public, ${selectList(null, allColumnNames(tableModel))})
  (SELECT ${txid}, 'delete', true, ${selectList('t', allColumnNames(tableModel))} FROM ${tableModel.table} t NATURAL JOIN deletes)`;
  return client.query(sql);
};


const computeDifferencesView =
  (client, txid, srcTable, dstTable, tableModel, columns) => go(function* () {
    yield computeInsertsView(client, txid, srcTable, dstTable, tableModel, columns);
    yield computeUpdatesView(client, txid, srcTable, dstTable, tableModel, columns);
    yield computeDeletesView(client, txid, srcTable, dstTable, tableModel);
  });

const computeDifferences =
  (client, txid, srcTable, tableModel, columns) => go(function* () {
    yield computeInserts(client, txid, srcTable, tableModel, columns);
    yield computeUpdates(client, txid, srcTable, tableModel, columns);
    yield computeDeletes(client, txid, srcTable, tableModel);
  });

const computeDifferencesSubset = (client, txid, srcTableOrView, dirtyTable, tableModel, columns) => go(function* () {
  yield computeInsertsSubset(client, txid, srcTableOrView, dirtyTable, tableModel, columns);
  yield computeUpdatesSubset(client, txid, srcTableOrView, dirtyTable, tableModel, columns);
  yield computeDeletesSubset(client, txid, srcTableOrView, dirtyTable, tableModel);
});

const applyInserts = (client, txid, tableModel, changeTable) => go(function* () {
  changeTable = changeTable || `${tableModel.table}_changes`;
  const columnList = selectList(null, allColumnNames(tableModel));
  yield client.query(`INSERT INTO ${tableModel.table}(${columnList}) (SELECT ${columnList} FROM ${changeTable} WHERE txid = ${txid} and operation = 'insert')`);
});

const applyDeletes = (client, txid, tableModel, changeTable) => go(function* () {
  changeTable = changeTable || `${tableModel.table}_changes`;
  yield client.query(`DELETE FROM ${tableModel.table} t USING ${changeTable} c WHERE c.txid = ${txid} AND operation='delete' AND ${columnsEqualClause('t', 'c', tableModel.primaryKey)}`);
});

const applyUpdates = (client, txid, tableModel, changeTable) => go(function* () {
  changeTable = changeTable || `${tableModel.table}_changes`;
  const columnsToUpdate = nonPrimaryColumnNames(tableModel);
  if (columnsToUpdate.length > 0) {
    const updateClause = columnsToUpdate.map(column => `${column} = c.${column}`).join(', ');
    yield client.query(`UPDATE ${tableModel.table} t SET ${updateClause} FROM ${changeTable} c WHERE c.txid = ${txid} AND ${columnsEqualClause('t', 'c', tableModel.primaryKey)}`);
  }
});

const applyChanges = (client, txid, tableModel, changeTable) => go(function* () {
  changeTable = changeTable || `${tableModel.table}_changes`;
  yield applyDeletes(client, txid, tableModel, changeTable);
  yield applyUpdates(client, txid, tableModel, changeTable);
  yield applyInserts(client, txid, tableModel, changeTable);
});

const getChangeTableSql = tableModel => {
  const selectFields = selectList(null, allColumnNames(tableModel));
  const selectKeyClause = selectList(null, tableModel.primaryKey);
  const changeTableName = `${tableModel.table}_changes`;
  return `
  DROP TABLE IF EXISTS ${changeTableName} CASCADE;
  CREATE TABLE ${changeTableName} AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, ${selectFields} FROM ${tableModel.table} WHERE false);
  CREATE INDEX ON ${changeTableName}(${selectKeyClause}, txid desc NULLS LAST, changeid desc NULLS LAST);
  CREATE INDEX ON ${changeTableName}(changeid) WHERE public;
  CREATE INDEX ON ${changeTableName}(txid) ;`
};

const createChangeTable = (client, tableModel) => go(function* () {
  yield client.query(getChangeTableSql(tableModel));
});

const initChangeTable = (client, txid, tableModel) => go(function* () {
  const columnList = selectList(null, allColumnNames(tableModel));
  const changeTableName = `${tableModel.table}_changes`;
  yield client.query(`INSERT INTO ${changeTableName}(txid, operation, ${columnList}) 
  (SELECT ${txid}, 'insert', ${columnList} FROM ${tableModel.table})`);
  yield client.query(`ANALYZE ${changeTableName}`);
  yield deriveColumnsForChange(client, txid, tableModel);
});

const clearHistory = (client, txid, tableModel) => go(function* () {
  const selectFields = selectList(null, allColumnNames(tableModel));
  const changeTableName = `${tableModel.table}_changes`;
  yield client.query(`DELETE FROM ${changeTableName}`);
  const sql = `INSERT INTO ${changeTableName}(txid, operation, public, ${selectFields}) 
  (SELECT ${txid}, 'insert', false, ${selectFields} FROM ${tableModel.table})`;
  yield client.query(sql);
});

const initializeChangeTable = (client, txid, tableModel) => {
  const selectFields = selectList(null, tableModel.columns.map(column => column.name));
  const changeTableName = `${tableModel.table}_changes`;
  return client.query(`INSERT INTO ${changeTableName}(txid, operation, public, ${selectFields}) 
  (SELECT ${txid}, 'insert', false, ${selectFields} FROM ${tableModel.table})`);
};

const initializeFromScratch = (client, txid, sourceTableOrView, tableModel, columns) => go(function* () {
  columns = columns || nonDerivedColumnNames(tableModel);
  const selectFields = selectList(null, columns);
  const changeTableName = `${tableModel.table}_changes`;
  const sql = `INSERT INTO ${changeTableName}(txid, operation, public, ${selectFields}) 
  (SELECT ${txid}, 'insert', false, ${selectFields} FROM ${sourceTableOrView})`;
  yield client.query(sql);
  yield client.query(`ANALYZE ${changeTableName}`);
  yield deriveColumnsForChange(client, txid, tableModel);
  yield applyChanges(client, txid, tableModel);
  yield client.query(`ANALYZE ${tableModel.table}`);
});

/**
 * Insert a single row into the change table. NOTE: does *not* derive columns
 * @param client
 * @param txid
 * @param tableModel
 * @param row
 */
const insert = (client, txid, tableModel, row) => go(function* () {
  const changeTableName = `${tableModel.table}_changes`;
  const columns = allColumnNames(tableModel);
  const params = [txid, ...columns.map(column => row[column] || null)];
  const nonDerivedParamExpr = columns.map((column, index) => `$${index + 2}`).join(',');
  yield client.query(`INSERT INTO ${changeTableName}(txid, operation, public, ${columns.join(', ')}) 
  (SELECT $1, 'insert', false, ${nonDerivedParamExpr})`, params);
});

/**
 * Insert a single update row into the change table. NOTE: does *not* derive columns
 * @param client
 * @param txid
 * @param tableModel
 * @param row
 */
const update = (client, txid, tableModel, row) => go(function* () {
  const changeTableName = `${tableModel.table}_changes`;
  const nonDerivedColumns = nonDerivedColumnNames(tableModel);
  const params = [txid, ...nonDerivedColumns.map(column => row[column] || null)];
  const nonDerivedParamExpr = nonDerivedColumns.map((column, index) => `$${index + 2}`).join(',');
  yield client.query(`INSERT INTO ${changeTableName}(txid, operation, public, ${nonDerivedColumns.join(', ')}) 
  (SELECT $1, 'update', false, ${nonDerivedParamExpr})`, params);
});

const del = (client, txid, tableModel, row) => go(function* () {
  const changeTableName = `${tableModel.table}_changes`;
  const nonDerivedColumns = nonDerivedColumnNames(tableModel);
  const params = [txid, ...nonDerivedColumns.map(column => row[column] || null)];
  const nonDerivedParamExpr = nonDerivedColumns.map((column, index) => `$${index + 2}`).join(',');
  yield client.query(`INSERT INTO ${changeTableName}(txid, operation, public, ${nonDerivedColumns.join(', ')}) 
  (SELECT $1, 'delete', false, ${nonDerivedParamExpr})`, params);
});

/**
 * Assign sequence number to multiple changes in correct order, respecting any foreign key relationships.
 * Tables must be provided in order, such that any table only references tables before it.
 * Assumes that foreign keys are immutable, such that order of updates does not matter.
 * @param client
 * @param txid
 * @param orderedTableModels
 */
const assignSequenceNumbersToDependentTables = (client, txid, orderedTableModels) => go(function*() {
  const reversedTableModels = orderedTableModels.slice().reverse();
  for(let tableModel of reversedTableModels) {
    yield assignSequenceNumbers(client, txid, tableModel, 'delete');
  }
  for(let tableModel of orderedTableModels) {
    yield assignSequenceNumbers(client, txid, tableModel, 'insert');
    yield assignSequenceNumbers(client, txid, tableModel, 'update');
  }
});

const countChanges = (client, txid, tableModel) => go(function*() {
  return   (yield client.queryRows(`select count(*)::integer as c from ${tableModel.table}_changes where txid = $1`, [txid]))[0].c;
});


module.exports = {
  computeInserts,
  computeInsertsSubset,
  computeUpdates,
  computeUpdatesSubset,
  computeDeletes,
  computeDeletesSubset,
  computeDifferencesView,
  computeDifferences,
  computeDifferencesSubset,
  applyInserts,
  applyUpdates,
  applyDeletes,
  applyChanges,
  createChangeTable,
  initChangeTable,
  initializeFromScratch,
  clearHistory,
  insert,
  update,
  del,
  getChangeTableSql,
  assignSequenceNumbersToDependentTables,
  initializeChangeTable,
  applyCurrentTableToChangeTable,
  countChanges
};
