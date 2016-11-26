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

    class Entity {

      constructor(model) {
        internal(this).model = model;
      }

      // Add this entity to the model.
      create() {
        // TODO
        return this;
      }

      // Remove this entity from the model.
      delete() {
        // TODO
        return this;
      }

      // Checks if this entity currently exists in the model.
      exists() {
        // TODO
      }

      // Return a number that uniquely defines this entity in the model, or
      // undefined if the entity does not currently exist.
      id() {
        // TODO
      }

      // Return the model this entity is associated with.
      model() {
        return internal(this).model;
      }

    }

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
