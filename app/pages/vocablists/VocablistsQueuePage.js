const GelatoPage = require('gelato/page');
const AddingTable = require('components/vocablists/VocablistsAddingTableComponent');
const ReviewingTable = require('components/vocablists/VocablistsReviewingTableComponent');
const Sidebar = require('components/vocablists/VocablistsSidebarComponent');
const Vocablists = require('collections/VocablistCollection');

/**
 * @class VocablistsQueue
 * @extends {GelatoPage}
 */
module.exports = GelatoPage.extend({

  /**
   * @property title
   * @type {String}
   */
  title: app.locale('pages.vocablists.titleQueue'),

  section: 'Lists',

  /**
   * @property template
   * @type {Function}
   */
  template: require('./VocablistsQueue'),

  /**
   * @method initialize
   * @constructor
   */
  initialize: function() {
    this.vocablists = app.user.vocablists;
    this.addingTable = new AddingTable({vocablists: this.vocablists});
    this.reviewingTable = new ReviewingTable({vocablists: this.vocablists});
    this.sidebar = new Sidebar();

    this.listenTo(
      this.vocablists, 'state:standby',
      function() {
        if (!this.vocablists.length) {
          app.router.navigate('vocablists/browse', {trigger: true});
        }
        if (this.vocablists.cursor) {
          this.vocablists.fetch({
            data: {
              cursor: this.vocablists.cursor,
              limit: 10,
              sort: 'studying',
              include_percent_done: 'true',
              lang: app.getLanguage()
            },
            remove: false
          });
        }
      }
    );

    this.vocablists.fetch({
      data: {
        limit: 10,
        sort: 'studying',
        include_percent_done: 'true',
        lang: app.getLanguage()
      }
    });

  },

  /**
   * @method render
   * @returns {VocablistsQueue}
   */
  render: function() {
    if (app.isMobile()) {
      this.template = require('./MobileVocablistsQueue.jade');
    }

    this.renderTemplate();
    this.addingTable.setElement('#adding-container').render();
    this.reviewingTable.setElement('#reviewing-container').render();
    this.sidebar.setElement('#vocablist-sidebar-container').render();

    return this;
  },

  /**
   * @method remove
   * @returns {VocablistsQueue}
   */
  remove: function() {
    this.addingTable.remove();
    this.reviewingTable.remove();
    this.sidebar.remove();

    return GelatoPage.prototype.remove.call(this);
  }

});
