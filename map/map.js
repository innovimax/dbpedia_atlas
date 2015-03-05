(function() {
  var C, CELL_RADIUS, GRID_HEIGHT, GRID_WIDTH, M, SIMPLIFICATION, SIZE, class_color, cos30, cursor, defs, dx, dy, map_layer, path_generator, sin30, svg, vis, zoom_layer, _get_hexagon;

  window.map = {};

  /* globals
  */

  svg = null;

  defs = null;

  zoom_layer = null;

  vis = null;

  map_layer = null;

  cursor = null;

  SIZE = 100;

  CELL_RADIUS = 0.02;

  sin30 = Math.sin(Math.PI / 6);

  cos30 = Math.cos(Math.PI / 6);

  map.init = function(dom_node) {
    var bcr, bluerect, u_px_ratio;
    svg = d3.select(dom_node);
    map.node = svg;
    svg.attr({
      viewBox: "" + (-SIZE / 2) + " " + (-SIZE / 2) + " " + SIZE + " " + SIZE
    });
    defs = svg.append('defs');
    /* init test
    */
    svg.append('rect').attr({
      x: -SIZE / 2,
      y: -SIZE / 2,
      width: SIZE,
      height: SIZE,
      stroke: 'red'
    });
    bcr = svg.node().getBoundingClientRect();
    u_px_ratio = SIZE / Math.min(bcr.width, bcr.height);
    bluerect = svg.append('rect').attr({
      x: -bcr.width / 2 * u_px_ratio,
      y: -bcr.height / 2 * u_px_ratio,
      width: bcr.width * u_px_ratio,
      height: bcr.height * u_px_ratio,
      stroke: 'blue'
    });
    d3.select(window).on('resize', function() {
      bcr = svg.node().getBoundingClientRect();
      u_px_ratio = SIZE / Math.min(bcr.width, bcr.height);
      return bluerect.attr({
        x: -bcr.width / 2 * u_px_ratio,
        y: -bcr.height / 2 * u_px_ratio,
        width: bcr.width * u_px_ratio,
        height: bcr.height * u_px_ratio,
        stroke: 'green'
      });
    });
    /* END init test
    */
    /* ZOOM and PAN
    */
    zoom_layer = svg.append('g');
    svg.call(d3.behavior.zoom().scaleExtent([0.01, 49]).on('zoom', function() {
      return zoom_layer.attr({
        transform: "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"
      });
    }));
    vis = zoom_layer.append('g').attr({
      transform: 'translate(26,-25) rotate(-60)'
    });
    map_layer = vis.append('g');
    /* cursor
    */
    cursor = vis.append('path').attr({
      "class": 'cursor',
      d: function(r) {
        return "M0," + CELL_RADIUS + " L" + (cos30 * CELL_RADIUS) + "," + (sin30 * CELL_RADIUS) + " L" + (cos30 * CELL_RADIUS) + "," + (-sin30 * CELL_RADIUS) + " L0," + (-CELL_RADIUS) + " L" + (-cos30 * CELL_RADIUS) + "," + (-sin30 * CELL_RADIUS) + " L" + (-cos30 * CELL_RADIUS) + "," + (sin30 * CELL_RADIUS) + " Z";
      }
    });
    return vis.on('click', function() {
      var h;
      if (d3.event.defaultPrevented) return;
      /* move the cursor
      */
      h = _get_hexagon(d3.mouse(this));
      cursor.attr({
        transform: "translate(" + (h[1] * (cos30 * CELL_RADIUS * 2) + (h[0] % 2 === 0 ? 0 : cos30 * CELL_RADIUS)) + "," + (h[0] * 3 / 2 * CELL_RADIUS) + ")"
      });
      return trigger(svg.node(), 'select', {
        i: h[0],
        j: h[1]
      });
    });
  };

  /* custom projection to make hexagons appear regular (y axis is also flipped)
  */

  dx = CELL_RADIUS * 2 * Math.sin(Math.PI / 3);

  dy = CELL_RADIUS * 1.5;

  SIMPLIFICATION = 100;

  path_generator = d3.geo.path().projection(d3.geo.transform({
    point: function(x, y, z) {
      /* Level of Detail
      */      if (z >= SIMPLIFICATION) {
        return this.stream.point(x * dx / 2, -(y - (2 - (y & 1)) / 3) * dy / 2);
      }
    }
  }));

  /* colors
  */

  class_color = {
    'Person': '#E14E5F',
    'Organisation': '#A87621',
    'Place': '#43943E',
    'Work': '#AC5CC4',
    'Species': '#2E99A0',
    'Event': '#2986EC',
    'Other': '#7E7F7E'
  };

  map.load = function(data) {
    /* presimplify the topology (compute the effective area (z) of each point)
    */    console.debug('Map - Presimplifying...');
    topojson.presimplify(data);
    console.debug('Map - ...done.');
    /* define the level zero region (the land)
    */
    defs.append('path').datum(topojson.mesh(data, data.objects.leaf_regions, function(a, b) {
      return a === b;
    })).attr('id', 'land').attr('d', path_generator);
    /* faux land glow (using filters takes too much resources)
    */
    map_layer.append('use').attr('class', 'land-glow-outer').attr('xlink:href', '#land');
    map_layer.append('use').attr('class', 'land-glow-inner').attr('xlink:href', '#land');
    /* actual land
    */
    /* draw all the leaf regions
    */
    map_layer.selectAll('.region').data(topojson.feature(data, data.objects.leaf_regions).features).enter().append('path').attr({
      "class": 'region',
      d: path_generator,
      fill: function(d) {
        if (d.properties['path'].length > 2 && d.properties['path'][2] in class_color) {
          return class_color[d.properties['path'][2]];
        } else if (d.properties['path'].length > 1 && d.properties['path'][1] in class_color) {
          return class_color[d.properties['path'][1]];
        } else {
          return class_color['Other'];
        }
      }
    });
    /* draw the leaf regions boundaries
    */
    map_layer.append('path').datum(topojson.mesh(data, data.objects.leaf_regions, function(a, b) {
      return a !== b;
    })).attr('d', path_generator).attr('class', 'boundary').style('stroke-width', '0.2px');
    return map_layer.append('path').datum(topojson.mesh(data, data.objects.leaf_regions, function(a, b) {
      return a.properties.path[1] !== b.properties.path[1];
    })).attr('d', path_generator).attr('class', 'boundary').style('stroke-width', '1px');
  };

  /* find a hex given SVG coordinates
  */

  GRID_HEIGHT = sin30 * CELL_RADIUS * 3;

  GRID_WIDTH = cos30 * CELL_RADIUS * 2;

  C = sin30 * CELL_RADIUS;

  M = C / (GRID_WIDTH / 2);

  _get_hexagon = function(point) {
    var column, relX, relY, row, rowIsOdd, x, y;
    x = point[0] + cos30 * CELL_RADIUS;
    y = point[1] + CELL_RADIUS;
    row = Math.floor(y / GRID_HEIGHT);
    rowIsOdd = row % 2 === 1;
    if (rowIsOdd) {
      column = Math.floor((x - GRID_WIDTH / 2) / GRID_WIDTH);
    } else {
      column = Math.floor(x / GRID_WIDTH);
    }
    relY = y - (row * GRID_HEIGHT);
    if (rowIsOdd) {
      relX = x - (column * GRID_WIDTH) - GRID_WIDTH / 2;
    } else {
      relX = x - (column * GRID_WIDTH);
    }
    /* work out if the point is above either of the hexagon's top edges
    */
    if (relY < (-M * relX) + C) {
      row -= 1;
      if (!rowIsOdd) column -= 1;
    } else if (relY < (M * relX) - C) {
      row -= 1;
      if (rowIsOdd) column += 1;
    }
    return [row, column];
  };

}).call(this);
