/**
 * @module Application
 */
define([
    'framework/BaseApplication',
    'require.i18n!locale/nls/strings',
    'application/Router',
    'components/Sidebars',
    'models/Api',
    'models/Assets',
    'models/User'
], function(BaseApplication, Strings, Router, Sidebars, Api, Assets, User) {
    /**
     * @class Application
     * @extends BaseApplication
     */
    var Application = BaseApplication.extend({
        /**
         * @method initialize
         */
        initialize: function() {
            this.api = new Api();
            this.assets = new Assets();
            this.router = new Router();
            this.strings = Strings;
        },
        /**
         * @method start
         */
        start: function() {
            this.sidebars = new Sidebars();
            this.user = new User();
            Backbone.history.start();
        }
    });

    return Application;
});