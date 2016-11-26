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
        const model = internal(this).model;
        internal(model).entities.add(this);
        return this;
      }

      // Remove this entity from the model.
      delete() {
        const model = internal(this).model;
        internal(model).entities.remove(this);
      }

      // Checks if this entity currently exists in the model.
      exists() {
        const model = internal(this).model;
        return internal(model).entities.contains(this);
      }

      // Return a number that uniquely defines this entity in the model, or
      // undefined if the entity does not currently exist.
      id() {
        const model = internal(this).model;
        return internal(model).entities.id(this);
      }

      // Return the model this entity is associated with.
      model() {
        return internal(this).model;
      }

    }

    // A database of entity objects.
    class Entities {

      constructor() {
        internal(this).entityToID = new Map();
        internal(this).idToEntity = new Map();
        internal(this).nextID = 0;
      }

      // Add entity to the database.
      add(entity) {
        if (!this.contains(entity)) {
          const id = internal(this).nextID++;
          internal(this).entityToID.set(entity, id);
          internal(this).idToEntity.set(id, entity);
        }
      }

      // Checks if this database contains the specified entity.
      contains(entity) {
        const id = this.id(entity);
        return this.has(id) && this.get(id) === entity;
      }

      // Return the specified entity.
      get(id) {
        return internal(this).idToEntity.get(id);
      }

      // Checks if database has an entity assigned to the specified ID value.
      has(id) {
        return internal(this).idToEntity.has(id);
      }

      // Return the ID value assigned to the specified entity.
      id(entity) {
        return internal(this).entityToID.get(entity);
      }

      // Return an array of all the entities stored in this database.
      list() {
        return Array.from(internal(this).idToEntity.values());
      }

      // Remove entity from the database.
      remove(entity) {
        if (this.contains(entity)) {
          const id = this.id(entity);
          internal(this).entityToID.delete(entity);
          internal(this).idToEntity.delete(id);
        }
      }

    }

    class Structure {

      constructor(type) {
        internal(this).properties = new Map();
        internal(this).type = type;
      }

      // Get or set multiple property values.
      properties(properties) {
        if (arguments.length === 0) {
          // Return the existing properties.
          const properties = {};
          for (const key in internal(this).properties.keys())
            properties[key] = this.property(key);
          return properties;
        } else {
          // Set new property values.
          for (const key in properties) {
            const value = properties[key];
            this.property(key, value);
          }
          return this;
        }
      }

      // Get or set the value of a property.
      property(key, value) {
        if (arguments.length > 1) {
          if (value === undefined) {
            // Delete the property.
            internal(this).properties.delete(key);
          } else {
            // Set the property to a new value.
            internal(this).properties.set(key, value);
          }
          return this;
        } else {
          // Return the current value of the property.
          return internal(this).properties.get(key);
        }
      }

      type() {
        return internal(this).type;
      }

    }

    class Model {

      constructor() {
        internal(this).entities = new Entities();
      }

      // Return an array of entities matching the specified properties. If no
      // properties are given, return all entities in the model.
      entities(properties) {
        // TODO Filter entities by properties.
        return internal(this).entities.list();
      }

      // If an ID value is given return the corresponding entity. Otherwise
      // return a new entity that hasn't been added to the model yet.
      entity(id) {
        if (arguments.length === 0) {
          return new Entity(this);
        } else {
          return internal(this).entities.get(id);
        }
      }

    }

    return Model;
  })();

  // Public API.
  return {Model};
})();
