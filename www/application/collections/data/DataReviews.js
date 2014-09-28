/**
 * @module Application
 */
define([
    'framework/BaseCollection',
    'models/data/DataReview'
], function(BaseCollection, DataReview) {
    /**
     * @class DataReviews
     * @extend BaseCollection
     */
    var DataReviews = BaseCollection.extend({
        /**
         * @method initialize
         * @param {Array} models
         * @param {Object} options
         * @constructor
         */
        initialize: function(models, options) {
            options = options ? options : {};
            this.current = undefined;
            this.previous = undefined;
            this.user = options.user;
            this.on('add change', this.updateHistory);
        },
        /**
         * @property model
         * @type DataReview
         */
        model: DataReview,
        /**
         * @method cache
         * @param {Function} [callback]
         */
        cache: function(callback) {
            app.storage.putItems('reviews', this.toJSON(), function() {
                if (typeof callback === 'function') {
                    callback();
                }
            });
        },
        /**
         * @method comparator
         * @param {ScheduleItem} item
         * @returns {Number}
         */
        comparator: function(item) {
            return -item.attributes.timestamp;
        },
        /**
         * @method getBatch
         * @returns {Array}
         */
        getBatch: function() {
            return this.slice(1).map(function(review) {
                return review.attributes.reviews;
            });
        },
        /**
         * @method getTimerOffset
         * @returns {Number}
         */
        getTimerOffset: function() {
            var totalTime = 0;
            for (var i = 0, length = this.length; i < length; i++) {
                totalTime += this.at(i).get('reviews')[0].reviewTime;
            }
            return totalTime;
        },
        /**
         * @method loadAll
         * @param {Function} callback
         */
        loadAll: function(callback) {
            var self = this;
            app.storage.getAll('reviews', function(data) {
                self.reset();
                self.lazyAdd(data, callback, {silent: true, sort: false});
                self.sort();
            });
        },
        /**
         * @method save
         * @param {Function} callbackSuccess
         * @param {Function} callbackError
         */
        save: function(callbackSuccess, callbackError) {
            var self = this;
            var batch = this.getBatch();
            if (this.length > 1) {
                app.api.postReviews(batch, function(posted) {
                    var postedIds = _.uniq(_.pluck(posted, 'wordGroup'));
                    console.log('SYNC/UP:', posted.length);
                    app.storage.removeItems('reviews', postedIds, function() {
                        self.remove(postedIds);
                        callbackError();
                    });
                }, function(error, posted) {
                    console.error('POST ERROR:', error, posted);
                    callback(error);
                });
            } else {
                console.log('SYNC/UP:', 0);
                callbackSuccess();
            }
        },
        /**
         * @method updateHistory
         * @param {DataReview} review
         */
        updateHistory: function(review) {
            this.user.history.add({
                id: review.id,
                base: review.id.split('-')[2],
                part: review.get('part'),
                timestamp: review.get('timestamp')
            }, {merge: true});
        }
    });

    return DataReviews;
});
