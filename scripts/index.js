var translates = [0,0];
var scale = 1;
var ToolList = {};
var isLinkDraw = false;
var source_node,target_node,output_node,input_node;
var nodedrag = false;
var radius = 40;
var NodePanData ={step_list:[],connections:[]};
var popupTitle = "Title";
var popupMessage = "Message";

$(document).ready(function () {
    var selected = {};

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
           // console.log("out");
        },

        drop: function (event, ui) {
            var posX = event.originalEvent.clientX - $(this).offset().left;
            var posY = event.originalEvent.clientY - $(this).offset().top;
            var obj = ToolList[selected.id];
            obj.x = posX;
            obj.y = posY;
            var tempObj = JSON.parse(JSON.stringify(obj));
            tempObj.id = obj.id+"D"+Date.now();
            NodePanData.step_list.push(tempObj);
            restart();
        }
    });

    var viewport = d3.select('#nodePane')
        .append("svg")
        .attr("id","nodeEditor")
        .attr("width", function () {
            return $(".nodePaneContainer").width();
        })
        .attr("height", function () {
            return $(".nodePaneContainer").height();
        });

    var eventRect = viewport.append('rect')
        .attr("width", function () {
            return $(".nodePaneContainer").width();
        })
        .attr("height", function () {
            return $(".nodePaneContainer").height();
        })
        .attr('fill', 'none')
        .attr('pointer-events', 'all');


    var svg =  viewport
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
            .attr('d', "M 0 0 C 0 0 0 0 0 0");

    eventRect.on('mousemove', function() {

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

            var xn =  (p[0]/scale) - (translates[0]/scale);
            var yn =  (p[1]/scale) - (translates[1]/scale);

            var path = "M "+sourceX+" "+sourceY+" C"+xn+" "+sourceY+" "+sourceX+" "+yn+" "+xn+" "+yn;
            drag_line.attr('d',path);
        }
    }).on("mouseup", function () {
        if(isLinkDraw){
            resetParameters();
        }
    }).on("mousedown", function () {
        d3.selectAll('g.selected').select('.tool').select('image')
            .attr("xlink:href","images/container_default.png");
        d3.selectAll('g.selected').classed("selected", false);
    });

    var computeTransitionPath = function( d) {
            var temp = d;
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

            sourceX = (source_node_t.x+output_node_t.x),
            sourceY = (source_node_t.y+output_node_t.y),
            targetX = (target_node_t.x+input_node_t.x),
            targetY = (target_node_t.y+input_node_t.y);
//        M x1  y1C  x2  y1   x1  y2   x2 y2
        return "M "+sourceX+" "+sourceY+" C"+targetX+" "+sourceY+" "+sourceX+" "+targetY+" "+targetX+" "+targetY;
    };

    svg.on("mousedown", function () {
            d3.event.stopPropagation();
        })
        .on("mouseout", function () {
            if (d3.event.relatedTarget && d3.event.relatedTarget.tagName == 'HTML') {
                d3.selectAll('.tool').select('image')
                    .attr("xlink:href","images/container_default.png");
                d3.selectAll('g.node.selection').classed("selection", false);
            }
        });

    function updateSVG(){
        viewport.attr("width", function () {
            return $(".nodePaneContainer").width();
        }).attr("height", function () {
            return $(".nodePaneContainer").height();
        });
        svg.attr("transform", "translate("+translates+")scale("+scale+")");
    }

    function resetParameters(){
        source_node = undefined;
        target_node = undefined;
        input_node = undefined;
        output_node = undefined;
        isLinkDraw = false;
        drag_line
            .classed('hidden', true)
            .attr('d',"M 0 0 C 0 0 0 0 0 0");
    }

    //Add new connection between nodes
    var addPath = function(){
        if(source_node && target_node && input_node && output_node){
            if(source_node != target_node){
                var connection = {source: source_node.id, target: target_node.id,output:output_node.id,input:input_node.id};
                connection.id = source_node.id+"_"+target_node.id+"_"+output_node.id+"_"+input_node.id;
                var isExist = NodePanData.connections.filter(function(e){
                    return e.id == connection.id;
                });

                //here is check for already exist connection
                //we can add more check here
                if(isExist.length == 0){
                    NodePanData.connections.push(connection);
                    restart();
                }else{
                    popupMessageBox("Error","Link already exist");
                }
            }
        }
        resetParameters();
    }

    //Remove node from pane
    //id of the node which you want to remove
    function removeTool(id){
        var relatedConnection = NodePanData.connections.filter(function(e){
            return e.source == id || e.target == id;
        });
        for(v in relatedConnection){
            var index = NodePanData.connections.indexOf(relatedConnection[v]);
            NodePanData.connections.splice(index,1);
        }
        var removeNode,index_node;
            for(b in NodePanData.step_list){
                if(NodePanData.step_list[b].id == id){
                    removeNode = NodePanData.step_list[b]
                    index_node = b;
                    break
                }
            }
        NodePanData.step_list.splice(index_node,1);
        restart();
    }

    function restart() {
        updateSVG();
        // Remove all old elements from svg only node and links not the drag line and rect
        svg.selectAll("g.node").remove();
        svg.selectAll("g.links").remove();
        svg.selectAll("g.links_s").remove();

        // Init the element node, link link_b(shadow of link)
        var gStates = svg.selectAll("g.node");

        var gTransitions = svg.append('g').attr("class","links")
            .selectAll("path.transition");

        var gTransitions_b = svg.append('g').attr("class","links_s")
            .selectAll("path.transition_b");

        //Manage drag behavior of node
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
                if(this.parentNode)
                    this.parentNode.appendChild(this);

                gTransitions.attr( 'd', computeTransitionPath);
                gTransitions_b.attr( 'd', computeTransitionPath);
                d3.event.sourceEvent.stopPropagation();
            })
            .on("dragend", function (d) {
                nodedrag = false;
                d3.event.sourceEvent.stopPropagation();
            });

        //Add data to node
        gStates = gStates.data(NodePanData.step_list);
        var gState = gStates.enter()
            .append("g")
            .attr({
                "transform": function (d) {
                    return "translate(" + [d.x, d.y] + ")";
                },
                'class': 'node',
                'id': function(d){
                    return d.id;
                }
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

                    var path = "M "+sourceX+" "+sourceY+" C"+sourceX+" "+sourceY+" "+sourceX+" "+sourceY+" "+sourceX+" "+sourceY;
                    drag_line
                        .classed('hidden', false)
                        .attr('d',path);
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

                if(g.parentNode)
                    g.parentNode.appendChild(g);
            })
            .on("mouseover", function () {
                d3.select(this).classed("hover", true);
            })
            .on("mouseout", function () {
                d3.select(this).classed("hover", false);
            })
            .call(drag);
        // Add the controls remove and play
        var controls = gState.append("g").attr("class","controls");

        controls.append("image")
            .attr("xlink:href","images/close_default.png")
            .attr("x", -25)
            .attr("y", -70)
            .attr("width",22)
            .attr("height",22)
            .on("click", function(d) {
                removeTool(d.id);
            });

        controls.append("image")
            .attr("xlink:href","images/info_default.png")
            .attr("x", 0)
            .attr("y", -70)
            .attr("width",22)
            .attr("height",22)
            .on("click", function(d) {
                popupMessageBox("Run","Running the selected tool");
            });

        //Append each node to in main group
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

        // function for calculate the position on input/output node (arc around the node)
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

        //Input/Output image if is connected or not
        var getConnectionImage = function(d,isInput){
            var type = "input";
            if(!isInput) type = "output";

            var conn = NodePanData.connections.filter(function(e){
                return e[type] == d.id;
            });
            if(conn.length > 0){
                return "images/terminal_connect.png";
            }
            return "images/terminal_default.png";

        }
        //Append Inputs to the node
        var inputs = gStates.selectAll('.inputs')
                .data(function(d){
                if(d.input_list){
                    var r = radius+8;
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
                .attr('id',function(d){return d.id})
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
            .attr("xlink:href", function(d){
                return getConnectionImage(d,true);
            })
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 16)
            .attr("height", 16);

        inputs.append('circle')
            .attr("r", function(d,i) { return 8; })
            .on("mouseover", function () {
                d3.select(this.parentNode).classed("hover", true);
                d3.select(this.parentNode).select('image')
                    .attr("xlink:href","images/terminal_drop.png");
            })
            .on("mouseout", function () {
                d3.select(this.parentNode).classed("hover", false);
                d3.select(this.parentNode).select('image')
                    .attr("xlink:href", function(d){
                        return getConnectionImage(d,true);
                    });
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

        //Append Outputs to the node
        var output = gStates.selectAll('.outputs')
            .data(function(d){
                if(d.output_list){
                    var r = radius+8;
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
            .attr('id',function(d){return d.id})
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
            .attr("xlink:href", function(d){
                return getConnectionImage(d,false);
            })
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 16)
            .attr("height", 16);

        output.append('circle')
            .attr("r", function(d,i) { return 8; })
            .on("mouseover", function () {
                d3.select(this.parentNode).classed("hover", true);
                d3.select(this.parentNode).select('image')
                    .attr("xlink:href","images/terminal_drop.png");
            })
            .on("mouseout", function () {
                d3.select(this.parentNode).classed("hover", false);
                d3.select(this.parentNode).select('image')
                    .attr("xlink:href", function(d){
                        return getConnectionImage(d,false);
                    });
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

        //Add connections Data and append it to group
        gTransitions = gTransitions.data( NodePanData.connections);
        gTransitions.enter().append( 'path')
            .attr('id',function(d){ return d.id;})
            .attr( 'class', 'transition')
            .attr( 'd', computeTransitionPath);
        gTransitions.exit().remove();

        //Shadow connections
        gTransitions_b = gTransitions_b.data( NodePanData.connections);
        gTransitions_b.enter().append( 'path')
            .attr('id',function(d){ return d.id;})
            .attr( 'class', 'transition_b')
            .attr( 'd', computeTransitionPath);
        gTransitions_b.exit().remove();
    };

    //=================================================================//
    //  API call to server for get the data for "nodepane" and "tools" //
    //=================================================================//

    //Call for left tool list
    //for now just add the mock data
    d3.json("data/todos.json", function(error, json) {
        ToolList = json.todos;
    });

    //Call node pane data
    // after data load it will draw the svg
    d3.json("data/saveData.json", function(error, json) {
        NodePanData.step_list = json.NodePanData.step_list;
        restart();
        for(x in json.NodePanData.connections){
            var temp = json.NodePanData.connections[x];
            if(!temp.id){
                temp.id = temp.source+"_"+temp.target+"_"+temp.output+"_"+temp.input;
            }
            NodePanData.connections.push(temp);
            restart();
        }
    });
});

//Popup Message function
// pass the title and message to show
function popupMessageBox(title,message){
    popupTitle = title ? title:"Title";
    popupMessage = message ? message:"Empty Message";
    showPopup();
}

//Display popup on screen
var showPopup = function(persistent) {
    var target = $('.qtip.jgrowl:visible:last');

    $('<div/>').qtip({
        content: {
            text: popupMessage,
            title: {
                text: popupTitle,
                button: true
            }
        },
        position: {
            target: [0,0],
            container: $('#Popup_div')
        },
        show: {
            event: false,
            ready: true,
            effect: function() {
                $(this).stop(0, 1).animate({ height: 'toggle' }, 400, 'swing');
            },
            delay: 0,
            persistent: persistent
        },
        hide: {
            event: false,
            effect: function(api) {
                $(this).stop(0, 1).animate({ height: 'toggle' }, 400, 'swing');
            }
        },
        style: {
            width: 250,
            classes: 'jgrowl',
            tip: false
        },
        events: {
            render: function(event, api) {
                if(!api.options.show.persistent) {
                    $(this).bind('mouseover mouseout', function(e) {
                        var lifespan = 2000;

                        clearTimeout(api.timer);
                        if (e.type !== 'mouseover') {
                            api.timer = setTimeout(function() { api.hide(e) }, lifespan);
                        }
                    })
                        .triggerHandler('mouseout');
                }
            }
        }
    });
}