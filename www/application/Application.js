/**
 * @module Application
 */
define([
    'framework/BaseApplication',
    'require.i18n!locale/nls/strings',
    'application/Functions',
    'application/Router',
    'components/Dialogs',
    'components/Sidebars',
    'components/Timer',
    'models/Analytics',
    'models/Api',
    'models/Assets',
    'models/User',
    'storage/IndexedDBAdapter'
], function(BaseApplication, Strings,
            Functions, Router, Dialogs, Sidebars, Timer, Analytics, Api, Assets, User, IndexedDBAdapter) {
    /**
     * @class Application
     * @extends BaseApplication
     */
    var Application = BaseApplication.extend({
        /**
         * @method initialize
         */
        initialize: function() {
            BaseApplication.prototype.initialize.call(this);
            this.api = new Api();
            this.assets = new Assets();
            this.fn = Functions;
            this.router = new Router();
            this.storage = new IndexedDBAdapter();
            this.strings = Strings;
        },
        /**
         * @property defaults
         * @type Object
         */
        defaults: {
            canvasSize: 600,
            languageCode: '@@languageCode',
            timestamp: parseInt('@@timestamp', 10),
            version: '@@version',
            versionCode: '@@versionCode'
        },
        /**
         * @method getVersion
         * @returns {String}
         */
        getVersion: function() {
            return this.get('version') === '@@version' ? 'edge' : this.get('version');
        },
        /**
         * @method start
         */
        start: function() {
            this.analytics = new Analytics();
            this.dialogs = new Dialogs();
            this.sidebars = new Sidebars();
            this.timer = new Timer();
            this.user = new User();
            this.user.load(function() {
                Backbone.history.start({
                    pushState: app.isLocalhost() || app.isNative() ? false : true,
                    root: app.isLocalhost() || app.isNative() ? '/skritter-html5/www/' : '/'
                });
            });
        }
    });

    return Application;
});