"use strict";

const assert = require('assert');
const dar10TableModels = require('./dar10TableModels');
const {formatHusnr} = require('../apiSpecification/husnrUtil');
const {kode4String} = require('../apiSpecification/util');
const { selectIsoDateUtc: selectIsoTimestampUtc} = require('../apiSpecification/common/sql/sqlUtil');


const defaultReplikeringType = {
  uuid: 'uuid',
  timestamptz: 'timestamp',
  integer: 'integer',
  smallint: 'integer',
  text: 'string',
  float4: 'real'
};

const replikeringTypeOverrides = {
  Husnummer: {
    husnummertekst: 'string'
  },
  Adressepunkt: {
    position: 'point2d'
  }
};

const replikeringBindingOverrides = {
  Adressepunkt: {
    position: {
      selectTransform: col => `ST_AsGeoJSON(${col})`,
      formatter: JSON.parse

    }
  },
  Husnummer: {
    husnummertekst: {
      formatter: formatHusnr
    }
  },
  DARKommuneinddeling: {
    kommunekode: {
      formatter: kode4String
    }
  }
};

const historyReplikeringModels = Object.entries(dar10TableModels.historyTableModels).reduce((memo, [entityName, tableModel]) => {
  const typeOverrides = replikeringTypeOverrides[entityName] || {};
  const rowkeyAttribute = {
    name: 'rowkey',
    type: 'integer',
    description: 'Unik ID for den angivne række. '
  }
  const virkningAttributes = [
    {
      name: 'virkningstart',
      type: 'timestamp',
      description: 'Startidspunktet for rækkens virkningstid.'
    },
    {
      name: 'virkningslut',
      type: 'timestamp',
      description: 'Sluttidspunktet for rækkens virkningstid. ',
      nullable: true
    }
  ];
  const otherAttributes = tableModel.columns.filter(col => !(['virkning', 'rowkey'].includes(col.name))).map(column => {
    const type = typeOverrides[column.name] ?
      typeOverrides[column.name] :
      defaultReplikeringType[column.sqlType];
    assert(type);
    return {
      name: column.name,
      type,
      description: 'Iikke tilgængelig',
      nullable: column.nullable
    };
  });
  const attributes = [rowkeyAttribute, ...virkningAttributes, ...otherAttributes];
  memo[entityName] = {
    key: ['rowkey'],
    attributes
  };
  return memo;
}, {});

const historyReplikeringBindings = Object.entries(dar10TableModels.historyTableModels).reduce((memo, [entityName, tableModel]) => {
  const table = tableModel.table;
  const virkningBindings = {
    virkningstart: {
      selectTransform: col => selectIsoTimestampUtc(`lower(virkning)`)
    },
    virkningslut: {
      selectTransform: col => selectIsoTimestampUtc('upper(virkning)')
    }
  };
  memo[entityName] = {
    table,
    attributes: Object.assign({}, virkningBindings, replikeringBindingOverrides[entityName] || {})
  };
  return memo;
}, {});

const currentReplikeringModels = Object.entries(dar10TableModels.currentTableModels).reduce((memo, [entityName, tableModel]) => {
  const typeOverrides = replikeringTypeOverrides[entityName] || {};
  const attributes = tableModel.columns.map(column => {
    const type = typeOverrides[column.name] ?
      typeOverrides[column.name] :
      defaultReplikeringType[column.sqlType];
    assert(type);
    return {
      name: column.name,
      type,
      description: 'Iikke tilgængelig',
      nullable: column.nullable
    };
  });
  memo[entityName] = {
    key: ['id'],
    attributes
  };
  return memo;
}, {});

const currentReplikeringBindings = Object.entries(dar10TableModels.currentTableModels).reduce((memo, [entityName, tableModel]) => {
  const table = tableModel.table;
  memo[entityName] = {
    table,
    attributes: replikeringBindingOverrides[entityName] || {}
  };
  return memo;
}, {});

module.exports = {
  historyReplikeringModels,
  historyReplikeringBindings,
  currentReplikeringModels,
  currentReplikeringBindings
};