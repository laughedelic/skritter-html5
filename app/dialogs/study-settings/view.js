var GelatoDialog = require('gelato/bootstrap/dialog');

/**
 * @class StudySettingsDialog
 * @extends {GelatoDialog}
 */
module.exports = GelatoDialog.extend({
    /**
     * @property events
     * @type {Object}
     */
    events: {
        'click #button-close': 'handleClickClose',
        'click #button-save': 'handleClickSave'
    },
    /**
     * @property template
     * @type {Function}
     */
    template: require('./template'),
    /**
     * @method render
     * @returns {StudySettingsDialog}
     */
    render: function() {
        this.renderTemplate();
        return this;
    },
    /**
     * @method getSelectedParts
     * @returns {Array}
     */
    getSelectedParts: function() {
        var parts = [];
        this.$('#field-parts :checked').each(function() {
            parts.push($(this).val());
        });
        return parts;
    },
    /**
     * @method getSettings
     * @returns {Object}
     */
    getSettings: function() {
        if (app.isJapanese()) {
            return {
                filteredJapaneseParts: this.getSelectedParts()
            };
        } else {
            return {
                filteredChineseParts: this.getSelectedParts()
            };
        }
    },
    /**
     * @method handleClickClose
     * @param {Event} event
     */
    handleClickClose: function(event) {
        event.preventDefault();
        this.trigger('close');
        this.close();
    },
    /**
     * @method handleClickSave
     * @param {Event} event
     */
    handleClickSave: function(event) {
        event.preventDefault();
        this.trigger('save', this.getSettings());
    }
});
