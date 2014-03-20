/**
 * @module Skritter
 * @submodule Models
 * @author Joshua McFarland
 */
define(function() {
    /**
     * @class DataSentence
     */
    var Sentence = Backbone.Model.extend({
        /**
         * @method cache
         * @param {Function} callback
         */
        cache: function(callback) {
            skritter.storage.put('sentence', this.toJSON(), function() {
                if (typeof callback === 'function')
                    callback();
            });
        },
        /**
         * @method maskWriting
         * @param {Array|String} value
         * @returns {String}
         */
        maskWriting: function(value) {
            var text = '' + this.get('writing');
            value = '' + value;
            var chars = value.split('');
            for (var i = 0, length = chars.length; i < length; i++)
                text = text.replace(new RegExp(chars[i], 'gi'), '__');
            return text;
        },
        /**
         * @method reading
         * @returns {String}
         */
        reading: function() {
            return skritter.fn.pinyin.toTone(this.get('reading'));
        }
    });

    return Sentence;
});