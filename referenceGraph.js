var filesToProces = 0;
var imxObjectRefs = [];
var width = 3000;
var height = 3000;
var inheritLinks;
var roots;
var notRoots;
var initalViewState = false;
var tooltipDiv;

function initGlobals(){	
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

function renderGraph(){
	console.log('render model');
	var chart = buildChart(imxObjectRefs);
	document.getElementById('diagram').append(chart);
}

function procesXsd(doc, src){	
	buildReferenceLinks(doc,src);
	buildInheritenceTree(doc,src);
	filesToProces--;
	if(filesToProces == 0){		
		renderGraph();
	}
}

function integrateInheritedRelations(){
	
}

function buildInheritenceTree(doc,src){
	var namedElements = doc.querySelectorAll('*[name]');	
	[...namedElements].forEach((element)=> {
		var extension = element.querySelector('extension');
		if(extension){			
			inheritLinks.push({id: element.attributes.name.value, parentId: extension.attributes.base.value, model: src});
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

function buildReferenceLinks(doc,src){
	var namedElements = doc.querySelectorAll('*[name]');	
	[...namedElements].forEach((element)=> {			
		var extension = element.querySelector('extension');
		if(extension){
			var typeRefs = element.querySelectorAll('ObjectTypeRef');			
			[...typeRefs].forEach((typeRef)=>{					
					var refAttr = typeRef.parentNode.parentNode.parentNode;
					var typeAttrName = refAttr.attributes.name != null ? refAttr.attributes.name.value : refAttr.attributes.ref.value;
					imxObjectRefs.push({source: element.attributes.name.value, target: typeRef.textContent,label: typeAttrName, model: src});
				}			
			)
		};		
	});
}



function buildChart(){
  const links = imxObjectRefs;
  const knownNodes = new Set(imxObjectRefs.map(l => l.source));
  const sourceNodes = imxObjectRefs.map(l => l.source+' '+l.model);
  const targetNodes = imxObjectRefs.map(l => l.target+' '+'unknown');
  const nodeConcats = new Set(sourceNodes);    
  targetNodes.forEach(item => nodeConcats.add(item));  
  const nodes = [];
  nodeConcats.forEach(function(n){
	const a = n.split(' ');
	const weight = imxObjectRefs.filter(l => l.target == a[0]).length;
	if(a[1]=='unknown' && knownNodes.has(a[0])){
		
	}
	else{
		nodes.push({id: a[0], model: a[1], weight: weight});
	}
  });
  console.log('rendering '+nodes.length+' nodes');
	

  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-600))
      .force("x", d3.forceX())
      .force("y", d3.forceY());
	  
	  

  const svg = d3.create("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, height])
	  .attr("width", width)
      .attr("height", height)
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
	  .on("mouseover",handleHover).on("mouseexit",handleExit) ;

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
	  .attr("fill", d => myColor(d.model))
	  .attr("opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("r", d => Math.max(6,d.weight));

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
	//tooltipDiv.transition().duration(500).style("opacity", 0);
	tooltipDiv.transition().duration(200).style("opacity", .9);	
	tooltipDiv.html(d.label)	 
		.style("left", (x) + "px")			 
		.style("top", (y - 28) + "px");
}

function handleExit(event, d){		
	const[x, y] = d3.pointer(event,d);
	tooltipDiv.transition()
		.duration(500)	
		.style("opacity", 0);
	tooltipDiv.html('');
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