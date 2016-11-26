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

      // Get component of type.
      component(type) {
        const model = internal(this).model;
        const components = internal(model).components;
        if (components.has(type, this))
          return components.get(type, this);
        else
          return new Component(type, this);
      }

      // Return all attached components in an array.
      components() {
        const model = internal(this).model;
        const components = internal(model).components;
        return components.attached(this);
      }

      // Add this entity to the model.
      create() {
        const model = internal(this).model;
        internal(model).entities.add(this);
        return this;
      }

      // Remove this entity from the model.
      delete() {
        // Delete all attached components.
        this.components().forEach(c => c.delete());
        // Remove entity from the model.
        const model = internal(this).model;
        internal(model).entities.remove(this);
        return this;
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

    class Component extends Structure {

      constructor(type, entity) {
        super(type);
        internal(this).entity = entity;
      }

      // Add this component to the model.
      create() {
        const entity = internal(this).entity;
        entity.create(); // Make sure the entity exists.
        const model = entity.model();
        internal(model).components.add(this);
        return this;
      }

      // Remove this component from the model.
      delete() {
        const entity = internal(this).entity;
        const model = entity.model();
        internal(model).components.remove(this);
        return this;
      }

      // Return the entity this component is attached to.
      entity() {
        return internal(this).entity;
      }

      // Checks if this component exists.
      exists() {
        const entity = internal(this).entity;
        const model = entity.model();
        return internal(model).components.contains(this);
      }

    }

    // A database of component objects.
    class Components {

      constructor() {
        internal(this).entityToComponents = new Map();
        internal(this).typeToComponents = new Map();
      }

      // Add component to database.
      add(component) {
        if (!this.contains(component)) {
          const type = component.type();
          const entity = component.entity();
          if (this.has(type, entity))
            throw new Error(`Duplicate component: type=${type}, entity=${entity}`);
          const {entityToComponents, typeToComponents} = internal(this);
          if (!typeToComponents.has(type))
            typeToComponents.set(type, new Set());
          typeToComponents.get(type).add(component);
          if (!entityToComponents.has(entity))
            entityToComponents.set(entity, new Map());
          entityToComponents.get(entity).set(type, component);
        }
      }

      // Return all components attached to a specified entity.
      attached(entity) {
        const {entityToComponents} = internal(this);
        if (entityToComponents.has(entity))
          return Array.from(entityToComponents.get(entity).values());
        else
          return [];
      }

      // Check if database contains component.
      contains(component) {
        const type = component.type();
        const entity = component.entity();
        return this.has(type, entity) && this.get(type, entity) === component;
      }

      // Get the specified component.
      get(type, entity) {
        if (this.has(type, entity)) {
          const entityToComponents = internal(this).entityToComponents;
          return entityToComponents.get(entity).get(type);
        }
      }

      // Check if entity has a component of type.
      has(type, entity) {
        const entityToComponents = internal(this).entityToComponents;
        return entityToComponents.has(entity) &&
          entityToComponents.get(entity).has(type);
      }

      list(type) {
        const typeToComponents = internal(this).typeToComponents;
        if (typeToComponents.has(type))
          return Array.from(typeToComponents.get(type).values());
        else
          return [];
      }

      // Remove component from database.
      remove(component) {
        if (this.contains(component)) {
          const {entityToComponents, typeToComponents} = internal(this);
          const type = component.type();
          const entity = component.entity();
          typeToComponents.get(type).delete(component);
          if (typeToComponents.get(type).size === 0)
            typeToComponents.delete(type);
          entityToComponents.get(entity).delete(type);
          if (entityToComponents.get(entity).size === 0)
            entityToComponents.delete(entity);
        }
      }

    }

    class Model {

      constructor() {
        internal(this).components = new Components();
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
