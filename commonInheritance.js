var inheritLinks;
var roots;
var notRoots;
var filesToProces = 0;
var myColorRange = ["#00A5E3","#8DD7BF","#FF96C5","#FF5768","#FFBF65","#FC6238","#FFD872","#F2D4CC","#E77577","#6C88C4","#C05780","#FF828B","#E7C582","#00B0BA","#0065A2","#00CDAC","#FF6F68","#FFDACC","#FF60A8","#CFF800","#FF5C77","#4DD091","#FFEC59","#FFA23A","#74737A"];
var fileStates;
var activeModelZip;
var initalViewState = true;

function toggleXsd(element,xsdName){
	var fs = fileStates.find(fs => fs.name === xsdName);
	console.log(fs);
	fs.show = !fs.show;
	if(fs.show){
		d3.select(element).attr('class','file_xsd')
	}
	else{
		d3.select(element).attr('class','file_xsd_hide')
	}
	renderModel();
}

function renderModel(){	
	filesToProces = fileStates.filter(f => f.show == true).length;
	console.log("selected xsd's: "+filesToProces);
	initGlobals();		
	activeModelZip.file(/xsd/).forEach(file => {
		if(fileStates.find(fs => fs.name === file.name).show){
			file.async("string").then(function success(text) {
				var src = file.name;
				var parser = new DOMParser();
				var xmlDoc = parser.parseFromString(text, "text/xml");
				procesXsd(xmlDoc, src);
			}, function error(e) {console.log(file.name+" "+ e)});
		}
		else{
			console.log('ignoring '+file.name);
		}
	});
}
function initGlobals(){
	console.log('init model');
	var element = document.getElementById('diagram');
	while(element.firstElementChild) {
		element.firstElementChild.remove();
	}
	inheritLinks = [];
	roots = new Set();
	notRoots = new Set();
	inheritLinks.push({id: 'root', model: 'root'});
}


function fetchImxVersions(){
    console.log("init versions");
	const url = 'https://api.github.com/repos/can-luckyshot/IMSpoorModelViewer/contents/data';
	fetch(url).then(response => response.json()).then(
		function(data){
			console.log("dropdown" + d3.selectAll("dropbtn"));
			var nav = d3.select("#version_dropdown").selectAll("div")
				.data(data)
				.enter()
				.append("a")
					.attr('href','#')
					.attr('id',d => d.name)
					.on("click",function (e,d){						
						generateModelFromUrl(d.download_url);
						}
					)
					.text(d => d.name);				   
    });
}

function generateModelFromUrl(url){	
	console.log(url);
	fetch(url) // 1) fetch the url
    .then(function (response) { // 2) filter on 200 OK
        if (response.status === 200 || response.status === 0) {
            return Promise.resolve(response.blob());
        } else {
            return Promise.reject(new Error(response.statusText));
        }
    })
    .then(JSZip.loadAsync) // 3) chain with the zip promise
    .then(zip => generateModelFromZip(zip));
}

function generateModelFromZip(zip) {
	activeModelZip = zip;
	var files = zip.file(/xsd/);
	myColor = d3.scaleOrdinal().domain(files.map(f => f.name)).range(myColorRange);
	fileStates = files.map(f => ({name: f.name, show: initalViewState}));		
	popuplateImxFiles();
	renderModel(zip);
}

function popuplateImxFiles(){
	d3.select("#xsd_list").selectAll("div").remove();
	d3.select("#xsd_list").selectAll("div")
		.data(fileStates)
		.enter()
		.append(f => createXsdItem(f));			
}

function createXsdItem(file){
	var item = d3.create("div");
	item.attr('class',file.show == true ? 'file_xsd':'file_xsd_hide')		
		.on("click",function (e,file){						
				toggleXsd(this, file.name);
				e.stopPropagation();
				}
			);
	item.append("svg")
		.attr("width", 20)
		.attr("height", 20)
		.append("g")			
			.append("circle")
				.attr("r", 10)
				.attr("cx", 10)
				.attr("cy", 10)				
				.attr("fill",myColor(file.name));
	item.append('p').text(file.name);
	return item.node();
}

function procesXsd(doc, src){	
	var namedElements = doc.querySelectorAll('*[name]');
	//console.log([...namedElements].length + ' elements with name attribute');
	[...namedElements].forEach((element)=> {
		var extension = element.querySelector('extension');
		if(extension){
			//console.log('inherit: ' + extension.attributes.base.value + ' <- ' + element.attributes.name.value);
			inheritLinks.push({id: element.attributes.name.value, parentId: extension.attributes.base.value, model: src});
			notRoots.add(element.attributes.name.value);
			if(roots.has(element.attributes.name.value)){
				//console.log('deleting: '+element.attributes.name.value);
				roots.delete(element.attributes.name.value);				
			}
			if(!roots.has(extension.attributes.base.value) && !notRoots.has(extension.attributes.base.value)){
				//console.log('adding: '+extension.attributes.base.value);				
				roots.add(extension.attributes.base.value)				
			}
			
		}
	});
	filesToProces--;
	if(filesToProces == 0){
		renderGraph();
	}
}

function dropHandler(ev) {
  console.log('File(s) dropped');
  ev.preventDefault();
  initTreeModel();
  if (ev.dataTransfer.items) {
	filesToProces = ev.dataTransfer.items.length;
	for(var i=0; i<filesToProces; i++){
		var item = ev.dataTransfer.items[i];
      // If dropped items aren't files, reject them
      if (item.kind === 'file') {
        var file = item.getAsFile();
        console.log(`… file[${i}].name = ${file.name}`);
		handleXsdFile(file);
      }
    }	
  } else {
    // Use DataTransfer interface to access the file(s)
    [...ev.dataTransfer.files].forEach((file, i) => {
      console.log(`… file[${i}].name = ${file.name}`);	  
    });
  }
}

function handleXsdFile(xsdFile){
	var reader = new FileReader();
	reader.onload =	(function (file) {
		var fileName = file.name;		
		return function (event) {
				var text = event.target.result;
				var src = fileName;
				var parser = new DOMParser();
				var xmlDoc = parser.parseFromString(text, "text/xml");
				procesXsd(xmlDoc, src);
			};
		})(xsdFile);
	reader.onerror = function (event) {
		console.log('file-error: ' + event.target.error.code);
	};
	reader.readAsText(xsdFile);
}

function dragOverHandler(ev) {
  console.log('File(s) in drop zone');
  ev.preventDefault();
}

function renderGraph(){
	console.log('render model');
	[...roots].forEach((root)=>{		
		inheritLinks.push({id: root, parentId: 'root', model: 'root'});}
	);	
	var imxTree = d3.stratify()(inheritLinks);
	var diagram = Tree(imxTree,{label: d => d.id});
	document.getElementById('diagram').append(diagram);
}

