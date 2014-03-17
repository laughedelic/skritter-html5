/**
 * @module Skritter
 * @submodule Models
 * @author Joshua McFarland
 */
define(function() {
    /**
     * @class DataVocab
     */
    var Vocab = Backbone.Model.extend({
        /**
         * @method cache
         * @param {Function} callback
         */
        cache: function(callback) {
            skritter.storage.put('vocabs', this.toJSON(), function() {
                if (typeof callback === 'function')
                    callback();
            });
        },
        /**
         * @method characters
         * @returns {Array}
         */
        characters: function() {
            var characters = [];
            var containedVocabIds = this.has('containedVocabIds') ? this.get('containedVocabIds') : [];
            if (this.has('containedVocabIds')) {
                for (var i = 0, length = containedVocabIds.length; i < length; i++)
                    if (this.get('lang') === 'zh') {
                        characters.push(skritter.fn.simptrad.fromBase(containedVocabIds[i]));
                    } else {
                        characters.push(containedVocabIds[i].split('-')[1]);
                    }
            } else {
                var splitWriting = this.get('writing').split('');
                if (splitWriting.length === 1 && !skritter.fn.isKana(splitWriting[0]))
                    characters.push(splitWriting[0]);
                    
            }
            return characters;
        },
        /**
         * @method containedItemIds
         * @param {String} part
         * @returns {Array}
         */
        containedItemIds: function(part) {
            var containedItemIds = [];
            if (part && part === 'rune' || part === 'tone') {
                var containedVocabIds = this.has('containedVocabIds') ? this.get('containedVocabIds') : [];
                for (var i = 0, length = containedVocabIds.length; i < length; i++)
                    containedItemIds.push(skritter.user.id + '-' + containedVocabIds[i] + '-' + part);
            }
            return containedItemIds;
        },
        /**
         * @method definition
         * @returns {String}
         */
        definition: function() {
            var definition;
            if (this.get('definitions')[skritter.user.settings.get('sourceLang')]) {
                definition = this.get('definitions')[skritter.user.settings.get('sourceLang')];
            } else if (this.get('definitions').en) {
                definition = this.get('definitions').en;
            }
            return definition;
        },
        /**
         * @method readingBlocks
         * @param {Number} offset
         * @param {Boolean} mask
         * @returns {String}
         */
        readingBlocks: function(offset, mask) {            
            var element = '';
            var position = 1;
            var reading = this.get('reading');
            if (skritter.user.settings.isChinese()) {
                reading = reading.indexOf(', ') === -1 ? [reading] : reading.split(', ');
                for (var a = 0, lengthA = reading.length; a < lengthA; a++) {
                    var pieces = reading[a].match(/[a-z]+[0-9]+|\s\.\.\.\s|\'/g);
                    element += "<span id=reading-" + (a + 1) + "'>";
                    for (var b = 0, lengthB = pieces.length; b < lengthB; b++) {
                        var piece = pieces[b];
                        if (piece.indexOf(' ... ') === -1 && piece.indexOf("'") === -1) {
                            if (offset && position >= offset) {
                                if (mask) {
                                    element += "<span class='position-" + position + " reading-masked'>" + piece.replace(/[0-9]/g, '') + "</span>";
                                } else {
                                    element += "<span class='position-" + position + " reading-hidden'><span>" + skritter.fn.pinyin.toTone(piece) + "</span></span>";
                                }
                            } else {
                                element += "<span class='position-" + position + "'>" + skritter.fn.pinyin.toTone(piece) + "</span>";
                            }
                            position++;
                        } else {
                            element += "<span class='reading-filler'>" + piece  + "</span>";
                        }
                    }
                    element += "</span>";
                }
            } else {
                reading = reading.split('');
                for (var i = 0, length = reading.length; i < length; i++)
                    element += "<span class='reading-kana'>" + reading[i] + "</span>";
            }
            return element;
        },
        /**
         * Returns an array of unique possible tone numbers in the order they appear in the
         * reading string. Japanese will just return an empty array since it doesn't have tones.
         * 
         * @method tones
         * @returns {Array}
         */
        tones: function() {
            var tones = [];
            var reading = this.get('reading');
            if (skritter.user.settings.isChinese()) {
                if (reading.indexOf(', ') === -1) {
                    reading = reading.match(/[0-9]+/g);
                    for (var a = 0, lengthA = reading.length; a < lengthA; a++)
                        tones.push([parseInt(reading[a], 10)]);
                } else {
                    reading = reading.split(', ');
                    for (var b = 0, lengthB = reading.length; b < lengthB; b++)
                        tones.push([skritter.fn.arrayToInt(reading[b].match(/[0-9]+/g))]);
                }
            }
            return tones;
        },
        /**
         * @method writingBlocks
         * @param {Number} offset
         * @returns {String}
         */
        writingBlocks: function(offset) {
            var element = '';
            var position = 1;
            var actualCharacters = this.get('writing').split('');
            var containedCharacters = this.characters();
            for (var i = 0, length = actualCharacters.length; i < length; i++) {
                var character = actualCharacters[i];
                if (containedCharacters.indexOf(character) === -1) {
                    element += "<span class='writing-filler'>" + character + "</span>";
                } else {
                    if (offset && position >= offset) {
                        element += "<span id='writing-" + position + "' class='writing-hidden'><span>" +  character + "</span></span>";
                    } else {
                        element += "<span id='writing-" + position + "'>" +  character + "</span>";
                    }
                    position++;
                }
            }
            return element;
        }
    });

    return Vocab;
}); 