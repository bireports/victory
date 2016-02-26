import compact from "lodash/array/compact";
import flatten from "lodash/array/flatten";
import findIndex from "lodash/array/findIndex";
import has from "lodash/object/has";
import defaults from "lodash/object/defaults";
import assign from "lodash/object/assign";
import uniq from "lodash/array/uniq";
import zipObject from "lodash/array/zipObject";
import { Helpers, Style } from "victory-core";
import Scale from "./scale";

export default {
  // String Data
  createStringMap(props, axis, hasMultipleDatasets = false) {
    const stringsFromAxes = this.getStringsFromAxes(props, axis);
    const stringsFromCategories = this.getStringsFromCategories(props, axis);
    const stringsFromData = hasMultipleDatasets ?
        uniq(flatten(props.data.map((dataset) => {
          return Helpers.getStringsFromData(defaults({}, {data: dataset}, props), axis);
        })))
        : this.getStringsFromData(props, axis);

    const allStrings = uniq(compact(
      [...stringsFromAxes, ...stringsFromCategories, ...stringsFromData]
    ));
    return allStrings.length === 0 ? null :
      zipObject(allStrings.map((string, index) => [string, index + 1]));
  },

  getStringsFromAxes(props, axis) {
    if (!props.tickValues || (!Array.isArray(props.tickValues) && !props.tickValues[axis])) {
      return [];
    }
    const tickValueArray = props.tickValues[axis] || props.tickValues;
    return tickValueArray.filter((val) => typeof val === "string");
  },

  getStringsFromCategories(props, axis) {
    // TODO generalize for independent vertical axes
    if (!props.categories || axis !== "x") {
      return [];
    } else {
      const categoryArray = flatten(props.categories);
      return categoryArray.filter((val) => typeof val === "string");
    }
  },

  getStringsFromData(props, axis) {
    if (!props.data) {
      return [];
    }
    const accessor = Helpers.createAccessor(has(props, axis) ? props[axis] : axis);
    const dataStrings = (props.data)
        .map((datum) => accessor(datum))
        .filter((datum) => typeof datum === "string");
    // return a unique set of strings
    return compact(uniq(dataStrings));
  },

  // for components that take single datasets
  getData(props) {
    if (props.data) {
      return this.formatData(props.data, props);
    }
    const data = this.generateData(props);
    return this.formatData(data, props);
  },

  generateData(props) {
    // create an array of values evenly spaced across the x domain that include domain min/max
    const domain = props.domain ? (props.domain.x || props.domain) :
      Scale.getBaseScale(props, "x").domain();
    const samples = props.samples || 1;
    const max = Math.max(...domain);
    const values = Array(...Array(samples)).map((val, index) => {
      const v = (max / samples) * index + Math.min(...domain);
      return { x: v, y: v };
    });
    return values[samples - 1].x === max ? values : values.concat([{ x: max, y: max }]);
  },

  formatData(dataset, props, stringMap) {
    if (!dataset) {
      return [];
    }
    stringMap = stringMap || {
      x: this.createStringMap(props, "x"),
      y: this.createStringMap(props, "y")
    };
    const accessor = {
      x: Helpers.createAccessor(props.x),
      y: Helpers.createAccessor(props.y)
    };
    return this.cleanData(dataset, props).map((datum) => {
      const x = accessor.x(datum);
      const y = accessor.y(datum);
      const category = this.determineCategoryIndex(x, props.categories);
      return assign(
          {},
          datum,
          { x, y },
          typeof category !== "undefined" ? { category } : {},
          // map string data to numeric values, and add names
          typeof x === "string" ? { x: stringMap.x[x], xName: x } : {},
          typeof y === "string" ? { y: stringMap.y[y], yName: y } : {}
        );
    });
  },

  // For components that take multiple datasets
  //
  // NOTE: This code is in the hot path.  Future optimizations may be possible by
  // reducing the frequency and number of data transformations that occur here.
  formatDatasets(props, hasMultipleDatasets) {
    // string map must be calculated using all datasets and shared
    const stringMap = {
      x: this.createStringMap(props, "x", hasMultipleDatasets),
      y: this.createStringMap(props, "y", hasMultipleDatasets)
    };

    const _format = (dataset, index) => ({
      attrs: this.getAttributes(props, index),
      data: this.formatData(dataset, props, stringMap)
    });

    return hasMultipleDatasets ? props.data.map(_format) : [_format(props.data, 0)];
  },

  cleanData(dataset, props) {
    // Some scale types break when certain data is supplies. This method will
    // remove data points that break scales. So far this method only removes
    // zeroes for log scales
    // TODO other cases?
    const scaleType = {
      x: Scale.getScaleType(props, "x"),
      y: Scale.getScaleType(props, "y")
    };
    const accessor = {
      x: Helpers.createAccessor(props.x),
      y: Helpers.createAccessor(props.y)
    };
    if (scaleType.x !== "log" && scaleType.y !== "log") {
      return dataset;
    }
    const rules = (datum, axis) => {
      return scaleType[axis] === "log" ? accessor[axis](datum) !== 0 : true;
    };
    return dataset.filter((datum) => {
      return rules(datum, "x") && rules(datum, "y");
    });
  },

  determineCategoryIndex(x, categories) {
    // if categories don't exist or are not given as an array of arrays, return undefined;
    if (!categories || !Array.isArray(categories[0])) {
      return undefined;
    }
    // determine which range band this x value belongs to, and return the index of that range band.
    return findIndex(categories, (category) => {
      return (x >= Math.min(...category) && x <= Math.max(...category));
    });
  },

  getAttributes(props, index) {
    let attributes = props.dataAttributes && props.dataAttributes[index] ?
      props.dataAttributes[index] : props.dataAttributes;
    if (attributes) {
      attributes.fill = attributes.fill || this.getColor(props, index);
    } else {
      attributes = {fill: this.getColor(props, index)};
    }
    const requiredAttributes = {
      name: attributes && attributes.name ? attributes.name : `data-${index}`
    };
    return defaults(requiredAttributes, attributes);
  },

  getColor(props, index) {
    // check for styles first
    if (props.style && props.style.data && props.style.data.fill) {
      return props.style.data.fill;
    }
    const colorScale = Array.isArray(props.colorScale) ?
      props.colorScale : Style.getColorScale(props.colorScale);
    return colorScale[index % colorScale.length];
  }
};
