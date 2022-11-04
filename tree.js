var inheritLinks;
var roots;
var notRoots;
var filesToProces = 0;

function initTreeModel(){
	console.log('init model');
	var element = document.getElementById('diagram');
	while(element.firstElementChild) {
		element.firstElementChild.remove();
	}
	inheritLinks = [];
	roots = new Set();
	notRoots = new Set();
	inheritLinks.push({id: 'root'});
}

function renderTree(){
	console.log('render model');
	[...roots].forEach((root)=>{		
		inheritLinks.push({id: root, parentId: 'root'});}
	);
	var imxTree = d3.stratify()(inheritLinks);
	var diagram = Tree(imxTree,{label: d => d.id});
	document.getElementById('diagram').append(diagram);
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
	var namedElements = doc.querySelectorAll('*[name]');
	//console.log([...namedElements].length + ' elements with name attribute');
	[...namedElements].forEach((element)=> {
		var extension = element.querySelector('extension');
		if(extension){
			//console.log('inherit: ' + extension.attributes.base.value + ' <- ' + element.attributes.name.value);
			inheritLinks.push({id: element.attributes.name.value, parentId: extension.attributes.base.value});
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
		renderTree();
	}
}

function dragOverHandler(ev) {
  console.log('File(s) in drop zone');
  ev.preventDefault();
}

function Tree(data, { // data is either tabular (array of objects) or hierarchy (nested objects)
  path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
  id = Array.isArray(data) ? d => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
  parentId = Array.isArray(data) ? d => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
  children, // if hierarchical data, given a d in data, returns its children
  tree = d3.tree, // layout algorithm (typically d3.tree or d3.cluster)
  sort = (a, b) => d3.descending(a.height, b.height), // how to sort nodes prior to layout (e.g., (a, b) => d3.descending(a.height, b.height))
  label, // given a node d, returns the display name
  title, // given a node d, returns its hover text
  link, // given a node d, its link (if any)
  linkTarget = "_blank", // the target attribute for links (if any)
  width = 1800, // outer width, in pixels
  height, // outer height, in pixels
  r = 3, // radius of nodes
  padding = 1, // horizontal padding for first and last column
  fill = "#999", // fill for nodes
  fillOpacity, // fill opacity for nodes
  stroke = "#555", // stroke for links
  strokeWidth = 1.5, // stroke width for links
  strokeOpacity = 0.4, // stroke opacity for links
  strokeLinejoin, // stroke line join for links
  strokeLinecap, // stroke line cap for links
  halo = "#fff", // color of label halo 
  haloWidth = 3, // padding around the labels
} = {}) {

  // If id and parentId options are specified, or the path option, use d3.stratify
  // to convert tabular data to a hierarchy; otherwise we assume that the data is
  // specified as an object {children} with nested objects (a.k.a. the “flare.json”
  // format), and use d3.hierarchy.
  const root = path != null ? d3.stratify().path(path)(data)
      : id != null || parentId != null ? d3.stratify().id(id).parentId(parentId)(data)
      : d3.hierarchy(data, children);

  // Sort the nodes.
  if (sort != null) root.sort(sort);

  // Compute labels and titles.
  const descendants = root.descendants();
  const L = label == null ? null : descendants.map(d => label(d.data, d));

  // Compute the layout.
  const dx = 10;
  const dy = width / (root.height + padding);
  tree().nodeSize([dx, dy])(root);

  // Center the tree.
  let x0 = Infinity;
  let x1 = -x0;
  root.each(d => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  // Compute the default height.
  if (height === undefined) height = x1 - x0 + dx * 2;

  const svg = d3.create("svg")
      .attr("viewBox", [-dy * padding / 2, x0 - dx, width, height])
      .attr("width", width)
      .attr("height", height)
      //.attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10);
	  
  svg.append("defs").selectAll("marker")
    .data(["arrow"])      // Different link/path types can be defined here
  .join("marker")    // This section adds in the arrows
    .attr("id", String)
    .attr("viewBox", "0 0 8 8")
    .attr("refX", 10)
    .attr("refY", 4)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto-start-reverse")
  .append("path")
    .attr("d", "M0,0L0,8 L8,4")
	.attr("fill-opacity", strokeOpacity);

  svg.append("g")
      .attr("fill", "none")
      .attr("stroke", stroke)
      .attr("stroke-opacity", strokeOpacity)
      .attr("stroke-linecap", strokeLinecap)
      .attr("stroke-linejoin", strokeLinejoin)
      .attr("stroke-width", strokeWidth)
    .selectAll("path")
      .data(root.links())
      .join("path")
	    .attr("marker-start", "url(#arrow)")
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));

  const node = svg.append("g")
    .selectAll("a")
    .data(root.descendants())
    .join("a")
      .attr("xlink:href", link == null ? null : d => link(d.data, d))
      .attr("target", link == null ? null : linkTarget)
      .attr("transform", d => `translate(${d.y},${d.x})`);

  node.append("circle")
      .attr("fill", d => d.children ? stroke : fill)
      .attr("r", r);

  if (title != null) node.append("title")
      .text(d => title(d.data, d));

  if (L) node.append("text")
      .attr("dy", "0.40em")
      .attr("x", d => d.children ? -6 : 6)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .attr("paint-order", "stroke")
      .attr("stroke", halo)
      .attr("stroke-width", haloWidth)
      .text((d, i) => L[i]);

  return svg.node();
}