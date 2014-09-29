/**
 * @module Application
 */
define([
    'framework/BaseModel'
], function(BaseModel) {
    /**
     * @class DataVocab
     * @extends BaseModel
     */
    var DataVocab = BaseModel.extend({
        /**
         * @method initialize
         */
        initialize: function() {},
        /**
         * @property idAttribute
         * @type String
         */
        idAttribute: 'id',
        /**
         * @property defaults
         * @type Object
         */
        defaults: {},
        /**
         * @method cache
         * @param {Function} [callback]
         */
        cache: function(callback) {
            app.user.data.flagVocabUpdate(this.id);
            app.storage.putItems('vocabs', this.toJSON(), function() {
                if (typeof callback === 'function') {
                    callback();
                }
            });
        },
        /**
         * @method getAudio
         * @returns {String}
         */
        getAudio: function() {
            return app.isNative()  ? this.get('writing') : this.get('audio');
        },
        /**
         * @method getCanvasCharacter
         * @returns {CanvasCharacter}
         */
        getCanvasCharacter: function() {
            return this.getStroke() ? this.getStroke().getCanvasCharacter() : undefined;
        },
        /**
         * @method getCharacterCount
         * @returns {Number}
         */
        getCharacterCount: function() {
            return this.getCharacters().length;
        },
        /**
         * @method getCharacters
         * @returns {Array}
         */
        getCharacters: function() {
            var characters = [];
            if (this.has('containedVocabIds')) {
                var containedVocabIds = this.get('containedVocabIds');
                for (var i = 0, length = containedVocabIds.length; i < length; i++) {
                    if (this.isChinese()) {
                        characters.push(app.fn.mapper.fromBase(containedVocabIds[i]));
                    } else {
                        characters.push(containedVocabIds[i].split('-')[1]);
                    }
                }
            } else {
                characters.push(this.get('writing'));
            }
            return characters;
        },
        /**
         * @method getContainedItemIds
         * @param {String} part
         * @returns {Array}
         */
        getContainedItemIds: function(part) {
            var containedItemIds = [];
            if (this.has('containedVocabIds')) {
                var containedVocabIds = this.get('containedVocabIds');
                for (var i = 0, length = containedVocabIds.length; i < length; i++) {
                    var containedVocabId = containedVocabIds[i];
                    var containedSplit = containedVocabId.split('-');
                    if (part === 'rune') {
                        containedItemIds.push(app.user.id + '-' + containedVocabId + '-' + part);
                    } else if (parseInt(containedSplit[2], 10) > 1) {
                        containedItemIds.push(app.user.id + '-' + containedVocabId + '-' + part);
                    } else {
                        containedItemIds.push(app.user.id + '-' + containedSplit[0] + '-' + containedSplit[1] + '-0-' + part);
                    }
                }
            }
            return containedItemIds;
        },
        /**
         * @method getContainedVocabs
         * @returns {Array}
         */
        getContainedVocabs: function() {
            var vocabs = [];
            var containedIds = this.has('containedVocabIds') ? this.get('containedVocabIds') : [this.id];
            for (var i = 0, length = containedIds.length; i < length; i++) {
                vocabs.push(this.collection.get(containedIds[i]));
            }
            return vocabs;
        },
        /**
         * @method getDefinition
         * @returns {String}
         */
        getDefinition: function() {
            var customDefinition = this.get('customDefinition');
            var definition = this.get('definitions')[app.user.settings.get('sourceLang')];
            if (customDefinition && customDefinition !== '') {
                return this.get('customDefinition');
            } else if (definition) {
                return definition;
            } else {
                return this.get('definitions').en;
            }
        },
        /**
         * @method getReading
         * @param {Number} [startFrom]
         * @param {Object} [options]
         * @returns {String}
         */
        getReading: function(startFrom, options) {
            var html = '';
            var position = 1;
            var fillers = [" ... ", "'"];
            startFrom = startFrom ? startFrom : false;
            options = options ? options : {};
            options.hide = options.hide ? options.hide : false;
            options.mask = options.mask ? options.mask : false;
            options.style = options.style === 'zhuyin' ? true : false;
            if (this.isChinese()) {
                var segments = app.fn.segmentReading(this.get('reading'));
                for (var a = 0, lengthA = segments.length; a < lengthA; a++) {
                    var segment = segments[a];
                    html += "<div class='reading-" + (a + 1) + "'>";
                    for (var b = 0, lengthB = segment.length; b < lengthB; b++) {
                        var piece = segment[b];
                        if (fillers.indexOf(piece) === -1) {
                            var pieceMasked = piece.replace(/[1-5]/g, '');
                            var pieceMaskedZhuyin = app.fn.pinyin.toZhuyin(pieceMasked + '5');
                            var pieceTone = app.fn.pinyin.toTone(piece);
                            var pieceZhuyin = app.fn.pinyin.toZhuyin(piece);
                            if (!startFrom || startFrom > position) {
                                if (!startFrom && options.hide) {
                                    html += "<span class='position-" + position + " reading-button'><span>";
                                    html += options.style ? pieceMaskedZhuyin : pieceMasked;
                                    html += "</span></span>";
                                } else {
                                    html += "<span class='position-" + position + "'>";
                                    html += options.style ? pieceZhuyin : pieceTone;
                                    html += "</span>";
                                }
                            } else {
                                if (options.hide) {
                                    html += "<span class='position-" + position + " reading-button'><span>";
                                    html += options.style ? pieceMaskedZhuyin : pieceMasked;
                                    html += "</span></span>";
                                } else if (options.mask) {
                                    html += "<span class='position-" + position + " reading-masked'><span>";
                                    html += options.style ? pieceMaskedZhuyin : pieceMasked;
                                    html += "</span></span>";
                                } else {
                                    html += "<span class='position-" + position + " reading-hidden'>";
                                    html += "<span>" + piece + "</span></span>";
                                }
                            }
                            position++;
                        } else {
                            html += "<span class='reading-filler'>" + piece + "</span>";
                        }

                    }
                    if (a < segments.length - 1) {
                        html += ", ";
                    }
                    html += "</div>";
                }
            } else {
                return "<span class='reading-1'><span class='position-1'>" + this.get('reading') + "</span></span>";
            }
            return html;
        },
        /**
         * @method getStroke
         * @returns {DataStroke}
         */
        getStroke: function() {
            return app.user.data.strokes.get(this.get('writing'));
        },
        /**
         * @method getStyle
         * @returns {String}
         */
        getStyle: function() {
            var style = this.get('style');
            return style && ['both', 'none'].indexOf(style) === -1 ? style : '';
        },
        /**
         * @method getTones
         * @param {Number} position
         * @returns {Array}
         */
        getTones: function(position) {
            var tones = [];
            var reading = this.get('reading');
            if (reading.indexOf(', ') === -1) {
                reading = reading.match(/[0-9]+/g);
                for (var a = 0, lengthA = reading.length; a < lengthA; a++) {
                    tones.push([parseInt(reading[a], 10)]);
                }
            } else {
                reading = reading.split(', ');
                for (var b = 0, lengthB = reading.length; b < lengthB; b++) {
                    tones.push([app.fn.arrayToInt(reading[b].match(/[0-9]+/g))]);
                }
            }
            return _.flatten(this.getCharacterCount() > 1 ? tones[position - 1] : tones);
        },
        /**
         * @method getWriting
         * @param {Number} [startFrom]
         * @returns {String}
         */
        getWriting: function(startFrom) {
            var html = '';
            var position = 1;
            var allCharacters = this.get('writing').split('');
            var containedCharacters = this.getCharacters();
            for (var i = 0, length = allCharacters.length; i < length; i++) {
                var character = allCharacters[i];
                if (containedCharacters.indexOf(character) > -1) {
                    if (!startFrom || startFrom > position) {
                        html += "<span id='writing-" + position + "'>" + character + "</span>";
                    } else {
                        html += "<span id='writing-" + position + "' class='writing-hidden'>";
                        html += "<span>" + character + "</span></span>";
                    }
                    position++;
                } else {
                    html += "<span class='writing-filler'>" + character + "</span>";
                }
            }
            return html;
        },
        /**
         * @method isBanned
         * @returns {Boolean}
         */
        isBanned: function() {
            return this.get('bannedParts').length ? true : false;
        },
        /**
         * @method isChinese
         * @returns {Boolean}
         */
        isChinese: function() {
            return this.get('lang') === 'zh';
        },
        /**
         * @method isJapanese
         * @returns {Boolean}
         */
        isJapanese: function() {
            return this.get('lang') === 'ja';
        },
        /**
         * @method isStarred
         * @returns {Boolean}
         */
        isStarred: function() {
            return this.get('starred');
        }
    });

    return DataVocab;
});