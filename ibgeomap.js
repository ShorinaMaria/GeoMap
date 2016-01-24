/*
 * Created by vshevaldin on 10.10.2014.
 */

    /*
    * Рассчёт ширины текса в пикселях
    * */

    var getTextWidth = function (text, font) {
        // re-use canvas object for better performance
        var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
        var context = canvas.getContext("2d");
        context.font = font;
        var metrics = context.measureText(text);
        return {
            width:metrics.width,
            height:metrics.height
        };
    };

    /*
    * Нахождение угла между двумя векторами с обной общей точкой
    * */


    var angle = function (commonPoint, p1, p2) {
        var x1 = p1.x - commonPoint.x; //(x1,y1) - вектор
        var y1 = p1.y - commonPoint.y; //(x2,y2) - проекция вектора на ось X
        var x2 = p2.x - commonPoint.x;
        var y2 = p2.y - commonPoint.y;
        var cos = (x1 * x2 + y1 * y2) / (Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2));
        var alpha = Math.round((Math.acos(cos) * 180) / Math.PI);
        var degree = 0;
        if (x1 > 0 && y1 > 0 && x2 > 0) {
            degree = 90 - alpha;
        }
        if (x1 > 0 && y1 < 0 && x2 > 0) {
            degree = 90 + alpha;
        }
        if (x1 < 0 && y1 < 0 && x2 < 0) {
            degree = 270 - alpha;
        }
        if (x1 < 0 && y1 > 0 && x2 < 0) {
            degree = 270 + alpha;
        }
        if (x1 === x2 && x1 > 0 && y1 === 0 && y2 === 0) {
            degree = 90;
        }
        if (x1 === x2 && x1 === 0 && y2 === 0 &&  y1 < 0) {
            degree = 180;
        }
        if (x1 === x2 && x1 < 0 && y1 === y2 && y1 === 0) {
            degree = 270;
        }
        return degree;
    };

    /*Клонирование объекта*/
    var clone = function (obj) {
        var copy;

        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;

        // Handle Date
        if (obj instanceof Date) {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle Array
        if (obj instanceof Array) {
            copy = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        // Handle Object
        if (obj instanceof Object) {
            copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }

        throw new Error("Unable to copy obj! Its type isn't supported.");
    };


    var paramsToObj = function (paramJSON) {
        var to = null;
        if (typeof paramJSON !== "object" && paramJSON !== null && paramJSON !== undefined) {
            try {
                to = JSON.parse(paramJSON);
            } catch (e) {
                console.log(e);
                return null;
            }
        } else {
            to = paramJSON;
        }
        return to;
    };

    /*-----------------------------------------------Объект-построитель маршрутов--------------------------------*/
    var ibGeoRoute = function (options) {
        var self = this;
        this._options = options;
        this._graph = null;

        this._startPoint = null;
        this._endPoint = null;

        this.init = function (routeGraph) {
            this._options.rg = routeGraph;
            if (!this._options.style) {
                this._options.style = {
                    noClip: true,
                    color: 'red'
                };
            }
        };

        this.setStyle = function (style) {
            this._options.style = style;
        };

        this.getStyle = function () {
            return this._options.style;
        };

        this.isReady = function () {
            if (!this._options.rg || !this._options.rg.loaded) {
                return false;
            } else {
                return true;
            }
        };

        this._getClosestPoint = function (point, level) { //Ищет в массиве точек и возвращает объект содержащий ближайшую точку к заданной

            if (!this._options.rg) {
                return
            }
            var level_nodes = this._options.rg.levels[level];

            if (!level_nodes) {
                return;
            }

            var nodes = this._options.rg.nodes.filter(function (node) {
                if (level_nodes.indexOf(node.id) !== -1) {
                    return node;
                }
            });

            function compare(a, b) {
                var ap = L.latLng(a.y, a.x);
                var bp = L.latLng(b.y, b.x);

                var adist = point.distanceTo(ap);
                var bdist = point.distanceTo(bp);

                if (adist < bdist)
                    return -1;
                if (adist > bdist)
                    return 1;
                return 0;
            }
            nodes.sort(compare);
            var pointS = {
                id: nodes[0].id, // В качестве идентификатора точки на графе отдаём Id ближайшей вершины. Необходимо для рассчёта маршрута.
                x: 0,
                y: 0
            }
            var pointA = {};
            pointA.x = parseFloat(nodes[1].x);
            pointA.y = parseFloat(nodes[1].y);
            var pointB = {};
            pointB.x = parseFloat(nodes[0].x);
            pointB.y = parseFloat(nodes[0].y);
            var pointC = {};
            pointC.x = point.lng;
            pointC.y = point.lat;

            if (pointC.x === pointA.x && pointC.y === pointA.y) {
                return pointA;
            }
            if (pointC.x === pointB.x && pointC.y === pointB.y) {
                return pointB;
            }

            pointS.x = pointA.x + (pointB.x - pointA.x)*(((pointC.x-pointA.x)*(pointB.x-pointA.x)+(pointC.y-pointA.y)*(pointB.y-pointA.y))/((pointB.x-pointA.x)*(pointB.x-pointA.x)+(pointB.y-pointA.y)*(pointB.y-pointA.y)));
            pointS.y = pointA.y + (pointB.y-pointA.y)*(((pointC.x-pointA.x)*(pointB.x-pointA.x)+(pointC.y-pointA.y)*(pointB.y-pointA.y))/((pointB.x-pointA.x)*(pointB.x-pointA.x)+(pointB.y-pointA.y)*(pointB.y-pointA.y)));

            return pointS;
        };

        this._getNeighbors = function (node_id, graph) { //Поиск соседних точек к заданной

            var neighbors = [];
            var nodes = graph.links;
            var lastOccurance = 0;
            var occuranceIndexes = [];
            var sourceNodesIDs = nodes.map(function (nd) {
                return nd.source;
            });
            do {
                var currentNodePos = sourceNodesIDs.indexOf(node_id, lastOccurance);
                if (currentNodePos > -1) {
                    lastOccurance = currentNodePos + 1;
                    occuranceIndexes.push(currentNodePos);
                }
            } while (currentNodePos !== -1);

            occuranceIndexes.forEach(function (idx) {
                var leftNode = (nodes[idx - 1] && nodes[idx - 1].source && nodes[idx - 1].target === String(node_id)) ? nodes[idx - 1].source : null;
                var rightNode = (nodes[idx] && nodes[idx].target) ? nodes[idx].target : null;
                if (leftNode)
                    neighbors.push(leftNode);
                if (rightNode)
                    neighbors.push(rightNode);

            });

            return neighbors;
        };

        this._backtrace = function (node) { //Построение массива финального маршрута
            var path = [];
            while (node.parent) {
                node = node.parent;
                path.push({id: node.id, x: node.x, y: node.y, level: this._getPointLevel(node.id)});
            }
            path.push({id: node.id, x: node.x, y: node.y, level: this._getPointLevel(node.id)});
            return path.reverse();
        };

        this._getNodeById = function (node_id, graph) { //Поиск точки в массиве по её id
            var nodeIdx = graph.nodes.map(function (nd) {
                return nd.id;
            }).indexOf(node_id);
            return graph.nodes[nodeIdx];
        };

        this._getPointLevel = function (point_id) {
            if (!this._options.rg) {
                return
            }
            var level_ids = Object.keys(this._options.rg.levels);
            for (var i = 0; i < level_ids.length; i++) {
                if (this._options.rg.levels[level_ids[i]].indexOf(point_id) !== -1) {
                    return level_ids[i];
                }
            }
        };

        this._calcAzimuth = function (nodeA, nodeB) {

            var y = Math.sin(nodeB.lng - nodeA.lng) * Math.cos(nodeB.lat);
            var x = Math.cos(nodeA.lat) * Math.sin(nodeB.lat) - Math.sin(nodeA.lat) * Math.cos(nodeB.lat) * Math.cos(nodeB.lng - nodeA.lng);
            var brng = Math.atan2(y, x) * (180 / Math.PI);

            return brng;
        };

        this._findPath = function (startNodeID, endNodeID) { //Функция поиска кратчайшего пути между двумя точками графа по их id
            var openList = new Heap(function (nodeA, nodeB) {
                return nodeA.g - nodeB.g;
            });
            this._graph = null;
            this._graph = clone(this._options.rg);
            var startNode = this._getNodeById(startNodeID, this._graph);
            var endNode = this._getNodeById(endNodeID, this._graph);

            var node, neighbors, neighbor, i, l, ng, azimuth;

            // set the `g` and `f` value of the start node to be 0
            startNode.g = 0;
            startNode.f = 0;

            // push the start node into the open list
            openList.push(startNode);
            startNode.opened = true;

            // while the open list is not empty
            while (!openList.empty()) {
                // pop the position of node which has the minimum `f` value.
                node = openList.pop();
                node.closed = true;

                // if reached the end position, construct the path and return it
                if (node === endNode) {

                    return this._backtrace(endNode);
                }

                // get neigbours of the current node
                neighbors = this._getNeighbors(node.id, this._graph);

                for (i = 0, l = neighbors.length; i < l; ++i) {
                    neighbor = this._getNodeById(neighbors[i], this._graph);

                    if (neighbor.closed) {
                        continue;
                    }

                    // get the distance between current node and the neighbor
                    // and calculate the next g score
                    var neighborPoint = L.latLng(neighbor.y, neighbor.x);
                    var nodePoint = L.latLng(node.y, node.x);

                    ng = node.g + nodePoint.distanceTo(neighborPoint);

                    // check if the neighbor has not been inspected yet, or
                    // can be reached with smaller cost from the current node
                    if (!neighbor.opened || ng < neighbor.g) {
                        azimuth = this._calcAzimuth(neighborPoint, nodePoint);

                        neighbor.g = ng; // * ar / 9 the trace magic
                        neighbor.azimuth = azimuth;
                        //console.log(azimuth);
                        //neighbor.h = neighbor.h || heuristic(abs(x - endX), abs(y - endY));
                        neighbor.f = neighbor.g //+ neighbor.h;
                        neighbor.parent = node;

                        if (!neighbor.opened) {
                            openList.push(neighbor);
                            neighbor.opened = true;
                        } else {
                            // the neighbor can be reached with smaller cost.
                            // Since its f value has been updated, we have to
                            // update its position in the open list
                            openList.updateItem(neighbor);
                        }
                    }
                } // end for each neighbor
            } // end while not open list empty

            // fail to find the path
            return [];
        };

        this.getRouteStart = function () {
            return this._startPoint;
        };

        this.getRouteEnd = function () {
            return this._endPoint;
        };

        this.addStartRoute = function (point) {
            var latlng = L.Projection.Mercator.unproject({x: point.x, y: point.y});

            var Icon = L.icon({
                iconUrl: 'start_route.svg',
                iconSize: [38, 44],
                iconAnchor: [15, 44]
            });

            this._startPoint = new Terminal(latlng, {
                icon: Icon,
                feature: point.feature
            });

            this._startPoint.on('click', function(e){
                if (typeof JSInterface !== 'undefined') {
                    try {
                        JSInterface.mapClick(JSON.stringify(this.options.feature));
                    } catch (e) {
                        console.log(e);
                    }
                } else {
                    console.log(this.options.feature);
                }
            });

            this._startPoint.setLevel(parseInt(point.level));
            return this._startPoint;
        };

        this.addEndRoute = function (point) {
            var latlng = L.Projection.Mercator.unproject({x: point.x, y: point.y});

            var Icon = L.icon({
                iconUrl: 'end_route.svg',
                iconSize: [38, 44],
                iconAnchor: [15, 44]
            });

            this._endPoint = new Terminal(latlng, {
                icon: Icon,
                feature: point.feature
            });

            this._endPoint.on('click', function(e){
                if (typeof JSInterface !== 'undefined') {
                    try {
                        JSInterface.mapClick(JSON.stringify(this.options.feature));
                    } catch (e) {
                        console.log(e);
                    }
                } else {
                    console.log(this.options.feature);
                }
            });

            this._endPoint.setLevel(parseInt(point.level));
            return this._endPoint;
        };

        this.clearStartRoute = function () {
            this._startPoint = undefined;
        };

        this.clearEndRoute = function () {
            this._endPoint = undefined;
        };

        this.calculateRoute = function () { //Интерфейсаня функция рассчёта маршрута
            var from = this._startPoint.getLatLng();
            var to = this._endPoint.getLatLng();
            var from_level = this._startPoint.getLevel();
            var to_level = this._endPoint.getLevel();
            var f_point = this._getClosestPoint(from, from_level);
            var t_point = this._getClosestPoint(to, to_level);

            if (!f_point || !t_point) {
                return;
            }

            var path = this._findPath(f_point.id, t_point.id);

            if (path.length === 0) { //path not found condition
                return;
            }
            path.unshift({
                id: '00000',
                x: from.lng,
                y: from.lat,
                level: String(from_level)
            });
            path.push({
                id: '99999',
                x: to.lng,
                y: to.lat,
                level: String(to_level)
            });
            ibgeomap.drawRoute(path, this.getStyle());
        };

        return this;
    };

    /*-----------------------------------------------------------------------------------------------------------*/
    var Terminal = L.Marker.extend({
        setLevel: function (level) {
            this._level = level;
        },
        getLevel: function () {
            return this._level;
        },
        getCoords: function () {
            var coords = L.Projection.Mercator.project(this.getLatLng());

            return {
                x: coords.x,
                y: coords.y,
                level: this._level
            }
        }
    });

    var ibGeoMap = function (options) {
        var self = this;
        this.options = options;
        this._layers = {
            canvas: [],
            poi: [],
            possibleroutes: [],
            techlayer: [],
            labels: {},
            cluster: new L.MarkerClusterGroup({
                maxClusterRadius: 40,
                showCoverageOnHover: false,
                animateAddingMarkers: false,
                removeOutsideVisibleBounds: true,
                iconCreateFunction: function(cluster) {
                    return L.icon({
                        iconUrl: 'group.svg',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    });
                }
            })
        };

        this._map = new L.Map(this.options.el, {
            layers: [],
            center: [this.options.center[0], this.options.center[1]],
            zoom: this.options.zoom || 21,
            maxZoom: this.options.maxZoom || 22,
            minZoom: this.options.minZoom || 18,
            crs: L.CRS.EPSG3857,
            attributionControl: false,
            zoomControl: false,
            markerZoomAnimation: true,
            zoomAnimation: true,
            fadeAnimation: false,
            bounceAtZoomLimits: false,
            closePopupOnClick: true,
            inertia: false
        });

        this._createAppResponse = function (e, feature) {
            var feature = feature || e.target.feature;
            var mapPoint = L.Projection.Mercator.project(e.latlng);
            var level = parseInt(self.indoorLayer.getLevel());
            var result = {
                isEmpty: true
            };

            if (e.target.feature && e.target.feature.properties && e.target.feature.properties.tags) {
                var tags = e.target.feature.properties.tags;
                result = clone(tags);
                result.isEmpty = (tags.screen && tags.model && tags.name && tags.description)? false : true;
            } else if (feature && feature.properties && feature.properties.tags){
                var tags = feature.properties.tags;
                result = tags;
                result.isEmpty = (tags.screen && tags.model && tags.name && tags.description)? false : true;
            }

            result.point = {
                x: mapPoint.x,
                y: mapPoint.y,
                l: level
            };
            return result;
        };

        this.options.onClick = function (e, feature) {
            var response = self._createAppResponse(e, feature);
            if (typeof JSInterface !== 'undefined') {
                try {
                    JSInterface.mapClick(JSON.stringify(response));
                } catch (e) {
                    console.log(e);
                }
            } else {
                console.log(response);
            }
        };

        this._toggleLabels = function () {
            var map = self._map;
            var currentZoom = map.getZoom();
            var level = self.indoorLayer.getLevel();
            /* Заготовка для масштабирования шрифтов

             var maxZoom = map.getMaxZoom();
             var minZoom = map.getMinZoom();
             var percent = Math.round(((maxZoom - currentZoom) / (maxZoom - minZoom))*100)-20;

             $('.poilabel').css('font-size',100-percent+'%');
             */
            /*if (self._terminal) {
             self._terminal.setIcon(new L.icon({
             iconUrl: 'my_location.svg',
             //shadowUrl: 'marker-shadow.png',
             iconSize: [2 * currentZoom, 2 * currentZoom],
             iconAnchor: [(2 * currentZoom) / 2, 2 * currentZoom]
             }));
             }*/
            if (currentZoom >= self.options.labelHideZoom && self._layers.labels[level]) {
                self._layers.labels[level].eachLayer(function (labels) {
                    self.indoorLayer.addLayer(labels, level);
                })
            }

            if (currentZoom < self.options.labelHideZoom && self._layers.labels[level]) {
                self._layers.labels[level].eachLayer(function (labels) {
                    self.indoorLayer.removeLayer(labels, level);
                })
            }
        };

        this._defaultOnClick = function (e, feature) {
            var level = self.indoorLayer.getLevel();
            var levelBounds = self.indoorLayer.getLevelBounds(level);
            if (levelBounds.contains(e.latlng)) {
                self.options.onClick(e, feature);
            }
        };

        this._getStyleFromFeature = function (feature) { //Функция построения объекта стиля по тэгам

            var fstyle = {
                weight: 1,
                color: '#666666',
                opacity: 1,
                fillColor: '#EEEEEE',
                fillOpacity: 1,
                lineJoin: 'round',
                lineCap:'round',
                noClip:true,
                className:'poizone'
            };

            if (feature.properties.tags.PDF_lineColor || feature.properties.tags.lineColor) {
                fstyle.color = feature.properties.tags.PDF_lineColor || feature.properties.tags.lineColor;
            }

            if (feature.properties.tags.lineOpacity) {
                fstyle.opacity = feature.properties.tags.lineOpacity;
            }

            if (feature.properties.tags.lineWeight) {
                fstyle.weight = feature.properties.tags.lineWeight;
            }

            if (feature.properties.tags.PDF_fillColor || feature.properties.tags.fillColor) {
                fstyle.fillColor = feature.properties.tags.PDF_fillColor || feature.properties.tags.fillColor;
                fstyle.fill = true;
            }

            if (feature.properties.tags.fillOpacity) {
                fstyle.fillOpacity = feature.properties.tags.fillOpacity;
            }

            if (feature.properties.tags.dash) {
                fstyle.dashArray = feature.properties.tags.dash;
            }

            return fstyle;
        };

        this._addTerminal = function (latlng, level) {
            var currentZoom = this._map.getZoom();

            var Icon = L.icon({
                iconUrl: 'my_location.svg',
                iconSize: [2*currentZoom, 2*currentZoom],
                iconAnchor: [(2*currentZoom)/2, 2*currentZoom]
            });

            this._terminal = new Terminal(latlng, {
                icon: Icon
            });

            this._terminal.setLevel(parseInt(level));

            this.indoorLayer.addMarker(this._terminal);
            this._map.fire('marker-add');
        };

        this._clearLayer = function (layerObjects) {
            layerObjects.forEach(function(layerObject){
                self._map.removeLayer(layerObject.layer);
            });
        };

        this._buildPopup = function (feature, layer) {
            var tags = feature.properties.tags;
            if (!tags.popup || tags.popup==='false') {
                return;
            }
            var elClass = feature.id;
            var popup = L.DomUtil.create('div', feature.id);
            var content = '';

            if (tags.name) {
                elClass = tags.name;
                content  = '<b>'+tags.name+'</b><br>';
            }

            if (tags.description) {
                content = content + tags.description;
            }

            popup.innerHTML = content;

            $(popup).on('click', function (e) {
                e.latlng = self._map.mouseEventToLatLng(e);
                self._defaultOnClick(e, feature);
            });

            layer.bindPopup(popup);
        };

        this._buildTextLabel = function (feature, layer) {
            var tags = feature.properties.tags;
            if (tags.description && tags.area) { //Если у области задано описание, делаем надпись
                    var currentZoom = self._map.getZoom();
                    var featureLevel = self.indoorLayer.getFeatureLevel(feature);
                    var text = tags.description;
                    var textProp = getTextWidth(text, '16px Arial');

                    if (!featureLevel || !featureLevel.value) {
                        return;
                    }
                    var levelNum = featureLevel.value;

                    var iconOptions = {
                        className: 'area-label'
                    };

                    if (tags.labelAlign && tags.labelAlign === 'vertical') {
                        iconOptions.html = '<div class=\"vertical poilabel\"><p>' + text + '<\/p></div>';
                        iconOptions.iconAnchor = [12, textProp.width /2];
                        iconOptions.iconSize = [textProp.width, 16];
                    } else {
                        iconOptions.html = '<div class=\"poilabel\"><p>' + text + '<\/p></div>';
                        iconOptions.iconAnchor = [textProp.width / 2, 24];
                        iconOptions.iconSize = [textProp.width, 16];
                    }

                    var labledText = L.divIcon(iconOptions);

                    var center = layer.getBounds().getCenter();

                    var labelMarker = L.marker(center, {icon: labledText});

                    labelMarker.on('click',function(e){
                        self._defaultOnClick(e, feature);
                    });

                    if (!self._layers.labels[levelNum]) {
                        self._layers.labels[levelNum] = L.featureGroup();
                    }

                    self._layers.labels[levelNum].addLayer(labelMarker);

                    if (currentZoom >= self.options.labelHideZoom) {
                        self.indoorLayer.addLayer(labelMarker, levelNum);
                    }
            }
        };

        this._initLevelControl = function (levels) {
            this.levelControl = new L.Control.Level({
                level: levels[0],
                levels: levels,
                labels: this.indoorLayer.getLevelsNames(),
                position: 'topright'
            });

            this.levelControl.addEventListener("levelchange", this.indoorLayer.setLevel, this.indoorLayer);

            this.levelControl.on('levelchange', function (evt) {
                if (typeof JSInterface !== 'undefined') {
                    try {
                        JSInterface.setFloor(evt.newLevelLabel);
                    } catch (e) {
                        console.log(e);
                    }
                } else {
                    console.log(evt.newLevelLabel);
                }
            });

            this.levelControl.addTo(this._map);
        };

        this.init = function (CanvasData, POIData, callback) { //Конструктор объекта

            this.indoorLayer = new L.Indoor(CanvasData, {
                higlightablePOITag: this.options.higlightablePOITag || 'zone_id',
                getFeatureLevel: function (feature) {
                    if (feature.properties.relations.length === 0)
                        return null;
                    var relations = feature.properties.relations;
                    var level = {};
                    relations.forEach(function(relation){
                        if (relation.reltags.type && relation.reltags.type === 'level' && relation.reltags.value) {
                            level.value = relation.reltags.value;
                            level.name = (relation.reltags.name) ? relation.reltags.name : level;
                        }
                    });
                    return level;
                },
                onEachFeature: function (feature, layer) {
                    if ((feature.properties.tags.name || feature.properties.tags.description) && !(layer instanceof L.MarkerClusterGroup) && !(layer instanceof L.FeatureGroup)) {
                        self._buildTextLabel(feature, layer);
                        self._buildPopup(feature, layer);
                    }

                    if (self.options.onClick && typeof(self.options.onClick) === 'function') {
                        if ( layer.getPopup() == undefined ){
                            layer.on('click', function(e) {
                                self._map.closePopup();
                                self._defaultOnClick(e, feature);
                            });
                        } else {
                            layer.on('click', function(e) {
                                self._defaultOnClick(e, feature);
                            });
                        }
                    }
                },
                pointToLayer: function (featureData, latlng) {
                    var tags = featureData.properties.tags;

                    if (tags.image) {
                        var Url = tags.image;
                        var size = [40, 40];
                        var anchor = [20, 20];
                        if (tags.size) {
                            size = tags.size.split(',');
                        }
                        if (tags.anchor) {
                            anchor = tags.anchor.split(',');
                        }
                        var Icon = L.icon({
                            iconUrl: Url,
                            iconSize: size,
                            iconAnchor: anchor
                        });

                    }
                    var marker = null;
                    if (tags.range) {
                        if (!Icon) {
                            marker = L.circle(latlng, tags.range, self._getStyleFromFeature(featureData));
                        } else {
                            marker = L.featureGroup([L.marker(latlng, {
                                icon: Icon
                            }), L.circle(latlng, tags.range, self._getStyleFromFeature(featureData))]);
                        }
                    } else {
                        if (Icon) {
                            marker = L.marker(latlng, {
                                icon: Icon
                            });
                        } else {
                            marker =  L.circleMarker(latlng, {radius: 1});
                        }
                    }
                    return marker;
                },
                style: function (feature) {
                    var style = self._getStyleFromFeature(feature);
                    style.clickable = false;
                    return style;
                }
            });

            var levels = this.indoorLayer.getLevels();

            if (levels.length === 0) {
              return;
            }

            if (POIData) {
                this.addGeoJSONPOI(POIData);
            }

            this.indoorLayer.addTo(this._map);
            this.indoorLayer.setLevel(levels[0]);

            if (levels.length > 1) {
                this._initLevelControl(levels);
            }

            this.zommControl = L.control.zoom({position:"bottomright"});
            this.zommControl.addTo(this._map);

            if (this.options.fitBounds) {
                this.indoorLayer.fitToBounds();
            }

            if (typeof (callback) === 'function') {
                return callback();
            }
        };

        this.addMapData = function (CanvasData) { //функция добавления картографической информации на карту
            if (!this.indoorLayer) {
                return;
            }
            this.indoorLayer.addData(CanvasData);
            var levels = this.indoorLayer.getLevels();
            if (levels.length > 1) {
                this._initLevelControl(levels);
            }
        };

        this.getTerminal = function () {
            if (!this._terminal) {
                return null;
            } else {
                return this._terminal;
            }
        };

        this.moveMarker = function (x, y, level) {
            var latlng = L.Projection.Mercator.unproject({
                x: x,
                y: y
            });

            if (!this._terminal) {
                this._addTerminal(latlng, level);
            }

            var terminal = this._terminal;

            if (this.indoorLayer.getLevels().indexOf(level.toString()) === -1) {
                return;
            }

            if (terminal.getLevel() !== parseInt(level) || this.indoorLayer.getLevel() !== parseInt(level)) {
                terminal.setLevel(level);
                if (this.levelControl && this.trackControl && this.trackControl.getState()) {
                    this.levelControl.setLevel(level);
                }
            }

            terminal.setLatLng(latlng);
            this.indoorLayer.moveMarker(terminal);
            this._map.fire('marker-move');
        };

        this.highligthPOI = function (poi_id, style, resetHilghlights) { //Функция подсветки очерченой зоны
            if (resetHilghlights !== 'undefined' && resetHilghlights === true) {
                this.resetPOIHighlight();
            }
            if (!this.indoorLayer._feateresGroup.highlightablePOI[poi_id]) {
                return;
            }
            this.indoorLayer._feateresGroup.highlightablePOI[poi_id].layer.setStyle(style);
            return true;
        };

        this.resetPOIHighlight = function () {
            var pois = Object.keys(this.indoorLayer._feateresGroup.highlightablePOI);
            pois.forEach(function(poi){
                var layer = self.indoorLayer._feateresGroup.highlightablePOI[poi].layer;
                var defaultStyle = self.indoorLayer._feateresGroup.highlightablePOI[poi].defaultstyle;
                layer.setStyle(defaultStyle);
            });
        };

        this.drawPossibleRoutes = function (GeoJSONData) {

            this._layers.possibleroutes = this.indoorLayer.addData(GeoJSONData, {
                color: '#00A707',
                weight: 1,
                pointToLayer: function (featureData, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 3,
                        color: '#00A707'
                    });
                }
            });
        };

        this.clearPossibleRoutes = function () {
            var levels = this.indoorLayer.getLevels();
            var ctx = this;
            for (var level in levels) {
                this._layers.possibleroutes.forEach(function(layerObject){
                    ctx.indoorLayer.removeLayer(layerObject.layer, levels[level]);
                });
            }
            this._layers.possibleroutes = [];
        };

        this.clearRouteLayer = function () {
            if (this._route) {
                var levels = Object.keys(this._route);
                for (var level in levels) {
                    this.indoorLayer.removeMarker(this._route[levels[level]], levels[level]);
                }
            }
            this._route = null;
        };

        this.clearMapCanvas = function () {
            this._map.removeLayer(this.indoorLayer);
            this.indoorLayer = null;
        };

        this.drawRoute = function (routePath, style) { //Функция отрисовки нитки маршрута на карте
            var levels;
            var ctx = this;
            var routeArrLength = routePath.length;

            this.clearRouteLayer();
            this._route = {};

            if (!style) {
                var style = {
                    noClip: true,
                    color: 'red'
                };
            }

            var points = {};
            routePath.forEach(function (point) {
                if (point.level) {
                    if (!points[point.level]) {
                        points[point.level] = [];
                    }
                    points[point.level].push({lon: point.x, lat: point.y});
                }
            });

            if (routeArrLength >= 2) {
                var l = routePath[routeArrLength - 1].level;
                var aPoint = L.Projection.Mercator.project({
                    lat: routePath[routeArrLength - 1].y,
                    lng: routePath[routeArrLength - 1].x
                });
                var bPoint = L.Projection.Mercator.project({
                    lat: routePath[routeArrLength - 2].y,
                    lng: routePath[routeArrLength - 2].x
                });
                var cPoint = {
                    x: aPoint.x,
                    y: bPoint.y
                };
                var degree = angle(bPoint, aPoint, cPoint);

                var arrowIcon = L.divIcon({
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                    className: 'end-route-arrow' + ((style && style.className) ? ' ' + style.className : ''),
                    html: '<img src=\"arrow.svg\" width = \"24\" height=\"24\" style=\"-webkit-transform: rotate(' + degree + 'deg);\"/>'
                });

                var arrowMarker = new Terminal(L.Projection.Mercator.unproject(aPoint), {icon: arrowIcon});
                arrowMarker.setLevel(l);
            }
            levels = Object.keys(points);
            levels.forEach(function(level){
                ctx._route[level] = L.featureGroup();

                if (points[level]) {
                    var polyline = L.polyline(points[level],style);
                    ctx._route[level].addLayer(polyline);
                }

                ctx.indoorLayer.addLayer(ctx._route[level], level);
            });

            if (arrowMarker) {
                this._route[arrowMarker.getLevel()].addLayer(arrowMarker);
            }

        };

        this.addGeoJSONPOI = function (GeoJSON) { //Функция добавления POI на карту
            if (!this.indoorLayer || !GeoJSON) {
                throw new Error('Not ready ' + this.indoorLayer + ' ' + GeoJSON);
                return;
            }
            this._layers.poi = this.indoorLayer.addData(GeoJSON);
            if (this._terminal) {
                this._terminal.setZIndexOffset(1000);
            }
        };

        this.addTechLayer = function (GeoJSON) {
            if (!this.indoorLayer || !GeoJSON) {
                throw new Error('Not ready ' + this.indoorLayer + ' ' + GeoJSON);
                return;
            }
            this._layers.techlayer = this.indoorLayer.addData(GeoJSON);
            if (this._terminal) {
                this._terminal.setZIndexOffset(1000);
            }
        };

        this.clearTechLayer = function () {
            this._clearLayer(this._layers.techlayer);
        };

        this.clearPOILayer = function () {
            this._clearLayer(this._layers.poi);
        };

        this.setCenter = function (to) {
            var latlng = L.Projection.Mercator.unproject({
                x: to.x,
                y: to.y
            });

            if (this.indoorLayer.getLevels().indexOf(String(to.level)) === -1) {
                return;
            }

            if (this.indoorLayer.getLevel() !== parseInt(to.level) && this.levelControl) {
                this.levelControl.setLevel(to.level);
            }
            var zoom = this._map.getZoom();
            this._map.setView(latlng, {pan:{animate:true},zoom:{animate:true}});
            this._map.setZoom(zoom);
        };

        this.addPOI = function (layer) {
            this._layers.poi.push({tags:{},layer:layer});
            this.indoorLayer.addMarker(layer);
        };

        this.removePOI = function (layer) {
            var idx = -1;

            for (var i = 0; i<this._layers.poi.length;i++) {
                if (this._layers.poi[i].layer == layer) {
                    idx = i;
                    break;
                }
            }
            if (idx === -1) {
                return;
            }
            this._layers.poi.splice(idx, 1);
            this.indoorLayer.removeMarker(layer);
        };

        this.hidePOIByTag = function (tag) {
            if (typeof tag !== 'object') {
                return;
            }
            var keys = Object.keys(tag);
            this._layers.poi.forEach(function (poi) {
                keys.forEach(function (key) {
                    if (poi.tags[key] && poi.tags[key] == tag[key]) {
                        self.indoorLayer.removeLayer(poi.layer, poi.level);
                    }
                });
            });
        };

        this.showPOIByTag = function (tag) {
            if (typeof tag !== 'object') {
                return;
            }
            var keys = Object.keys(tag);
            this._layers.poi.forEach(function (poi) {
                keys.forEach(function (key) {
                    if (poi.tags[key] && poi.tags[key] == tag[key]) {
                        self.indoorLayer.addLayer(poi.layer, poi.level);
                    }
                });
            });
        };

        this.isTerminalExist = function () {
            if (this._terminal) {
                return true;
            } else {
                return false;
            }
        };

        this.isRouteExist = function () {
            if (this._route) {
                return true;
            } else {
                return false;
            }
        };

        this._map.on('zoomend', this._toggleLabels);

        this._map.on('levelchange', function(e){
            console.log('Level change event');
            self._toggleLabels();
            if (self.options.fitBounds) {
                self.indoorLayer.fitToBounds();
            }

        });

        this._map.on('marker-move', function(e){
            if (ibgeomap.trackControl && ibgeomap.trackControl.getState()) {
                ibgeomap.setCenter(self._terminal.getCoords());
            }
        });

        this._map.on('marker-add', function(){
            self.trackControl = L.Control.track({position:"bottomright"});
            self.trackControl.on('trackchange', function (evt) {
                if (!self._terminal && evt.state === false) {
                    return;
                }
                var terminalCoords = L.Projection.Mercator.project(self._terminal.getLatLng());
                terminalCoords.level = self._terminal.getLevel();
                self.setCenter(terminalCoords);
            });

            self.trackControl.addTo(self._map);
        });

        return this;
    };


    /*--------------------------------------Инициализация объектов---------------------------------------------------------*/
    window.initMap = function (options) {
        var opts = paramsToObj(options);

        if (window.indoorRouteGraph && window.ibgeomap && window.ibgeoroute) {
            return;
        }

        if (!opts) {
            opts = {
                higlightableTag: 'zone_id',
                labelHideZoom: 23,
                minZoom: 19,
                maxZoom: 24,
                zoom: 21,
                fitBounds: true
            }
        }

        window.indoorRouteGraph = {
            loaded: false,
            directed: false,
            multipath: false,
            nodes: [],
            links: [],
            levels: {},
            gateways: []
        };

        window.ibgeomap = new ibGeoMap({
            el: 'map',
            center: [0, 0],
            labelHideZoom: opts.labelHideZoom || 23,
            minZoom: opts.minZoom || 19,
            zoom: opts.zoom || 21,
            maxZoom: opts.maxZoom || 24,
            higlightablePOITag: opts.higlightableTag || 'zone_id',
            fitBounds: (opts.fitBounds == undefined || opts.fitBounds == null)? true : opts.fitBounds
        });

        window.ibgeoroute = new ibGeoRoute({
            rg: window.indoorRouteGraph
        });
    };

    if (!window.appSideInit) {
        initMap();
    }

    /*--------------------------------------Интерфейсные функции для мобильных приложений----------------------------------*/

    window.onTerminalPositionChange = function (x, y, l, ignoreRoutes) { //Функция перемещения маркера терминала на карте
        var recalculatedX = x,
            recalculatedY = y;
        var ignoreAproximation = (ignoreRoutes && (ignoreRoutes === true || ignoreRoutes == 'true')) ? true : false;

        if (ibgeoroute && ibgeoroute.isReady() && !ignoreAproximation){
            var from = L.Projection.Mercator.unproject({x: x, y: y});
            var f_point = ibgeoroute._getClosestPoint(from, l);
            var closetpointCoords = L.Projection.Mercator.project({lat:f_point.y,lng:f_point.x});
            recalculatedX = closetpointCoords.x;
            recalculatedY = closetpointCoords.y;
        }

        ibgeomap.moveMarker(recalculatedX, recalculatedY, l);
    };

    window.higlightPOI = function (poi_id, styleJSON, unhighlight_previous) { //Функция подсветки зоны действия маяка по id зоны
        var style = paramsToObj(styleJSON);
        var hstyle = style || {
            fillColor: '#F2F839',
            weight: 1,
            color: '#F2F839',
            opacity: 1,
            fillOpacity: 0.2
        };
        var uh = Boolean(unhighlight_previous);

        ibgeomap.highligthPOI(poi_id, hstyle, uh);
    };

    window.loadMapCanvas = function (CanvasJSON, POIJSON) { //Функция загрузки картографической подложки
        var mapcanvas = paramsToObj(CanvasJSON);
        var poi = paramsToObj(POIJSON);

        ibgeomap.init(mapcanvas, poi);
    };

    window.addMapCanvas = function (CanvasJSON) {
        var mapcanvas = paramsToObj(CanvasJSON);

        ibgeomap.addMapData(mapcanvas);
    };

    window.loadMapPOI = function (POIJSON) { //Функция подгрузки POI
        var poi = paramsToObj(POIJSON);

        ibgeomap.addGeoJSONPOI(poi);
    };

    window.loadRoutes = function (routesJSON) { //Функция подгрузки графа маршрутов
        window.indoorRouteGraph = paramsToObj(routesJSON);

        if (!window.indoorRouteGraph) {
            return;
        }

        window.indoorRouteGraph.loaded = true;

        window.ibgeoroute.init(window.indoorRouteGraph);
    };

    window.drawPossibleRoutes = function (routesGeoJSON) { //Функция подсветки всех возможных маршрутов
        var r = paramsToObj(routesGeoJSON);

        ibgeomap.drawPossibleRoutes(r);
    };

    window.clearPossibleRoutes = function () { //Функция подсветки всех возможных маршрутов

        ibgeomap.clearPossibleRoutes();
    };

    window.findRoute = function (fromPoint, toPoint, style) { //Функция поиска и отрисовки маршрута из точики from в точку to
        if (!window.indoorRouteGraph.loaded) {
            return;
        }

        var from = paramsToObj(fromPoint);
        var to = paramsToObj(toPoint);
        var routeStyle = paramsToObj(style);
        var calculateOnly = false;

        var startPointMarker = ibgeoroute.getRouteStart();
        var endPointMarker = ibgeoroute.getRouteEnd();
        var mapCenter = undefined;

        if (!from && !to) {
            if (startPointMarker && endPointMarker) {
                calculateOnly = true;
                console.log('Trying to calculate by predetermined points.');
            } else {
                console.log('Start point and end point not set. And start/end markers not exist. Can`t calculate route.');
                return;
            }
        } else if (!from && !to) {
            console.log('Start point or end point not set. Can`t calculate route.');
            return;
        }

        if (!calculateOnly) {
            if (startPointMarker) {
                ibgeomap.removePOI(startPointMarker);
                ibgeoroute.clearStartRoute();
            }

            if (endPointMarker) {
                ibgeomap.removePOI(endPointMarker);
                ibgeoroute.clearEndRoute();
            }

            startPointMarker = ibgeoroute.addStartRoute({
                x: from.x,
                y: from.y,
                level: from.l
            });

            endPointMarker = ibgeoroute.addEndRoute({
                x: to.x,
                y: to.y,
                level: to.l
            });

            mapCenter = {
                id: '99999',
                x: to.x,
                y: to.y,
                level: Number(to.l)
            }

            ibgeomap.addPOI(startPointMarker);
            ibgeomap.addPOI(endPointMarker);
        } else {
            mapCenter = endPointMarker.getCoords();
        }

        ibgeoroute.calculateRoute(routeStyle);

        if (ibgeomap.trackControl && !ibgeomap.trackControl.getState()) {
            ibgeomap.setCenter(mapCenter);
        }
    };

    window.findRouteFromCurrentPosition = function (toPoint, style) { //Функция поиска и отрисовки маршрута из точики где находится терминал в точку toPoint

        var terminal = ibgeomap.getTerminal();

        if (!window.indoorRouteGraph.loaded || !terminal) { //Если не загружен граф или отсутсвует терминал, выходим
            return;
        }

        var to = paramsToObj(toPoint);
        var routeStyle = paramsToObj(style);
        var endRouteMarker = ibgeoroute.getRouteEnd();

        if (!to && !endRouteMarker) { //Если не передана конечная точка и отсуствует установленный маркер конечной точки, выходим
            return;
        }

        var startPoint = terminal.getCoords();
        var endPoint = null;
        var isRouteExist = ibgeomap.isRouteExist();

        if (!to) { // Если не переданы координаты конца маршрута, считаем до координат маркера конца маршрута
            endPoint = endRouteMarker.getCoords();
        } else { //Иначе прокладываем маршрут до переданной координаты
            endPoint = {
                id: '99999',
                x: to.x,
                y: to.y,
                level: to.l
            };
            if (endRouteMarker) { // Если маркер конца маршрута установлен, то переопрнеделяем его в новые координаты
                ibgeomap.removePOI(endRouteMarker);
                ibgeoroute.clearEndRoute();
            }
            endRouteMarker = ibgeoroute.addEndRoute(endPoint);
            ibgeomap.addPOI(endRouteMarker);
        }

        var oldStartMarker = ibgeoroute.getRouteStart();

        if (oldStartMarker) { // Проверяем что ранее не установлен маркер начала маршрута. Если установлен, удаляем его.
            ibgeomap.removePOI(oldStartMarker);
            ibgeoroute.clearStartRoute();
        }

        ibgeoroute.addStartRoute(startPoint);
        ibgeoroute.calculateRoute(routeStyle);

        if (ibgeomap.trackControl && !ibgeomap.trackControl.getState() && !isRouteExist) {
            ibgeomap.setCenter(endPoint);
        }
    };

    window.setCenter = function (toPoint) { //Функция цетрирования карты в точку toPoint
        var to = paramsToObj(toPoint);
        var point = {
            x: to.x,
            y: to.y,
            level: to.l
        };
        ibgeomap.setCenter(point);
    };

    window.clearPOILayer = function () { //Функция очистки слоя содержащего POI
        ibgeomap.clearPOILayer();
    };

    window.clearTechLayer = function () { //Функция очистки слоя содержащего технические данные (маяки, зоны)
        ibgeomap.clearTechLayer();
    };

    window.clearRouteLayer = function () { //Функция очистки слоя содержащего визуализацию маршрутов
        var oldStartPoint = ibgeoroute.getRouteStart();
        var oldEndPoint = ibgeoroute.getRouteEnd();

        if (oldStartPoint) {
            ibgeomap.removePOI(oldStartPoint);
            ibgeoroute.clearStartRoute();
        }

        if (oldEndPoint) {
            ibgeomap.removePOI(oldEndPoint);
            ibgeoroute.clearEndRoute();
        }

        ibgeomap.clearRouteLayer();
    };

    window.clearMapCanvas = function () { //Функция очистки слоя содержащего картографическую информацию
        ibgeomap.clearMapCanvas();
    };

    window.removeTerminal = function () {
        if (ibgeomap._terminal) {
            ibgeomap._map.removeLayer(ibgeomap._terminal);
            ibgeomap._terminal = null;
        }
    };

    window.loadTechLayer = function (techJSON) { //Функция добавления слоя содержащего технические данные (маяки, зоны)
        var tech = paramsToObj(techJSON);

        ibgeomap.addTechLayer(tech);
    };

    window.setRouteStart = function (pointJSON) {
        var toPoint = paramsToObj(pointJSON);

        if (!toPoint) {
            return
        }

        var point = {
            x: toPoint.x,
            y: toPoint.y,
            level: toPoint.l
        }

        var oldStartPoint = ibgeoroute.getRouteStart();
        if (oldStartPoint) {
            ibgeomap.removePOI(oldStartPoint);
            ibgeoroute.clearStartRoute();
        }

        var startPoint = ibgeoroute.addStartRoute(point);
        ibgeomap.addPOI(startPoint);
    };

    window.setRouteEnd = function (pointJSON) {
        var toPoint = paramsToObj(pointJSON);

        if (!toPoint) {
            return
        }

        var point = {
            x: toPoint.x,
            y: toPoint.y,
            level: toPoint.l
        }

        var oldEndPoint = ibgeoroute.getRouteEnd();
        if (oldEndPoint) {
            ibgeomap.removePOI(oldEndPoint);
            ibgeoroute.clearEndRoute();
        }

        var endPoint = ibgeoroute.addEndRoute(point);
        ibgeomap.addPOI(endPoint);
    };

    window.revertRoute = function(){
        var startMarker = ibgeoroute.getRouteStart();
        var endMarker = ibgeoroute.getRouteEnd();
        if (!startMarker || !endMarker) {
            return;
        }
        ibgeomap.removePOI(startMarker);
        ibgeomap.removePOI(endMarker);
        var startPoint = L.Projection.Mercator.project(startMarker.getLatLng());
        startPoint.level = startMarker.getLevel();
        var endPoint = L.Projection.Mercator.project(endMarker.getLatLng());
        endPoint.level = endMarker.getLevel();
        ibgeoroute.clearStartRoute();
        ibgeoroute.clearEndRoute();
        ibgeomap.addPOI(ibgeoroute.addStartRoute(endPoint));
        ibgeomap.addPOI(ibgeoroute.addEndRoute(startPoint));
        ibgeoroute.calculateRoute();
        if (ibgeomap.trackControl && !ibgeomap.trackControl.getState()) {
            ibgeomap.setCenter(startPoint);
        }
    };

    window.hidePOIByTag = function (tagJSON) {
        var tag = paramsToObj(tagJSON);
        if (!tag) {
            return;
        }
        ibgeomap.hidePOIByTag(tag);
    };

    window.showPOIByTag = function (tagJSON) {
        var tag = paramsToObj(tagJSON);
        if (!tag) {
            return;
        }
        ibgeomap.showPOIByTag(tag);
    };

    window.isTerminalExist = function () {
        var isExist = ibgeomap.isTerminalExist();
        if (window.TerminalListener && typeof window.TerminalListener.isTerminalExist === 'function') {
            window.TerminalListener.isTerminalExist(isExist);
        } else {
            return isExist;
        }
    };

    window.isStartRouteExist = function () {
        var isExist = (ibgeoroute.getRouteStart()) ? true : false;

        if (window.TerminalListener && typeof window.TerminalListener.isStartRouteExist === 'function') {
            window.TerminalListener.isStartRouteExist(isExist);
        } else {
            return isExist;
        }
    };

    window.isEndRouteExist = function () {
        var isExist = (ibgeoroute.getRouteEnd()) ? true : false;

        if (window.TerminalListener && typeof window.TerminalListener.isEndRouteExist === 'function') {
            window.TerminalListener.isEndRouteExist(isExist);
        } else {
            return isExist;
        }
    };

    window.resetPOIHighlight = function () {
        ibgeomap.resetPOIHighlight();
    };

    window.destroyMap = function () {
        ibgeomap._map.remove();
        window.indoorRouteGraph = window.ibgeomap = window.ibgeoroute = null;
    };
