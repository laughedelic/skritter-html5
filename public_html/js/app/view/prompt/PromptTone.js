define([
    'view/prompt/Prompt'
], function(Prompt) {
    /**
     * @class PromptTone
     */
    var PromptTone = Prompt.extend({
        /**
         * @method initialize
         */
        initialize: function(container) {
            Prompt.prototype.initialize.call(this, container);
        },
        /**
         * @method hide
         */
        hide: function() {
            Prompt.prototype.hide.call(this);
        },
        /**
         * @method show
         */
        show: function() {
            Prompt.prototype.show.call(this);
            this.container.canvas.show();
        }
    });

    return PromptTone;
});