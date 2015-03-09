/**
 * @module Application
 * @submodule Components
 */
define([
    'require.text!templates/components/prompt.html',
    'core/modules/GelatoComponent',
    'modules/components/PromptDetail',
    'modules/components/PromptGrading',
    'modules/components/PromptNavigation',
    'modules/components/PromptToolbar',
    'modules/components/WritingCanvas'
], function(Template, GelatoComponent, PromptDetail, PromptGrading, PromptNavigation, PromptToolbar, WritingCanvas) {

    /**
     * @class Prompt
     * @extends GelatoComponent
     */
    var Prompt = GelatoComponent.extend({
        /**
         * @method initialize
         * @constructor
         */
        initialize: function() {
            this.characters = [];
            this.canvas = new WritingCanvas();
            this.detail = new PromptDetail({prompt: this});
            this.grading = new PromptGrading({prompt: this});
            this.navigation = new PromptNavigation({prompt: this});
            this.part = 'rune';
            this.position = 1;
            this.toolbar = new PromptToolbar({prompt: this});
            this.vocab = null;
            this.listenTo(this.canvas, 'canvas:click', this.handleClickCanvas);
            this.listenTo(this.canvas, 'input:up', this.handleInputUp);
            this.on('resize', this.resize);
        },
        /**
         * @method render
         * @returns {Prompt}
         */
        render: function() {
            this.renderTemplate(Template);
            this.canvas.setElement('.writing-canvas-container').render();
            this.detail.setElement(this.$('.prompt-detail-container')).render();
            this.grading.setElement(this.$('.prompt-grading-container')).render();
            this.navigation.setElement(this.$('.prompt-navigation-container')).render();
            this.toolbar.setElement('.prompt-toolbar-container').render();
            this.resize();
            return this;
        },
        /**
         * @method renderPrompt
         * @returns {Prompt}
         */
        renderPrompt: function() {
            this.detail.renderFields();
            switch (this.part) {
                case 'defn':
                    this.renderPromptDefn();
                    break;
                case 'rdng':
                    this.renderPromptRdng();
                    break;
                case 'rune':
                    this.renderPromptRune();
                    break;
                case 'tone':
                    this.renderPromptTone();
                    break;
            }
            return this;
        },
        /**
         * @method renderPromptDefn
         * @returns {Prompt}
         */
        renderPromptDefn: function() {
            this.canvas.hide();
            this.detail.showCharacters();
            this.detail.showReading();
            return this;
        },
        /**
         * @method renderPromptRdng
         * @returns {Prompt}
         */
        renderPromptRdng: function() {
            this.canvas.hide();
            this.detail.showCharacters();
            this.detail.hideReading();
            return this;
        },
        /**
         * @method renderPromptRune
         * @returns {Prompt}
         */
        renderPromptRune: function() {
            this.canvas.show();
            this.canvas.reset();
            this.detail.showReading();
            if (this.character().isComplete()) {
                this.canvas.disableInput();
                this.detail.showCharacters();
            } else {
                this.canvas.enableInput();
                this.detail.hideCharacters();
            }
            this.canvas.drawShape('surface-background1', this.character().getShape());
            this.detail.selectCharacter();
            return this;
        },
        /**
         * @method renderPromptTone
         * @returns {Prompt}
         */
        renderPromptTone: function() {
            this.canvas.show();
            this.detail.showCharacters();
            this.detail.showReading();
            return this;
        },
        /**
         * @method character
         * @returns {CanvasCharacter}
         */
        character: function() {
            return this.characters[this.position - 1];
        },
        /**
         * @method handleClickCanvas
         */
        handleClickCanvas: function() {
            if (this.character().isComplete()) {
                this.next();
            }
        },
        /**
         * @method handleInputUp
         * @param {Array} points
         * @param {createjs.Shape} shape
         */
        handleInputUp: function(points, shape) {
            var stroke = this.character().recognize(points, shape);
            if (stroke) {
                var targetShape = stroke.getShape();
                var userShape = stroke.getUserShape();
                this.canvas.tweenShape('surface', userShape, targetShape);
            }
            if (this.character().isComplete()) {
                this.canvas.disableInput();
                this.detail.showCharacter();
            }
        },
        /**
         * @method isFirst
         * @returns {Boolean}
         */
        isFirst: function() {
            return this.position === 1;
        },
        /**
         * @method isLast
         * @returns {Boolean}
         */
        isLast: function() {
            return this.position >= this.characters.length;
        },
        /**
         * @method next
         * @returns {Prompt}
         */
        next: function() {
            if (this.isLast()) {
                console.log('Prompt complete!');
                this.trigger('prompt:complete');
            } else {
                this.position++;
                this.renderPrompt();
            }
            return this;
        },
        /**
         * @method previous
         * @returns {Prompt}
         */
        previous: function() {
            if (this.isFirst()) {
                console.log('No going back!');
            } else {
                this.position--;
                this.renderPrompt();
            }
            return this;
        },
        /**
         * @method remove
         * @returns {Prompt}
         */
        remove: function() {
            this.canvas.remove();
            this.detail.remove();
            this.grading.remove();
            this.navigation.remove();
            this.toolbar.remove();
            return GelatoComponent.prototype.remove.call(this);
        },
        /**
         * @method resize
         * @returns {Prompt}
         */
        resize: function() {
            this.canvas.resize(450);
            return this;
        },
        /**
         * @method set
         * @param {DataVocab} vocab
         * @param {String} part
         * @param {Boolean} isNew
         * @returns {Prompt}
         */
        set: function(vocab, part, isNew) {
            console.log('PROMPT:', vocab.id, part, vocab);
            this.characters = part === 'rune' ? vocab.getCanvasCharacters() : [];
            this.part = part;
            this.vocab = vocab;
            this.setNewBanner(isNew);
            this.renderPrompt();
            this.resize();
            return this;
        },
        /**
         * @method setNewBanner
         * @param {Boolean} visible
         * @returns {Prompt}
         */
        setNewBanner: function(visible) {
            if (visible) {
                this.$('.vocab-new').show();
            } else {
                this.$('.vocab-new').hide();
            }
            return this;
        }
    });

    return Prompt;

});