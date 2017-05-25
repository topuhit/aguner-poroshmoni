// initialize and store reference in Cargo.Plugins
var Cargo = Cargo || {};

Cargo.Plugins = Cargo.Plugins || {};

// use a closure so we have private and public methods.
Cargo.Plugins.columnizer = (function($) { 
		var self = {

			vars: {
				targets: {},
				ticking: false,
				init: true,
				targetIndex: 0
			},

			options: {
				'updateEvents': ['resize'],
				fluid: true,
				attributeConfig: {
					'[data-columnize]' : {
						role: 'initializer',
						type: 'string'
					}
				}
			},

			init: function(){

				// reqest ticks to make sure the update function only fires on animationFrames
				$.each(self.options.updateEvents, function(key, event){
					bindEvent(window, event, function(){
						self.requestTick();
					});
				});

				// stupid IE8 fallback
				function bindEvent(el, eventName, eventHandler) {
					if (el.addEventListener){
						el.addEventListener(eventName, eventHandler, false); 
					} else if (el.attachEvent){
						el.attachEvent('on'+eventName, eventHandler);
					}
				}
				
				// update when (possibly) new content has been added
				$(document).bind("paginationComplete", function(e) {  
					self.updateTargets();
				});

				if(Cargo.hasOwnProperty('Event')){

					Cargo.Event.on("inspector_preview", function() {
						self.update(null, true);
					});

					Cargo.Event.on("inspector_open", function() {
						self.addPaddingHelperListeners();
						self.vars.inspector = true;
					});

					// Feed designs intervention
					
					var ignoreCollectionResets = false;
					
					if(Cargo.View.Feed !== undefined) {
						
						ignoreCollectionResets = true;

						Cargo.Event.on("first_project_collection_reset", function(){
							ignoreCollectionResets = false;
						});
					}						
					
					Cargo.Event.on("project_collection_reset", function() {
						
						if(ignoreCollectionResets) {
							return;
						}

						if(Cargo.View.Feed !== undefined) {
							// Projects have been deleted and re-rendered. Clear our cache.
							for(var key in self.vars.targets){
								
								if( self.vars.targets[key].container[0] === Cargo.View.Feed.el ){
									
									self.vars.targets[key].container.find('[data-columnized]').removeAttr('data-columnized');
									self.vars.targets[key].children = [];
									self.vars.targets[key].shouldUpdate = true;

								}

							}
						}

						setTimeout(function(){
							self.updateTargets();
						});

					});

					Cargo.Event.on("project_load_complete", function(pid) {
						self.updateTargets();
					});
				}

				// initial check for targets.
				self.updateTargets();
				self.vars.init = false;
			},

			addPaddingHelperListeners: function(){
				var children, evtManager = CargoInspector.eventManager;

				for(key in self.vars.targets){
					children = self.vars.targets[key].children;

					for(var i = 0; i < children.length; i++){
						if(children[i].hasPaddingHelper && children[i].hasPaddingHelperListener !== true){

							(function(child){

								evtManager.subscribe('style_changed', function(source){
									
									child.paddingChild.style.removeProperty('padding');

									var styles = document.defaultView ? document.defaultView.getComputedStyle(child.paddingChild, null) : child.paddingChild.currentStyle;

									child.paddingHelper.style.paddingLeft = styles.paddingLeft;
									child.paddingHelper.style.paddingRight = styles.paddingRight;

									child.paddingChild.style.paddingLeft = '0px';
									child.paddingChild.style.paddingRight = '0px';
								
								});

								child.hasPaddingHelperListener = true;

							})(children[i]);
						}
					}
				}
			},

			// we use animation frames. This requests an animationFrame and updates the plugin when the 
			// animation frame has arrived. Only does this it once so we don't fire animationFrames 
			// when the page is static
			requestTick: function(){
				if(!self.vars.ticking) {
					requestAnimationFrame(self.update);
					self.vars.ticking = true;
				}
			},

			// check how many columns we can fit in the available space
			updateAvailableColumnCounts: function(){
				$.each(self.vars.targets, function(key, target){
					var containerWidth = target.container.width();
					var availableColumns = Math.floor(containerWidth / target.width);

					if(target.fluid){
						availableColumns += 1;
					}

					// don't make more columns than there are items to fill 'em with.
					if(availableColumns > target.visibleElementCount && target.visibleElementCount !== 0){
						availableColumns = target.visibleElementCount;
					} else if(availableColumns < 1){
						availableColumns = 1;
					}
					
					target.availableColumns = availableColumns;

					if(target.availableColumns != target.columnCount){
						target.shouldUpdate = true;
					}
				});
			},

			randomize: function(targetSelector){
				for(var key in self.vars.targets){
					var target = self.vars.targets[key];
					if(targetSelector !== undefined){
						if(!target.container.is(targetSelector)){
							continue;
						}
					}
					shuffle(target.children);
				};

				self.update(null, true);

				function shuffle(array) {
					var currentIndex = array.length, temporaryValue, randomIndex;

					// While there remain elements to shuffle...
					while (0 !== currentIndex) {

					// Pick a remaining element...
					randomIndex = Math.floor(Math.random() * currentIndex);
					currentIndex -= 1;

					// And swap it with the current element.
					temporaryValue = array[currentIndex];
					array[currentIndex] = array[randomIndex];
					array[randomIndex] = temporaryValue;
					}

					return array;
				}
			},

			// updates all targets found in memory
			// this thing should be all about speed so (almost) no jquery.
			update: function(callback, force){
				// check if there's a change in the amount of columns
				self.updateAvailableColumnCounts();

				for(var key in self.vars.targets){
					var target = self.vars.targets[key];

					if(target.children.length === 0) {
						continue;
					}

					if(target.shouldUpdate || force){
						target.container.find('.column').detach();
						
						// store everything in a fragement so nothing in the DOM is changed
						// and no reflows/paints are triggered.
						var frag = document.createDocumentFragment();
						target.columnArr = [];

						// Make the amount of columns
						for (i = target.availableColumns; i > 0; i--) {
							var col = document.createElement('div');

							col.id = 'column_' + i;
							col.className = 'column';
							col.style.maxWidth = target.width + 'px';
							col.style.display = 'inline-block';
							col.style.verticalAlign = 'top';

							// fluid columns need a percentage to scale width the browser width
							if(target.fluid){
								col.style.width = (100.0 / target.availableColumns) + '%';
							} else {
								col.style.width = target.width + 'px';
							}

							target.columnArr[i-1] = {
								col: col,
								height: 0
							};
						}

						target.columnCount = target.columnArr.length;
						target.shouldUpdate = false;

						// offloaded this to a function so it can be called from updateTargets too.
						self.addElementsToColumn(target, target.children);

						// append the columns to the documentFragment
						for(var i = 0; i < target.columnArr.length; i++){
							frag.appendChild(target.columnArr[i].col);
						}

						// All done. Append the complete documentFragment to the DOM in one time.
						target.container[0].appendChild(frag);

						if(Cargo.Plugins.hasOwnProperty('elementResizer')){
							Cargo.Plugins.elementResizer.update();
						}
						
					}
				};

				self.vars.ticking = false;
				
				if(typeof callback == "function"){
					callback();
				}
				
				if(Cargo.hasOwnProperty('Event')){
					Cargo.Event.trigger('columnizer_update_complete');
				}
			},

			addElementsToColumn: function(target, children){
				// add elements to columns.
				if(target.availableColumns > 0){
					for(var b = 0; b < children.length; b++){
						// the column we're going to append the child to
						var this_column;
						
						// This makes adding padding easy for end-users. They just have to 
						// add padding to the children
						if(!children[b].hasPaddingHelper){
							$(children[b].element).find('img').each(function(){
								this.style.maxWidth = this.getAttribute('width') + 'px';
							});

							var padding_helper = document.createElement("div");
							padding_helper.className = "padding_helper";
							
							// switch the padding from child to helper
							padding_helper.style.paddingLeft = target.padding_left + 'px';
							padding_helper.style.paddingRight = target.padding_right + 'px';
							children[b].element.style.paddingLeft = '0px';
							children[b].element.style.paddingRight = '0px';
							
							// wrap element in helper
							padding_helper.appendChild(children[b].element);
							
							// update the cached element
							children[b].paddingChild = children[b].element;
							children[b].element = padding_helper;
							children[b].paddingHelper = padding_helper;
							children[b].hasPaddingHelper = true;
						}
						
						if(target.equalize){
							// find the shortest column to append the child to
							this_column = self.getShortestColumn(target);

							// don't add any height if we have an invisible element
							if(children[b].visible){
								target.columnArr[this_column].height += (isNaN(children[b].lastUpdatedHeight) ? 1 : children[b].lastUpdatedHeight);
							}
						} else {
							// just go from left to right
							this_column = b % target.columnArr.length;
						}

						if(this_column >= 0){
							target.columnArr[this_column].col.appendChild(children[b].element);
						}
					}
				}
			},

			// Helper to figure out in what column we want to drop our next element
			getShortestColumn: function(target) {

				var lowest = 9e9,
					lowestIndex = -1,
					colHeight;

				for(i = target.columnArr.length - 1; i > -1; i--){
					colHeight = target.columnArr[i].height;
					if(colHeight <= lowest){
						lowestIndex = i;
						lowest = colHeight;
					}
				}

				return lowestIndex;

			},

			imagesLoaded: function(target, callback){

				var incompleteImages = [];

				if(target.nodeName == "IMG"){

					if(target.complete === false){
						incompleteImages.push(target);
					}

				} else {

					$('img', target).each(function(){

						/* Todo: Get rid of this */
						if(this.getAttribute('src') === "/_gfx/thumb_custom.gif"){
							this.style.maxHeight = this.getAttribute('height') + 'px';
						}
						
						if(this.complete === false){
							incompleteImages.push(this);
						}

					});

				}

				if(incompleteImages.length === 0){

					// all images are done, callback.
					typeof callback === "function" ? callback(0) : '';

				} else {

					// not all images are done. Install timers to listen for when they receive dimensions.
					var i, completeImageCount = 0;

					for(i = 0; i < incompleteImages.length; i++){

						(function(img){

							var ival;

							ival = setInterval(function(){

								if(img.naturalHeight !== 0 || img.complete){
									
									clearInterval(ival);

									if(++completeImageCount === incompleteImages.length){
										typeof callback === "function" ? callback(incompleteImages.length) : '';
									}
 
								}

							}, 30);

						})(incompleteImages[i]);

					}

				}

			},

			updateTargets: function(){

				var targets = $('[data-columnize]');

				if(Cargo.hasOwnProperty('Event')){
					Cargo.Event.trigger('columnizer_update_targets');
				};

				targets.each(function(key, target){

					var $target		= $(target),
						selector	= target.getAttribute('data-columnize'),
						equalize	= (target.getAttribute('data-columnize-equalize') == "true" || target.getAttribute('data-columnize-mason') == "true" ? true : false),
						children	= $target.find(selector).not('.padding_helper');

					// get options stored in the target data attributes
					var targetID 		= target.getAttribute('data-columnize-id'),
						first_element 	= children.first(),
						padding_left 	= parseInt(first_element.css('padding-left')),
						padding_right 	= parseInt(first_element.css('padding-right')),
						childrenArr 	= [],
						targetObj;
					
					// make sure we get valid numbers
					padding_left = (isNaN(padding_left) ? 0 : padding_left);
					padding_right = (isNaN(padding_right) ? 0 : padding_right);
					
					var horizontal_padding = padding_right + padding_left; 		
					
					children.each(function(){

						// only process if the element is new
						if(this.getAttribute('data-columnized') != "1"){
							// only process visible items
							if($(this).is(':visible')){

								var height = this.offsetHeight;

								if(height < 1){
									height = 1;
								}
								
								// add processed child to the array
								childrenArr.push({
									element: this,
									lastUpdatedHeight: height,
									hasPaddingHelper: false
								});

								this.setAttribute('data-columnized', '1');
							}
						}

					});

					if (typeof targetID == 'undefined' || targetID == false || targetID == null || $target.find('.column').length == 0) {
						
						// hide while we're working
						target.style.visibility = 'hidden';

						// this element hasn't been seen before so we're gonna create a new object for it.
						// also generating a new ID for later retrieval. 
						targetID = ++self.vars.targetIndex;

						// attach the ID to the element
						$target.attr('data-columnize-id', targetID);

						// create new object for this target
						targetObj = {
							container: $target,
							selector: selector,
							children: childrenArr,
							columnCount: 0,
							availableColumns: 0,
							shouldUpdate: false,
							padding_left: padding_left,
							padding_right: padding_right,
							fluid: (target.getAttribute('data-columnize-fluid') == "true" ? true : false),
							width: (target.getAttribute('data-columnize-width') == "*" || isNaN(parseInt(target.getAttribute('data-columnize-width'))) || parseInt(target.getAttribute('data-columnize-width')) <= 0 ? 275 : parseInt(target.getAttribute('data-columnize-width')) + horizontal_padding),
							equalize: equalize
						};

						// add it to the plugin's target list
						self.vars.targets[targetID] = targetObj;

					} else {

						// element has already been processed before. Retrieve it by it's ID.
						targetObj = self.vars.targets[targetID];

						// update width & fluid
						targetObj.fluid = (target.getAttribute('data-columnize-fluid') == "true" ? true : false);
						targetObj.width = (target.getAttribute('data-columnize-width') == "*" || isNaN(parseInt(target.getAttribute('data-columnize-width'))) || parseInt(target.getAttribute('data-columnize-width')) <= 0 ? 275 : parseInt(target.getAttribute('data-columnize-width')) + (targetObj.padding_left + targetObj.padding_right));
			
						// concatenate the new children if any. 
						if(children.length > 0){
							targetObj.children = targetObj.children.concat(childrenArr);
						}

						// add the new children to the DOM.
						self.addElementsToColumn(targetObj, childrenArr);

					}

					// check for hidden elements
					var visibleElementCount = 0,
						visible;

					// TODO: this is expensive. Perhaps make an option to disable this if not needed
					for(var i = 0; i < targetObj.children.length; i++){

						if(!targetObj.children[i].hasPaddingHelper){
							visible = $(targetObj.children[i].element).is(':visible');
						} else {
							// don't use padding_helper as the user shouldn't deal with that element
							visible = $(targetObj.children[i].element).find(selector).is(':visible');
						}

						targetObj.children[i].visible = visible;

						if(visible){
							visibleElementCount++;
						}

					}

					// we need to store how many elements are visible to calculate the required amount of columns.
					targetObj.visibleElementCount = visibleElementCount;
					
					// check if we need to update.
					self.update(function(){
						// all done. Show the container.
						target.style.visibility = 'visible';

						if(Cargo.Plugins.hasOwnProperty('elementResizer')){
							Cargo.Plugins.elementResizer.update();
						}

						var totalLoaded = 0,
							height;

						for(var i = 0; i < childrenArr.length; i++){
							(function(childObj){

								if(childObj.imagesLoadedStarted !== true){ 

									self.imagesLoaded(childObj.element, function(){

										height = childObj.element.clientHeight;

										if(height < 1){
											height = 1;
										}

										childObj.lastUpdatedHeight = height;

										if(++totalLoaded === childrenArr.length){
											self.update(undefined, true);
										} else {
											throttledUpdate();
										}

									});

									childObj.imagesLoadedStarted = true;

								}

							})(childrenArr[i]);
						};

					}, true);


				});

				if(self.vars.inspector === true){
					self.addPaddingHelperListeners();
				}

			}
		};

		var throttledUpdate = throttle(function (event) {
								self.update(undefined, true);
							  }, 100);

		function throttle(fn, threshhold, scope) {
			threshhold || (threshhold = 250);
			var last,
					deferTimer;
			return function () {
				var context = scope || this;

				var now = +new Date,
						args = arguments;
				if (last && now < last + threshhold) {
					// hold on to it
					clearTimeout(deferTimer);
					deferTimer = setTimeout(function () {
						last = now;
						fn.apply(context, args);
					}, threshhold);
				} else {
					last = now;
					fn.apply(context, args);
				}
			};
		}

		$(function(){ 
			self.init();
		});

		// return some methods that should be public
		return {
			updateTargets: self.updateTargets,
			update: self.update,
			randomize: self.randomize,
			getVars: function(){
				return self.vars;
			},
			inspectorAPI: function(){
				if(self.options.hasOwnProperty('attributeConfig')){
					return self.options.attributeConfig;
				} else {
					// let the inspector know there's nothing to see here.
					return false;
				}
			}
		};
})(jQuery);