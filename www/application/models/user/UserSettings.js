/**
 * @module Application
 */
define([
    'framework/BaseModel'
], function(BaseModel) {
    /**
     * @class UserSettings
     * @extends BaseModel
     */
    var UserSettings = BaseModel.extend({
        /**
         * @method initialize
         * @param {User} user
         * @constructor
         */
        initialize: function(attributes, options) {
            this.user = options.user;
            this.on('change', this.cache);
        },
        /**
         * @method cache
         */
        cache: function() {
            localStorage.setItem(this.user.id + '-settings', JSON.stringify(this.toJSON()));
        },
        /**
         * @property defaults
         * @type Object
         */
        defaults: {
            audioPitch: '100',
            audioSpeed: '60',
            autoAdd: true,
            allChineseParts: ['defn', 'rdng', 'rune', 'tone'],
            allJapaneseParts: ['defn', 'rdng', 'rune'],
            dailyAddLimit: 20,
            filterChineseParts: ['defn', 'rdng', 'rune', 'tone'],
            filterJapaneseParts: ['defn', 'rdng', 'rune'],
            filterLists: [],
            filterItems: [],
            hideExpired: 0,
            readingStyle: 'pinyin',
            tutorials: ['defn', 'grading', 'rdng', 'rune', 'tone']
        },
        /**
         * @method disableTutorial
         * @param {String} name
         * @returns {Boolean}
         */
        disableTutorial: function(name) {
            this.set('tutorials', _.without(this.get('tutorials'), name));
        },
        /**
         * @method fetch
         * @param {Function} callback
         */
        fetch: function(callback) {
            var self = this;
            app.api.getUsers(this.user.id, null, function(data) {
                self.set(data);
                callback();
            }, function(error) {
                callback(error);
            });
        },
        /**
         * @method getActiveItems
         * @returns {Array}
         */
        getActiveItems: function() {
            return this.get('filterItems').length ? this.get('filterItems') : undefined;
        },
        /**
         * @method getActiveLists
         * @returns {Array}
         */
        getActiveLists: function() {
            return this.get('filterLists').length ? this.get('filterLists') : undefined;
        },
        /**
         * @method getActiveParts
         * @returns {Array}
         */
        getActiveParts: function() {
            var parts = [];
            if (this.user.isChinese()) {
                parts = _.intersection(this.get('filterChineseParts'), this.getEnabledParts());
            } else {
                parts = _.intersection(this.get('filterJapaneseParts'), this.getEnabledParts());
            }
            return parts;
        },
        /**
         * @method getActiveStyles
         * @returns {Array}
         */
        getActiveStyles: function() {
            if (this.user.isJapanese()) {
                return ['both', 'none'];
            } else if (this.user.isChinese() && this.get('reviewSimplified') && this.get('reviewTraditional')) {
                return ['both', 'none', 'simp', 'trad'];
            } else if (this.user.isChinese() && this.get('reviewSimplified') && !this.get('reviewTraditional')) {
                return ['both', 'none', 'simp'];
            } else {
                return ['both', 'none', 'trad'];
            }
        },
        /**
         * @method getAllParts
         * @returns {Array}
         */
        getAllParts: function() {
            return this.user.isChinese() ? this.get('allChineseParts') : this.get('allJapaneseParts');
        },
        /**
         * @method getCustomData
         * @returns {Object}
         */
        getCustomData: function() {
            var currentReview = app.user.reviews.current ? app.user.reviews.current.toJSON() : null;
            var previousReview = app.user.reviews.previous ? app.user.reviews.previous.toJSON() : null;
            return {
                reviews: {
                    current: currentReview,
                    previous: previousReview
                }
            };
        },
        /**
         * @method getEnabledParts
         * @returns {Array}
         */
        getEnabledParts: function() {
            return this.user.isChinese() ? this.get('chineseStudyParts') : this.get('japaneseStudyParts');
        },
        /**
         * @method getTags
         * @returns {Array}
         */
        getTags: function() {
            var tags = [];
            if (this.user.isChinese()) {
                if (this.get('reviewSimplified') && this.get('reviewTraditional')) {
                    tags = ['chinese', 'simplified', 'traditional'];
                } else if (this.get('reviewSimplified')) {
                    tags = ['chinese', 'simplified', 'traditional'];
                } else if (this.get('reviewTraditional')) {
                    tags = ['chinese', 'traditional'];
                }
            } else if (this.user.isJapanese()) {
                tags = ['japanese'];
            }
            return tags;
        },
        /**
         * @method hasTutorial
         * @param {String} name
         * @returns {Boolean}
         */
        hasTutorial: function(name) {
            return this.get('tutorials').indexOf(name) !== -1;
        },
        /**
         * @method isAudioEnabled
         * @returns {Boolean}
         */
        isAudioEnabled: function() {
            return this.get('volume') ? true : false;
        },
        /**
         * @method resetTutorials
         */
        resetTutorials: function() {
            this.set('tutorials', ['defn', 'grading', 'rdng', 'rune', 'tone']);
        },
        /**
         * @method setActiveParts
         * @param {Array} parts
         * @returns {Array}
         */
        setActiveParts: function(parts) {
            if (this.user.isChinese()) {
                this.set('filterChineseParts', parts);
            } else {
                this.set('filterJapaneseParts', parts);
            }
            return this.getActiveParts();
        },
        /**
         * @method setActiveStyles
         * @param {Array} styles
         * @returns {Array}
         */
        setActiveStyles: function(styles) {
            if (this.user.isChinese()) {
                if (styles.indexOf('simp') === -1) {
                    this.set('reviewSimplified', false);
                } else {
                    this.set('reviewSimplified', true);
                }
                if (styles.indexOf('trad') === -1) {
                    this.set('reviewTraditional', false);
                } else {
                    this.set('reviewTraditional', true);
                }
            }
            return this.getActiveStyles();
        },
        /**
         * @method update
         * @param {Function} [callbackSuccess]
         * @param {Function} [callback]
         */
        update: function(callbackSuccess, callbackError) {
            var self = this;
            app.api.updateUser(this.toJSON(), function(user) {
                self.set(user);
                if (typeof callbackSuccess === 'function') {
                    callbackSuccess();
                }
            }, function(error) {
                self.set(self.previousAttributes());
                if (typeof callbackError === 'function') {
                    callbackError(error);
                }
            });
        }
    });

    return UserSettings;
});