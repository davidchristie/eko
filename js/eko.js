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

  const assets = (function() {

    class Assets {

      constructor() {
        internal(this).assetToName = new Map();
        internal(this).assetToType = new Map();
        internal(this).typeToAssets = new Map();
      }

      add(type, name, asset) {
        const {assetToName, assetToType, typeToAssets} = internal(this);
        assetToName.set(asset, name);
        assetToType.set(asset, type);
        if (!typeToAssets.has(type))
          typeToAssets.set(type, new Map());
        typeToAssets.get(type).set(name, asset);
      }

      get(type, name) {
        if (this.has(type, name)) {
          const {typeToAssets} = internal(this);
          return typeToAssets.get(type).get(name);
        }
      }

      has(type, name) {
        const {typeToAssets} = internal(this);
        return typeToAssets.has(type) && typeToAssets.get(type).has(name);
      }

      list(type) {
        const {typeToAssets} = internal(this);
        if (typeToAssets.has(type))
          return Array.from(typeToAssets.get(type).values());
        else
          return [];
      }

    }

    return new Assets();
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

      // Get connection.
      connection(type, target) {
        const model = internal(this).model;
        const connections = internal(model).connections;
        if (connections.has(type, this, target))
          return connections.get(type, this, target);
        else
          return new Connection(type, this, target);
      }

      // Get the matching connections in an array.
      connections(direction, type) {
        const model = internal(this).model;
        const connections = internal(model).connections;
        return connections.list(this, direction, type);
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

      // Check if this entity has the specified property values.
      matches(properties) {
        for (const type in properties) {
          const component = this.component(type);
          if (!component.exists())
            return false;
          for (const key in properties[type]) {
            const value = properties[type][key];
            if (component.property(key) !== value)
              return false;
          }
        }
        return true;
      }

      // Return the model this entity is associated with.
      model() {
        return internal(this).model;
      }

      // Get or set multiple property values.
      properties(properties) {
        if (arguments.length === 0) {
          // Return existing component properties.
          const properties = {};
          for (const component of this.components())
            properties[component.type()] = component.properties();
          return properties;
        } else {
          // Set component properties.
          for (const type in properties) {
            const component = this.component(type).create();
            component.properties(properties[type]);
          }
          return this;
        }
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
          for (const key of internal(this).properties.keys())
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

    class Connection extends Structure {

      constructor(type, source, target) {
        super(type);
        internal(this).source = source;
        internal(this).target = target;
      }

      // Add connection to the model.
      create() {
        const source = internal(this).source;
        const target = internal(this).target;
        // Make sure source and target both exist.
        source.create();
        target.create();
        // Add connection to the model.
        const model = internal(source).model;
        internal(model).connections.add(this);
      }

      // Remove connection from the model.
      delete() {
        const source = internal(this).source;
        const model = internal(source).model;
        internal(model).connections.remove(this);
      }

      // Checks if this connection exists.
      exists() {
        const source = internal(this).source;
        const model = internal(source).model;
        return internal(model).connections.contains(this);
      }

      // The entity this connection starts at.
      source() {
        return internal(this).source;
      }

      // The entity this connection ends at.
      target() {
        return internal(this).target;
      }

    }

    class Connections {

      constructor() {
        internal(this).entityToConnections = new Map();
        internal(this).keyToConnection = new Map();
      }

      add(connection) {
        if (!this.contains(connection)) {
          const type = connection.type();
          const source = connection.source();
          const target = connection.target();
          if (this.has(type, source, target))
            throw new Error(`Duplicate connection: type=${type}, source=${source}, target=${target}`);
          const {entityToConnections, keyToConnection} = internal(this);
          const key = Connections.key(type, source, target);
          if (!entityToConnections.has(source))
            entityToConnections.set(source, new Set());
          entityToConnections.get(source).add(connection);
          if (!entityToConnections.has(target))
            entityToConnections.set(target, new Set());
          entityToConnections.get(target).add(connection);
          keyToConnection.set(key, connection);
        }
      }

      contains(connection) {
        const type = connection.type();
        const source = connection.source();
        const target = connection.target();
        return this.has(type, source, target) &&
          this.get(type, source, target) === connection;
      }

      get(type, source, target) {
        const {keyToConnection} = internal(this);
        const key = Connections.key(type, source, target);
        return keyToConnection.get(key);
      }

      has(type, source, target) {
        const {keyToConnection} = internal(this);
        const key = Connections.key(type, source, target);
        return keyToConnection.has(key);
      }

      static key(type, source, target) {
        return `${type}:${source.id()}:${target.id()}`;
      }

      list(entity, direction, type) {
        const {entityToConnections} = internal(this);
        var matching = entityToConnections.has(entity) ?
          Array.from(entityToConnections.get(entity).values()) :
          [];
        if (direction !== undefined) {
          switch (direction) {
            case 'both':
              // Do nothing.
              break;
            case 'incoming':
              matching = matching.filter(c => c.target() === entity);
              break;
            case 'outgoing':
              matching = matching.filter(c => c.source() === entity);
              break;
            default:
              throw new Error(`Invalid direction: ${direction}`);
          }
        }
        if (type !== undefined)
          matching = matching.filter(c => c.type() === type);
        return matching;
      }

      remove(connection) {
        if (this.contains(connection)) {
          const type = connection.type();
          const source = connection.source();
          const target = connection.target();
          const key = Connections.key(type, source, target);
          const {entityToConnections, keyToConnection} = internal(this);
          entityToConnections.get(source).delete(connection);
          if (entityToConnections.get(source).size === 0)
            entityToConnections.delete(source);
          entityToConnections.get(target).delete(connection);
          if (entityToConnections.get(target).size === 0)
            entityToConnections.delete(target);
          keyToConnection.delete(key);
        }
      }

    }

    class Model {

      constructor() {
        internal(this).components = new Components();
        internal(this).connections = new Connections();
        internal(this).entities = new Entities();
      }

      // Return an array of entities matching the specified properties. If no
      // properties are given, return all entities in the model.
      entities(properties) {
        var entities = internal(this).entities.list();
        if (arguments.length > 0)
          entities = entities.filter(e => e.matches(properties));
        return entities;
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
  return {
    add: function(type, name, asset) {
      assets.add(type, name, asset);
    }
  };
})();
