// initialize and store reference in Cargo.Plugins
var Cargo = Cargo || {};

Cargo.Plugins = Cargo.Plugins || {};

// use a closure so we have private and public methods.
Cargo.Plugins.elementResizer = (function($) {
		
		var self = {
			
			vars: {
				ticking: false,
				initialized: false
			},

			options: {
				cargo_refreshEvents: ['show_index_complete', 'pagination_complete', 'project_load_complete', 'inspector_preview', 'project_collection_reset', 'direct_link_loaded'],
				generic_refreshEvents: [],
				updateEvents: ['resize', 'orientationchange'],
				selectors: ['img', 'object', 'iframe', 'video', '.elementresizer', '[data-elementresizer-child]', '.slideshow', '.audio_component'],
				targets: {},
				minimumHeight: 100,
				minimumWidth: 100,
				centerElements: true,
				adjustElementsToWindowHeight: true,
				forceMargin: false,
				forceVerticalMargin: 40,
				forceHorizontalMargin: 0,
				allowInit: true
			},

			init: function() {

				if(Cargo.hasOwnProperty('Event')){
					Cargo.Event.trigger("element_resizer_init", publicVars);
				}
				
				// stupid IE8 fallback
				function bindEvent(el, eventName, eventHandler) {
					if (el.addEventListener){
						el.addEventListener(eventName, eventHandler, false); 
					} else if (el.attachEvent){
						el.attachEvent('on'+eventName, eventHandler);
					}
				}
				
				if(!self.options.allowInit){
					return false;
				}

				var resizeTimeout;

				$.each(self.options.updateEvents, function(key, event) {
					bindEvent(window, event, function() {
						self.requestTick();

						if(event === "resize"){
							clearTimeout(resizeTimeout);
							resizeTimeout = setTimeout(function(){
								self.requestTick();
							}, 100);
						}

					});
				});

				// bind some event listeners to automagically refresh
				$.each(self.options.generic_refreshEvents, function(key, event) {
					bindEvent(window, event, function() {
						self.refresh();
						self.update();
					});
				});

				$.each(self.options.cargo_refreshEvents, function(key, val) {
					// these are Cargo specific events. Only do this when we are on Cargo.
					if(Cargo.hasOwnProperty('Event')){
						Cargo.Event.on(val, function() {
							self.refresh();
							self.update();
						});
					}
				});

				if(Cargo.hasOwnProperty('Event')){
					Cargo.Event.on("inspector_open", function() {
						CargoInspector.eventManager.subscribe('style_changed', function(source){
							self.update();
						});
					});
				}

				self.vars.initialized = true;

				self.refresh();
				self.update();

			},

			refresh: function() {

				if(!self.vars.initialized){
					return false;
				}

				var containers = $('[data-elementresizer]');

				self.options.targets = {};

				containers.each(function(index, container) {
					var children = $(container).find(self.options.selectors.join(',')),
						resize_parent = $(container).closest('[data-resize-parent]');

					if (resize_parent.length == 0) {
						resize_parent = $('body');
					}

					var childrenArray = [],
						queueArray = [];

					// minimize DOM api calls
					children.each(function(key, child) {

						var columnizerParent = $(child).closest('[data-columnize]'),
							nodeName = child.nodeName,
							child = $(child);

						if ((columnizerParent.length == 0 || columnizerParent.is('[data-allow-elementresizer]') !== false) && !(child.closest('[data-no-elementresizer]').length > 0 || child[0].hasAttribute('data-no-elementresizer'))) {

							var childWidth = child.width(),
								childHeight = child.height(),
						
								actualWidth  = parseInt(child.attr('width')),
								actualHeight = parseInt(child.attr('height')),
						
								originalWidth  = (isNaN(actualWidth) ? childWidth : actualWidth),
								originalHeight = (isNaN(actualHeight) ? childHeight : actualHeight),
						
								minimumHeight = self.constrain(self.options.minimumHeight, 0, originalHeight),
								minimumWidth  = self.constrain(self.options.minimumWidth, 0, originalWidth),
						
								isSlideshow = (child.hasClass('slideshow') ? Cargo.Core.Slideshow.SlideshowObjects[child.attr('data-id')] : false),
								isVideoPlayer = child.closest('.video_component').length > 0 && child.is('video')

								childObj = {
									element: child,
									originalWidth    : originalWidth,
									originalHeight   : originalHeight,
									actualWidth      : actualWidth,
									actualHeight     : actualHeight,
									minimumHeight    : (minimumHeight > originalHeight ? originalHeight : minimumHeight),
									minimumWidth     : (minimumWidth > originalWidth ? originalWidth : minimumWidth),
									ratio            : (originalHeight / originalWidth),
									nodeName         : child[0].nodeName.toLowerCase(),
									isVideoPlayer	 : isVideoPlayer,
									isSlideshow      : isSlideshow,
									isAudioPlayer	 : child.hasClass('audio_component'),
									noResize         : child.parent('[data-elementresizer-no-resize]').length > 0 || child[0].hasAttribute('data-elementresizer-no-resize'),
									noCentering      : child.parent('[data-elementresizer-no-centering]').length > 0 || child[0].hasAttribute('data-elementresizer-no-centering'),
									noVerticalResize : child.parent('[data-elementresizer-no-vertical-resize]').length > 0 || child[0].hasAttribute('data-elementresizer-no-vertical-resize'),
									prevLeftMargin   : 0,
									isSoundCloudFrame: (child.attr('src') + '').indexOf('soundcloud') !== -1 && child[0].nodeName === "IFRAME"
								};

							if(isSlideshow){
								queueArray.push(childObj);
							} else {
								childrenArray.push(childObj);
							}

						}
					});

					childrenArray = childrenArray.concat(queueArray);

					var padding = parseInt($(resize_parent).css('paddingLeft')) + parseInt($(resize_parent).css('paddingRight'));
					
					
					if (isNaN(padding)) {
						padding = 0;
					}

					self.options.targets[index] = {
						container: $(container),
						resize_parent: resize_parent,
						children: childrenArray,
						padding: padding
					}

				});

				self.update();

			},

			requestTick: function() {

				if (!self.vars.ticking) {
					
					requestAnimationFrame(function(){
						self.update();
					});

					self.vars.ticking = true;
				}

			},

			constrain: function(val, min, max){
				return val > max ? max : val < min ? min : val;
			},

			update: function() {  

				// for in vars
				var targetKey,
					childKey, 
					childObj,
					target;

				for(targetKey in self.options.targets){

					target = self.options.targets[targetKey];

					var parentWidth = target.container.width(),
						padding = target.padding,
						maxWidth = target.resize_parent.width() - self.options.forceHorizontalMargin,
						globalMaxHeight = (self.options.adjustElementsToWindowHeight ? document.documentElement.clientHeight - self.options.forceVerticalMargin : 9e9),
						maxHeight = globalMaxHeight,
						scalingRatio = 1; // set it to one. Just in case.

					// handle rotation
					if(self.options.adjustElementsToWindowHeight && window.orientation !== undefined){
						if(window.orientation != 0){
							maxHeight = document.documentElement.clientWidth - (self.options.forceMargin === false ? 40 : self.options.forceMargin);
						}
					}

					for(childKey in target.children){

						childObj = target.children[childKey];

						if(!childObj.noResize){
							if(childObj.noVerticalResize){
								maxHeight  = 9e9;
							} else {
								maxHeight = globalMaxHeight;
							}

							var childWidth = childObj.actualWidth,
								childHeight = childObj.actualHeight;

							// check if we need to scale the horizontal or vertical side
							horizontalDelta = self.constrain(maxWidth - childWidth, 1, 9e9),
							verticalDelta = self.constrain(maxHeight - childHeight, 1, 9e9);

							// get the ratio based on the side that's being scaled
							scalingRatio = [maxWidth / childObj.actualWidth, maxHeight / childObj.actualHeight];
							scalingRatio = Math.min(scalingRatio[0], scalingRatio[1]);

							// calculate new size
							childHeight = self.constrain(childHeight * scalingRatio, -9e9, childObj.originalHeight);
							childWidth = self.constrain(childWidth * scalingRatio, -9e9, childObj.originalWidth);

							// rescale if one of the dimensions is smaller than the minimum value
							if(childHeight <= childObj.minimumHeight || childWidth <= childObj.minimumWidth){
								scalingRatio = [childObj.minimumWidth / childWidth, childObj.minimumHeight / childHeight];
								scalingRatio = Math.max(scalingRatio[0], scalingRatio[1]);

								childHeight = childHeight * scalingRatio;
								childWidth = childWidth * scalingRatio;
							}

							if(childObj.isAudioPlayer){
								if(Cargo.hasOwnProperty('Core')){
									Cargo.Core.Audio.InitPlayerSize();
								}
							}

							// check if anything changed. Otherwise no need to redraw.
							if(childObj.actualWidth != childWidth || childObj.actualHeight != childHeight){

								if(!isNaN(childWidth) && !isNaN(childHeight)){

									childObj.actualWidth  = childWidth;
									childObj.actualHeight = childHeight;

									childObj.element.add(childObj.nodeName === "object" ? childObj.element.find('embed') : '').css({
										'width': childObj.actualWidth + 'px',
										'height': childObj.actualHeight + 'px'
									});

									if ( childObj.isVideoPlayer){
										var mediaPlayer = childObj.element.closest('.mediaplayer')
										mediaPlayer.css({
											'width': childObj.actualWidth + 'px',
											'height': childObj.actualHeight + 'px'
										});
									}						

								} 

							}

						}

						if(self.options.centerElements && !childObj.noCentering){
							self.setLeftMargin(childObj, parentWidth);
						}

						if(childObj.isSlideshow){
							if(childObj.isSlideshow !== undefined){
								childObj.actualWidth = childObj.isSlideshow.resizeContainer();
							}
						}

					};

				};

				self.vars.ticking = false;

				if(Cargo.hasOwnProperty('Event')){
					Cargo.Event.trigger("elementresizer_update_complete", publicVars);
				}

			},

			setLeftMargin: function(childObj, parentWidth, force){

				var marginLeft;

				if(childObj.isSoundCloudFrame){
					marginLeft = (parentWidth - childObj.element.width()) / 2;
				} else {
					marginLeft = (parentWidth - childObj.actualWidth) / 2;
				}

				
				if(!isNaN(marginLeft)){

					if (childObj.prevLeftMargin !== marginLeft) {

						if ( childObj.isVideoPlayer ){
							childObj.element.closest('.mediaplayer').css('marginLeft', marginLeft);
						} else {
							childObj.element.css('marginLeft', marginLeft);						
						}

					}

					childObj.prevLeftMargin = marginLeft;

				}

			}

		};

		 var publicVars = {
			options: self.options,
			init: self.init,
			refresh: self.refresh,
			update: self.update,
			setOptions: function(newOptions) {

				$.extend(self.options, newOptions);

				if(self.options.forceMargin !== false){
					self.options.forceHorizontalMargin = self.options.forceMargin;
					self.options.forceVerticalMargin = self.options.forceMargin;
				}

				if(self.options.allowInit && self.vars.initialized){
					self.update();
				}

			},
			targets: function() {
				return self.options.targets;
			}
		};

		$(function(){  
			self.init();
		});

		return publicVars

 })(jQuery);