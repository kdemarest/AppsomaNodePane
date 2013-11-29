
$(document).ready(function () {
    var nodes = [];
    var selected = {};
    var radius = 40;
    var nodedrag = false;

    $( window ).resize(function() {
           restart();
    });

    $('.dragElement').draggable({
        cursorAt: {
            top: 40,
            left: 40
        },
        cursor: 'move',
        helper: function (event) {
            var elem = this.id;
            selected.id = this.id
            var dragSVG = '<svg xmlns="http://www.w3.org/2000/svg" class="drangNode">' +
                '<g class="node" transform="translate(44,44)">' +
                '<circle r="44" class="outer"/>' +
                '<circle r="40" class="inner"/>' +
                '<text text-anchor="middle" y="4">' + this.id + '</text>' +
                '</g>' +
                '</svg>';
            return dragSVG;
        }
    });

    $(".nodePaneContainer").droppable({
        // tolerance can be set to 'fit', 'intersect', 'pointer', or 'touch'
        tolerance: 'intersect',

        over: function (event, ui) {
            var posX = event.originalEvent.clientX - $(this).offset().left;
            var posY = event.originalEvent.clientY - $(this).offset().top;
            console.log(posX, posY);
        },

        out: function (event, ui) {
            console.log("out");
        },

        drop: function (event, ui) {
            var posX = event.originalEvent.clientX - $(this).offset().left;
            var posY = event.originalEvent.clientY - $(this).offset().top;
            nodes.push({
                x: posX,
                y: posY,
                label: selected.id,
                transitions: []
            });
            restart();
        }
    });


    var svg = d3.select('#nodePane')
        .append("svg")
        .attr("width", function () {
            return $(".nodePaneContainer").width();
        })
        .attr("height", function () {
            return $(".nodePaneContainer").height();
        })
        .call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom))
        .append("g");

    function zoom() {
        if(!nodedrag){
            svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }
    }

    var gStates = svg.selectAll("g.node")
        .data(nodes);

    var transitions = function () {
        return nodes.reduce(function (initial, state) {
            return initial.concat(
                state.transitions.map(function (transition) {
                    return {
                        source: state,
                        target: transition.target
                    };
                }));
        }, []);
    };



    var computeTransitionPath = /*d3.svg.diagonal.radial()*/
        function (d) {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding = radius + 2; //d.left ? 17 : 12,
            targetPadding = radius + 6; //d.right ? 17 : 12,
            sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY);
            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        };

    //    var gTransitions = svg.append( 'g')
    //            .selectAll( "path.transition")
    //            .data( transitions)
    //        ;

    var startState, endState;
    var drag = d3.behavior.drag()
        .on("drag", function (d, i) {
            nodedrag = true;
            if (startState) {
                return;
            }

            var selection = d3.selectAll('.selected');

            if (selection[0].indexOf(this) == -1) {
                selection.classed("selected", false);
                selection = d3.select(this);
                selection.classed("selected", true);
            }

            selection.attr("transform", function (d, i) {
                d.x += d3.event.dx;
                d.y += d3.event.dy;
                return "translate(" + [d.x, d.y] + ")"
            })
            // reappend dragged element as last
            // so that its stays on top
            this.parentNode.appendChild(this);

            //            gTransitions.attr( 'd', computeTransitionPath);
            d3.event.sourceEvent.stopPropagation();
        })
        .on("dragend", function (d) {
            //            if( startState && endState) {
            //                startState.transitions.push( { label : "transition label 1", target : endState});
            //                restart();
            //            }
            //
            //            startState = undefined;
            nodedrag = false;
            d3.event.sourceEvent.stopPropagation();
        });

    svg.on("mousedown", function () {
        if (!d3.event.ctrlKey) {
            d3.selectAll('g.selected').classed("selected", false);
        }
    })
        .on("mousemove", function () {
            var p = d3.mouse(this),
                s = svg.select("rect.selection");

            if (!s.empty()) {
                d3.selectAll('g.node.selection.selected').classed("selected", false);
                d3.selectAll('g.node >circle.inner').each(function (state_data, i) {
                    if (!d3.select(this).classed("selected") &&
                        // inner circle inside selection frame
                        state_data.x - radius >= d.x && state_data.x + radius <= d.x + d.width && state_data.y - radius >= d.y && state_data.y + radius <= d.y + d.height) {

                        d3.select(this.parentNode)
                            .classed("selection", true)
                            .classed("selected", true);
                    }
                });
            } else if (startState) {
                var state = d3.select('g.node.selected');
                endState = (!state.empty() && state.data()[0]) || undefined;
            }
        })
        .on("mouseup", function () {
            d3.selectAll('g.node.selection').classed("selection", false);
        })
        .on("mouseout", function () {
            if (d3.event.relatedTarget && d3.event.relatedTarget.tagName == 'HTML') {
                d3.selectAll('g.node.selection').classed("selection", false);
            }
        });

    restart();

    function restart() {
        svg.attr("width", function () {
            return $(".nodePaneContainer").width();
        }).attr("height", function () {
                return $(".nodePaneContainer").height();
         });
        gStates = gStates.data(nodes);

        var gState = gStates.enter()
            .append("g")
            .attr({
                "transform": function (d) {
                    return "translate(" + [d.x, d.y] + ")";
                },
                'class': 'node'
            })
            .call(drag);

        gState.append("circle")
            .attr({
                r: radius + 4,
                class: 'outer'
            })
            .on("mousedown", function (d) {
//                startState = d, endState = undefined;
                // force element to be an top
                this.parentNode.parentNode.appendChild(this.parentNode);
//                console.log("mousedown", startState);
            });


        gState.append("circle")
            .attr({
                r: radius,
                class: 'inner'
            })
            .on("click", function (d, i) {
                var e = d3.event,
                    g = this.parentNode,
                    isSelected = d3.select(g).classed("selected");

                if (!e.ctrlKey) {
                    d3.selectAll('g.selected').classed("selected", false);
                }

                d3.select(g).classed("selected", !isSelected);

                // reappend dragged element as last
                // so that its stays on top
                g.parentNode.appendChild(g);
            })
            .on("mouseover", function () {
                d3.select(this.parentNode).classed("hover", true);
            })
            .on("mouseout", function () {
                d3.select(this.parentNode).classed("hover", false);
            });


        gState.append("text")
            .attr({
                'text-anchor': 'middle',
                y: 4
            })
            .text(function (d) {
                return d.label;
            });

        gState.append("title").text(function (d) {
            return d.label;
        });

        gStates.exit().remove();

        //        gTransitions = gTransitions.data( transitions);
        //        gTransitions.enter().append( 'path')
        //            .attr( 'class', 'transition')
        //            .attr( 'd', computeTransitionPath)
        //        ;
        //        gTransitions.exit().remove();
    };
});