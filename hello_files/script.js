var statement = [
	"এ জীবন পুণ্য করো দহন-দানে",
	"আমার এই      দেহখানি   তুলে ধরো",
"তোমার ওই     দেবালয়ের   প্রদীপ করো",
"নিশিদিন          আলোক-শিখা   জ্বলুক গানে ",
"আঁধারের         গায়ে গায়ে   পরশ তব",
"সারা রাত        ফোটাক তারা   নব নব",
"নয়নের           দৃষ্টি হতে   ঘুচবে কালো",
"যেখানে           পড়বে সেথায়   দেখবে আলো",
"ব্যথা মোর        উঠবে জ্বলে   ঊর্ধ্ব পানে",

];

var num = 30;

$(function() {

	 // $(window).mousemove(function(event) {
	 //        $('#pointer').css({
	 //            'top' : event.pageY + 'px',
	 //            'left' : event.pageX + 'px'
	 //        });
	 //    });
	$("#intro").delay(200).fadeOut(200);

	var logo = 0;
	var div="";
	$('body').click(function(event) {
		if (logo ===0){
			div = '<div class="logo" id="add"><img src="logo_tw.png"></div>';
			logo = 1;
		}else{
			div = '<div class="logo" id="add"><img src="logo_mc.png"></div>';
			logo = 0;
		}

		var relativePosition = {
		      left: event.pageX - $(document).scrollLeft() - $('body').offset().left-100,
		      top : event.pageY - $(document).scrollTop() - $('body').offset().top,
		    };
		random();
		
		$(this).append(div);
		$('#add').css({
	      top:relativePosition.top-100, 
	      left:relativePosition.left,
	  	  transform: "rotate("+num+"deg)"
	  	}).removeAttr('id');
	  	
	  	$('.logo').draggable();

		});

    // set interval
    var tid = setInterval(message, 3000);
    var count = 0;

    function message() {
      $("#statement").text(statement[count]);
      count++;
    }

    function random(){
    	num = Math.floor(Math.random()*50) + 1;
    	num *= Math.floor(Math.random()*2) == 1 ? 1 : -1; 
    }



    $('.logo').draggable();

});


