var filesToProces = 0;
var imxObjectRefs = [];
var width = 1600;
var height = 900;
var inheritLinks;
var roots;
var notRoots;

var tooltipDiv;

function initTreeModel(){
	console.log('init model');
	tooltipDiv = d3.select("div.tooltip");	
	var element = document.getElementById('diagram');
	while(element.firstElementChild) {
		element.firstElementChild.remove();
	}
	inheritLinks = [];
	roots = new Set();
	notRoots = new Set();
	inheritLinks.push({id: 'root'});
	imxObjectRefs = [];
}

function renderRefs(){
	console.log('render model');
	var chart = buildChart(imxObjectRefs);
	document.getElementById('diagram').append(chart);
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

function procesXsd(doc, src){	
	buildReferenceLinks(doc);
	buildInheritenceTree(doc);
	filesToProces--;
	if(filesToProces == 0){		
		renderRefs();
	}
}

function integrateInheritedRelations(){
	
}

function buildInheritenceTree(doc){
	var namedElements = doc.querySelectorAll('*[name]');
	console.log([...namedElements].length + ' elements with name attribute');
	[...namedElements].forEach((element)=> {
		var extension = element.querySelector('extension');
		if(extension){			
			inheritLinks.push({id: element.attributes.name.value, parentId: extension.attributes.base.value});
			notRoots.add(element.attributes.name.value);
			if(roots.has(element.attributes.name.value)){				
				roots.delete(element.attributes.name.value);				
			}
			if(!roots.has(extension.attributes.base.value) && !notRoots.has(extension.attributes.base.value)){				
				roots.add(extension.attributes.base.value)				
			}
			
		}
	});
}

function buildReferenceLinks(doc){
	var namedElements = doc.querySelectorAll('*[name]');
	console.log([...namedElements].length + ' elements with name attribute');
	[...namedElements].forEach((element)=> {			
		var extension = element.querySelector('extension');
		if(extension){
			var typeRefs = element.querySelectorAll('ObjectTypeRef');			
			[...typeRefs].forEach((typeRef)=>{					
					var refAttr = typeRef.parentNode.parentNode.parentNode;
					var typeAtrrName = refAttr.attributes.name != null ? refAttr.attributes.name.value : refAttr.attributes.ref.value;
					imxObjectRefs.push({source: element.attributes.name.value, target: typeRef.textContent,label: typeAtrrName});
				}			
			)
		};		
	});
}

function dragOverHandler(ev) {
  console.log('File(s) in drop zone');

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

function buildChart(){
  const links = imxObjectRefs;
  const namesMap = imxObjectRefs.flatMap(l => [l.source, l.target]);
  const nodeSet = new Set(namesMap);
  const nodes = Array.from(nodeSet, id => ({id}));

  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-600))
      .force("x", d3.forceX())
      .force("y", d3.forceY());
	  
	  

  const svg = d3.create("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .style("font", "12px sans-serif");

  // Per-type markers, as they don't inherit styles.
  svg.append("defs").selectAll("marker")
    .data(["arrow"])
    .join("marker")
      .attr("id", d => `${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", -0.5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
    .append("path")
      .attr("fill", "#555")
      .attr("d", "M0,-5L10,0L0,5");

  const link = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(links)
    .join("path")
      .attr("stroke", "#555")
	  .attr("stroke-opacity", 0.4)
      .attr("marker-end", "url(#arrow)")
	  .on("mouseover",handleHover) ;

  const node = svg.append("g")
      .attr("fill", "currentColor")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
    .selectAll("g")
    .data(nodes)
    .join("g")
      .call(drag(simulation));

  node.append("circle")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr("r", 4);

  node.append("text")
      .attr("x", 8)
      .attr("y", "0.31em")
      .text(d => d.id)
    .clone(true).lower()
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 3);

  simulation.on("tick", () => {
    link.attr("d", linkStraight);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });
  return svg.node();
}

function handleHover(event, d){		
		const[x, y] = d3.pointer(event,d);
		tooltipDiv.transition()
			.duration(500)	
			.style("opacity", 0);
		tooltipDiv.transition()
			.duration(200)	
			.style("opacity", .9);	
		tooltipDiv.html(d.label)	 
			.style("left", (x) + "px")			 
			.style("top", (y - 28) + "px");
	  }

function linkStraight(d){
  return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
}

function linkArc(d) {
  const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
  return `M${d.source.x},${d.source.y} A${r},${r} 0 0,1 ${d.target.x},${d.target.y}`;
}

drag = simulation => {
  
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}