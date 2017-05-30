function preppareEventHandlers(){
	var myHeading = document.getElementById("image");
	myHeading.onclick = function() {
	alert("Hi You clicked Heading Tag");

	}


	var emailField = document.getElementById("email");

	emailField.onfocus = function(){
		if (emailField.value == "your email") {
			emailField.value = "";
		}
	};

	emailField.onblur = function(){
		if ( emailField.value == ""){
			emailField.value = "your email";
		}
	};
	

}


window.onload = function(){
	//prep anything we need to
	preppareEventHandlers();
}

$(document).ready(function(){
    $("#hide").click(function(){
        $(".ok").hide();
    });
    $("#show").click(function(){
        $(".ok").show();
    });
});

