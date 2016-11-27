/* jshint esversion: 6 */
/* jshint quotmark: double */

var eko = (function() {
  "use strict";

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

      get(type, name) {
        if (!this.has(type, name))
          throw new Error(`Asset not found: type=${type}, name=${name}`);
        const {typeToAssets} = internal(this);
        return typeToAssets.get(type).get(name);
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

      name(asset) {
        return internal(this).assetToName.get(asset);
      }

      set(type, name, asset) {
        const {assetToName, assetToType, typeToAssets} = internal(this);
        assetToName.set(asset, name);
        assetToType.set(asset, type);
        if (!typeToAssets.has(type))
          typeToAssets.set(type, new Map());
        typeToAssets.get(type).set(name, asset);
      }

      type(asset) {
        return internal(this).assetToType.get(asset);
      }

    }

    return new Assets();
  })();

  const model = (function() {

    class Entity {

      constructor(model) {
        internal(this).model = model;
      }

      call(name) {
        return assets.get("method", name).apply(this,
          Array.prototype.slice.call(arguments, 1)
        );
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
        // Delete all incident connections.
        this.connections().forEach(c => c.delete());
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

      toString() {
        return `(${this.id()})`;
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
            case "both":
              // Do nothing.
              break;
            case "incoming":
              matching = matching.filter(c => c.target() === entity);
              break;
            case "outgoing":
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

      call(name) {
        return assets.get("method", name).apply(this,
          Array.prototype.slice.call(arguments, 1)
        );
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
      // return a new entity that hasn"t been added to the model yet.
      entity(id) {
        if (arguments.length === 0) {
          return new Entity(this);
        } else {
          return internal(this).entities.get(id);
        }
      }

      // Delete everything in the model.
      reset() {
        this.entities().forEach(e => e.delete());
      }

    }

    return new Model();
  })();

  // Engine module.
  (function() {

    // Start engine when document is ready.
    $(document).ready(function ready() {
      start();
    });

    // Hide the context menu if the user clicks on anything that isn't a link.
    $(document).on("click", function(event) {
      if (!$(event.target).is("a"))
        hideContextMenu();
    });

    function $describe(entity) {
      const perspective = model.entities({perspective: {}})[0];
      const description = perspective.call("describe", entity);
      if (entity.matches({structure: {}})) {
        return $entity(entity).html(description);
      } else {
        return $("<span>").html(description);
      }
    }

    // If the perspective character can perform actions on the entity return
    // a link to the entity that shows the context menu when clicked.
    // If there are no actions available return an empty element.
    function $entity(entity) {
      const perspective = model.entities({perspective: {}})[0];
      if (perspective.call("get_options", entity).length > 0)
        return $("<a>").attr("entity", entity.id())
          .on("click", showContextMenu.bind(this));
      else
        return $("<span>");
    }

    function $option(option) {
      const $option = $("<a>").html(option.text);
      $option.on("click", function() {
        console.log("option selected: " + option.text);
        option.select();
        update();
      }.bind(this));
      return $option;
    }

    function $title(entity) {
      const perspective = model.entities({perspective: {}})[0];
      const title = perspective === entity ?
        "Inventory" :
        entity.component("structure").property("title");
      return $("<h1>").append($entity(entity).html(title));
    }

    function hideContextMenu() {
      $("#context-menu").hide();
    }

    function render() {
      console.log("render");

      const perspective = model.entities({perspective: {}})[0];
      const focus = perspective.call("get_focus");

      const $eko = $("#eko");

      const $header = $("<div>", {class: "header-menu"});
      const $menu = $("<ul>");
      for (const option of perspective.call("get_options")) {
        $menu.append($("<li>").append($option(option)));
      }
      $header.append($menu);

      const $perspective = $("<div>");

      // Add title.
      $perspective.append($title(focus));

      // Describe contents.
      for (const contains of focus.connections("outgoing", "contains")) {
        const subject = contains.target();
        if (subject !== perspective)
          $perspective.append($("<p>").append($describe(subject)));
      }

      const $context = $("<ul>", {id: "context-menu"});

      $eko.empty().append($header).append($perspective).append($context);
    }

    function showContextMenu(event) {
      const id = Number($(event.target).attr("entity"));
      const target = model.entity(id);

      const perspective = model.entities({perspective: {}})[0];
      const options = perspective.call("get_options", target);

      const $context = $("#context-menu");

      // Add the options.
      $context.empty();
      for (const option of options)
        $context.append($("<li>").append($option(option)));

      // Show the context menu.
      $context.css({
        position: "absolute",
        left: event.clientX,
        top: event.clientY
      }).show();
    }

    function start() {
      console.log("start");
      model.reset();
      for (const initial of assets.list("initial"))
        initial(model);
      render();
    }

    // This method is called after the user selects an option.
    function update() {
      const isComplete = function(action) {
        const {action: {name, progress}} = action.properties();
        const duration = eko.get("action", name).duration;
        return progress >= duration;
      };
      const complete = function(action) {
        const name = action.component("action").property("name");
        const agent = action.connections("incoming", "performing")[0].
          source();
        const target = action.call("get_target");
        const using = action.call("get_using");
        action.delete();
        eko.get("action", name).complete(agent, target, using);
      };

      console.log("update");
      const perspective = model.call("get_perspective");
      const action = perspective.connections("outgoing", "performing")[0]
        .target();
      if (isComplete(action))
        complete(action);
      else {

        while (model.call("get_perspective").call("get_action").exists()) {
          console.log("time step");

          for (const action of model.entities({action: {}})) {
            // Increment action progress.
            const {action: {progress}} = action.properties();
            action.properties({action: {progress: progress + 1}});
            // Check for completion.
            if (isComplete(action))
              complete(action);
          }

        }

      }

      render();
    }

  })();

  // Public API.
  return {
    get: function(type, name) {
      return assets.get(type, name);
    },
    list: function(type) {
      return assets.list(type);
    },
    name: function(asset) {
      return assets.name(asset);
    },
    set: function(type, name, asset) {
      assets.set(type, name, asset);
    }
  };
})();

// Notes:
// - Volume is measured in litres.

eko.set("action", "drop_item", {
  duration: 3,
  complete(agent, target, using) {
    target.call("set_location", agent.call("get_location"));
  },
  matches(agent, target, using) {
    return agent.matches({character: {}}) &&
      target !== undefined &&
      target.matches({item: {}}) &&
      target.call("get_location") === agent &&
      using === undefined;
  },
  name(agent, target, using) {
    return "drop";
  }
});
eko.set("action", "inventory", {
  duration: 0,
  complete(agent, target, using) {
    agent.call("set_focus", agent);
  },
  matches(agent, target, using) {
    return agent.matches({perspective: {}}) &&
      agent.call("get_focus") !== agent &&
      target === undefined &&
      using === undefined;
  },
  name(agent, target, using) {
    return "inventory";
  }
});
eko.set("action", "look_at", {
  duration: 0,
  complete(agent, target, using) {
    agent.call("set_focus", target);
  },
  matches(agent, target, using) {
    return agent.matches({perspective: {}}) &&
      agent.call("get_focus") !== target &&
      target !== undefined &&
      target.matches({structure: {}}) &&
      using === undefined;
  },
  name(agent, target, using) {
    return "look at";
  }
});
eko.set("action", "place_item", {
  duration: 3,
  complete(agent, target, using) {
    using.call("set_location", target);
  },
  matches(agent, target, using) {
    return agent.matches({character: {}}) &&
      target !== undefined &&
      target.matches({surface: {}}) &&
      using !== undefined &&
      using.matches({item: {}});
  },
  name(agent, target, using) {
    const {structure: {name}} = using.properties();
    return `place ${name}`;
  }
});
eko.set("action", "pour_liquid", {
  duration: 0,
  complete(agent, target, using) {
    const liquid = using.call("get_contents")[0];
    const liquidVolume = liquid.component("liquid").property("volume");
    const {liquid: {template}} = liquid.properties();
    const container = target;
    const containerVolume = container.component("container").property("volume");
    const poured = target.call("create_template", template);
    if (containerVolume >= liquidVolume) {
      liquid.delete();
      poured.properties({liquid: {volume: liquidVolume}});
    } else {
      liquid.properties({liquid: {volume: liquidVolume - containerVolume}});
      poured.properties({liquid: {volume: containerVolume}});
    }
  },
  matches(agent, target, using) {
    return agent.matches({perspective: {}}) &&
      agent.matches({character: {}}) &&
      target !== undefined &&
      target.matches({container: {}}) &&
      target.call("get_contents").length === 0 &&
      target !== using &&
      using !== undefined &&
      using.matches({container: {}}) &&
      using.call("get_contents").length !== 0;
  },
  name(agent, target, using) {
    const liquid = using.call("get_contents")[0];
    const {structure: {name}} = liquid.properties();
    return "pour " + name;
  }
});
eko.set("action", "surroundings", {
  duration: 0,
  complete(agent, target, using) {
    agent.call("clear_focus");
  },
  matches(agent, target, using) {
    return agent.matches({perspective: {}}) &&
      agent.connections("outgoing", "focused_on").length !== 0 &&
      target === undefined &&
      using === undefined;
  },
  name(agent, target, using) {
    return "surroundings";
  }
});
eko.set("action", "take_item", {
  duration: 3,
  complete(agent, target, using) {
    target.call("set_location", agent);
  },
  matches(agent, target, using) {
    return agent.matches({character: {}}) &&
      target !== undefined &&
      target.matches({item: {}}) &&
      !target.call("get_location").matches({character: {}}) &&
      using === undefined;
  },
  name(agent, target, using) {
    return "take";
  }
});

eko.set("description", "breadfruit", {
  describe(observer, subject) {
    return `Breadfruit.`;
  },
  matches(observer, subject) {
    return subject.matches({structure: {title: "Breadfruit"}});
  }
});
eko.set("description", "breadfruit_tree", {
  describe(observer, subject) {
    return `A breadfruit tree.`;
  },
  matches(observer, subject) {
    return subject.matches({structure: {title: "Breadfruit Tree"}});
  }
});
eko.set("description", "empty_brass_cup", {
  describe(observer, subject) {
    return `An empty brass cup.`;
  },
  matches(observer, subject) {
    return subject.matches({structure: {title: "Brass Cup"}}) &&
      subject.call("get_contents").length === 0;
  }
});
eko.set("description", "filled_brass_cup", {
  describe(observer, subject) {
    const {structure: {name}} = subject.call("get_contents")[0].properties();
    return `A brass cup filled with ${name}.`;
  },
  matches(observer, subject) {
    return subject.matches({structure: {title: "Brass Cup"}}) &&
      subject.call("get_contents").length > 0;
  }
});
eko.set("description", "mudbrick_walls", {
  describe(observer, subject) {
    return `Mudbrick walls.`;
  },
  matches(observer, subject) {
    return subject.matches({structure: {title: "Mudbrick Walls"}}) &&
      subject.call("get_location").matches({structure: {title: "Courtyard"}});
  },
});
eko.set("description", "painted_calabash", {
  describe(observer, subject) {
    return `A painted calabash.`;
  },
  matches(observer, subject) {
    return subject.matches({structure: {title: "Painted Calabash"}});
  }
});
eko.set("description", "palm_wine_in_container", {
  describe(observer, subject) {
    const {structure: {name}} = subject.call("get_location").properties();
    return `The ${name} is filled with palm wine.`;
  },
  matches(observer, subject) {
    return subject.matches({structure: {title: "Palm Wine"}}) &&
      subject.call("get_location").matches({container: {}});
  }
});
eko.set("description", "wooden_bench", {
  matches(observer, subject) {
    return subject.matches({structure: {title: "Wooden Bench"}});
  },
  describe(observer, subject) {
    return `A wooden bench.`;
  }
});

eko.set("initial", "create_world",
  function(model) {
    const courtyard = model.call("create_template", "courtyard");
    const perspective = model.entity().create().properties({
      character: {},
      perspective: {},
      structure: {name: "perspective", title: "Perspective"}
    });
    perspective.call("set_location", courtyard);
  });

eko.set("method", "clear_focus", function() {
  this.connections("outgoing", "focused_on").forEach(c => c.delete());
});
eko.set("method", "create_template", function(name) {
  if (this.entity) {
    // Called on model.
    const entity = this.entity().create();
    eko.get("template", name)(entity);
    return entity;
  } else {
    // Called on entity.
    const entity = this.model().entity().create();
    eko.get("template", name)(entity);
    entity.call("set_location", this);
    return entity;
  }
});
eko.set("method", "describe", function(subject) {
  const matching = [];
  for (const description of eko.list("description"))
    if (description.matches(this, subject))
      matching.push(description);
  if (matching.length === 0)
    return subject.toString();
  const selected = matching[Math.floor(matching.length * Math.random())];
  return selected.describe(this, subject);
});
eko.set("method", "get_action", function() {
  const connections = this.connections("outgoing", "performing");
  if (connections.length > 0)
    return connections[0].target();
  else
    return this.model().entity(); // Return non-existent entity.
});
eko.set("method", "get_contents", function() {
  const contents = [];
  for (const connection of this.connections("outgoing", "contains"))
    contents.push(connection.target());
  return contents;
});
eko.set("method", "get_focus", function() {
  const connections = this.connections("outgoing", "focused_on");
  if (connections.length > 0)
    return connections[0].target();
  const location = this.call("get_location");
  if (location !== undefined)
    return location;
  return this;
});
eko.set("method", "get_location", function() {
  const connections = this.connections("incoming", "contains");
  return connections.length === 0 ? undefined : connections[0].source();
});
eko.set("method", "get_options", function(target) {

  const option = function(action, agent, target, using) {
    return {
      select: function() {
        const a = agent.model().entity().create();
        a.properties({action: {name: eko.name(action), progress: 0}});
        agent.connection("performing", a).create();
        if (target !== undefined)
          a.connection("targeting", target).create();
        if (using !== undefined)
          a.connection("using", using).create();
      },
      text: action.name(agent, target, using)
    };
  };

  const options = [];

  for (const action of eko.list("action")) {
    if (action.matches(this, target))
      options.push(option(action, this, target));
    else {
      for (const using of this.call("get_contents"))
        if (action.matches(this, target, using))
          options.push(option(action, this, target, using));
    }
  }

  return options;
});
eko.set("method", "get_perspective", function() {
  return this.entities({perspective: {}})[0];
});
eko.set("method", "get_target", function() {
  const connections = this.connections("outgoing", "targeting");
  if (connections.length > 0)
    return connections[0].target();
});
eko.set("method", "get_using", function() {
  const connections = this.connections("outgoing", "using");
  if (connections.length > 0)
    return connections[0].target();
});
eko.set("method", "set_focus", function(focus) {
  this.call("clear_focus");
  this.connection("focused_on", focus).create();
});
eko.set("method", "set_location", function(location) {
  this.connections("incoming", "contains").forEach(c => c.delete());
  location.connection("contains", this).create();
});

eko.set("template", "brass_cup", function(entity) {
  entity.properties({
    container: {volume: 0.2},
    item: {},
    structure: {name: "cup", title: "Brass Cup"}
  });
});
eko.set("template", "breadfruit", function(entity) {
  entity.properties({
    item: {},
    structure: {name: "breadfruit", title: "Breadfruit"}
  });
});
eko.set("template", "breadfruit_tree", function(entity) {
  entity.properties({
    structure: {name: "tree", title: "Breadfruit Tree"}
  });
  entity.call("create_template", "breadfruit");
});
eko.set("template", "courtyard", function(entity) {
  entity.properties({
    area: {},
    structure: {name: "courtyard", title: "Courtyard"}
  });
  entity.call("create_template", "breadfruit_tree");
  const bench = entity.call("create_template", "wooden_bench");
  bench.call("create_template", "brass_cup");
  bench.call("create_template", "painted_calabash")
    .call("create_template", "palm_wine");
  entity.call("create_template", "mudbrick_walls");
});
eko.set("template", "mudbrick_walls", function(entity) {
  entity.properties({
    structure: {name: "walls", title: "Mudbrick Walls"}
  });
});
eko.set("template", "painted_calabash", function(entity) {
  entity.properties({
    container: {volume: 1},
    item: {},
    structure: {name: "calabash", title: "Painted Calabash"}
  });
});
eko.set("template", "palm_wine", function(entity) {
  entity.properties({
    liquid: {template: "palm_wine", volume: 1},
    structure: {name: "palm wine", title: "Palm Wine"}
  });
});
eko.set("template", "wooden_bench", function(entity) {
  entity.properties({
    surface: {},
    structure: {name: "bench", title: "Wooden Bench"}
  });
});
