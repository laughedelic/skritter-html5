const SkritterModel = require('base/BaseSkritterModel');
const SessionModel = require('models/SessionModel');
const SubscriptionModel = require('models/SubscriptionModel');
const CharacterCollection = require('collections/CharacterCollection');
const VocablistCollection = require('collections/VocablistCollection');
const ProgressStatsCollection = require('collections/ProgressStatsCollection');

/**
 * A model that represents a Skritter user.
 * @class UserModel
 * @extends {SkritterModel}
 */
const UserModel = SkritterModel.extend({

  /**
   * @property defaults
   * @type {Object}
   */
  defaults: {
    addItemOffset: 0,
    avatar: require('data/default-avatar'),
    allChineseParts: ['defn', 'rdng', 'rune', 'tone'],
    allJapaneseParts: ['defn', 'rdng', 'rune'],
    dailyItemAddingLimit: 20,
    filteredChineseParts: ['defn', 'rdng', 'rune', 'tone'],
    filteredJapaneseParts: ['defn', 'rdng', 'rune'],
    hideDefinition: false,
    gradingColors: {1: '#e74c3c', 2: '#ebbd3e', 3: '#87a64b', 4: '#4d88e3'},
    goals: {ja: {items: 20}, zh: {items: 20}},
    lastChineseItemUpdate: 0,
    lastJapaneseItemUpdate: 0,
    spaceItems: false,
    studyKana: false,
    teachingMode: true,
    timezone: 'America/New_York',
    volume: 1,
    wordDictionary: null
  },

  /**
   * @property urlRoot
   * @type {String}
   */
  urlRoot: 'users',

  /**
   * A vocablist collection
   * @property vocablists
   * @type {VocablistCollection}
   */
  vocablists: new VocablistCollection(),

  /**
   * A progress stats collection
   * @property stats
   * @type {ProgressStatsCollection}
   */
  stats: new ProgressStatsCollection(),

  /**
   * @method initialize
   * @constructor
   */
  initialize: function() {
    this.characters = new CharacterCollection();
    this.session = new SessionModel(null, {user: this});
    this.subscription = new SubscriptionModel({id: this.id});
  },

  /**
   * @method cache
   */
  cache: function() {
    app.setLocalStorage(this.id + '-user', this.toJSON());
  },

  /**
   * @method getAccountAgeBy
   * @param {String} [unit]
   * @returns {Number}
   */
  getAccountAgeBy: function(unit) {
    return moment().diff(this.get('created') * 1000, unit || 'days');
  },

  /**
   * @method getAllStudyParts
   * @returns {Array}
   */
  getAllStudyParts: function() {
    return app.isChinese() ? this.get('allChineseParts') : this.get('allJapaneseParts');
  },

  /**
   * @method getAllStudyStyles
   * @returns {Array}
   */
  getAllStudyStyles: function() {
    return app.isChinese() ? ['both', 'simp', 'trad'] : ['none'];
  },

  /**
   * @method getFilterParts
   * @returns {Array}
   */
  getFilteredParts: function() {
    var filteredParts = app.isChinese() ? this.get('filteredChineseParts') : this.get('filteredJapaneseParts');
    return _.intersection(this.getStudyParts(), filteredParts);
  },

  /**
   * @method getFilteredStyles
   * @returns {Array}
   */
  getFilteredStyles: function() {
    var styles = ['both'];
    if (app.isChinese()) {
      if (this.get('reviewSimplified')) {
        styles.push('simp');
      }
      if (this.get('reviewTraditional')) {
        styles.push('trad');
      }
    }
    return styles;
  },

  /**
   * @method getLastItemUpdate
   * @returns {Number}
   */
  getLastItemUpdate: function() {
    return app.isChinese() ? this.get('lastChineseItemUpdate') : this.get('lastJapaneseItemUpdate')
  },

  /**
   * @method getStudyParts
   * @returns {Array}
   */
  getStudyParts: function() {
    return app.isChinese() ? this.get('chineseStudyParts') : this.get('japaneseStudyParts');
  },

  /**
   * @method getRaygunTags
   * @returns {Array}
   */
  getRaygunTags: function() {
    var tags = [];
    if (app.isChinese()) {
      tags.push('chinese');
      if (this.get('reviewSimplified')) {
        tags.push('simplified');
      }
      if (this.get('reviewTraditional')) {
        tags.push('traditional');
      }
    } else if (app.isJapanese()) {
      tags.push('japanese');
    }
    return tags;
  },

  /**
   * @method isAddingPart
   * @param {String} part
   * @returns {Boolean}
   */
  isAddingPart: function(part) {
    return _.includes(this.getStudyParts(), part);
  },

  /**
   * @method isAudioEnabled
   * @returns {Boolean}
   */
  isAudioEnabled: function() {
    return this.get('volume') > 0;
  },

  /**
   * @method isItemAddingAllowed
   * @returns {Boolean}
   */
  isItemAddingAllowed: function() {
    return this.get('addFrequency') > 0;
  },

  /**
   * @method isLoggedIn
   * @returns {Boolean}
   */
  isLoggedIn: function() {
    return this.session.has('user_id');
  },

  /**
   * @method isReviewingPart
   * @param {String} part
   * @returns {Boolean}
   */
  isReviewingPart: function(part) {
    return _.includes(this.getFilteredParts(), part);
  },

  /**
   * Asynchronously checks whether the user's subscription is active while
   * optimizing fetches using memoization kinda.
   * Can also get a synchronous return if things have already been fetched.
   * This is bad design. I'm sorry. Will refactor once we do ES6. I..."promise".
   * @param {Function} [callback] called when it can be determined
   *                            whether the subscription is active.
   */
  isSubscriptionActive: function(callback) {
    var self = this;

    if (this.subscription.isFetched) {

      if (_.isFunction(callback)) {
        callback(this.subscription.getStatus() !== 'Expired');
      }

      return this.subscription.getStatus() !== 'Expired';
    } else {
      this.subscription.fetch({
        success: function() {
          callback(self.subscription.getStatus() !== 'Expired');
        }
      });
    }
  },

  /**
   * @method load
   * @param {Function} callback
   * @returns {User}
   */
  load: function(callback) {
    var self = this;
    if (!this.isLoggedIn()) {
      callback();
      return this;
    }
    async.series(
      [
        function(callback) {
          self.openDatabase(callback);
        },
        function(callback) {
          self.updateItems(callback);
        }
      ],
      callback
    );
    return this;
  },

  /**
   * @method login
   * @param {String} username
   * @param {String} password
   * @param {Function} callback
   */
  login: function(username, password, callback) {
    var self = this;
    async.waterfall([
      function(callback) {
        self.session.authenticate('password', username, password,
          function(result) {
            callback(null, result);
          }, function(error) {
            callback(error);
          });
      },
      function(result, callback) {
        self.set('id', result.id);
        self.fetch({
          error: function(error) {
            callback(error);
          },
          success: function(user) {
            callback(null, user);
          }
        })
      }
    ], function(error, user) {
      if (error) {
        callback(error);
      } else {
        self.cache();
        self.session.cache();
        app.removeSetting('session');
        app.removeSetting('siteRef');
        app.setSetting('user', self.id);
        mixpanel.identify(self.id);
        callback(null, user);
      }
    });
  },

  /**
   * Logs out a user
   * @method logout
   */
  logout: function() {
    var self = this;

    if (app.user.db) {
      app.user.db.delete()
        .then(function() {
          self._removeUserLocalStorageData()
        })
        .catch(function(error) {
          console.error(error);
          app.reload();
        });
    } else {
      // catches weird states where maybe some user data is still left over
      // but the login isn't valid
      self._removeUserLocalStorageData();
    }
  },

  /**
   * @method openDatabase
   * @param {Function} callback
   * @returns {User}
   */
  openDatabase: function(callback) {
    var self = this;
    if (!this.isLoggedIn()) {
      callback();
      return this;
    }
    this.db = new Dexie(this.id + '-database');
    this.db.version(2).stores(
      {
        items: 'id, *changed, *last, *next',
        reviews: 'group, *created'
      }
    ).upgrade(app.reset);
    this.db.version(3).stores(
      {
        items: 'id, *changed, *lang, *last, *next',
        reviews: 'group, *created'
      }
    ).upgrade(app.reset);
    this.db.open()
      .then(function() {
        callback();
      })
      .catch(function(error) {
        //specially handle error code 8 for safari
        if (error && error.code === 8) {
          callback();
        } else {
          self.db.delete().then(app.reload);
        }
      });
    return this;
  },

  /**
   * @method parse
   * @param {Object} response
   * @returns Array
   */
  parse: function(response) {
    return response.User;
  },

  /**
   * @method setLastItemUpdate
   * @param {Number} value
   * @returns {User}
   */
  setLastItemUpdate: function(value) {
    if (app.isChinese()) {
      this.set('lastChineseItemUpdate', value);
    } else {
      this.set('lastJapaneseItemUpdate', value);
    }
    return this;
  },

  /**
   * @method updateItems
   * @param {Function} callback
   * @returns {User}
   */
  updateItems: function(callback) {
    var self = this;
    var cursor = undefined;
    var index = 0;
    var limit = 2500;
    var now = moment().unix();
    var retries = 0;
    if (!this.isLoggedIn()) {
      callback();
      return this;
    }
    async.whilst(
      function() {
        index++;
        return cursor !== null;
      },
      function(callback) {
        if (index > 4) {
          ScreenLoader.notice('(loading can take awhile on larger accounts)');
        }
        ScreenLoader.post('Fetching item batch #' + index);
        $.ajax({
          method: 'GET',
          url: app.get('nodeApiRoot') + '/v1/items',
          data: {
            cursor: cursor,
            lang: app.getLanguage(),
            limit: limit,
            offset: self.getLastItemUpdate(),
            order: 'changed',
            token: self.session.get('access_token')
          },
          error: function(error) {
            if (retries > 2) {
              callback(error);
            } else {
              retries++;
              limit = 500;
              setTimeout(callback, 1000);
            }
          },
          success: function(result) {
            self.db.transaction(
              'rw',
              self.db.items,
              function() {
                result.Items.forEach(function(item) {
                  self.db.items.put(item);
                });
              }
            ).then(function() {
              cursor = result.cursor;
              setTimeout(callback, 100);
            }).catch(function(error) {
              if (retries > 2) {
                callback(error);
              } else {
                retries++;
                limit = 500;
                setTimeout(callback, 1000);
              }
            });
          }
        });
      },
      function(error) {
        self.setLastItemUpdate(now);
        self.cache();
        callback(error);
      }
    );
    return this;
  },

  /**
   * Deletes local storage and app settings related to user login
   * @method _removeUserLocalStorageData
   * @private
   */
  _removeUserLocalStorageData: function() {
    app.removeLocalStorage(self.id + '-session');
    app.removeLocalStorage(self.id + '-user');
    app.removeSetting('user');
    app.removeSetting('siteRef');
    app.reload();
  }

});

module.exports = UserModel;
