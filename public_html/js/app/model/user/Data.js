define([
    'collection/data/Decomps',
    'collection/data/Items',
    'collection/data/Params',
    'collection/data/Reviews',
    'collection/data/Sentences',
    'collection/data/SRSConfigs',
    'collection/data/Strokes',
    'collection/data/VocabLists',
    'collection/data/Vocabs'
], function(Decomps, Items, Params, Reviews, Sentences, SRSConfigs, Strokes, VocabLists, Vocabs) {
    /**
     * @class UserData
     */
    var UserData = Backbone.Model.extend({
        /**
         * @method initialize
         */
        initialize: function() {
            this.decomps = new Decomps();
            this.items = new Items();
            this.params = new Params();
            this.reviews = new Reviews();
            this.sentences = new Sentences();
            this.srsconfigs = new SRSConfigs();
            this.strokes = new Strokes();
            this.vocablists = new VocabLists();
            this.vocabs = new Vocabs();
            this.on('change', _.bind(this.cache, this));
        },
        /**
         * @property {Object} defaults
         */
        defaults: {
            changedVocabIds: [],
            downloadBatchId: null,
            lastErrorCheck: 0,
            lastItemSync: 0,
            lastReviewSync: 0,
            lastSRSConfigSync: 0,
            lastVocabSync: 0,
            syncing: false
        },
        /**
         * @method cache
         */
        cache: function() {
            var data = this.toJSON();
            data.syncing = false;
            localStorage.setItem(skritter.user.id + '-data', JSON.stringify(data));
        },
        /**
         * @method addItems
         * @param {Number} limit
         * @param {Function} callback
         */
        addItems: function(limit, callback) {
            var addedItemIds = [];
            var offset = skritter.user.settings.get('addItemOffset');
            this.set('syncing', true);
            async.waterfall([
                function(callback) {
                    var retryCount = 0;
                    function request() {
                        skritter.api.requestBatch([
                            {
                                path: 'api/v' + skritter.api.version + '/items/add',
                                method: 'POST',
                                params: {
                                    lang: skritter.user.getLanguageCode(),
                                    limit: limit ? limit : 1,
                                    offset: offset,
                                    fields: 'id'
                                }
                            }
                        ], function(batch, status) {
                            if (status === 200) {
                                callback(null, batch);
                            } else {
                                if (retryCount < 5) {
                                    retryCount++;
                                    window.setTimeout(request, 2000);
                                } else {
                                    callback(batch);
                                }
                            }
                        });
                    }
                    request();
                },
                function(batch, callback) {
                    var retryCount = 0;
                    function request() {
                        skritter.api.checkBatch(batch.id, function(result, status) {
                            if (result && status === 200) {
                                if (result.totalRequests > 0 && result.runningRequests === 0) {
                                    callback(null, result);
                                } else {
                                    window.setTimeout(request, 2000);
                                }
                            } else {
                                if (retryCount < 5) {
                                    retryCount++;
                                    window.setTimeout(request, 2000);
                                } else {
                                    callback(batch);
                                }
                            }
                        });
                    }
                    request();
                },
                function(batch, callback) {
                    var retryCount = 0;
                    function request() {
                        skritter.api.getBatch(batch.id, function(result, status) {
                            if (result && status === 200) {
                                if (result.Items) {
                                    addedItemIds = addedItemIds.concat(_.pluck(result.Items, 'id'));
                                }
                                window.setTimeout(request, 500);
                            } else if (!result && status === 200) {
                                callback(null, batch);
                            } else {
                                if (retryCount < 5) {
                                    retryCount++;
                                    window.setTimeout(request, 2000);
                                } else {
                                    callback(batch);
                                }
                            }
                        });
                    }
                    request();
                },
                function(callback) {
                    console.log('items: adding', addedItemIds.length);
                    skritter.user.data.sync(callback, true);
                }
            ], _.bind(function() {
                console.log('items: added', addedItemIds);
                if (typeof callback === 'function') {
                    callback(addedItemIds.length);
                }
            }, this));
        },
        /**
         * @method downloadAll
         * @param {Function} callback
         */
        downloadAll: function(callback) {
            this.set('syncing', true);
            var now = skritter.fn.getUnixTime();
            async.waterfall([
                function(callback) {
                    skritter.user.data.processBatch([
                        {
                            path: 'api/v' + skritter.api.version + '/items',
                            method: 'GET',
                            params: {
                                lang: skritter.user.getLanguageCode(),
                                sort: 'changed',
                                offset: 0,
                                include_vocabs: 'true',
                                include_sentences: 'false',
                                include_strokes: 'true',
                                include_heisigs: 'true',
                                include_top_mnemonics: 'true',
                                include_decomps: 'true'
                            },
                            spawner: true
                        },
                        {
                            path: 'api/v' + skritter.api.version + '/srsconfigs',
                            method: 'GET',
                            params: {lang: skritter.user.getLanguageCode()}
                        },
                        {
                            path: 'api/v' + skritter.api.version + '/vocablists',
                            method: 'GET',
                            params: {
                                lang: skritter.user.getLanguageCode(),
                                sort: 'custom'
                            },
                            spawner: true
                        },
                        {
                            path: 'api/v' + skritter.api.version + '/vocablists',
                            method: 'GET',
                            params: {
                                lang: skritter.user.getLanguageCode(),
                                sort: 'studying'
                            },
                            spawner: true
                        }
                    ], callback);
                },
                function(callback) {
                    skritter.user.data.srsconfigs.loadAll(callback);
                },
                function(callback) {
                    skritter.user.data.vocablists.loadAll(callback);
                },
                function(callback) {
                    skritter.user.scheduler.clear().loadAll(callback);
                }
            ], _.bind(function() {
                this.set({
                    downloadBatchId: null,
                    lastErrorCheck: now,
                    lastItemSync: now,
                    lastReviewSync: now,
                    lastSRSConfigSync: now,
                    lastVocabSync: now,
                    syncing: false
                });
                if (typeof callback === 'function') {
                    callback();
                }
            }, this));
        },
        /**
         * @method isInitial
         * @return {Boolean}
         */
        isInitial: function() {
            return this.get('lastItemSync') === 0 ? true : false;
        },
        /**
         * @method loadAll
         * @param {Function} callback
         */
        loadAll: function(callback) {
            async.series([
                function(callback) {
                    skritter.user.data.decomps.loadAll(callback);
                },
                function(callback) {
                    skritter.user.data.items.loadAll(callback);
                },
                function(callback) {
                    skritter.user.data.reviews.loadAll(callback);
                },
                function(callback) {
                    skritter.user.data.sentences.loadAll(callback);
                },
                function(callback) {
                    skritter.user.data.srsconfigs.loadAll(callback);
                },
                function(callback) {
                    skritter.user.data.strokes.loadAll(callback);
                },
                function(callback) {
                    skritter.user.data.vocablists.loadAll(callback);
                },
                function(callback) {
                    skritter.user.data.vocabs.loadAll(callback);
                }
            ], function() {
                if (typeof callback === 'function') {
                    callback();
                }
            });
        },
        /**
         * @method loadItem
         * @param {String} itemId
         * @param {Function} callback
         */
        loadItem: function(itemId, callback) {
            var part = itemId.split('-')[4];
            async.waterfall([
                //intial item
                function(callback) {
                    skritter.storage.get('items', itemId, function(items) {
                        if (items.length > 0) {
                            callback(null, skritter.user.data.items.add(items[0], {merge: true, silent: true}));
                        } else {
                            callback('Initial item is missing.');
                        }
                    });
                },
                //intial vocab
                function(item, callback) {
                    skritter.storage.get('vocabs', item.getVocabId(), function(vocabs) {
                        if (vocabs.length > 0) {
                            callback(null, item, skritter.user.data.vocabs.add(vocabs[0], {merge: true, silent: true}));
                        } else {
                            callback("Initial vocab is missing.", item);
                        }
                    });
                },
                //contained items
                function(item, vocab, callback) {
                    if (part === 'rune' || part === 'tone') {
                        var containedItemIds = vocab.getContainedItemIds(part);
                        var containedItemCount = containedItemIds.length;
                        skritter.storage.get('items', containedItemIds, function(containedItems) {
                            if (containedItemCount === containedItems.length) {
                                callback(null, item, vocab, skritter.user.data.items.add(containedItems, {merge: true, silent: true}));
                            } else {
                                callback("One or more of the contained items is missing.", item);
                            }
                        });
                    } else {
                        callback(null, item, vocab, []);
                    }
                },
                //contained vocabs
                function(item, vocab, containedItems, callback) {
                    if (containedItems.length > 0) {
                        var containedVocabIds = vocab.get('containedVocabIds');
                        skritter.storage.get('vocabs', containedVocabIds, function(containedVocabs) {
                            if (containedVocabIds.length === containedVocabs.length) {
                                callback(null, item, vocab, containedItems, skritter.user.data.vocabs.add(containedVocabs, {merge: true, silent: true, sort: false}));
                            } else {
                                callback("One or more of the contained vocabs is missing.", item);
                            }
                        });
                    } else {
                        callback(null, item, vocab, containedItems, []);
                    }
                },
                //sentence
                function(item, vocab, containedItems, containedVocabs, callback) {
                    if (vocab.has('sentenceId')) {
                        skritter.storage.get('sentences', vocab.get('sentenceId'), function(sentences) {
                            if (sentences.length > 0) {
                                callback(null, item, vocab, containedItems, containedVocabs, skritter.user.data.sentences.add(sentences, {merge: true, silent: true}));
                            } else {
                                callback("Sentence is missing.", item);
                            }
                        });
                    } else {
                        callback(null, item, vocab, containedItems, containedVocabs, null);
                    }
                },
                //strokes
                function(item, vocab, containedItems, containedVocabs, sentence, callback) {
                    if (part === 'rune') {
                        var strokeWritings = null;
                        if (containedVocabs.length === 0) {
                            strokeWritings = vocab.get('writing');
                        } else {
                            strokeWritings = _.pluck(containedVocabs, function(vocab) {
                                return vocab.attributes.writing;
                            });
                        }
                        skritter.storage.get('strokes', strokeWritings, function(strokes) {
                            if (strokeWritings.length === strokes.length) {
                                callback(null, item, vocab, containedItems, containedVocabs, sentence, skritter.user.data.strokes.add(strokes, {merge: true, silent: true}));
                            } else {
                                callback("One or more of the strokes are missing.", item);
                            }
                        });
                    } else {
                        callback(null, item, vocab, containedItems, containedVocabs, sentence, null);
                    }
                },
                //decomps
                function(item, vocab, containedItems, containedVocabs, sentence, strokes, callback) {
                    var strokeWritings = null;
                    if (containedVocabs.length === 0) {
                        strokeWritings = vocab.get('writing');
                    } else {
                        strokeWritings = _.pluck(containedVocabs, function(vocab) {
                            return vocab.attributes.writing;
                        });
                    }
                    skritter.storage.get('decomps', strokeWritings, function(decomps) {
                        if (strokeWritings.length === decomps.length) {
                            callback(null, item, vocab, containedItems, containedVocabs, sentence, strokes, skritter.user.data.decomps.add(decomps, {merge: true, silent: true}));
                        } else {
                            callback(null, item, vocab, containedItems, containedVocabs, sentence, strokes, null);
                        }
                    });
                }
            ], function(error, item, vocab, containedItems, containedVocabs, sentence, strokes, decomps) {
                if (error) {
                    if (item) {
                        console.log('unable to load', item.id, item, error);
                        skritter.user.scheduler.remove(item);
                    }
                    callback();
                } else {
                    callback(item, vocab, containedItems, containedVocabs, sentence, strokes, decomps);
                }
            });
        },
        /**
         * @method loadVocab
         * @param {String} vocabId
         * @param {Function} callback
         */
        loadVocab: function(vocabId, callback) {
            async.waterfall([
                //intial vocab
                function(callback) {
                    skritter.storage.get('vocabs', vocabId, function(vocabs) {
                        if (vocabs.length > 0) {
                            callback(null, skritter.user.data.vocabs.add(vocabs[0], {merge: true, silent: true}));
                        } else {
                            callback("Initial vocab is missing.");
                        }
                    });
                },
                //contained vocabs
                function(vocab, callback) {
                    var containedVocabIds = vocab.get('containedVocabIds');
                    if (containedVocabIds && containedVocabIds.length > 0) {
                        skritter.storage.get('vocabs', containedVocabIds, function(containedVocabs) {
                            if (containedVocabIds.length === containedVocabs.length) {
                                callback(null, vocab, skritter.user.data.vocabs.add(containedVocabs, {merge: true, silent: true, sort: false}));
                            } else {
                                callback(null, vocab, skritter.user.data.vocabs.add(containedVocabs, {merge: true, silent: true, sort: false}));
                            }
                        });
                    } else {
                        callback(null, vocab, []);
                    }
                },
                //sentence
                function(vocab, containedVocabs, callback) {
                    if (vocab.has('sentenceId')) {
                        skritter.storage.get('sentences', vocab.get('sentenceId'), function(sentences) {
                            if (sentences.length > 0) {
                                callback(null, vocab, containedVocabs, skritter.user.data.sentences.add(sentences, {merge: true, silent: true}));
                            } else {
                                callback(null, vocab, containedVocabs, null);
                            }
                        });
                    } else {
                        callback(null, vocab, containedVocabs, null);
                    }
                },
                //decomps
                function(vocab, containedVocabs, sentence, callback) {
                    var characters = vocab.getCharacters();
                    skritter.storage.get('decomps', characters, function(decomps) {
                        if (characters.length === decomps.length) {
                            callback(null, vocab, containedVocabs, sentence, skritter.user.data.decomps.add(decomps, {merge: true, silent: true}));
                        } else {
                            callback(null, vocab, containedVocabs, sentence, null);
                        }
                    });
                }
            ], function(error, vocab, containedVocabs, sentence, decomps) {
                if (error) {
                    callback(vocab, containedVocabs, sentence, decomps);
                } else {
                    callback(vocab, containedVocabs, sentence, decomps);
                }
            });
        },
        /**
         * @method processBatch
         * @param {Array} requests
         * @param {Function} callback
         */
        processBatch: function(requests, callback) {
            async.waterfall([
                function(callback) {
                    var retryCount = 0;
                    function request() {
                        skritter.api.requestBatch(requests, function(batch, status) {
                            if (status === 200) {
                                skritter.user.data.set('downloadBatchId', batch.id);
                                callback(null, batch);
                            } else {
                                if (retryCount < 5) {
                                    retryCount++;
                                    window.setTimeout(request, 2000);
                                } else {
                                    callback(batch);
                                }
                            }
                        });
                    }
                    if (skritter.user.data.get('downloadBatchId')) {
                        callback(null, {id: skritter.user.data.get('downloadBatchId')});
                    } else {
                        request();
                    }
                },
                function(batch, callback) {
                    var retryCount = 0;
                    function request() {
                        skritter.api.checkBatch(batch.id, function(result, status) {
                            if (result && status === 200) {
                                if (result.totalRequests > 0 && result.runningRequests === 0) {
                                    callback(null, result);
                                } else {
                                    var responseSizeTotal = skritter.fn.addAll(result.Requests, 'responseSize');
                                    var responseSizeString = skritter.fn.convertBytesToSize(responseSizeTotal);
                                    if (responseSizeTotal && responseSizeString) {
                                        skritter.modal.set('.modal-title-secondary', responseSizeString);
                                    }
                                    window.setTimeout(request, 2000);
                                }
                            } else {
                                if (retryCount < 5) {
                                    retryCount++;
                                    window.setTimeout(request, 2000);
                                } else {
                                    callback(result);
                                }
                            }
                        });
                    }
                    request();
                },
                function(batch, callback) {
                    var retryCount = 0;
                    var downloadedRequests = 0;
                    var totalRequests = batch.totalRequests;
                    skritter.modal.set('.modal-title', 'Downloading')
                        .set('.modal-loading-image', false)
                        .set('.message-error', false)
                        .set('.modal-title-icon', null, 'fa-download')
                        .set('.modal-body')
                        .progress(0);
                    function request() {
                        skritter.api.getBatch(batch.id, function(result, status) {
                            if (result && status === 200) {
                                downloadedRequests += result.downloadedRequests;
                                skritter.user.data.put(result, function() {
                                    var downloadPercent = Math.round((downloadedRequests / totalRequests) * 100);
                                    skritter.modal.set('.modal-title-secondary', downloadPercent + '%');
                                    skritter.modal.progress(downloadPercent);
                                    window.setTimeout(request, 500);
                                });
                            } else if (!result && status === 200) {
                                callback(null, batch);
                            } else {
                                if (retryCount < 5) {
                                    retryCount++;
                                    window.setTimeout(request, 2000);
                                } else {
                                    callback(result);
                                }
                            }
                        });
                    }
                    request();
                }
            ], function(error) {
                if (error) {
                    skritter.modal.set('.modal-body').set('.message-error').set('.progress', false);
                    skritter.modal.element('.button-try-again').on('vclick', function() {
                        document.location.reload(true);
                    });
                    skritter.modal.element('.button-logout').on('vclick', function() {
                        skritter.user.logout(true);
                    });
                } else {
                    callback();
                }
            });
        },
        /**
         * @method put
         * @param {Object} result
         * @param {Function} callback
         */
        put: function(result, callback) {
            async.series([
                function(callback) {
                    skritter.user.data.decomps.insert(result.Decomps, callback);
                },
                function(callback) {
                    skritter.user.data.items.insert(result.Items, callback);
                },
                function(callback) {
                    skritter.user.data.sentences.insert(result.Sentences, callback);
                },
                function(callback) {
                    skritter.user.data.srsconfigs.insert(result.SRSConfigs, callback);
                },
                function(callback) {
                    skritter.user.data.strokes.insert(result.Strokes, callback);
                },
                function(callback) {
                    skritter.user.data.vocablists.insert(result.VocabLists, callback);
                },
                function(callback) {
                    skritter.user.data.vocabs.insert(result.Vocabs, callback);
                }
            ], function() {
                if (typeof callback === 'function') {
                    callback();
                }
            });
        },
        /**
         * @method reset
         * @return {Backbone.Model}
         */
        reset: function() {
            this.decomps.reset();
            this.items.reset();
            this.sentences.reset();
            this.strokes.reset();
            this.vocabs.reset();
            return this;
        },
        /**
         * @method sync
         * @param {Function} callback
         * @param {Boolean} includeResources
         */
        sync: function(callback, includeResources) {
            this.set('syncing', true);
            var changedVocabIds = this.get('changedVocabIds');
            var lastErrorCheck = this.get('lastErrorCheck');
            var lastItemSync = this.get('lastItemSync');
            var lastReviewSync = this.get('lastReviewSync');
            var lastSRSConfigSync = this.get('lastSRSConfigSync');
            var lastVocabSync = this.get('lastVocabSync');
            var now = skritter.fn.getUnixTime();
            console.log('syncing: started at', skritter.fn.getDateTime(now * 1000));
            async.series([
                function(callback) {
                    callback();
                },
                function(callback) {
                    console.log('syncing: items');
                    skritter.api.getItemByOffset(lastItemSync, function(result, status) {
                        if (status === 200) {
                            skritter.user.data.put(result, function() {
                                if (result.Items && result.Items.length > 0) {
                                    skritter.user.scheduler.insert(result.Items);
                                    skritter.user.scheduler.removeHeld(result.Items);
                                }
                                callback();
                            });
                        } else {
                            callback(result);
                        }
                    }, {
                        includeVocabs: includeResources,
                        includeSentences: false,
                        includeStrokes: includeResources,
                        includeHeisigs: includeResources,
                        includeTopMnemonics: includeResources,
                        includeDecomps: includeResources
                    });
                },
                function(callback) {
                    if (changedVocabIds.length > 0) {
                        console.log('syncing: vocabs');
                        skritter.user.data.updateVocab(changedVocabIds, function(error) {
                            if (!error) {
                                skritter.user.data.set('changedVocabIds', []);
                                skritter.user.data.cache();
                            }
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                function(callback) {
                    console.log('syncing: reviews');
                    skritter.user.data.reviews.sync(callback);
                },
                function(callback) {
                    skritter.api.checkReviewErrors(lastErrorCheck, function(reviewErrors, status) {
                        if (status === 200 && reviewErrors.length > 0) {
                            console.log('fixing: review errors', reviewErrors);
                            if (skritter.fn.hasRaygun()) {
                                try {
                                    throw new Error('Review Error');
                                } catch (error) {
                                    console.error('Review Error', reviewErrors);
                                    Raygun.send(error, {reviewErrors: reviewErrors});
                                }
                            }
                            skritter.api.getItemById(_.pluck(reviewErrors, 'itemId'), function(result, status) {
                                if (status === 200) {
                                    skritter.user.data.put(result, function() {
                                        if (result.Items && result.Items.length > 0) {
                                            skritter.user.scheduler.insert(result.Items);
                                            skritter.user.scheduler.removeHeld(result.Items);
                                        }
                                        callback();
                                    });
                                } else {
                                    callback(result);
                                }
                            });
                        } else if (status === 200) {
                            callback();
                        } else {
                            callback(reviewErrors);
                        }
                    });
                }
            ], _.bind(function(error) {
                if (error) {
                    //TODO: handle when a sync error occurs
                    console.log('syncing: failed after', moment().diff(now * 1000, 'seconds', true), 'seconds');
                    callback();
                } else {
                    this.set({
                        lastErrorCheck: now,
                        lastItemSync: now,
                        lastReviewSync: now,
                        lastSRSConfigSync: now,
                        lastVocabSync: now,
                        syncing: false
                    });
                    console.log('syncing: finished in', moment().diff(now * 1000, 'seconds', true), 'seconds');
                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            }, this));
        },
        /**
         * @method updateVocab
         * @param {Array|String} vocabIds
         */
        updateVocab: function(vocabIds, callback) {
            vocabIds = Array.isArray(vocabIds) ? vocabIds : [vocabIds];
            async.waterfall([
                function(callback) {
                    skritter.storage.get('vocabs', vocabIds, function(vocabs) {
                        callback(null, vocabs);
                    });
                },
                function(vocabs, callback) {
                    skritter.api.updateVocab(vocabs, function(result, status) {
                        if (status === 200) {
                            callback(null, result);
                        } else {
                            callback(result);
                        }
                    });
                },
                function(result, callback) {
                    skritter.user.data.put(result, function() {
                        if (result.Items) {
                            skritter.user.scheduler.insert(result.Items);
                        }
                        callback();
                    });
                }
            ], function(error) {
                if (error) {
                    callback(error);
                } else {
                    callback();
                }
            });
        }
    });

    return UserData;
});