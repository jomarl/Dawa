"use strict";

const namesAndKeys = require("./namesAndKeys");
const representationsMap = require('./representations');
const sqlModels = require('./sqlModels');
const resourcesUtil = require('../common/resourcesUtil');
const commonParameters = require('../common/commonParameters');
const registry = require('../registry');
const parametersMap = require('./parameters');
const oisApiModels = require('./oisApiModels');

for(let oisModelName of Object.keys(namesAndKeys)) {
  const nameAndKey = namesAndKeys[oisModelName];
  const representations = representationsMap[oisModelName];
  const sqlModel = sqlModels[oisModelName];
  const apiModel = oisApiModels[oisModelName];
  const queryParameters = Object.assign({}, {
    crs: commonParameters.crs,
    struktur: commonParameters.struktur,
    format: commonParameters.format,
    paging: commonParameters.paging
  }, {
    propertyFilter: parametersMap[oisModelName].propertyFilter
  });
  if(apiModel.geojson) {
    queryParameters.geomWithin =commonParameters.geomWithin;
    queryParameters.reverseGeocoding = commonParameters.reverseGeocodingOptional;
  }
  const queryResource = {
    path: '/ois/' + nameAndKey.plural,
    pathParameters: [],
    queryParameters: resourcesUtil.flattenParameters(queryParameters),
    representations: representations,
    sqlModel: sqlModel,
    singleResult: false,
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
    processParameters: resourcesUtil.applyDefaultPagingForQuery
  };

  registry.add(`ois_${oisModelName}`, 'resource', 'query', queryResource);
  const idParams = parametersMap[oisModelName].id;
  if(idParams.length === 1) {
    const getByKeyPath = `/ois/${nameAndKey.plural}/:id`;
    const getByKeyResource = {
      path: getByKeyPath,
      pathParameters: idParams,
      queryParameters: resourcesUtil.flattenParameters(
        Object.assign({},
          {format: commonParameters.format},
          {
            crs: commonParameters.crs,
            struktur: commonParameters.struktur
          })),
      representations: representations,
      sqlModel: sqlModel,
      singleResult: true,
      processParameters: () => null,
      chooseRepresentation: resourcesUtil.chooseRepresentationForQuery
    };

    registry.add(`ois_${oisModelName}`, 'resource', 'getByKey', getByKeyResource);
  }
}