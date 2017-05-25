/**
 * Cassiopeia
 */

var Design = {
	
	data: {
		click_event: "click"
	},
	
	keybindings: function() {
		// Remove previous bindings
		Cargo.Core.KeyboardShortcut.Remove("Left");
		Cargo.Core.KeyboardShortcut.Remove("Right");

		Cargo.Core.KeyboardShortcut.Add("Left", 37, function() {
			Action.Project.Prev();
			return false;
		});

		Cargo.Core.KeyboardShortcut.Add("Right", 39, function() {
			Action.Project.Next();
			return false;
		});
	},

	resizeSlideshow: function(el, obj, state) {
		if (state == "resize") {
			el.find("> *").css({
				"-webkit-transition": "margin 0s ease",
				"-moz-transition": "margin 0s ease",
				"transition": "margin 0s ease"
			});
		} else {
			el.find("> *").css({
				"-webkit-transition": "margin " + obj.options.transition_duration + "s ease",
				"-moz-transition": "margin " + obj.options.transition_duration + "s ease",
				"transition": "margin " + obj.options.transition_duration + "s ease"
			});
		}

		// Resize and position the containing element
		obj.resizeContainer();
		Cargo.Plugins.elementResizer.refresh();
	},

	groupNavigation: function() {
		var navGroups = [];

		$(".navigation div[data-type]").each(function() {
			var type = this.getAttribute("data-type");

			if ($.inArray(type, navGroups) == -1) {
				// first unwrap if already wrapped
				if ($(this).parent().hasClass("group")) {
					$(this).unwrap();
				}

				if (type == "link" || type == "page") {
					var items = $(".navigation div[data-type='link'], .navigation div[data-type='page']");
					navGroups.push("link", "page");
				} else {
					var items = $(".navigation div[data-type='" + type + "']");
					navGroups.push(type);
				}

				items.wrapAll("<span class='group' />");
			}
		});
	},

	formatThumbnails: function() {
		 $(".thumbnail[data-formatted!='true']").each(function() {
			if ($(this).find(".thumb_image img").attr("src") == "/_gfx/thumb_custom.gif") {
				$(this).addClass("default_thumb");
			}

			$(this).attr("data-formatted", "true");
		});
	},

	mobileIcons: function() {
		if (navigator.userAgent.match(/i(Phone|Pod|Pad)|windows/gi)) {

			$(".project_nav").addClass("mobile");

		}
	},
	
	mobileFormatting: function(){
		if ($('body').hasClass('mobile') || !Cargo.Helper.isMobile()) { return; }
		
		$('body').addClass('mobile')
		
		Design.mobileNavInit();
		
	},
	
	mobileNavInit: function(){

		$('.navigation_toggle').bind("click.mobile dblclick.mobile", function(e){
			if ( e.type == Design.data.click_event ){
				Design.toggleNav();
			}
		});

		$('body').bind( "click.mobile", function(e){

			var touchtarget = $(e.target);

			if ( !touchtarget.is('.navigation, .navigation *, .mobile_site_header, .mobile_site_header *') ) {
				console.log('asdfas');

				Design.toggleNav(true);

			}

		});

		$(window).bind("scroll.mobile", function(){

			Design.toggleNav(true);

		});


	},
	
	mobileUnbind: function(){
		$('body').unbind("touchstart.mobile mousedown.mobile");
		$('.navigation_toggle').unbind("click.mobile dblclick.mobile");
		$(window).unbind("scroll.mobile");

		if ( Cargo.Helper.GetCurrentPageType() ){
			Design.setVerticalMargin();
		}

	},
	
	toggleNav: function(closeNav){

		if ( $('.navigation_toggle').is(".active") || closeNav ){

			$(".navigation, .navigation_toggle").removeClass("active");
			
			$('body').unbind("click.mobile");

		} else {

			$(".navigation, .navigation_toggle").addClass("active");
			
			if ( Cargo.Helper.isIOS() ){
				$('body').css("cursor", "pointer")
			}
			
			$('body').bind( "click.mobile", function(e){

				var touchtarget = $(e.target);
	
				if ( !touchtarget.is('.navigation, .navigation *, .mobile_site_header, .mobile_site_header *') ) {
	
					Design.toggleNav(true);

				}
			
			});



		}

	},
};

/**
 * Events
 */

$(function() {
	Design.mobileFormatting();
	Design.mobileIcons();
	Design.keybindings();
	Design.formatThumbnails();

	if (Cargo.Helper.IsOnSet() && Cargo.Model.Project.GetType() != "page") {
		$(".show_index").show();
	}

	// divide the nav in groups
	Design.groupNavigation();
});

Cargo.Event.on("element_resizer_init", function(plugin) {
	plugin.setOptions({
		adjustElementsToWindowHeight: Cargo.Model.DisplayOptions.attributes.image_scale_vertical
	});
});

Cargo.Event.on("slideshow_resize", function(el, obj) {
	Design.resizeSlideshow(el, obj, "resize");
});

Cargo.Event.on("slideshow_transition_start", function(el, obj) {
	Design.resizeSlideshow(el, obj);
});

Cargo.Event.on("fullscreen_destroy_hotkeys", function() {
	Design.keybindings();
});

Cargo.Event.on("project_load_complete", function(pid) {
	Design.mobileFormatting();
	Design.toggleNav(true);
	Design.mobileIcons();

	if (Cargo.Model.Project.GetType() == "project") {
		if (!Cargo.Model.DisplayOptions.attributes.thumbs_below_projects || Cargo.Helper.IsOnSet()) {
			$(".show_index").show();
		}
	}

	if (Cargo.Plugins.hasOwnProperty("columnizer") && Cargo.Model.DisplayOptions.attributes.thumbs_below_projects ) {
		Cargo.Plugins.columnizer.updateTargets();
	}
});

Cargo.Event.on("show_index_complete", function(pid) {
	Design.mobileFormatting();
	if (Cargo.Plugins.hasOwnProperty("columnizer")) {
		Cargo.Plugins.columnizer.updateTargets();
	}

	$(".show_index").hide();
});

Cargo.Event.on("show_index_complete", function(pid) {
	if (Cargo.Plugins.hasOwnProperty("columnizer")) {
		Cargo.Plugins.columnizer.updateTargets();
	}

	$(".show_index").hide();
});

Cargo.Event.on("pagination_complete", function() {
	if (Cargo.Plugins.hasOwnProperty("columnizer")) {
		Cargo.Plugins.columnizer.updateTargets();
	}

	Design.formatThumbnails();
	Design.groupNavigation();
});

Cargo.Event.on("navigation_reset", function() {
	Design.groupNavigation();
});
