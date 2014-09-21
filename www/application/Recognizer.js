/**
 * @module Application
 */
define([], function() {
    /**
     * @class Recognizer
     */
    function Recognizer() {
        this.baseDistanceThreshold = 200;
        this.baseSize = 600;
        this.canvasSize = 600;
    }
    /**
     * @method recognize
     * @param {CanvasCharacter} character
     * @param {CanvasStroke} userStroke
     * @returns {Boolean|CanvasStroke}
     */
    Recognizer.prototype.recognize = function(character, stroke) {
        var results = this.getResults(character, stroke);
        results = _.filter(results, 'total');
        results = _.sortBy(results, 'total');
        console.log('results', results);
        if (results.length === 0) {
            return false;
        }
        return results[0];
    };
    /**
     * @method getResults
     * @param {CanvasCharacter} character
     * @param {CanvasStroke} userStroke
     * @returns {Array}
     */
    Recognizer.prototype.getResults = function(character, userStroke) {
        var results = [];
        var targets = character.getExpectedVariations();
        for (var a = 0, lengthA = targets.length; a < lengthA; a++) {
            var target = targets[a];
            for (var b = 0, lengthB = target.length; b < lengthB; b++) {
                var targetStroke = target.at(b);
                if (targetStroke.get('position') === character.getPosition()) {
                    results = results.concat(this.runChecks(targetStroke, userStroke));
                }
            }
        }
        return results;
    };
    /**
     * @method scaleThreshold
     * @param {Number} value
     * @returns {Number}
     */
    Recognizer.prototype.scaleThreshold = function(value) {
        return value * (this.canvasSize / this.baseSize);
    };
    /**
     * @method runChecks
     * @param {CanvasStroke} targetStroke
     * @param {CanvasStroke} userStroke
;;     * @returns {Array}
     */
    Recognizer.prototype.runChecks = function(targetStroke, userStroke) {
        var results = [];
        var params = targetStroke.getParams();
        this.canvasSize = app.get('canvasSize');
        for (var a = 0, lengthA = params.length; a < lengthA; a++) {
            var param = params[a];
            var result = userStroke.clone();
            var total = 0;
            var scores = {
                distance: this.checkDistance(param, userStroke)
            };
            for (var check in scores) {
                var score = scores[check];
                if (isNaN(score)) {
                    total = false;
                    break;
                } else {
                    total += score;
                }
            }
            $.extend(true, result.attributes, targetStroke.attributes);
            result.total = total;
            results.push(result);
        }
        return results;
    };
    /**
     * @method checkDistance
     * @param {DataParam} targetParam
     * @param {CanvasStroke} userStroke
     * @returns {Boolean|Number}
     */
    Recognizer.prototype.checkDistance = function(targetParam, userStroke) {
        var score = app.fn.getDistance(targetParam.getRectangle().center, userStroke.getRectangle().center);
        if (score < this.scaleThreshold(this.baseDistanceThreshold)) {
            return score;
        }
        return false;
    };

    return Recognizer;
});
