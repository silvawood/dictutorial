var block, bookNo, lastWord, voiceList, utterance, progress = 'bilingual', sensitivity = 'base', hideText = false, test = true, firstMistake;

var entry = document.getElementById('entry');
var book = [document.getElementById('book0'), document.getElementById('book1')];
book[0].regex = new RegExp();
book[1].regex = new RegExp();
speechSynthesis.cancel(); //effectively resets the speech engine
speechSynthesis.onvoiceschanged = populateVoicesLists;
populateVoicesLists();

window.onunload = function() {
	var select = document.getElementsByTagName('select');
	localStorage.voice0 = select[0].selectedIndex;
	localStorage.voice1 = select[1].selectedIndex;
	localStorage.mode = test;
	localStorage.highlight = book[0].classList.contains("highlight");
	localStorage.sensitivity = sensitivity;
	localStorage.hideText = hideText;
	localStorage.progress = progress;
}

for (var i = 0; i < 2; i++) {
	book[i].onmouseup = mouseUpFunc(i);
	book[i].ondragover = function(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		evt.dataTransfer.dropEffect = 'copy';
		};
	book[i].ondragenter = book[i].ondragover;
	book[i].ondrop = bookDropFunc(i);
	clearBook(i);
	book[i].ondblclick = dblClickFunc(i);
	}

function mouseUpFunc(i) {
	return function() {
		var nodeText = getSelection().anchorNode;
		if (nodeText != undefined && nodeText.data != undefined && book[i].text != undefined) {
			book[i].regex.lastIndex = getSelection().anchorOffset + book[i].text.indexOf(nodeText.data);
			if (speaking()) {
				cancelSpeech();				
				if (document.getElementById('btnPause').textContent != 'Resume') readText();
				}			
			}
		if (test) entry.focus();
		};
}

function dblClickFunc(i) {
	return function() {
		var fileInput = document.getElementById('file' + i);
		if (fileInput) fileInput.click();
		};
}

function bookDropFunc(i) {
	return function(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		fetchFile(evt.dataTransfer.files[0], i);
		}
}

function populateVoicesLists() {
    var select = document.getElementsByTagName('select');
	if (select[0].length == 0) {
		voiceList = speechSynthesis.getVoices();
		for (var i = 0; i < voiceList.length; i++) {
			var voicename = voiceList[i].name.replace('Google ', '');
			select[0].add(new Option(voicename, i));
			select[1].add(new Option(voicename, i));
			}
		select[0].onchange = function() {
			book[0].voice = voiceList[this.selectedIndex];
			};
		select[1].onchange = function() {
			book[1].voice = voiceList[this.selectedIndex];
			};
		getDemoTexts();
		if (localStorage.getItem('mode') !== null) {
			select[0].selectedIndex = localStorage.voice0;
			select[1].selectedIndex = localStorage.voice1;
			changeControls(localStorage.mode == 'true'); //also sets test variable
			if (!test) document.getElementsByName('mode')[1].checked = true;
			if (localStorage.highlight == 'false') {
				book[0].classList.remove("highlight");
				book[1].classList.remove("highlight");
				document.getElementById('chkHighlight').checked = false;
				}
			sensitivity = localStorage.sensitivity;
			if (sensitivity != 'base') document.getElementById("chkAccent").checked = true;
			if (localStorage.hideText == 'true') {
				document.getElementById("chkHideText").checked = true;
				hideText = true;
				}
			progress = localStorage.progress;
			var radios = document.getElementsByName('progress');
			for (var i = 0; i < radios.length; i++) radios[i].checked = (radios[i].value == progress);
			}
		else {
			select[0].selectedIndex = 0;
			select[1].selectedIndex = 0;
			for (var i = 0; i < select[1].length; i++) {
				if (select[1].options[i].text.substr(0, 2).toLowerCase() == 'fr') {
					select[1].selectedIndex = i;
					break;
					}
				}
			}
		select[0].onchange();
		select[1].onchange();
		changeDual();
		}
};

document.getElementsByName('mode')[0].onchange = function () { changeControls(true); entry.focus(); };
document.getElementsByName('mode')[1].onchange = function () { changeControls(false); };

function changeDual() {
	var newclass = (progress == 'bilingual') ? 'dual' : 'single';
	document.getElementById('container0').className = newclass;
	document.getElementById('container1').className = newclass;
	if (test) entry.focus();
}

entry.onkeydown = function() {
	this.placeholder = '';
	this.onkeydown = null;
}

entry.oninput = function () { //KeyUp() {//used onchange instead of onkeyup to allow Alt + number to enter accented chrs
	var input = tidyString(this.value); //remove all punctuation and reduce multiple spaces down to one
	var len = input.length;
	//[\s\\!"#\$%&\(\)\*\+,\-\.\/:;<=>\?@\[\]\^_`\{\|\}~\u00BB\u00AB]/;
	var thisblock = tidyString(block);
	var compare = input.localeCompare(thisblock.substr(0, len), book[bookNo].voice.lang, { sensitivity: sensitivity });
	//console.log(entry.value + ': ' + thisblock.substr(0, len) + '=' + compare);
	if (compare == 0) {
		//document.getElementById('mistake').style.visibility = "hidden";
		this.maxLength = 999;
		this.style.color = 'black';
		if (len == thisblock.length) {
			if (hideText) book[bookNo].textContent = book[bookNo].text.substr(0, book[bookNo].regex.lastIndex);
			if (progress == 'bilingual') bookNo = 1 - bookNo;
			readText();
			}
		}
	else if (this.style.color != 'red') { // user pressed wrong letter
		//console.log('Mistake');
		//document.getElementById('mistake').style.visibility = "visible";
		this.style.color = 'red';
		this.maxLength = len;
		if (progress == 'word')
			var word = thisblock;
		else {
			var i = thisblock.indexOf(' ', len-1);
			if (i < 0) i = thisblock.len;
			var j = thisblock.lastIndexOf(' ', len-2);
			var word = thisblock.substring(j+1, i);
			}
		if (word != lastWord) {
			lastWord = word;
			firstMistake = true;
			}
		else if (firstMistake) {
			firstMistake = false;
			sayWord(word);
			}
		else {
			spellWord(word, 0); //start at first letter
			firstMistake = true; //go back to saying word on next mistake
			}
		}
}

function changeControls(state) {
	test = state;
	document.getElementById('typeDiv').style.display = (state) ? 'block' : 'none';
	if (test && speaking()) {
		entry.disabled = false;
		entry.focus();
		}
	state = state ? 'inline' : 'none';
	entry.style.display = state;
	document.getElementById('lblAccent').style.display = state;
	document.getElementById('lblHideText').style.display = state;
}

function speaking() {
	return (utterance != undefined && utterance.onend != null);
}

document.getElementById('btnStart').onclick = function() {
	if (book[0].getElementsByTagName('input').length > 0 || (progress == 'bilingual' && book[1].getElementsByTagName('input').length > 0)) return;
	if (document.getElementById('btnPause').textContent == 'Resume' || (speaking()))
		resetToStart();
	else
		reset();
	entry.focus();
	readText();
}

function reset() {
	entry.disabled = false;
	document.getElementById('btnPause').textContent = 'Pause';
	setRegex();
}

function resetToStart() {
	cancelSpeech();
	reset();
	for (var i = 0; i < 2; i++) {
		book[i].regex.lastIndex = 0;
		book[i].scrollTop = 0;
		bookNo = 0;
		}
}

document.getElementById('btnPause').onclick = function() {
	if (this.textContent == 'Resume') {
		if (speaking())//(tried speechSynthesis.speaking)
			speechSynthesis.resume();
		else
			readText();
		this.textContent = 'Pause';
		}
	else if (speaking()) {
		speechSynthesis.pause();
		this.textContent = 'Resume';
		entry.disabled = true;
		}
	if (test) entry.focus();
};

document.getElementById('btnRepeat').onclick = function() {
	document.getElementById('btnPause').textContent = 'Pause';
	cancelSpeech();
	if (test) entry.focus();
	if (progress == 'bilingual' || progress == 'sentence')
		speakBlock(false, phraseRegExp());
	else
		speakBlock(false);
}

function cancelSpeech() {
	if (utterance) {
		utterance.onend = null;
		speechSynthesis.cancel();
		}
}

document.getElementsByName('progress')[0].onchange = function() { //word
	progress = this.value;
	changeDual();
	setRegex();
	};
document.getElementsByName('progress')[1].onchange = document.getElementsByName('progress')[0].onchange; //phrase
document.getElementsByName('progress')[2].onchange = document.getElementsByName('progress')[0].onchange; //phrase
document.getElementsByName('progress')[3].onchange = function() { //bilingual
	progress = this.value;
	changeDual();
	//if (document.getElementById('btnPause').textContent == 'Pause') document.getElementById('btnPause').click();
	resetToStart();
};

document.getElementById('chkAccent').onchange = function() { sensitivity = (this.checked) ? 'accent' : 'base'; };

document.getElementById('chkHideText').onchange = function() {
	hideText = this.checked;
	for (var i = 0; i < 2; i++)
		if (book[i].getElementsByTagName('input').length == 0) book[i].textContent = (hideText) ? '' : book[i].text;
};

document.getElementById('chkHighlight').onchange = function() {
	book[0].classList.toggle("highlight");
	book[1].classList.toggle("highlight");
};

function fetchFile(file, bookNo) {
	var reader = new FileReader();
	reader.onload = function() {
		if (file instanceof File) book[bookNo].file = file;
		processBook(file.name, this.result, bookNo);
		}
	reader.readAsBinaryString(file);
}

function processBook(fileName, contents, bookNo) {
	book[bookNo].innerHTML = '';
	var contents = contents.replace(/'/g, '&#8217;').replace(/"(?! )/g, '&#8220;').replace(/"/g, '&#8221;').replace(/(Mr*s*)\./g, '$1');//.replace(/—/g, '--');
	var i = contents.indexOf('<p>');
	if (i < 0) {
		book[bookNo].insertAdjacentHTML('afterbegin', contents);
		book[bookNo].text = contents;
		}
	else {
		var j = contents.lastIndexOf('</p>');
		if (j < 0) j = contents.len - 1;
		//book[bookNo].insertAdjacentHTML('afterbegin', contents);//.replace(/<p>/g, '').replace(/<\/p>/g, '<br><br><br>'));
		book[bookNo].insertAdjacentHTML('afterbegin', contents.substring(i, j));
		book[bookNo].text = book[bookNo].textContent;
		}
	if (hideText) book[bookNo].textContent = '';
	//else
	//	book[bookNo].textContent = text[bookNo];
	var button = document.createElement('button');
	button.insertAdjacentHTML('afterbegin', 'Clear');
	button.title = 'Remove the current book, ready to import a new one';
	var title = document.getElementById('title' + bookNo);
	title.innerHTML = fileName;
	title.appendChild(button);
	button.onclick = function() {
		title.innerHTML = '';
		resetToStart();
		clearBook(bookNo);
		}
	book[bookNo].style.textAlign = 'justify';
	resetToStart();
}

function getDemoTexts() {
	downloadFile("http://www.silvawood.co.uk/dictutorial/Swann's Way - Overture (Proust).htm", 0);
	downloadFile("http://www.silvawood.co.uk/dictutorial/Du c%F4t%E9 de chez Swann - Combray (Proust).htm", 1);	
}

function downloadFile(url, bookNo) {
	var req = new XMLHttpRequest();
	req.open('GET', url);
	req.responseType = 'blob';
	req.onload = function() {
		this.response.name = (bookNo == 0) ? "Swann's Way - Overture (Proust)" : "Du c&ocirc;t&eacute; de chez Swann - Combray"; //url.substr(url.lastIndexOf('/') + 1);
		fetchFile(this.response, bookNo);
		};
	req.send();
}

function clearBook(i) {
	book[i].innerHTML = '<cite>Drag/drop a text or html file here<br>or double click to <input id="file' + i + '" type="file" accept=".txt,.htm,.html"></cite>';
	document.getElementById('file'+ i).onchange = function() { if (this.files[0]) fetchFile(this.files[0], i); };
}

function setRegex() {
	var lastIndex0 = book[0].regex.lastIndex;
	if (progress == 'phrase')
		book[0].regex = phraseRegExp(); // for follow-by-phrase or bilingual (which is by sentence, but broken into phrases to prevent bug)
	else if (progress == 'word')
		book[0].regex = new RegExp('\\S+', 'g');//look for non-spaces followed by a space (for follow-by-word)
	else {//sentence or bilingual
		book[0].regex = /[^.]+[.!\?]+["'\u201C\u201D\u00AB\u00BB]*(?=\s+)/g; //only cater to sentences ending in .
		var lastIndex1 = book[1].regex.lastIndex;
		book[1].regex = /[^.]+[.!\?]+["'\u201C\u201D\u00AB\u00BB]*(?=\s+)/g;
		book[1].regex.lastIndex = lastIndex1;
	}
	book[0].regex.lastIndex = lastIndex0;
}

function phraseRegExp() {
	var PUNCT_CHRS = ",:;\\(\\)\\.\\?\\[\\]\\{\\}'\\u201C\\u201D\\u00BB" + '"'; // - and \\u00AB\\u00BB taken out
	return new RegExp('[^' + PUNCT_CHRS + ']+[' + PUNCT_CHRS + ']+', 'g'); // (?=\\s*) removed from end
}

function readText() {
	if (speechSynthesis.paused) return;
	var r = book[bookNo].regex.exec(book[bookNo].text);//can incorporate index-start in regex, using lastIndex and /g, or y flag?
	block = r[0];
	//console.log(block);
	if (block) {
		var thisbook = book[bookNo];
		if (!hideText) {
			thisbook.innerHTML = book[bookNo].text.substr(0,r.index) + '<span>' + block + '</span>' + book[bookNo].text.substr(book[bookNo].regex.lastIndex);
			if (thisbook.childNodes[1].offsetTop + thisbook.childNodes[1].offsetHeight - thisbook.offsetTop - thisbook.scrollTop > thisbook.offsetHeight)
				thisbook.scrollTop = thisbook.childNodes[1].offsetTop - thisbook.offsetTop;
			}
		if (test) entry.focus();
		if (progress == 'bilingual' || progress == 'sentence')
			speakBlock(test, phraseRegExp());
		else
			speakBlock(test);
		}
	else {
		book.style.color = 'blue';// indicate end reached
		if (test) entry.onchange = null;
		}
}

function speakBlock(clearInput, subRegex) {
	if (subRegex) {
		//split into phrases
		//console.log(subRegex, block);
		var r = subRegex.exec(block);
		utterance = new SpeechSynthesisUtterance(r[0]); //keep variable global to prevent stalling problem
		utterance.onend = function() {
			//utterance.subRegex = subRegex;
			//if (text[bookNo].charAt(subRegex.lastIndex) == '.') {
			if (subRegex.lastIndex == block.length) {
				if (test)
					entry.focus();
				else {
					if (progress == 'bilingual') bookNo = 1 - bookNo; //switch language if end of sentence, but not for test in case user makes mistakes warranting repeats
					readText();
					}
				}
			else
				speakBlock(false, subRegex);
			};
		}
	else {
		utterance = new SpeechSynthesisUtterance(block);
		utterance.onend = function() { if (!test) readText(); };
		}
	if (clearInput) utterance.onstart = function () { entry.value = ''; };
	utterance.voice = book[bookNo].voice;
	speechSynthesis.speak(utterance);
}

function tidyString(str) {
	var PUNCT_CHRS = "\\u201A-\\u206F\\u2E00-\\u2E7F\\u00BB\\u00AB\\u2018\\u2019'!#%&,-/:;<=>@_`~\\$\\(\\)\\*\\+\\.\\?\\[\\]\\^\\{\\|\\}" + '"';
	//Do not forget to escape \ itself while using the RegExp("pattern") notation because \ is also an escape character in strings. (MDN regex doc)
// Special characters like the dot(.) and asterisk (*) are not special inside a character set, so they don't need to be escaped.
	var regexPunctChrs = new RegExp('[' + PUNCT_CHRS + ']', 'g');
	return str.replace(regexPunctChrs, '').trim().replace(/\s+/g, ' ')
}

function sayWord(word) {
	utterance = new SpeechSynthesisUtterance(word);
	utterance.voice = book[bookNo].voice;
	speechSynthesis.speak(utterance);
}

/*function spellWord(word, i) {
	utterance = new SpeechSynthesisUtterance(word.charAt(i));
	utterance.voice = voice[bookNo];
	utterance.onend = function() { if (entry.value != '' && ++i < word.length) spellWord(word, i); };
	speechSynthesis.speak(utterance);
}*/

function spellWord(word) {
	for (var i = 0; i < word.length; i++) {
		utterance = new SpeechSynthesisUtterance(word.charAt(i));
		utterance.voice = book[bookNo].voice;
		speechSynthesis.speak(utterance);
		}
}