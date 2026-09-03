// @ts-nocheck
/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. *
 */
/**
 * jquery.balancetext.js
 *
 * Author: Randy Edmunds
 */

/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global jQuery, $ */

/*
 * Copyright (c) 2007-2009 unscriptable.com and John M. Hann
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the “Software”), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * Except as contained in this notice, the name(s) of the above
 * copyright holders (unscriptable.com and John M. Hann) shall not be
 * used in advertising or otherwise to promote the sale, use or other
 * dealings in this Software without prior written authorization.
 *
 * http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
 *
 */

define('lib/text-balancer',[
	'jquery/nyt'
], function($) {
	"use strict";
	var sr = "smartresize";

	var debounce = function (func, threshold, execAsap) {
		var timeout;

		return function debounced() {
			var obj = this, args = arguments;
			function delayed() {
				if (!execAsap) {
					func.apply(obj, args);
				}
				timeout = null;
			}

			if (timeout) {
				clearTimeout(timeout);
			} else if (execAsap) {
				func.apply(obj, args);
			}
			timeout = setTimeout(delayed, threshold || 100);
		};
	};

	// smartresize
	$.fn[sr] = function (fn) {  return fn ? this.bind('resize', debounce(fn)) : this.trigger(sr); };

	var style = document.documentElement.style,
		hasTextWrap = (style.textWrap || style.WebkitTextWrap || style.MozTextWrap || style.MsTextWrap || style.OTextWrap),
		wsMatches;

	function NextWS_params() {
		this.reset();
	}
	NextWS_params.prototype.reset = function () {
		this.index = 0;
		this.width = 0;
	};

	/**
	 * Returns true iff char at index is a space character outside of HTML < > tags.
	 */
	var isWS = function (txt, index) {
		var re = /\s(?![^<]*>)/g,
			match;

		if (!wsMatches) {
			// Only calc ws matches once per line
			wsMatches = [];
			while ((match = re.exec(txt)) !== null) {
				wsMatches.push(match.index);
			}
		}

		return wsMatches.indexOf(index) !== -1;
	};

	var removeTags = function ($el) {
		$el.find('br[data-owner="balance-text"]').replaceWith(" ");
		var $span = $el.find('span[data-owner="balance-text"]');
		if ($span.length > 0) {
			var txt = "";
			$span.each(function () {
				txt += $(this).text();
				$(this).remove();
			});
			$el.html(txt);
		}
	};

	/**
	 * Checks to see if we should justify the balanced text with the
	 * element based on the textAlign property in the computed CSS
	 *
	 * @param $el        - $(element)
	 */
	var isJustified = function ($el) {
		style = $el.get(0).currentStyle || window.getComputedStyle($el.get(0), null);
		return (style.textAlign === 'justify');
	};

	/**
	 * Add whitespace after words in text to justify the string to
	 * the specified size.
	 *
	 * @param txt      - text string
	 * @param conWidth - container width
	 */
	var justify = function ($el, txt, conWidth) {
		txt = $.trim(txt);
		var words = txt.split(' ').length;
		txt = txt + ' ';

		// if we don't have at least 2 words, no need to justify.
		if (words < 2) {
			return txt;
		}

		// Find width of text in the DOM
		var tmp = $('<span></span>').html(txt);
		$el.append(tmp);
		var size = tmp.width();
		tmp.remove();

		// Figure out our word spacing and return the element
		var wordSpacing = Math.floor((conWidth - size) / (words - 1));
		tmp.css('word-spacing', wordSpacing + 'px')
			.attr('data-owner', 'balance-text');

		return $('<div></div>').append(tmp).html();
	};

	/**
	 * In the current simple implementation, an index i is a break
	 * opportunity in txt iff it is 0, txt.length, or the
	 * index of a non-whitespace char immediately preceded by a
	 * whitespace char.  (Thus, it doesn't honour 'white-space' or
	 * any Unicode line-breaking classes.)
	 *
	 * @precondition 0 <= index && index <= txt.length
	 */
	var isBreakOpportunity = function (txt, index) {
		return ((index === 0) || (index === txt.length) ||
				(isWS(txt, index - 1) && !isWS(txt, index)));
	};

	/**
	 * Finds the first break opportunity (@see isBreakOpportunity)
	 * in txt that's both after-or-equal-to index c in the direction dir
	 * and resulting in line width equal to or past clamp(desWidth,
	 * 0, conWidth) in direction dir.  Sets ret.index and ret.width
	 * to the corresponding index and line width (from the start of
	 * txt to ret.index).
	 *
	 * @param $el      - $(element)
	 * @param txt      - text string
	 * @param conWidth - container width
	 * @param desWidth - desired width
	 * @param dir      - direction (-1 or +1)
	 * @param c        - char index (0 <= c && c <= txt.length)
	 * @param ret      - return object; index and width of previous/next break
	 *
	 */
	var findBreakOpportunity = function ($el, txt, conWidth, desWidth, dir, c, ret) {
		var w;

		for(;;) {
			while (!isBreakOpportunity(txt, c)) {
				c += dir;
			}

			$el.html(txt.substr(0, c));
			w = $el.width();

			if ((dir < 0)
					? ((w <= desWidth) || (w <= 0) || (c === 0))
					: ((desWidth <= w) || (conWidth <= w) || (c === txt.length))) {
				break;
			}
			c += dir;
		}
		ret.index = c;
		ret.width = w;
	};

	/**
	 * Detects the width of a non-breaking space character, given the height of
	 * the element with no-wrap applied.
	 *
	 * @param $el      - $(element)
	 * @param h         - height
	 *
	 */
	var getSpaceWidth = function ($el, h) {
		var container = document.createElement('div');

		container.style.display = "block";
		container.style.position = "absolute";
		container.style.bottom = 0;
		container.style.right = 0;
		container.style.width = 0;
		container.style.height = 0;
		container.style.margin = 0;
		container.style.padding = 0;
		container.style.visibility = "hidden";
		container.style.overflow = "hidden";

		var space = document.createElement('span');

		space.style.fontSize = "2000px";
		space.innerHTML = "&nbsp;";

		container.appendChild(space);

		$el.append(container);

		var dims = space.getBoundingClientRect();
		container.parentNode.removeChild(container);

		var spaceRatio = dims.height / dims.width;

		return (h / spaceRatio);
	};

	// Selectors to watch; calling balanceText() on a new selector adds it to this list.
	var balancedElements = ['.balance-text'];

	// Call the balanceText plugin on the elements with "balance-text" class. When a browser
	// has native support for the text-wrap property, the text balanceText plugin will let
	// the browser handle it natively, otherwise it will apply its own text balancing code.
	var applyBalanceText = function () {
		var selector = balancedElements.join(',');
		$(selector).balanceText(true);
	};

	$.fn.balanceTextUpdate = applyBalanceText;

	$.fn.balanceText = function (skipResize) {
		var selector = this.selector;

		if (!skipResize && balancedElements.indexOf(selector) === -1) {
			// record the selector so we can re-balance it on resize
			balancedElements.push(selector);
		}

		if (hasTextWrap) {
			// browser supports text-wrap, so do nothing
			return this;
		}

		return this.each(function () {
			var $this = $(this);

			// In a lower level language, this algorithm takes time
			// comparable to normal text layout other than the fact
			// that we do two passes instead of one, so we should
			// be able to do without this limit.
			var maxTextWidth = 5000;

			removeTags($this);                        // strip balance-text tags

			// save line-height if set via inline style
			var oldLH = '';
			if ($this.attr('style') &&
					$this.attr('style').indexOf('line-height') >= 0) {
				oldLH = $this.css('line-height');
			}

			// remove line height before measuring container size
			$this.css('line-height', 'normal');

			var containerWidth = $this.width();
			var containerHeight = $this.height();

			// save settings
			var oldWS = $this.css('white-space');
			var oldFloat = $this.css('float');
			var oldDisplay = $this.css('display');
			var oldPosition = $this.css('position');

			// temporary settings
			$this.css({
				'white-space': 'nowrap',
				'float': 'none',
				'display': 'inline',
				'position': 'static'
			});

			var nowrapWidth = $this.width();
			var nowrapHeight = $this.height();

			// An estimate of the average line width reduction due
			// to trimming trailing space that we expect over all
			// lines other than the last.

			var spaceWidth = ((oldWS === 'pre-wrap') ? 0 : getSpaceWidth($this, nowrapHeight));

			if (containerWidth > 0 &&                  // prevent divide by zero
					nowrapWidth > containerWidth &&    // text is more than 1 line
					nowrapWidth < maxTextWidth) {      // text is less than arbitrary limit (make this a param?)

				var remainingText = $this.html();
				var newText = "";
				var lineText = "";
				var shouldJustify = isJustified($this);
				var totLines = Math.round(containerHeight / nowrapHeight);
				var remLines = totLines;

				// Determine where to break:
				while (remLines > 1) {

					// clear whitespace match cache for each line
					wsMatches = null;

					var desiredWidth = Math.round((nowrapWidth + spaceWidth)
												  / remLines
												  - spaceWidth);

					// Guessed char index
					var guessIndex = Math.round((remainingText.length + 1) / remLines) - 1;

					var le = new NextWS_params();

					// Find a breaking space somewhere before (or equal to) desired width,
					// not necessarily the closest to the desired width.
					findBreakOpportunity($this, remainingText, containerWidth, desiredWidth, -1, guessIndex, le);

					// Find first breaking char after (or equal to) desired width.
					var ge = new NextWS_params();
					guessIndex = le.index;
					findBreakOpportunity($this, remainingText, containerWidth, desiredWidth, +1, guessIndex, ge);

					// Find first breaking char before (or equal to) desired width.
					le.reset();
					guessIndex = ge.index;
					findBreakOpportunity($this, remainingText, containerWidth, desiredWidth, -1, guessIndex, le);

					// Find closest string to desired length
					var splitIndex;
					if (le.index === 0) {
						splitIndex = ge.index;
					} else if ((containerWidth < ge.width) || (le.index === ge.index)) {
						splitIndex = le.index;
					} else {
						splitIndex = ((Math.abs(desiredWidth - le.width) < Math.abs(ge.width - desiredWidth)) ? le.index : ge.index);
					}

					// Break string
					lineText = remainingText.substr(0, splitIndex);
					if (shouldJustify) {
						newText += justify($this, lineText, containerWidth);
					} else {
						newText += lineText.replace(/\s$/, "");
						newText += '<br data-owner="balance-text" />';
					}
					remainingText = remainingText.substr(splitIndex);

					// update counters
					remLines--;
					$this.html(remainingText);
					nowrapWidth = $this.width();
				}

				if (shouldJustify) {
					$this.html(newText + justify($this, remainingText, containerWidth));
				} else {
					$this.html(newText + remainingText);
				}
			}

			// restore settings
			$this.css({
				'position': oldPosition,
				'display': oldDisplay,
				'float': oldFloat,
				'white-space': oldWS,
				'line-height': oldLH
			});
		});
	};

	return function(selectors) {
		if ($.isArray(selectors)) selectors = selectors.join(', ');
		function applyBalanceText() {
			$(selectors)
				.each(function() {
					// look for html nodes in this element
					var el = $(this), updated, related;
					if (el.hasClass('interactive-leadin')) {
						// save dateline and related link
						updated = el.find('time.dateline');
						related = el.find('a.related-link');
						el.data('updated', updated.get(0))
							.data('related', related.get(0))
							.data('filter', $.trim((updated.text() + ' ' + related.text()).replace(/[ \n\t]+/g, ' ')));
					} else if (el.hasClass('g-intro')) {
						// special treatment for stacks
						updated = el.find('.g-updated');
						related = el.find('.g-related-link');
						el.data('updated', updated.get(0))
							.data('related', related.get(0))
							.data('filter', $.trim((updated.text() + (related.get(0) ? ' ' + related.text() : '')).replace(/[ \n\t]+/g, ' ')));
						console.log(el.data('filter'), related.get(0));
					}
				})
				.balanceText()
				.each(function() {
					var el = $(this), filter, summary, nobr;
					if (el.hasClass('interactive-leadin')) {
						el.find('.dateline,.related-link').remove();
						filter = el.data('filter');
						summary = el.html().replace(/[ \n\t]+/g, ' ').replace(filter, '');
						el.html('<span class="summary-text">'+summary+'</span>');
						nobr = $('<span />')
							.css('white-space', 'nowrap')
							.appendTo(el);
						nobr.append(el.data('updated'));
						nobr.append(' ');
						nobr.append(el.data('related'));
					} else if (el.hasClass('g-intro')) {
						// special treatment for stacks
						el.find('.g-updated,.g-related-link').remove();
						filter = el.data('filter');
						summary = el.html().replace(/[ \n\t]+/g, ' ').replace(filter, '');
						el.html('<span class="summary-text">'+summary+'</span>');
						nobr = $('<span />')
							.css('white-space', 'nowrap')
							.appendTo(el);
						nobr.append(el.data('updated'));
						if (el.data('related')) {
							nobr.append(' ');
							nobr.append(el.data('related'));
						}
					}
					
				});
		}
		// Apply on DOM ready
		$(window).ready(applyBalanceText);
		// Reapply on resize
		$(window).smartresize(applyBalanceText);
	};

});

// https://github.com/topojson/topojson Version 3.0.2. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('node_modules/topojson/dist/topojson',['exports'], factory) :
	(factory((global.topojson = global.topojson || {})));
}(this, (function (exports) { 'use strict';

var identity = function(x) {
  return x;
};

var transform = function(transform) {
  if (transform == null) return identity;
  var x0,
      y0,
      kx = transform.scale[0],
      ky = transform.scale[1],
      dx = transform.translate[0],
      dy = transform.translate[1];
  return function(input, i) {
    if (!i) x0 = y0 = 0;
    var j = 2, n = input.length, output = new Array(n);
    output[0] = (x0 += input[0]) * kx + dx;
    output[1] = (y0 += input[1]) * ky + dy;
    while (j < n) output[j] = input[j], ++j;
    return output;
  };
};

var bbox = function(topology) {
  var t = transform(topology.transform), key,
      x0 = Infinity, y0 = x0, x1 = -x0, y1 = -x0;

  function bboxPoint(p) {
    p = t(p);
    if (p[0] < x0) x0 = p[0];
    if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }

  function bboxGeometry(o) {
    switch (o.type) {
      case "GeometryCollection": o.geometries.forEach(bboxGeometry); break;
      case "Point": bboxPoint(o.coordinates); break;
      case "MultiPoint": o.coordinates.forEach(bboxPoint); break;
    }
  }

  topology.arcs.forEach(function(arc) {
    var i = -1, n = arc.length, p;
    while (++i < n) {
      p = t(arc[i], i);
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
  });

  for (key in topology.objects) {
    bboxGeometry(topology.objects[key]);
  }

  return [x0, y0, x1, y1];
};

var reverse = function(array, n) {
  var t, j = array.length, i = j - n;
  while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
};

var feature = function(topology, o) {
  return o.type === "GeometryCollection"
      ? {type: "FeatureCollection", features: o.geometries.map(function(o) { return feature$1(topology, o); })}
      : feature$1(topology, o);
};

function feature$1(topology, o) {
  var id = o.id,
      bbox = o.bbox,
      properties = o.properties == null ? {} : o.properties,
      geometry = object(topology, o);
  return id == null && bbox == null ? {type: "Feature", properties: properties, geometry: geometry}
      : bbox == null ? {type: "Feature", id: id, properties: properties, geometry: geometry}
      : {type: "Feature", id: id, bbox: bbox, properties: properties, geometry: geometry};
}

function object(topology, o) {
  var transformPoint = transform(topology.transform),
      arcs = topology.arcs;

  function arc(i, points) {
    if (points.length) points.pop();
    for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) {
      points.push(transformPoint(a[k], k));
    }
    if (i < 0) reverse(points, n);
  }

  function point(p) {
    return transformPoint(p);
  }

  function line(arcs) {
    var points = [];
    for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
    if (points.length < 2) points.push(points[0]); // This should never happen per the specification.
    return points;
  }

  function ring(arcs) {
    var points = line(arcs);
    while (points.length < 4) points.push(points[0]); // This may happen if an arc has only two points.
    return points;
  }

  function polygon(arcs) {
    return arcs.map(ring);
  }

  function geometry(o) {
    var type = o.type, coordinates;
    switch (type) {
      case "GeometryCollection": return {type: type, geometries: o.geometries.map(geometry)};
      case "Point": coordinates = point(o.coordinates); break;
      case "MultiPoint": coordinates = o.coordinates.map(point); break;
      case "LineString": coordinates = line(o.arcs); break;
      case "MultiLineString": coordinates = o.arcs.map(line); break;
      case "Polygon": coordinates = polygon(o.arcs); break;
      case "MultiPolygon": coordinates = o.arcs.map(polygon); break;
      default: return null;
    }
    return {type: type, coordinates: coordinates};
  }

  return geometry(o);
}

var stitch = function(topology, arcs) {
  var stitchedArcs = {},
      fragmentByStart = {},
      fragmentByEnd = {},
      fragments = [],
      emptyIndex = -1;

  // Stitch empty arcs first, since they may be subsumed by other arcs.
  arcs.forEach(function(i, j) {
    var arc = topology.arcs[i < 0 ? ~i : i], t;
    if (arc.length < 3 && !arc[1][0] && !arc[1][1]) {
      t = arcs[++emptyIndex], arcs[emptyIndex] = i, arcs[j] = t;
    }
  });

  arcs.forEach(function(i) {
    var e = ends(i),
        start = e[0],
        end = e[1],
        f, g;

    if (f = fragmentByEnd[start]) {
      delete fragmentByEnd[f.end];
      f.push(i);
      f.end = end;
      if (g = fragmentByStart[end]) {
        delete fragmentByStart[g.start];
        var fg = g === f ? f : f.concat(g);
        fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
      } else {
        fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
      }
    } else if (f = fragmentByStart[end]) {
      delete fragmentByStart[f.start];
      f.unshift(i);
      f.start = start;
      if (g = fragmentByEnd[start]) {
        delete fragmentByEnd[g.end];
        var gf = g === f ? f : g.concat(f);
        fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
      } else {
        fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
      }
    } else {
      f = [i];
      fragmentByStart[f.start = start] = fragmentByEnd[f.end = end] = f;
    }
  });

  function ends(i) {
    var arc = topology.arcs[i < 0 ? ~i : i], p0 = arc[0], p1;
    if (topology.transform) p1 = [0, 0], arc.forEach(function(dp) { p1[0] += dp[0], p1[1] += dp[1]; });
    else p1 = arc[arc.length - 1];
    return i < 0 ? [p1, p0] : [p0, p1];
  }

  function flush(fragmentByEnd, fragmentByStart) {
    for (var k in fragmentByEnd) {
      var f = fragmentByEnd[k];
      delete fragmentByStart[f.start];
      delete f.start;
      delete f.end;
      f.forEach(function(i) { stitchedArcs[i < 0 ? ~i : i] = 1; });
      fragments.push(f);
    }
  }

  flush(fragmentByEnd, fragmentByStart);
  flush(fragmentByStart, fragmentByEnd);
  arcs.forEach(function(i) { if (!stitchedArcs[i < 0 ? ~i : i]) fragments.push([i]); });

  return fragments;
};

var mesh = function(topology) {
  return object(topology, meshArcs.apply(this, arguments));
};

function meshArcs(topology, object$$1, filter) {
  var arcs, i, n;
  if (arguments.length > 1) arcs = extractArcs(topology, object$$1, filter);
  else for (i = 0, arcs = new Array(n = topology.arcs.length); i < n; ++i) arcs[i] = i;
  return {type: "MultiLineString", arcs: stitch(topology, arcs)};
}

function extractArcs(topology, object$$1, filter) {
  var arcs = [],
      geomsByArc = [],
      geom;

  function extract0(i) {
    var j = i < 0 ? ~i : i;
    (geomsByArc[j] || (geomsByArc[j] = [])).push({i: i, g: geom});
  }

  function extract1(arcs) {
    arcs.forEach(extract0);
  }

  function extract2(arcs) {
    arcs.forEach(extract1);
  }

  function extract3(arcs) {
    arcs.forEach(extract2);
  }

  function geometry(o) {
    switch (geom = o, o.type) {
      case "GeometryCollection": o.geometries.forEach(geometry); break;
      case "LineString": extract1(o.arcs); break;
      case "MultiLineString": case "Polygon": extract2(o.arcs); break;
      case "MultiPolygon": extract3(o.arcs); break;
    }
  }

  geometry(object$$1);

  geomsByArc.forEach(filter == null
      ? function(geoms) { arcs.push(geoms[0].i); }
      : function(geoms) { if (filter(geoms[0].g, geoms[geoms.length - 1].g)) arcs.push(geoms[0].i); });

  return arcs;
}

function planarRingArea(ring) {
  var i = -1, n = ring.length, a, b = ring[n - 1], area = 0;
  while (++i < n) a = b, b = ring[i], area += a[0] * b[1] - a[1] * b[0];
  return Math.abs(area); // Note: doubled area!
}

var merge = function(topology) {
  return object(topology, mergeArcs.apply(this, arguments));
};

function mergeArcs(topology, objects) {
  var polygonsByArc = {},
      polygons = [],
      groups = [];

  objects.forEach(geometry);

  function geometry(o) {
    switch (o.type) {
      case "GeometryCollection": o.geometries.forEach(geometry); break;
      case "Polygon": extract(o.arcs); break;
      case "MultiPolygon": o.arcs.forEach(extract); break;
    }
  }

  function extract(polygon) {
    polygon.forEach(function(ring) {
      ring.forEach(function(arc) {
        (polygonsByArc[arc = arc < 0 ? ~arc : arc] || (polygonsByArc[arc] = [])).push(polygon);
      });
    });
    polygons.push(polygon);
  }

  function area(ring) {
    return planarRingArea(object(topology, {type: "Polygon", arcs: [ring]}).coordinates[0]);
  }

  polygons.forEach(function(polygon) {
    if (!polygon._) {
      var group = [],
          neighbors = [polygon];
      polygon._ = 1;
      groups.push(group);
      while (polygon = neighbors.pop()) {
        group.push(polygon);
        polygon.forEach(function(ring) {
          ring.forEach(function(arc) {
            polygonsByArc[arc < 0 ? ~arc : arc].forEach(function(polygon) {
              if (!polygon._) {
                polygon._ = 1;
                neighbors.push(polygon);
              }
            });
          });
        });
      }
    }
  });

  polygons.forEach(function(polygon) {
    delete polygon._;
  });

  return {
    type: "MultiPolygon",
    arcs: groups.map(function(polygons) {
      var arcs = [], n;

      // Extract the exterior (unique) arcs.
      polygons.forEach(function(polygon) {
        polygon.forEach(function(ring) {
          ring.forEach(function(arc) {
            if (polygonsByArc[arc < 0 ? ~arc : arc].length < 2) {
              arcs.push(arc);
            }
          });
        });
      });

      // Stitch the arcs into one or more rings.
      arcs = stitch(topology, arcs);

      // If more than one ring is returned,
      // at most one of these rings can be the exterior;
      // choose the one with the greatest absolute area.
      if ((n = arcs.length) > 1) {
        for (var i = 1, k = area(arcs[0]), ki, t; i < n; ++i) {
          if ((ki = area(arcs[i])) > k) {
            t = arcs[0], arcs[0] = arcs[i], arcs[i] = t, k = ki;
          }
        }
      }

      return arcs;
    })
  };
}

var bisect = function(a, x) {
  var lo = 0, hi = a.length;
  while (lo < hi) {
    var mid = lo + hi >>> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

var neighbors = function(objects) {
  var indexesByArc = {}, // arc index -> array of object indexes
      neighbors = objects.map(function() { return []; });

  function line(arcs, i) {
    arcs.forEach(function(a) {
      if (a < 0) a = ~a;
      var o = indexesByArc[a];
      if (o) o.push(i);
      else indexesByArc[a] = [i];
    });
  }

  function polygon(arcs, i) {
    arcs.forEach(function(arc) { line(arc, i); });
  }

  function geometry(o, i) {
    if (o.type === "GeometryCollection") o.geometries.forEach(function(o) { geometry(o, i); });
    else if (o.type in geometryType) geometryType[o.type](o.arcs, i);
  }

  var geometryType = {
    LineString: line,
    MultiLineString: polygon,
    Polygon: polygon,
    MultiPolygon: function(arcs, i) { arcs.forEach(function(arc) { polygon(arc, i); }); }
  };

  objects.forEach(geometry);

  for (var i in indexesByArc) {
    for (var indexes = indexesByArc[i], m = indexes.length, j = 0; j < m; ++j) {
      for (var k = j + 1; k < m; ++k) {
        var ij = indexes[j], ik = indexes[k], n;
        if ((n = neighbors[ij])[i = bisect(n, ik)] !== ik) n.splice(i, 0, ik);
        if ((n = neighbors[ik])[i = bisect(n, ij)] !== ij) n.splice(i, 0, ij);
      }
    }
  }

  return neighbors;
};

var untransform = function(transform) {
  if (transform == null) return identity;
  var x0,
      y0,
      kx = transform.scale[0],
      ky = transform.scale[1],
      dx = transform.translate[0],
      dy = transform.translate[1];
  return function(input, i) {
    if (!i) x0 = y0 = 0;
    var j = 2,
        n = input.length,
        output = new Array(n),
        x1 = Math.round((input[0] - dx) / kx),
        y1 = Math.round((input[1] - dy) / ky);
    output[0] = x1 - x0, x0 = x1;
    output[1] = y1 - y0, y0 = y1;
    while (j < n) output[j] = input[j], ++j;
    return output;
  };
};

var quantize = function(topology, transform) {
  if (topology.transform) throw new Error("already quantized");

  if (!transform || !transform.scale) {
    if (!((n = Math.floor(transform)) >= 2)) throw new Error("n must be \u22652");
    box = topology.bbox || bbox(topology);
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3], n;
    transform = {scale: [x1 - x0 ? (x1 - x0) / (n - 1) : 1, y1 - y0 ? (y1 - y0) / (n - 1) : 1], translate: [x0, y0]};
  } else {
    box = topology.bbox;
  }

  var t = untransform(transform), box, key, inputs = topology.objects, outputs = {};

  function quantizePoint(point) {
    return t(point);
  }

  function quantizeGeometry(input) {
    var output;
    switch (input.type) {
      case "GeometryCollection": output = {type: "GeometryCollection", geometries: input.geometries.map(quantizeGeometry)}; break;
      case "Point": output = {type: "Point", coordinates: quantizePoint(input.coordinates)}; break;
      case "MultiPoint": output = {type: "MultiPoint", coordinates: input.coordinates.map(quantizePoint)}; break;
      default: return input;
    }
    if (input.id != null) output.id = input.id;
    if (input.bbox != null) output.bbox = input.bbox;
    if (input.properties != null) output.properties = input.properties;
    return output;
  }

  function quantizeArc(input) {
    var i = 0, j = 1, n = input.length, p, output = new Array(n); // pessimistic
    output[0] = t(input[0], 0);
    while (++i < n) if ((p = t(input[i], i))[0] || p[1]) output[j++] = p; // non-coincident points
    if (j === 1) output[j++] = [0, 0]; // an arc must have at least two points
    output.length = j;
    return output;
  }

  for (key in inputs) outputs[key] = quantizeGeometry(inputs[key]);

  return {
    type: "Topology",
    bbox: box,
    transform: transform,
    objects: outputs,
    arcs: topology.arcs.map(quantizeArc)
  };
};

// Computes the bounding box of the specified hash of GeoJSON objects.
var bounds = function(objects) {
  var x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;

  function boundGeometry(geometry) {
    if (geometry != null && boundGeometryType.hasOwnProperty(geometry.type)) boundGeometryType[geometry.type](geometry);
  }

  var boundGeometryType = {
    GeometryCollection: function(o) { o.geometries.forEach(boundGeometry); },
    Point: function(o) { boundPoint(o.coordinates); },
    MultiPoint: function(o) { o.coordinates.forEach(boundPoint); },
    LineString: function(o) { boundLine(o.arcs); },
    MultiLineString: function(o) { o.arcs.forEach(boundLine); },
    Polygon: function(o) { o.arcs.forEach(boundLine); },
    MultiPolygon: function(o) { o.arcs.forEach(boundMultiLine); }
  };

  function boundPoint(coordinates) {
    var x = coordinates[0],
        y = coordinates[1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }

  function boundLine(coordinates) {
    coordinates.forEach(boundPoint);
  }

  function boundMultiLine(coordinates) {
    coordinates.forEach(boundLine);
  }

  for (var key in objects) {
    boundGeometry(objects[key]);
  }

  return x1 >= x0 && y1 >= y0 ? [x0, y0, x1, y1] : undefined;
};

var hashset = function(size, hash, equal, type, empty) {
  if (arguments.length === 3) {
    type = Array;
    empty = null;
  }

  var store = new type(size = 1 << Math.max(4, Math.ceil(Math.log(size) / Math.LN2))),
      mask = size - 1;

  for (var i = 0; i < size; ++i) {
    store[i] = empty;
  }

  function add(value) {
    var index = hash(value) & mask,
        match = store[index],
        collisions = 0;
    while (match != empty) {
      if (equal(match, value)) return true;
      if (++collisions >= size) throw new Error("full hashset");
      match = store[index = (index + 1) & mask];
    }
    store[index] = value;
    return true;
  }

  function has(value) {
    var index = hash(value) & mask,
        match = store[index],
        collisions = 0;
    while (match != empty) {
      if (equal(match, value)) return true;
      if (++collisions >= size) break;
      match = store[index = (index + 1) & mask];
    }
    return false;
  }

  function values() {
    var values = [];
    for (var i = 0, n = store.length; i < n; ++i) {
      var match = store[i];
      if (match != empty) values.push(match);
    }
    return values;
  }

  return {
    add: add,
    has: has,
    values: values
  };
};

var hashmap = function(size, hash, equal, keyType, keyEmpty, valueType) {
  if (arguments.length === 3) {
    keyType = valueType = Array;
    keyEmpty = null;
  }

  var keystore = new keyType(size = 1 << Math.max(4, Math.ceil(Math.log(size) / Math.LN2))),
      valstore = new valueType(size),
      mask = size - 1;

  for (var i = 0; i < size; ++i) {
    keystore[i] = keyEmpty;
  }

  function set(key, value) {
    var index = hash(key) & mask,
        matchKey = keystore[index],
        collisions = 0;
    while (matchKey != keyEmpty) {
      if (equal(matchKey, key)) return valstore[index] = value;
      if (++collisions >= size) throw new Error("full hashmap");
      matchKey = keystore[index = (index + 1) & mask];
    }
    keystore[index] = key;
    valstore[index] = value;
    return value;
  }

  function maybeSet(key, value) {
    var index = hash(key) & mask,
        matchKey = keystore[index],
        collisions = 0;
    while (matchKey != keyEmpty) {
      if (equal(matchKey, key)) return valstore[index];
      if (++collisions >= size) throw new Error("full hashmap");
      matchKey = keystore[index = (index + 1) & mask];
    }
    keystore[index] = key;
    valstore[index] = value;
    return value;
  }

  function get(key, missingValue) {
    var index = hash(key) & mask,
        matchKey = keystore[index],
        collisions = 0;
    while (matchKey != keyEmpty) {
      if (equal(matchKey, key)) return valstore[index];
      if (++collisions >= size) break;
      matchKey = keystore[index = (index + 1) & mask];
    }
    return missingValue;
  }

  function keys() {
    var keys = [];
    for (var i = 0, n = keystore.length; i < n; ++i) {
      var matchKey = keystore[i];
      if (matchKey != keyEmpty) keys.push(matchKey);
    }
    return keys;
  }

  return {
    set: set,
    maybeSet: maybeSet, // set if unset
    get: get,
    keys: keys
  };
};

var equalPoint = function(pointA, pointB) {
  return pointA[0] === pointB[0] && pointA[1] === pointB[1];
};

// TODO if quantized, use simpler Int32 hashing?

var buffer = new ArrayBuffer(16);
var uints = new Uint32Array(buffer);

var hashPoint = function(point) {
  var hash = uints[0] ^ uints[1];
  hash = hash << 5 ^ hash >> 7 ^ uints[2] ^ uints[3];
  return hash & 0x7fffffff;
};

// Given an extracted (pre-)topology, identifies all of the junctions. These are
// the points at which arcs (lines or rings) will need to be cut so that each
// arc is represented uniquely.
//
// A junction is a point where at least one arc deviates from another arc going
// through the same point. For example, consider the point B. If there is a arc
// through ABC and another arc through CBA, then B is not a junction because in
// both cases the adjacent point pairs are {A,C}. However, if there is an
// additional arc ABD, then {A,D} != {A,C}, and thus B becomes a junction.
//
// For a closed ring ABCA, the first point A’s adjacent points are the second
// and last point {B,C}. For a line, the first and last point are always
// considered junctions, even if the line is closed; this ensures that a closed
// line is never rotated.
var join = function(topology) {
  var coordinates = topology.coordinates,
      lines = topology.lines,
      rings = topology.rings,
      indexes = index(),
      visitedByIndex = new Int32Array(coordinates.length),
      leftByIndex = new Int32Array(coordinates.length),
      rightByIndex = new Int32Array(coordinates.length),
      junctionByIndex = new Int8Array(coordinates.length),
      junctionCount = 0, // upper bound on number of junctions
      i, n,
      previousIndex,
      currentIndex,
      nextIndex;

  for (i = 0, n = coordinates.length; i < n; ++i) {
    visitedByIndex[i] = leftByIndex[i] = rightByIndex[i] = -1;
  }

  for (i = 0, n = lines.length; i < n; ++i) {
    var line = lines[i],
        lineStart = line[0],
        lineEnd = line[1];
    currentIndex = indexes[lineStart];
    nextIndex = indexes[++lineStart];
    ++junctionCount, junctionByIndex[currentIndex] = 1; // start
    while (++lineStart <= lineEnd) {
      sequence(i, previousIndex = currentIndex, currentIndex = nextIndex, nextIndex = indexes[lineStart]);
    }
    ++junctionCount, junctionByIndex[nextIndex] = 1; // end
  }

  for (i = 0, n = coordinates.length; i < n; ++i) {
    visitedByIndex[i] = -1;
  }

  for (i = 0, n = rings.length; i < n; ++i) {
    var ring = rings[i],
        ringStart = ring[0] + 1,
        ringEnd = ring[1];
    previousIndex = indexes[ringEnd - 1];
    currentIndex = indexes[ringStart - 1];
    nextIndex = indexes[ringStart];
    sequence(i, previousIndex, currentIndex, nextIndex);
    while (++ringStart <= ringEnd) {
      sequence(i, previousIndex = currentIndex, currentIndex = nextIndex, nextIndex = indexes[ringStart]);
    }
  }

  function sequence(i, previousIndex, currentIndex, nextIndex) {
    if (visitedByIndex[currentIndex] === i) return; // ignore self-intersection
    visitedByIndex[currentIndex] = i;
    var leftIndex = leftByIndex[currentIndex];
    if (leftIndex >= 0) {
      var rightIndex = rightByIndex[currentIndex];
      if ((leftIndex !== previousIndex || rightIndex !== nextIndex)
        && (leftIndex !== nextIndex || rightIndex !== previousIndex)) {
        ++junctionCount, junctionByIndex[currentIndex] = 1;
      }
    } else {
      leftByIndex[currentIndex] = previousIndex;
      rightByIndex[currentIndex] = nextIndex;
    }
  }

  function index() {
    var indexByPoint = hashmap(coordinates.length * 1.4, hashIndex, equalIndex, Int32Array, -1, Int32Array),
        indexes = new Int32Array(coordinates.length);

    for (var i = 0, n = coordinates.length; i < n; ++i) {
      indexes[i] = indexByPoint.maybeSet(i, i);
    }

    return indexes;
  }

  function hashIndex(i) {
    return hashPoint(coordinates[i]);
  }

  function equalIndex(i, j) {
    return equalPoint(coordinates[i], coordinates[j]);
  }

  visitedByIndex = leftByIndex = rightByIndex = null;

  var junctionByPoint = hashset(junctionCount * 1.4, hashPoint, equalPoint), j;

  // Convert back to a standard hashset by point for caller convenience.
  for (i = 0, n = coordinates.length; i < n; ++i) {
    if (junctionByIndex[j = indexes[i]]) {
      junctionByPoint.add(coordinates[j]);
    }
  }

  return junctionByPoint;
};

// Given an extracted (pre-)topology, cuts (or rotates) arcs so that all shared
// point sequences are identified. The topology can then be subsequently deduped
// to remove exact duplicate arcs.
var cut = function(topology) {
  var junctions = join(topology),
      coordinates = topology.coordinates,
      lines = topology.lines,
      rings = topology.rings,
      next,
      i, n;

  for (i = 0, n = lines.length; i < n; ++i) {
    var line = lines[i],
        lineMid = line[0],
        lineEnd = line[1];
    while (++lineMid < lineEnd) {
      if (junctions.has(coordinates[lineMid])) {
        next = {0: lineMid, 1: line[1]};
        line[1] = lineMid;
        line = line.next = next;
      }
    }
  }

  for (i = 0, n = rings.length; i < n; ++i) {
    var ring = rings[i],
        ringStart = ring[0],
        ringMid = ringStart,
        ringEnd = ring[1],
        ringFixed = junctions.has(coordinates[ringStart]);
    while (++ringMid < ringEnd) {
      if (junctions.has(coordinates[ringMid])) {
        if (ringFixed) {
          next = {0: ringMid, 1: ring[1]};
          ring[1] = ringMid;
          ring = ring.next = next;
        } else { // For the first junction, we can rotate rather than cut.
          rotateArray(coordinates, ringStart, ringEnd, ringEnd - ringMid);
          coordinates[ringEnd] = coordinates[ringStart];
          ringFixed = true;
          ringMid = ringStart; // restart; we may have skipped junctions
        }
      }
    }
  }

  return topology;
};

function rotateArray(array, start, end, offset) {
  reverse$1(array, start, end);
  reverse$1(array, start, start + offset);
  reverse$1(array, start + offset, end);
}

function reverse$1(array, start, end) {
  for (var mid = start + ((end-- - start) >> 1), t; start < mid; ++start, --end) {
    t = array[start], array[start] = array[end], array[end] = t;
  }
}

// Given a cut topology, combines duplicate arcs.
var dedup = function(topology) {
  var coordinates = topology.coordinates,
      lines = topology.lines, line,
      rings = topology.rings, ring,
      arcCount = lines.length + rings.length,
      i, n;

  delete topology.lines;
  delete topology.rings;

  // Count the number of (non-unique) arcs to initialize the hashmap safely.
  for (i = 0, n = lines.length; i < n; ++i) {
    line = lines[i]; while (line = line.next) ++arcCount;
  }
  for (i = 0, n = rings.length; i < n; ++i) {
    ring = rings[i]; while (ring = ring.next) ++arcCount;
  }

  var arcsByEnd = hashmap(arcCount * 2 * 1.4, hashPoint, equalPoint),
      arcs = topology.arcs = [];

  for (i = 0, n = lines.length; i < n; ++i) {
    line = lines[i];
    do {
      dedupLine(line);
    } while (line = line.next);
  }

  for (i = 0, n = rings.length; i < n; ++i) {
    ring = rings[i];
    if (ring.next) { // arc is no longer closed
      do {
        dedupLine(ring);
      } while (ring = ring.next);
    } else {
      dedupRing(ring);
    }
  }

  function dedupLine(arc) {
    var startPoint,
        endPoint,
        startArcs, startArc,
        endArcs, endArc,
        i, n;

    // Does this arc match an existing arc in order?
    if (startArcs = arcsByEnd.get(startPoint = coordinates[arc[0]])) {
      for (i = 0, n = startArcs.length; i < n; ++i) {
        startArc = startArcs[i];
        if (equalLine(startArc, arc)) {
          arc[0] = startArc[0];
          arc[1] = startArc[1];
          return;
        }
      }
    }

    // Does this arc match an existing arc in reverse order?
    if (endArcs = arcsByEnd.get(endPoint = coordinates[arc[1]])) {
      for (i = 0, n = endArcs.length; i < n; ++i) {
        endArc = endArcs[i];
        if (reverseEqualLine(endArc, arc)) {
          arc[1] = endArc[0];
          arc[0] = endArc[1];
          return;
        }
      }
    }

    if (startArcs) startArcs.push(arc); else arcsByEnd.set(startPoint, [arc]);
    if (endArcs) endArcs.push(arc); else arcsByEnd.set(endPoint, [arc]);
    arcs.push(arc);
  }

  function dedupRing(arc) {
    var endPoint,
        endArcs,
        endArc,
        i, n;

    // Does this arc match an existing line in order, or reverse order?
    // Rings are closed, so their start point and end point is the same.
    if (endArcs = arcsByEnd.get(endPoint = coordinates[arc[0]])) {
      for (i = 0, n = endArcs.length; i < n; ++i) {
        endArc = endArcs[i];
        if (equalRing(endArc, arc)) {
          arc[0] = endArc[0];
          arc[1] = endArc[1];
          return;
        }
        if (reverseEqualRing(endArc, arc)) {
          arc[0] = endArc[1];
          arc[1] = endArc[0];
          return;
        }
      }
    }

    // Otherwise, does this arc match an existing ring in order, or reverse order?
    if (endArcs = arcsByEnd.get(endPoint = coordinates[arc[0] + findMinimumOffset(arc)])) {
      for (i = 0, n = endArcs.length; i < n; ++i) {
        endArc = endArcs[i];
        if (equalRing(endArc, arc)) {
          arc[0] = endArc[0];
          arc[1] = endArc[1];
          return;
        }
        if (reverseEqualRing(endArc, arc)) {
          arc[0] = endArc[1];
          arc[1] = endArc[0];
          return;
        }
      }
    }

    if (endArcs) endArcs.push(arc); else arcsByEnd.set(endPoint, [arc]);
    arcs.push(arc);
  }

  function equalLine(arcA, arcB) {
    var ia = arcA[0], ib = arcB[0],
        ja = arcA[1], jb = arcB[1];
    if (ia - ja !== ib - jb) return false;
    for (; ia <= ja; ++ia, ++ib) if (!equalPoint(coordinates[ia], coordinates[ib])) return false;
    return true;
  }

  function reverseEqualLine(arcA, arcB) {
    var ia = arcA[0], ib = arcB[0],
        ja = arcA[1], jb = arcB[1];
    if (ia - ja !== ib - jb) return false;
    for (; ia <= ja; ++ia, --jb) if (!equalPoint(coordinates[ia], coordinates[jb])) return false;
    return true;
  }

  function equalRing(arcA, arcB) {
    var ia = arcA[0], ib = arcB[0],
        ja = arcA[1], jb = arcB[1],
        n = ja - ia;
    if (n !== jb - ib) return false;
    var ka = findMinimumOffset(arcA),
        kb = findMinimumOffset(arcB);
    for (var i = 0; i < n; ++i) {
      if (!equalPoint(coordinates[ia + (i + ka) % n], coordinates[ib + (i + kb) % n])) return false;
    }
    return true;
  }

  function reverseEqualRing(arcA, arcB) {
    var ia = arcA[0], ib = arcB[0],
        ja = arcA[1], jb = arcB[1],
        n = ja - ia;
    if (n !== jb - ib) return false;
    var ka = findMinimumOffset(arcA),
        kb = n - findMinimumOffset(arcB);
    for (var i = 0; i < n; ++i) {
      if (!equalPoint(coordinates[ia + (i + ka) % n], coordinates[jb - (i + kb) % n])) return false;
    }
    return true;
  }

  // Rings are rotated to a consistent, but arbitrary, start point.
  // This is necessary to detect when a ring and a rotated copy are dupes.
  function findMinimumOffset(arc) {
    var start = arc[0],
        end = arc[1],
        mid = start,
        minimum = mid,
        minimumPoint = coordinates[mid];
    while (++mid < end) {
      var point = coordinates[mid];
      if (point[0] < minimumPoint[0] || point[0] === minimumPoint[0] && point[1] < minimumPoint[1]) {
        minimum = mid;
        minimumPoint = point;
      }
    }
    return minimum - start;
  }

  return topology;
};

// Given an array of arcs in absolute (but already quantized!) coordinates,
// converts to fixed-point delta encoding.
// This is a destructive operation that modifies the given arcs!
var delta = function(arcs) {
  var i = -1,
      n = arcs.length;

  while (++i < n) {
    var arc = arcs[i],
        j = 0,
        k = 1,
        m = arc.length,
        point = arc[0],
        x0 = point[0],
        y0 = point[1],
        x1,
        y1;

    while (++j < m) {
      point = arc[j], x1 = point[0], y1 = point[1];
      if (x1 !== x0 || y1 !== y0) arc[k++] = [x1 - x0, y1 - y0], x0 = x1, y0 = y1;
    }

    if (k === 1) arc[k++] = [0, 0]; // Each arc must be an array of two or more positions.

    arc.length = k;
  }

  return arcs;
};

// Extracts the lines and rings from the specified hash of geometry objects.
//
// Returns an object with three properties:
//
// * coordinates - shared buffer of [x, y] coordinates
// * lines - lines extracted from the hash, of the form [start, end]
// * rings - rings extracted from the hash, of the form [start, end]
//
// For each ring or line, start and end represent inclusive indexes into the
// coordinates buffer. For rings (and closed lines), coordinates[start] equals
// coordinates[end].
//
// For each line or polygon geometry in the input hash, including nested
// geometries as in geometry collections, the `coordinates` array is replaced
// with an equivalent `arcs` array that, for each line (for line string
// geometries) or ring (for polygon geometries), points to one of the above
// lines or rings.
var extract = function(objects) {
  var index = -1,
      lines = [],
      rings = [],
      coordinates = [];

  function extractGeometry(geometry) {
    if (geometry && extractGeometryType.hasOwnProperty(geometry.type)) extractGeometryType[geometry.type](geometry);
  }

  var extractGeometryType = {
    GeometryCollection: function(o) { o.geometries.forEach(extractGeometry); },
    LineString: function(o) { o.arcs = extractLine(o.arcs); },
    MultiLineString: function(o) { o.arcs = o.arcs.map(extractLine); },
    Polygon: function(o) { o.arcs = o.arcs.map(extractRing); },
    MultiPolygon: function(o) { o.arcs = o.arcs.map(extractMultiRing); }
  };

  function extractLine(line) {
    for (var i = 0, n = line.length; i < n; ++i) coordinates[++index] = line[i];
    var arc = {0: index - n + 1, 1: index};
    lines.push(arc);
    return arc;
  }

  function extractRing(ring) {
    for (var i = 0, n = ring.length; i < n; ++i) coordinates[++index] = ring[i];
    var arc = {0: index - n + 1, 1: index};
    rings.push(arc);
    return arc;
  }

  function extractMultiRing(rings) {
    return rings.map(extractRing);
  }

  for (var key in objects) {
    extractGeometry(objects[key]);
  }

  return {
    type: "Topology",
    coordinates: coordinates,
    lines: lines,
    rings: rings,
    objects: objects
  };
};

// Given a hash of GeoJSON objects, returns a hash of GeoJSON geometry objects.
// Any null input geometry objects are represented as {type: null} in the output.
// Any feature.{id,properties,bbox} are transferred to the output geometry object.
// Each output geometry object is a shallow copy of the input (e.g., properties, coordinates)!
var geometry = function(inputs) {
  var outputs = {}, key;
  for (key in inputs) outputs[key] = geomifyObject(inputs[key]);
  return outputs;
};

function geomifyObject(input) {
  return input == null ? {type: null}
      : (input.type === "FeatureCollection" ? geomifyFeatureCollection
      : input.type === "Feature" ? geomifyFeature
      : geomifyGeometry)(input);
}

function geomifyFeatureCollection(input) {
  var output = {type: "GeometryCollection", geometries: input.features.map(geomifyFeature)};
  if (input.bbox != null) output.bbox = input.bbox;
  return output;
}

function geomifyFeature(input) {
  var output = geomifyGeometry(input.geometry), key; // eslint-disable-line no-unused-vars
  if (input.id != null) output.id = input.id;
  if (input.bbox != null) output.bbox = input.bbox;
  for (key in input.properties) { output.properties = input.properties; break; }
  return output;
}

function geomifyGeometry(input) {
  if (input == null) return {type: null};
  var output = input.type === "GeometryCollection" ? {type: "GeometryCollection", geometries: input.geometries.map(geomifyGeometry)}
      : input.type === "Point" || input.type === "MultiPoint" ? {type: input.type, coordinates: input.coordinates}
      : {type: input.type, arcs: input.coordinates}; // TODO Check for unknown types?
  if (input.bbox != null) output.bbox = input.bbox;
  return output;
}

var prequantize = function(objects, bbox, n) {
  var x0 = bbox[0],
      y0 = bbox[1],
      x1 = bbox[2],
      y1 = bbox[3],
      kx = x1 - x0 ? (n - 1) / (x1 - x0) : 1,
      ky = y1 - y0 ? (n - 1) / (y1 - y0) : 1;

  function quantizePoint(input) {
    return [Math.round((input[0] - x0) * kx), Math.round((input[1] - y0) * ky)];
  }

  function quantizePoints(input, m) {
    var i = -1,
        j = 0,
        n = input.length,
        output = new Array(n), // pessimistic
        pi,
        px,
        py,
        x,
        y;

    while (++i < n) {
      pi = input[i];
      x = Math.round((pi[0] - x0) * kx);
      y = Math.round((pi[1] - y0) * ky);
      if (x !== px || y !== py) output[j++] = [px = x, py = y]; // non-coincident points
    }

    output.length = j;
    while (j < m) j = output.push([output[0][0], output[0][1]]);
    return output;
  }

  function quantizeLine(input) {
    return quantizePoints(input, 2);
  }

  function quantizeRing(input) {
    return quantizePoints(input, 4);
  }

  function quantizePolygon(input) {
    return input.map(quantizeRing);
  }

  function quantizeGeometry(o) {
    if (o != null && quantizeGeometryType.hasOwnProperty(o.type)) quantizeGeometryType[o.type](o);
  }

  var quantizeGeometryType = {
    GeometryCollection: function(o) { o.geometries.forEach(quantizeGeometry); },
    Point: function(o) { o.coordinates = quantizePoint(o.coordinates); },
    MultiPoint: function(o) { o.coordinates = o.coordinates.map(quantizePoint); },
    LineString: function(o) { o.arcs = quantizeLine(o.arcs); },
    MultiLineString: function(o) { o.arcs = o.arcs.map(quantizeLine); },
    Polygon: function(o) { o.arcs = quantizePolygon(o.arcs); },
    MultiPolygon: function(o) { o.arcs = o.arcs.map(quantizePolygon); }
  };

  for (var key in objects) {
    quantizeGeometry(objects[key]);
  }

  return {
    scale: [1 / kx, 1 / ky],
    translate: [x0, y0]
  };
};

// Constructs the TopoJSON Topology for the specified hash of features.
// Each object in the specified hash must be a GeoJSON object,
// meaning FeatureCollection, a Feature or a geometry object.
var topology = function(objects, quantization) {
  var bbox = bounds(objects = geometry(objects)),
      transform = quantization > 0 && bbox && prequantize(objects, bbox, quantization),
      topology = dedup(cut(extract(objects))),
      coordinates = topology.coordinates,
      indexByArc = hashmap(topology.arcs.length * 1.4, hashArc, equalArc);

  objects = topology.objects; // for garbage collection
  topology.bbox = bbox;
  topology.arcs = topology.arcs.map(function(arc, i) {
    indexByArc.set(arc, i);
    return coordinates.slice(arc[0], arc[1] + 1);
  });

  delete topology.coordinates;
  coordinates = null;

  function indexGeometry(geometry$$1) {
    if (geometry$$1 && indexGeometryType.hasOwnProperty(geometry$$1.type)) indexGeometryType[geometry$$1.type](geometry$$1);
  }

  var indexGeometryType = {
    GeometryCollection: function(o) { o.geometries.forEach(indexGeometry); },
    LineString: function(o) { o.arcs = indexArcs(o.arcs); },
    MultiLineString: function(o) { o.arcs = o.arcs.map(indexArcs); },
    Polygon: function(o) { o.arcs = o.arcs.map(indexArcs); },
    MultiPolygon: function(o) { o.arcs = o.arcs.map(indexMultiArcs); }
  };

  function indexArcs(arc) {
    var indexes = [];
    do {
      var index = indexByArc.get(arc);
      indexes.push(arc[0] < arc[1] ? index : ~index);
    } while (arc = arc.next);
    return indexes;
  }

  function indexMultiArcs(arcs) {
    return arcs.map(indexArcs);
  }

  for (var key in objects) {
    indexGeometry(objects[key]);
  }

  if (transform) {
    topology.transform = transform;
    topology.arcs = delta(topology.arcs);
  }

  return topology;
};

function hashArc(arc) {
  var i = arc[0], j = arc[1], t;
  if (j < i) t = i, i = j, j = t;
  return i + 31 * j;
}

function equalArc(arcA, arcB) {
  var ia = arcA[0], ja = arcA[1],
      ib = arcB[0], jb = arcB[1], t;
  if (ja < ia) t = ia, ia = ja, ja = t;
  if (jb < ib) t = ib, ib = jb, jb = t;
  return ia === ib && ja === jb;
}

var prune = function(topology) {
  var oldObjects = topology.objects,
      newObjects = {},
      oldArcs = topology.arcs,
      oldArcsLength = oldArcs.length,
      oldIndex = -1,
      newIndexByOldIndex = new Array(oldArcsLength),
      newArcsLength = 0,
      newArcs,
      newIndex = -1,
      key;

  function scanGeometry(input) {
    switch (input.type) {
      case "GeometryCollection": input.geometries.forEach(scanGeometry); break;
      case "LineString": scanArcs(input.arcs); break;
      case "MultiLineString": input.arcs.forEach(scanArcs); break;
      case "Polygon": input.arcs.forEach(scanArcs); break;
      case "MultiPolygon": input.arcs.forEach(scanMultiArcs); break;
    }
  }

  function scanArc(index) {
    if (index < 0) index = ~index;
    if (!newIndexByOldIndex[index]) newIndexByOldIndex[index] = 1, ++newArcsLength;
  }

  function scanArcs(arcs) {
    arcs.forEach(scanArc);
  }

  function scanMultiArcs(arcs) {
    arcs.forEach(scanArcs);
  }

  function reindexGeometry(input) {
    var output;
    switch (input.type) {
      case "GeometryCollection": output = {type: "GeometryCollection", geometries: input.geometries.map(reindexGeometry)}; break;
      case "LineString": output = {type: "LineString", arcs: reindexArcs(input.arcs)}; break;
      case "MultiLineString": output = {type: "MultiLineString", arcs: input.arcs.map(reindexArcs)}; break;
      case "Polygon": output = {type: "Polygon", arcs: input.arcs.map(reindexArcs)}; break;
      case "MultiPolygon": output = {type: "MultiPolygon", arcs: input.arcs.map(reindexMultiArcs)}; break;
      default: return input;
    }
    if (input.id != null) output.id = input.id;
    if (input.bbox != null) output.bbox = input.bbox;
    if (input.properties != null) output.properties = input.properties;
    return output;
  }

  function reindexArc(oldIndex) {
    return oldIndex < 0 ? ~newIndexByOldIndex[~oldIndex] : newIndexByOldIndex[oldIndex];
  }

  function reindexArcs(arcs) {
    return arcs.map(reindexArc);
  }

  function reindexMultiArcs(arcs) {
    return arcs.map(reindexArcs);
  }

  for (key in oldObjects) {
    scanGeometry(oldObjects[key]);
  }

  newArcs = new Array(newArcsLength);

  while (++oldIndex < oldArcsLength) {
    if (newIndexByOldIndex[oldIndex]) {
      newIndexByOldIndex[oldIndex] = ++newIndex;
      newArcs[newIndex] = oldArcs[oldIndex];
    }
  }

  for (key in oldObjects) {
    newObjects[key] = reindexGeometry(oldObjects[key]);
  }

  return {
    type: "Topology",
    bbox: topology.bbox,
    transform: topology.transform,
    objects: newObjects,
    arcs: newArcs
  };
};

var filter = function(topology, filter) {
  var oldObjects = topology.objects,
      newObjects = {},
      key;

  if (filter == null) filter = filterTrue;

  function filterGeometry(input) {
    var output, arcs;
    switch (input.type) {
      case "Polygon": {
        arcs = filterRings(input.arcs);
        output = arcs ? {type: "Polygon", arcs: arcs} : {type: null};
        break;
      }
      case "MultiPolygon": {
        arcs = input.arcs.map(filterRings).filter(filterIdentity);
        output = arcs.length ? {type: "MultiPolygon", arcs: arcs} : {type: null};
        break;
      }
      case "GeometryCollection": {
        arcs = input.geometries.map(filterGeometry).filter(filterNotNull);
        output = arcs.length ? {type: "GeometryCollection", geometries: arcs} : {type: null};
        break;
      }
      default: return input;
    }
    if (input.id != null) output.id = input.id;
    if (input.bbox != null) output.bbox = input.bbox;
    if (input.properties != null) output.properties = input.properties;
    return output;
  }

  function filterRings(arcs) {
    return arcs.length && filterExteriorRing(arcs[0]) // if the exterior is small, ignore any holes
        ? [arcs[0]].concat(arcs.slice(1).filter(filterInteriorRing))
        : null;
  }

  function filterExteriorRing(ring) {
    return filter(ring, false);
  }

  function filterInteriorRing(ring) {
    return filter(ring, true);
  }

  for (key in oldObjects) {
    newObjects[key] = filterGeometry(oldObjects[key]);
  }

  return prune({
    type: "Topology",
    bbox: topology.bbox,
    transform: topology.transform,
    objects: newObjects,
    arcs: topology.arcs
  });
};

function filterTrue() {
  return true;
}

function filterIdentity(x) {
  return x;
}

function filterNotNull(geometry) {
  return geometry.type != null;
}

var filterAttached = function(topology) {
  var ownerByArc = new Array(topology.arcs.length), // arc index -> index of unique associated ring, or -1 if used by multiple rings
      ownerIndex = 0,
      key;

  function testGeometry(o) {
    switch (o.type) {
      case "GeometryCollection": o.geometries.forEach(testGeometry); break;
      case "Polygon": testArcs(o.arcs); break;
      case "MultiPolygon": o.arcs.forEach(testArcs); break;
    }
  }

  function testArcs(arcs) {
    for (var i = 0, n = arcs.length; i < n; ++i, ++ownerIndex) {
      for (var ring = arcs[i], j = 0, m = ring.length; j < m; ++j) {
        var arc = ring[j];
        if (arc < 0) arc = ~arc;
        var owner = ownerByArc[arc];
        if (owner == null) ownerByArc[arc] = ownerIndex;
        else if (owner !== ownerIndex) ownerByArc[arc] = -1;
      }
    }
  }

  for (key in topology.objects) {
    testGeometry(topology.objects[key]);
  }

  return function(ring) {
    for (var j = 0, m = ring.length, arc; j < m; ++j) {
      if (ownerByArc[(arc = ring[j]) < 0 ? ~arc : arc] === -1) {
        return true;
      }
    }
    return false;
  };
};

function planarTriangleArea(triangle) {
  var a = triangle[0], b = triangle[1], c = triangle[2];
  return Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1])) / 2;
}

function planarRingArea$1(ring) {
  var i = -1, n = ring.length, a, b = ring[n - 1], area = 0;
  while (++i < n) a = b, b = ring[i], area += a[0] * b[1] - a[1] * b[0];
  return Math.abs(area) / 2;
}

var filterWeight = function(topology, minWeight, weight) {
  minWeight = minWeight == null ? Number.MIN_VALUE : +minWeight;

  if (weight == null) weight = planarRingArea$1;

  return function(ring, interior) {
    return weight(feature(topology, {type: "Polygon", arcs: [ring]}).geometry.coordinates[0], interior) >= minWeight;
  };
};

var filterAttachedWeight = function(topology, minWeight, weight) {
  var a = filterAttached(topology),
      w = filterWeight(topology, minWeight, weight);
  return function(ring, interior) {
    return a(ring, interior) || w(ring, interior);
  };
};

function compare(a, b) {
  return a[1][2] - b[1][2];
}

var newHeap = function() {
  var heap = {},
      array = [],
      size = 0;

  heap.push = function(object) {
    up(array[object._ = size] = object, size++);
    return size;
  };

  heap.pop = function() {
    if (size <= 0) return;
    var removed = array[0], object;
    if (--size > 0) object = array[size], down(array[object._ = 0] = object, 0);
    return removed;
  };

  heap.remove = function(removed) {
    var i = removed._, object;
    if (array[i] !== removed) return; // invalid request
    if (i !== --size) object = array[size], (compare(object, removed) < 0 ? up : down)(array[object._ = i] = object, i);
    return i;
  };

  function up(object, i) {
    while (i > 0) {
      var j = ((i + 1) >> 1) - 1,
          parent = array[j];
      if (compare(object, parent) >= 0) break;
      array[parent._ = i] = parent;
      array[object._ = i = j] = object;
    }
  }

  function down(object, i) {
    while (true) {
      var r = (i + 1) << 1,
          l = r - 1,
          j = i,
          child = array[j];
      if (l < size && compare(array[l], child) < 0) child = array[j = l];
      if (r < size && compare(array[r], child) < 0) child = array[j = r];
      if (j === i) break;
      array[child._ = i] = child;
      array[object._ = i = j] = object;
    }
  }

  return heap;
};

function copy(point) {
  return [point[0], point[1], 0];
}

var presimplify = function(topology, weight) {
  var point = topology.transform ? transform(topology.transform) : copy,
      heap = newHeap();

  if (weight == null) weight = planarTriangleArea;

  var arcs = topology.arcs.map(function(arc) {
    var triangles = [],
        maxWeight = 0,
        triangle,
        i,
        n;

    arc = arc.map(point);

    for (i = 1, n = arc.length - 1; i < n; ++i) {
      triangle = [arc[i - 1], arc[i], arc[i + 1]];
      triangle[1][2] = weight(triangle);
      triangles.push(triangle);
      heap.push(triangle);
    }

    // Always keep the arc endpoints!
    arc[0][2] = arc[n][2] = Infinity;

    for (i = 0, n = triangles.length; i < n; ++i) {
      triangle = triangles[i];
      triangle.previous = triangles[i - 1];
      triangle.next = triangles[i + 1];
    }

    while (triangle = heap.pop()) {
      var previous = triangle.previous,
          next = triangle.next;

      // If the weight of the current point is less than that of the previous
      // point to be eliminated, use the latter’s weight instead. This ensures
      // that the current point cannot be eliminated without eliminating
      // previously- eliminated points.
      if (triangle[1][2] < maxWeight) triangle[1][2] = maxWeight;
      else maxWeight = triangle[1][2];

      if (previous) {
        previous.next = next;
        previous[2] = triangle[2];
        update(previous);
      }

      if (next) {
        next.previous = previous;
        next[0] = triangle[0];
        update(next);
      }
    }

    return arc;
  });

  function update(triangle) {
    heap.remove(triangle);
    triangle[1][2] = weight(triangle);
    heap.push(triangle);
  }

  return {
    type: "Topology",
    bbox: topology.bbox,
    objects: topology.objects,
    arcs: arcs
  };
};

var quantile = function(topology, p) {
  var array = [];

  topology.arcs.forEach(function(arc) {
    arc.forEach(function(point) {
      if (isFinite(point[2])) { // Ignore endpoints, whose weight is Infinity.
        array.push(point[2]);
      }
    });
  });

  return array.length && quantile$1(array.sort(descending), p);
};

function quantile$1(array, p) {
  if (!(n = array.length)) return;
  if ((p = +p) <= 0 || n < 2) return array[0];
  if (p >= 1) return array[n - 1];
  var n,
      h = (n - 1) * p,
      i = Math.floor(h),
      a = array[i],
      b = array[i + 1];
  return a + (b - a) * (h - i);
}

function descending(a, b) {
  return b - a;
}

var simplify = function(topology, minWeight) {
  minWeight = minWeight == null ? Number.MIN_VALUE : +minWeight;

  // Remove points whose weight is less than the minimum weight.
  var arcs = topology.arcs.map(function(input) {
    var i = -1,
        j = 0,
        n = input.length,
        output = new Array(n), // pessimistic
        point;

    while (++i < n) {
      if ((point = input[i])[2] >= minWeight) {
        output[j++] = [point[0], point[1]];
      }
    }

    output.length = j;
    return output;
  });

  return {
    type: "Topology",
    transform: topology.transform,
    bbox: topology.bbox,
    objects: topology.objects,
    arcs: arcs
  };
};

var pi = Math.PI;
var tau = 2 * pi;
var quarterPi = pi / 4;
var radians = pi / 180;
var abs = Math.abs;
var atan2 = Math.atan2;
var cos = Math.cos;
var sin = Math.sin;

function halfArea(ring, closed) {
  var i = 0,
      n = ring.length,
      sum = 0,
      point = ring[closed ? i++ : n - 1],
      lambda0, lambda1 = point[0] * radians,
      phi1 = (point[1] * radians) / 2 + quarterPi,
      cosPhi0, cosPhi1 = cos(phi1),
      sinPhi0, sinPhi1 = sin(phi1);

  for (; i < n; ++i) {
    point = ring[i];
    lambda0 = lambda1, lambda1 = point[0] * radians;
    phi1 = (point[1] * radians) / 2 + quarterPi;
    cosPhi0 = cosPhi1, cosPhi1 = cos(phi1);
    sinPhi0 = sinPhi1, sinPhi1 = sin(phi1);

    // Spherical excess E for a spherical triangle with vertices: south pole,
    // previous point, current point.  Uses a formula derived from Cagnoli’s
    // theorem.  See Todhunter, Spherical Trig. (1871), Sec. 103, Eq. (2).
    // See https://github.com/d3/d3-geo/blob/master/README.md#geoArea
    var dLambda = lambda1 - lambda0,
        sdLambda = dLambda >= 0 ? 1 : -1,
        adLambda = sdLambda * dLambda,
        k = sinPhi0 * sinPhi1,
        u = cosPhi0 * cosPhi1 + k * cos(adLambda),
        v = k * sdLambda * sin(adLambda);
    sum += atan2(v, u);
  }

  return sum;
}

function sphericalRingArea(ring, interior) {
  var sum = halfArea(ring, true);
  if (interior) sum *= -1;
  return (sum < 0 ? tau + sum : sum) * 2;
}

function sphericalTriangleArea(t) {
  return abs(halfArea(t, false)) * 2;
}

exports.bbox = bbox;
exports.feature = feature;
exports.mesh = mesh;
exports.meshArcs = meshArcs;
exports.merge = merge;
exports.mergeArcs = mergeArcs;
exports.neighbors = neighbors;
exports.quantize = quantize;
exports.transform = transform;
exports.untransform = untransform;
exports.topology = topology;
exports.filter = filter;
exports.filterAttached = filterAttached;
exports.filterAttachedWeight = filterAttachedWeight;
exports.filterWeight = filterWeight;
exports.planarRingArea = planarRingArea$1;
exports.planarTriangleArea = planarTriangleArea;
exports.presimplify = presimplify;
exports.quantile = quantile;
exports.simplify = simplify;
exports.sphericalRingArea = sphericalRingArea;
exports.sphericalTriangleArea = sphericalTriangleArea;

Object.defineProperty(exports, '__esModule', { value: true });

})));

define('templates',[],function() {

var templates = {};

templates['jst'] = {};

templates['jst']['small-multiple'] = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="multiple-map '+
((__t=( className ))==null?'':__t)+
'">\n  <p class="name">'+
((__t=( cityName ))==null?'':__t)+
'</p>\n  <div class="map-canvas">\n    <img src="'+
((__t=( asset_path ))==null?'':__t)+
'imgs/img'+
((__t=( id ))==null?'':__t)+
'.png">\n    <div class="point-wrap">\n      <div class="point"></div>\n    </div>\n  </div>\n  <p class="question">'+
((__t=( question ))==null?'':__t)+
'</p>\n  <p class="answer">'+
((__t=( answer ))==null?'':__t)+
'</p>\n</div>\n';
}
return __p;
}

return templates;

});
require([
  '_nytg/2017-10-19-dialect-quiz-nyt5/assets',
  '_nytg/2017-10-19-dialect-quiz-nyt5/big-assets',
  'jquery/nyt',
  'underscore/1.6',
  'foundation/views/page-manager',
  'lib/text-balancer',
  'd3/3',
  'node_modules/topojson/dist/topojson',
  'templates',
], function(NYTG_ASSETS, NYTG_BIG_ASSETS, $, _, PageManager, balanceText, d3, topojson, templates) {

  // var checkExist = setInterval(function() {
  //   if (window && window.userXhrObject) {
  //     if (window.userXhrObject.readyState == XMLHttpRequest.DONE) {
  //       clearInterval(checkExist)
  //       var response = JSON.parse(window.userXhrObject.responseText)
  //       render(response)
  //     }
  //   }
  // }, 100); // check every 100ms

  // IMPORTANT CONFIG FOR SHARE LINKS
  var allowShareLinks = true;

  // function render(response) {
    // var userInfo = response.data.user.userInfo
    // var isLoggedIn = userInfo && Boolean(userInfo.regiId > 0)

    // Initialize variables
    var isMobile = innerWidth < 765,
        $c = $('#nytg-dialect-graphic'),
        ie = $c.hasClass('ie'),
        $mapCanvas = $c.find('#map-canvas'),
        $multiples = $c.find('#smallMultiples'),
        count = 0,
        params = getParameters(window.location.href),
        clickEvent = mobile_browser ? 'click' : 'click', // touchstart
        stopCount = params && params['count'] ? Number(params['count']) : 25, // total questions
        numCities = 3, // total cities to display
        projection,
        pointRatio = 150,
        pixelRatio = window.devicePixelRatio || 1, // double the canvas size and scale down on retina
        mapWidth = $c.width(),
        mapHeight = mapWidth * .53,
        mapMargin = { top: .03, bottom: .054, left: .11, right: .11 },
        mapScaler = 1.08,
        strokeStyle = '#bbb',
        lineWidth = 1 * pixelRatio,
        cityRadius = 3 * pixelRatio,
        fontLineWidth = 3 * pixelRatio,
        canvasFont = pixelRatio === 2 ? '500 21px "nyt-franklin","helvetica",arial' : '500 14px "nyt-franklin","helvetica",arial',
        textHeight = mapWidth < 500 ? 10 * pixelRatio : 14 * pixelRatio, // on mobile, text height of 10
        fontStrokeStyle = 'rgba(255, 255, 255, 0.85)',
        // ColorBrewer RdYlBu[11]
        colors = ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
        currentQ,
        questionBank = [],
        questionData = [[0,8,12,17,22,26,31,34,36,45,57,66,73,84,90,98,109,123,132,142,151,158,165,171,178,186,191,201,211,220,228,237],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
        choiceData,
        pointsData,
        geoData,
        responses,
        answers = [],
        simData,
        simServer = 'https://www.nytimes.com/svc/int/dialects', //http://www.nytimes.com/svc/int/dialect
        thisRoot = window.location.hostname === 'localhost' ? 'https://preview.nyt.net/preview/2017-10-19-dialect-quiz-nyt5/master/' : window.location.href.split('?')[0], // root url
        refer,
        CODE_CHARS = "0123456789bcdfghjklmnpqrstuvwxyz",  // removed vowels aeio
        CODE_BITS = 5;   // 5 bits means we need 2^5 == 32 unique chars

    // setup map
    $c.find('.map-container, #map-canvas')
      .width(mapWidth)

    // cache everything
    $.ajaxSetup({ cache: true });

    // get map geography
    function getGeo(fn) {
      d3.csv(NYTG_ASSETS + 'points.csv', function(d) {
        pointsData = d;
        d3.json(NYTG_ASSETS + 'us-nocounties.json', function(d) {
          geoData = d;
          if (fn && typeof fn === 'function' ) {
            fn();
            $c.find('#preloader')
              .fadeTo(850,0,function() { $(this).remove() });
          }
        });
      });
    }

    // kick it off
    function init() {
      if ( params && params['r'] && allowShareLinks ) {
        refer = decodeToBinaryString(params['r']).split('');
        $c.addClass('refer');
      } else {

        $c.find('.quiz-container')
          .fadeTo(1000, 1);
        getGeo();
      }
      loadQuiz();
      setEvents();
      // if ( !isMobile ) addAd();
    }
    init();

    function addAd() {
      $('#masthead').after('<div id="g-ad"></div>');
      $('#g-ad').html('<iframe src="http://www.nytimes.com/packages/html/multimedia/ENTERPRISE-TEMPLATE-ADS/leaderboard-us-national-bare.html" width="100%" height="105" frameborder="0" scrolling="no"></iframe>');
    }

    function setEvents() {

      // quiz events
      // choice selected, change the look
      $c.find('#response').on(clickEvent, '.choice', function(e) {
        e.preventDefault();
        // if (!isLoggedIn) {return};
        $('.quiz-container ').addClass('selected');
        $(this).addClass('active')
               .siblings().removeClass('active');
      })

      // Control response input
      $c.find('#submit-btn').on(clickEvent, function(e) {
        e.preventDefault();
        var value = $c.find('#response').find('.active').data('value');
        if (value === null || value === undefined) {return};
        // if (!isLoggedIn) {return};
        choice = questionData[0][currentQ] + Number(value);
        responses[choice] = 1;

        // Remove old question from questionBank; choose new question
        questionBank.splice(questionBank.indexOf(currentQ), 1);
        currentQ = questionBank[Math.floor(Math.random()*questionBank.length)];
        count++;
        if (count < stopCount)
          updateResult(choice);
        loadQuestion();
      });

      // flip city display
      $c.find('.city-btn').on(clickEvent, function(e) {
        e.preventDefault();

        var type = $(this).data('type');

        $c.find('.city-btn.' + type + '-similar').addClass('hidden-btn')
          .siblings('.city-btn')
          .removeClass('hidden-btn');

        $c.find('.modifier')
          .html( type );

        var canvas = document.getElementById('simMap'),
            cities = $(this).data('cities');

        drawCities(canvas, cities);
      });

      // launch quiz
      $c.find('.launch-quiz').on(clickEvent, function(e) {
        e.preventDefault();
        loadQuizFromMap();
      })

      // share btns
      $c.find('.share-btn').on(clickEvent, function(e) {
        e.preventDefault();

        if ( $(this).is('.clicked.link') && $(this).siblings('.copy-url').length > 0 ) {
          removeUrlInput();
          return;
        } else if ( $(this).not('.link') ) {
          removeUrlInput();
        }

        $(this).addClass('clicked')
               .siblings('.share-btn')
               .removeClass('clicked');

        if ( $(this).data('url') ) {
          doShare();
        } else {
          getShortUrl();
        }
      })

      // detect window resize on mobile
      window.addEventListener("orientationchange", function() {
        if ( ( count === stopCount || refer ) && mobile_browser) {
          var width = Math.min(mapWidth, $c.width()),
              height = (mapHeight/mapWidth)*width,

              canvas = document.getElementById('simMap');
          $(canvas)
            .attr('width', width*pixelRatio)
            .attr('height', height*pixelRatio);

          cities = $c.find('.city-btn.hidden-btn')
                     .data('cities');

          // setup map
          $c.find('.map-container, #map-canvas')
            .width(width);

          $c.find('.map-canvas-wrap')
            .height(height);

          $c.find('#map-canvas')
            .height(height*pixelRatio);

          projection = nytAlbersUsa()
            .scale(mapScaler*width*pixelRatio)
            .translate([width*pixelRatio / 2, height*pixelRatio / 2]);

          drawMap(canvas, cities);
        };
      }, false);
    }

    // Load data
    function loadQuiz() {
      var qNum = questionData[0].length;
      for (var i = 0; i < qNum; ++i) {
        questionBank.push(i)
      };
      //currentQ = questionBank[Math.floor(Math.random()*qNum)];
      currentQ = 8;

      responses = questionData[1];
      $.getJSON(NYTG_ASSETS + 'answers.json').done(function (data) {
        choiceData = data;
        if ( refer ) {
          responses = refer;
          getGeo(surveyEnd); // call surveyEnd after geo load
          //surveyEnd();
        } else {
          loadQuestion();
        }
      });
    }

    // load quiz from map view
    function loadQuizFromMap() {

      // reset arrays and nullify refer
      responses = questionData[1];
      answers = [];
      refer = undefined;

      // fade out map and fade in quiz
      $c.find('.map-container')
        .fadeTo(400, 0, function() {
          $(this).hide();
          $c.removeClass('refer')
            .find('.quiz-container')
            .fadeTo(350,1);
          loadQuestion();
        })
    }

    // previous question result
    function updateResult(value) {

      var $qResult = $c.find('.question-result')

      if ( $qResult.hasClass('active') ) {
        $qResult.find('.result-wrap')
                .fadeTo(0,0)
                .delay(300)
                .fadeTo(450,1)
      } else {
        $c.find('.quiz-container').addClass('started');
      }

      $qResult
        .addClass('active')
        .find('.subhead')
        .html( $c.find('#question').html() );

      $qResult.find('.answer')
              .html( $c.find('.choice.active .choice-label').html() );

      // map image
      $qResult.find('.map-img')
              .html('<img src="' + NYTG_BIG_ASSETS + 'imgs/img' + value + '.png">');
    }

    // new question
    function loadQuestion() {

      var responseData = choiceData[1][currentQ],
          displayCount = count + 1;

      if (count === stopCount) {
        // quiz done, show results
        surveyEnd();
        return;
      } else if ( count === stopCount - 1 ) {
        // change next button to say submit
        $c.find('#submit-btn').html('Submit');
      }

      // deselect and fade in
      $c.find('.quiz-container')
        .removeClass('selected');

      // question kicker
      $c.find('#question-count')
        .html('Question ' + displayCount + ' of ' + stopCount);

      // new question
      $c.find('#question')
        .html(choiceData[0][currentQ]);

      // clear out choices
      form = d3.select('.choices').html('');

      // add choices
      var choice = form.selectAll('.choice')
                       .data(responseData)
                       .enter()
                       .append('a')
                       .attr({
                         'href'      : '#',
                         'class'     : 'choice nytg-cf',
                         'data-value': function(d, i) {return i}
                       });

      // checkbox
      choice.append('span')
            .attr({
              'class' : 'checkbox'
            })
            .html('&times;');

      // choice label
      choice.append('p')
            .attr({
              'class' : 'choice-label'
            })
            .html(String);
    }

    

    function surveyEnd() {
      // fade out survey holder
      $c.find('.quiz-container')
        .fadeTo(500, 0, function() {
          $(this).hide();

          // fade in the map holder
          $('.map-container').fadeTo(650,1);
        })

      // bring back map preloader
      $c.find('#map-preloader').show();

      // get answer indices
      $.each(responses, function(k,v) {
        if ( v == '1' )
          answers.push(k);
      })

      // Calculate similarity values
      $.post(simServer, { a: responses.join(',') }, showResults, "json")
       .fail(function(response) {
        console.log("fail", response)
         try {
           var parsed = JSON.parse(response.responseText);
           showResults(parsed);
         } catch(e) {
           var url = thisRoot + '?r=' + encodeFromBinaryString(responses.join(''));
           $c.find('#map-preloader').html('Sorry, an error has occurred. Keep <a href="' + url + '">this link</a> to save your answers and view your map later.');
         }
       })
    }

    function showResults(simdata) {
      
      if ( simdata[0][0] === null && simdata[0][simdata[0].length-1] === null ) {
        // skip showing the map if the return is an error
        // load quiz instead
        loadQuizFromMap();
        return;
      }

      // Map values to colors
      var colorN = colors.length;
      valRange = [d3.min(simdata[0]), d3.max(simdata[0])];
      var dx = (valRange[1] - valRange[0])/colorN;
      var valDom = [valRange[0]];
      for (var i = 1; i < colorN; ++i) {
        valDom.push(valRange[0] + i*dx)
      };

      color = d3.scale.linear()
                .domain(valDom)
                .range(colors)
                .interpolate(d3.interpolateRgb);

      // Add map
      var width = Math.min(mapWidth, $('#map-canvas').width()),
          height = (mapHeight/mapWidth)*width;

      // define projection
      projection = nytAlbersUsa()
        .scale(mapScaler*width*pixelRatio)
        .translate([width*pixelRatio / 2, height*pixelRatio / 2]);

      $c.find('canvas').remove();

      var canvas = document.createElement('canvas');
      if ( ie )
        G_vmlCanvasManager.initElement(canvas);

      $c.find('#map-canvas')
        .html(canvas);

      $c.find('.map-canvas-wrap')
        .height(height);

      $(canvas)
        .attr('id', 'simMap')
        .attr('width', width*pixelRatio)
        .attr('height', height*pixelRatio)
        .attr('viewBox', '0 0 ' + width*pixelRatio + ' ' + height*pixelRatio)
        .attr('preserveAspectRatio', 'xMidYMid');

      // define data
      simData = simdata[0];

      console.log(simData)

      var cities = simdata[1],
          len = cities.length,
          leastSimilar = cities.slice(0, numCities),
          mostSimilar = cities.slice(len - numCities, len + 1).reverse(); // similar cities

      $c.find('.city-btn.most-similar')
        .addClass('hidden-btn')
        .data('cities', mostSimilar)
        .siblings('.least-similar')
        .removeClass('hidden-btn')
        .data('cities', leastSimilar);

      drawMap(canvas, mostSimilar);
    }

    function drawMap(canvas, cities) {

      $c.find('#map-preloader').fadeTo(650,0);

      var width = canvas.width,
          height = canvas.height,
          pointSize = Math.round(width/pointRatio*pixelRatio),
          ctx = canvas.getContext('2d'),
          landPath = topojson.mesh(geoData, geoData.objects.land),
          path = d3.geo.path()
                   .projection(projection)
                   .context(ctx);

      // clear canvas
      ctx.scale(1/pixelRatio, 1/pixelRatio);
      ctx.clearRect( 0, 0, width, height );
      ctx.webkitImageSmoothingEnabled = true;

      // define clipping path
      ctx.lineJoin = 'round';
      ctx.save();
      ctx.beginPath();
      path(landPath);
      ctx.clip();

      // points
      ctx.lineWidth = 0;
      pointsData.map(function (d, i) {
        var ll = projection([d.lon, d.lat]),
            x = ll[0],
            y = ll[1];

        ctx.fillStyle = color(simData[i]);
        ctx.beginPath();
        // fix ak and hi on safari
        if ( d.lat > 50 || d.lon < -140) {
          ctx.arc(x, y, pointSize/1.5, 2*Math.PI, false);
          ctx.fill();
        } else {
          ctx.fillRect(x - pointSize/2, y - pointSize/2, pointSize, pointSize);
        }
      });

      ctx.restore();
      ctx.strokeStyle = strokeStyle;

      // State boundaries
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      path(topojson.mesh(geoData, geoData.objects.states, function(a, b) { return a !== b; }));
      ctx.stroke();
      ctx.closePath();

      // Outer boundary
      ctx.beginPath();
      path(landPath);
      //ctx.rect(width, 0, -width, height);    // Draw outer rectangle for clipping to boundary
      ctx.stroke();
      //ctx.fill();
      ctx.closePath();

      if ( cities ) {
        drawCities(canvas, cities);
      }
    }

    function drawCities(canvas, cities) {

      var ctx = canvas.getContext('2d'),
          width = canvas.width,
          height = canvas.height,
          $labels = $c.find('.map-labels');

      // smooth transition
      $labels.fadeTo(250,0, function() {
        $(this).html('')
               .fadeTo(400,1);
      })
      $c.find('#smallMultiples').fadeTo(250,0, function() {
        $(this).fadeTo(400,1);

        var textPoints = [],
            miniPoints = [],
            padX = 3,
            padY = 2;

        ctx.strokeStyle = fontStrokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.font = canvasFont;
        $multiples.html('');

        // making points
        $.each(cities, function(k,v) {
          var ll = pointsData[v[0]];
          textPoints.push( projection([ll.lon, ll.lat]) );
        });

        // determining bounds
        var minX = d3.min(textPoints, function(d) { return d[0] }),
            minY = d3.min(textPoints, function(d) { return d[1] }),
            maxX = d3.max(textPoints, function(d) { return d[0] }),
            maxY = d3.max(textPoints, function(d) { return d[1] });

        // return label offset for positioning
        function getOffset(x,y,w) {
          var offset = {x:0,y:0};

          if ( x === minX ) { // left
            //console.log('left');
            offset.x = -w - cityRadius - padX;
          } else {
            //console.log('right');
            offset.x = cityRadius + padX;
          }

          if ( y === maxY ) { // bottom
            //console.log('bottom');
            offset.y = textHeight / 2 + padY;
          } else if ( y === minY ) { // top
            //console.log('top');
            offset.y = -cityRadius - padY;
          } else if ( y >= maxY - cityRadius*2 ) { // middle up
            //console.log('middle up');
            offset.y = -padY;
          } else if ( y <= minY + cityRadius*2 ) { // middle down
            //console.log('middle down');
            offset.y = textHeight + padY;
          } else { // middle align
            //console.log('middle align');
            offset.y = textHeight/2 - padY;
          }

          if ( x !== minX && x !== maxX && y === maxY ) { // bottom middle
            //console.log('bottom middle');
            offset.x = -w/2;
            offset.y = textHeight + cityRadius + padY;
          } else if ( x !== minX && x !== maxX && ( y <= minY + cityRadius ) ) { // top middle
            //console.log('top middle');
            offset.x = -w/2;
            offset.y = -textHeight/2 - padY;
          }

          return offset;
        }

        // draw points and labels
        $.each(cities, function(k,v) {

          var x = textPoints[k][0],
              y = textPoints[k][1],
              textWidth = ctx.measureText(v[1]).width,
              offset = getOffset(x,y,textWidth);

          // html cities
          var $point = $('<div class="point"></div>');
          $point.css({
            left: x / pixelRatio,
            top: y / pixelRatio
          });
          $labels.append($point);

          var theX = x + offset.x < 0 ? // prevent overflow left
                                    0 :
                                    (x + offset.x + textWidth) / pixelRatio > width / pixelRatio ? // prevent overflow right
                                                                              width - textWidth :
                                                                              x + offset.x;

          var $text = $('<p>' + v[1] + '</p>');
          $text.css({
            left: theX / pixelRatio,
            top: (y + offset.y - textHeight) / pixelRatio
          });
          $labels.append($text);

          // do small multiples
          $c.find('.multiple-label').fadeTo(500,1);
          var type = $c.find('.city-btn.hidden-btn').data('type'),
              defining = type === 'least' ? d3.min(v[3]) : d3.max(v[3]),
              definingIndex = v[3].indexOf(defining), // min or max value in the city's choice similarities
              answerIndex = answers[definingIndex], // choice index
              questionIndex;

          // find question index
          $.each(questionData[0], function(k,v) {
            if ( Number(v) > Number(answerIndex)) {
              questionIndex = k-1;
              return false;
            } else {
              questionIndex = k;
            }
          });

          var answerLocalIndex = answerIndex - questionData[0][questionIndex], // index within its set of choices
              mult = templates.jst['small-multiple']({
                asset_path: NYTG_BIG_ASSETS,
                className: k === cities.length-1 ? 'last' : '',
                cityName: v[1],
                id: answerIndex,
                question: choiceData[0][questionIndex],
                answer: choiceData[1][questionIndex][answerLocalIndex]
              });

          $multiples.append(mult);

          var scaledWidth = width/pixelRatio,
              scaledHeight = height/pixelRatio,
              margin = {
                top: mapMargin.top*scaledHeight,
                bottom: mapMargin.bottom*scaledHeight,
                left: mapMargin.left*scaledWidth,
                right: mapMargin.right*scaledWidth
              },
              mX = (x / pixelRatio-margin.left) / (scaledWidth-margin.left-margin.right), // accounting for padding
              mY = (y / pixelRatio-margin.top) / (scaledHeight-margin.top-margin.bottom)

          $multiples.find('.point')
                    .last()
                    .css({
                      left: mX*100+'%',
                      top: mY*100+'%'
                    })

        });
      });
    };

    // See http://graphics8.nytimes.com/newsgraphics/2013/01/04/north-dakota/1f88aeb1dcbf7916b9650f65863f72bf25537a70/lib/nyt-albers-usa.js
    function nytAlbersUsa() {
      var lower48 = d3.geo.albers().rotate([96, 0]).center([0, 38]).parallels([29.5, 45.5]),
          alaska = d3.geo.albers().rotate([160, 0, -35]).center([45, 44]).parallels([55, 65]),
          hawaii = d3.geo.albers().rotate([160, 0]).center([0, 20]).parallels([8, 18]);

      function nytAlbersUsa(coordinates) {
        return projection(coordinates)(coordinates);
      }

      function projection(point) {
        var lon = point[0], lat = point[1];
        return lat > 50 ? alaska : lon < -140 ? hawaii : lower48;
      }

      nytAlbersUsa.point = function(coordinates, context) {
        return projection(coordinates).point(coordinates, context);
      };

      nytAlbersUsa.line = function(coordinates, context) {
        return projection(coordinates[0]).line(coordinates, context);
      };

      nytAlbersUsa.polygon = function(coordinates, context) {
        return projection(coordinates[0].x).polygon(coordinates, context);
      };

      nytAlbersUsa.scale = function(x) {
        if (!arguments.length) return lower48.scale();
        lower48.scale(x);
        alaska.scale(x * .35);
        hawaii.scale(x);
        return nytAlbersUsa.translate(lower48.translate());
      };

      nytAlbersUsa.translate = function(x) {
        var k = lower48.scale();
        if (!arguments.length) {
          x = lower48.translate();
          return [x[0] - .007 * k, x[1] - .007 * k];
        }
        lower48.translate([x[0] + .0075 * k, x[1] + .0065 * k]);
        alaska.translate([x[0] - .307 * k, x[1] + .187 * k]);
        hawaii.translate([x[0] - .206 * k, x[1] + .196 * k]);
        return nytAlbersUsa;
      };

      return nytAlbersUsa.scale(1056).translate([480, 250]);
    }

    // shorten url
    function getShortUrl() {
      var url = thisRoot + '?r=' + encodeFromBinaryString(responses.join(''));
      $.ajax({
        url : 'https://www.nytimes.com/svc/bitly/shorten.json?url=' + url,
        dataType : 'json',
        cache: true,
        success: function(data) {
          var shorturl = data.payload.short_url;
          $c.find('.share-btn').data('url', shorturl);
          doShare();
        },
        error: function() {
          $c.find('.share-btn').data('url', url);
          doShare();
        }
      });
    }

    // activate clicked share
    function doShare() {
      var $btn = $c.find('.share-btn.clicked'),
          url = $btn.data('url');

      if ( $btn.hasClass('link') ) {
        var copyUrl = mobile_browser ? '<p class="copy-url">' + url + '</p>' : '<input class="copy-url" type="text" value="' + url + '">';
        $btn.after(copyUrl);
        $btn.siblings('.copy-url')
            .select()
            .fadeTo(500,1)

      } else if ( $btn.hasClass('facebook') ) {
        // facebook
        var windowUrl = 'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);
        window.open(windowUrl, '_blank', 'width=600,height=400');

      } else if ( $btn.hasClass('twitter') ) {
        var cityData = $c.find('.most-similar.city-btn').data('cities');
        var tweetText = 'How Y’all, Youse and You Guys Talk: See my dialect map and make your own.';

        // twitter
        var windowUrl = 'https://twitter.com/intent/tweet?text='+ tweetText + '&via=nytgraphics&url=' + url;
        window.open(windowUrl, '_blank', 'width=600,height=400');
      }
    }

    // remove share input field
    function removeUrlInput() {
      $c.find('.share .copy-url').fadeTo(250,0,function() { $(this).remove() });
    }

    /**
     * IE lacks Array.indexOf
     */
    if (!Array.indexOf) {
      Array.prototype.indexOf = function(obj) {
        var len = this.length;
        for(var i=0; i<len; i++){
          if (this[i]==obj) {
            return i;
          }
        }
        return -1;
      };
    }

    /**
     * IE lacks Array.indexOf
     */

    if (!Array.indexOf) {
      Array.prototype.indexOf = function(obj) {
        var len = this.length;
        for(var i=0; i<len; i++){
          if (this[i]==obj) {
            return i;
          }
        }
        return -1;
      };
    }

    /**
     * Converts a string consisting of "0" and "1" characters into a more compact form.
     * Example: "011001001" -> "ci"
     */
    function encodeFromBinaryString( raw ) {
      var cooked = "";
      var raw = raw || "";

      for ( var i=0; i<raw.length; i+=CODE_BITS ) {
        var chunk = raw.substr( i, CODE_BITS );
        while( chunk.length < CODE_BITS ) {
          chunk += "0";
        }
        var idx = parseInt( chunk, 2 );
        cooked += CODE_CHARS.charAt( idx );
      }
      return cooked;
    }


    /**
     * Converts an encoded binary string back to binary form.
     * ** Caveat: The decoded string may have 1-4 trailing zeros that weren't present in the original string
     */
    function decodeToBinaryString( raw ) {
      var raw = raw || "";

      var cooked = "";
      for ( var i=0; i<raw.length; i++ ) {
        var character = raw.charAt( i );
        var idx = CODE_CHARS.indexOf( character );
        if ( idx > -1 ) {
          var binStr = idx.toString( 2 );
          while( binStr.length < CODE_BITS ) {
            binStr = "0" + binStr;
          }
          cooked += binStr;
        }
      }
      return cooked;
    }

    // Returns the paramters as an object, key=>value pairs
    function getParameters(url){
      var paramList = [], params = {}, kvPairs, tmp;
      url = (url !== '' && typeof url === 'string') ? url : document.URL;
      if(url){
        if(url.indexOf("?") !== -1){
          paramList = url.split("?")[1];
          if(paramList){
            if(paramList.indexOf("&")){
              kvPairs = paramList.split("&");
            } else {
              kvPairs = [paramList];
            }
            for(var a=0;a<kvPairs.length;a++){
              if(kvPairs[a].indexOf("=") !== -1){
                tmp = kvPairs[a].split("=");
                params[tmp[0]] = unescape(tmp[1]);
              }
            }
          }
        }
      }
      return (params) ? params : null;
    };
  // }
}); // end require
;
define("script", function(){});

