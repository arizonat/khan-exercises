define(function(require) {

require("./math-format.js");

// Temporary not really following convention file, see #160

window.numberLine = function(start, end, step, x, y, denominator) {
    step = step || 1;
    x = x || 0;
    y = y || 0;
    var decPlaces = (step + "").length - (step + "").indexOf(".") - 1;
    if ((step + "").indexOf(".") < 0) {
        decPlaces = 0;
    }
    var graph = KhanUtil.currentGraph;
    var set = graph.raphael.set();
    set.push(graph.line([x, y], [x + end - start, y]));
    set.labels = [];
    for (var i = 0; i <= end - start; i += step) {
        set.push(graph.line([x + i, y - 0.2], [x + i, y + 0.2]));

        if (denominator) {
            var base = KhanUtil.roundTowardsZero(start + i + 0.001);
            var frac = start + i - base;
            var lab = base;

            if (! (Math.abs(Math.round(frac * denominator)) === denominator || Math.round(frac * denominator) === 0)) {
                if (base === 0) {
                    lab = KhanUtil.fraction(Math.round(frac * denominator), denominator, false, false, true);
                }
                else {
                    lab = base + "\\frac{" + Math.abs(Math.round(frac * denominator)) + "}{" + denominator + "}";
                }
            }
            var label = graph.label([x + i, y - 0.2], "\\small{" + lab + "}",
                "below", { labelDistance: 3 });
            set.labels.push(label);
            set.push(label);
        }
        else {
            var label = graph.label([x + i, y - 0.2],
                "\\small{" + KhanUtil.localeToFixed(start + i, decPlaces) + "}",
                "below", { labelDistance: 3 });
            set.labels.push(label);
            set.push(label);
        }
    }
    return set;
};

window.piechart = function(divisions, colors, radius, strokeColor) {
    var graph = KhanUtil.currentGraph;
    var set = graph.raphael.set();
    var arcColor = strokeColor || "none";
    var lineColor = strokeColor || "#fff";

    var sum = 0;
    $.each(divisions, function(i, slice) {
        sum += slice;
    });

    var partial = 0;
    $.each(divisions, function(i, slice) {
        set.push(graph.arc([0, 0], radius, partial * 360 / sum, (partial + slice) * 360 / sum, true, {
            stroke: arcColor,
            fill: colors[i]
        }));
        partial += slice;
    });

    for (var i = 0; i < sum; i++) {
        set.push(graph.line([0, 0], graph.polar(radius, i * 360 / sum), { stroke: lineColor }));
    }

    return set;
};

// Shade a rectangular area with diagonal stripes. We need to use clipRect so
// that the ends of the diagonal lines are beveled at each end such that they
// conform to the overall area of the rectangle being shaded. So this actually
// draws the diagonal stripes over the entire graphie area and uses clipRect to
// only show them where desired.
//
// The pad argument is an optional number of pixels of padding. Positive
// numbers make the shaded area smaller.
window.shadeRect = function(x, y, width, height, pad) {
    var graph = KhanUtil.currentGraph;
    var set = graph.raphael.set();
    var x2 = graph.range[0][0];
    var y1 = graph.range[1][0];
    var y2 = graph.range[1][1];
    var x1 = x2 - (y2 - y1) * graph.scale[1] / graph.scale[0];
    var step = 8 / graph.scale[0];
    var xpad = (pad || 0) / graph.scale[0];
    var ypad = (pad || 0) / graph.scale[1];

    while (x1 < graph.range[0][1]) {
        set.push(graph.line([x1, y1], [x2, y2], {
            clipRect: [[x + xpad, y + ypad],
                      [width - 2 * xpad, height - 2 * ypad]]
        }));
        x1 += step;
        x2 += step;
    }
    return set;
};

window.rectchart = function(divisions, fills, y, strokes, shading) {
    var graph = KhanUtil.currentGraph;
    var set = graph.raphael.set();

    y = y || 0;

    var sum = 0;
    $.each(divisions, function(i, slice) {
        sum += slice;
    });

    var unit = graph.unscaleVector([1, 1]);
    var partial = 0;
    $.each(divisions, function(i, slice) {
        var fill = fills[i];
        // If no stroke is provided, match the fill color so the rectangle
        // appears to be the same size
        var stroke = strokes && strokes[i] || fill;

        for (var j = 0; j < slice; j++) {
            var x = partial / sum, w = 1 / sum;
            set.push(graph.path(
                [
                    [x + 2 * unit[0], y + 2 * unit[1]],
                    [x + w - 2 * unit[0], y + 2 * unit[1]],
                    [x + w - 2 * unit[0], y + 1 - 2 * unit[1]],
                    [x + 2 * unit[0], y + 1 - 2 * unit[1]],
                    true
                ],
                {
                    stroke: stroke,
                    fill: fill
                }
            ));
            if (shading && shading[i]) {
                graph.style({
                    stroke: "#000",
                    strokeWidth: 2,
                    strokeOpacity: 0.5,
                    fillOpacity: 0,
                    fill: null
                }, function() {
                    // We add or subtract a pixel of padding depending on
                    // whether there's a stroke. If there is, we only shade
                    // inside, otherwise we shade over the whole area. That's
                    // why the last argument to shadeRect is 1 or -1 (the width
                    // of the stroke is assumed to be 2)
                    set.push(shadeRect(
                        x + 2 * unit[0], y + 2 * unit[1],
                        w - 4 * unit[0], 1 - 4 * unit[1],
                        (strokes && strokes[i]) ? 1 : -1));
                });
            }
            partial += 1;
        }
    });

    return set;
};

window.Parabola = function(lc, x, y) {
    var leadingCoefficient = lc;
    var x1 = x;
    var y1 = y;
    var raphaelObjects = [];

    this.graphieFunction = function(x) {
        return (leadingCoefficient * (x - x1) * (x - x1)) + y1;
    };

    this.plot = function(fShowFocusDirectrix) {
        var graph = KhanUtil.currentGraph;
        raphaelObjects.push(graph.plot(this.graphieFunction, [-10, 10]));
        if (fShowFocusDirectrix) {
            var focusX = this.getFocusX();
            var focusY = this.getFocusY();
            var directrixK = this.getDirectrixK();

            graph.style({
                fill: "#6495ED"
            }, function() {
                raphaelObjects.push(graph.circle([focusX, focusY], 0.1));
                raphaelObjects.push(graph.line([-10, directrixK], [10, directrixK]));
            });
        }
    };

    this.redraw = function(fShowFocusDirectrix) {
        $.each(raphaelObjects, function(i, el) {
            el.remove();
        });
        raphaelObjects = [];
        this.plot(fShowFocusDirectrix);
    };

    this.update = function(newLC, newX, newY) {
        leadingCoefficient = newLC;
        x1 = newX;
        y1 = newY;
    };

    this.delta = function(deltaLC, deltaX, deltaY) {
        this.update(leadingCoefficient + deltaLC, x1 + deltaX, y1 + deltaY);
    };

    this.deltaFocusDirectrix = function(deltaX, deltaY, deltaK) {
        var focusY = this.getFocusY() + deltaY;
        var k = this.getDirectrixK() + deltaK;

        if (focusY === k) {
            focusY += deltaY;
            k += deltaK;
        }
        var newVertexY = (focusY + k) / 2;
        var newLeadingCoefficient = 1 / (2 * (focusY - k));

        this.update(newLeadingCoefficient, this.getVertexX() + deltaX, newVertexY);
    };

    this.getVertexX = function() {
        return x1;
    };

    this.getVertexY = function() {
        return y1;
    };

    this.getLeadingCoefficient = function() {
        return leadingCoefficient;
    };

    this.getFocusX = function() {
        return x1;
    };

    this.getFocusY = function() {
        return y1 + (1 / (4 * leadingCoefficient));
    };

    this.getDirectrixK = function() {
        return y1 - (1 / (4 * leadingCoefficient));
    };
};

window.redrawParabola = function(fShowFocusDirectrix) {
    var graph = KhanUtil.currentGraph;
    var storage = graph.graph;
    var currParabola = storage.currParabola;
    currParabola.redraw(fShowFocusDirectrix);

    var leadingCoefficient = currParabola.getLeadingCoefficient();
    var vertexX = currParabola.getVertexX();
    var vertexY = currParabola.getVertexY();

    if (fShowFocusDirectrix) {
        $("#focus-x-label").html("<code>" + currParabola.getFocusX() + "</code>").runModules();
        $("#focus-y-label").html("<code>" + KhanUtil.localeToFixed(currParabola.getFocusY(), 2) + "</code>").runModules();
        $("#directrix-label").html("<code>" + "y = " + KhanUtil.localeToFixed(currParabola.getDirectrixK(), 2) + "</code>").runModules();
    } else {
        var equation = "y - " + vertexY + "=" + leadingCoefficient + "(x - " + vertexX + ")^{2}";
        equation = KhanUtil.cleanMath(equation);
        $("#equation-label").html("<code>" + equation + "</code>").runModules();
    }
    $("#leading-coefficient input").val(leadingCoefficient);
    $("#vertex-x input").val(vertexX);
    $("#vertex-y input").val(vertexY);
};

window.updateParabola = function(deltaA, deltaX, deltaY, fShowFocusDirectrix) {
    KhanUtil.currentGraph.graph.currParabola.delta(deltaA, deltaX, deltaY);
    redrawParabola(fShowFocusDirectrix);
};

window.updateFocusDirectrix = function(deltaX, deltaY, deltaK) {
    KhanUtil.currentGraph.graph.currParabola.deltaFocusDirectrix(deltaX, deltaY, deltaK);
    redrawParabola(true);
};

window.ParallelLineMarkers = function(x, y) {
    var graph = KhanUtil.currentGraph;
    var s = graph.scaleVector([1, 1]);
    var x2 = x + 5 / s[0];
    var pmarkW = 5 / s[0];
    var pmarkH = 5 / s[1];
    graph.path([[x - pmarkW, y + pmarkH], [x, y], [x - pmarkW, y - pmarkH]]);
    graph.path([[x2 - pmarkW, y + pmarkH], [x2, y], [x2 - pmarkW, y - pmarkH]]);
};

window.ParallelLines = function(x1, y1, x2, y2, distance) {
    var lowerIntersection;
    var upperIntersection;
    var anchorAngle;

    function stretch(coordArr, dy) {
        return $.map(coordArr, function(coord, index) {
            if (index === 0) {
                var dx = dy / Math.tan(KhanUtil.toRadians(anchorAngle));
                coord += dx;
            }
            if (index === 1) {
                coord += dy;
            }
            return coord;
        });
    }

    function labelAngle(coordArr, angles, color, label) {
        var graph = KhanUtil.currentGraph;
        var measure = (angles[1] - angles[0]);
        var bisect = (angles[0] + angles[1]) / 2;

        var radius = 0.6;

        if (measure < 60) { // control for angle label getting squeezed between intersecting lines
            radius /= Math.sin(KhanUtil.toRadians(measure));
        }

        var coords = $.map(coordArr, function(coord, index) {
            if (index === 0) { // x-coordinate
                return coord + radius * Math.cos(KhanUtil.toRadians(bisect));
            } else { // y-coordinate
                return coord + radius * Math.sin(KhanUtil.toRadians(bisect));
            }
        });

        graph.label(coords, label.text, label.placement, { color: color });
    }

    this.draw = function() {
        var graph = KhanUtil.currentGraph;
        graph.line([x1, y1], [x2, y2]);
        graph.line([x1, y1 + distance], [x2, y2 + distance]);
    };

    this.drawMarkers = function(position) {
        var graph = KhanUtil.currentGraph;
        var pmarkX = (x2 - x1) / 2 + x1;
        if (position === "right" || (position >= 40 && position <= 140)) {
            pmarkX = x2 - 55 / graph.scaleVector([1, 1])[0];
        } else if (position === "left") {
            pmarkX = x1 + 50 / graph.scaleVector([1, 1])[0];
        }
        ParallelLineMarkers(pmarkX, y1);
        ParallelLineMarkers(pmarkX, y1 + distance);
    };

    this.drawTransverse = function(angleDeg) {
        anchorAngle = angleDeg;
        var graph = KhanUtil.currentGraph;
        var width = distance / Math.tan(KhanUtil.toRadians(anchorAngle));
        var lowerX = x1 + ((x2 - x1) - width) / 2;
        var upperX = lowerX + width;
        lowerIntersection = [lowerX, y1];
        upperIntersection = [upperX, y1 + distance];
        graph.line(stretch(lowerIntersection, -0.8), stretch(upperIntersection, 0.8));
    };

    this.drawAngle = function(index, label, color) {

        var graph = KhanUtil.currentGraph,
            radius = 0.5,
            args, angles;

        color = color || KhanUtil.BLUE;
        index = (index + 8) % 8;
        if (index < 4) {
            args = [lowerIntersection, radius];
        } else {
            args = [upperIntersection, radius];
        }

        var labelPlacement;
        switch (index % 4) {
            case 0: // Quadrant 1
                angles = [0, anchorAngle];
                labelPlacement = "right";
                break;
            case 1: // Quadrant 2
                angles = [anchorAngle, 180];
                labelPlacement = "left";
                break;
            case 2: // Quadrant 3
                angles = [180, 180 + anchorAngle];
                labelPlacement = "left";
                break;
            case 3: // Quadrant 4
                angles = [180 + anchorAngle, 360];
                labelPlacement = "right";
                break;
        }
        $.merge(args, angles);

        graph.style({ stroke: color}, function() {
            graph.arc.apply(graph, args);
            if (label) {
                var labelOptions = { text: label, placement: labelPlacement};

                if (typeof label === "boolean") {
                    labelOptions.text = (angles[1] - angles[0]) + "^\\circ";
                }

                labelAngle(args[0], angles, color, labelOptions);
            }
        });
    };

    this.drawVerticalAngle = function(index, label, color) {
        index = (index + 8) % 8;
        var vert = (index + 2) % 4;
        if (index >= 4) {
            vert += 4;
        }
        this.drawAngle(vert, label, color);
    };

    this.drawAdjacentAngles = function(index, label, color) {
        index = (index + 8) % 8;
        var adj1 = (index + 1) % 4;
        var adj2 = (index + 3) % 4;
        if (index >= 4) {
            adj1 += 4;
            adj2 += 4;
        }
        this.drawAngle(adj1, label, color);
        this.drawAngle(adj2, label, color);
    };
};

window.drawComplexChart = function(radius, denominator) {
    var graph = KhanUtil.currentGraph;
    var safeRadius = radius * Math.sqrt(2);
    var color = "#ddd";

    // Draw lines of complex numbers with same angle and
    // circles of complex numbers with same radius to help the intuition.

    graph.style({
        strokeWidth: 1.0
    });

    for (var i = 1; i <= safeRadius; i++) {
        graph.circle([0, 0], i, {
            fill: "none",
            stroke: color
        });
    }

    for (var i = 0; i < denominator; i++) {
        var angle = i * 2 * Math.PI / denominator;
        if (denominator % 4 === 0 && i % (denominator / 4) !== 0) { // Don't draw over axes.
            graph.line([0, 0], [Math.sin(angle) * safeRadius, Math.cos(angle) * safeRadius], {
                stroke: color
            });
        }
    }

    graph.label([radius, 0.5], "Re", "left");
    graph.label([0.5, radius - 1], "Im", "right");
};

window.ComplexPolarForm = function(angleDenominator, maxRadius, euler) {
    var denominator = angleDenominator;
    var maximumRadius = maxRadius;
    var angle = 0, radius = 1;
    var circle;
    var useEulerForm = euler;

    this.update = function(newAngle, newRadius) {
        angle = newAngle;
        while (angle < 0) {
            angle += denominator;
        }
        angle %= denominator;

        radius = Math.max(1, Math.min(newRadius, maximumRadius)); // keep between 0 and maximumRadius...

        this.redraw();
    };

    this.delta = function(deltaAngle, deltaRadius) {
        this.update(angle + deltaAngle, radius + deltaRadius);
    };

    this.getAngleNumerator = function() {
        return angle;
    };

    this.getAngleDenominator = function() {
        return denominator;
    };

    this.getAngle = function() {
        return angle * 2 * Math.PI / denominator;
    };

    this.getRadius = function() {
        return radius;
    };

    this.getRealPart = function() {
        return Math.cos(this.getAngle()) * radius;
    };

    this.getImaginaryPart = function() {
        return Math.sin(this.getAngle()) * radius;
    };

    this.getUseEulerForm = function() {
        return useEulerForm;
    };

    this.plot = function() {
        circle = KhanUtil.currentGraph.circle([this.getRealPart(), this.getImaginaryPart()], 1 / 4, {
            fill: KhanUtil.ORANGE,
            stroke: "none"
        });
    };

    this.redraw = function() {
        if (circle) {
            circle.remove();
        }
        this.plot();
    };
};

window.updateComplexPolarForm = function(deltaAngle, deltaRadius) {
    KhanUtil.currentGraph.graph.currComplexPolar.delta(deltaAngle, deltaRadius);
    redrawComplexPolarForm();
};

window.redrawComplexPolarForm = function(angle, radius) {
    var graph = KhanUtil.currentGraph;
    var storage = graph.graph;
    var point = storage.currComplexPolar;
    point.redraw();

    if (typeof radius === "undefined") {
        radius = point.getRadius();
    }
    if (typeof angle === "undefined") {
        angle = point.getAngleNumerator();
    }

    angle *= 2 * Math.PI / point.getAngleDenominator();

    var equation = KhanUtil.polarForm(radius, angle, point.getUseEulerForm());

    $("#number-label").html("<code>" + equation + "</code>").runModules();
    $("#current-radius").html("<code>" + radius + "</code>").runModules();
    $("#current-angle").html("<code>" + KhanUtil.piFraction(angle, true) + "</code>").runModules();
};

window.labelDirection = function(angle) {
    angle = angle % 360;
    if (angle === 0) {
        return "right";
    } else if (angle > 0 && angle < 90) {
        return "above right";
    } else if (angle === 90) {
        return "above";
    } else if (angle > 90 && angle < 180) {
        return "above left";
    } else if (angle === 180) {
        return "left";
    } else if (angle > 180 && angle < 270) {
        return "below left";
    } else if (angle === 270) {
        return "below";
    } else if (angle > 270 && angle < 360) {
        return "below right";
    }
};

// arc orientation is "top"|"left"|"bottom"|"right".
// arrow direction is clockwise (true) or counter-clockwise (false)
window.curvyArrow = function(center, radius, arcOrientation, arrowDirection, styles) {
    styles = styles || {};
    var graph = KhanUtil.currentGraph;
    var set = graph.raphael.set();
    var angles;
    if (arcOrientation === "left") {
        angles = [90, 270];
    } else if (arcOrientation === "right") {
        angles = [270, 90];
    } else if (arcOrientation === "top") {
        angles = [0, 180];
    } else if (arcOrientation === "bottom") {
        angles = [180, 0];
    }
    angles.push(styles);
    var arcArgs = [center, radius].concat(angles);
    set.push(graph.arc.apply(graph, arcArgs));

    var offset = graph.unscaleVector([1, 1]);

    // draw Arrows
    var from = _.clone(center);
    var to = _.clone(center);
    if (arcOrientation === "left" || arcOrientation === "right") {
        var left = arcOrientation === "left";
        from[1] = to[1] = to[1] + radius * (arrowDirection === left ? 1 : -1);
        to[0] = from[0] + offset[0] * (left ? 1 : -1);
    } else {
        var bottom = arcOrientation === "bottom";
        from[0] = to[0] = to[0] + radius * (arrowDirection === bottom ? 1 : -1);
        to[1] = from[1] + offset[1] * (bottom ? 1 : -1);
    }
    set.push(graph.line(from, to, _.extend({arrows: "->"}, styles)));
    return set;
};

window.curlyBrace = function(startPointGraph, endPointGraph) {
    var graph = KhanUtil.currentGraph;

    var startPoint = graph.scalePoint(startPointGraph);
    var endPoint = graph.scalePoint(endPointGraph);
    var angle = KhanUtil.findAngle(endPoint, startPoint);
    var length = KhanUtil.getDistance(endPoint, startPoint);
    var midPoint = _.map(startPoint, function(start, i) {
        return (start + endPoint[i]) / 2;
    });

    var specialLen = 16 * 2 + 13 * 2;
    if (length < specialLen) {
        throw new Error("Curly brace length is too short.");
    }
    var straight = (length - specialLen) / 2;
    var half = length / 2;

    var firstHook = "c 1 -3 6 -5 10 -6" +
                    "c 0 0 3 -1 6 -1";

    // Mirror of first hook.
    var secondHook = "c 3 1 6 1 6 1" +
                     "c 4 1 9 3 10 6";

    var straightPart = "l " + straight + " 0";

    var firstMiddle =
            "c 5 0 10 -3 10 -3" +
            "l 3 -4";

    // Mirror of second middle
    var secondMiddle =
            "l 3 4" +
            "c 0 0 5 3 10 3";

    var path = [
        "M -" + half + " 0",
        firstHook,
        straightPart,
        firstMiddle,
        secondMiddle,
        straightPart,
        secondHook
    ].join("");

    var brace = graph.raphael.path(path);
    brace.rotate(angle);
    brace.translate(midPoint[0], midPoint[1]);
    return brace;
};

});
