var translates = [0,0];
var scale = 1;
var ToolList = {};
var isLinkDraw = false;
var selectNode,drop;

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
//            console.log(posX, posY);
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
        .call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom))
        .append("g");

    /* Zoom function*/
    function zoom() {
        if(!nodedrag && !isLinkDraw){
            translates = d3.event.translate;
            scale = d3.event.scale;
//            console.log(d3.event.translate,d3.event.scale);
            svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }

    }
//    var drag_line = svg.append("line")
//        .attr("class", "drag_line")
//        .attr("x1", 0)
//        .attr("y1", 0)
//        .attr("x2", 0)
//        .attr("y2", 0);

    var gStates = svg.selectAll("g.node")
        .data(NodePanData.step_list);
    var link = svg.selectAll("g.link");
//    var transitions = function () {
//        return NodePanData.step_list.reduce(function (initial, state) {
//            return initial.concat(
//                state.transitions.map(function (transition) {
//                    return {
//                        source: state,
//                        target: transition.target
//                    };
//                }));
//        }, []);
//    };



//    var diagonal = d3.svg.diagonal()
//        .projection(function(d) { return [d.y, d.x]; });

//    svg.selectAll("g.link")
//        .data(NodePanData.step_list)
//        .enter().append("path")
//        .attr("class", "link")
//        .attr("d", diagonal);

        var gTransitions = svg.append('g')
                .selectAll( "path.transition")
                .data(NodePanData.step_list)


    var drag = d3.behavior.drag()
        .on("drag", function (d, i) {
            if(isLinkDraw) return;
            nodedrag = true;
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

            //gTransitions.attr( 'd', computeTransitionPath);
            d3.event.sourceEvent.stopPropagation();
        })
        .on("dragend", function (d) {

            nodedrag = false;
            d3.event.sourceEvent.stopPropagation();
        });

    svg.on("mousedown", function () {
            if (!d3.event.ctrlKey) {
                d3.selectAll('g.selected').classed("selected", false);
            }
        })
        .on("mousemove", function () {


        })
        .on("mouseup", function () {
            d3.selectAll('g.node.selection').classed("selection", false);
        })
        .on("mouseout", function () {
            if (d3.event.relatedTarget && d3.event.relatedTarget.tagName == 'HTML') {
                d3.selectAll('g.node.selection').classed("selection", false);
            }
        });


//    function getHeight(){
//        max_height = d3.max(NodePanData.step_list, function(d){
//            return d.x;
//        });
//
//        max_width = d3.max(NodePanData.step_list, function(d){
//            return d.y;
//        });
//
//        min_height = d3.min(NodePanData.step_list, function(d){
//            return d.x;
//        });
//
//        min_width = d3.min(NodePanData.step_list, function(d){
//            return d.y;
//        });
//
////        console.log(max_height+" <> "+min_height);
////        console.log(max_width+" <> "+min_width);
////        viewBox="0 0 793 1122"
////        console.log(max_height,max_width,min_height,min_width);
//    }

    function updateSVG(){
        svg.attr("transform", "translate("+translates[0]+","+translates[1]+")scale("+scale+")");
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
            })
            .call(drag);

        gState.append("circle")
            .attr({
                r: radius + 5,
                class: 'outer'
            });

        gState.append("circle")
            .attr({
                r: radius - 3,
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
                y: (radius + 20)
            })
            .text(function (d) {
                return d.name;
            });

        gState.append("title").text(function (d) {
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

        var addPath = function(){
            if(selectNode && drop){
                console.log(selectNode,drop);
                NodePanData.connections.push({source: selectNode, target: drop});
                console.log(NodePanData.connections)
                restart();
            }
        }

        var inputs = gStates.selectAll('.extraCircle')
                .data(function(d){
                if(d.inputList){
                    var r = radius+15;
                    var a = getStartingPoint(d.inputList.length,true);
                    for(t in d.inputList){
                        d.inputList[t].x = r*Math.sin(a);
                        d.inputList[t].y = r*Math.cos(a);
                        a = a + 0.45;
                    }
                    return d.inputList;
                }
                return [];
            }).enter()
                .append("g")
                .attr({
                    "transform": function (d) {
                        return "translate(" + [d.x, d.y] + ")";
                    },
                    'class': 'extraCircle'
                }).on("mousedown", function (d) {
                    isLinkDraw =true;
//                    drop = d;
//                    g = this.parentNode;
//                    d3.select(g)
                    var point = d3.mouse(this.parentNode);
                    drop = {x: point[0], y: point[1]};
                    console.log("mousedoun"+ d.id)
                }) .on("mouseup", function (d) {
                        isLinkDraw =false;
//                        drop = d;
                    var point = d3.mouse(this.parentNode);
                    drop = {x: point[0], y: point[1]};
                        addPath();
//                    NodePanData.step_list.push();
                        console.log("mouseUp"+ d.id);
                    });

        inputs.append('circle')
            .attr("r", function(d,i) { return 8; });
        inputs.append("text")
            .attr({
                'text-anchor': 'end',
                y:5,
                x:-10
            })
            .text(function (d) {
                return d.name;
            });


        var output = gStates.selectAll('.outPuts')
            .data(function(d){
                if(d.outputList){
                    var r = radius+15;
                    var a = getStartingPoint(d.outputList.length,false);
                    for(t in d.outputList){
                        d.outputList[t].x = r*Math.sin(a);
                        d.outputList[t].y = r*Math.cos(a);
                        a = a + 0.45;
                    }
                    return d.outputList;
                }
                return [];
            }).enter()
            .append("g")
            .attr({
                "transform": function (d) {
                    return "translate(" + [d.x, d.y] + ")";
                },
                'class': 'outPuts'
            }).on("mousedown", function (d) {
                isLinkDraw =true;
//                selectNode = d;
                console.log("mousedoun")
                var point = d3.mouse(this.parentNode);
                selectNode = {x: point[0], y: point[1]};
            }) .on("mouseup", function (d) {
                isLinkDraw =false;
//                selectNode = d;
                var point = d3.mouse(this.parentNode);
                selectNode = {x: point[0], y: point[1]};
                addPath();
                console.log("mouseUp")
            });

        output.append('circle')
            .attr("r", function(d,i) { return 8; });
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
        link = link.data(NodePanData.connections);

        link.enter().insert("line")
            .attr("class", "link");
//            .on("mousedown",
//            function(d) {
//                mousedown_link = d;
//                if (mousedown_link == selected_link) selected_link = null;
//                else selected_link = mousedown_link;
//                selected_node = null;
//                redraw();
//            })

        link.exit().remove();

//        link.classed("link_selected", function(d) { return d === selected_link; });
//        gTransitions = gTransitions.data(transitions);
//        gTransitions.enter().append( 'path')
//            .attr( 'class', 'transition')
//            .attr( 'd', computeTransitionPath)
//        ;
//        gTransitions.exit().remove();
    };

    d3.json("data/todos.json", function(error, json) {
//        console.log(json);
        ToolList = json.todos;
        restart();
    });
});