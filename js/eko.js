/* jshint esversion: 6 */

var eko = (function() {
  'use strict';

  // Private variables.
  const internal = (function() {
    const namespaces = new WeakMap();
    return function internal(instance) {
      if (!namespaces.has(instance))
        namespaces.set(instance, {});
      return namespaces.get(instance);
    };
  })();

  const Model = (function() {

    class Model {

      constructor() {
      }

      // Return an array of entities matching the specified properties. If no
      // properties are given, return all entities in the model.
      entities(properties) {
        // TODO
      }

      // If an ID value is given return the corresponding entity. Otherwise
      // return a new entity that hasn't been added to the model yet.
      entity(id) {
        // TODO
      }

    }

    return Model;
  });

  console.log(new Model());

  // Public API.
  return {};
})();
