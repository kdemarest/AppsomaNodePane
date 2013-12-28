var translates = [0,0];
var scale = 1;
var ToolList = {};
var selected = {};
var lastSavedPoints ={};
var isLinkDraw = false;
var isEdit = false;
var source_node,target_node,output_node,input_node,selected_link,selected_link_h,temp_node,near_node,selected_node;
var nodedrag = false;
var radius = 40;
var VisualPipeline ={step_list:[],connections:[]};
var popupTitle = "Title";
var popupMessage = "Message";
var _css = "";
var currentMouseEvent = undefined;

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

var zoomeffect = d3.behavior.zoom().scaleExtent([0.3,3]).on("zoom", zoom);
var svg =  viewport
    .call(zoomeffect)
    .on("dblclick.zoom", null)
    .append("g").attr('id','root');

var defs = svg.append( 'defs' );
var filter = defs.append( 'filter' )
    .attr( 'id', 'dropShadow' )
filter.append( 'feGaussianBlur' )
    .attr( 'in', 'SourceAlpha' )
    .attr( 'stdDeviation', 3 ) // !!! important parameter - blur
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

var defs1 = svg.append('defs');
defs1.append('svg:pattern')
    .attr('id', 'defaultImage')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 120)
    .attr('height', 120)
    .attr('x', 50)
    .attr('y', 50)
    .append('image')
    .attr('xlink:href', 'http://webashlar.com/Demos/checkboxes/images/container_default.png')
    .attr('x', 20)
    .attr('y', 20)
    .attr('width', 100)
    .attr('height', 100);

var defs2 = svg.append('defs');
defs2.append('svg:pattern')
    .attr('id', 'selectedImage')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 120)
    .attr('height', 120)
    .attr('x', 50)
    .attr('y', 50)
    .append('image')
    .attr('xlink:href', 'http://webashlar.com/Demos/checkboxes/images/container_selected.png')
    .attr('x', 20)
    .attr('y', 20)
    .attr('width', 100)
    .attr('height', 100);

var defs3 = svg.append('defs');
defs3.append('svg:pattern')
    .attr('id', 'connect_default_Image')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 20)
    .attr('height', 20)
    .attr('x', 8)
    .attr('y', 8)
    .append('image')
    .attr('xlink:href', 'http://webashlar.com/Demos/checkboxes/images/terminal_default.png')
    .attr('x', 4)
    .attr('y', 4)
    .attr('width', 16)
    .attr('height', 16);

var defs4 = svg.append('defs');
defs4.append('svg:pattern')
    .attr('id', 'connect_hover_Image')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 20)
    .attr('height', 20)
    .attr('x', 8)
    .attr('y', 8)
    .append('image')
    .attr('xlink:href', 'http://webashlar.com/Demos/checkboxes/images/terminal_drop.png')
    .attr('x', 4)
    .attr('y', 4)
    .attr('width', 16)
    .attr('height', 16);

var defs5 = svg.append('defs');
defs5.append('svg:pattern')
    .attr('id', 'connect_connect_Image')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 20)
    .attr('height', 20)
    .attr('x', 8)
    .attr('y', 8)
    .append('image')
    .attr('xlink:href', 'http://webashlar.com/Demos/checkboxes/images/terminal_connect.png')
    .attr('x', 4)
    .attr('y', 4)
    .attr('width', 16)
    .attr('height', 16);

/* Zoom function*/
function zoom() {
    if(isEdit){
        $( "#editText" ).blur();
    }
    if(!nodedrag && !isLinkDraw){
        translates = d3.event.translate;
        scale = d3.event.scale;
        svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        restart();
    }
}

var drag_line,drag_line_s;

    eventRect.on('mousemove', function() {
        if(isLinkDraw){
            var p = d3.mouse(this);
            var sourceX,sourceY;
            setcursor('pointer');
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
            drag_line_s.attr('d',path);
        }
    }).on("mouseup", function () {
        if(isLinkDraw){
            resetParameters();
            restart();
        }
        setcursor('default');
    }).on("mousedown", function () {
        setcursor('move');
        d3.selectAll('g.selected').classed("selected", false);
        selected_node = undefined;
        if(isEdit){
            $( "#editText" ).blur();
        }
    });

var computeTransitionPath = function( d) {
    var temp = d;
    source_node_t = VisualPipeline.step_list.filter(function(e){
        return e.id == temp.source;
    })[0];
    target_node_t = VisualPipeline.step_list.filter(function(e){
        return e.id == temp.target;
    })[0];
    output_node_t = source_node_t.output_list.filter(function(e){
        return e.id == temp.output;
    })[0];
    input_node_t = target_node_t.input_list.filter(function(e){
        return e.id == temp.input;
    })[0];
    if(source_node_t && target_node_t && output_node_t && input_node_t){
        sourceX = (source_node_t.x+output_node_t.x),
            sourceY = (source_node_t.y+output_node_t.y),
            targetX = (target_node_t.x+input_node_t.x),
            targetY = (target_node_t.y+input_node_t.y);
//        M x1  y1C  x2  y1   x1  y2   x2 y2
        return "M "+sourceX+" "+sourceY+" C"+targetX+" "+sourceY+" "+sourceX+" "+targetY+" "+targetX+" "+targetY;
    }
    return "M 0 0 C 0 0 0 0 0 0";
};

    svg.on("mousedown", function () {
        d3.event.stopPropagation();
    }).on("mouseout", function () {
        if (d3.event.relatedTarget && d3.event.relatedTarget.tagName == 'HTML') {
            d3.selectAll('g.node.selection').classed("selection", false);
        }
    });

function updateSVG(){
    $("#editText").remove();
    $("#UIModel").remove();
    d3.selectAll("text.nodeName").style("visibility","visible");
    var h = document.getElementById("root").getBBox().height;
    var w = document.getElementById("root").getBBox().width;
    if($(".nodePaneContainer").height() > h) h = $(".nodePaneContainer").height();
    if($(".nodePaneContainer").width() > w) w = $(".nodePaneContainer").width();
    if(w<500) w = 500;
    if(h<500) h = 500;

    var extraWidth =  translates[0] > 0 ?translates[0]:0;
    var extraHeight = translates[1] > 0 ?translates[1]:0;
    var fh,fw;

    if(scale<1){
        fh = (h+extraHeight);
        fw = (w+extraWidth);
    }else{
        fh = (h+extraHeight)*scale ;
        fw = (w+extraWidth)*scale;
    }

    if(fh < $(".nodePaneContainer").height()){
        fh = $(".nodePaneContainer").height();
    }
    if(fw < $(".nodePaneContainer").width()){
        fw = $(".nodePaneContainer").width();
    }
    eventRect.attr("width",fw)
        .attr("height",fh);
    viewport.attr("height",fh)
        .attr("width",fw);
    svg.attr("transform", "translate("+translates+")scale("+scale+")");
}

function setcursor(cursor){
    d3.select("body").style("cursor", cursor);
}

function resetParameters(){
    source_node = undefined;
    target_node = undefined;
    input_node = undefined;
    output_node = undefined;
    selected_link = undefined;
    temp_node = undefined;
    near_node = undefined;
    isLinkDraw = false;
    isEdit = false;
    setcursor('default');
    $('#editText').remove();
    $("#UIModel").remove();
    drag_line.classed('hidden', true).attr('d',"M 0 0 C 0 0 0 0 0 0");
    drag_line_s.classed('hidden', true).attr('d',"M 0 0 C 0 0 0 0 0 0");
}

var isLoop = function(_source,_target){
    var loop_val = false;
    function recurs(id){
        var tempLi = VisualPipeline.connections.filter(function(e){
            return e.target == id;
        });
        for(l in tempLi){
            var c = tempLi[l];
            if(c.source == _target){
                loop_val = true;
                break;
            }else{
                recurs(c.source);
            }
        }
    }
    recurs(_source);
    return loop_val;
}
//Add new connection between nodes
var addPath = function(){
    if(source_node && target_node && input_node && output_node){
        if(source_node != target_node){
            var connection = {source: source_node.id, target: target_node.id,output:output_node.id,input:input_node.id};
            connection.id = source_node.id+"_"+target_node.id+"_"+output_node.id+"_"+input_node.id;
            var isExist = VisualPipeline.connections.filter(function(e){
                return e.id == connection.id;
            });
            //here is check for already exist connection
            //we can add more check here
            if(isExist.length == 0){
                if(isLoop(source_node.id,target_node.id)){
                    popupMessageBox("Error","You are creating endless loop.");
                }else{
                    if(input_node.type == output_node.type){
                        if(selected_link){
                            var index = VisualPipeline.connections.indexOf(selected_link);
                            selected_link = undefined;
                            VisualPipeline.connections.splice(index,1);
                            restart();
                        }

                        VisualPipeline.connections.push(connection);
                        resetParameters();
                        restart();
                    }else{
                        popupMessageBox("Error","input and output type is not same.");
                    }
                }

            }else{
                popupMessageBox("Error","Link already exist");
            }
        }else{
            popupMessageBox("Error","Can not connect on same tool");
        }
    }
    resetParameters();
}

//Remove node from pane
//id of the node which you want to remove
function removeTool(id){
    var relatedConnection = VisualPipeline.connections.filter(function(e){
        return e.source == id || e.target == id;
    });
    for(v in relatedConnection){
        var index = VisualPipeline.connections.indexOf(relatedConnection[v]);
        VisualPipeline.connections.splice(index,1);
    }
    var removeNode,index_node;
    for(b in VisualPipeline.step_list){
        if(VisualPipeline.step_list[b].id == id){
            removeNode = VisualPipeline.step_list[b]
            index_node = b;
            break
        }
    }
    VisualPipeline.step_list.splice(index_node,1);
    restart();
}

function removeConnection(id){
    var connection = VisualPipeline.connections.filter(function(e){
        return e.id == id;
    })[0];
    if(connection){
        var index = VisualPipeline.connections.indexOf(connection);
        VisualPipeline.connections.splice(index,1);
        resetParameters();
        restart();
    }
}

function getPreviousConnection(id){
    var connection = VisualPipeline.connections.filter(function(e){
        return e.input == id;
    });
    return connection;
}
//Function for center image of node that we can add or replace image url or callback
//according to requirement.
function getImageType(type){
    var img = "http://webashlar.com/Demos/checkboxes/images/folder.png";
    switch (type){
        case "data_io.batch_input":
            img = "http://webashlar.com/Demos/checkboxes/images/note.png";
            break;
        case "data_io.sort_files":
            img = "http://webashlar.com/Demos/checkboxes/images/sorting.png";
            break;
        case "data_io.compress":
            img = "http://webashlar.com/Demos/checkboxes/images/compress.png";
            break;
        case "data_io.input_file":
            img = "http://webashlar.com/Demos/checkboxes/images/folder.png";
            break;
        case "picard.merge":
            img = "http://webashlar.com/Demos/checkboxes/images/merge.png";
            break;
        default :
    }
    return img;
}

function checkOverrideNode(d){
    for(_n in VisualPipeline.step_list){
        var _node = VisualPipeline.step_list[_n];
        if(_node.id != d.id){
            if(Math.pow((d.x - _node.x),2) + Math.pow((d.y - _node.y),2) <= Math.pow(100,2)){
                console.log(lastSavedPoints);
                _node_t = VisualPipeline.step_list.filter(function(e){
                    return e.id == d.id;
                })[0];
                _node_t.x = parseFloat(lastSavedPoints.x);
                _node_t.y = parseFloat(lastSavedPoints.y);
                resetParameters();
                restart();
                break;
            }
        }
    }
    lastSavedPoints = {};
}

function restart() {

    // Remove all old elements from svg only node and links not the drag line and rect
    svg.selectAll("g.node").remove();
    svg.selectAll("g.links").remove();
    svg.selectAll("g.links_s").remove();
    svg.selectAll("g.linkRemove").remove();
    svg.selectAll("g.dragline_g").remove();
    svg.selectAll("g.dragline_s_g").remove();

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
                selection = d3.select(this);
                selection.classed("selected", true);
            }
            selected_node = d;
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
            updateSVG();
            d3.event.sourceEvent.stopPropagation();
        })
        .on("dragstart", function (d) {
            lastSavedPoints.x = d.x+"";
            lastSavedPoints.y = d.y+"";
            d3.event.sourceEvent.stopPropagation();
        })
        .on("dragend", function (d) {
            nodedrag = false;
            checkOverrideNode(d)
            d3.event.sourceEvent.stopPropagation();
        });

    //Add data to node
    gStates = gStates.data(VisualPipeline.step_list);
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
            if(output_node){
                source_node = d;
            }else{
                target_node = d;
            }

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

                var path = "M "+sourceX+" "+sourceY+" C"+sourceX+" "+sourceY+" "+sourceX+" "+sourceY+" "+sourceX+" "+sourceY;
                drag_line.classed('hidden', false).attr('d',path);
                drag_line_s.classed('hidden', false).attr('d',path);
            }
        }).on("mouseup", function (d) {
            if(target_node){
                source_node = d;
                addPath();
            }else{
                target_node = d;
                if(input_node){
                    var tempRemove = getPreviousConnection(input_node.id);
                    if(tempRemove.length > 0){
                        popupMessageBox("Error","Input already connected");
                        resetParameters();
                    }
                }
                addPath();
            }
        }).on("click", function (d, i) {
            var e = d3.event,
                g = this;
            d3.selectAll('g.selected').classed("selected", false);
            d3.select(g).classed("selected", true);
            selected_node = d;
            if(g.parentNode)
                g.parentNode.appendChild(g);
        })
        .on("mousemove", function (d) {
            if(isLinkDraw){
                var p = d3.mouse(this.parentNode);
                var sourceX,sourceY;
                if(source_node){
                    sourceX = (source_node.x+output_node.x);
                    sourceY = (source_node.y+output_node.y);
                }else{
                    sourceX = (target_node.x+input_node.x);
                    sourceY = (target_node.y+input_node.y);
                }

                if(input_node){
                    var tempRemove = getPreviousConnection(input_node.id);
                    if(tempRemove.length > 0){
                        selected_link = tempRemove[0];
                        source_node = VisualPipeline.step_list.filter(function(e){
                            return e.id == selected_link.source;
                        })[0];

                        output_node = source_node.output_list.filter(function(e){
                            return e.id == selected_link.output;
                        })[0];

                        temp_node = output_node.id;
                        var index = VisualPipeline.connections.indexOf(tempRemove[0]);
                        VisualPipeline.connections.splice(index,1);
                        input_node = undefined;
                        target_node = undefined;
                        selected_link = undefined;
                        restart();
                        lightUpEligible(output_node,false);
                    }
                }

                var xn = p[0];
                var yn = p[1];

                if(near_node){
                    xn = (d.x+near_node.x);
                    yn = (d.y+near_node.y);
                }

                var path = "M "+sourceX+" "+sourceY+" C"+xn+" "+sourceY+" "+sourceX+" "+yn+" "+xn+" "+yn;
                drag_line.classed('hidden', false).attr('d',path);
                drag_line_s.classed('hidden', false).attr('d',path);
            }
        })
        .on("mouseover", function(){
            d3.select(this).classed("hover", true);
        })
        .on("mouseout", function () {
            d3.select(this).classed("hover", false);
        })
        .call(drag);


    //Append each node to in main group
    var node = gState.append("g")
        .attr("class","tool");

    node.append("circle")
        .attr({
            r: radius + 2,
            class: 'outer'
        });

    node.append("image")
        .attr("xlink:href",function(d){
            return getImageType(d.type);
        })
        .attr("x",-20)
        .attr("y",-20)
        .attr("width",40)
        .attr("height",40);

    node.append('circle')
        .attr('r',function(){return radius+45;})
        .attr("stroke-width",0)
        .style('fill','none')
        .attr('pointer-events', 'all')
        .on("mousemove",function(d){
            var p = d3.mouse(this);
            if(isLinkDraw){
                if(input_node){
                    var _output = d.output_list;
                    var _map = [];
                    for(t in _output){
                        var _ot = _output[t];
                        if(_ot.type == input_node.type && isEligible(_ot,false)){
                            var obj = {};
                            obj.op = _ot;
                            obj.dis = Math.sqrt(((p[0]-_ot.x)*(p[0]-_ot.x))+((p[1]-_ot.y)*(p[1]-_ot.y)));
                            _map.push(obj);
                        }
                    }

                    if(_map.length > 0){
                        _map.sort(function(a,b){
                            if(a.dis > b.dis) return 1;
                            else return -1;
                        })
                        if(_map[0].dis < 28){
                            near_node = _map[0].op;
                        }else{
                            near_node = undefined
                        }
                    }else{
                        near_node = undefined;
                    }

                }else{
                    var _input = d.input_list;
                    var _map = [];
                    for(t in _input){
                        var _ot = _input[t];
                        if(_ot.type == output_node.type && isEligible(_ot,true)){
                            var obj = {};
                            obj.op = _ot;
                            obj.dis = Math.sqrt(((p[0]-_ot.x)*(p[0]-_ot.x))+((p[1]-_ot.y)*(p[1]-_ot.y)));
                            _map.push(obj);
                        }
                    }

                    if(_map.length > 0){
                        _map.sort(function(a,b){
                            if(a.dis > b.dis) return 1;
                            else return -1;
                        })
                        if(_map[0].dis < 28){
                            near_node = _map[0].op;
                        }else{
                            near_node = undefined
                        }
                    }else{
                        near_node = undefined;
                    }
                }
            }
        })
        .on("mouseup", function (d) {
            if(isLinkDraw){
                if(input_node){
                    if(near_node){
                        isLinkDraw = false;
                        output_node = near_node;
                    }
                }else{
                    if(near_node){
                        isLinkDraw = false;
                        input_node = near_node;
                    }
                }
            }
        });

    node.append("text")
        .attr("class","nodeName")
        .attr({
            'text-anchor': 'middle',
            y: (radius + 25)
        })
        .text(function (d) {
            return d.name;
        }).on('click',function(d){
            var g = this;
            var el = d3.select(g);
            $('#editText').remove();
            d3.selectAll("text.nodeName").style("visibility","visible");
            d3.select(g).style("visibility","hidden");
            isEdit = true;
            var p = d3.mouse(g);
            var tempBlur = false;
            if($('#editText').length < 1){
                $('<div>').attr({
                    id: 'UIModel'
                }).appendTo('body');

                $('<input>').attr({
                    type: 'text',
                    id: 'editText',
                    name: 'editableText'
                }).appendTo('#nodePane');

                $( "#editText" ).focus(function() {
                    isEdit = true;
                });

                $( "#editText" ).keypress(function(event) {
                    isEdit = true;
                    if(event.keyCode == 13){
                        if($( "#editText").val().trim().length > 0){
                            d.name = $( "#editText").val();
                            el.text(function(d) { return d.name; });
                        }
                        isEdit = false;
                        restart();
                    }
                });

                setTimeout(function(){
                    $('#editText').attr('style',function(){
                        var _temp = $("#nodePane").offset();
                        var _right = _temp.left+$("#nodePane").width();
                        e = window.event;
                        if(!e){
                            e = currentMouseEvent;
                            var fx = (e.clientX-p[0]-60);
                            var fy = (e.clientY-(p[1]/2)+10);

                            if(Math.abs((_temp.left - fx)) < 50){
                                tempBlur = true;
                                var _scroll = $('#nodePane').scrollLeft();
                                if(_scroll > 80){
                                    $('#nodePane').scrollLeft(_scroll-80);
                                    fx = fx + 80;
                                }
                            }

                            if(Math.abs((_right - fx)) < 120){
                                tempBlur = true;
                                var _scroll = $('#nodePane').scrollLeft();
                                $(' #nodePane').scrollLeft(_scroll+80);
                                fx = fx - 80;
                            }
                            return 'top:'+fy+'px; left:'+fx+'px';
                        }
//                var fx = (d.x+260)-($('#nodePane').scrollLeft());
//                var fy = (d.y+radius+25)-($('#nodePane').scrollTop());
                        var fx = (e.x-p[0]-60);
                        var fy = (e.y-(p[1]/2)+15);

                        if(Math.abs((_temp.left - fx)) < 50){
                            tempBlur = true;
                            var _scroll = $('#nodePane').scrollLeft();
                            if(_scroll > 80){
                                $('#nodePane').scrollLeft(_scroll-80);
                                fx = fx + 80;
                            }
                        }

                        if(Math.abs((_right - fx)) < 120){
                            tempBlur = true;
                            var _scroll = $('#nodePane').scrollLeft();
                            $('#nodePane').scrollLeft(_scroll+80);
                            fx = fx - 80;
                        }
                        return 'top:'+fy+'px; left:'+fx+'px';
                    });
                },0)

                $( "#editText" ).blur(function() {
                    if(tempBlur){
                        setTimeout(function(){
                            $('#editText').focusWithoutScrolling().attr('value',function(){
                                tempBlur = false;
                                return d.name;
                            });
                        }, 1);
                    }else{
                        if($( "#editText").val().trim().length > 0){
                            d.name = $( "#editText").val();
                            el.text(function(d) { return d.name; });
                        }
                        isEdit = false;
                        restart();
                    }
                });
            }

            setTimeout(function(){
                $('#editText').focusWithoutScrolling().attr('value',function(){
                    return d.name;
                });
            }, 1);
        });

    node.append("title").text(function (d) {
        return d.name;
    });

    // function for calculate the position on input/output node (arc around the node)
    var getStartingPoint = function(n,isinput){
        var sp;
        if(isinput){
            sp = 11.2;
            if(n>1){
                var t = parseInt(n/2);
                sp = sp - (t*0.35);
                if(n%2){
                    sp = sp - 0.20;
                }
            }else{
                sp = 11;
            }
        }else{
            sp= 1.75
            if(n>1){
                var t = parseInt(n/2);
                sp = sp - (t*0.35);
                if(n%2){
                    sp = sp - 0.20;
                }
            }else{
                sp = 1.5
            }
        }
        return sp;
    }

    //Input/Output image if is connected or not
    var getConnectionImage = function(d,isInput){
        var type = "input";
        if(!isInput) type = "output";

        var conn = VisualPipeline.connections.filter(function(e){
            return e[type] == d.id;
        });
        if(conn.length > 0){
            return "url('#connect_connect_Image')";
        }
        return "url('#connect_default_Image')";

    }

    /*
     * check for port eligibility
     * */
    var isEligible = function(d,isInput){
        var type = "input";
        if(!isInput) type = "output";

        var conn = VisualPipeline.connections.filter(function(e){
            return e[type] == d.id;
        });
        if(conn.length > 0){
            return false;
        }
        return true;
    }

    /*
     * Lighted up all eligible connection for port
     * */
    function lightUpEligible(d,isInput){
        if(isInput){
            var list = d3.selectAll('g.outputs');
            var elem = list[0];

            var vvv = d3.selectAll("g.inputs.hover")[0];
            for(v in elem){
                var o = elem[v]
                if(o.className && o.className.baseVal == 'outputs'){
                    var _data = o.__data__;
                    if(o.parentNode != vvv[0].parentNode){
                        if(_data.type == d.type && !isLoop(vvv[0].parentNode.__data__.id,o.parentNode.__data__.id)){
                            for(n in o.childNodes){
                                if(o.childNodes[n].className && o.childNodes[n].className.baseVal== "imageCircle"){
                                    d3.select(o.childNodes[n]).style("fill","url('#connect_hover_Image')");
                                }
                            }
                        }
                    }
                }
            }
        }else{
            var list = d3.selectAll('g.inputs');
            var elem = list[0];

            var vvv = d3.selectAll("g.outputs.hover")[0];
            for(v in elem){
                var o = elem[v]
                if(o.className && o.className.baseVal == 'inputs'){
                    var _data = o.__data__;
                    if(o.parentNode != vvv[0].parentNode){
                        if(_data.type == d.type && isEligible(_data,true) && !isLoop(vvv[0].parentNode.__data__.id,o.parentNode.__data__.id)){
                            d3.select(o.firstChild).style("fill","url('#connect_hover_Image')");for(n in o.childNodes){
                                if(o.childNodes[n].className && o.childNodes[n].className.baseVal== "imageCircle"){
                                    d3.select(o.childNodes[n]).style("fill","url('#connect_hover_Image')");
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /*
     * reset all lighted ports
     * */
    function lightOffEligible(){
        var list = d3.selectAll('g.inputs');
        var elem = list[0];
        for(v in elem){
            var o = elem[v]
            if(o.className && o.className.baseVal == 'inputs'){
                var _data = o.__data__;
                for(n in o.childNodes){
                    if(o.childNodes[n].className && o.childNodes[n].className.baseVal== "imageCircle"){
                        d3.select(o.childNodes[n]).style('fill',function(d){return getConnectionImage(_data,true);});
                    }
                }
            }
        }

        var list = d3.selectAll('g.outputs');
        var elem = list[0];
        for(v in elem){
            var o = elem[v]
            if(o.className && o.className.baseVal == 'outputs'){
                var _data = o.__data__;
                for(n in o.childNodes){
                    if(o.childNodes[n].className && o.childNodes[n].className.baseVal== "imageCircle"){
                        d3.select(o.childNodes[n]).style('fill',function(d){return getConnectionImage(_data,false);});
                    }
                }
            }
        }
    }

    //Append Inputs to the node
    var inputs = gStates.selectAll('.inputs')
        .data(function(d){
            if(d.input_list){
                var r = radius+14;
                var a = getStartingPoint(d.input_list.length,true);
                for(t in d.input_list){
                    d.input_list[t].x = r*Math.sin(a);
                    d.input_list[t].y = r*Math.cos(a);
                    a = a + 0.35;
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
        }).on("mouseup", function (d) {
            isLinkDraw =false;
            input_node = d;
            if(near_node){
                input_node = near_node;
            }
        });

    inputs.append('circle')
        .attr('class','imageCircle')
        .attr("r", function(d,i) { return 8; })
        .style('fill',function(d){
            if(temp_node && temp_node == d.id){
                d3.select(this.parentNode).classed("hover", true);
                return "url('#connect_hover_Image')";
            }
            return getConnectionImage(d,true);
        })
        .on("mouseover", function (d) {
            if(!isLinkDraw){

                d3.select(this.parentNode).classed("hover", true);
                if(isEligible(d,true)){
                    d3.select(this)
                        .style("fill","url('#connect_hover_Image')");
                }
                lightUpEligible(d,true);
                $(this.parentNode).qtip({
                    content: {
                        text: d.type,
                        title: {
                            text: d.name
                        }
                    },
                    position: {
                        my: 'top left',
                        at: 'bottom right'
                    }
                });
            }
        })
        .on("mouseout", function () {
            hideToolTips();
            d3.select(this.parentNode).classed("hover", false);
            if(!isLinkDraw){
                temp_node = undefined;
                d3.select(this).style('fill',function(d){return getConnectionImage(d,true);})
                lightOffEligible();
            }
        });

    inputs.append("image")
        .attr("xlink:href",'http://www.webashlar.com/Demos/checkboxes/images/shim.png')
        .attr("x",4)
        .attr("y",-5)
        .attr("width",10)
        .attr("height",10)
        .attr("transform", function(d,i) {
            var angle = Math.atan( (d.y/ d.x)) * ( 180/ Math.PI );
            var rotation = "rotate(" + angle + ")";
            return rotation;
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
                var r = radius+14;
                var a = getStartingPoint(d.output_list.length,false);
                for(t in d.output_list){
                    d.output_list[t].x = r*Math.sin(a);
                    d.output_list[t].y = r*Math.cos(a);
                    a = a + 0.35;
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
        }).on("mouseup", function (d) {
            isLinkDraw =false;
            output_node = d;
            if(near_node){
                output_node = near_node;
            }
        });

    output.append('circle')
        .attr('class','imageCircle')
        .attr("r", function(d,i) { return 8; })
        .style('fill',function(d){
            if(temp_node && temp_node == d.id){
                d3.select(this.parentNode).classed("hover", true);
                return "url('#connect_hover_Image')";
            }
            return getConnectionImage(d,false);
        })
        .on("mouseover", function (d) {
            if(!isLinkDraw){
                temp_node = d.id;
                d3.select(this.parentNode).classed("hover", true);
                d3.select(this).style("fill","url('#connect_hover_Image')");
                lightUpEligible(d,false);
                $(this.parentNode).qtip({
                    content: {
                        text: d.type,
                        title: {
                            text: d.name
                        }
                    },
                    position: {
                        my: 'top right',
                        at: 'bottom left'
                    }
                });
            }
        })
        .on("mouseout", function () {
            hideToolTips();
            d3.select(this.parentNode).classed("hover", false);
            if(!isLinkDraw){
                temp_node = undefined;
                d3.select(this).style('fill',function(d){return getConnectionImage(d,false);})
                lightOffEligible();
            }

        });

    output.append("image")
        .attr("xlink:href",'http://www.webashlar.com/Demos/checkboxes/images/shim.png')
        .attr("x",-14)
        .attr("y",-5)
        .attr("width",10)
        .attr("height",10)
        .attr("transform", function(d,i) {
            var angle = Math.atan((d.y/ d.x)) * ( 180/ Math.PI );
            var rotation = "rotate(" + angle + ")";
            return rotation;
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

    // Add the controls remove and play
    var controls = gState.append("g").attr("class","controls");

    controls.append("image")
        .attr("xlink:href","http://webashlar.com/Demos/checkboxes/images/run.png")
        .attr("x", -50)
        .attr("y", -80)
        .attr("width",25)
        .attr("height",25)
        .on("click", function(d) {
            popupMessageBox("Run "+ d.name,"Running the selected tool");
        }).on("mouseover", function (d) {
            d3.select(this).classed("hover", true);
        }).on("mouseout", function () {
            d3.select(this).classed("hover", false);
        });

    controls.append("image")
        .attr("xlink:href","http://webashlar.com/Demos/checkboxes/images/info.png")
        .attr("x", -25)
        .attr("y", -80)
        .attr('id',function(d){
            return d.id+"_tip";
        })
        .attr("width",25)
        .attr("height",25)
        .on("click", function(d) {
//            var info = ""
//            if(d.params && d.params.descriptionText)
//                info=d.params.descriptionText;
//            popupMessageBox(d.name,info);
        }).on("mouseover", function (d) {
            d3.select(this).classed("hover", true);
        }).on("mouseout", function () {
            d3.select(this).classed("hover", false);
        }).call(function(d){
            for(_d in d[0]){
                var id = d[0][_d].id;
                var _data = d[0][_d].__data__;
                if(_data){
                    $('#'+id+'').qtip({
                        content: {
                            text: function(){
                                var info = "lorem ipsum"
                                if(selected_node.params && selected_node.params.descriptionText)
                                    info=selected_node.params.descriptionText;
                                return info;
                            },
                            title: {
                                text: function(){
                                    if(selected_node)
                                        return selected_node.name;
                                    else
                                        return "";
                                },
                                button: true
                            }
                        },
                        show: 'click',
                        hide: 'unfocus',
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
            }

        });

    controls.append("image")
        .attr("xlink:href","http://webashlar.com/Demos/checkboxes/images/edit.png")
        .attr("x", 0)
        .attr("y", -80)
        .attr("width",25)
        .attr("height",25)
        .on("click", function(d) {
            popupMessageBox("Edit "+ d.name,"Edit the selected tool");
        }).on("mouseover", function (d) {
            d3.select(this).classed("hover", true);
        }).on("mouseout", function () {
            d3.select(this).classed("hover", false);
        });

    controls.append("image")
        .attr("xlink:href","http://webashlar.com/Demos/checkboxes/images/remove.png")
        .attr("x",25)
        .attr("y", -80)
        .attr("width",25)
        .attr("height",25)
        .on("click", function(d) {
            removeTool(d.id);
        }).on("mouseover", function (d) {
            d3.select(this).classed("hover", true);
        }).on("mouseout", function () {
            d3.select(this).classed("hover", false);
        });

    gStates.exit().remove();

    //Add connections Data and append it to group
    gTransitions = gTransitions.data( VisualPipeline.connections);
    gTransitions.enter().append( 'path')
        .attr('id',function(d){ return d.id;})
        .attr( 'class', 'transition')
        .attr( 'd', computeTransitionPath);
    gTransitions.exit().remove();

    var timer;
    //Shadow connections
    gTransitions_b = gTransitions_b.data( VisualPipeline.connections);
    gTransitions_b.enter().append( 'path')
        .attr('id',function(d){ return d.id;})
        .attr( 'class', 'transition_b')
        .attr( 'd', computeTransitionPath)
        .on("mouseover", function (d) {
            if(!isLinkDraw && !nodedrag){
                clearTimeout(timer)
                selected_link_h = d;
                var p = d3.mouse(this);
                remove_line.attr("x", p[0]-15)
                    .attr("y",p[1]-15);
                remove_line.classed("hidden", false);
            }
        });
    gTransitions_b.exit().remove();

    drag_line = svg.append('g').attr('class','dragline_g')
        .attr('pointer-events', 'none').append('path')
        .attr('class','dragline hidden')
        .attr('d', "M 0 0 C 0 0 0 0 0 0");

    drag_line_s = svg.append('g').attr('class','dragline_s_g')
        .attr('pointer-events', 'none').append('path')
        .attr('class','dragline_s hidden')
        .attr('d', "M 0 0 C 0 0 0 0 0 0");

    var remove_line = svg.append('g').attr('class','linkRemove').append("image")
        .attr('class','removeline hidden')
        .attr("xlink:href","http://webashlar.com/Demos/checkboxes/images/close_default.png")
        .attr("x", -50)
        .attr("y", -50)
        .attr("width",28)
        .attr("height",28)
        .on("click", function(d) {
            if(selected_link_h)
                removeConnection(selected_link_h.id);
        }).on("mouseover", function () {
            clearTimeout(timer);
        }).on("mouseout", function () {
            timer = setTimeout(function(){
                remove_line.attr("x",-50)
                    .attr("y",-50);
                remove_line.classed("hidden", true);
                selected_link_h = undefined;
            },1000);
        });

    updateSVG();
};

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

function hideToolTips(){
    $('div.qtip:visible').qtip('hide');
}

$(document).keydown(function(e){
    if (e.keyCode == 46) {
        removeSelected();
    }
    if (e.keyCode == 27 && isEdit) {
        restart();
    }
});

function removeSelected(){
    if(selected_node && !isEdit){
        removeTool(selected_node.id);
        selected_node = undefined;
    }
}

function loadDataToPan(json){
    if(json.VisualPipeline && json.VisualPipeline.step_list){
        VisualPipeline.step_list = [];
        VisualPipeline.connections = [];
        VisualPipeline.step_list = json.VisualPipeline.step_list;
        restart();
        if(json.VisualPipeline.connections){
            for(x in json.VisualPipeline.connections){
                var temp = json.VisualPipeline.connections[x];
                if(!temp.id){
                    temp.id = temp.source+"_"+temp.target+"_"+temp.output+"_"+temp.input;
                }
                VisualPipeline.connections.push(temp);
                restart();
            }
        }
    }
}


function convertDataJson(){
    var _data = {};
    var _st = JSON.stringify(VisualPipeline);
    _data.VisualPipeline = JSON.parse(_st);
    return JSON.stringify(cleanJsonData(_data));
}

function getJson(){
    $("#inputArea").val(convertDataJson());
    $("#saveDialog").dialog({modal: true, height: 400, width: 600 });
}

function cleanJsonData(json){
      if(json && json.VisualPipeline && json.VisualPipeline.step_list){
          var list = json.VisualPipeline.step_list;
          for(m in list){
              var mn = list[m];
              for( _in in mn.input_list){
                  delete mn.input_list[_in].x;
                  delete mn.input_list[_in].y;
              }

              for( _op in mn.output_list){
                  delete mn.output_list[_op].x;
                  delete mn.output_list[_op].y;
              }
          }
      }
    return json;
}

function loadData(){
    if($("#loadDataInput").val().length > 0){
        var json = JSON.parse($("#loadDataInput").val());
        loadDataToPan(json);
    }
    $("#loadDialog").dialog('close');
}

function insertData(){
    $("#loadDataInput").val("");
    $("#loadDialog").dialog({modal: true, height: 430, width: 600 });
}

$( window ).resize(function() {
    restart();
});

$("#nodePane").droppable({
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
        var posX = event.originalEvent.clientX - $(this).offset().left + $(this).scrollLeft();
        var posY = event.originalEvent.clientY - $(this).offset().top + $(this).scrollTop();
        var obj = ToolList[selected.id];
        obj.x = (posX/scale)-(translates[0]/scale);
        obj.y = (posY/scale)-(translates[1]/scale);
        var tempObj = JSON.parse(JSON.stringify(obj));
        tempObj.id = obj.id+"D"+Date.now();
        addToolToNodePane(tempObj)
//        VisualPipeline.step_list.push(tempObj);
//        restart();
    }
});

function addToolToNodePane(_node){
    var _recurse = function(_node_){
         for(_n in VisualPipeline.step_list){
            var _node_temp = JSON.parse(JSON.stringify(VisualPipeline.step_list[_n]));
                if(Math.pow((_node_.x - _node_temp.x),2) + Math.pow((_node_.y - _node_temp.y),2) <= Math.pow(100,2)){
                    _node_.y = parseFloat((_node_temp.y + 140)+"");
                    _recurse(_node_);
                }
        }
    }
    _recurse(_node);

    VisualPipeline.step_list.push(_node);
    restart();
}

    //=================================================================//
    //  API call to server for get the data for "nodepane" and "tools" //
    //=================================================================//

    //Call for left tool list
    //for now just add the mock data
    d3.json("data/todos.json", function(error, json) {
        ToolList = json.todos;
        for(v in ToolList){
            var html =  '<li class="dragElement" id="'+v+'">'+ToolList[v].name+'</li>'
            $('#tools').append(html);
        }

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
    });

    //Call node pane data
    // after data load it will draw the svg
    d3.json("data/saveData.json", function(error, json) {
        if(json)
            loadDataToPan(json);
    });

    /*
      we need to load this css for our svg when we save it we can append it to svg
      On browser we have css but when we save our svg and sending to server we need add required
      css with svg tag so we can load svg as it's.
    * */
    $.when($.get("css/svg.css")).done(function(response) {
        _css  = '<style type="text/css"><![CDATA[ '+ response +']]></style>';
    });

function generateSVG(){
    // adding links for xmlns that we need to load svg.
    var xml_1 = d3.select("svg").node().parentNode.innerHTML;
    var xmlLinks = 'version="1.1" baseProfile="basic" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ';
    var mystring = xml_1+"";
    var SVG_TAG = "svg";
    var _links = mystring.indexOf(SVG_TAG)+SVG_TAG.length+1;
    mystring = mystring.replace('<svg','<svg '+xmlLinks+'');
    var _svgtag = mystring.substr(0,mystring.lastIndexOf("</svg>"));
    _svgtag = _svgtag+" "+_css+'</svg>';
    return _svgtag;
}

function getData(){
    var _data = {};
    _data.visualGraph = convertDataJson();
    _data.svg = generateSVG();
    return _data;
}

function resetZoom(){
    zoomeffect.translate([0,0]);
    zoomeffect.scale([1]);
    zoomeffect.event(svg);
}
/*
* bind the click event of DOM for getting absolute position of mouse
* on edit node label
* */
$(document).click(function(event) {
    currentMouseEvent = event;
});

/*
* reset svg on scroll
* */
var prevLeft = 0;
$('#nodePane').scroll(function(event){
    var currentLeft = $(this).scrollLeft();
    if(prevLeft != currentLeft) {
        prevLeft = currentLeft;
//        console.log("I scrolled horizontal.");
    }else{
//        console.log("I scrolled vertically.");
    }
    if(isEdit){
        $( "#editText" ).blur();
    }
});

$.fn.focusWithoutScrolling = function(){
    var x = window.scrollX, y = window.scrollY;
    this.focus();
    window.scrollTo(x,y);
    return this; //chainability
};