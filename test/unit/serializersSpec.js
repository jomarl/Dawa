"use strict";

var serializers = require('../../apiSpecification/common/serializers');
var eventStream = require('event-stream');
var pipeline = require('../../pipeline');

describe('serializers', function() {
  describe('JSON serialization', function() {
    var sampleObject = {
      foo: 'bar',
      baz: 2
    };
    var representation = {};
    it('Can serialize a single object to pretty printed JSON', function(done) {
      var serializeFn = serializers.createSingleObjectSerializer('json', null, true, representation);
      serializeFn(sampleObject, function(err, response) {
        expect(JSON.parse(response.body)).toEqual(sampleObject);
        expect(response.body.indexOf(' ')).toBeGreaterThan(-1);
        done();
      });
    });
    it('Can serialize a single object to non-pretty-printed JSON', function(done) {
      var serializeFn = serializers.createSingleObjectSerializer('json', null, false, representation);
      serializeFn(sampleObject, function(err, response) {
        expect(JSON.parse(response.body)).toEqual(sampleObject);
        expect(response.body.indexOf(' ')).toBe(-1);
        done();
      });
    });

    function serializeStream(objectArray, formatParam, callbackParam, sridParam, prettyPrint, representation, callback) {
      var serializeFn = serializers.createStreamSerializer(formatParam, callbackParam, sridParam, prettyPrint, representation);
      var stream = eventStream.readArray(objectArray);
      var pipe = pipeline(stream);
      serializeFn(pipe, function(err, response) {
        response.bodyPipe.toArray(function(err, result) {
          callback(null, result.join(''));
        });
      });
    }

    it('Can serialize a stream of objects to pretty printed JSON', function(done) {
      var sampleData = [sampleObject, sampleObject];
      serializeStream(sampleData, 'json',null, null,true, representation, function(err, stringResult) {
        expect(JSON.parse(stringResult)).toEqual(sampleData);
        expect(stringResult.indexOf(' ')).toBeGreaterThan(-1);
        done();
      });
    });

    it('Can serialize a stream of objects to non pretty printed JSON', function(done) {
      var sampleData = [sampleObject, sampleObject];
      serializeStream(sampleData, 'json',null, null, false, representation, function(err, stringResult) {
        expect(JSON.parse(stringResult)).toEqual(sampleData);
        expect(stringResult.indexOf(' ')).toBe(-1);
        done();
      });
    });
  });
});