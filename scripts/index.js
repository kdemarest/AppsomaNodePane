var translates = [0,0];
var scale = 1;
var ToolList = {};
var isLinkDraw = false;
var source_node,target_node,output_node,input_node;

var NodePanData ={step_list:[],connections:[]};
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
                '<circle r="45" class="outer"/>' +
                '<circle r="37" class="inner"/>' +
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
        },

        out: function (event, ui) {
            console.log("out");
        },

        drop: function (event, ui) {
            var posX = event.originalEvent.clientX - $(this).offset().left;
            var posY = event.originalEvent.clientY - $(this).offset().top;
            var obj = ToolList[selected.id];
            obj.x = posX;
            obj.y = posY;
            NodePanData.step_list.push(obj);
            restart();
        }
    });

    /* Svg element that holds data*/
    var svg = d3.select('#nodePane')
        .append("svg")
        .attr("id","nodeEditor")
        .attr("width", function () {
            return $(".nodePaneContainer").width();
        })
        .attr("height", function () {
            return $(".nodePaneContainer").height();
        })
        .call(d3.behavior.zoom().scaleExtent([1,4]).on("zoom", zoom))
        .append("g");

    var defs = svg.append( 'defs' );
    var filter = defs.append( 'filter' )
                .attr( 'id', 'dropShadow' )
    filter.append( 'feGaussianBlur' )
        .attr( 'in', 'SourceAlpha' )
        .attr( 'stdDeviation', 5 ) // !!! important parameter - blur
        .attr( 'result', 'blur' );
    filter.append( 'feOffset' )
        .attr( 'in', 'blur' )
        .attr( 'dx', 2 ) // !!! important parameter - x-offset
        .attr( 'dy', 2 ) // !!! important parameter - y-offset
        .attr( 'result', 'offsetBlur' );
    var feMerge = filter.append( 'feMerge' );
    feMerge.append( 'feMergeNode' )
        .attr( 'in", "offsetBlur' )
    feMerge.append( 'feMergeNode' )
        .attr( 'in', 'SourceGraphic' );

    /* Zoom function*/
    function zoom() {
        if(!nodedrag && !isLinkDraw){
            translates = d3.event.translate;
            scale = d3.event.scale;
            svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            restart();
        }

    }

    var drag_line = svg.append('g').append('path')
            .attr('class','dragline hidden')
            .attr('d', 'M0,0L0,0');

    d3.select('#nodeEditor').on('mousemove', function(){
        if(isLinkDraw){
            var p = d3.mouse(this);
            var sourceX,sourceY;
            if(source_node){
                sourceX = (source_node.x+output_node.x);
                sourceY = (source_node.y+output_node.y);
            }else{
                sourceX = (target_node.x+input_node.x);
                sourceY = (target_node.y+input_node.y);
            }

            var nobj = {
                source : {
                    x: sourceX,
                    y: sourceY
                },
                target : {
                    x: p[0]-translates[0],
                    y: p[1]-translates[1]
                }
            }
            drag_line.attr('d',diagonal.apply(this, [nobj]));
        }
    }).on("mouseup", function () {
           if(isLinkDraw){
               resetParameters();
           }
        });

    var gStates = svg.selectAll("g.node")
        .data(NodePanData.step_list);
    var diagonal = d3.svg.diagonal();
    var computeTransitionPath = function( d) {
        sourceX = (d.source.x+d.output.x),
            sourceY = (d.source.y+d.output.y),
            targetX = (d.target.x+d.input.x),
            targetY = (d.target.y+d.input.y);

        var nobj = {
            source : {
                x: sourceX,
                y: sourceY
            },
            target : {
                x: targetX,
                y: targetY
            }
        }
        return diagonal.apply(this, [nobj]);
//        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    };

    var gTransitions = svg.append('g')
            .selectAll("path.transition")
            .data(NodePanData.step_list)

    var drag = d3.behavior.drag()
        .on("drag", function (d, i) {
            if(isLinkDraw) return;
            nodedrag = true;
            var selection = d3.selectAll('.selected');

            if (selection[0].indexOf(this) == -1) {
                selection.classed("selected", false);
                d3.selectAll('.tool').select('image')
                    .attr("xlink:href","images/container_default.png");
                selection = d3.select(this);
                selection.classed("selected", true);
                selection.select('.tool').select('image')
                    .attr("xlink:href","images/container_selected.png");
            }

            selection.attr("transform", function (d, i) {
                d.x += d3.event.dx;
                d.y += d3.event.dy;
                return "translate(" + [d.x, d.y] + ")"
            })
            // reappend dragged element as last
            // so that its stays on top
            this.parentNode.appendChild(this);

            gTransitions.attr( 'd', computeTransitionPath);
            d3.event.sourceEvent.stopPropagation();
        })
        .on("dragend", function (d) {
            nodedrag = false;
            d3.event.sourceEvent.stopPropagation();
        });

    svg.on("mousedown", function () {
            if (!d3.event.ctrlKey) {
                d3.selectAll('g.selected').select('.tool').select('image')
                    .attr("xlink:href","/images/container_default.png");
                d3.selectAll('g.selected').classed("selected", false);
            }
        })
        .on("mousemove", function () {

        })
        .on("mouseup", function () {
//            d3.selectAll('.tool').select('image')
//                .attr("xlink:href","/images/container_default.png");
            d3.selectAll('g.node.selection').classed("selection", false);
        })
        .on("mouseout", function () {
            if (d3.event.relatedTarget && d3.event.relatedTarget.tagName == 'HTML') {
                d3.selectAll('.tool').select('image')
                    .attr("xlink:href","images/container_default.png");
                d3.selectAll('g.node.selection').classed("selection", false);
            }
        });


    function updateSVG(){
        svg.attr("transform", "translate("+translates[0]+","+translates[1]+")scale("+scale+")");
    }
    function resetParameters(){
        source_node = undefined;
        target_node = undefined;
        input_node = undefined;
        output_node = undefined;
        isLinkDraw = false;
        var nobj = {
            source : {
                x: 0,
                y: 0
            },
            target : {
                x: 0,
                y: 0
            }
        }
        drag_line
            .classed('hidden', true)
            .attr('d',diagonal.apply(this, [nobj]));
    }
    var addPath = function(){
        if(source_node && target_node && input_node && output_node){
            if(source_node != target_node){
                NodePanData.connections.push({source: source_node, target: target_node,output:output_node,input:input_node});
                restart();
            }
        }
        resetParameters();
    }

    function restart() {
        updateSVG();
        svg.attr("width", function () {
            return $(".nodePaneContainer").width();
        }).attr("height", function () {
            return $(".nodePaneContainer").height();
        });

        gStates = gStates.data(NodePanData.step_list);

        var gState = gStates.enter()
            .append("g")
            .attr({
                "transform": function (d) {
                    return "translate(" + [d.x, d.y] + ")";
                },
                'class': 'node'
            }).on("mousedown", function (d) {
                if(output_node)
                    source_node = d;
                else
                    target_node = d;

                if(isLinkDraw){
                    var p = d3.mouse( this);
                    var sourceX,sourceY;
                    if(source_node){
                        sourceX = (source_node.x+output_node.x);
                        sourceY = (source_node.y+output_node.y);
                    }else{
                        sourceX = (target_node.x+input_node.x);
                        sourceY = (target_node.y+input_node.y);
                    }

                    var nobj = {
                        source : {
                            x: sourceX,
                            y: sourceY
                        },
                        target : {
                            x: sourceX,
                            y: sourceY
                        }
                    }
                    drag_line
                        .classed('hidden', false)
                        .attr('d',diagonal.apply(this, [nobj]));
                }
            }).on("mouseup", function (d) {
                if(target_node)
                    source_node = d;
                else
                    target_node = d;
                addPath();
            }).on("click", function (d, i) {
                var e = d3.event,
                    g = this;
                isSelected = d3.select(g).classed("selected");

                d3.selectAll('.tool').select('image')
                    .attr("xlink:href","images/container_default.png");
                d3.selectAll('g.selected').classed("selected", false);

                d3.select(g).classed("selected", true);
                d3.selectAll('g.selected').select('.tool').select('image')
                    .attr("xlink:href","images/container_selected.png");

                g.parentNode.appendChild(g);
            })
            .on("mouseover", function () {
                d3.select(this).classed("hover", true);
            })
            .on("mouseout", function () {
                d3.select(this).classed("hover", false);
            })
            .call(drag);

         var node = gState.append("g")
                .attr("class","tool");

        node.append("image")
            .attr("xlink:href", "images/container_default.png")
            .attr("x", -50)
            .attr("y", -50)
            .attr("width", 100)
            .attr("height", 100);

        node.append("circle")
            .attr({
                r: radius + 2,
                class: 'outer'
            });

        node.append("text")
            .attr("class","nodeName")
            .attr({
                'text-anchor': 'middle',
                y: (radius + 20)
            })
            .text(function (d) {
                return d.name;
            });

        node.append("title").text(function (d) {
            return d.name;
        });

        var getStartingPoint = function(n,isinput){
            var sp;
            if(isinput){
                sp = 11;
                if(n>1){
                    var t = parseInt(n/2);
                    sp = sp - (t*0.45);
                }
            }else{
                sp= 1.5
                if(n>1){
                    var t = parseInt(n/2);
                    sp = sp + (t*0.45);
                }
            }
            return sp;
        }

        var inputs = gStates.selectAll('.inputs')
                .data(function(d){
                if(d.input_list){
                    var r = radius+15;
                    var a = getStartingPoint(d.input_list.length,true);
                    for(t in d.input_list){
                        d.input_list[t].x = r*Math.sin(a);
                        d.input_list[t].y = r*Math.cos(a);
                        a = a + 0.45;
                    }
                    return d.input_list;
                }
                return [];
            }).enter()
                .append("g")
                .attr({
                    "transform": function (d) {
                        return "translate(" + [d.x, d.y] + ")";
                    },
                    'class': 'inputs'
                }).on("mousedown", function (d) {
                    isLinkDraw =true;
                    input_node = d;
                }) .on("mouseup", function (d) {
                    isLinkDraw =false;
                    input_node = d;
                });

        inputs.append("image")
            .attr("xlink:href", "images/terminal_default.png")
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 16)
            .attr("height", 16);

        inputs.append('circle')
            .attr("r", function(d,i) { return 8; })
            .on("mouseover", function () {
                d3.select(this.parentNode).classed("hover", true);
            })
            .on("mouseout", function () {
                d3.select(this.parentNode).classed("hover", false);
            });


        inputs.append("text")
            .attr({
                'text-anchor': 'end',
                y:5,
                x:-10
            })
            .text(function (d) {
                return d.name;
            });


        var output = gStates.selectAll('.outputs')
            .data(function(d){
                if(d.output_list){
                    var r = radius+15;
                    var a = getStartingPoint(d.output_list.length,false);
                    for(t in d.output_list){
                        d.output_list[t].x = r*Math.sin(a);
                        d.output_list[t].y = r*Math.cos(a);
                        a = a + 0.45;
                    }
                    return d.output_list;
                }
                return [];
            }).enter()
            .append("g")
            .attr({
                "transform": function (d) {
                    return "translate(" + [d.x, d.y] + ")";
                },
                'class': 'outputs'
            }).on("mousedown", function (d) {
                isLinkDraw =true;
                output_node = d;
            }) .on("mouseup", function (d) {
                isLinkDraw =false;
                output_node = d;
            });

        output.append("image")
            .attr("xlink:href", "images/terminal_default.png")
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 16)
            .attr("height", 16);

        output.append('circle')
            .attr("r", function(d,i) { return 8; })
            .on("mouseover", function () {
                d3.select(this.parentNode).classed("hover", true);
            })
            .on("mouseout", function () {
                d3.select(this.parentNode).classed("hover", false);
            });
        output.append("text")
            .attr({
                'text-anchor': 'start',
                y:5,
                x:10
            })
            .text(function (d) {
                return d.name;
            });


        gStates.exit().remove();

        gTransitions = gTransitions.data( NodePanData.connections);
        gTransitions.enter().append( 'path')
            .attr( 'class', 'transition')
            .attr( 'd', computeTransitionPath)
        ;
        gTransitions.exit().remove();
    };

    d3.json("data/todos.json", function(error, json) {
        ToolList = json.todos;
    });

    d3.json("data/saveData.json", function(error, json) {
        NodePanData.step_list = json.NodePanData.step_list;
        restart();
        for(x in json.NodePanData.connections){
            var temp = json.NodePanData.connections[x];
            source_node_t = NodePanData.step_list.filter(function(e){
                return e.id == temp.source;
            })[0];
            target_node_t = NodePanData.step_list.filter(function(e){
                return e.id == temp.target;
            })[0];
            output_node_t = source_node_t.output_list.filter(function(e){
                return e.id == temp.output;
            })[0];
            input_node_t = target_node_t.input_list.filter(function(e){
                return e.id == temp.input;
            })[0];
            NodePanData.connections.push({source: source_node_t, target: target_node_t,output:output_node_t,input:input_node_t});
            restart();
        }
    });
});