
let HideElements = ["StartMenu", "Lemon", "Works", "About1","About2"];
let HideButtons = ["bottomBarLeft", "bottomBarLemon", "bottomBarWorks" , "bottomBarAbout"];
var buttonsUrl = "url('UITextures/";


dragElement(document.getElementById("Lemon"));
dragElement(document.getElementById("About1"));
dragElement(document.getElementById("About2"));

for (var i = 0; i < 4; i++) {
	DisableElementWindow(i);
	DisableElementButton(i);
}
DisableElementWindow(4);

document.getElementById("icons").style.display = "none"; 
document.getElementById("icons2").style.display = "none"; 

setTimeout(function(){ document.getElementById("StartScreen").style.display = "none"; }, 1300);
setTimeout(function(){ document.getElementById("icons").style.display = "block"; }, 1380);
setTimeout(function(){ document.getElementById("icons2").style.display = "block"; }, 1450);

function dragElement(elmnt) {
	var x = 0, y = 0, x2 = 0, y2 = 0;
	elmnt.onmousedown = dragMouseDown;

	function dragMouseDown(e) {
		e = e || window.event;
		e.preventDefault();
		x2 = e.clientX;
		y2 = e.clientY;
		document.onmouseup = closeDragElement;
		document.onmousemove = elementDrag;
	}

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();

		z = x2 - e.clientX;
		y = y2 - e.clientY;
		x2 = e.clientX;
		y2 = e.clientY;


		if (elmnt.offsetTop - y < 0 || elmnt.offsetTop - y > window.innerHeight - elmnt.offsetHeight) {
			y = 0;
		}
		if (elmnt.offsetLeft - z < 0 || elmnt.offsetLeft - z > window.innerWidth - elmnt.offsetWidth) {
			z = 0;
		}

		elmnt.style.top = (elmnt.offsetTop - y) + "px";
		elmnt.style.left = (elmnt.offsetLeft - z) + "px";
	}

	function closeDragElement() {
		document.onmouseup = null;
		document.onmousemove = null;
	}   
}

function EnableElementWindow(index) {
	var window = document.getElementById(HideElements[index]);
	window.style.display = "block";
}

function EnableElementButton(index) {
	var button = document.getElementById(HideButtons[index]);
	button.style.backgroundImage = buttonsUrl + HideButtons[index] + "Hover.png";
}

function DisableElementWindow(index) {
	var window = document.getElementById(HideElements[index]);
	window.style.display = "none";
}

function DisableElementButton(index) {
	var button = document.getElementById(HideButtons[index]);
	button.style.backgroundImage = buttonsUrl + HideButtons[index] + ".png";
}

function ToggleElementWindow(index) {
	var window = document.getElementById(HideElements[index]);

	if (window.style.display == "none") window.style.display = "block";
	else window.style.display = "none";
}

function ToggleElementButton(index) {
	var button = document.getElementById(HideButtons[index]);
	var window = document.getElementById(HideElements[index]);

	if (window.style.display == "none") button.style.backgroundImage = buttonsUrl + HideButtons[index] + ".png";
	else button.style.backgroundImage = buttonsUrl + HideButtons[index] + "Hover.png";
}