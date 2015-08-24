var GelatoModel = require('gelato/model');

/**
 * @class SkritterModel
 * @extends {GelatoModel}
 */
module.exports = GelatoModel.extend({
    /**
     * @method headers
     * @returns {Object}
     */
    headers: function() {
        return app.user.session.getHeaders();
    },
    /**
     * @method sync
     * @param {String} method
     * @param {GelatoModel} model
     * @param {Object} options
     */
    sync: function(method, model, options) {
        options.headers = typeof this.headers === 'function' ? this.headers() : this.headers;
        options.url = app.getApiUrl() + (typeof this.url === 'function' ? this.url() : this.url);
        GelatoModel.prototype.sync.call(this, method, model, options);
    }
});
