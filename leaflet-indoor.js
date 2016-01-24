/**
 * A layer that will display indoor data
 *
 * addData takes a GeoJSON feature collection, each feature must have a level
 * property that indicates the level.
 *
 * getLevels can be called to get the array of levels that are present.
 */
L.Indoor = L.Layer.extend({

    options: {
        getFeatureLevel: function (feature) {
            return feature.properties.level;
        },
        getFeatureGroup: function (feature) {
            var fGroup = feature.properties.group;
            if (feature.properties.relations[0].reltags.group) { //Если у родительского relation установлен тэг group считаем его приоритетней
                fGroup = feature.properties.relations[0].reltags.group;
            }
            return fGroup;
        }
    },

    initialize: function (data, options) {
        L.setOptions(this, options);
        options = this.options;

        var layers = this._layers = {};

        this._map = null;

        this._levelName = {};

        this._feateresGroup = {
            highlightablePOI: {}
        };

        if ("level" in this.options) {
            this._level = this.options.level;
        } else {
            this._level = null;
        }

        if ("onEachFeature" in this.options)
            var onEachFeature = this.options.onEachFeature;

        this.options.onEachFeature = function (feature, layer) {
            if (onEachFeature)
                onEachFeature(feature, layer);

            if ("markerForFeature" in options) {
                var marker = options.markerForFeature(feature);
                if (typeof(marker) !== 'undefined') {
                    marker.on('click', function (e) {
                        layer.fire('click', e);
                    });

                    layers[feature.properties.level].addLayer(marker);
                }
            }
        };

        this.addData(data);
    },
    addTo: function (map) {
        map.addLayer(this);
        return this;
    },
    onAdd: function (map) {
        this._map = map;

        if (this._level === null) {
            var levels = this.getLevels();

            if (levels.length !== 0) {
                this._level = levels[0];
            }
        }

        if (this._level !== null) {
            if (this._level in this._layers) {
                this._map.addLayer(this._layers[this._level]);
            }
        }
    },
    onRemove: function (map) {
        if (this._level in this._layers) {
            this._map.removeLayer(this._layers[this._level]);
        }

        this._map = null;
    },
    addData: function (data, opt) {
        var layers = this._layers;
        var appendedLayers = [];

        var CTX = this;

        var options = opt || this.options;

        options.getFeatureLevel = this.options.getFeatureLevel;
        this.getFeatureLevel = options.getFeatureLevel;
        options.getFeatureGroup = this.options.getFeatureGroup;

        var features = L.Util.isArray(data) ? data : data.features;

        features.forEach(function (part) {

            var levelInfo = options.getFeatureLevel(part);
            var layer;

            if (typeof levelInfo === 'undefined' || levelInfo === null || levelInfo.value === 'undefined' || levelInfo.value === null)
                return;

            var level = levelInfo.value;

            if (!("geometry" in part)) {
                return;
            }
            CTX._levelName[level] = levelInfo.name;

            if (L.Util.isArray(level)) {
                level.forEach(function (level) {
                    if (level in layers) {
                        layer = layers[level];
                    } else {
                        layer = layers[level] = L.geoJson({
                            type: "FeatureCollection",
                            features: []
                        }, options);
                    }
                    layer.addLayer(l);
                    appendedLayers.push({tags: part.properties.tags, level:level, layer: l});
                });
            } else {
                if (level in layers) {
                    layer = layers[level];
                } else {
                    layer = layers[level] = L.geoJson({
                        type: "FeatureCollection",
                        features: []
                    }, options);
                }

                var l = L.geoJson(part, options);
                if (part.properties.tags.backgroundImage) {
                    var bg = L.imageOverlay(part.properties.tags.backgroundImage, l.getBounds());
                    layer.addLayer(bg);
                }
                layer.addLayer(l);
                appendedLayers.push({tags: part.properties.tags, level:level, layer: l});
            }

            var highlightMark = part.properties.tags[options.higlightablePOITag];

            if (options.higlightablePOITag && highlightMark && part.properties.tags.zone_id) {
                CTX._feateresGroup.highlightablePOI[part.properties.tags.zone_id] = {};
                CTX._feateresGroup.highlightablePOI[part.properties.tags.zone_id].layer = l;
                CTX._feateresGroup.highlightablePOI[part.properties.tags.zone_id].defaultstyle = CTX.getStyleFromFeature(part);
            }
        });
        return appendedLayers;
    },
    getLevelBounds: function (level) {
        if (!level) {
            return this._layers[this._level].getBounds();
        }
        return this._layers[level].getBounds();
    },

    fitToBounds: function () {
        var bounds = this.getLevelBounds(this._level).pad(0.2);
        this._map.fitBounds(bounds, {animate: false, pan: {animate: false}, zoom: {animate: false}});
        this._map.setMaxBounds(bounds);
    },
    getLevels: function () {
        return Object.keys(this._layers);
    },
    getLevelsNames: function () {
        return this._levelName;
    },
    getLevel: function () {
        return this._level;
    },
    getStyleFromFeature: function (feature) { //Функция построения объекта стиля по тэгам

        var fstyle = {
            weight: 1,
            color: '#666666',
            opacity: 1,
            fillColor: '#EEEEEE',
            fillOpacity: 0.7
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
        }

        if (feature.properties.tags.fillOpacity) {
            fstyle.fillOpacity = feature.properties.tags.fillOpacity;
        }

        if (feature.properties.tags.dash) {
            fstyle.dashArray = feature.properties.tags.dash;
        }

        return fstyle;
    },
    setLevel: function (level) {
        var oldLevel = null;
        var newLevel = null;
        if (typeof(level) === 'object') {
            newLevel = level.newLevel;
            oldLevel = level.oldLevel;
        } else {
            oldLevel = this._level;
            newLevel = level;
        }
        if (this._level === newLevel)
            return;

        var oldLayer = this._layers[oldLevel || this._level];
        var layer = this._layers[newLevel];

        //var bounds = (this._layers[level])? this._layers[level].getBounds(): null;

        this._level = newLevel;

        if (this._map !== null) {
            if (this._map.hasLayer(oldLayer)) {
                this._map.removeLayer(oldLayer);
            }

            if (layer) {
                this._map.addLayer(layer);
                //В этом месте иногда, очень очень редко, происходит краш движка. Замечено на Chrome 36.0.1985.143 m под MS Win 7 x64
                //this._map.setMaxBounds(bounds);
            }
            this._map.fire('levelchange', {
                oldLevel: oldLevel,
                newLevel: newLevel
            });
        }
    },
    addLayer: function (layer, level) {
        if (typeof(layer) !== 'object') {
            return;
        }

        var destLevel = (level !== null) ? level : this._level;

        if (!this._layers[destLevel].hasLayer(layer)){
            this._layers[destLevel].addLayer(layer);
        }
    },
    removeLayer: function (layer, level) {
        var self = this;
        if (typeof(layer) !== 'object') {
            return;
        }
        if (level) {
            this._layers[level].removeLayer(layer);
        } else {
            var floorNumbers = Object.keys(this._layers);
            floorNumbers.forEach(function(floorNumber){
                self._layers[floorNumber].removeLayer(layer);
            });
        }
    },
    moveMarker: function (marker) {
        if (typeof(marker) !== 'object')
            return;

        if (typeof marker.getLevel !== 'function') {
            console.log('Given layer is not indoor marker.');
            return;
        }

        var newlevel = marker.getLevel();

        if (this._layers[newlevel] === undefined || this._layers[newlevel] === null)
            return;

        var level = null;

        if (!this._layers[newlevel].hasLayer(marker)) {
            for (level in Object.keys(this._layers)) {
                if (this._layers[level].hasLayer(marker)) {
                    this._layers[level].removeLayer(marker);
                    marker.setZIndexOffset(1000);
                    this._layers[newlevel].addLayer(marker);
                }
            }
        } else {
            marker.setZIndexOffset(1000);
        }
    },
    addMarker: function (marker) {
        if (typeof(marker) !== 'object')
            return;

        var level = (typeof marker.getLevel === 'function') ? marker.getLevel() : null;

        if (level === undefined || level === null)
            level = this._level;

        var destLevel = this._layers[level];

        if (this._map !== null) {
            if (destLevel) {
                destLevel.addLayer(marker);
            }
        }
    },
    removeMarker: function (marker, l) {
        if (typeof(marker) !== 'object')
            return;

        var level = (typeof marker.getLevel === 'function') ? marker.getLevel() : l;

        if (level === undefined || level === null)
            level = this._level;

        var destLevel = this._layers[level];

        if (this._map !== null) {
            if (destLevel && destLevel.hasLayer(marker)) {
                destLevel.removeLayer(marker);
            }
        }
    }
});

L.indoor = function (data, options) {
    return new L.Indoor(data, options);
};

L.Control.Track = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'topright'
    },
    initialize: function (options) {
        L.setOptions(this, options);

        this._map = null;
        //var trackEnambeld = this.options.enabled

        //this.addEventListener("trackchange", trackEnambeld, this);
    },
    onAdd: function (map) {
        var zoomName = 'leaflet-control-zoom';
        var container = L.DomUtil.create('div', 'leaflet-control-zoom leaflet-bar');
        var link = L.DomUtil.create('a','leaflet-control-zoom-out');
        var icon = L.DomUtil.create('img','ibecom-track-btn');
        var self = this;
        this._button = icon;
        this._active = true;
        var options = this.options;

        link.appendChild(icon);
        container.appendChild(link);

        this.setActiveTrackingButton();

        map.on('dragstart', function () {
            self.passiveTrack();
            self.setPassiveTrackingButton();
        });

        L.DomEvent.on(container, 'mousedown dblclick', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'click', L.DomEvent.stop);
        L.DomEvent.on(container, 'click', function (e) {
            self.toggle();
            self.fire('trackchange', {state: self.getState()});
        });

        return container;
    },
    setActiveTrackingButton: function () {
        this._button.src = 'target-active.svg';
    },
    setPassiveTrackingButton: function () {
        this._button.src = 'target-passive.svg';
    },
    toggle: function () {
        this._active = !this._active;
        if (this._active) {
            this.setActiveTrackingButton();
        } else {
            this.setPassiveTrackingButton();
        }
    },
    passiveTrack: function () {
        this._active = false;
    },
    activeTrak: function () {
        this._active = true;
    },
    getState: function () {
        return this._active;
    }
});

L.Control.track = function (options) {
    return new L.Control.Track(options);
};


L.Control.Level = L.Control.extend({
    includes: L.Mixin.Events,

    options: {
        position: 'topright',
        parseLevel: function (level) {
            return parseInt(level, 10);
        }
    },

    initialize: function (options) {
        L.setOptions(this, options);

        this._map = null;
        this._buttons = {};
        this._listeners = [];
        this._level = options.level;
        this._levelLabels = {};

        this.addEventListener("levelchange", this._levelChange, this);
    },
    onAdd: function (map) {
        var div = L.DomUtil.create('div', 'ibecom-control');

        div.style.font = "18px 'Lucida Console',Monaco,monospace";
        var buttons = this._buttons;
        var activeLevel = this._level;
        var self = this;

        var levels = this._levelLabels;
        var labels = this.options.labels;

        this.options.levels.forEach(function (levelNumber) {
            var level = self.options.parseLevel(levelNumber);

            levels[level] = {
                label: (labels && labels[level]) ? labels[level] : level
            };
        });

        var levelDiv = L.DomUtil.create('div', 'ibecom-control-levels');
        var iconDiv = L.DomUtil.create('div', 'ibecom-control-icon');
        iconDiv.innerHTML = '<img src="levelctl.svg">';

        iconDiv.ondblclick = iconDiv.onclick = function (e) {
            $(levelDiv).toggle();
            e.preventDefault();
            e.stopPropagation();
        };

        var levelNumbers = Object.keys(levels);

        levelNumbers.sort(function (a, b) {
            return b.num - a.num;
        });

        levelNumbers.forEach(function (levelNumber) {
            var levelLabel = levels[levelNumber].label;

            var btnClass = 'ibecom-level-button-container-passive';
            if (levelNumber == activeLevel) {
                btnClass = 'ibecom-level-button-container-active';
            }

            var levelBtn = L.DomUtil.create('div', btnClass, levelDiv);

            levelBtn.innerHTML = "<a class=\"ibecom-level-button-text noselect\">" + levelLabel + "</a>";

            (function (level, label) {
                levelBtn.onclick = function (e) {
                    self.setLevel(level);
                    $(levelDiv).hide();
                };
            })(levelNumber, levelLabel);

            buttons[levelNumber] = levelBtn;
        });

        div.appendChild(levelDiv);
        div.appendChild(iconDiv);
        return div;
    },
    _levelChange: function (e) {
        if (this._map !== null) {
            if (typeof e.oldLevel !== "undefined")
                $(this._buttons[e.oldLevel]).removeClass("ibecom-level-button-container-active").addClass("ibecom-level-button-container-passive");
            $(this._buttons[e.newLevel]).removeClass("ibecom-level-button-container-passive").addClass("ibecom-level-button-container-active");
        }
    },
    setLevel: function (level) {

        if (level === this._level)
            return;

        var oldLevel = this._level;
        this._level = level;

        this.fireEvent('levelchange', {
            oldLevel: oldLevel,
            newLevel: level,
            newLevelLabel: this._levelLabels[level].label
        });
    },
    getLevel: function () {
        return this._level;
    }
});

L.Control.level = function (options) {
    return new L.Control.Level(options);
};
